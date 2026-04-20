// ─── Groq AI — Whisper STT + LLaMA medical extraction ────────────────────────
const GROQ_KEY  = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_BASE = 'https://api.groq.com/openai/v1';

// Map Expo language codes → Whisper language codes
const LANG_MAP = { 'hi-IN': 'hi', 'mr-IN': 'mr', 'en-IN': 'en', hi: 'hi', mr: 'mr', en: 'en' };

// Seed prompts in the target language — strongly biases Whisper to output in that script.
// Including common Indian drug names / dosage patterns in the prompt biases Whisper
// to recognise them correctly instead of transcribing them as random words.
const LANG_PROMPT = {
  // Starts with explicit Devanagari script instruction — prevents Whisper from using Urdu/Nastaliq
  hi: 'देवनागरी लिपि में लिखें। यह हिंदी में डॉक्टर और मरीज़ के बीच चिकित्सा परामर्श है। दवाएँ: Paracetamol, Dolo, Crocin, Combiflam, Augmentin, Azithromycin, Metformin, Pantoprazole, Omeprazole, Cetirizine, Amoxicillin, Ciprofloxacin, Metronidazole, Ondansetron, Atorvastatin, Amlodipine, Telmisartan. खुराक: BD, TDS, OD, SOS, mg, एक गोली, दो गोलियाँ।',
  mr: 'देवनागरी लिपि वापरा। हे डॉक्टर आणि रुग्ण यांच्यातील मराठी वैद्यकीय संभाषण आहे। औषधे: Paracetamol, Dolo, Crocin, Combiflam, Augmentin, Azithromycin, Metformin, Pantoprazole, Cetirizine, Amoxicillin. मात्रा: BD, TDS, OD, SOS, mg.',
  en: 'Medical consultation between doctor and patient. Drug names: Paracetamol, Dolo 650, Crocin, Combiflam, Augmentin 625, Azithromycin 500mg, Metformin 500mg, Pantoprazole 40mg, Pan-D, Cetirizine 10mg, Amoxicillin 500mg, Ciprofloxacin 500mg, Metronidazole 400mg, Ondansetron 4mg, Atorvastatin 10mg, Amlodipine 5mg, Telmisartan 40mg, Montelukast 10mg. Dose: BD, TDS, OD, SOS, HS.',
  default: 'Medical consultation. Hindi, Marathi, or English. Drug names: Paracetamol, Dolo, Combiflam, Augmentin, Azithromycin, Metformin, Pantoprazole, Cetirizine, Amoxicillin, Ciprofloxacin, Metronidazole, Ondansetron, Atorvastatin, Amlodipine, Telmisartan.',
};

