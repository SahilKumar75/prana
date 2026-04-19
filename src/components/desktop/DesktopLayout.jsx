import { useState } from 'react';
import {
  House,
  ClockCounterClockwise,
  ChartBar,
  Gear,
  SignOut,
  MagnifyingGlass,
  Bell,
  UserCircle,
  FileText,
  Clock,
  CheckCircle,
  CaretRight,
  Plus,
  Lightning,
  Microphone,
  Translate,
} from '@phosphor-icons/react';

// ─── UI Translation strings ───────────────────────────────────────────────────

const UI_STRINGS = {
  en: {
    voiceAI: 'Voice AI',
    general: 'GENERAL',
    tools: 'TOOLS',
    dashboard: 'Dashboard',
    dashboardSub: 'Daily view',
    sessions: 'Sessions',
    sessionsSub: 'Session history',
    analytics: 'Analytics',
    analyticsSub: 'Insights',
    settings: 'Settings',
    settingsSub: 'Preferences',
    logout: 'Log out',
    newRecording: 'New Recording',
    recording: 'Recording…',
    search: 'Search sessions, transcripts…',
    greeting: (h) => h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening',
    greetingSub: (n) => `Prana is with you. You have ${n} session${n !== 1 ? 's' : ''} recorded.`,
    totalSessions: 'Total Sessions',
    today: 'Today',
    successRate: 'Success Rate',
    topLang: 'Top Language',
    allTime: 'All time',
    sessionsTodaySub: 'Sessions today',
    procAccuracy: 'Processing accuracy',
    recentSessions: 'Recent Sessions',
    viewAll: 'View all',
    noSessions: 'No sessions yet.',
    noSessionsSub: 'Record your first session',
    startRecording: 'Start Recording',
    voiceExtraction: 'Voice Extraction',
    processed: 'Processed',
    quickRecord: 'Quick Record',
    quickRecordSub: 'Capture your thoughts, symptoms, or notes by speaking.',
    startListening: 'Start Listening',
    todayLabel: 'Today',
    noToday: 'No sessions today',
    lastTranscript: 'Last Transcript',
    allSessions: 'All Sessions',
    allSessionsSub: (n) => `${n} total sessions`,
    langBreakdown: 'Language Breakdown',
    summary: 'Summary',
    noData: 'No data yet',
    done: 'Done',
    sessionNo: (n) => `Session #${n}`,
    settingsComingSoon: 'Settings coming soon.',
  },
  hi: {
    voiceAI: 'वॉइस AI',
    general: 'सामान्य',
    tools: 'उपकरण',
    dashboard: 'डैशबोर्ड',
    dashboardSub: 'दैनिक दृश्य',
    sessions: 'सत्र',
    sessionsSub: 'सत्र इतिहास',
    analytics: 'विश्लेषण',
    analyticsSub: 'अंतर्दृष्टि',
    settings: 'सेटिंग्स',
    settingsSub: 'प्राथमिकताएँ',
    logout: 'लॉग आउट',
    newRecording: 'नई रिकॉर्डिंग',
    recording: 'रिकॉर्ड हो रहा है…',
    search: 'सत्र, ट्रांसक्रिप्ट खोजें…',
    greeting: (h) => h < 12 ? 'सुप्रभात' : h < 17 ? 'नमस्ते' : 'शुभ संध्या',
    greetingSub: (n) => `प्राण आपके साथ है। आपके पास ${n} सत्र रिकॉर्ड हैं।`,
    totalSessions: 'कुल सत्र',
    today: 'आज',
    successRate: 'सफलता दर',
    topLang: 'मुख्य भाषा',
    allTime: 'अब तक',
    sessionsTodaySub: 'आज के सत्र',
    procAccuracy: 'सटीकता',
    recentSessions: 'हाल के सत्र',
    viewAll: 'सभी देखें',
    noSessions: 'अभी कोई सत्र नहीं।',
    noSessionsSub: 'अपना पहला सत्र रिकॉर्ड करें',
    startRecording: 'रिकॉर्डिंग शुरू करें',
    voiceExtraction: 'वॉइस एक्सट्रैक्शन',
    processed: 'संसाधित',
    quickRecord: 'त्वरित रिकॉर्ड',
    quickRecordSub: 'बोलकर अपने विचार, लक्षण, या नोट्स कैप्चर करें।',
    startListening: 'सुनना शुरू करें',
    todayLabel: 'आज',
    noToday: 'आज कोई सत्र नहीं',
    lastTranscript: 'अंतिम ट्रांसक्रिप्ट',
    allSessions: 'सभी सत्र',
    allSessionsSub: (n) => `कुल ${n} सत्र`,
    langBreakdown: 'भाषा विभाजन',
    summary: 'सारांश',
    noData: 'अभी कोई डेटा नहीं',
    done: 'पूर्ण',
    sessionNo: (n) => `सत्र #${n}`,
    settingsComingSoon: 'सेटिंग्स जल्द आएंगी।',
  },
  mr: {
    voiceAI: 'व्हॉइस AI',
    general: 'सामान्य',
    tools: 'साधने',
    dashboard: 'डॅशबोर्ड',
    dashboardSub: 'दैनंदिन दृश्य',
    sessions: 'सत्रे',
    sessionsSub: 'सत्र इतिहास',
    analytics: 'विश्लेषण',
    analyticsSub: 'अंतर्दृष्टी',
    settings: 'सेटिंग्ज',
    settingsSub: 'प्राधान्ये',
    logout: 'लॉग आउट',
    newRecording: 'नवीन रेकॉर्डिंग',
    recording: 'रेकॉर्ड होत आहे…',
    search: 'सत्रे, ट्रान्सक्रिप्ट शोधा…',
    greeting: (h) => h < 12 ? 'शुभ प्रभात' : h < 17 ? 'नमस्कार' : 'शुभ संध्या',
    greetingSub: (n) => `प्राण तुमच्यासोबत आहे। तुमच्याकडे ${n} सत्रे रेकॉर्ड आहेत।`,
    totalSessions: 'एकूण सत्रे',
    today: 'आज',
    successRate: 'यश दर',
    topLang: 'मुख्य भाषा',
    allTime: 'एकूण',
    sessionsTodaySub: 'आजची सत्रे',
    procAccuracy: 'अचूकता',
    recentSessions: 'अलीकडील सत्रे',
    viewAll: 'सर्व पहा',
    noSessions: 'अद्याप सत्रे नाहीत।',
    noSessionsSub: 'तुमचे पहिले सत्र रेकॉर्ड करा',
    startRecording: 'रेकॉर्डिंग सुरू करा',
    voiceExtraction: 'व्हॉइस एक्स्ट्रॅक्शन',
    processed: 'प्रक्रिया केली',
    quickRecord: 'जलद रेकॉर्ड',
    quickRecordSub: 'बोलून तुमचे विचार, लक्षणे किंवा नोट्स कॅप्चर करा।',
    startListening: 'ऐकणे सुरू करा',
    todayLabel: 'आज',
    noToday: 'आज सत्रे नाहीत',
    lastTranscript: 'शेवटचा ट्रान्सक्रिप्ट',
    allSessions: 'सर्व सत्रे',
    allSessionsSub: (n) => `एकूण ${n} सत्रे`,
    langBreakdown: 'भाषा विभाजन',
    summary: 'सारांश',
    noData: 'अद्याप डेटा नाही',
    done: 'पूर्ण',
    sessionNo: (n) => `सत्र #${n}`,
    settingsComingSoon: 'सेटिंग्ज लवकरच येतील।',
  },
};

