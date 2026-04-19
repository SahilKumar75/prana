import { FileText, Clock } from 'lucide-react';
import { Tag } from './Tag';

export const SessionHistory = ({ sessions = [] }) => {
  return (
    <div className="flex-1 w-full max-w-lg lg:max-w-none mx-auto lg:mx-0 lg:pr-8 animate-in fade-in py-8 px-6 lg:px-0">
      
      <div className="mb-8">
        <h2 className="text-3xl font-heading font-medium text-app-dark mb-2">Session History</h2>
        <p className="text-sm text-app-dark/60 font-body">Review past vitals extractions</p>
      </div>

      <div className="flex flex-col gap-4">
        {sessions.length === 0 ? (
          <div className="bg-white/50 border border-black/5 rounded-3xl p-10 text-center">
            <p className="text-app-dark/40 font-body">No previous sessions found.</p>
          </div>
        ) : (
          sessions.map((session, i) => (
            <div key={session.id || i} className="bg-white border border-black/5 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2 items-center">
                  <div className="w-10 h-10 rounded-full bg-app-pink/20 flex items-center justify-center text-app-pink">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="font-heading font-medium text-lg text-app-dark">Voice Extraction</h4>
                    <span className="flex items-center gap-1 text-xs text-app-dark/50">
                      <Clock size={12} /> {new Date(session.created_at || Date.now()).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Tag color={session.language === 'en-IN' ? 'bg-app-blue/20 text-app-blue' : 'bg-app-green/20 text-app-green'}>
                  {session.language || 'hi-IN'}
                </Tag>
              </div>

              <div className="bg-app-bg/50 rounded-2xl p-4 mt-2">
                <p className="text-sm font-body text-app-dark/80 italic mb-3">"{session.raw_transcript}"</p>
                <div className="border-t border-black/5 pt-3">
                  <p className="text-xs font-semibold uppercase text-app-dark/40 mb-2 tracking-wider">Extracted Data</p>
                  <pre className="text-xs text-app-dark/80 whitespace-pre-wrap font-mono leading-relaxed bg-white p-3 rounded-xl overflow-x-auto border border-black/5">
                    {JSON.stringify(session.extracted_data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
