import { HighlightCard } from './HighlightCard';
import { PillBlob, CloudBlob, HeartBlob, StarBlob } from './OrganicShapes';
import { Info } from 'lucide-react';

export const Dashboard = ({ sessionCount = 0, latestTranscript = "Say something...", stats }) => {
  return (
    <div className="flex-1 w-full max-w-lg lg:max-w-none mx-auto lg:mx-0 lg:pr-8 animate-in fade-in">
      <div className="flex flex-col lg:flex-row items-center justify-between mt-8 mb-8 relative px-6 lg:px-0">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <h2 className="text-xl font-body font-medium text-app-dark/80 mb-2">Prana, your session overview</h2>
          <div className="relative">
            <h1 className="text-[7rem] lg:text-[9rem] leading-none font-heading font-medium tracking-tight text-app-dark">
              {sessionCount}
            </h1>
            <StarBlob 
              className="w-10 h-10 absolute -top-4 -right-8 lg:-right-4" 
              fill="var(--color-app-pink)" 
            />
          </div>
          
          <div className="flex items-center gap-2 mt-2 justify-center lg:justify-start">
            <span className="text-sm font-body text-app-dark/60">sessions recorded today</span>
            <button className="text-app-dark/40 hover:text-app-dark/60 transition-colors">
              <Info size={14} />
            </button>
          </div>
        </div>
        
        {/* Desktop Right Side Content (hidden on mobile) */}
        <div className="hidden lg:flex w-72 bg-white rounded-3xl p-6 shadow-sm border border-black/5 flex-col gap-4 self-stretch">
          <h3 className="font-heading font-medium text-lg">System Health</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-app-green/20 flex items-center justify-center text-app-green">
               <CloudBlob className="w-6 h-6" fill="currentColor" />
            </div>
            <div>
              <p className="text-xs text-app-dark/60">Groq API</p>
              <p className="font-medium">All systems go</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="w-12 h-12 rounded-full bg-app-blue/20 flex items-center justify-center text-app-blue">
               <PillBlob className="w-6 h-6" fill="currentColor" />
            </div>
            <div>
              <p className="text-xs text-app-dark/60">Database</p>
              <p className="font-medium">Connected</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-0">
        <div className="flex justify-between items-end mb-4 mt-12">
          <div>
            <h3 className="text-lg font-heading font-medium">Prana Insights</h3>
            <p className="text-xs text-app-dark/60 font-medium">Voice AI extraction status</p>
          </div>
        </div>

        {/* Mosaic Gallery replacing Sleep/Water standard widgets */}
        <div className="h-[400px] w-full rounded-[2.5rem] bg-white border border-black/5 p-4 relative overflow-hidden shadow-sm">
          
          <div className="absolute top-4 right-8 w-28 h-28 hidden lg:block">
             <HighlightCard 
              shape={PillBlob} color="var(--color-app-yellow)" title="Status" subtitle={stats?.successRate || "100%"} textPosition="top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2"
            />
          </div>

          <div className="absolute top-16 right-4 w-32 h-32 lg:w-40 lg:h-40">
            <HighlightCard 
              shape={CloudBlob} color="var(--color-app-green)" title="Processed" subtitle={`${sessionCount} extractions`}
            />
          </div>

          <div className="absolute top-12 left-4 w-32 h-32 lg:left-12 lg:w-36 lg:h-36">
            <HighlightCard 
              shape={PillBlob} color="var(--color-app-blue)" title="Language" subtitle={stats?.topLanguage || "hi-IN"} textPosition="top-1/2 left-1/2 -translate-x-[40%] -translate-y-[30%]"
            />
          </div>

          {/* Last Transcript Card - using the big heart shape */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 h-48 lg:w-56 lg:h-56">
            <div className="relative w-full h-full flex items-center justify-center">
              <HeartBlob className="" fill="var(--color-app-pink)" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
                <span className="font-heading font-medium text-app-dark/80 text-sm mb-1">Last Transcript</span>
                <span className="font-body text-xs text-app-dark line-clamp-3 leading-snug font-medium max-w-[120px]">{latestTranscript || "No sessions yet."}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