// ─── Prana Wordmark ───────────────────────────────────────────────────────────

const PranaWordmark = () => (
  <div className="flex items-center gap-3 select-none">
    <div className="w-10 h-10 relative shrink-0">
      <div className="absolute inset-0 rounded-[11px] bg-app-pink opacity-20" />
      <div className="absolute inset-[3px] rounded-[8px] bg-app-pink opacity-50" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-base leading-none text-app-dark"
          style={{ fontFamily: "'Tiro Devanagari Hindi', serif", fontWeight: 700 }}
        >
          प्र
        </span>
      </div>
    </div>
    <div className="flex flex-col leading-none">
      <span
        className="text-[22px] text-white leading-none"
        style={{ fontFamily: "'Tiro Devanagari Hindi', serif", fontWeight: 400, letterSpacing: '0.03em' }}
      >
        प्राण
      </span>
      <span className="text-[9px] text-white/25 font-body font-normal mt-1 tracking-[0.22em] uppercase">
        Voice AI
      </span>
    </div>
  </div>
);

// ─── Language Toggle ──────────────────────────────────────────────────────────

const LangToggle = ({ lang, setLang }) => {
  const LANGS = [
    { code: 'en', label: 'EN' },
    { code: 'hi', label: 'HI' },
    { code: 'mr', label: 'MR' },
  ];
  return (
    <div className="flex items-center bg-white border border-black/8 rounded-xl p-0.5 shadow-sm">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`px-3 py-1.5 rounded-[9px] text-[11px] font-semibold tracking-wider transition-all ${
            lang === code
              ? 'bg-app-dark text-white shadow-sm'
              : 'text-app-dark/40 hover:text-app-dark'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar = ({ activeTab, setActiveTab, onRecordClick, isRecording, t }) => {
  const navItem = (id, icon, label, sub) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-left transition-all ${
        activeTab === id
          ? 'bg-white/10 text-white'
          : 'text-white/35 hover:text-white/75 hover:bg-white/5'
      }`}
    >
      <span className={`shrink-0 transition-colors ${activeTab === id ? 'text-app-pink' : 'text-current'}`}>
        {icon}
      </span>
      <span className="font-body text-sm font-medium leading-tight">
        {label}
        <span className="block text-[10px] opacity-40 font-normal mt-0.5">{sub}</span>
      </span>
      {activeTab === id && (
        <CaretRight size={12} weight="bold" className="ml-auto text-white/20" />
      )}
    </button>
  );

  return (
    <aside className="w-65 shrink-0 h-screen sticky top-0 bg-app-dark flex flex-col py-8 px-4 overflow-y-auto border-r border-white/5">
      <div className="px-4 mb-10">
        <PranaWordmark />
      </div>

      <div className="mb-6">
        <p className="text-white/15 text-[9px] font-bold uppercase tracking-[0.2em] px-4 mb-3">{t.general}</p>
        <nav className="flex flex-col gap-0.5">
          {navItem('dashboard', <House size={17} weight="duotone" />, t.dashboard, t.dashboardSub)}
          {navItem('history', <ClockCounterClockwise size={17} weight="duotone" />, t.sessions, t.sessionsSub)}
          {navItem('analytics', <ChartBar size={17} weight="duotone" />, t.analytics, t.analyticsSub)}
        </nav>
      </div>

      <div className="mb-auto">
        <p className="text-white/15 text-[9px] font-bold uppercase tracking-[0.2em] px-4 mb-3">{t.tools}</p>
        <nav className="flex flex-col gap-0.5">
          {navItem('settings', <Gear size={17} weight="duotone" />, t.settings, t.settingsSub)}
        </nav>
      </div>

      <div className="mt-8 px-2 flex flex-col gap-2">
        <button
          onClick={onRecordClick}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-body font-semibold text-sm transition-all ${
            isRecording
              ? 'bg-red-400/90 text-white animate-pulse shadow-lg shadow-red-400/20'
              : 'bg-app-pink text-app-dark hover:brightness-105 shadow-lg shadow-app-pink/25'
          }`}
        >
          <Microphone size={16} weight="fill" />
          {isRecording ? t.recording : t.newRecording}
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-white/25 hover:text-white/50 hover:bg-white/5 transition-all text-sm font-body">
          <SignOut size={15} weight="regular" />
          {t.logout}
        </button>
      </div>
    </aside>
  );
};

// ─── Top Bar ──────────────────────────────────────────────────────────────────

const TopBar = ({ lang, setLang, t }) => (
  <header className="flex items-center justify-between px-8 py-4 border-b border-black/5 bg-app-bg sticky top-0 z-10">
    <div className="relative flex-1 max-w-lg">
      <MagnifyingGlass size={15} weight="regular" className="absolute left-4 top-1/2 -translate-y-1/2 text-app-dark/30 pointer-events-none" />
      <input
        type="text"
        placeholder={t.search}
        className="w-full pl-10 pr-4 py-2.5 bg-white border border-black/5 rounded-xl text-sm font-body text-app-dark placeholder:text-app-dark/30 focus:outline-none focus:ring-2 focus:ring-app-pink/25 transition-all"
      />
    </div>
    <div className="flex items-center gap-2.5 ml-5">
      <div className="flex items-center gap-1.5">
        <Translate size={14} weight="regular" className="text-app-dark/30" />
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <button className="w-9 h-9 rounded-xl bg-white border border-black/6 flex items-center justify-center text-app-dark/45 hover:text-app-dark transition-colors shadow-sm">
        <Bell size={16} weight="regular" />
      </button>
      <button className="w-9 h-9 rounded-xl bg-app-pink/15 flex items-center justify-center text-app-dark/60 hover:bg-app-pink/25 transition-colors">
        <UserCircle size={18} weight="duotone" />
      </button>
    </div>
  </header>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, accent }) => (
  <div className={`flex-1 min-w-40 rounded-3xl p-5 flex flex-col gap-2.5 ${accent}`}>
    <p className="text-xs font-body font-semibold text-app-dark/55 uppercase tracking-wider">{label}</p>
    <p className="text-4xl font-heading font-semibold text-app-dark leading-none">{value}</p>
    {sub && <p className="text-xs text-app-dark/40 font-body">{sub}</p>}
  </div>
);

// ─── Session Row ──────────────────────────────────────────────────────────────

const SessionRow = ({ session, index, t }) => {
  const lang = session.language || 'hi-IN';
  const langColors = {
    'hi-IN': 'bg-app-green/15 text-app-green',
    'en-IN': 'bg-app-blue/20 text-app-blue',
    'mr-IN': 'bg-app-yellow/40 text-app-dark/70',
  };
  return (
    <tr className="border-b border-black/5 hover:bg-black/[0.015] transition-colors group">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-app-pink/12 flex items-center justify-center text-app-pink shrink-0">
            <FileText size={14} weight="duotone" />
          </div>
          <div>
            <p className="font-body font-medium text-sm text-app-dark">{t.voiceExtraction} #{index + 1}</p>
            <p className="text-[11px] text-app-dark/35 flex items-center gap-1 mt-0.5">
              <Clock size={10} weight="regular" />
              {new Date(session.created_at || Date.now()).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 max-w-70">
        <p className="text-sm text-app-dark/50 font-body truncate italic">"{session.raw_transcript}"</p>
      </td>
      <td className="py-4 px-4">
        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${langColors[lang] || langColors['hi-IN']}`}>
          {lang}
        </span>
      </td>
      <td className="py-4 px-4">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-app-green/12 text-app-green">
          <CheckCircle size={10} weight="fill" />
          {t.processed}
        </span>
      </td>
      <td className="py-4 px-6 text-right">
        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-app-dark/35 hover:text-app-dark p-1.5 rounded-lg hover:bg-black/5">
          <CaretRight size={14} weight="bold" />
        </button>
      </td>
    </tr>
  );
};

