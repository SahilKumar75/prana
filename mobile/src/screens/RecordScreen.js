import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Animated, TextInput,
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
import { transcribeAudio, extractMedicalData, translateTranscript, diarizeTranscript, correctTranscript, buildLabeledTranscript } from '../lib/groq';
import { api } from '../lib/api';
import CaseSelectModal from '../components/CaseSelectModal';

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

  const isRecording    = stage === STAGE.RECORDING;
  const isTranscribing  = stage === STAGE.TRANSCRIBING;
  const isDiarizingStage = stage === STAGE.DIARIZING;
  const isCorrectingStage = stage === STAGE.CORRECTING;
  const isExtracting   = stage === STAGE.EXTRACTING;
  const isDone         = stage === STAGE.DONE;
  const isBusy         = isTranscribing || isDiarizingStage || isCorrectingStage || isExtracting;

  useEffect(() => {
    if (isRecording) {
      // 1. Breathe — slow timing scale
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, { toValue: 1.07, duration: 1500, useNativeDriver: true }),
          Animated.timing(breatheAnim, { toValue: 1,    duration: 1500, useNativeDriver: true }),
        ])
      ).start();
      // 2. Ripple rings
      makeRipple(ripple1, 0).start();
      makeRipple(ripple2, 600).start();
      makeRipple(ripple3, 1200).start();
      // 3. Equalizer bars
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
      breatheAnim.stopAnimation(); breatheAnim.setValue(1);
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

  // Ring style: border-only circles that expand outward and fade
  const ringStyle = (anim) => ({
    position: 'absolute',
    top: 50, left: 50,
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2,
    borderColor: C.lime,
    opacity: anim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.9, 0.5, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.7] }) }],
  });

  const startRecording = async () => {
    setErrMsg(''); setResult(null); setTranscript('');
    setDetectedLang(null); setTimer(0);
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

  const stopAndTranscribe = async () => {
    const duration = timer;
    setStage(STAGE.TRANSCRIBING);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error('No audio file found.');
      // Pass full language code (e.g. 'hi-IN') so the STT router can pick the
      // right provider. toWhisperLang() would strip it to 'hi' and break routing.
      const stt = await transcribeAudio(uri, language === 'auto' ? 'auto' : language);
      setTranscript(stt.text);
      setDetectedLang(stt.language);
      setDurationSecs(stt.duration || duration);
      // Correction pass — run on raw STT text (before diarization)
      setStage(STAGE.CORRECTING);
      let corrected = stt.text;
      try {
        corrected = await correctTranscript(stt.text, stt.language);
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
            corrected, routeDoctor.name, routePatient.name, stt.language
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
        session:     saved || { id: null },
        extracted,
        sessionRef,
        patientName: routePatient?.name || patientName.trim() || null,
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

        {/* MIC ZONE */}
        <View style={s.micZone}>
          <View style={s.orbArea}>
            {/* Glow halo — breathes with the orb */}
            {isRecording && (
              <Animated.View style={[s.orbGlow, {
                opacity:   breatheAnim.interpolate({ inputRange: [1, 1.07], outputRange: [0.45, 0.9] }),
                transform: [{ scale: breatheAnim.interpolate({ inputRange: [1, 1.07], outputRange: [1, 1.45] }) }],
              }]} />
            )}
            {/* Ripple rings — border circles that expand outward */}
            {isRecording && (
              <>
                <Animated.View style={ringStyle(ripple1)} />
                <Animated.View style={ringStyle(ripple2)} />
                <Animated.View style={ringStyle(ripple3)} />
              </>
            )}
            {/* Orb with breathe scale */}
            <Animated.View style={{ transform: [{ scale: breatheAnim }] }}>
              <TouchableOpacity
                style={[s.micBtn, isRecording && s.micBtnActive]}
                onPress={isRecording ? stopAndTranscribe : (isBusy ? null : startRecording)}
                activeOpacity={0.88}
                disabled={isBusy}
              >
                {isTranscribing
                  ? <ActivityIndicator color={C.dark} size="large" />
                  : <Ionicons
                      name={isRecording ? 'stop' : 'mic'}
                      size={42}
                      color={isRecording ? C.white : C.dark}
                    />
                }
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Status row: timer + equalizer bars OR hint text */}
          {isRecording ? (
            <View style={s.recStatus}>
              <View style={s.timerRow}>
                <View style={s.recDot} />
                <Text style={s.timerText}>{fmtTimer(timer)}</Text>
              </View>
              <View style={s.eqRow}>
                {barAnims.map((anim, i) => (
                  <Animated.View key={i} style={[s.eqBar, { height: anim }]} />
                ))}
              </View>
            </View>
          ) : isTranscribing ? (
            <Text style={s.statusHint}>Transcribing audio…</Text>
          ) : isDiarizingStage ? (
            <Text style={s.statusHint}>Identifying speakers…</Text>
          ) : isCorrectingStage ? (
            <Text style={s.statusHint}>Correcting transcript…</Text>
          ) : isDone ? (
            <Text style={s.doneHint}>Session saved ✓</Text>
          ) : (
            <Text style={s.tapHint}>tap to record</Text>
          )}
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
  safe:   { flex: 1, backgroundColor: C.bg },
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
