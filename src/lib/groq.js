import Groq from 'groq-sdk'

const apiKey = import.meta.env.VITE_GROQ_API_KEY

if (!apiKey) {
  console.warn('⚠️  Groq API key missing — check your .env file')
}

export const groq = new Groq({
  apiKey,
  dangerouslyAllowBrowser: true, // safe for hackathon / demo
})

/**
 * Extract structured data from a raw voice transcript.
 * Swap out the system prompt on hackathon day once you know the problem.
 *
 * @param {string} transcript - Raw text from ASR
 * @param {string} [systemPrompt] - Optional override for problem-specific extraction
 * @returns {Promise<object>} - Parsed JSON object
 */
export async function extractFromTranscript(transcript, systemPrompt) {
  const DEFAULT_SYSTEM = `You are a medical data extraction assistant for Indian hospitals.
Given a voice transcript (possibly in Hindi, Marathi, or English), extract all relevant
medical/patient information and return ONLY a valid JSON object. No explanation, no markdown.`

  const chat = await groq.chat.completions.create({
    model: 'llama3-8b-8192', // fast + free; upgrade to llama3-70b if needed
    temperature: 0.1,
    messages: [
      { role: 'system', content: systemPrompt || DEFAULT_SYSTEM },
      { role: 'user', content: `Transcript:\n${transcript}` },
    ],
  })

  const raw = chat.choices[0]?.message?.content || '{}'
  try {
    return JSON.parse(raw)
  } catch {
    console.error('Groq returned non-JSON:', raw)
    return { raw_response: raw }
  }
}
