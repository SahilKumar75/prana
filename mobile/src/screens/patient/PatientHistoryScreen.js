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
import { api } from '../../lib/api';
import { useRole } from '../../context/RoleContext';

const ACCENT = ['#FBBF24', '#B6CAEB', '#9AAB63', '#F5D867'];

const C = {
  bg:    '#f2f3f5',
  white: '#ffffff',
  dark:  '#202020',
  pink:  '#FBBF24',
  gray:  '#888888',
  muted: '#bbbbbe',
};

export default function PatientHistoryScreen({ navigation }) {
  const { profile } = useRole();
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
  });
  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline,    setOffline]    = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    if (!profile?.id) return;
    setOffline(false);
    try {
      const data = await api.getPatientSessions(profile.patientDbId || profile.id);
      setSessions(data);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }).start();
    }
  };

  useEffect(() => { loadData(); }, [profile?.id]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const fmt = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const isFollowUp = (item) => item.extracted_data?.follow_up_required === true;
  const isDone     = (item) => item.status === 'processed';

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={C.pink} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[{ flex: 1 }, { opacity: fade }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.pink} />}
          contentContainerStyle={styles.scroll}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.pageTitle}>My Visits</Text>
            <View style={[styles.countBadge, { backgroundColor: C.pink }]}>
              <Text style={styles.countBadgeText}>{sessions.length}</Text>
            </View>
          </View>

          {/* OFFLINE BANNER */}
          {offline && (
            <TouchableOpacity
              style={styles.offlineBanner}
              onPress={() => { setLoading(true); loadData(); }}
              activeOpacity={0.8}
            >
              <Ionicons name="wifi-outline" size={14} color="#92400e" />
              <Text style={styles.offlineBannerText}>Offline — tap to retry</Text>
            </TouchableOpacity>
          )}

          {/* SESSION LIST */}
          {sessions.length > 0 ? (
            <>
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>All visits</Text>
                <Text style={styles.listHeaderTotal}>{sessions.length} total</Text>
              </View>
              <View style={styles.card}>
                {sessions.map((item, index) => {
                  const isFollowUpItem = isFollowUp(item);
                  const isDoneItem     = isDone(item);
                  const accent   = isFollowUpItem ? '#ef4444' : isDoneItem ? '#22c55e' : '#d1d5db';
                  const lang     = (item.language || 'hi-IN').split('-')[0].toUpperCase();
                  const isLast   = index === sessions.length - 1;
                  const d        = item.extracted_data || {};
                  const label    = d.diagnosis || 'Consultation';
                  const topMed   = d.medications?.[0];
                  const medLabel = topMed
                    ? `${topMed.name}${topMed.dose_mg ? ' ' + topMed.dose_mg + 'mg' : topMed.dosage ? ' ' + topMed.dosage : ''}`
                    : null;
                  return (
                    <TouchableOpacity
                      key={String(item.id)}
                      style={[styles.row, !isLast && styles.rowBorder]}
                      onPress={() => navigation.navigate('SessionDetail', { session: item, accent, isPatient: true })}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.rowAccent, { backgroundColor: accent }]} />
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle}>{label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                          {medLabel ? (
                            <View style={[styles.medChip, { backgroundColor: accent + '33' }]}>
                              <Text style={[styles.medChipTxt, { color: '#1A1A1A' }]}>{medLabel}</Text>
                            </View>
                          ) : null}
                          <Text style={styles.rowDate}>{fmt(item.created_at)}</Text>
                        </View>
                      </View>
                      <View style={styles.rowRight}>
                        {isFollowUp(item) ? (
                          <View style={styles.tagFollowUp}>
                            <Ionicons name="calendar-outline" size={11} color="#b91c1c" />
                            <Text style={styles.tagFollowUpTxt}>Follow-up</Text>
                          </View>
                        ) : isDone(item) ? (
                          <View style={styles.tagDone}>
                            <Ionicons name="checkmark-circle-outline" size={11} color="#166534" />
                            <Text style={styles.tagDoneTxt}>Done</Text>
                          </View>
                        ) : (
                          <View style={styles.tagPending}>
                            <Text style={styles.tagPendingTxt}>Pending</Text>
                          </View>
                        )}
                        <Ionicons name="chevron-forward" size={16} color={C.muted} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={40} color={C.muted} />
              <Text style={styles.emptyTitle}>No visits yet</Text>
              <Text style={styles.emptyDesc}>Your completed consultations will appear here</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:     { paddingHorizontal: 20, paddingTop: 12 },

  header:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  pageTitle:       { fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  countBadge:      { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  countBadgeText:  { fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },

  offlineBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  offlineBannerText: { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: '#92400e', flex: 1 },

  listHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listHeaderText:  { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
  listHeaderTotal: { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray },

  card:      { backgroundColor: C.white, borderRadius: 22, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.bg },
  rowAccent: { width: 4, height: 40, borderRadius: 2, marginHorizontal: 14 },
  rowBody:   { flex: 1 },
  rowTitle:  { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
  rowDate:   { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted, marginTop: 3 },
  rowRight:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagDone:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  tagDoneTxt:     { fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#166534' },
  tagFollowUp:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  tagFollowUpTxt: { fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#b91c1c' },
  tagPending:     { backgroundColor: '#fef9c3', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  tagPendingTxt:  { fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#854d0e' },

  medChip:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  medChipTxt: { fontSize: 10, fontFamily: 'SpaceGrotesk_600SemiBold' },

  empty:      { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.gray },
  emptyDesc:  { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted, textAlign: 'center' },
});
