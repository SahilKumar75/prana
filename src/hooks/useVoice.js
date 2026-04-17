import { useState, useRef, useCallback } from 'react'

/**
 * useVoice — handles ASR via Web Speech API (primary) or Sarvam AI (fallback)
 *
 * Returns: { transcript, isListening, startListening, stopListening, resetTranscript, error }
 */
export function useVoice({ language = 'hi-IN' } = {}) {
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  const startListening = useCallback(() => {
    setError(null)

    // ── Web Speech API ────────────────────────────────────────────────────────
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.lang = language          // e.g. 'hi-IN', 'mr-IN', 'en-IN'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (e) => {
        const full = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join(' ')
        setTranscript(full)
      }

      recognition.onerror = (e) => {
        setError(`Speech recognition error: ${e.error}`)
        setIsListening(false)
      }

      recognition.onend = () => setIsListening(false)

      recognitionRef.current = recognition
      recognition.start()
      setIsListening(true)
      return
    }

    // ── Sarvam AI fallback (MediaRecorder → API) ──────────────────────────────
    // Uncomment and wire up your Sarvam API key once registered
    /*
    const sarvamKey = import.meta.env.VITE_SARVAM_API_KEY
    if (!sarvamKey) { setError('No ASR available — add VITE_SARVAM_API_KEY'); return }

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mediaRecorder = new MediaRecorder(stream)
      const chunks = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        const formData = new FormData()
        formData.append('file', blob, 'audio.wav')
        formData.append('language_code', 'hi-IN')
        formData.append('model', 'saarika:v1')
        const res = await fetch('https://api.sarvam.ai/speech-to-text', {
          method: 'POST',
          headers: { 'api-subscription-key': sarvamKey },
          body: formData,
        })
        const data = await res.json()
        setTranscript(data.transcript || '')
        setIsListening(false)
      }
      mediaRecorder.start()
      recognitionRef.current = mediaRecorder
      setIsListening(true)
    })
    */

    setError('Speech Recognition not supported in this browser. Try Chrome.')
  }, [language])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => setTranscript(''), [])

  return { transcript, isListening, startListening, stopListening, resetTranscript, error }
}
