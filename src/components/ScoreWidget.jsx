import { Info } from 'lucide-react';
import { StarBlob } from './OrganicShapes';

export const ScoreWidget = ({ score = "8.8" }) => {
  return (
    <div className="flex flex-col items-center mt-10 mb-8 relative">
      <h2 className="text-xl font-body font-medium text-app-dark/80 mb-2">Taigo, how are you feeling today?</h2>
      
      <div className="relative">
        <h1 className="text-[7rem] leading-none font-heading font-medium tracking-tight text-app-dark">
          {score}
        </h1>
        {/* Pink Star Decoration next to the score */}
        <StarBlob 
          className="w-10 h-10 absolute -top-4 -right-8" 
          fill="var(--color-app-pink)" 
        />
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <span className="text-sm font-body text-app-dark/60">your health score</span>
        <button className="text-app-dark/40 hover:text-app-dark/60 transition-colors">
          <Info size={14} />
        </button>
      </div>
    </div>
  );
};
