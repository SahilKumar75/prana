import { useState, useEffect } from 'react';
import { useVoice } from './hooks/useVoice';
import { useIsMobile } from './hooks/useIsMobile';
import { api } from './lib/api';

import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { SessionHistory } from './components/SessionHistory';
import { RecordingView } from './components/RecordingView';
import { DesktopLayout } from './components/desktop/DesktopLayout';

export default function App() {
  const isMobile = useIsMobile();

  // App routing and UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);
  
  // Data state
  const [sessions, setSessions] = useState([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [latestTranscript, setLatestTranscript] = useState("");
  const [stats, setStats] = useState({ successRate: "100%", topLanguage: "hi-IN" });

  // Voice AI State
  const [language, setLanguage] = useState('hi-IN');
  const [isProcessing, setIsProcessing] = useState(false);
  const [appError, setAppError] = useState(null);

  const { transcript, isListening, startListening, stopListening, resetTranscript, error: voiceError } = useVoice({ language });

  const loadData = async () => {
    try {
      const [data, statsData] = await Promise.all([
        api.getSessions(),
        api.getStats(),
      ]);
      setSessions(data);
      setSessionCount(data.length);
      if (data.length > 0) setLatestTranscript(data[0].raw_transcript);
      setStats({
        successRate: statsData.success_rate,
        topLanguage: statsData.top_language,
      });
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProcess = async () => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    setAppError(null);
    try {
      await api.createSession(transcript, language);
      await loadData();
      setIsRecordingOpen(false);
      resetTranscript();
    } catch (e) {
      setAppError(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordClick = () => {
    setIsRecordingOpen(!isRecordingOpen);
    if (isListening) stopListening();
  };

  // ── Desktop layout ─────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <>
        <DesktopLayout
          sessions={sessions}
          sessionCount={sessionCount}
          stats={stats}
          latestTranscript={latestTranscript}
          onRecordClick={handleRecordClick}
          isRecording={isListening}
          isRecordingOpen={isRecordingOpen}
        />
        {isRecordingOpen && (
          <RecordingView
            isListening={isListening}
            transcript={transcript}
            startListening={startListening}
            stopListening={stopListening}
            handleProcess={handleProcess}
            isProcessing={isProcessing}
            language={language}
            setLanguage={setLanguage}
            voiceError={voiceError}
            appError={appError}
          />
        )}
      </>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-app-bg flex justify-center text-app-dark font-body overflow-x-hidden selection:bg-app-pink/30">
      
      {/* 
        Responsive Container:
        Mobile: max-w-md column.
        Desktop: flex row with sidebar
      */}
      <div className="w-full lg:max-w-7xl min-h-screen flex flex-col lg:flex-row relative lg:pr-8">
        
        {/* Navigation Wrapper */}
        <Navigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onRecordClick={handleRecordClick}
          isRecording={isListening || isRecordingOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 lg:ml-12 w-full lg:w-auto relative pb-32 lg:pb-8 flex flex-col lg:flex-row">
          
          {activeTab === 'dashboard' ? (
            <Dashboard 
              sessionCount={sessionCount} 
              latestTranscript={latestTranscript} 
              stats={stats} 
            />
          ) : (
            <SessionHistory sessions={sessions} />
          )}

        </div>

      </div>

      {/* Recording Overlay View (Z-indexed above everything) */}
      {isRecordingOpen && (
        <RecordingView 
          isListening={isListening}
          transcript={transcript}
          startListening={startListening}
          stopListening={stopListening}
          handleProcess={handleProcess}
          isProcessing={isProcessing}
          language={language}
          setLanguage={setLanguage}
          voiceError={voiceError}
          appError={appError}
        />
      )}
      
    </div>
  );
}
