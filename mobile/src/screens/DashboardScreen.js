import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Modal, Alert, RefreshControl,
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
import { useRole } from '../context/RoleContext';

const C = {
  bg:    '#f2f3f5',
  white: '#ffffff',
  dark:  '#202020',
  lime:  '#c9f158',
  pink:  '#F5B8DB',
  gray:  '#888888',
  muted: '#bbbbbe',
};

const DUMMY_SESSIONS = [
  { id: 'd1', language: 'Patient Consultation', created_at: new Date(Date.now() - 1*60*60*1000).toISOString(), status: 'processed', icon: 'person-outline',        lang: 'hi-IN', duration: '4 min' },
  { id: 'd2', language: 'Follow-up Note',       created_at: new Date(Date.now() - 3*60*60*1000).toISOString(), status: 'processed', icon: 'document-text-outline', lang: 'en-IN', duration: '2 min' },
  { id: 'd3', language: 'Discharge Summary',    created_at: new Date(Date.now() - 6*60*60*1000).toISOString(), status: 'pending',   icon: 'clipboard-outline',     lang: 'hi-IN', duration: '7 min' },
];

const statusMeta = {
  processed: { color: '#3a6e00', bg: '#c9f158' },
  error:     { color: '#c0392b', bg: '#fce8e6' },
  pending:   { color: '#7a5c00', bg: '#fff8e1' },
};

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const STATUS_BADGE = {
  accepted:  { label: 'Accepted',  bg: C.lime,     color: '#3a6e00' },
  declined:  { label: 'Declined',  bg: '#fce8e6',  color: '#c0392b' },
  completed: { label: 'Completed', bg: '#e8f4ff',  color: '#1a6fa0' },
};

