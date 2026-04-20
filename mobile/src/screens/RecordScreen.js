import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Animated, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { transcribeAudio, extractMedicalData } from '../lib/groq';
import { api } from '../lib/api';

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
  { code: 'hi-IN', label: '\u0939\u093f\u0928\u094d\u0926\u0940' },
  { code: 'mr-IN', label: '\u092e\u0930\u093e\u0920\u0940' },
  { code: 'en-IN', label: 'English' },
];

const LANG_LABEL = {
  hi: '\u0939\u093f\u0928\u094d\u0926\u0940', 'hi-IN': '\u0939\u093f\u0928\u094d\u0926\u0940',
  mr: '\u092e\u0930\u093e\u0920\u0940', 'mr-IN': '\u092e\u0930\u093e\u0920\u0940',
  en: 'English', 'en-IN': 'English',
};

const STAGE = { IDLE: 0, RECORDING: 1, TRANSCRIBING: 2, EXTRACTING: 3, DONE: 4, ERROR: 5 };

const fmtTimer = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function RecordScreen() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const [language,     setLanguage]     = useState('hi-IN');
  const [stage,        setStage]        = useState(STAGE.IDLE);
  const [timer,        setTimer]        = useState(0);
  const [transcript,   setTranscript]   = useState('');
  const [detectedLang, setDetectedLang] = useState(null);
  const [durationSecs, setDurationSecs] = useState(0);
  const [patientName,  setPatientName]  = useState('');
  const [patientId,    setPatientId]    = useState('');
  const [result,       setResult]       = useState(null);
  const [errMsg,       setErrMsg]       = useState('');

  const timerRef      = useRef(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const ripple1  = useRef(new Animated.Value(0)).current;
  const ripple2  = useRef(new Animated.Value(0)).current;
  const ripple3  = useRef(new Animated.Value(0)).current;
  const micPulse = useRef(new Animated.Value(1)).current;

  const isRecording    = stage === STAGE.RECORDING;
  const isTranscribing = stage === STAGE.TRANSCRIBING;
  const isExtracting   = stage === STAGE.EXTRACTING;
  const isDone         = stage === STAGE.DONE;
  const isBusy         = isTranscribing || isExtracting;

  useEffect(() => {
    if (isRecording) {
      startRipples();
      Animated.loop(
        Animated.sequence([
          Animated.spring(micPulse, { toValue: 1.07, useNativeDriver: true, tension: 120, friction: 5 }),
          Animated.spring(micPulse, { toValue: 1,    useNativeDriver: true, tension: 120, friction: 5 }),
        ])
      ).start();
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      micPulse.stopAnimation();
      micPulse.setValue(1);
      [ripple1, ripple2, ripple3].forEach((r) => { r.stopAnimation(); r.setValue(0); });
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const makeRipple = (anim, delay) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])
    );

  const startRipples = () => {
    makeRipple(ripple1, 0).start();
    makeRipple(ripple2, 467).start();
    makeRipple(ripple3, 934).start();
  };

  const rippleStyle = (anim) => ({
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: C.lime,
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.30, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
  });

  const startRecording = async () => {
    setErrMsg(''); setResult(null); setTranscript('');
    setDetectedLang(null); setTimer(0);
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) { Alert.alert('Permission needed', 'Microphone access is required.'); return; }
      await audioRecorder.record();
      setStage(STAGE.RECORDING);
    } catch {
      setErrMsg('Could not start recording.'); setStage(STAGE.ERROR);
    }
  };

  const stopAndTranscribe = async () => {
    const duration = timer;
    setStage(STAGE.TRANSCRIBING);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error('No audio file found.');
      const stt = await transcribeAudio(uri, language);
      setTranscript(stt.text);
      setDetectedLang(stt.language);
      setDurationSecs(stt.duration || duration);
      setStage(STAGE.IDLE);
    } catch {
      setStage(STAGE.IDLE);
      setErrMsg('Auto-transcription failed — type manually and process.');
    }
  };

  const processWithAI = async () => {
    if (!transcript.trim()) { Alert.alert('Empty', 'No transcript to process.'); return; }
    setStage(STAGE.EXTRACTING); setErrMsg('');
    try {
      const extracted = await extractMedicalData(transcript, language);
      const saved     = await api.saveSession({
        rawTranscript: transcript,
        language,
        detectedLang,
        durationSecs,
        extractedData: extracted,
        patientName:   patientName.trim() || null,
        patientId:     patientId.trim()   || null,
      });
      setResult({ ...extracted, _id: saved?.id });
      setStage(STAGE.DONE);
    } catch (e) {
      setErrMsg(e.message || 'AI processing failed.');
      setStage(STAGE.ERROR);
    }
  };

  const reset = () => {
    setStage(STAGE.IDLE);
    setTranscript(''); setDetectedLang(null);
    setResult(null); setErrMsg(''); setTimer(0);
    setPatientName(''); setPatientId('');
  };

  if (!fontsLoaded) return null;

  const d = result || {};
  const hasTranscript = transcript.length > 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={s.header}>
          <View>
            <Text style={s.headerSub}>your voice</Text>
            <Text style={s.headerTitle}>Record</Text>
          </View>
          <TouchableOpacity style={s.resetBtn} onPress={reset} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={16} color={C.dark} />
          </TouchableOpacity>
        </View>

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
          <Animated.View style={rippleStyle(ripple3)} />
          <Animated.View style={rippleStyle(ripple2)} />
          <Animated.View style={rippleStyle(ripple1)} />
          <Animated.View style={{ transform: [{ scale: micPulse }] }}>
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
          {isRecording ? (
            <View style={s.timerRow}>
              <View style={s.recDot} />
              <Text style={s.timerText}>{fmtTimer(timer)}</Text>
            </View>
          ) : isTranscribing ? (
            <Text style={s.statusHint}>Transcribing audio…</Text>
          ) : isDone ? (
            <Text style={s.doneHint}>Session saved ✓</Text>
          ) : (
            <Text style={s.tapHint}>tap to record</Text>
          )}
        </View>

        {/* TRANSCRIPT */}
        {(hasTranscript || (!isDone && stage === STAGE.IDLE)) && (
          <>
            <Text style={s.fieldLabel}>Transcript</Text>
            <View style={s.transcriptCard}>
              {detectedLang ? (
                <View style={s.tagRow}>
                  <View style={s.autoTag}>
                    <Ionicons name="language-outline" size={11} color={C.dark} />
                    <Text style={s.autoTagText}>{LANG_LABEL[detectedLang] || detectedLang.toUpperCase()}</Text>
                  </View>
                  <Text style={s.autoTagHint}>auto-detected</Text>
                </View>
              ) : null}
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
            </View>
          </>
        )}

        {/* PATIENT INFO */}
        {hasTranscript && !isDone && (
          <View style={s.patientRow}>
            <View style={[s.patientBox, { flex: 3 }]}>
              <Ionicons name="person-outline" size={14} color={C.muted} />
              <TextInput
                placeholder="Patient name"
                placeholderTextColor={C.muted}
                style={s.patientField}
                value={patientName}
                onChangeText={setPatientName}
              />
            </View>
            <View style={[s.patientBox, { flex: 2 }]}>
              <Ionicons name="card-outline" size={14} color={C.muted} />
              <TextInput
                placeholder="Patient ID"
                placeholderTextColor={C.muted}
                style={s.patientField}
                value={patientId}
                onChangeText={setPatientId}
              />
            </View>
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
                  <Ionicons name="sparkles-outline" size={16} color={C.dark} />
                  <Text style={s.processBtnText}>Process with AI</Text>
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

  langRow:            { flexDirection: 'row', gap: 8, marginBottom: 28 },
  langChip:           { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 50, backgroundColor: C.white },
  langChipActive:     { backgroundColor: C.dark },
  langChipText:       { fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.muted },
  langChipTextActive: { color: C.white },

  micZone:      { alignItems: 'center', justifyContent: 'center', height: 210, marginBottom: 20 },
  micBtn:       { width: 120, height: 120, borderRadius: 60, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', shadowColor: C.lime, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  micBtnActive: { backgroundColor: C.dark },
  timerRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 8 },
  recDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  timerText:    { fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, letterSpacing: 2 },
  tapHint:      { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.muted, marginTop: 14 },
  statusHint:   { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray, marginTop: 14 },
  doneHint:     { fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#3a6e00', marginTop: 14 },

  fieldLabel:      { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  transcriptCard:  { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  tagRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 12 },
  autoTag:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.lime, borderRadius: 50, paddingHorizontal: 11, paddingVertical: 5 },
  autoTagText:     { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  autoTagHint:     { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted },
  transcriptInput: { padding: 14, paddingTop: 10, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, minHeight: 100, lineHeight: 22 },

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
