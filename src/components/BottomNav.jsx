import { Heart, Calendar, MessageSquare, User, Plus } from 'lucide-react';

export const BottomNav = ({ onAddClick, isRecording }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
      {/* Floating Add Button */}
      <button 
        onClick={onAddClick}
        className={`absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center text-app-dark shadow-lg transition-transform hover:scale-105 active:scale-95 ${
          isRecording ? 'bg-red-400 animate-pulse' : 'bg-app-pink'
        }`}
      >
        <Plus size={28} className={isRecording ? 'rotate-45 transition-transform' : 'transition-transform'} strokeWidth={2.5} />
      </button>

      {/* Nav Background Pill */}
      <div className="bg-app-dark rounded-[2rem] px-8 py-5 flex justify-between items-center shadow-2xl">
        <button className="text-white/60 hover:text-white transition-colors">
          <Heart size={24} strokeWidth={1.5} />
        </button>
        <button className="text-white/60 hover:text-white transition-colors mr-8">
          <Calendar size={24} strokeWidth={1.5} />
        </button>
        
        {/* Spacer for FAB */}
        
        <button className="text-white/60 hover:text-white transition-colors ml-8">
          <MessageSquare size={24} strokeWidth={1.5} />
        </button>
        <button className="text-white/60 hover:text-white transition-colors">
          <User size={24} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
