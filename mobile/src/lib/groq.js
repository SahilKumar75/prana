// ─── Groq AI — Whisper STT + LLaMA medical extraction ────────────────────────
const GROQ_KEY  = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_BASE = 'https://api.groq.com/openai/v1';

// Map Expo language codes → Whisper language codes
const LANG_MAP = { 'hi-IN': 'hi', 'mr-IN': 'mr', 'en-IN': 'en', hi: 'hi', mr: 'mr', en: 'en' };

// Seed prompts in the target language — strongly biases Whisper to output in that script
const LANG_PROMPT = {
  // Starts with explicit Devanagari script instruction — prevents Whisper from using Urdu/Nastaliq
  hi: 'देवनागरी लिपि में लिखें। यह हिंदी में डॉक्टर और मरीज़ के बीच चिकित्सा परामर्श है। दवाओं, लक्षणों और निदान का उल्लेख हो सकता है। देवनागरी लिपि में लिखें।',
  mr: 'देवनागरी लिपि वापरा। हे डॉक्टर आणि रुग्ण यांच्यातील मराठी वैद्यकीय संभाषण आहे। औषधे, लक्षणे आणि निदानाचा उल्लेख असू शकतो।',
  en: 'Medical consultation between doctor and patient. May include drug names, symptoms, and diagnosis.',
  default: 'Medical consultation between doctor and patient. May include Hindi, Marathi, or English terms.',
};

const MEDICAL_PROMPT = `You are a clinical AI assistant for Indian hospitals. A doctor-patient consultation transcript is given (may be Hindi, Marathi, English, or code-switched mid-sentence). Extract ALL clinical information and return ONLY a valid JSON object — no markdown, no explanation.

JSON structure (use null for missing fields, empty array [] for missing lists):
{
  "patient_name": "string or null",
  "symptoms": ["list of symptoms mentioned"],
  "symptom_duration": "how long symptoms have been present or null",
  "diagnosis": "suspected or confirmed diagnosis or null",
  "medications": [{"name": "generic drug name", "prescription_name": "brand/trade name if mentioned or null", "dose_mg": "numeric dose in mg or null", "dosage": "full dosage string e.g. 500mg", "frequency": "timing e.g. twice daily", "duration": "e.g. 5 days or null"}],
  "allergies": ["list or empty"],
  "vitals": {"bp": "string or null", "temp": "string or null", "pulse": "string or null", "spo2": "string or null"},
  "follow_up": "follow-up instructions or null",
  "language_detected": "hi or mr or en",
  "missing_info": ["list of critical clinical info that was NOT mentioned but should be asked"],
  "summary": "one-sentence clinical summary in English",
  "severity": "mild or moderate or severe"
}

For missing_info: flag anything clinically critical that was not mentioned — e.g. allergy history, vitals, diagnosis confirmation, medication dosage, duration of illness.
For medications: capture ALL drugs, even if mentioned by Indian brand names or colloquially.`;

// ─── Medical Transcript Correction ───────────────────────────────────────────
// Post-processes raw Whisper output: fixes misheard drug names, dosages, medical
// terms, and ambiguous regional speech. Returns corrected plain text.
export async function correctTranscript(rawText, detectedLang = 'en') {
  if (!rawText?.trim()) return rawText;
  const langHint = { hi: 'Hindi', mr: 'Marathi', en: 'English' }[detectedLang] || 'mixed';
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.1,
      messages: [
        {
          role:    'system',
          content: `You are a medical transcription correction engine for Indian hospitals. You receive raw ASR (Whisper) output from a doctor-patient consultation in ${langHint} (or code-switched). Your job:

1. Fix misheard drug names (e.g. "Paracetamole" → "Paracetamol", "Pantaprazole" → "Pantoprazole", "Combiflame" → "Combiflam")
2. Fix dosages written ambiguously (e.g. "five hundred mg" → "500mg", "twice" → "twice daily")  
3. Fix misheard medical terms (e.g. "high pertension" → "hypertension", "diebetes" → "diabetes")
4. Preserve original language — do NOT translate. If Hindi/Marathi sentence, keep it in Hindi/Marathi.
5. Remove filler sounds (um, uh, hmm) but preserve all medical content
6. Do NOT add or invent any medical information not present in the original

Return ONLY the corrected transcript text. No explanation, no prefix, no markdown.`,
        },
        { role: 'user', content: rawText },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Correction failed: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content?.trim() || rawText;
}

// ─── Whisper Speech-to-Text ───────────────────────────────────────────────────
export async function transcribeAudio(audioUri, languageCode) {
  // languageCode is undefined for Auto — omit language + prompt so Whisper decodes freely
  const lang   = languageCode ? (LANG_MAP[languageCode] || languageCode) : undefined;
  // Only send a prompt when a language is explicitly chosen — avoids English bias in auto mode
  const prompt = lang ? LANG_PROMPT[lang] : undefined;

  const formData = new FormData();
  formData.append('file', {
    uri:  audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  });
  formData.append('model', 'whisper-large-v3-turbo');
  if (lang)   formData.append('language', lang);     // omit entirely for auto-detect
  if (prompt) formData.append('prompt',   prompt);   // omit in auto mode to avoid English bias
  formData.append('response_format', 'verbose_json');

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}` },
    body:    formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper STT failed: ${err}`);
  }

  const data = await res.json();
  return {
    text:     data.text || '',
    language: data.language || lang,
    duration: data.duration || 0,   // seconds
    segments: data.segments || [],
  };
}