const MEDICAL_PROMPT = `You are a strict clinical transcription parser for Indian hospitals. Your ONLY job is to extract information EXPLICITLY STATED in the transcript. You are NOT a doctor. You do NOT suggest, infer, or fill typical values.

━━━ ABSOLUTE ZERO-HALLUCINATION RULES ━━━
These rules override everything else. Violation causes patient harm.

1. MEDICATIONS — If a drug name was NOT spoken aloud in this transcript, do NOT include it. Empty array = correct. Do not "helpfully" add Paracetamol, Crocin, or any other drug.
2. SYMPTOMS — Only extract complaints that the PATIENT explicitly described. Never infer symptoms from the diagnosis.
3. DURATION — "3 days", "5 days", "1 week" must appear verbatim or as a clear spoken phrase in the transcript. If no duration was mentioned, duration = null.
4. DIAGNOSIS — Must be stated by the doctor. Do not guess from symptoms.
5. SHORT/UNCLEAR TRANSCRIPTS — If the transcript is fewer than 50 words, mostly noise, or clearly incomplete, return all nulls and empty arrays. Do not fabricate content.
6. DO NOT USE DEFAULT VALUES — Never output a "typical" value for anything. If it was not said, it does not exist.

━━━ HOW TO EXTRACT ━━━
Step 1 — Identify speaker turns. Lines starting with "Dr." or a doctor name = doctor. Lines starting with a patient name or "Patient:" = patient.
Step 2 — For each field, ask: "Was this EXPLICITLY said in this transcript?" If no → null or [].
Step 3 — Build the JSON using only what passed Step 2.

━━━ ATTRIBUTION ━━━
Symptoms, complaints, pain, duration-of-symptoms → patient utterances ONLY
Diagnosis, medications, dosage, instructions, follow-up → doctor utterances ONLY
Never flip attribution.

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON. No markdown, no explanation, no text outside the JSON.

{
  "patient_name": "string extracted from transcript, or null",
  "symptoms": ["ONLY symptoms the patient explicitly described — empty array if none"],
  "symptom_duration": "exact phrase spoken by patient, or null",
  "diagnosis": "exact diagnosis stated by doctor, or null",
  "medications": [
    {
      "name": "generic drug name — MUST be explicitly named in transcript",
      "prescription_name": "brand name if spoken, or null",
      "dose_mg": "numeric string e.g. '500', or null — ONLY if spoken",
      "dosage": "full dosage string as spoken, or null",
      "frequency": "exact timing as spoken e.g. 'twice daily' — null if not said",
      "duration": "exact duration as spoken e.g. '5 days' — null if not said"
    }
  ],
  "allergies": ["only if explicitly mentioned by patient or doctor — else empty"],
  "vitals": {
    "bp": "null unless a blood pressure reading was stated",
    "temp": "null unless a temperature reading was stated",
    "pulse": "null unless a pulse reading was stated",
    "spo2": "null unless an SpO2 reading was stated"
  },
  "follow_up": "follow-up instruction stated by doctor, or null",
  "language_detected": "hi or mr or en — based on majority language of transcript",
  "missing_info": ["list ONLY critical clinical info that was absent but clinically required"],
  "suggested_diagnoses": ["1-3 possible diagnoses the doctor may want to consider, based ONLY on symptoms explicitly present in the transcript. Only include this if 3 or more symptoms were stated. Else empty array. Do NOT suggest if a diagnosis was already stated."],
  "summary": "one sentence summary of what was ACTUALLY discussed, not inferred",
  "severity": "mild or moderate or severe — ONLY if doctor stated it; else null"
}

Indian drug brand → generic reference (use ONLY when a brand name was explicitly spoken):
Paracetamol family: Crocin / Dolo / Calpol → Paracetamol
Combination analgesics: Combiflam → Ibuprofen+Paracetamol | Hifenac-P → Aceclofenac+Paracetamol
NSAIDs: Brufen / Ibugesic → Ibuprofen | Voveran / Voltaren / Dicloran → Diclofenac | Hifenac / Zerodol / Movon → Aceclofenac
PPI / antacids: Pan / Pantop / Pantocid / Nexpro / Nexito → Pantoprazole | Omez / Prilosec → Omeprazole | Nexium → Esomeprazole | Rantac / Zinetac → Ranitidine | Digene / Gelusil → Antacid
Antibiotics (penicillin): Augmentin / Clavam / Amoxyclav → Amoxicillin+Clavulanate | Mox / Amoxil → Amoxicillin
Antibiotics (macrolide): Azithral / Azee / Azimax / Zithromax → Azithromycin | Erythrocin → Erythromycin
Antibiotics (fluoroquinolone): Ciplox / Cifran → Ciprofloxacin | Norflox → Norfloxacin | Levoflox → Levofloxacin
Antibiotics (cephalosporin): Monocef → Ceftriaxone | Taxim / Taxim-O → Cefotaxime / Cefpodoxime | Zifi → Cefixime | Macpod → Cefpodoxime | Zinnat / Ceftum → Cefuroxime
Antibiotics (other): Metrogyl / Flagyl → Metronidazole | Fasigyn → Tinidazole
Bronchodilators: Asthalin / Ventorlin → Salbutamol | Seroflo / Foracort → Salmeterol+Fluticasone | Duolin → Ipratropium+Salbutamol
Antihistamines: Allegra / Telfast → Fexofenadine | Cetirizine / Okacet / Alerid → Cetirizine | Levocet / L-Cin → Levocetirizine | Montair / Singulair → Montelukast
Antiemetics: Domperidone / Domstal / Domperi → Domperidone | Vomikind / Zofran → Ondansetron | Perinorm → Metoclopramide
ORS / vitamins: Electral → ORS | Becosules → B-complex | Zincovit / Supradyn → Multivitamin+Zinc | Shelcal / Calcirol → Calcium+Vitamin D
Diabetes: Glycomet / Glucophage / Obimet → Metformin | Januvia → Sitagliptin | Galvus → Vildagliptin | Jardiance → Empagliflozin | Forxiga → Dapagliflozin | Glimestar / Amaryl-M → Glimepiride+Metformin
Insulin: Mixtard / Novomix → Biphasic insulin | Lantus / Basalog → Insulin glargine | Novorapid → Insulin aspart
Antihypertensives: Telma / Telmikind → Telmisartan | Telma-H → Telmisartan+HCTZ | Amlodac / Amlokind / Amlopres → Amlodipine | Losar → Losartan | Concor → Bisoprolol | Aten → Atenolol | Betaloc / Metolar → Metoprolol
Lipid-lowering: Storvas / Atorva / Lipvas → Atorvastatin | Rozucor / Roseday → Rosuvastatin
Antiplatelet: Ecosprin → Aspirin | Clopilet / Plavix → Clopidogrel | Deplatt-A → Aspirin+Clopidogrel | Ecosprin AV → Aspirin+Atorvastatin
Steroids: Wysolone / Omnacortil → Prednisolone | Medrol / Depo-Medrol → Methylprednisolone
Antiepileptics: Levipil → Levetiracetam | Tegrital → Carbamazepine | Valprol / Encorate → Valproate | Eptoin → Phenytoin
Muscle relaxants: Tizan → Tizanidine | Myospas → Thiocolchicoside
Neuropsychiatric: Nexito / Rexipra / Cipralex → Escitalopram | Alprax / Restyl → Alprazolam`;