function RequestRow({ req, onAccept, onDecline, accepting }) {
  const name   = req.patient?.name || 'Unknown Patient';
  const time   = fmtTime(req.created_at);
  const date   = fmtDate(req.created_at);
  const isPending = req.status === 'pending';
  const badge  = STATUS_BADGE[req.status];
  return (
    <View style={rr.row}>
      <View style={rr.avatar}>
        <Text style={rr.avatarTxt}>{name[0]}</Text>
      </View>
      <View style={rr.body}>
        <Text style={rr.name}>{name}</Text>
        <Text style={rr.time}>{date} · {time}</Text>
      </View>
      <View style={rr.actions}>
        {isPending ? (
          accepting === req.id ? (
            <ActivityIndicator size="small" color={C.dark} />
          ) : (
            <>
              <TouchableOpacity style={rr.acceptBtn} onPress={() => onAccept(req)} activeOpacity={0.8}>
                <Ionicons name="checkmark-outline" size={15} color="#3a6e00" />
                <Text style={rr.acceptTxt}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={rr.declineBtn} onPress={() => onDecline(req)} activeOpacity={0.8}>
                <Ionicons name="close-outline" size={15} color="#c0392b" />
              </TouchableOpacity>
            </>
          )
        ) : badge ? (
          <View style={[rr.badgePill, { backgroundColor: badge.bg }]}>
            <Text style={[rr.badgeTxt, { color: badge.color }]}>{badge.label}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const rr = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.bg, gap: 10 },
  avatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  body:      { flex: 1 },
  name:      { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
  time:      { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 2 },
  actions:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.lime, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 7 },
  acceptTxt: { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#3a6e00' },
  declineBtn:{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#fce8e6', alignItems: 'center', justifyContent: 'center' },
  badgePill: { borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  badgeTxt:  { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
});

function PatientCard({ req, onPress }) {
  const name = req.patient?.name || 'Patient';
  const date = fmtDate(req.created_at);
  const time = fmtTime(req.created_at);
  return (
    <TouchableOpacity style={pc.card} onPress={onPress} activeOpacity={0.85}>
      <View style={pc.top}>
        <Text style={pc.logo}>P.</Text>
        <View style={pc.statusDot} />
      </View>
      <Text style={pc.name}>{name}</Text>
      <Text style={pc.meta}>{date} . {time}</Text>
      <View style={pc.startBtn}>
        <Text style={pc.startTxt}>Start session</Text>
        <Ionicons name="arrow-forward" size={12} color={C.dark} />
      </View>
    </TouchableOpacity>
  );
}

const pc = StyleSheet.create({
  card:     { width: 200, height: 170, borderRadius: 26, padding: 20, backgroundColor: C.pink, overflow: 'hidden', justifyContent: 'space-between', marginRight: 14 },
  top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo:     { fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  statusDot:{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' },
  name:     { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, flexShrink: 1 },
  meta:     { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, opacity: 0.7 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  startTxt: { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
});

export default function DashboardScreen({ navigation }) {
  const { profile } = useRole();
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
  });

  const [sessions,         setSessions]         = useState([]);
  const [stats,            setStats]            = useState({ total: 0, processed: 0 });
  const [loading,          setLoading]          = useState(true);
  const [offline,          setOffline]          = useState(false);
  const [pendingRequests,  setPendingRequests]  = useState([]);
  const [allRequests,      setAllRequests]      = useState([]);
  const [acceptedPatients, setAcceptedPatients] = useState([]);
  const [bellOpen,         setBellOpen]         = useState(false);
  const [accepting,        setAccepting]        = useState(null);
  const [refreshing,       setRefreshing]       = useState(false);

  const doctorId = profile?.id;

  const loadData = useCallback(async () => {
    try {
      const calls = [api.getSessions(), api.getStats()];
      if (doctorId) {
        calls.push(api.getPendingRequests(doctorId));
        calls.push(api.getAcceptedPatients(doctorId));
        calls.push(api.getAllRequests(doctorId));
      }
      const [s, st, pending, accepted, all] = await Promise.all(calls);
      setSessions(s);
      setStats(st);
      if (pending)  setPendingRequests(pending);
      if (accepted) setAcceptedPatients(accepted);
      if (all)      setAllRequests(all);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  // Load on mount
  useEffect(() => { loadData(); }, [loadData]);

  // Reload whenever screen comes into focus
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Poll every 10s for new requests while screen is mounted
  useEffect(() => {
    const timer = setInterval(() => {
      if (!doctorId) return;
      api.getPendingRequests(doctorId).then(setPendingRequests).catch(() => {});
      api.getAllRequests(doctorId).then(setAllRequests).catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [doctorId]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const handleAccept = async (req) => {
    setAccepting(req.id);
    try {
      await api.acceptRequest(req.id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
      setAcceptedPatients((prev) => [...prev, { ...req, status: 'accepted' }]);
      setAllRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'accepted' } : r));
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not accept request');
    } finally {
      setAccepting(null);
    }
  };

  const handleDecline = async (req) => {
    try {
      await api.declineRequest(req.id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
      setAllRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'declined' } : r));
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not decline request');
    }
  };

  const handleStartSession = (req) => {
    setBellOpen(false);
    navigation.navigate('Record', {
      patientProfile:   req.patient,
      sessionRequestId: req.id,
      doctorProfile:    profile,
    });
  };

  if (!fontsLoaded) return null;

  const recentSessions = sessions.slice(0, 4);
  const pendingCount   = pendingRequests.length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      <Modal visible={bellOpen} animationType="slide" transparent onRequestClose={() => setBellOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Patient Requests</Text>
              <TouchableOpacity onPress={() => setBellOpen(false)} activeOpacity={0.7}>
                <Ionicons name="close-outline" size={24} color={C.dark} />
              </TouchableOpacity>
            </View>
            {allRequests.length === 0 ? (
              <View style={s.modalEmpty}>
                <Ionicons name="notifications-outline" size={36} color={C.muted} />
                <Text style={s.modalEmptyTxt}>No requests yet</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {pendingRequests.length > 0 && (
                  <Text style={s.modalSectionLabel}>Pending</Text>
                )}
                {allRequests.map((req) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    accepting={accepting}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData().finally(() => setRefreshing(false)); }}
            tintColor={C.gray}
          />
        }
      >

        <View style={s.header}>
          <View>
            <Text style={s.name}>{greeting}, {profile?.name?.split(' ')[1] || 'Doctor'}</Text>
            <Text style={s.greeting}>Welcome to Prana</Text>
          </View>
          <TouchableOpacity style={s.bellBtn} activeOpacity={0.7} onPress={() => setBellOpen(true)}>
            <Ionicons name="notifications-outline" size={22} color={C.dark} />
            {pendingCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {offline && (
          <TouchableOpacity style={s.offlineBanner} onPress={() => { setLoading(true); loadData(); }} activeOpacity={0.8}>
            <Ionicons name="wifi-outline" size={16} color="#92400e" />
            <Text style={s.offlineTxt}>Backend offline - tap to retry</Text>
          </TouchableOpacity>
        )}

        <View style={s.heroCard}>
          <Text style={s.heroLabel}>Your sessions</Text>
          <View style={s.heroRow}>
            <Text style={s.heroCount}>{loading ? '-' : stats.total}</Text>
          </View>
          <TouchableOpacity style={s.startBtn} activeOpacity={0.85} onPress={() => navigation.navigate('Record', { patientProfile: undefined, doctorProfile: undefined, sessionRequestId: undefined })}>
            <Text style={s.startTxt}>Start recording</Text>
          </TouchableOpacity>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Onboarded patients</Text>
          <Text style={s.sectionCount}>{acceptedPatients.length}</Text>
        </View>

        {acceptedPatients.length === 0 ? (
          <View style={s.emptyPatients}>
            <Ionicons name="person-add-outline" size={22} color={C.muted} />
            <Text style={s.emptyPatientsTxt}>No patients yet - accept requests from the bell</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.patientsScroll} style={s.patientsScrollWrap}>
            {acceptedPatients.map((req) => (
              <PatientCard key={req.id} req={req} onPress={() => handleStartSession(req)} />
            ))}
            <TouchableOpacity style={[pc.card, { backgroundColor: C.dark }]} activeOpacity={0.85} onPress={() => navigation.navigate('Record', { patientProfile: undefined, doctorProfile: undefined, sessionRequestId: undefined })}>
              <View style={pc.top}>
                <Text style={[pc.logo, { color: C.white }]}>P.</Text>
                <Ionicons name="mic-outline" size={20} color={C.white} />
              </View>
              <Text style={[pc.name, { color: C.white }]}>Quick note</Text>
              <Text style={[pc.meta, { color: C.muted }]}>No patient</Text>
              <View style={[pc.startBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                <Text style={[pc.startTxt, { color: C.white }]}>Record now</Text>
                <Ionicons name="arrow-forward" size={12} color={C.white} />
              </View>
            </TouchableOpacity>
          </ScrollView>
        )}

        <View style={s.txCard}>
          <View style={s.txCardHeader}>
            <Text style={s.txCardTitle}>Recent sessions</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('History')}>
              <Text style={s.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={s.txEmptyRow}>
              <ActivityIndicator size="small" color={C.muted} />
              <Text style={{ fontSize: 13, color: C.muted, fontFamily: 'SpaceGrotesk_400Regular' }}>Loading...</Text>
            </View>
          ) : (
            (recentSessions.length > 0 ? recentSessions : DUMMY_SESSIONS).map((sess, i, arr) => {
              const meta   = statusMeta[sess.status] || statusMeta.pending;
              const isLast = i === arr.length - 1;
              return (
                <TouchableOpacity
                  key={sess.id}
                  style={[s.txRow, !isLast && s.txBorder]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('SessionDetail', { session: sess })}
                >
                  <View style={s.txIcon}>
                    <Ionicons name={sess.icon || 'mic-outline'} size={22} color={C.dark} />
                  </View>
                  <View style={s.txBody}>
                    <Text style={s.txName}>{sess.language || 'Voice Note'}</Text>
                    <Text style={s.txTime}>{fmtTime(sess.created_at)}</Text>
                  </View>
                  <View style={s.txRight}>
                    <Text style={s.txDuration}>{sess.duration || '3 min'}</Text>
                    <View style={[s.cashPill, { backgroundColor: meta.bg }]}>
                      <Text style={[s.cashTxt, { color: meta.color }]}>{sess.lang || 'hi-IN'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 130 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { paddingHorizontal: 20, paddingTop: 12 },

  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  name:      { fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  greeting:  { fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 3 },
  bellBtn:   { width: 44, height: 44, borderRadius: 14, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  badge:     { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#e57373', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  badgeTxt:  { fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', color: '#fff' },

  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  offlineTxt:    { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: '#92400e', flex: 1 },

  heroCard:  { backgroundColor: C.lime, borderRadius: 24, padding: 22, marginBottom: 24 },
  heroLabel: { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: 'rgba(32,32,32,0.6)', marginBottom: 6 },
  heroRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  heroCount: { fontSize: 48, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, letterSpacing: -2 },
  startBtn:  { backgroundColor: C.dark, borderRadius: 50, paddingVertical: 15, alignItems: 'center' },
  startTxt:  { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.lime },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  sectionCount:  { fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', color: C.gray },
  seeAll:        { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray },

  emptyPatients:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24 },
  emptyPatientsTxt: { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, flex: 1 },

  patientsScrollWrap: { marginHorizontal: -20, marginBottom: 24 },
  patientsScroll:     { paddingHorizontal: 20, paddingBottom: 4 },

  txCard:       { backgroundColor: C.white, borderRadius: 22, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, marginBottom: 8 },
  txCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  txCardTitle:  { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  txRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  txBorder:   { borderBottomWidth: 1, borderBottomColor: C.bg },
  txIcon:     { width: 46, height: 46, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  txBody:     { flex: 1 },
  txName:     { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  txTime:     { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted, marginTop: 2 },
  txRight:    { alignItems: 'flex-end', gap: 6 },
  txDuration: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  cashPill:   { backgroundColor: C.lime, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  cashTxt:    { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', color: '#3a6e00' },
  txEmptyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 10, maxHeight: '70%' },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: C.muted, alignSelf: 'center', marginBottom: 16 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  modalEmpty:   { alignItems: 'center', paddingVertical: 32, gap: 8 },
  modalEmptyTxt:{ fontSize: 15, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray },
  modalSectionLabel: { fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 4 },
});