// ─── LLaMA 3 Medical Data Extraction ─────────────────────────────────────────
export async function extractMedicalData(transcript, languageCode = 'hi-IN', caseHistory = []) {
  // Build case history block for RAG — injected only for follow-up visits
  const historyBlock = caseHistory.length > 0
    ? '\n\nPATIENT CASE HISTORY (' + caseHistory.length + ' previous visit(s)):\n' +
      caseHistory.map((s, i) => {
        const d    = new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const syms = Array.isArray(s.extracted_data?.symptoms) ? s.extracted_data.symptoms.join(', ') : 'N/A';
        const diag = s.extracted_data?.diagnosis || 'N/A';
        const summ = s.extracted_data?.summary   || 'N/A';
        return `Visit ${i + 1} (${d}): Symptoms: ${syms}. Diagnosis: ${diag}. Summary: ${summ}.`;
      }).join('\n')
    : '';

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:           'llama-3.3-70b-versatile',
      temperature:     0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: MEDICAL_PROMPT },
        {
          role:    'user',
          content: `Language hint: ${languageCode}${historyBlock}\n\nCurrent visit transcript:\n${transcript}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM extraction failed: ${err}`);
  }

  const data    = await res.json();
  const content = data.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch {
    // Strip any accidental markdown fences
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  }
}

// ─── Full pipeline: STT → LLM extract ────────────────────────────────────────
export async function processAudio(audioUri, languageCode = 'hi-IN') {
  const stt       = await transcribeAudio(audioUri, languageCode);
  const extracted = await extractMedicalData(stt.text, languageCode);
  return {
    transcript:     stt.text,
    detectedLang:   stt.language,
    durationSecs:   stt.duration,
    extractedData:  extracted,
  };
}

// ─── Speaker Diarization ─────────────────────────────────────────────────────
// Returns [{speaker: 'doctor'|'patient'|'noise', name: string, text: string}]
export async function diarizeTranscript(rawText, doctorName, patientName, detectedLang) {
  if (!rawText?.trim()) return [];
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model:           'llama-3.3-70b-versatile',
      temperature:     0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role:    'system',
          content: `You are a speaker diarization engine for medical consultations. Split the raw transcript into individual utterances and attribute each to the correct speaker.

Rules:
- "doctor" speaks clinically: asks questions, gives diagnoses, prescribes, examines
- "patient" describes symptoms, duration, pain, history, answers questions
- "noise" is background sounds, coughs, or inaudible text — only include if significant
- Preserve the original language of each utterance exactly — do NOT translate

Return ONLY valid JSON: {"lines": [{"speaker": "doctor"|"patient"|"noise", "name": "<actual name>", "text": "<utterance>"}]}
No markdown, no explanation.`,
        },
        {
          role:    'user',
          content: `Doctor: ${doctorName}. Patient: ${patientName}. Language: ${detectedLang || 'unknown'}.\n\nTranscript:\n${rawText}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Diarize failed: ${await res.text()}`);
  const data    = await res.json();
  const content = data.choices[0].message.content;
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.lines) ? parsed.lines : [];
  } catch {
    return [];
  }
}

// ─── Transcript Translation ───────────────────────────────────────────────────
const LANG_NAME = { hi: 'Hindi', mr: 'Marathi', en: 'English' };

export async function translateTranscript(text, targetLang) {
  // targetLang: 'hi' | 'mr' | 'en'
  if (!text?.trim()) return text;
  const target = LANG_NAME[targetLang] || 'English';
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `You are a medical translator. Translate the given doctor-patient consultation transcript into ${target}. Preserve all medical terms, drug names, and numbers exactly. Return ONLY the translated text with no explanation, no prefix, no markdown.`,
        },
        { role: 'user', content: text },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Translation failed: ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() || text;
}