// ─── Build speaker-labeled transcript from diarized lines ─────────────────────
// Converts [{speaker, name, text}] → "Dr. Arjun: ...\nPriya: ..."
// KEY step: passing labeled text to extractMedicalData improves attribution.
export function buildLabeledTranscript(lines) {
  if (!lines || lines.length === 0) return '';
  return lines
    .filter(l => l.text?.trim())
    .map(l => `${l.name}: ${l.text.trim()}`)
    .join('\n');
}

// ─── Medical Transcript Correction ───────────────────────────────────────────
// Post-processes raw Whisper output: fixes misheard drug names, dosages, medical
// terms, and ambiguous regional speech. Returns corrected plain text.
export async function correctTranscript(rawText, detectedLang = 'en') {
  if (!rawText?.trim()) return rawText;
  const isMultilingual = detectedLang === 'auto' || detectedLang === 'multilingual';
  const langHint = isMultilingual
    ? 'mixed Hindi/Marathi/English (code-switched)'
    : ({ hi: 'Hindi', mr: 'Marathi', en: 'English' }[detectedLang] || 'mixed');
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0,
      messages: [
        {
          role:    'system',
          content: `You are a medical transcription correction engine for Indian hospitals. You receive raw ASR (Whisper) output from a doctor-patient consultation in ${langHint}. Your job:

1. Fix misheard drug names using this reference:
   Paracetamol: "Paracetamole" "Paracitamol" "Para tamol" → Paracetamol
   Pantoprazole: "Pantaprazole" "Panto prazole" "Pantopratsol" → Pantoprazole
   Combiflam: "Combiflame" "Combi flame" "Kombiflem" → Combiflam
   Augmentin: "Augmanton" "Og mentin" "Augmentine" → Augmentin
   Azithromycin: "Azithro mycin" "Azithromicin" "Azi thromycin" → Azithromycin
   Metformin: "Met formin" "Metformine" → Metformin
   Cetirizine: "Setirizine" "Cetarizine" "Cetirizin" → Cetirizine
   Ciprofloxacin: "Cipro floxacin" "Cyprofloxacin" → Ciprofloxacin
   Metronidazole: "Metro nidazole" "Metranidazole" → Metronidazole
   Ondansetron: "Ondansatron" "Ondansetrone" → Ondansetron
   Atorvastatin: "Atorvastine" "Ator wastatin" → Atorvastatin
   Amlodipine: "Amlo dipine" "Amlodipene" → Amlodipine
   Telmisartan: "Telmi sartan" "Telmisartane" → Telmisartan
   Montelukast: "Monte lukast" "Montelukaste" → Montelukast

2. Expand dose abbreviations to full English phrases (preserve original language around them):
   BD / B.D / bd → twice daily
   TDS / T.D.S / tds → three times daily
   OD / O.D / od → once daily
   SOS / S.O.S / sos → as needed
   HS / H.S / hs → at bedtime
   QID / Q.I.D → four times daily
   AC / a.c → before meals
   PC / p.c → after meals
   STAT / stat → immediately
   PRN / p.r.n → as needed

3. Fix dosage written ambiguously:
   "five hundred mg" → "500mg" | "two fifty mg" → "250mg"
   "twice" alone (in dosage context) → "twice daily"

4. Fix misheard medical terms:
   "high pertension" → "hypertension" | "diebetes" → "diabetes"
   "pnemonia" → "pneumonia" | "bronkitis" → "bronchitis"
   "artritis" → "arthritis" | "colestrol" → "cholesterol"
   "tyfoid" "typhoid fever" → "typhoid"

5. Preserve original language — do NOT translate. If Hindi/Marathi sentence, keep it in Hindi/Marathi.
6. Remove filler sounds (um, uh, hmm) but preserve all medical content.
7. Do NOT add or invent any medical information not present in the original.

Return ONLY the corrected transcript text. No explanation, no prefix, no markdown.`,
        },
        { role: 'user', content: rawText },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Correction failed: ${await res.text()}`);
  const data = await res.json();
  // Strip deepseek-r1 <think> block if present
  const corrected = data.choices[0].message.content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
  return corrected || rawText;
}

// ─── Whisper Speech-to-Text ───────────────────────────────────────────────────
// ─── STT constants ────────────────────────────────────────────────────────────
const DEEPGRAM_KEY  = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY;
const SARVAM_KEY    = process.env.EXPO_PUBLIC_SARVAM_API_KEY;

// ─── STT routing strategy ─────────────────────────────────────────────────────
// mr-IN  → Sarvam saarika:v2  (best Marathi ASR)
// hi-IN  → Groq Whisper       (reliable, FormData-based, handles Hindi well)
// en-IN  → Groq Whisper       (reliable)
// auto   → Groq Whisper       (auto language detect)
//
// Deepgram WebSocket streaming is used for real-time interim display (future).
// Deepgram REST is NOT used from React Native — it requires raw binary body
// which cannot be sent via fetch() with a local file:// URI.

async function transcribeWithSarvam(audioUri, languageCode) {
  const formData = new FormData();
  formData.append('file', {
    uri:  audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  });
  formData.append('language_code', languageCode || 'mr-IN');
  formData.append('model',         'saarika:v2');
  formData.append('with_timestamps', 'false');

  const res = await fetch('https://api.sarvam.ai/speech-to-text', {
    method:  'POST',
    headers: { 'api-subscription-key': SARVAM_KEY },
    body:    formData,
  });

  if (!res.ok) throw new Error(`Sarvam STT failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return {
    text:     data.transcript || '',
    language: languageCode || 'mr-IN',
    duration: 0,
    segments: [],
  };
}

async function transcribeWithWhisper(audioUri, languageCode) {
  // Accept both full codes ('hi-IN') and short codes ('hi') — strip region suffix for Whisper
  const shortCode = languageCode && languageCode !== 'auto' ? languageCode.split('-')[0] : undefined;
  const lang   = shortCode ? (LANG_MAP[shortCode] || shortCode) : undefined;
  const prompt = lang ? LANG_PROMPT[lang] : undefined;

  const formData = new FormData();
  formData.append('file', { uri: audioUri, type: 'audio/m4a', name: 'recording.m4a' });
  formData.append('model', 'whisper-large-v3-turbo');
  if (lang)   formData.append('language', lang);
  if (prompt) formData.append('prompt',   prompt);
  formData.append('response_format', 'verbose_json');

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}` },
    body:    formData,
  });
  if (!res.ok) throw new Error(`Whisper STT failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return {
    text:     data.text || '',
    language: data.language || lang || 'en',
    duration: data.duration || 0,
    segments: data.segments || [],
  };
}

