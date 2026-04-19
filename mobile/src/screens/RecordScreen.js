import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Animated, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

const LANGUAGES = [
  { code: 'hi-IN', label: 'हिंदी' },
  { code: 'mr-IN', label: 'मराठी' },
  { code: 'en-IN', label: 'English' },
];

export default function RecordScreen() {
  const [language, setLanguage]     = useState('hi-IN');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);
  const [timer, setTimer]           = useState(0);
  const timerRef = useRef(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const ripple1  = useRef(new Animated.Value(0)).current;
  const ripple2  = useRef(new Animated.Value(0)).current;
  const ripple3  = useRef(new Animated.Value(0)).current;
  const bgAnim   = useRef(new Animated.Value(0)).current;
  const micPulse = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 440, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.timing(bgAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
      Animated.loop(
        Animated.sequence([
          Animated.spring(micPulse, { toValue: 1.06, useNativeDriver: true, tension: 100, friction: 5 }),
          Animated.spring(micPulse, { toValue: 1,    useNativeDriver: true, tension: 100, friction: 5 }),
        ])
      ).start();
      startRipples();
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      Animated.timing(bgAnim, { toValue: 0, duration: 400, useNativeDriver: false }).start();
      micPulse.stopAnimation();
      micPulse.setValue(1);
      [ripple1, ripple2, ripple3].forEach((r) => { r.stopAnimation(); r.setValue(0); });
      if (timerRef.current) { clearInterval(timerRef.current); setTimer(0); }
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
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F5B8DB',
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.25, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
  });

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F5F5F2', '#FDEAF5'],
  });

  const fmtTimer = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    setError(null); setResult(null); setTranscript('');
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) { Alert.alert('Permission needed', 'Microphone access is required.'); return; }
      await audioRecorder.record();
      setIsRecording(true);
    } catch {
      setError('Could not start recording.');
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      setIsRecording(false);
    } catch {
      setIsRecording(false);
    }
  };

  const processSession = async () => {
    if (!transcript.trim()) { Alert.alert('Empty', 'Please add a transcript first.'); return; }
    setIsProcessing(true); setError(null);
    try {
      const res = await api.createSession(transcript, language);
      setResult(res);
    } catch {
      setError('Backend offline — processing unavailable.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => { setTranscript(''); setResult(null); setError(null); };

  return (
    <Animated.View style={[styles.outerWrap, { backgroundColor: bgColor }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          style={{ opacity: fadeAnim }}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSub}>your voice</Text>
              <Text style={styles.headerTitle}>Record</Text>
            </View>
            <TouchableOpacity onPress={reset} activeOpacity={0.7}>
              <View style={styles.resetBtn}>
                <Ionicons name="refresh-outline" size={16} color="#1A1A1A" />
              </View>
            </TouchableOpacity>
          </View>

          {/* LANGUAGE CHIPS */}
          <View style={styles.langRow}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langChip, language === l.code && styles.langChipActive]}
                onPress={() => setLanguage(l.code)}
                activeOpacity={0.8}
              >
                <Text style={[styles.langChipText, language === l.code && styles.langChipTextActive]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* MIC ZONE */}
          <View style={styles.micZone}>
            <Animated.View style={rippleStyle(ripple3)} />
            <Animated.View style={rippleStyle(ripple2)} />
            <Animated.View style={rippleStyle(ripple1)} />
            <Animated.View style={{ transform: [{ scale: micPulse }] }}>
              <TouchableOpacity
                style={[styles.micBtn, isRecording && styles.micBtnActive]}
                onPress={isRecording ? stopRecording : startRecording}
                activeOpacity={0.88}
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={38}
                  color={isRecording ? '#fff' : '#1A1A1A'}
                />
              </TouchableOpacity>
            </Animated.View>
            {isRecording ? (
              <View style={styles.timerRow}>
                <View style={styles.recordingDot} />
                <Text style={styles.timerText}>{fmtTimer(timer)}</Text>
              </View>
            ) : (
              <Text style={styles.tapHint}>tap to record</Text>
            )}
          </View>

          {/* TRANSCRIPT */}
          <Text style={styles.fieldLabel}>Transcript</Text>
          <TextInput
            style={styles.transcriptInput}
            multiline
            placeholder="Transcript appears here after recording, or type manually..."
            placeholderTextColor="#ccc"
            value={transcript}
            onChangeText={setTranscript}
            textAlignVertical="top"
          />

          {/* PROCESS BUTTON */}
          <TouchableOpacity
            style={[styles.processBtn, (!transcript.trim() || isProcessing) && styles.processBtnDisabled]}
            onPress={processSession}
            activeOpacity={0.85}
            disabled={!transcript.trim() || isProcessing}
          >
            {isProcessing
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <>
                  <Ionicons name="sparkles-outline" size={16} color="#fff" />
                  <Text style={styles.processBtnText}>Process with AI</Text>
                </>
              )
            }
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBlock}>
              <Ionicons name="cloud-offline-outline" size={14} color="#1A1A1A" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {result && (
            <View style={styles.resultBlock}>
              <Text style={styles.resultTitle}>AI Analysis</Text>
              {result.entities?.length > 0 && (
                <>
                  <Text style={styles.resultSub}>Entities</Text>
                  <View style={styles.chipRow}>
                    {result.entities.map((e, i) => (
                      <View key={i} style={styles.entityChip}>
                        <Text style={styles.entityText}>{e.text || e}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {result.summary && <Text style={styles.resultSummary}>{result.summary}</Text>}
            </View>
          )}

          <View style={{ height: 110 }} />
        </Animated.ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerWrap:     { flex: 1 },
  safe:          { flex: 1 },
  scroll:        { paddingHorizontal: 22 },

  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 12, marginBottom: 20 },
  headerSub:     { fontSize: 13, color: '#bbb', fontWeight: '500' },
  headerTitle:   { fontSize: 42, fontWeight: '800', color: '#1A1A1A', letterSpacing: -2, lineHeight: 46 },
  resetBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6 },

  langRow:       { flexDirection: 'row', gap: 8, marginBottom: 32 },
  langChip:      { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8E0D5' },
  langChipActive:{ backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  langChipText:  { fontSize: 14, fontWeight: '600', color: '#aaa' },
  langChipTextActive: { color: '#fff' },

  micZone:       { alignItems: 'center', justifyContent: 'center', height: 240, marginBottom: 24 },
  micBtn:        {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: '#F5B8DB',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F5B8DB', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55, shadowRadius: 24, elevation: 14,
  },
  micBtnActive:  { backgroundColor: '#1A1A1A' },
  timerRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  recordingDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e57373', marginRight: 6 },
  timerText:     { fontSize: 24, fontWeight: '700', color: '#1A1A1A', letterSpacing: 2 },
  tapHint:       { fontSize: 13, color: '#bbb', marginTop: 16, letterSpacing: 1 },

  fieldLabel:    { fontSize: 12, fontWeight: '600', color: '#aaa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  transcriptInput: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    fontSize: 15, color: '#1A1A1A', minHeight: 110, lineHeight: 22,
    borderWidth: 1, borderColor: '#E8E0D5', marginBottom: 14,
  },

  processBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', backgroundColor: '#1A1A1A', padding: 16, borderRadius: 32, marginBottom: 14 },
  processBtnDisabled: { opacity: 0.35 },
  processBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },

  errorBlock:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5D867', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  errorText:     { fontSize: 13, fontWeight: '500', color: '#1A1A1A', flex: 1 },

  resultBlock:   { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#E8E0D5' },
  resultTitle:   { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  resultSub:     { fontSize: 11, fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  entityChip:    { backgroundColor: '#F5B8DB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  entityText:    { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  resultSummary: { fontSize: 14, color: '#444', lineHeight: 22 },
});
