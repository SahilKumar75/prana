import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, Animated, TouchableOpacity,
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
  gray:  '#888888',
  muted: '#bbbbbe',
};
const ACCENT = ['#FBBF24', '#9AAB63', '#B6CAEB', '#F5D867'];
const FILTERS = [
  { key: 'all',      label: 'All'       },
  { key: 'done',     label: 'Completed' },
  { key: 'followup', label: 'Follow-up' },
];

export default function HistoryScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular, SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
  });
  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline,    setOffline]    = useState(false);
  const [filter,     setFilter]     = useState('all');
  const fade = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    setOffline(false);
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }).start();
    }
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const fmt = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const isFollowUp = (item) => item.extracted_data?.follow_up_required === true;
  const isDone     = (item) => item.status === 'processed';

  const filtered = sessions.filter(item => {
    if (filter === 'done')     return isDone(item) && !isFollowUp(item);
    if (filter === 'followup') return isFollowUp(item);
    return true;
  });

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color="#FBBF24" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Animated.View style={[{ flex: 1 }, { opacity: fade }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FBBF24" />}
          contentContainerStyle={s.scroll}
        >
          {/* HEADER */}
          <View style={s.header}>
            <Text style={s.pageTitle}>Sessions</Text>
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{filtered.length}</Text>
            </View>
          </View>

          {/* FILTER PILLS */}
          <View style={s.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[s.filterPill, filter === f.key && s.filterPillActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.75}
              >
                {f.key === 'done' && (
                  <View style={[s.filterDot, filter === f.key ? s.dotGreen : s.dotMuted]} />
                )}
                {f.key === 'followup' && (
                  <View style={[s.filterDot, filter === f.key ? s.dotRed : s.dotMuted]} />
                )}
                <Text style={[s.filterPillTxt, filter === f.key && s.filterPillTxtActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* OFFLINE BANNER */}
          {offline && (
            <TouchableOpacity
              style={s.offlineBanner}
              onPress={() => { setLoading(true); loadData(); }}
              activeOpacity={0.8}
            >
              <Ionicons name="wifi-outline" size={14} color="#92400e" />
              <Text style={s.offlineBannerText}>Offline — tap to retry</Text>
            </TouchableOpacity>
          )}

          {/* SESSION LIST */}
          {filtered.length > 0 ? (
            <View style={s.card}>
              {filtered.map((item, index) => {
                const isLast    = index === filtered.length - 1;
                const d         = item.extracted_data || {};
                const patient   = item.patient_name || d.patient_name || 'Anonymous';
                const diagnosis = d.diagnosis || 'Consultation';
                const fu        = isFollowUp(item);
                const done      = isDone(item);
                const accent    = fu ? '#ef4444' : done ? '#22c55e' : '#d1d5db';
                const topMed    = d.medications?.[0];
                const medLabel  = topMed
                  ? `${topMed.name}${topMed.dose_mg ? ' ' + topMed.dose_mg + 'mg' : topMed.dosage ? ' ' + topMed.dosage : ''}`
                  : null;

                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={[s.row, !isLast && s.rowBorder]}
                    onPress={() => navigation.navigate('SessionDetail', { session: item, accent })}
                    activeOpacity={0.7}
                  >
                    {/* coloured accent bar */}
                    <View style={[s.rowAccentBar, { backgroundColor: accent }]} />

                    {/* body */}
                    <View style={s.rowBody}>
                      <View style={s.rowTopRow}>
                        <Ionicons name="person-outline" size={12} color={C.muted} />
                        <Text style={s.rowPatient} numberOfLines={1}>{patient}</Text>
                      </View>
                      <Text style={s.rowDiagnosis} numberOfLines={1}>{diagnosis}</Text>
                      <View style={s.rowMetaRow}>
                        {medLabel ? (
                          <View style={[s.medChip, { backgroundColor: accent + '33' }]}>
                            <Text style={s.medChipTxt}>{medLabel}</Text>
                          </View>
                        ) : null}
                        <Text style={s.rowDate}>{fmt(item.created_at)}</Text>
                      </View>
                    </View>

                    {/* status tag */}
                    <View style={s.rowRight}>
                      {fu ? (
                        <View style={s.tagFollowUp}>
                          <Ionicons name="calendar-outline" size={11} color="#b91c1c" />
                          <Text style={s.tagFollowUpTxt}>Follow-up</Text>
                        </View>
                      ) : done ? (
                        <View style={s.tagDone}>
                          <Ionicons name="checkmark-circle-outline" size={11} color="#166534" />
                          <Text style={s.tagDoneTxt}>Done</Text>
                        </View>
                      ) : (
                        <View style={s.tagPending}>
                          <Text style={s.tagPendingTxt}>Pending</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={14} color={C.muted} style={{ marginTop: 5 }} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={s.emptyWrap}>
              <Ionicons name="document-text-outline" size={36} color={C.muted} />
              <Text style={s.emptyTitle}>
                {filter === 'followup' ? 'No follow-up sessions' : filter === 'done' ? 'No completed sessions' : 'No sessions yet'}
              </Text>
              <Text style={s.emptySub}>
                {filter === 'all' ? 'Your recordings will appear here' : 'Try a different filter'}
              </Text>
            </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:    { paddingHorizontal: 20, paddingTop: 16 },

  header:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  pageTitle:      { fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  countBadge:     { backgroundColor: C.dark, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 50 },
  countBadgeText: { color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },

  filterRow:            { flexDirection: 'row', gap: 8, marginBottom: 18 },
  filterPill:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50, backgroundColor: C.white },
  filterPillActive:     { backgroundColor: C.dark },
  filterPillTxt:        { fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.gray },
  filterPillTxtActive:  { color: C.white },
  filterDot:            { width: 7, height: 7, borderRadius: 4 },
  dotGreen:             { backgroundColor: '#4ade80' },
  dotRed:               { backgroundColor: '#f87171' },
  dotMuted:             { backgroundColor: C.muted },

  offlineBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  offlineBannerText: { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: '#92400e', flex: 1 },

  card:          { backgroundColor: C.white, borderRadius: 22, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, marginBottom: 16 },
  row:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 14 },
  rowBorder:     { borderBottomWidth: 1, borderBottomColor: C.bg },
  rowAccentBar:  { width: 4, borderRadius: 2, alignSelf: 'stretch', marginHorizontal: 12 },
  rowBody:       { flex: 1, gap: 3 },

  rowTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowPatient:   { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, flex: 1 },
  rowDiagnosis: { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray },
  rowMetaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  rowDate:      { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted },

  rowRight:  { alignItems: 'flex-end', gap: 4, paddingLeft: 8 },

  tagDone:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  tagDoneTxt:    { fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#166534' },
  tagFollowUp:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  tagFollowUpTxt:{ fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#b91c1c' },
  tagPending:    { backgroundColor: '#fef9c3', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  tagPendingTxt: { fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#854d0e' },

  medChip:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  medChipTxt: { fontSize: 10, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },

  emptyWrap:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.gray },
  emptySub:   { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted, textAlign: 'center' },
});