// ─── Main STT entry point ─────────────────────────────────────────────────────
export async function transcribeAudio(audioUri, languageCode) {
  // Marathi → Sarvam (best regional support); fallback to Whisper
  if (languageCode === 'mr-IN' || languageCode === 'mr') {
    try {
      return await transcribeWithSarvam(audioUri, languageCode);
    } catch (e) {
      console.warn('[STT] Sarvam failed, falling back to Whisper:', e.message);
    }
  }
  // All others → Groq Whisper (FormData, works reliably with local file:// URIs)
  return transcribeWithWhisper(audioUri, languageCode);
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
      temperature:     0,
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
  // deepseek-r1 prepends <think>...</think> reasoning — strip before parsing JSON
  const content = data.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    parsed = JSON.parse(cleaned);
  }
  return validateExtraction(parsed, transcript);
}

// ─── Post-extraction grounding validator ─────────────────────────────────────
// Removes any field value that has NO textual evidence in the original transcript.
// Prevents the model from hallucinating default values (e.g. Paracetamol / 3 days).
function validateExtraction(data, transcript) {
  if (!data || !transcript) return data;
  const tx = transcript.toLowerCase();

  // Strip medications with zero evidence — name must appear in transcript (any form)
  if (Array.isArray(data.medications)) {
    data.medications = data.medications.filter(med => {
      const name  = (med.name              || '').toLowerCase();
      const brand = (med.prescription_name || '').toLowerCase();
      const dosage= (med.dosage            || '').toLowerCase();
      // Accept if any token from the drug name appears in the transcript
      const nameTokens  = name.split(/[\s,+]+/).filter(t => t.length > 3);
      const brandTokens = brand.split(/[\s,+]+/).filter(t => t.length > 3);
      const allTokens   = [...nameTokens, ...brandTokens];
      if (allTokens.length === 0) return false;
      return allTokens.some(token => tx.includes(token));
    });
  }

  // Strip symptoms with zero evidence — at least one word must be in transcript
  if (Array.isArray(data.symptoms)) {
    data.symptoms = data.symptoms.filter(sym => {
      const tokens = sym.toLowerCase().split(/\s+/).filter(t => t.length > 3);
      return tokens.length === 0 || tokens.some(t => tx.includes(t));
    });
  }

  // Strip duration if no numeric or duration keyword found in transcript
  if (data.symptom_duration) {
    const durationKeywords = /\d|days?|weeks?|months?|din|hafte|mahine|subah|raat|ghante|hours?/i;
    if (!durationKeywords.test(transcript) && !durationKeywords.test(data.symptom_duration)) {
      data.symptom_duration = null;
    }
  }

  return data;
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

// ─── Multi-segment transcription (for language-switched recordings) ───────────
// Accepts [{uri, lang}] — transcribes each segment with its declared language,
// then merges into a single transcript string separated by newlines.
// Returns the same shape as transcribeAudio() so callers treat it uniformly.
export async function transcribeSegments(segments) {
  if (!segments || segments.length === 0) throw new Error('No segments provided');
  // Transcribe all segments in parallel
  const results = await Promise.all(
    segments.map(seg => transcribeAudio(seg.uri, seg.lang || 'auto').catch(err => {
      console.warn('[STT] Segment failed, skipping:', err.message);
      return { text: '', language: 'en', duration: 0, segments: [] };
    }))
  );
  const mergedText     = results.map(r => r.text).filter(Boolean).join('\n');
  const totalDuration  = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  // Primary language = first segment's detected language
  const primaryLang    = results.find(r => r.language)?.language || 'en';
  return {
    text:     mergedText,
    language: primaryLang,
    duration: totalDuration,
    segments: results.flatMap(r => r.segments || []),
  };
}

// Runs on the CORRECTED transcript for best accuracy.
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
          content: `You are an expert speaker diarization engine for Indian doctor-patient medical consultations. The conversation may be in Hindi, Marathi, English, or heavily code-switched (Hinglish / Marglish). Your accuracy directly affects patient safety.

━━━ DOCTOR SPEECH SIGNALS (assign speaker="doctor") ━━━
Diagnostic questions:
  "kab se hai?", "kab se ho raha hai?", "kitne din se?", "kya takleef hai?", "aur koi problem?"
  "BP kaisa hai?", "sugar check kari?", "X-ray karaya?", "CBC kiya tha?"
  "Koi allergy toh nahi?", "pehle koi bimari?", "family history?"
Prescription language (STRONGEST SIGNAL — always doctor):
  ANY utterance with "mg", "tablet", "capsule", "twice daily", "BD", "TDS", "OD", "SOS"
  ANY utterance naming a drug + dose + frequency or duration
  "Paracetamol 500mg twice daily for 5 days", "Pantoprazole 40mg OD"
  "ye dawayi lo", "ye tablet lo", "injection lagenge", "drip lagaao"
Instructions / follow-up:
  "rest karo", "pani zyada piyo", "kal wapas aao", "ek hafte mein dekhte hain"
  "bland diet lo", "tel-mirch band karo", "khana khane ke baad lo"
Diagnosis:
  "ye viral fever hai", "upper respiratory infection", "BP high hai", "diabetes confirm hai"
  "infection hai", "ulcer lag raha hai", "X-ray normal hai"
Clinical terms (almost always doctor):
  "BP", "SPO2", "pulse", "temperature", "CBC", "LFT", "KFT", "ECG", "X-ray", "USG", "MRI"
  "prescription", "refer karta hoon", "specialist ko dikhao"
Marathi doctor patterns:
  "किती दिवसांपासून आहे?", "औषध घ्या", "दोन वेळा घ्या", "उद्या परत या"

━━━ PATIENT SPEECH SIGNALS (assign speaker="patient") ━━━
Symptom reports (STRONGEST SIGNAL — always patient):
  "mujhe dard hai", "sir dard hai", "pet mein dard", "sine mein dard"
  "bukhar aa raha hai", "bukhar hai", "tez bukhar hai"
  "khansi ho rahi hai", "saans nahi aa rahi", "naak beh raha hai"
  "weakness feel ho rahi hai", "thakaan hai", "chakkar aa rahe hain"
  "ulti aayi", "dast ho rahe hain", "bhookh nahi lag rahi"
Duration phrases (always patient describing their own symptoms):
  "teen din se", "2 din se", "kal raat se", "subah se", "ek hafte se"
  "pichle mahine se", "kuch dino se"
Agreement / answers to doctor questions:
  "haan", "nahi", "ji", "haan doctor sahib", "theek hai doctor"
  Pain scale: "5 number ka dard", "bahut tez dard"
History / allergies:
  "pehle bhi hua tha", "koi allergy nahi", "BP ki dawayi leta hoon"
Marathi patient patterns:
  "मला दुखत आहे", "ताप आहे", "थकवा आहे", "तीन दिवसांपासून"

━━━ CRITICAL RULES ━━━
1. NEVER assign a medication prescription line to "patient" — prescriptions are always doctor.
2. NEVER assign symptom complaints ("mujhe dard hai", "bukhar hai") to "doctor".
3. A single utterance may switch language mid-sentence — classify by CONTENT, not language.
4. Split long blocks into individual speaker turns at natural boundaries.
5. If a block mixes doctor Q and patient A (common in rushed transcripts), split them.
6. Preserve EXACT original text — do NOT translate, correct spelling, or paraphrase.
7. Label "noise" only for truly inaudible content — NOT for coughs, door sounds, or short pauses.

Return ONLY valid JSON: {"lines": [{"speaker": "doctor"|"patient"|"noise", "name": "<actual name>", "text": "<exact utterance>"}]}
No markdown, no explanation.`,
        },
        {
          role:    'user',
          content: `Doctor name: ${doctorName}. Patient name: ${patientName}. Language: ${detectedLang || 'mixed Hindi/English'}.\n\nTranscript:\n${rawText}`,
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
