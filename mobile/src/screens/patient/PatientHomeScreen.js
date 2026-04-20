import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl, Alert, Modal,
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

const C = {
  bg:    '#f2f3f5',
  white: '#ffffff',
  dark:  '#202020',
  pink:  '#FBBF24',
  teal:  '#B6CAEB',
  lime:  '#c9f158',
  gray:  '#888888',
  muted: '#bbbbbe',
};

const SPECIALTY_ICONS = {
  'General Medicine': 'medkit-outline',
  'Pediatrics':       'happy-outline',
  'Cardiology':       'heart-outline',
  'Orthopedics':      'body-outline',
};

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const hour = new Date().getHours();
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

// ─── Doctor card ──────────────────────────────────────────────────────────────
function DoctorCard({ doctor, requestStatus, onRequest }) {
  const icon    = SPECIALTY_ICONS[doctor.specialty] || 'person-outline';
  const isReq   = requestStatus === 'pending';
  const isAccpt = requestStatus === 'accepted';

  return (
    <View style={dc.card}>
      <View style={dc.iconWrap}>
        <Ionicons name={icon} size={28} color={C.dark} />
      </View>
      <Text style={dc.name}>{doctor.name}</Text>
      <Text style={dc.specialty}>{doctor.specialty || 'General'}</Text>

      <View style={dc.statusRow}>
        <View style={[dc.onlineDot, !doctor.is_available && dc.offlineDot]} />
        <Text style={dc.onlineTxt}>{doctor.is_available ? 'Available' : 'Busy'}</Text>
      </View>

      {isAccpt ? (
        <View style={[dc.btn, dc.btnAccepted]}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#3a6e00" />
          <Text style={[dc.btnTxt, { color: '#3a6e00' }]}>Accepted</Text>
        </View>
      ) : isReq ? (
        <View style={[dc.btn, dc.btnPending]}>
          <ActivityIndicator size={12} color="#7a5c00" />
          <Text style={[dc.btnTxt, { color: '#7a5c00' }]}>Requested</Text>
        </View>
      ) : (
        <TouchableOpacity style={[dc.btn, dc.btnRequest]} onPress={() => onRequest(doctor)} activeOpacity={0.8}>
          <Ionicons name="add-outline" size={14} color={C.dark} />
          <Text style={dc.btnTxt}>Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const dc = StyleSheet.create({
  card:       { width: 160, backgroundColor: C.white, borderRadius: 22, padding: 16, marginRight: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  iconWrap:   { width: 52, height: 52, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  name:       { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, lineHeight: 20 },
  specialty:  { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 2, marginBottom: 8 },
  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  onlineDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50' },
  offlineDot: { backgroundColor: '#bbbbbe' },
  onlineTxt:  { fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray },
  btn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 50, paddingVertical: 8 },
  btnRequest: { backgroundColor: C.pink },
  btnPending: { backgroundColor: '#fff8e1', borderWidth: 1, borderColor: '#f59e0b' },
  btnAccepted:{ backgroundColor: C.lime },
  btnTxt:     { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
});

// ─── Past visit card ──────────────────────────────────────────────────────────
function VisitCard({ session, onPress, accent }) {
  const d         = session.extracted_data || {};
  const diagnosis = d.diagnosis || 'Consultation';
  const date      = fmtDate(session.created_at);
  const time      = fmtTime(session.created_at);
  const lang      = (session.language || 'hi-IN').split('-')[0].toUpperCase();
  return (
    <TouchableOpacity style={[vc.card, { borderLeftColor: accent }]} onPress={onPress} activeOpacity={0.8}>
      <View style={vc.top}>
        <View style={[vc.dot, { backgroundColor: accent }]} />
        <Text style={vc.diagnosis}>{diagnosis}</Text>
      </View>
      <Text style={vc.date}>{date}  ·  {time}</Text>
      <View style={vc.footer}>
        <Text style={vc.lang}>{lang}</Text>
        <View style={[vc.badge, { backgroundColor: accent + '55' }]}>
          <Text style={[vc.badgeTxt, { color: C.dark }]}>
            {session.status === 'processed' ? 'Processed' : 'Pending'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const vc = StyleSheet.create({
  card:     { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  top:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dot:      { width: 8, height: 8, borderRadius: 4 },
  diagnosis:{ fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark, flex: 1 },
  date:     { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginBottom: 8 },
  footer:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lang:     { fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium', color: C.muted },
  badge:    { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt: { fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold' },
});

const ACCENTS = ['#FBBF24', '#9AAB63', '#B6CAEB', '#F5D867', '#FBBF24'];

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PatientHomeScreen({ navigation }) {
  const { profile } = useRole();
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
  });

  const [doctors,      setDoctors]      = useState([]);
  const [requests,     setRequests]     = useState([]); // patient's sent requests
  const [pastSessions, setPastSessions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    // Load doctors first — never let requests/sessions failure block this
    try {
      const docs = await api.getDoctors();
      setDoctors(docs);
    } catch (e) {
      console.warn('getDoctors error:', e.message);
    }
    try {
      const reqs = await api.getPatientRequests(profile.id);
      setRequests(reqs);
    } catch (e) {
      console.warn('getPatientRequests error:', e.message);
    }
    try {
      const sessions = await api.getPatientSessions(profile.patientDbId || profile.id);
      setPastSessions(sessions);
    } catch (e) {
      console.warn('getPatientSessions error:', e.message);
    }
    setLoading(false);
    setRefreshing(false);
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleRequest = async (doctor) => {
    if (!profile?.id) return;
    try {
      const req = await api.createRequest({ patientId: profile.id, doctorId: doctor.id });
      setRequests((prev) => {
        const exists = prev.find((r) => r.doctor_id === doctor.id);
        if (exists) return prev;
        return [{ ...req, doctor }, ...prev];
      });
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not send request');
    }
  };

  const getRequestStatus = (doctorId) => {
    const req = requests.find((r) => r.doctor_id === doctorId);
    return req?.status || null;
  };

  if (!fontsLoaded) return null;

  const firstName = profile?.name?.split(' ')[0] || 'there';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.pink} />}
      >
        {/* HEADER */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting}, {firstName}</Text>
            <Text style={s.sub}>Your health, simplified</Text>
          </View>
          <View style={s.avatarBtn}>
            <Text style={s.avatarInitial}>{(profile?.name || 'P')[0]}</Text>
          </View>
        </View>

        {/* AVAILABLE DOCTORS */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Available Doctors</Text>
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveTxt}>Live</Text>
          </View>
        </View>

        {loading ? (
          <View style={s.loadRow}>
            <ActivityIndicator color={C.pink} />
          </View>
        ) : doctors.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTxt}>No doctors available right now</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.docScroll}
            style={s.docScrollWrap}
          >
            {doctors.map((doc) => (
              <DoctorCard
                key={doc.id}
                doctor={doc}
                requestStatus={getRequestStatus(doc.id)}
                onRequest={handleRequest}
              />
            ))}
          </ScrollView>
        )}

        {/* PENDING / ACCEPTED REQUESTS banner */}
        {requests.filter((r) => r.status === 'accepted').length > 0 && (
          <View style={s.acceptedBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#3a6e00" />
            <Text style={s.acceptedTxt}>
              {requests.filter((r) => r.status === 'accepted').length} doctor(s) accepted your request — your session will begin shortly
            </Text>
          </View>
        )}

        {/* FOLLOW-UP REQUIRED banners */}
        {pastSessions
          .filter(sess => sess.extracted_data?.follow_up_required)
          .slice(0, 3)
          .map(sess => {
            const d = sess.extracted_data || {};
            const alreadyRequested = requests.some(r =>
              r.session_id === sess.id || r.status === 'pending'
            );
            return (
              <View key={sess.id} style={s.fuBanner}>
                <View style={s.fuBannerLeft}>
                  <Ionicons name="calendar" size={18} color="#1d4ed8" />
                  <View>
                    <Text style={s.fuBannerTitle}>Follow-up recommended</Text>
                    <Text style={s.fuBannerSub} numberOfLines={1}>
                      {d.diagnosis || 'Consultation'}{d.follow_up ? `  ·  ${d.follow_up}` : ''}
                    </Text>
                  </View>
                </View>
                {alreadyRequested ? (
                  <View style={s.fuRequestedPill}>
                    <Text style={s.fuRequestedTxt}>Requested</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s.fuRequestBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      const doc = doctors.find(doc => doc.id === sess.doctor_id);
                      if (doc) handleRequest(doc);
                      else Alert.alert('Doctor unavailable', 'Please request a doctor from the list above.');
                    }}
                  >
                    <Text style={s.fuRequestBtnTxt}>Request</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        }

        {/* PAST VISITS */}
        <View style={[s.sectionHeader, { marginTop: 24 }]}>
          <Text style={s.sectionTitle}>Your Visits</Text>
          <Text style={s.sectionCount}>{pastSessions.length} total</Text>
        </View>

        {loading ? null : pastSessions.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="document-text-outline" size={36} color={C.muted} />
            <Text style={s.emptyTxt}>No visits yet</Text>
            <Text style={s.emptySubTxt}>Request a doctor above to get started</Text>
          </View>
        ) : (
          pastSessions.map((sess, i) => (
            <VisitCard
              key={sess.id}
              session={sess}
              accent={ACCENTS[i % ACCENTS.length]}
              onPress={() => navigation.navigate('SessionDetail', { session: sess })}
            />
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { paddingHorizontal: 20, paddingTop: 12 },

  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting:{ fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  sub:     { fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 3 },
  avatarBtn:{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' },
  avatarInitial:{ fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle:  { fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  sectionCount:  { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray },
  liveBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#e6fbe6', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50' },
  liveTxt:       { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#2e7d32' },

  docScrollWrap: { marginHorizontal: -20, marginBottom: 4 },
  docScroll:     { paddingHorizontal: 20, paddingBottom: 8 },

  acceptedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.lime, borderRadius: 16, padding: 14, marginVertical: 8 },
  acceptedTxt:    { flex: 1, fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: '#3a6e00' },

  fuBanner:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#bfdbfe', gap: 10 },
  fuBannerLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fuBannerTitle:  { fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', color: '#1e3a8a' },
  fuBannerSub:    { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: '#3b82f6', marginTop: 2 },
  fuRequestBtn:   { backgroundColor: '#1d4ed8', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 8 },
  fuRequestBtnTxt:{ fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', color: '#ffffff' },
  fuRequestedPill:{ backgroundColor: '#e0e7ff', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 6 },
  fuRequestedTxt: { fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium', color: '#4338ca' },

  loadRow:  { alignItems: 'center', paddingVertical: 24 },
  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyTxt: { fontSize: 15, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray },
  emptySubTxt:{ fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted, textAlign: 'center' },
});
