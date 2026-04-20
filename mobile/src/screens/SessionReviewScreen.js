/**
 * SessionReviewScreen
 * Shown after "End Session" — full session detail with manual editing.
 * Doctor can correct any AI-extracted field before confirming.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { api } from '../lib/api';

const C = {
  bg:    '#f2f3f5',
  white: '#ffffff',
  dark:  '#202020',
  lime:  '#c9f158',
  yellow:'#FBBF24',
  gray:  '#888888',
  muted: '#bbbbbe',
  red:   '#fee2e2',
  redTx: '#b91c1c',
};

const SEV_COLOR = { mild: '#3a6e00', moderate: '#c09a1a', severe: '#b91c1c' };

// ─── Chip tag with optional remove ───────────────────────────────────────────
function Chip({ label, onRemove }) {
  return (
    <View style={s.chip}>
      <Text style={s.chipTxt}>{label}</Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="close" size={12} color={C.gray} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Add-chip input row ───────────────────────────────────────────────────────
function AddChipRow({ placeholder, onAdd }) {
  const [val, setVal] = useState('');
  const submit = () => {
    const t = val.trim();
    if (!t) return;
    onAdd(t);
    setVal('');
  };
  return (
    <View style={s.addRow}>
      <TextInput
        style={s.addInput}
        value={val}
        onChangeText={setVal}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      <TouchableOpacity style={s.addBtn} onPress={submit}>
        <Ionicons name="add" size={18} color={C.dark} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Medication card ──────────────────────────────────────────────────────────
function MedCard({ med, index, onChange, onRemove }) {
  const field = (key, placeholder, keyboardType = 'default') => (
    <TextInput
      style={s.medInput}
      value={med[key] != null ? String(med[key]) : ''}
      onChangeText={(v) => onChange(index, { ...med, [key]: v || null })}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      keyboardType={keyboardType}
    />
  );
  return (
    <View style={s.medCard}>
      <View style={s.medCardHeader}>
        <Ionicons name="medical-outline" size={15} color={C.dark} />
        <Text style={s.medCardTitle}>Medication {index + 1}</Text>
        <TouchableOpacity onPress={() => onRemove(index)} style={{ marginLeft: 'auto' }}>
          <Ionicons name="trash-outline" size={15} color={C.redTx} />
        </TouchableOpacity>
      </View>
      {field('name',              'Generic name',    'default')}
      {field('prescription_name', 'Brand name',      'default')}
      {field('dose_mg',           'Dose (mg)',        'numeric')}
      {field('frequency',         'Frequency',        'default')}
      {field('duration',          'Duration',         'default')}
    </View>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon, title, children, accent, aiField }) {
  return (
    <View style={s.section}>
      <View style={[s.sectionHead, accent && { borderLeftColor: accent }]}>
        <Ionicons name={icon} size={15} color={C.dark} />
        <Text style={s.sectionTitle}>{title}</Text>
        {aiField && (
          <View style={s.aiBadge}>
            <Ionicons name="sparkles-outline" size={10} color="#7c3aed" />
            <Text style={s.aiBadgeTxt}>AI filled · tap to edit</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

// ─── Collapsible transcript block ────────────────────────────────────────────
function TranscriptBlock({ transcript, diarizedLines }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };
  if (!transcript && (!diarizedLines || diarizedLines.length === 0)) return null;
  return (
    <View style={s.txBlock}>
      <TouchableOpacity style={s.txHeader} onPress={toggle} activeOpacity={0.8}>
        <Ionicons name="mic-outline" size={15} color={C.dark} />
        <Text style={s.txHeaderTxt}>Session Transcript</Text>
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={s.txSubTxt}>{open ? 'Hide' : 'View for reference'}</Text>
          <Ionicons name={open ? 'chevron-up-outline' : 'chevron-down-outline'} size={14} color={C.gray} />
        </View>
      </TouchableOpacity>
      {open && (
        <View style={s.txBody}>
          {diarizedLines && diarizedLines.length > 0
            ? diarizedLines.map((line, i) => (
                <View key={i} style={s.txLine}>
                  <Text style={[s.txSpeaker,
                    line.speaker === 'doctor'  && { color: '#1d4ed8' },
                    line.speaker === 'patient' && { color: '#065f46' },
                  ]}>{line.name || line.speaker}:</Text>
                  <Text style={s.txLineText}>{line.text}</Text>
                </View>
              ))
            : <Text style={s.txRaw}>{transcript}</Text>
          }
        </View>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function SessionReviewScreen({ route, navigation }) {
  const {
    session, extracted: initialExtracted, sessionRef,
    patientName: initPatientName, transcript: rawTranscript,
    diarizedLines: initDiarizedLines,
  } = route.params;

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular, SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
  });

  // Editable state — seeded from AI extraction
  const [patientName,     setPatientName]     = useState(initPatientName || initialExtracted?.patient_name || '');
  const [diagnosis,       setDiagnosis]       = useState(initialExtracted?.diagnosis || '');
  const [severity,        setSeverity]        = useState(initialExtracted?.severity || null);
  const [symptomDuration, setSymptomDuration] = useState(initialExtracted?.symptom_duration || '');
  const [symptoms,        setSymptoms]        = useState(initialExtracted?.symptoms || []);
  const [medications,     setMedications]     = useState(initialExtracted?.medications || []);
  const [followUp,        setFollowUp]        = useState(initialExtracted?.follow_up || '');
  const [summary,         setSummary]         = useState(initialExtracted?.summary || '');
  const [notes,           setNotes]           = useState(initialExtracted?.doctor_notes || '');
  const [saving,          setSaving]          = useState(false);

  const sessionId = session?.id || sessionRef || '—';

  const addMedication = () => {
    setMedications(prev => [...prev, {
      name: '', prescription_name: null, dose_mg: null,
      dosage: null, frequency: null, duration: null,
    }]);
  };

  const updateMed = (idx, updated) => {
    setMedications(prev => prev.map((m, i) => i === idx ? updated : m));
  };

  const removeMed = (idx) => {
    setMedications(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedData = {
        ...initialExtracted,
        patient_name:     patientName  || null,
        diagnosis:        diagnosis    || null,
        severity:         severity     || null,
        symptom_duration: symptomDuration || null,
        symptoms,
        medications: medications.filter(m => m.name?.trim()),
        follow_up:   followUp  || null,
        summary:     summary   || null,
        doctor_notes: notes    || null,
      };
      await api.updateSession(session.id, { extracted_data: updatedData });
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (e) {
      Alert.alert('Save failed', e.message || 'Could not update session.');
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back-outline" size={20} color={C.dark} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Session Review</Text>
            <Text style={s.headerSub} numberOfLines={1}>ID: {sessionId}</Text>
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={C.dark} />
              : <Text style={s.saveTxt}>Confirm</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── AI banner ── */}
          <View style={s.aiBanner}>
            <Ionicons name="sparkles" size={14} color="#7c3aed" />
            <Text style={s.aiBannerTxt}>Fields pre-filled by AI — review and correct any mistakes below</Text>
          </View>

          {/* ── Transcript reference ── */}
          <TranscriptBlock transcript={rawTranscript} diarizedLines={initDiarizedLines} />

          {/* ── Session ID card ── */}
          <View style={s.idCard}>
            <View style={s.idRow}>
              <Ionicons name="document-text-outline" size={16} color={C.gray} />
              <Text style={s.idLabel}>Session ID</Text>
              <Text style={s.idValue}>{sessionId}</Text>
            </View>
            {sessionRef && sessionRef !== sessionId && (
              <View style={s.idRow}>
                <Ionicons name="link-outline" size={16} color={C.gray} />
                <Text style={s.idLabel}>Ref</Text>
                <Text style={s.idValue}>{sessionRef}</Text>
              </View>
            )}
            {patientName ? (
              <View style={s.idRow}>
                <Ionicons name="person-outline" size={16} color={C.gray} />
                <Text style={s.idLabel}>Patient</Text>
                <TextInput
                  style={[s.idValue, s.idEditable]}
                  value={patientName}
                  onChangeText={setPatientName}
                  placeholder="Patient name"
                  placeholderTextColor={C.muted}
                />
              </View>
            ) : null}
          </View>

          {/* ── Diagnosis ── */}
          <Section icon="medkit-outline" title="Diagnosis" accent="#93c5fd" aiField={!!initialExtracted?.diagnosis}>
            <TextInput
              style={s.fieldInput}
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholder="Enter diagnosis"
              placeholderTextColor={C.muted}
              multiline
            />
          </Section>

          {/* ── Severity ── */}
          <Section icon="pulse-outline" title="Severity" aiField={!!initialExtracted?.severity}>
            <View style={s.sevRow}>
              {['mild', 'moderate', 'severe'].map(sv => (
                <TouchableOpacity
                  key={sv}
                  style={[s.sevChip, severity === sv && { backgroundColor: C.dark }]}
                  onPress={() => setSeverity(sv === severity ? null : sv)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.sevTxt, severity === sv && { color: SEV_COLOR[sv] }]}>
                    {sv.charAt(0).toUpperCase() + sv.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          {/* ── Symptoms ── */}
          <Section icon="bandage-outline" title="Symptoms" accent="#86efac" aiField={initialExtracted?.symptoms?.length > 0}>
            <View style={s.chipWrap}>
              {symptoms.map((sym, i) => (
                <Chip key={i} label={sym} onRemove={() => setSymptoms(prev => prev.filter((_, j) => j !== i))} />
              ))}
            </View>
            <AddChipRow placeholder="Add symptom…" onAdd={(v) => setSymptoms(prev => [...prev, v])} />
            {symptomDuration ? (
              <View style={s.durationRow}>
                <Ionicons name="hourglass-outline" size={14} color={C.muted} />
                <TextInput
                  style={s.durationInput}
                  value={symptomDuration}
                  onChangeText={setSymptomDuration}
                  placeholder="Duration (e.g. 3 days)"
                  placeholderTextColor={C.muted}
                />
              </View>
            ) : (
              <AddChipRow placeholder="Symptom duration (e.g. 3 days)…" onAdd={setSymptomDuration} />
            )}
          </Section>

          {/* ── Medications ── */}
          <Section icon="flask-outline" title="Medications" accent={C.lime} aiField={initialExtracted?.medications?.length > 0}>
            {medications.map((med, i) => (
              <MedCard key={i} med={med} index={i} onChange={updateMed} onRemove={removeMed} />
            ))}
            <TouchableOpacity style={s.addMedBtn} onPress={addMedication} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={16} color={C.dark} />
              <Text style={s.addMedTxt}>Add medication</Text>
            </TouchableOpacity>
          </Section>

          {/* ── Follow-up ── */}
          <Section icon="calendar-outline" title="Follow-up Instructions" aiField={!!initialExtracted?.follow_up}>
            <TextInput
              style={s.fieldInput}
              value={followUp}
              onChangeText={setFollowUp}
              placeholder="Follow-up instructions"
              placeholderTextColor={C.muted}
              multiline
            />
          </Section>

          {/* ── Summary ── */}
          <Section icon="reader-outline" title="Clinical Summary" aiField={!!initialExtracted?.summary}>
            <TextInput
              style={[s.fieldInput, { minHeight: 80 }]}
              value={summary}
              onChangeText={setSummary}
              placeholder="One-sentence clinical summary"
              placeholderTextColor={C.muted}
              multiline
            />
          </Section>

          {/* ── Doctor notes ── */}
          <Section icon="create-outline" title="Doctor Notes (private)">
            <TextInput
              style={[s.fieldInput, { minHeight: 80 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Private notes (not shown to patient)"
              placeholderTextColor={C.muted}
              multiline
            />
          </Section>

          {/* ── Confirm button (bottom) ── */}
          <TouchableOpacity style={s.confirmBtn} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
            {saving
              ? <ActivityIndicator color={C.dark} />
              : (
                <>
                  <Ionicons name="checkmark-done-outline" size={18} color={C.dark} />
                  <Text style={s.confirmTxt}>Confirm & Save</Text>
                </>
              )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f3f5' },
  scroll:    { paddingHorizontal: 16, paddingTop: 12 },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  backBtn:      { width: 40, height: 40, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  headerSub:    { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 2 },
  saveBtn:      { backgroundColor: C.dark, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, minWidth: 80, alignItems: 'center' },
  saveTxt:      { fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.lime },

  idCard:    { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, gap: 10 },
  idRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  idLabel:   { fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray, width: 60 },
  idValue:   { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark, flex: 1 },
  idEditable:{ borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 2 },

  section:     { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: 'transparent', paddingLeft: 8 },
  sectionTitle:{ fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, letterSpacing: 0.3 },

  fieldInput:  { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: C.dark, backgroundColor: '#f2f3f5', borderRadius: 12, padding: 12, lineHeight: 20 },

  sevRow:  { flexDirection: 'row', gap: 10 },
  sevChip: { flex: 1, backgroundColor: '#f2f3f5', borderRadius: 50, paddingVertical: 9, alignItems: 'center' },
  sevTxt:  { fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.gray },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f3f5', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  chipTxt:  { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.dark },

  addRow:   { flexDirection: 'row', gap: 8, marginTop: 4 },
  addInput: { flex: 1, backgroundColor: '#f2f3f5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: C.dark },
  addBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },

  durationRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  durationInput:{ flex: 1, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: C.dark, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4 },

  medCard:       { backgroundColor: '#f2f3f5', borderRadius: 14, padding: 14, marginBottom: 10, gap: 8 },
  medCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  medCardTitle:  { fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  medInput:      { backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: C.dark },

  addMedBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  addMedTxt: { fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },

  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.lime, borderRadius: 18, paddingVertical: 16, marginTop: 8 },
  confirmTxt: { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },

  aiBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ede9fe', borderRadius: 14, padding: 12, marginBottom: 12 },
  aiBannerTxt: { flex: 1, fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium', color: '#5b21b6', lineHeight: 17 },

  aiBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ede9fe', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
  aiBadgeTxt: { fontSize: 10, fontFamily: 'SpaceGrotesk_500Medium', color: '#7c3aed' },

  txBlock:     { backgroundColor: C.white, borderRadius: 18, marginBottom: 14, overflow: 'hidden' },
  txHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  txHeaderTxt: { fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  txSubTxt:    { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray },
  txBody:      { paddingHorizontal: 14, paddingBottom: 14, gap: 8, borderTopWidth: 1, borderTopColor: '#f2f3f5' },
  txLine:      { flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingTop: 8 },
  txSpeaker:   { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', color: C.gray, minWidth: 70 },
  txLineText:  { flex: 1, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, lineHeight: 19 },
  txRaw:       { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, lineHeight: 20, paddingTop: 10 },
});
