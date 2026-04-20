// ─── Groq AI — Whisper STT + LLaMA medical extraction ────────────────────────
const GROQ_KEY  = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_BASE = 'https://api.groq.com/openai/v1';

// Map Expo language codes → Whisper language codes
const LANG_MAP = { 'hi-IN': 'hi', 'mr-IN': 'mr', 'en-IN': 'en', hi: 'hi', mr: 'mr', en: 'en' };

const MEDICAL_PROMPT = `You are a clinical AI assistant for Indian hospitals. A doctor-patient consultation transcript is given (may be Hindi, Marathi, English, or code-switched mid-sentence). Extract ALL clinical information and return ONLY a valid JSON object — no markdown, no explanation.

JSON structure (use null for missing fields, empty array [] for missing lists):
{
  "patient_name": "string or null",
  "symptoms": ["list of symptoms mentioned"],
  "symptom_duration": "how long symptoms have been present or null",
  "diagnosis": "suspected or confirmed diagnosis or null",
  "medications": [{"name": "drug name", "dosage": "amount", "frequency": "timing"}],
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

// ─── Whisper Speech-to-Text ───────────────────────────────────────────────────
export async function transcribeAudio(audioUri, languageCode = 'hi-IN') {
  const lang = LANG_MAP[languageCode] || 'hi';

  const formData = new FormData();
  formData.append('file', {
    uri:  audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  });
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', lang);
  formData.append('response_format', 'verbose_json');
  // Prompt hints the model about medical domain + code-switching
  formData.append(
    'prompt',
    'Medical consultation between doctor and patient. May include drug names, symptoms, diagnosis in Hindi, Marathi, or English.'
  );

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
export async function extractMedicalData(transcript, languageCode = 'hi-IN') {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:           'llama3-70b-8192',
      temperature:     0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: MEDICAL_PROMPT },
        {
          role:    'user',
          content: `Language hint: ${languageCode}\n\nTranscript:\n${transcript}`,
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
