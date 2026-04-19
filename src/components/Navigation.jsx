import { LayoutDashboard, History, MessageSquare, User, Plus } from 'lucide-react';

export const Navigation = ({ activeTab, setActiveTab, onRecordClick, isRecording }) => {
  return (
    <>
      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
        <button 
          onClick={onRecordClick}
          className={`absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center text-app-dark shadow-lg transition-transform hover:scale-105 active:scale-95 ${
            isRecording ? 'bg-red-400 animate-pulse' : 'bg-app-pink'
          }`}
        >
          <Plus size={28} className={isRecording ? 'rotate-45 transition-transform' : 'transition-transform'} strokeWidth={2.5} />
        </button>

        <div className="bg-app-dark rounded-[2rem] px-8 py-5 flex justify-between items-center shadow-2xl">
          <button onClick={() => setActiveTab('dashboard')} className={`${activeTab === 'dashboard' ? 'text-white' : 'text-white/50'} hover:text-white transition-colors`}>
            <LayoutDashboard size={24} strokeWidth={1.5} />
          </button>
          <button onClick={() => setActiveTab('history')} className={`${activeTab === 'history' ? 'text-white' : 'text-white/50'} hover:text-white transition-colors mr-8`}>
            <History size={24} strokeWidth={1.5} />
          </button>
          <button className="text-white/50 hover:text-white transition-colors ml-8">
            <MessageSquare size={24} strokeWidth={1.5} />
          </button>
          <button className="text-white/50 hover:text-white transition-colors">
            <User size={24} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Desktop Left Sidebar */}
      <div className="hidden lg:flex flex-col w-24 h-screen border-r border-black/5 bg-white/50 py-8 items-center justify-between sticky top-0 shrink-0">
        <div className="flex flex-col items-center gap-8">
          <div className="w-12 h-12 bg-app-pink rounded-2xl flex items-center justify-center font-heading text-xl text-app-dark font-bold shadow-sm">
            Pr
          </div>
          <div className="flex flex-col gap-6">
            <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-app-dark text-white shadow-md' : 'text-app-dark/40 hover:bg-black/5 hover:text-app-dark'}`}>
              <LayoutDashboard size={24} strokeWidth={1.5} />
            </button>
            <button onClick={() => setActiveTab('history')} className={`p-3 rounded-2xl transition-all ${activeTab === 'history' ? 'bg-app-dark text-white shadow-md' : 'text-app-dark/40 hover:bg-black/5 hover:text-app-dark'}`}>
              <History size={24} strokeWidth={1.5} />
            </button>
            <button className="p-3 rounded-2xl transition-all text-app-dark/40 hover:bg-black/5 hover:text-app-dark">
              <MessageSquare size={24} strokeWidth={1.5} />
            </button>
            <button className="p-3 rounded-2xl transition-all text-app-dark/40 hover:bg-black/5 hover:text-app-dark">
              <User size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <button 
          onClick={onRecordClick}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-app-dark shadow-lg transition-transform hover:scale-105 active:scale-95 ${
            isRecording ? 'bg-red-400 animate-pulse' : 'bg-app-yellow'
          }`}
        >
          <Plus size={28} className={isRecording ? 'rotate-45 transition-transform' : 'transition-transform'} strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
};
