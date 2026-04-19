import { CheckCircle2, ChevronDown } from 'lucide-react';
import { Tag } from './Tag';

export const RecordingView = ({ 
  isListening, 
  transcript, 
  startListening, 
  stopListening,
  handleProcess,
  isProcessing,
  language,
  setLanguage,
  voiceError, appError 
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-app-bg/95 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col pt-16 pb-24 px-6 lg:justify-center">
      
      {/* Top Language Pill Toggle */}
      <div className="flex justify-center mb-12">
        <div className="bg-white px-1.5 py-1.5 rounded-full shadow-sm border border-black/5 flex gap-1">
          {[['hi-IN', 'हिंदी'], ['mr-IN', 'मराठी'], ['en-IN', 'English']].map(([code, label]) => (
            <button 
              key={code} 
              onClick={() => setLanguage(code)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                language === code ? 'bg-app-dark text-white' : 'text-app-dark/60 hover:text-app-dark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl lg:mx-auto w-full">
        {/* Animated Mic Orb */}
        <div 
          onClick={isListening ? stopListening : startListening}
          className="relative w-48 h-48 flex items-center justify-center cursor-pointer group mb-12"
        >
          {isListening && (
            <>
              <div className="absolute inset-0 bg-app-pink rounded-full opacity-40 animate-ping" />
              <div className="absolute inset-4 bg-app-pink rounded-full opacity-60 animate-pulse" />
            </>
          )}
          <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${
            isListening ? 'bg-white shadow-app-pink/50 scale-110' : 'bg-app-dark shadow-black/20 group-hover:scale-105'
          }`}>
            <svg 
              className={`w-10 h-10 transition-colors ${isListening ? 'text-app-pink animate-pulse' : 'text-white'}`} 
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
        </div>

        {/* Live Transcript / Prompt */}
        <h3 className="text-center font-heading font-medium text-2xl mb-6 text-app-dark">
          {isListening ? "Listening to your vitals..." : "Tap to Intelly Assistant"}
        </h3>
        
        <div className="bg-white/50 border border-black/5 rounded-3xl p-6 min-h-[160px] w-full flex items-center justify-center relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-app-blue/20 rounded-full blur-[40px]" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-app-yellow/20 rounded-full blur-[40px]" />
          
          <p className={`relative z-10 text-center font-body ${transcript ? 'text-app-dark text-lg' : 'text-app-dark/30 italic text-base'}`}>
            {transcript || (isListening ? 'Speak now... (Tap orb to stop)' : 'Awaiting your command...')}
          </p>
        </div>
        
        {transcript.trim() && (
          <div className="mt-8 w-full animate-in slide-in-from-bottom-4 items-center flex justify-center">
             <button 
                onClick={handleProcess} 
                disabled={isProcessing}
                className="bg-app-dark text-white rounded-full px-12 py-4 font-medium text-lg disabled:opacity-50 hover:bg-black transition-colors shadow-lg"
              >
                {isProcessing ? 'Generating actions...' : 'Generate Actions'}
              </button>
          </div>
        )}

        {(voiceError || appError) && <p className="text-center text-red-500 mt-6 text-sm font-medium bg-red-50 px-4 py-2 rounded-full">{voiceError || appError}</p>}
      </div>
    </div>
  );
};
