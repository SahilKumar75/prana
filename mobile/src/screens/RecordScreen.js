import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Animated, TextInput, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioRecorder, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';

// Low-bitrate preset: 32kbps mono 16kHz → ~14MB/hour, well under Groq's 25MB limit
// Supports 1.5+ hour consultations vs HIGH_QUALITY (~26 min limit)
const LONG_SESSION_PRESET = {
  android: {
    extension: '.m4a',
    outputFormat: 2,   // MPEG_4
    audioEncoder: 3,   // AAC
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: 0,   // LOW
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 32000 },
};
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { transcribeAudio, transcribeSegments, extractMedicalData, translateTranscript, diarizeTranscript, correctTranscript, buildLabeledTranscript } from '../lib/groq';
import { api } from '../lib/api';
import CaseSelectModal from '../components/CaseSelectModal';
import { LinearGradient } from 'expo-linear-gradient';

const C = {
  bg:    '#f2f3f5',
  white: '#ffffff',
  dark:  '#202020',
  lime:  '#c9f158',
  gray:  '#888888',
  muted: '#bbbbbe',
  red:   '#e57373',
  warn:  '#fff8e1',
  warnB: '#f59e0b',
};

const LANGUAGES = [
  { code: 'auto',  label: 'Auto'           },
  { code: 'hi-IN', label: '\u0939\u093f\u0928\u094d\u0926\u0940' },
  { code: 'mr-IN', label: '\u092e\u0930\u093e\u0920\u0940' },
  { code: 'en-IN', label: 'English'        },
];

// Map Whisper-returned language codes → display labels
const LANG_LABEL = {
  auto: 'Auto',
  hi: '\u0939\u093f\u0928\u094d\u0926\u0940', 'hi-IN': '\u0939\u093f\u0928\u094d\u0926\u0940',
  mr: '\u092e\u0930\u093e\u0920\u0940', 'mr-IN': '\u092e\u0930\u093e\u0920\u0940',
  en: 'English', 'en-IN': 'English',
};

// Whisper language code: 'auto' → undefined (let model detect), else strip region suffix
const toWhisperLang = (code) => {
  if (!code || code === 'auto') return undefined;
  return code.split('-')[0]; // 'hi-IN' → 'hi', 'mr-IN' → 'mr', 'en-IN' → 'en'
};

const STAGE = { IDLE: 0, RECORDING: 1, TRANSCRIBING: 2, DIARIZING: 3, CORRECTING: 4, EXTRACTING: 5, DONE: 6, ERROR: 7 };

