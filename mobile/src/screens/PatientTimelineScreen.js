/**
 * PatientTimelineScreen
 * Opened from RecordScreen by tapping the patient banner.
 * Shows all past sessions for this patient in chronological order.
 * Doctor can tap a session to expand it and add its context to the current recording.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Switch,
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
};

const ACCENTS = ['#c9f158', '#FBBF24', '#93c5fd', '#f9a8d4', '#86efac', '#fca5a5'];

const fmt = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export default function PatientTimelineScreen({ route, navigation }) {
  const { patient, selectedSessions = [], onUpdateContext } = route.params;

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular, SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
  });

  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(null); // session id
  // Track which sessions are included in context
  const [included,  setIncluded]  = useState(() => {
    const map = {};
    selectedSessions.forEach(s => { map[s.id] = true; });
    return map;
  });

  useEffect(() => {
    api.getPatientSessions(patient.patientDbId || patient.id)
      .then(data => setSessions(data || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [patient]);

  const toggleInclude = (session) => {
    setIncluded(prev => ({ ...prev, [session.id]: !prev[session.id] }));
  };

  const handleDone = () => {
    const contextSessions = sessions.filter(s => included[s.id]);
    onUpdateContext?.(contextSessions);
    navigation.goBack();
  };

  const includedCount = Object.values(included).filter(Boolean).length;

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={20} color={C.dark} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{patient.name}</Text>
          <Text style={s.headerSub}>{patient.patientDbId || patient.id} · Timeline</Text>
        </View>
        <TouchableOpacity style={s.doneBtn} onPress={handleDone} activeOpacity={0.85}>
          <Text style={s.doneTxt}>
            {includedCount > 0 ? `Add ${includedCount}` : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Context hint */}
      <View style={s.hintBar}>
        <Ionicons name="information-circle-outline" size={15} color={C.gray} />
        <Text style={s.hintTxt}>
          Toggle sessions to include in the current recording context. Enabled sessions will be passed to the AI for richer extraction.
        </Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.dark} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="document-text-outline" size={40} color={C.muted} />
          <Text style={s.emptyTitle}>No past visits</Text>
          <Text style={s.emptySub}>This is {patient.name}'s first session</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {sessions.map((sess, idx) => {
            const accent  = ACCENTS[idx % ACCENTS.length];
            const d       = sess.extracted_data || {};
            const isOpen  = expanded === sess.id;
            const meds    = d.medications || [];
            const syms    = d.symptoms    || [];
            const isOn    = !!included[sess.id];

            return (
              <View key={sess.id} style={s.timelineItem}>
                {/* Vertical line */}
                {idx < sessions.length - 1 && <View style={[s.line, { backgroundColor: accent + '55' }]} />}

                {/* Dot */}
                <View style={[s.dot, { backgroundColor: accent, borderColor: isOn ? C.dark : 'transparent' }]} />

                {/* Card */}
                <View style={[s.card, isOn && s.cardActive]}>
                  {/* Top row */}
                  <TouchableOpacity
                    style={s.cardTop}
                    onPress={() => setExpanded(isOpen ? null : sess.id)}
                    activeOpacity={0.75}
                  >
                    <View style={s.cardTopLeft}>
                      <Text style={s.cardDate}>{fmt(sess.created_at)}</Text>
                      <Text style={s.cardDiag} numberOfLines={1}>
                        {d.diagnosis || 'Consultation'}
                      </Text>
                      {meds.length > 0 && (
                        <Text style={s.cardMedCount}>
                          {meds.length} medication{meds.length > 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                    <View style={s.cardTopRight}>
                      <Switch
                        value={isOn}
                        onValueChange={() => toggleInclude(sess)}
                        trackColor={{ false: C.bg, true: C.dark }}
                        thumbColor={isOn ? C.lime : C.muted}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={C.muted}
                        style={{ marginTop: 4 }}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded detail */}
                  {isOpen && (
                    <View style={s.cardExpanded}>
                      <View style={s.divider} />

                      {syms.length > 0 && (
                        <View style={s.detailBlock}>
                          <Text style={s.detailLabel}>SYMPTOMS</Text>
                          <View style={s.chipWrap}>
                            {syms.map((sym, i) => (
                              <View key={i} style={s.chip}>
                                <Text style={s.chipTxt}>{sym}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {meds.length > 0 && (
                        <View style={s.detailBlock}>
                          <Text style={s.detailLabel}>MEDICATIONS</Text>
                          {meds.map((med, i) => (
                            <View key={i} style={s.medRow}>
                              <View style={[s.medDot, { backgroundColor: accent }]} />
                              <View style={{ flex: 1 }}>
                                <Text style={s.medName}>
                                  {med.prescription_name && med.prescription_name !== med.name
                                    ? `${med.prescription_name} (${med.name})`
                                    : med.name}
                                </Text>
                                <Text style={s.medMeta}>
                                  {[
                                    med.dose_mg ? `${med.dose_mg}mg` : med.dosage,
                                    med.frequency,
                                    med.duration,
                                  ].filter(Boolean).join('  ·  ')}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {d.summary && (
                        <View style={s.detailBlock}>
                          <Text style={s.detailLabel}>SUMMARY</Text>
                          <Text style={s.summaryTxt}>{d.summary}</Text>
                        </View>
                      )}

                      {d.follow_up && (
                        <View style={s.detailBlock}>
                          <Text style={s.detailLabel}>FOLLOW-UP</Text>
                          <Text style={s.summaryTxt}>{d.follow_up}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  scroll:    { paddingHorizontal: 20, paddingTop: 16 },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  backBtn:      { width: 40, height: 40, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  headerSub:    { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 2 },
  doneBtn:      { backgroundColor: C.dark, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  doneTxt:      { fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.lime },

  hintBar:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 16, marginBottom: 8, backgroundColor: C.white, borderRadius: 14, padding: 12 },
  hintTxt:  { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, flex: 1, lineHeight: 17 },

  emptyTitle: { fontSize: 17, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.gray },
  emptySub:   { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted },

  // Timeline
  timelineItem: { flexDirection: 'row', marginBottom: 16, paddingLeft: 28 },
  line:         { position: 'absolute', left: 11, top: 22, bottom: -16, width: 2 },
  dot:          { position: 'absolute', left: 4, top: 14, width: 16, height: 16, borderRadius: 8, borderWidth: 2 },

  card:       { flex: 1, backgroundColor: C.white, borderRadius: 18, overflow: 'hidden' },
  cardActive: { borderWidth: 2, borderColor: C.dark },

  cardTop:      { flexDirection: 'row', padding: 14, alignItems: 'flex-start' },
  cardTopLeft:  { flex: 1, gap: 3 },
  cardTopRight: { flexDirection: 'column', alignItems: 'center', gap: 2, paddingLeft: 8 },
  cardDate:     { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted },
  cardDiag:     { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  cardMedCount: { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray },

  cardExpanded: { paddingHorizontal: 14, paddingBottom: 14 },
  divider:      { height: 1, backgroundColor: C.bg, marginBottom: 12 },

  detailBlock: { marginBottom: 12 },
  detailLabel: { fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', color: C.muted, letterSpacing: 0.8, marginBottom: 6 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:     { backgroundColor: C.bg, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5 },
  chipTxt:  { fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium', color: C.dark },

  medRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  medDot:  { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  medName: { fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
  medMeta: { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 2 },

  summaryTxt: { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, lineHeight: 19 },
});
