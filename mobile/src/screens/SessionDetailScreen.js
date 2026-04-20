import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
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

const statusColor = (s) => ({ processed: '#3a6e00', error: '#c0392b', pending: '#7a5c00' }[s] || C.gray);
const statusBg    = (s) => ({ processed: C.lime,    error: '#fce8e6',  pending: '#fff8e1' }[s] || C.bg);
const statusLabel = (s) => ({ processed: 'Processed', error: 'Error', pending: 'Pending' }[s] || s || 'Pending');

const fmt = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export default function SessionDetailScreen({ route, navigation }) {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const { session } = route.params;
  const d = session.extracted_data || session.processed_data || {};

  const symptoms    = d.symptoms     || [];
  const medications = d.medications  || [];
  const missing     = d.missing_info || [];
  const vitals      = d.vitals       || {};

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* BACK */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={18} color={C.dark} />
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>

        {/* TITLE ROW */}
        <View style={s.titleRow}>
          <Text style={s.pageTitle}>Session Detail</Text>
          <View style={[s.statusBadge, { backgroundColor: statusBg(session.status) }]}>
            <Text style={[s.statusText, { color: statusColor(session.status) }]}>{statusLabel(session.status)}</Text>
          </View>
        </View>

        {/* META */}
        <View style={s.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={C.muted} />
          <Text style={s.metaText}>{fmt(session.created_at)}</Text>
          {(session.detected_language || session.language) && (
            <>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.metaText}>{(session.detected_language || session.language).toUpperCase()}</Text>
            </>
          )}
          {session.duration_seconds && (
            <>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.metaText}>{Math.round(session.duration_seconds)} sec</Text>
            </>
          )}
        </View>

        {/* SUMMARY CARD */}
        {d.summary && (
          <View style={s.summaryCard}>
            <Text style={s.summaryText}>{d.summary}</Text>
          </View>
        )}

        {/* PATIENT + SEVERITY */}
        {(session.patient_name || d.patient_name) && (
          <InfoRow icon="person-outline" label="Patient" value={session.patient_name || d.patient_name} />
        )}
        {session.patient_id && (
          <InfoRow icon="card-outline" label="Patient ID" value={session.patient_id} />
        )}
        {d.severity && (
          <InfoRow
            icon="pulse-outline"
            label="Severity"
            value={d.severity.toUpperCase()}
            valueColor={d.severity === 'severe' ? C.red : d.severity === 'moderate' ? '#c09a1a' : '#3a6e00'}
          />
        )}

        {/* SYMPTOMS */}
        {symptoms.length > 0 && (
          <Section icon="thermometer-outline" title="Symptoms">
            <View style={s.chipWrap}>
              {symptoms.map((sym, i) => (
                <View key={i} style={s.chip}><Text style={s.chipText}>{sym}</Text></View>
              ))}
            </View>
          </Section>
        )}

        {/* DURATION */}
        {d.symptom_duration && (
          <InfoRow icon="hourglass-outline" label="Duration" value={d.symptom_duration} />
        )}

        {/* DIAGNOSIS */}
        {d.diagnosis && (
          <InfoRow icon="medkit-outline" label="Diagnosis" value={d.diagnosis} bold />
        )}

        {/* MEDICATIONS */}
        {medications.length > 0 && (
          <Section icon="flask-outline" title="Medications">
            {medications.map((med, i) => (
              <View key={i} style={s.medCard}>
                <View style={s.medName}>
                  <Ionicons name="ellipse" size={6} color={C.dark} style={{ marginTop: 5 }} />
                  <Text style={s.medNameText}>{med.name}</Text>
                </View>
                {(med.dosage || med.frequency) && (
                  <Text style={s.medDetail}>{[med.dosage, med.frequency].filter(Boolean).join('  ·  ')}</Text>
                )}
              </View>
            ))}
          </Section>
        )}

        {/* VITALS */}
        {Object.values(vitals).some(Boolean) && (
          <Section icon="heart-outline" title="Vitals">
            <View style={s.vitalsGrid}>
              {vitals.bp    && <VitalTile label="Blood Pressure" value={vitals.bp}    icon="fitness-outline"   />}
              {vitals.temp  && <VitalTile label="Temperature"    value={vitals.temp}  icon="thermometer-outline" />}
              {vitals.pulse && <VitalTile label="Pulse"          value={vitals.pulse} icon="pulse-outline"     />}
              {vitals.spo2  && <VitalTile label="SpO₂"           value={vitals.spo2}  icon="water-outline"     />}
            </View>
          </Section>
        )}

        {/* ALLERGIES */}
        {(d.allergies || []).length > 0 && (
          <Section icon="alert-circle-outline" title="Allergies">
            <View style={s.chipWrap}>
              {d.allergies.map((a, i) => (
                <View key={i} style={[s.chip, { backgroundColor: '#fce8e6' }]}>
                  <Text style={[s.chipText, { color: '#c0392b' }]}>{a}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* FOLLOW UP */}
        {d.follow_up && (
          <InfoRow icon="calendar-outline" label="Follow-up" value={d.follow_up} />
        )}

        {/* DOCTOR ASSIST — MISSING INFO */}
        {missing.length > 0 && (
          <View style={s.missingCard}>
            <View style={s.missingHeader}>
              <Ionicons name="warning-outline" size={16} color={C.warnB} />
              <Text style={s.missingTitle}>Doctor Assist — Missing Information</Text>
            </View>
            {missing.map((item, i) => (
              <View key={i} style={s.missingRow}>
                <Ionicons name="alert-circle-outline" size={14} color={C.warnB} />
                <Text style={s.missingText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* RAW TRANSCRIPT */}
        {session.raw_transcript && (
          <View style={s.transcriptCard}>
            <Text style={s.transcriptLabel}>Raw Transcript</Text>
            <Text style={s.transcriptText}>{session.raw_transcript}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <View style={s.sectionCard}>
      <View style={s.sectionHeader}>
        <Ionicons name={icon} size={15} color={C.gray} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value, bold, valueColor }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={16} color={C.muted} style={{ width: 24 }} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, bold && { fontFamily: 'SpaceGrotesk_700Bold' }, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

function VitalTile({ label, value, icon }) {
  return (
    <View style={s.vitalTile}>
      <Ionicons name={icon} size={18} color={C.gray} />
      <Text style={s.vitalValue}>{value}</Text>
      <Text style={s.vitalLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { paddingHorizontal: 20, paddingTop: 12 },

  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText:  { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },

  titleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pageTitle:   { fontSize: 26, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, letterSpacing: -0.5 },
  statusBadge: { borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5 },
  statusText:  { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },

  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  metaText: { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted },
  metaDot:  { fontSize: 12, color: C.muted },

  summaryCard: { backgroundColor: C.dark, borderRadius: 20, padding: 18, marginBottom: 12 },
  summaryText: { fontSize: 15, fontFamily: 'SpaceGrotesk_400Regular', color: C.white, lineHeight: 22 },

  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 8 },
  infoLabel: { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.muted, width: 88 },
  infoValue: { flex: 1, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },

  sectionCard:   { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 8, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:  { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', color: C.gray, textTransform: 'uppercase', letterSpacing: 0.8 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { backgroundColor: C.bg, borderRadius: 50, paddingHorizontal: 13, paddingVertical: 6 },
  chipText: { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.dark },

  medCard:     { gap: 3 },
  medName:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  medNameText: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, flex: 1 },
  medDetail:   { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, paddingLeft: 16, marginTop: 2 },

  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vitalTile:  { flex: 1, minWidth: 80, backgroundColor: C.bg, borderRadius: 14, padding: 14, alignItems: 'center', gap: 5 },
  vitalValue: { fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  vitalLabel: { fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray, textAlign: 'center' },

  missingCard:  { backgroundColor: C.warn, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#fcd34d', gap: 8, marginBottom: 8 },
  missingHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  missingTitle: { fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', color: '#92400e', flex: 1 },
  missingRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  missingText:  { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: '#92400e', flex: 1, lineHeight: 19 },

  transcriptCard:  { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 8 },
  transcriptLabel: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', color: C.gray, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  transcriptText:  { fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, lineHeight: 22 },
});