const fmtTimer = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function RecordScreen({ route, navigation }) {
  // Pre-filled context when coming from a patient card
  const routePatient    = route?.params?.patientProfile   || null;
  const routeDoctor     = route?.params?.doctorProfile    || null;
  const routeRequestId  = route?.params?.sessionRequestId || null;
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const [language,     setLanguage]     = useState('auto');
  const [stage,        setStage]        = useState(STAGE.IDLE);
  const [timer,        setTimer]        = useState(0);
  const [transcript,   setTranscript]   = useState('');
  const [detectedLang, setDetectedLang] = useState(null);
  const [durationSecs, setDurationSecs] = useState(0);
  const [patientName,  setPatientName]  = useState(routePatient?.name || '');
  const [patientId,    setPatientId]    = useState(routePatient?.id   || '');
  const [result,       setResult]       = useState(null);
  const [errMsg,       setErrMsg]       = useState('');

  // Case flow
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [activeCaseId,  setActiveCaseId]  = useState(null);
  const [activeCaseRef, setActiveCaseRef] = useState(null);
  const [activeCaseType,setActiveCaseType]= useState(null);
  const [isFollowUp,    setIsFollowUp]    = useState(false);
  const [caseHistory,   setCaseHistory]   = useState([]);

  // Speaker diarization
  const [diarizedLines, setDiarizedLines] = useState([]);
  const [isDiarizing,   setIsDiarizing]   = useState(false);

  // Corrected transcript (post-processing layer)
  const [correctedTranscript, setCorrectedTranscript] = useState('');

  // ─── Multi-language recording segments ────────────────────────────────────
  // audioSegments: completed clips from earlier segments [{uri, lang}]
  // activeSegLang: language selected for the currently-recording segment
  // showSegLangPicker: shows inline language switch sheet during recording
  const [audioSegments,     setAudioSegments]     = useState([]);
  const [activeSegLang,     setActiveSegLang]      = useState(language);
  const [showSegLangPicker, setShowSegLangPicker]  = useState(false);

  // Patient timeline context — sessions the doctor added from the timeline screen
  const [timelineContext, setTimelineContext] = useState([]);

  // Generate a stable session reference ID for this recording session
  const sessionRef = useRef((() => {
    const now  = new Date();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const hh   = String(now.getHours()).padStart(2, '0');
    const mn   = String(now.getMinutes()).padStart(2, '0');
    const base = routePatient?.patientDbId || 'SES';
    return `${base}-${mm}${dd}${hh}${mn}`;
  })()).current;

  // Transcript display language (translation)
  const [displayLang,    setDisplayLang]    = useState('original');
  const [translatedText, setTranslatedText] = useState({});
  // Per-language cache of translated diarized lines: { hi: [{...line, text: '...'}], ... }
  const [translatedLines, setTranslatedLines] = useState({});
  const [isTranslating,  setIsTranslating]  = useState(false);
  const [translateError, setTranslateError] = useState(null);

  // Reset display language when a new transcript arrives
  useEffect(() => {
    setDisplayLang('original');
    setTranslatedText({});
    setTranslatedLines({});
    setTranslateError(null);
  }, [transcript]);

  // Handle transcript display language change
  const handleDisplayLang = async (lang) => {
    if (lang === 'original') { setDisplayLang('original'); return; }
    setTranslateError(null);
    // Already cached — just switch
    if (translatedText[lang] != null) { setDisplayLang(lang); return; }
    setIsTranslating(true);
    setDisplayLang(lang);
    try {
      // If diarized, translate each line individually to keep bubble structure
      if (diarizedLines.length > 0) {
        const translatedLinesCopy = await Promise.all(
          diarizedLines.map(async (line, idx) => ({
            // Always pin speaker + name from the original diarized line by index
            speaker: diarizedLines[idx].speaker,
            name:    diarizedLines[idx].name,
            text:    await translateTranscript(line.text, lang),
          }))
        );
        setTranslatedLines((prev) => ({ ...prev, [lang]: translatedLinesCopy }));
        // Also cache a flat version for fallback
        setTranslatedText((prev) => ({ ...prev, [lang]: translatedLinesCopy.map(l => l.text).join('\n') }));
      } else {
        const result = await translateTranscript(transcript, lang);
        setTranslatedText((prev) => ({ ...prev, [lang]: result || '' }));
      }
    } catch (e) {
      setTranslateError(e.message || 'Translation failed');
      setDisplayLang('original');
    } finally {
      setIsTranslating(false);
    }
  };

  const timerRef      = useRef(null);
  const audioRecorder = useAudioRecorder(LONG_SESSION_PRESET);

  const breatheAnim = useRef(new Animated.Value(1)).current;
  const ripple1     = useRef(new Animated.Value(0)).current;
  const ripple2     = useRef(new Animated.Value(0)).current;
  const ripple3     = useRef(new Animated.Value(0)).current;
  const barAnims    = useRef([0,1,2,3,4].map(() => new Animated.Value(4))).current;

  // AI orb rotation values
  const orbRotate1 = useRef(new Animated.Value(0)).current;
  const orbRotate2 = useRef(new Animated.Value(0)).current;
  const orbRotate3 = useRef(new Animated.Value(0)).current;
  const glowPulse  = useRef(new Animated.Value(0.2)).current;
  const rot1 = orbRotate1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rot2 = orbRotate2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const rot3 = orbRotate3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowOpacityA = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.32] });
  const glowOpacityB = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.12] });

  // Hover float + inner core glow + persistent halo rings
  const floatAnim  = useRef(new Animated.Value(0)).current;
  const innerGlow  = useRef(new Animated.Value(0.2)).current;
  const haloRing1  = useRef(new Animated.Value(0)).current;
  const haloRing2  = useRef(new Animated.Value(0)).current;
  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });

  const isRecording    = stage === STAGE.RECORDING;
  const isTranscribing  = stage === STAGE.TRANSCRIBING;
  const isDiarizingStage = stage === STAGE.DIARIZING;
  const isCorrectingStage = stage === STAGE.CORRECTING;
  const isExtracting   = stage === STAGE.EXTRACTING;
  const isDone         = stage === STAGE.DONE;
  const isBusy         = isTranscribing || isDiarizingStage || isCorrectingStage || isExtracting;

  useEffect(() => {
    if (isRecording) {
      // Ripple rings
      makeRipple(ripple1, 0).start();
      makeRipple(ripple2, 650).start();
      makeRipple(ripple3, 1300).start();
      // Equalizer bars
      const BARS = [
        { peak: 22, dur: 320, delay: 0   },
        { peak: 32, dur: 240, delay: 120 },
        { peak: 18, dur: 380, delay: 60  },
        { peak: 28, dur: 290, delay: 180 },
        { peak: 24, dur: 260, delay: 90  },
      ];
      BARS.forEach(({ peak, dur, delay }, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(barAnims[i], { toValue: peak, duration: dur, useNativeDriver: false }),
            Animated.timing(barAnims[i], { toValue: 4,    duration: dur, useNativeDriver: false }),
          ])
        ).start()
      );
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      [ripple1, ripple2, ripple3].forEach((r) => { r.stopAnimation(); r.setValue(0); });
      barAnims.forEach((b) => { b.stopAnimation(); b.setValue(4); });
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const makeRipple = (anim, delay) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])
    );

  // Recording ripple rings — aggressive expansion, lime
  const rippleStyle = (anim) => ({
    position: 'absolute',
    top: 45, left: 45,
    width: 210, height: 210, borderRadius: 105,
    borderWidth: 1.5,
    borderColor: 'rgba(241,245,249,0.80)',
    opacity: anim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.90, 0.40, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.55] }) }],
  });

  // Always-on halo rings — slow/soft idle, faster/brighter when active
  const haloStyle = (anim, color) => ({
    position: 'absolute',
    top: 45, left: 45,
    width: 210, height: 210, borderRadius: 105,
    borderWidth: 1,
    borderColor: color,
    opacity: anim.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.55, 0.22, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.72] }) }],
  });

  // All orb animations — all driven by stage so they react to every state change
  useEffect(() => {
    const allAnims = [orbRotate1, orbRotate2, orbRotate3, glowPulse, breatheAnim, floatAnim, innerGlow, haloRing1, haloRing2];
    allAnims.forEach(a => a.stopAnimation());

    // ── Blob rotation speeds ─────────────────────────────────────────────────
    const sp1 = isRecording ? 3200  : isBusy ? 6500  : 20000;
    const sp2 = isRecording ? 5200  : isBusy ? 10500 : 31000;
    const sp3 = isRecording ? 8000  : isBusy ? 15500 : 44000;
    Animated.loop(Animated.timing(orbRotate1, { toValue: 1, duration: sp1, useNativeDriver: true, easing: Easing.linear })).start();
    Animated.loop(Animated.timing(orbRotate2, { toValue: 1, duration: sp2, useNativeDriver: true, easing: Easing.linear })).start();
    Animated.loop(Animated.timing(orbRotate3, { toValue: 1, duration: sp3, useNativeDriver: true, easing: Easing.linear })).start();

    // ── Outer glow halo pulse ────────────────────────────────────────────────
    const gMin = isRecording ? 0.50  : isBusy ? 0.24  : 0.08;
    const gMax = isRecording ? 1.0   : isBusy ? 0.55  : 0.28;
    const gDur = isRecording ? 650   : isBusy ? 1300  : 2800;
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: gMax, duration: gDur, useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: gMin, duration: gDur, useNativeDriver: true }),
    ])).start();

    // ── Breathe (scale) ──────────────────────────────────────────────────────
    const bTarget = isRecording ? 1.10 : isBusy ? 1.045 : 1.024;
    const bDur    = isRecording ? 850  : isBusy ? 1500  : 3200;
    Animated.loop(Animated.sequence([
      Animated.timing(breatheAnim, { toValue: bTarget, duration: bDur, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(breatheAnim, { toValue: 1,       duration: bDur, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();

    // ── Hover / float (translateY) ───────────────────────────────────────────
    const fDur = isRecording ? 1100 : isBusy ? 1900 : 3800;
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: 1, duration: fDur, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(floatAnim, { toValue: 0, duration: fDur, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();

    // ── Inner core glow (opacity) ────────────────────────────────────────────
    const igMin = isRecording ? 0.50 : isBusy ? 0.28 : 0.10;
    const igMax = isRecording ? 1.0  : isBusy ? 0.62 : 0.32;
    const igDur = isRecording ? 580  : isBusy ? 1100 : 2600;
    Animated.loop(Animated.sequence([
      Animated.timing(innerGlow, { toValue: igMax, duration: igDur, useNativeDriver: true }),
      Animated.timing(innerGlow, { toValue: igMin, duration: igDur, useNativeDriver: true }),
    ])).start();

    // ── Persistent halo rings (always visible, pace varies) ──────────────────
    const haloDur = isRecording ? 1700 : isBusy ? 2800 : 5500;
    const makeHalo = (anim, delay) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: haloDur, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]));
    makeHalo(haloRing1, 0).start();
    makeHalo(haloRing2, haloDur / 2).start();

    return () => allAnims.forEach(a => a.stopAnimation());
  }, [stage]);

  const startRecording = async () => {
    setErrMsg(''); setResult(null); setTranscript('');
    setDetectedLang(null); setTimer(0);
    setAudioSegments([]);               // clear any previous segments
    setActiveSegLang(language);         // first segment uses the pre-selected language
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { Alert.alert('Permission needed', 'Microphone access is required.'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setStage(STAGE.RECORDING);
    } catch (e) {
      setErrMsg(e?.message || 'Could not start recording.'); setStage(STAGE.ERROR);
    }
  };

  // ─── Mid-recording language switch ────────────────────────────────────────
  // Saves the current audio clip, shows the language picker, then
  // starts a fresh recording clip in the newly selected language.
  const switchLanguageSegment = async () => {
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        setAudioSegments(prev => [...prev, { uri, lang: activeSegLang }]);
      }
      setShowSegLangPicker(true);
    } catch (e) {
      console.warn('[Recording] switchLanguageSegment error:', e.message);
    }
  };

  const confirmSegmentLanguage = async (newLang) => {
    setActiveSegLang(newLang);
    setShowSegLangPicker(false);
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (e) {
      setErrMsg('Could not restart recording: ' + e.message);
      setStage(STAGE.ERROR);
    }
  };

  const stopAndTranscribe = async () => {
    const duration = timer;
    setStage(STAGE.TRANSCRIBING);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri && audioSegments.length === 0) throw new Error('No audio file found.');

      // Build the full list of segments to transcribe
      const allSegments = [
        ...audioSegments,
        ...(uri ? [{ uri, lang: activeSegLang }] : []),
      ];

      // Multi-segment path (language was switched mid-recording)
      // Single-segment path (normal flow — same behaviour as before)
      const stt = allSegments.length > 1
        ? await transcribeSegments(allSegments)
        : await transcribeAudio(allSegments[0].uri, allSegments[0].lang === 'auto' ? 'auto' : allSegments[0].lang);

      setTranscript(stt.text);
      setDetectedLang(stt.language);
      setDurationSecs(stt.duration || duration);
      // Correction pass — run on raw STT text (before diarization)
      // If multiple language segments were used, signal 'multilingual' so
      // correctTranscript doesn't force a single-language correction pass.
      setStage(STAGE.CORRECTING);
      const corrLang = allSegments.length > 1 ? 'multilingual' : stt.language;
      let corrected = stt.text;
      try {
        corrected = await correctTranscript(stt.text, corrLang);
        setCorrectedTranscript(corrected);
      } catch (_) {
        setCorrectedTranscript(stt.text);
      }
      // Auto-diarize on CORRECTED text for best speaker accuracy
      if (routePatient && routeDoctor && corrected.trim()) {
        setStage(STAGE.DIARIZING);
        setIsDiarizing(true);
        try {
          const lines = await diarizeTranscript(
            corrected, routeDoctor.name, routePatient.name,
            allSegments.length > 1 ? 'multilingual' : stt.language
          );
          setDiarizedLines(
            lines
              .filter(l => l.speaker !== 'noise' && l.text?.trim())
              .map(l => ({ ...l, speaker: l.speaker?.toLowerCase() }))
          );
        } catch (_) {
          setDiarizedLines([]);
        } finally {
          setIsDiarizing(false);
        }
      }
      setStage(STAGE.IDLE);
    } catch (e) {
      console.error('[STT] stopAndTranscribe error:', e?.message, e);
      setStage(STAGE.IDLE);
      setErrMsg(`Transcription failed: ${e?.message || 'Unknown error'}. You can type the transcript manually.`);
    }
  };

  const processWithAI = async () => {
    if (!transcript.trim()) { Alert.alert('Empty', 'No transcript to process.'); return; }
    setStage(STAGE.EXTRACTING); setErrMsg('');
    try {
      // Build the best possible input for extraction:
      // 1. If diarized → speaker-labeled text ("Dr. Arjun: ...\nPriya: ...")
      //    The LLM can then attribute symptoms to patient, prescriptions to doctor
      // 2. Else fallback to corrected transcript → raw transcript
      const labeledText = diarizedLines.length > 0
        ? buildLabeledTranscript(diarizedLines)
        : null;
      const textForAI = labeledText || correctedTranscript || transcript;
      // timelineContext is the single source of truth — it includes both manually
      // selected timeline sessions AND auto-merged case history from follow-up cases.
      const contextHistory = timelineContext.length > 0 ? timelineContext : (isFollowUp ? caseHistory : []);
      const extracted = await extractMedicalData(textForAI, language, contextHistory);
      const saved     = await api.saveSession({
        rawTranscript: transcript,
        correctedTranscript: correctedTranscript || null,
        language,
        detectedLang,
        durationSecs,
        extractedData: extracted,
        patientName:   routePatient?.name  || patientName.trim() || null,
        patientId:     routePatient?.patientDbId || patientId.trim() || null,
        doctorId:      routeDoctor?.id    || null,
        requestId:     routeRequestId     || null,
        caseId:        activeCaseId       || null,
      });
      if (routeRequestId) {
        try { await api.completeRequest(routeRequestId); } catch (_) {}
      }
      setResult({ ...extracted, _id: saved?.id });
      setStage(STAGE.DONE);
      // Navigate to SessionReview for manual editing
      navigation.navigate('SessionReview', {
        session:       saved || { id: null },
        extracted,
        sessionRef,
        patientName:   routePatient?.name || patientName.trim() || null,
        transcript:    correctedTranscript || transcript || null,
        diarizedLines: diarizedLines.length > 0 ? diarizedLines : null,
      });
    } catch (e) {
      setErrMsg(e.message || 'AI processing failed.');
      setStage(STAGE.ERROR);
    }
  };

  const reset = () => {
    setStage(STAGE.IDLE);
    setTranscript(''); setDetectedLang(null);
    setResult(null); setErrMsg(''); setTimer(0);
    setDiarizedLines([]); setIsDiarizing(false); setTranslatedLines({}); setCorrectedTranscript(''); setTimelineContext([]);
    setAudioSegments([]); setActiveSegLang(language); setShowSegLangPicker(false);
    setPatientName(routePatient?.name || '');
    setPatientId(routePatient?.id   || '');
    // Don't reset case — stay in the same case context
  };

  if (!fontsLoaded) return null;

  const d = result || {};
  const hasTranscript = transcript.length > 0;

  return (
    <>
      <CaseSelectModal
        visible={showCaseModal}
        patient={routePatient}
        doctor={routeDoctor}
        onSelect={({ caseId, caseType, isFollowUp: fu, caseHistory: hist, caseRef }) => {
          setActiveCaseId(caseId);
          setActiveCaseRef(caseRef);
          setActiveCaseType(caseType);
          setIsFollowUp(fu);
          setCaseHistory(hist);
          // Pre-populate timeline context with case history so doctor
          // can see + toggle them from PatientTimeline without confusion
          if (fu && hist?.length > 0) {
            setTimelineContext(prev => {
              const existingIds = new Set(prev.map(s => s.id));
              const merged = [...prev, ...hist.filter(s => !existingIds.has(s.id))];
              return merged;
            });
          }
          setShowCaseModal(false);
        }}
        onClose={() => setShowCaseModal(false)}
      />
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}
          <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Record</Text>
          </View>
          <TouchableOpacity style={s.resetBtn} onPress={reset} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={16} color={C.dark} />
          </TouchableOpacity>
        </View>

          {/* SESSION CONTEXT BANNER — removed, now fused into transcript card */}

        {/* LANGUAGE CHIPS */}
        <View style={s.langRow}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[s.langChip, language === l.code && s.langChipActive]}
              onPress={() => { if (!isRecording && !isBusy) setLanguage(l.code); }}
              activeOpacity={0.8}
            >
              <Text style={[s.langChipText, language === l.code && s.langChipTextActive]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* VOICE ORB — AI voice assistant orb */}
        <View style={s.orbZone}>
          {/* Fixed-size container keeps all glow/touch layers centred */}
          <View style={s.orbContainer}>

            {/* ── Layer 0: Deep ambient glow blobs behind the orb ─────────────── */}
            <Animated.View style={[s.orbGlowA, { opacity: glowOpacityA }]} />
            <Animated.View style={[s.orbGlowB, { opacity: glowOpacityB }]} />

            {/* ── Layer 1: Always-on halo rings (slow idle → fast recording) ─── */}
            <Animated.View style={haloStyle(haloRing1, '#f472b6')} />
            <Animated.View style={haloStyle(haloRing2, '#a855f7')} />

            {/* ── Layer 2: Aggressive ripple rings — recording only ───────────── */}
            {isRecording && (
              <>
                <Animated.View style={rippleStyle(ripple1)} />
                <Animated.View style={rippleStyle(ripple2)} />
                <Animated.View style={rippleStyle(ripple3)} />
              </>
            )}

            {/* ── Layer 3: The orb itself — breathes + hovers ─────────────────── */}
            <Animated.View style={[
              s.voiceOrb,
              { transform: [{ scale: breatheAnim }, { translateY: floatY }] },
            ]}>
              {/* Base: white → pale pink — light glass-marble foundation */}
              <LinearGradient
                colors={['#ffffff', '#fdf2f8', '#fce7f3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Rotating sweep 1 — hot pink / magenta arc (clockwise) */}
              <Animated.View style={[s.orbBlobWrap, { transform: [{ rotate: rot1 }] }]}>
                <LinearGradient
                  colors={['transparent', 'rgba(236,72,153,0.88)', 'rgba(255,80,200,0.72)', 'transparent']}
                  start={{ x: 0.0, y: 0.1 }}
                  end={{ x: 1.0, y: 0.9 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 105 }]}
                />
              </Animated.View>
              {/* Rotating blob 2 — blue (counter-clockwise, lower-left sweep) */}
              <Animated.View style={[s.orbBlobWrap, { transform: [{ rotate: rot2 }] }]}>
                <View style={s.orbBlob2} />
              </Animated.View>
              {/* Rotating sweep 3 — purple / violet arc (clockwise, offset) */}
              <Animated.View style={[s.orbBlobWrap, { transform: [{ rotate: rot3 }] }]}>
                <LinearGradient
                  colors={['transparent', 'rgba(147,51,234,0.72)', 'rgba(168,85,247,0.55)', 'transparent']}
                  start={{ x: 1.0, y: 0.0 }}
                  end={{ x: 0.0, y: 1.0 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 105 }]}
                />
              </Animated.View>
              {/* Fixed white gloss streak — diagonal, creates glass-marble sheen */}
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.82)', 'rgba(255,255,255,0.55)', 'transparent']}
                start={{ x: 0.15, y: 0.0 }}
                end={{ x: 0.55, y: 1.0 }}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Very light vignette at edges — adds spherical depth */}
              <View style={s.orbFrost} />
              {/* Pulsing inner core — bright white radial burst */}
              <Animated.View style={[s.orbCore, { opacity: innerGlow }]} />
              {/* Rim light — soft pink-white border */}
              <Animated.View style={[s.orbRim, { opacity: innerGlow }]} />
              {/* Specular highlight — large top-left gloss reflection */}
              <View style={s.orbHighlight} />
              {/* Processing spinner */}
              {isBusy && (
                <ActivityIndicator style={s.orbSpinner} color="rgba(60,10,80,0.70)" size="large" />
              )}
            </Animated.View>

            {/* ── Layer 4: Touch target centred over the orb ──────────────────── */}
            <TouchableOpacity
              style={s.orbTouchTarget}
              onPress={isRecording ? stopAndTranscribe : (isBusy ? null : startRecording)}
              activeOpacity={0.9}
              disabled={isBusy}
            />
          </View>

          {/* Status / timer below orb */}
          <View style={s.orbStatus}>
            {isRecording ? (
              <View style={s.timerRowNew}>
                <View style={s.recDotNew} />
                <Text style={s.timerTextNew}>{fmtTimer(timer)}</Text>
                <View style={s.eqRowNew}>
                  {barAnims.map((anim, i) => (
                    <Animated.View key={i} style={[s.eqBarNew, { height: anim }]} />
                  ))}
                </View>
              </View>
            ) : isBusy ? (
              <Text style={s.statusHintNew}>
                {isTranscribing ? 'Listening to audio…' : isDiarizingStage ? 'Identifying speakers…' : isCorrectingStage ? 'Refining transcript…' : 'Processing…'}
              </Text>
            ) : isDone ? (
              <Text style={s.doneHintNew}>Session saved ✓</Text>
            ) : (
              <Text style={s.tapHintNew}>Tap to begin session</Text>
            )}

            {/* ── Language switch pill — visible only while recording ── */}
            {isRecording && (
              <View style={s.segLangRow}>
                {audioSegments.length > 0 && (
                  <Text style={s.segCountLabel}>{audioSegments.length + 1} clips</Text>
                )}
                <TouchableOpacity
                  style={s.segLangPill}
                  onPress={switchLanguageSegment}
                  activeOpacity={0.75}
                >
                  <Ionicons name="language-outline" size={13} color="#9333ea" />
                  <Text style={s.segLangPillText}>
                    {LANG_LABEL[activeSegLang] || 'Auto'}
                  </Text>
                  <Ionicons name="swap-horizontal-outline" size={13} color="#9333ea" />
                </TouchableOpacity>
              </View>
            )}

            {/* ── Post-transcription detected language badge ── */}
            {!isRecording && !isBusy && detectedLang && (
              <View style={s.detectedLangBadge}>
                <Ionicons name="mic-outline" size={11} color="#a855f7" />
                <Text style={s.detectedLangText}>
                  Detected: {LANG_LABEL[detectedLang] || detectedLang}
                  {audioSegments.length > 0 ? ` · ${audioSegments.length + 1} clips merged` : ''}
                </Text>
              </View>
            )}

            {/* ── Inline segment language picker (shown after tap on pill) ── */}
            {showSegLangPicker && (
              <View style={s.segPickerSheet}>
                <Text style={s.segPickerTitle}>Switch to language</Text>
                <View style={s.segPickerRow}>
                  {LANGUAGES.map(l => (
                    <TouchableOpacity
                      key={l.code}
                      style={[s.segPickerChip, activeSegLang === l.code && s.segPickerChipActive]}
                      onPress={() => confirmSegmentLanguage(l.code)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.segPickerChipText, activeSegLang === l.code && s.segPickerChipTextActive]}>
                        {l.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* TRANSCRIPT + PATIENT — single fused card */}
        {(hasTranscript || (!isDone && stage === STAGE.IDLE)) && (
          <View style={s.transcriptCard}>

            {/* Yellow patient header — tappable to open patient timeline */}
            {routePatient && (
              <TouchableOpacity
                style={s.fusedPatientBanner}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('PatientTimeline', {
                  patient: routePatient,
                  // Pass combined set so PatientTimeline shows case history sessions
                  // and any manually-added sessions as pre-checked
                  selectedSessions: timelineContext,
                  onUpdateContext: (sessions) => setTimelineContext(sessions),
                })}
              >
                <View style={s.ctxIconWrap}>
                  <Ionicons name="person-circle-outline" size={20} color={C.dark} />
                </View>
                <View style={s.ctxBody}>
                  <Text style={s.ctxLabel}>{activeCaseType ? (isFollowUp ? 'Follow-up' : 'New case') : 'Patient'}</Text>
                  <Text style={s.ctxName}>{routePatient.name}</Text>
                  {timelineContext.length > 0 && (
                    <Text style={s.ctxContextHint}>{timelineContext.length} past visit{timelineContext.length > 1 ? 's' : ''} in context</Text>
                  )}
                  {activeCaseType ? (
                    <Text style={s.ctxCaseType}>{activeCaseType}</Text>
                  ) : null}
                </View>
                <View style={s.ctxRight}>
                  <Text style={s.ctxTime}>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={s.ctxDate}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.dark} style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            )}

            {/* Card header: Transcript label + detected lang + translation pills */}
            <View style={s.transcriptHeader}>
              <View style={s.tagRow}>
                <Text style={s.transcriptLabel}>Transcript</Text>
                {detectedLang ? (
                  <>
                    <View style={s.autoTag}>
                      <Ionicons name="language-outline" size={11} color={C.dark} />
                      <Text style={s.autoTagText}>{LANG_LABEL[detectedLang] || detectedLang.toUpperCase()}</Text>
                    </View>
                    <Text style={s.autoTagHint}>detected</Text>
                  </>
                ) : null}
              </View>

              {hasTranscript && (
                <View style={s.dispLangRow}>
                  {[
                    { key: 'original', label: 'Original' },
                    { key: 'hi',       label: 'हिंदी'    },
                    { key: 'en',       label: 'English'  },
                    { key: 'mr',       label: 'मराठी'   },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[s.dispPill, displayLang === opt.key && s.dispPillActive]}
                      onPress={() => handleDisplayLang(opt.key)}
                      activeOpacity={0.75}
                      disabled={isTranslating}
                    >
                      <Text style={[s.dispPillTxt, displayLang === opt.key && s.dispPillTxtActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {translateError ? (
              <View style={s.translateErrRow}>
                <Ionicons name="warning-outline" size={14} color="#b45309" />
                <Text style={s.translateErrTxt}>{translateError}</Text>
              </View>
            ) : null}

            {isDiarizing ? (
              <View style={s.translatingRow}>
                <ActivityIndicator size="small" color={C.gray} />
                <Text style={s.translatingTxt}>Identifying speakers…</Text>
              </View>
            ) : isTranslating ? (
              <View style={s.translatingRow}>
                <ActivityIndicator size="small" color={C.gray} />
                <Text style={s.translatingTxt}>Translating…</Text>
              </View>
            ) : diarizedLines.length > 0 ? (
              /* ── Conversation bubbles ── (all language tabs) */
              <View style={s.conversationWrap}>
                {(displayLang === 'original'
                  ? diarizedLines
                  : (translatedLines[displayLang] || diarizedLines)
                ).map((line, i) => (
                  <View
                    key={i}
                    style={[
                      s.bubble,
                      line.speaker?.toLowerCase() === 'doctor' ? s.bubbleDoctor : s.bubblePatient,
                    ]}
                  >
                    <Text style={s.bubbleLabel}>
                      {line.name} ({line.speaker})
                    </Text>
                    <Text style={s.bubbleText}>{line.text}</Text>
                  </View>
                ))}
              </View>
            ) : displayLang === 'original' ? (
              <TextInput
                style={s.transcriptInput}
                multiline
                placeholder="Transcript appears here after recording, or type manually…"
                placeholderTextColor={C.muted}
                value={transcript}
                onChangeText={setTranscript}
                textAlignVertical="top"
                editable={!isBusy && !isRecording && !isDone}
              />
            ) : (
              <Text style={[s.transcriptInput, { color: C.dark }]} selectable>
                {translatedText[displayLang] != null ? translatedText[displayLang] : ''}
              </Text>
            )}

            {/* Patient row — always shown while session active */}
            {!isDone && (
              <>
                <View style={s.cardDivider} />
                <View style={s.patientRowFused}>
                  {routePatient ? (
                    /* Patient came from a card — show patient ID + session ref */
                    <>
                      <View style={s.patientBoxFused}>
                        <Ionicons name="card-outline" size={14} color={C.muted} />
                        <Text style={[s.patientField, { color: C.gray }]} numberOfLines={1}>
                          {routePatient.patientDbId || routePatient.id}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[s.patientBoxFused, s.patientBoxFusedBorder]}
                        onPress={() => setShowCaseModal(true)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="folder-outline" size={14} color={activeCaseRef ? C.gray : C.lime} />
                        <Text style={[s.patientField, { color: activeCaseRef ? C.gray : C.dark }]} numberOfLines={1}>
                          {activeCaseRef || 'Tap to select case'}
                        </Text>
                        {!activeCaseRef && <Ionicons name="chevron-forward" size={12} color={C.dark} style={{ marginLeft: 'auto' }} />}
                      </TouchableOpacity>
                    </>
                  ) : (
                    /* Manual recording — editable name + ID */
                    <>
                      <View style={s.patientBoxFused}>
                        <Ionicons name="person-outline" size={14} color={C.muted} />
                        <TextInput
                          placeholder="Patient name"
                          placeholderTextColor={C.muted}
                          style={s.patientField}
                          value={patientName}
                          onChangeText={setPatientName}
                        />
                      </View>
                      <View style={[s.patientBoxFused, s.patientBoxFusedBorder]}>
                        <Ionicons name="card-outline" size={14} color={C.muted} />
                        <TextInput
                          placeholder="Patient ID"
                          placeholderTextColor={C.muted}
                          style={s.patientField}
                          value={patientId}
                          onChangeText={setPatientId}
                        />
                      </View>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* PROCESS BUTTON */}
        {hasTranscript && !isDone && (
          <TouchableOpacity
            style={[s.processBtn, (isBusy || !transcript.trim()) && s.processBtnOff]}
            onPress={processWithAI}
            activeOpacity={0.85}
            disabled={isBusy || !transcript.trim()}
          >
            {isExtracting
              ? <ActivityIndicator color={C.dark} size="small" />
              : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color={C.dark} />
                  <Text style={s.processBtnText}>End Session</Text>
                </>
              )
            }
          </TouchableOpacity>
        )}

        {/* ERROR */}
        {errMsg.length > 0 && (
          <View style={s.errorBlock}>
            <Ionicons name="warning-outline" size={14} color="#92400e" />
            <Text style={s.errorText}>{errMsg}</Text>
          </View>
        )}

        {/* RESULTS */}
        {isDone && (
          <View style={s.results}>
            {d.summary && (
              <View style={s.summaryCard}>
                <Text style={s.summaryText}>{d.summary}</Text>
              </View>
            )}
            {d.diagnosis && (
              <View style={s.infoRow}>
                <Ionicons name="medkit-outline" size={15} color={C.muted} />
                <Text style={s.infoLabel}>Diagnosis</Text>
                <Text style={[s.infoVal, { fontFamily: 'SpaceGrotesk_700Bold' }]}>{d.diagnosis}</Text>
              </View>
            )}
            {d.severity && (
              <View style={s.infoRow}>
                <Ionicons name="pulse-outline" size={15} color={C.muted} />
                <Text style={s.infoLabel}>Severity</Text>
                <Text style={[s.infoVal, {
                  fontFamily: 'SpaceGrotesk_700Bold',
                  color: d.severity === 'severe' ? C.red : d.severity === 'moderate' ? '#c09a1a' : '#3a6e00',
                }]}>
                  {d.severity.toUpperCase()}
                </Text>
              </View>
            )}
            {d.symptom_duration && (
              <View style={s.infoRow}>
                <Ionicons name="hourglass-outline" size={15} color={C.muted} />
                <Text style={s.infoLabel}>Duration</Text>
                <Text style={s.infoVal}>{d.symptom_duration}</Text>
              </View>
            )}
            {(d.symptoms || []).length > 0 && (
              <View style={s.sectionCard}>
                <Text style={s.sectionTitle}>Symptoms</Text>
                <View style={s.chipWrap}>
                  {d.symptoms.map((sym, i) => (
                    <View key={i} style={s.chip}><Text style={s.chipText}>{sym}</Text></View>
                  ))}
                </View>
              </View>
            )}
            {(d.medications || []).length > 0 && (
              <View style={s.sectionCard}>
                <Text style={s.sectionTitle}>Medications</Text>
                {d.medications.map((m, i) => (
                  <View key={i} style={s.medRow}>
                    <View style={s.medDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.medName}>{m.name}</Text>
                      {(m.dosage || m.frequency) && (
                        <Text style={s.medDetail}>{[m.dosage, m.frequency].filter(Boolean).join('  ·  ')}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
            {d.vitals && Object.values(d.vitals).some(Boolean) && (
              <View style={s.sectionCard}>
                <Text style={s.sectionTitle}>Vitals</Text>
                <View style={s.vitalsGrid}>
                  {d.vitals.bp    && <VitalTile icon="fitness-outline"     label="BP"    value={d.vitals.bp}    />}
                  {d.vitals.temp  && <VitalTile icon="thermometer-outline" label="Temp"  value={d.vitals.temp}  />}
                  {d.vitals.pulse && <VitalTile icon="pulse-outline"       label="Pulse" value={d.vitals.pulse} />}
                  {d.vitals.spo2  && <VitalTile icon="water-outline"       label="SpO2"  value={d.vitals.spo2}  />}
                </View>
              </View>
            )}
            {(d.allergies || []).length > 0 && (
              <View style={s.sectionCard}>
                <Text style={s.sectionTitle}>Allergies</Text>
                <View style={s.chipWrap}>
                  {d.allergies.map((a, i) => (
                    <View key={i} style={[s.chip, { backgroundColor: '#fce8e6' }]}>
                      <Text style={[s.chipText, { color: '#c0392b' }]}>{a}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {d.follow_up && (
              <View style={s.infoRow}>
                <Ionicons name="calendar-outline" size={15} color={C.muted} />
                <Text style={s.infoLabel}>Follow-up</Text>
                <Text style={s.infoVal}>{d.follow_up}</Text>
              </View>
            )}
            {(d.missing_info || []).length > 0 && (
              <View style={s.warnCard}>
                <View style={s.warnHeader}>
                  <Ionicons name="warning-outline" size={15} color={C.warnB} />
                  <Text style={s.warnTitle}>Doctor Assist — Ask Before Patient Leaves</Text>
                </View>
                {d.missing_info.map((item, i) => (
                  <View key={i} style={s.warnRow}>
                    <Ionicons name="alert-circle-outline" size={13} color={C.warnB} />
                    <Text style={s.warnText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity style={s.newBtn} onPress={reset} activeOpacity={0.8}>
              <Ionicons name="add-outline" size={18} color={C.dark} />
              <Text style={s.newBtnText}>New Session</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function VitalTile({ icon, label, value }) {
  return (
    <View style={s.vitalTile}>
      <Ionicons name={icon} size={17} color={C.gray} />
      <Text style={s.vitalValue}>{value}</Text>
      <Text style={s.vitalLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#ffffff' },
  scroll: { paddingHorizontal: 20 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 12, marginBottom: 20 },
  headerSub:   { fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium', color: C.muted, letterSpacing: 0.5 },
  headerTitle: { fontSize: 38, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, letterSpacing: -1.5, lineHeight: 42 },
  resetBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, justifyContent: 'center', alignItems: 'center' },

  ctxBanner:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FBBF24', borderRadius: 18, padding: 14, marginBottom: 16 },
  fusedPatientBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FBBF24', padding: 14 },
  ctxCaseType:    { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, opacity: 0.65, marginTop: 2 },
  ctxContextHint: { fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#3a6e00', marginTop: 2 },
  ctxIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  ctxBody:     { flex: 1 },
  ctxLabel:    { fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium', color: C.dark, opacity: 0.7 },
  ctxName:     { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  ctxRight:    { alignItems: 'flex-end' },
  ctxTime:     { fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  ctxDate:     { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, opacity: 0.7, marginTop: 2 },

  langRow:            { flexDirection: 'row', gap: 8, marginBottom: 28 },
  langChip:           { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 50, backgroundColor: C.white },
  langChipActive:     { backgroundColor: C.dark },
  langChipText:       { fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.muted },
  langChipTextActive: { color: C.white },

  micZone:      { alignItems: 'center', marginBottom: 12 },
  orbArea:      { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  orbGlow:      { position: 'absolute', top: 40, left: 40, width: 140, height: 140, borderRadius: 70, backgroundColor: C.lime, shadowColor: C.lime, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 40 },
  micBtn:       { width: 120, height: 120, borderRadius: 60, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', shadowColor: C.lime, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 12 },
  micBtnActive: { backgroundColor: C.dark },
  recStatus:    { alignItems: 'center', marginTop: 2 },
  timerRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  timerText:    { fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, letterSpacing: 2 },
  eqRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 36, marginTop: 8 },
  eqBar:        { width: 5, borderRadius: 2.5, backgroundColor: C.dark },
  tapHint:      { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.muted, marginTop: 6 },
  statusHint:   { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray, marginTop: 6 },
  doneHint:     { fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#3a6e00', marginTop: 6 },

  // ── Voice Orb — ChatGPT-style AI voice assistant ─────────────────────────────
  orbZone:      { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 8 },
  // Container: 300×300 gives room for halo rings to expand without clipping
  orbContainer: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },

  // Ambient glow blobs: large blurred soft circles behind the orb
  // opacity driven by glowPulse — hot pink + purple
  orbGlowA: {
    position: 'absolute', top: 20, left: 20,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#ec4899',
    shadowColor: '#ec4899', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 65, elevation: 0,
  },
  orbGlowB: {
    position: 'absolute', top: 5, left: 5,
    width: 290, height: 290, borderRadius: 145,
    backgroundColor: '#9333ea',
    shadowColor: '#c084fc', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 80, elevation: 0,
  },

  // Main orb: white fallback, gradient applied via LinearGradient child
  voiceOrb: {
    width: 210, height: 210, borderRadius: 105,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#c026d3',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55, shadowRadius: 42, elevation: 24,
  },

  // Wrapper: fills the orb so rotating it orbits blobs around the centre
  orbBlobWrap: { position: 'absolute', width: 210, height: 210, borderRadius: 105 },

  // Blob 1 — (unused, replaced by LinearGradient sweeps)
  orbBlob1: { position: 'absolute', top: -65, left: -50, width: 240, height: 220, borderRadius: 120, backgroundColor: '#ec4899', opacity: 0 },
  // Blob 2 — vivid blue (lower-left, counter-clockwise)
  orbBlob2: {
    position: 'absolute', bottom: -70, left: -60,
    width: 250, height: 230, borderRadius: 125,
    backgroundColor: '#3b82f6', opacity: 0.60,
  },
  // Blob 3 — (unused, replaced by LinearGradient sweeps)
  orbBlob3: { position: 'absolute', top: 15, right: -75, width: 210, height: 185, borderRadius: 100, backgroundColor: '#9333ea', opacity: 0 },

  // Edge vignette — very faint, adds spherical depth without darkening
  orbFrost: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 105, backgroundColor: 'rgba(120,20,140,0.06)',
  },

  // Inner core glow — pulsing bright white burst at centre
  orbCore: {
    position: 'absolute', top: 55, left: 55,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 48, elevation: 0,
  },

  // Rim light — thin pink-white border
  orbRim: {
    position: 'absolute', top: 1, left: 1,
    width: 208, height: 208, borderRadius: 104,
    borderWidth: 1.5,
    borderColor: 'rgba(255,200,240,0.80)',
  },

  // Specular highlight — large top-left gloss blob (glass-marble reflection)
  orbHighlight: {
    position: 'absolute', top: 16, left: 22,
    width: 100, height: 72, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.48)',
  },

  // Spinner overlay
  orbSpinner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  // Touch target: centred in the 300×300 container over the 210×210 orb
  // (300-210)/2 = 45
  orbTouchTarget: { position: 'absolute', top: 45, left: 45, width: 210, height: 210, borderRadius: 105 },
  orbStatus:      { marginTop: 6, height: 42, alignItems: 'center', justifyContent: 'center' },
  timerRowNew: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDotNew:   { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ec4899' },
  timerTextNew:{ fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', color: '#202020', letterSpacing: 2 },
  eqRowNew:    { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 30, marginLeft: 4 },
  eqBarNew:    { width: 4, borderRadius: 2, backgroundColor: '#a855f7' },
  tapHintNew:  { fontSize: 14, fontFamily: 'SpaceGrotesk_500Medium', color: '#c084fc' },
  statusHintNew:{ fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: '#9333ea' },
  doneHintNew: { fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#9333ea' },

  // ── Language switch pill (visible during recording) ────────────────────────
  segLangRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  segCountLabel: { fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium', color: '#a855f7' },
  segLangPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(147,51,234,0.08)', borderWidth: 1, borderColor: 'rgba(147,51,234,0.25)',
    borderRadius: 50, paddingHorizontal: 13, paddingVertical: 7,
  },
  segLangPillText: { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#9333ea' },

  // ── Detected language badge (post-transcription) ───────────────────────────
  detectedLangBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 6 },
  detectedLangText:  { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: '#a855f7' },

  // ── Inline segment language picker ────────────────────────────────────────
  segPickerSheet: {
    marginTop: 12, backgroundColor: 'rgba(253,242,248,0.95)',
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(147,51,234,0.18)',
  },
  segPickerTitle: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', color: '#9333ea', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, textAlign: 'center' },
  segPickerRow:   { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  segPickerChip:  { borderRadius: 50, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
  segPickerChipActive: { backgroundColor: '#9333ea', borderColor: '#9333ea' },
  segPickerChipText:   { fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#555' },
  segPickerChipTextActive: { color: '#fff' },

  fieldLabel:      { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  transcriptCard:   { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  transcriptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, flexWrap: 'wrap', gap: 8 },
  transcriptLabel:  { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', color: C.gray, textTransform: 'uppercase', letterSpacing: 0.8, marginRight: 8 },
  tagRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autoTag:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.lime, borderRadius: 50, paddingHorizontal: 11, paddingVertical: 5 },
  autoTagText:     { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  autoTagHint:     { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted },
  dispLangRow:     { flexDirection: 'row', gap: 4 },
  dispPill:        { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.bg },
  dispPillActive:  { backgroundColor: C.dark },
  dispPillTxt:     { fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray },
  dispPillTxtActive:{ fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.white },
  translatingRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, minHeight: 60 },
  translatingTxt:  { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray },

  // Conversation / diarization bubbles
  conversationWrap:  { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  bubble:            { maxWidth: '84%', borderRadius: 16, padding: 12, gap: 3 },
  bubblePatient:     { alignSelf: 'flex-start', backgroundColor: '#FBBF24' },
  bubbleDoctor:      { alignSelf: 'flex-end',   backgroundColor: '#c9f158' },
  bubbleLabel:       { fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', color: 'rgba(32,32,32,0.55)', textTransform: 'capitalize' },
  bubbleText:        { fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: '#202020', lineHeight: 21 },
  translateErrRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingBottom: 8, backgroundColor: '#fef3c7', borderRadius: 8, marginHorizontal: 10, marginBottom: 4 },
  translateErrTxt: { flex: 1, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: '#b45309', paddingTop: 8 },
  transcriptInput: { padding: 14, paddingTop: 10, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, minHeight: 100, lineHeight: 22 },

  cardDivider:     { height: 1, backgroundColor: C.bg, marginHorizontal: 0 },
  patientRowFused: { flexDirection: 'row' },
  patientBoxFused: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  patientBoxFusedBorder: { borderLeftWidth: 1, borderLeftColor: C.bg },
  patientRow:  { flexDirection: 'row', gap: 10, marginBottom: 12 },
  patientBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  patientField:{ flex: 1, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark },

  processBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', backgroundColor: C.lime, paddingVertical: 16, borderRadius: 50, marginBottom: 14 },
  processBtnOff: { opacity: 0.4 },
  processBtnText:{ fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },

  errorBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.warn, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#fcd34d' },
  errorText:  { flex: 1, fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: '#92400e', lineHeight: 19 },

  results:    { gap: 8 },
  summaryCard:{ backgroundColor: C.dark, borderRadius: 20, padding: 18 },
  summaryText:{ fontSize: 15, fontFamily: 'SpaceGrotesk_400Regular', color: C.white, lineHeight: 22 },

  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 },
  infoLabel: { fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium', color: C.muted, width: 80 },
  infoVal:   { flex: 1, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },

  sectionCard: { backgroundColor: C.white, borderRadius: 18, padding: 16, gap: 10 },
  sectionTitle:{ fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', color: C.gray, textTransform: 'uppercase', letterSpacing: 0.8 },
  chipWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { backgroundColor: C.bg, borderRadius: 50, paddingHorizontal: 13, paddingVertical: 6 },
  chipText:    { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.dark },

  medRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  medDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: C.dark, marginTop: 7 },
  medName:   { fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  medDetail: { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 2 },

  vitalsGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vitalTile: { flex: 1, minWidth: 70, backgroundColor: C.bg, borderRadius: 14, padding: 13, alignItems: 'center', gap: 5 },
  vitalValue:{ fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  vitalLabel:{ fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray },

  warnCard:  { backgroundColor: C.warn, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#fcd34d', gap: 8 },
  warnHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  warnTitle: { flex: 1, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', color: '#92400e' },
  warnRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warnText:  { flex: 1, fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: '#92400e', lineHeight: 19 },

  newBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', backgroundColor: C.white, paddingVertical: 14, borderRadius: 50 },
  newBtnText:{ fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
});
