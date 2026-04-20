import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

const C = {
  bg:    '#f2f3f5',
  white: '#ffffff',
  dark:  '#202020',
  lime:  '#c9f158',
  pink:  '#F5B8DB',
  gray:  '#888888',
  muted: '#bbbbbe',
};

// step: 'choose' | 'followup' | 'new'
export default function CaseSelectModal({ visible, patient, doctor, onSelect, onClose }) {
  const [step,         setStep]         = useState('choose');
  const [cases,        setCases]        = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [caseType,     setCaseType]     = useState('');
  const [creating,     setCreating]     = useState(false);

  useEffect(() => {
    if (visible) { setStep('choose'); setCaseType(''); setCases([]); }
  }, [visible]);

  const loadCases = async () => {
    if (!patient?.patientDbId) {
      // No DB mapping — skip straight to new case
      setStep('followup');
      return;
    }
    setLoadingCases(true);
    try {
      const data = await api.getCasesForPatient(patient.patientDbId);
      setCases(data);
    } catch (_) {
      setCases([]);
    } finally {
      setLoadingCases(false);
      setStep('followup');
    }
  };

  const handleSelectCase = async (c) => {
    const history = await api.getSessionsForCase(c.id).catch(() => []);
    onSelect({ caseId: c.id, caseType: c.case_type, isFollowUp: true, caseHistory: history, caseRef: c.case_ref || null });
  };

  const handleNewCase = async () => {
    if (!caseType.trim()) return;
    setCreating(true);
    try {
      // Ensure patient exists in patients table
      const pat = await api.getOrCreatePatient({
        patientDbId: patient?.patientDbId || null,
        name:        patient?.name || 'Unknown',
      });
      const newCase = await api.createCase({
        patientId: pat.id,
        doctorId:  doctor?.id || null,
        caseType:  caseType.trim(),
      });
      onSelect({ caseId: newCase.id, caseType: newCase.case_type, isFollowUp: false, caseHistory: [], caseRef: newCase.case_ref || null });
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not create case');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            {step !== 'choose' && (
              <TouchableOpacity onPress={() => setStep('choose')} style={s.backBtn} activeOpacity={0.7}>
                <Ionicons name="arrow-back-outline" size={20} color={C.dark} />
              </TouchableOpacity>
            )}
            <View style={s.headerText}>
              <Text style={s.patientName}>{patient?.name}</Text>
              <Text style={s.subtitle}>
                {step === 'choose'   ? 'Is this a follow-up visit?'
                : step === 'followup' ? 'Select open case'
                : 'New case'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close-outline" size={24} color={C.dark} />
            </TouchableOpacity>
          </View>

          {/* ── Step: Choose ── */}
          {step === 'choose' && (
            <View style={s.chooseRow}>
              <TouchableOpacity
                style={[s.chooseCard, { backgroundColor: C.pink }]}
                activeOpacity={0.8}
                onPress={loadCases}
                disabled={loadingCases}
              >
                <Ionicons name="git-branch-outline" size={28} color={C.dark} />
                <Text style={s.chooseTitle}>Follow-up</Text>
                <Text style={s.chooseDesc}>Add to an existing case</Text>
                {loadingCases && <ActivityIndicator size="small" color={C.dark} style={{ marginTop: 8 }} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.chooseCard, { backgroundColor: C.lime }]}
                activeOpacity={0.8}
                onPress={() => setStep('new')}
              >
                <Ionicons name="add-circle-outline" size={28} color={C.dark} />
                <Text style={s.chooseTitle}>New Case</Text>
                <Text style={s.chooseDesc}>Create a fresh case</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step: Follow-up list ── */}
          {step === 'followup' && (
            cases.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="folder-open-outline" size={36} color={C.muted} />
                <Text style={s.emptyTxt}>No open cases for this patient</Text>
                <TouchableOpacity style={s.altBtn} onPress={() => setStep('new')} activeOpacity={0.8}>
                  <Text style={s.altBtnTxt}>Create new case instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {cases.map((c) => (
                  <TouchableOpacity key={c.id} style={s.caseRow} activeOpacity={0.8} onPress={() => handleSelectCase(c)}>
                    <View style={s.caseIcon}>
                      <Ionicons name="medical-outline" size={20} color={C.dark} />
                    </View>
                    <View style={s.caseBody}>
                      <Text style={s.caseType}>{c.case_type}</Text>
                      <Text style={s.caseMeta}>
                        Since {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {c.sessions?.length ? `  \u00b7  ${c.sessions.length} session(s)` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.muted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )
          )}

          {/* ── Step: New Case ── */}
          {step === 'new' && (
            <View style={s.newForm}>
              <Text style={s.inputLabel}>Chief complaint / case type</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Broken Hand, Chest Pain, Back Injury"
                placeholderTextColor={C.muted}
                value={caseType}
                onChangeText={setCaseType}
                autoFocus
              />
              <TouchableOpacity
                style={[s.createBtn, (!caseType.trim() || creating) && s.createBtnDisabled]}
                onPress={handleNewCase}
                activeOpacity={0.8}
                disabled={!caseType.trim() || creating}
              >
                {creating
                  ? <ActivityIndicator size="small" color={C.dark} />
                  : <Text style={s.createBtnTxt}>Start new case</Text>
                }
              </TouchableOpacity>
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 44, paddingTop: 10, minHeight: 340 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: C.muted, alignSelf: 'center', marginBottom: 20 },

  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  backBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  patientName:{ fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  subtitle:   { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 2 },

  chooseRow:  { flexDirection: 'row', gap: 12 },
  chooseCard: { flex: 1, borderRadius: 22, padding: 20, alignItems: 'center', gap: 8, minHeight: 150, justifyContent: 'center' },
  chooseTitle:{ fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  chooseDesc: { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, opacity: 0.65, textAlign: 'center' },

  empty:      { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyTxt:   { fontSize: 15, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray },
  altBtn:     { backgroundColor: C.lime, borderRadius: 50, paddingHorizontal: 20, paddingVertical: 10 },
  altBtnTxt:  { fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },

  caseRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg, gap: 12 },
  caseIcon:   { width: 44, height: 44, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  caseBody:   { flex: 1 },
  caseType:   { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  caseMeta:   { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 2 },

  newForm:          { gap: 16 },
  inputLabel:       { fontSize: 14, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray },
  input:            { backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark },
  createBtn:        { backgroundColor: C.dark, borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  createBtnDisabled:{ opacity: 0.4 },
  createBtnTxt:     { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.white },
});