// ─── Dashboard View ───────────────────────────────────────────────────────────

const DashboardView = ({ sessions, sessionCount, stats, latestTranscript, onRecordClick, lang, setLang, t }) => {
  const hour = new Date().getHours();
  const recentSessions = sessions.slice(0, 5);
  const todaySessions = sessions.filter(s =>
    new Date(s.created_at).toDateString() === new Date().toDateString()
  );

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <TopBar lang={lang} setLang={setLang} t={t} />
      <div className="flex-1 flex overflow-auto">
        <div className="flex-1 px-8 py-8 overflow-auto">
          <div className="mb-8">
            <h1
              className="text-3xl font-semibold text-app-dark mb-1 leading-snug"
              style={{ fontFamily: "'Tiro Devanagari Hindi', serif", fontWeight: 400 }}
            >
              {t.greeting(hour)}
            </h1>
            <p className="text-app-dark/45 font-body text-sm">{t.greetingSub(sessionCount)}</p>
          </div>

          <div className="flex gap-4 mb-8">
            <StatCard label={t.totalSessions} value={sessionCount} sub={t.allTime} accent="bg-app-yellow" />
            <StatCard label={t.today} value={todaySessions.length} sub={t.sessionsTodaySub} accent="bg-app-pink/35" />
            <StatCard label={t.successRate} value={stats?.successRate || '100%'} sub={t.procAccuracy} accent="bg-app-green/30" />
            <StatCard
              label={t.topLang}
              value={stats?.topLanguage === 'hi-IN' ? 'हिंदी' : stats?.topLanguage === 'mr-IN' ? 'मराठी' : 'English'}
              sub={stats?.topLanguage || 'hi-IN'}
              accent="bg-app-blue/35"
            />
          </div>

          <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/5">
              <h2 className="font-heading font-semibold text-app-dark">{t.recentSessions}</h2>
              <button className="text-xs font-medium text-app-dark/40 hover:text-app-dark transition-colors flex items-center gap-1">
                {t.viewAll} <CaretRight size={11} weight="bold" />
              </button>
            </div>
            {sessions.length === 0 ? (
              <div className="py-16 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-app-pink/10 flex items-center justify-center mb-4">
                  <Microphone size={22} weight="duotone" className="text-app-pink" />
                </div>
                <p className="text-app-dark/35 font-body text-sm">{t.noSessions}</p>
                <p className="text-app-dark/20 font-body text-xs mt-1">{t.noSessionsSub}</p>
                <button
                  onClick={onRecordClick}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-app-dark text-white rounded-full text-sm font-medium hover:bg-black transition-colors"
                >
                  <Plus size={13} weight="bold" /> {t.startRecording}
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-black/[0.018]">
                    {[t.sessions, 'Transcript', 'Language', 'Status', ''].map((h, i) => (
                      <th key={i} className={`py-3 ${i === 4 ? 'px-6' : i === 0 ? 'px-6 text-left' : 'px-4 text-left'} text-[10px] font-bold text-app-dark/30 uppercase tracking-widest`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((s, i) => <SessionRow key={s.id || i} session={s} index={i} t={t} />)}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <aside className="w-72 shrink-0 border-l border-black/5 px-6 py-8 flex flex-col gap-6 overflow-auto">
          <div className="bg-app-dark rounded-3xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Lightning size={15} weight="fill" className="text-app-yellow" />
              <p className="font-heading font-semibold text-sm">{t.quickRecord}</p>
            </div>
            <p className="text-white/35 text-xs font-body mb-4 leading-relaxed">{t.quickRecordSub}</p>
            <button
              onClick={onRecordClick}
              className="w-full py-3 bg-app-pink text-app-dark rounded-2xl text-sm font-semibold hover:brightness-105 transition-all flex items-center justify-center gap-2"
            >
              <Microphone size={14} weight="fill" />
              {t.startListening}
            </button>
          </div>

          <div>
            <h3 className="font-heading font-semibold text-app-dark text-sm mb-4 flex items-center justify-between">
              {t.todayLabel}
              <span className="text-[11px] text-app-dark/30 font-body font-normal">
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </h3>
            {todaySessions.length === 0 ? (
              <div className="text-center py-8 bg-black/[0.018] rounded-2xl">
                <p className="text-app-dark/30 text-xs font-body">{t.noToday}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0">
                {todaySessions.slice(0, 4).map((s, i) => (
                  <div key={s.id || i} className="flex items-start gap-3 py-3 border-b border-black/5 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-app-pink mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-app-dark truncate">{t.sessionNo(sessions.indexOf(s) + 1)}</p>
                      <p className="text-[10px] text-app-dark/35 mt-0.5">
                        {new Date(s.created_at || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-[10px] text-app-green bg-app-green/10 px-2 py-0.5 rounded-full shrink-0 font-medium">{t.done}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {latestTranscript && (
            <div>
              <h3 className="font-heading font-semibold text-app-dark text-sm mb-3">{t.lastTranscript}</h3>
              <div className="bg-app-pink/10 rounded-2xl p-4">
                <p className="text-xs font-body text-app-dark/65 italic leading-relaxed line-clamp-4">"{latestTranscript}"</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

// ─── Sessions Full View ───────────────────────────────────────────────────────

const SessionsView = ({ sessions, lang, setLang, t }) => (
  <div className="flex-1 flex flex-col overflow-auto">
    <TopBar lang={lang} setLang={setLang} t={t} />
    <div className="flex-1 px-8 py-8 overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-semibold text-app-dark mb-1">{t.allSessions}</h1>
        <p className="text-app-dark/45 text-sm font-body">{t.allSessionsSub(sessions.length)}</p>
      </div>
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        {sessions.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-app-dark/30 font-body text-sm">{t.noSessions}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-black/[0.018] border-b border-black/5">
                {[t.sessions, 'Transcript', 'Language', 'Status', ''].map((h, i) => (
                  <th key={i} className={`py-3 ${i === 4 ? 'px-6' : i === 0 ? 'px-6 text-left' : 'px-4 text-left'} text-[10px] font-bold text-app-dark/30 uppercase tracking-widest`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => <SessionRow key={s.id || i} session={s} index={i} t={t} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
);

// ─── Analytics View ───────────────────────────────────────────────────────────

const AnalyticsView = ({ sessions, stats, lang, setLang, t }) => {
  const langCounts = sessions.reduce((acc, s) => {
    const l = s.language || 'hi-IN';
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {});
  const total = sessions.length || 1;

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <TopBar lang={lang} setLang={setLang} t={t} />
      <div className="flex-1 px-8 py-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-semibold text-app-dark mb-1">{t.analytics}</h1>
          <p className="text-app-dark/45 text-sm font-body">{t.analyticsSub}</p>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6">
            <h2 className="font-heading font-semibold text-app-dark mb-5">{t.langBreakdown}</h2>
            <div className="flex flex-col gap-4">
              {Object.entries(langCounts).map(([l, count]) => {
                const pct = Math.round((count / total) * 100);
                const colors = {
                  'hi-IN': { bar: 'bg-app-green', label: 'bg-app-green/15 text-app-green' },
                  'en-IN': { bar: 'bg-app-blue', label: 'bg-app-blue/20 text-app-blue' },
                  'mr-IN': { bar: 'bg-app-yellow', label: 'bg-app-yellow/60 text-app-dark/70' },
                };
                const c = colors[l] || colors['hi-IN'];
                return (
                  <div key={l} className="flex items-center gap-3">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold w-20 text-center ${c.label}`}>{l}</span>
                    <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
                      <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-app-dark/40 w-14 text-right font-body">{count} ({pct}%)</span>
                  </div>
                );
              })}
              {Object.keys(langCounts).length === 0 && (
                <p className="text-app-dark/30 text-sm text-center py-6 font-body">{t.noData}</p>
              )}
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6">
            <h2 className="font-heading font-semibold text-app-dark mb-5">{t.summary}</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t.totalSessions, value: sessions.length, accent: 'bg-app-yellow' },
                { label: t.successRate, value: stats?.successRate || '100%', accent: 'bg-app-green/30' },
                { label: t.topLang, value: stats?.topLanguage || 'hi-IN', accent: 'bg-app-blue/30' },
                { label: t.processed, value: sessions.filter(s => s.status === 'processed').length, accent: 'bg-app-pink/30' },
              ].map(item => (
                <div key={item.label} className={`${item.accent} rounded-2xl p-4`}>
                  <p className="text-[10px] text-app-dark/50 font-body font-semibold uppercase tracking-wider mb-1.5">{item.label}</p>
                  <p className="text-2xl font-heading font-semibold text-app-dark">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Settings View ────────────────────────────────────────────────────────────

const SettingsView = ({ lang, setLang, t }) => (
  <div className="flex-1 flex flex-col overflow-auto">
    <TopBar lang={lang} setLang={setLang} t={t} />
    <div className="flex-1 px-8 py-8 overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-semibold text-app-dark mb-1">{t.settings}</h1>
      </div>
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8 max-w-lg">
        <p className="text-app-dark/35 font-body text-sm">{t.settingsComingSoon}</p>
      </div>
    </div>
  </div>
);

// ─── Desktop Root ─────────────────────────────────────────────────────────────

export const DesktopLayout = ({
  sessions,
  sessionCount,
  stats,
  latestTranscript,
  onRecordClick,
  isRecording,
  isRecordingOpen,
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lang, setLang] = useState('en');
  const t = UI_STRINGS[lang];
  const sharedProps = { lang, setLang, t };

  return (
    <div className="flex h-screen bg-app-bg overflow-hidden font-body text-app-dark">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRecordClick={onRecordClick}
        isRecording={isRecording || isRecordingOpen}
        t={t}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'dashboard' && (
          <DashboardView
            sessions={sessions}
            sessionCount={sessionCount}
            stats={stats}
            latestTranscript={latestTranscript}
            onRecordClick={onRecordClick}
            {...sharedProps}
          />
        )}
        {activeTab === 'history' && <SessionsView sessions={sessions} {...sharedProps} />}
        {activeTab === 'analytics' && <AnalyticsView sessions={sessions} stats={stats} {...sharedProps} />}
        {activeTab === 'settings' && <SettingsView {...sharedProps} />}
      </main>
    </div>
  );
};
