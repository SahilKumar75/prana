import { useState } from 'react'
import { useVoice } from './hooks/useVoice'
import { extractFromTranscript } from './lib/groq'
import { supabase } from './lib/supabase'

export default function App() {
  const [language, setLanguage] = useState('hi-IN')
  const [extractedData, setExtractedData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const [appError, setAppError] = useState(null)

  const { transcript, isListening, startListening, stopListening, resetTranscript, error: voiceError } = useVoice({ language })

  const handleProcess = async () => {
    if (!transcript.trim()) return
    setIsProcessing(true)
    setAppError(null)
    try {
      const data = await extractFromTranscript(transcript)
      setExtractedData(data)
      const { data: row, error } = await supabase
        .from('sessions')
        .insert({ raw_transcript: transcript, extracted_data: data, language, status: 'processed' })
        .select()
        .single()
      if (error) throw error
      setSavedId(row.id)
    } catch (e) {
      setAppError(e.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    resetTranscript()
    setExtractedData(null)
    setSavedId(null)
    setAppError(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-['Sora',sans-serif]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&display=swap');`}</style>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-teal-400/8 blur-[100px]" />
      </div>
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <div className="mb-14 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Voice AI · Healthcare
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white">
            प्राण <span className="text-emerald-400">Prana</span>
          </h1>
          <p className="mt-3 text-white/40 text-sm tracking-wide">
            Speak. Extract. Save. — Real-time multilingual healthcare intelligence.
          </p>
        </div>
        <div className="flex gap-2 mb-8 justify-center">
          {[['hi-IN', 'हिंदी'], ['mr-IN', 'मराठी'], ['en-IN', 'English']].map(([code, label]) => (
            <button key={code} onClick={() => setLanguage(code)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${language === code ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 mb-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs text-white/40 uppercase tracking-widest">Transcript</span>
            {transcript && <button onClick={handleReset} className="text-xs text-white/30 hover:text-white/60 transition">Clear</button>}
          </div>
          <div className="min-h-[120px] mb-6 text-white/80 text-sm leading-relaxed">
            {transcript || <span className="text-white/20 italic">{isListening ? 'Listening… speak now' : 'Press Record to begin'}</span>}
          </div>
          <div className="flex gap-3">
            <button onClick={isListening ? stopListening : startListening}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${isListening ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500 text-black hover:bg-emerald-400'}`}>
              {isListening ? '⏹ Stop Recording' : '🎙 Start Recording'}
            </button>
            <button onClick={handleProcess} disabled={!transcript.trim() || isProcessing}
              className="flex-1 py-3 rounded-xl font-semibold text-sm bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              {isProcessing ? '⏳ Processing…' : '✨ Extract & Save'}
            </button>
          </div>
          {(voiceError || appError) && <p className="mt-4 text-red-400 text-xs">{voiceError || appError}</p>}
        </div>
        {extractedData && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs text-emerald-400/70 uppercase tracking-widest">Extracted Data</span>
              {savedId && <span className="text-xs text-white/30">Saved · <code className="text-white/20">{savedId.slice(0, 8)}…</code></span>}
            </div>
            <pre className="text-emerald-300 text-xs leading-relaxed overflow-auto whitespace-pre-wrap">
              {JSON.stringify(extractedData, null, 2)}
            </pre>
          </div>
        )}
        <p className="mt-10 text-center text-white/20 text-xs">
          Stack: React · Vite · Groq (Llama 3) · Supabase · Web Speech API
        </p>
      </div>
    </div>
  )
}
