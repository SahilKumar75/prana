import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
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
  gray:  '#888888',
  muted: '#bbbbbe',
};

const DUMMY_SESSIONS = [
  { id: 'd1', language: 'Patient Consultation', created_at: new Date(Date.now() - 1*60*60*1000).toISOString(), status: 'processed', icon: 'person-outline',        lang: 'hi-IN', duration: '4 min' },
  { id: 'd2', language: 'Follow-up Note',       created_at: new Date(Date.now() - 3*60*60*1000).toISOString(), status: 'processed', icon: 'document-text-outline', lang: 'en-IN', duration: '2 min' },
  { id: 'd3', language: 'Discharge Summary',    created_at: new Date(Date.now() - 6*60*60*1000).toISOString(), status: 'pending',   icon: 'clipboard-outline',     lang: 'hi-IN', duration: '7 min' },
  { id: 'd4', language: 'OPD Voice Note',        created_at: new Date(Date.now() - 1*24*60*60*1000).toISOString(), status: 'processed', icon: 'mic-circle-outline',    lang: 'en-IN', duration: '1 min' },
];

const statusMeta = {
  processed: { color: '#3a6e00', bg: '#c9f158' },
  error:     { color: '#c0392b', bg: '#fce8e6' },
  pending:   { color: '#7a5c00', bg: '#fff8e1' },
};

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DashboardScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const [sessions, setSessions]  = useState([]);
  const [stats,    setStats]     = useState({ total: 0, processed: 0 });
  const [loading,  setLoading]   = useState(true);
  const [offline,  setOffline]   = useState(false);

  async function loadData() {
    try {
      const [s, st] = await Promise.all([api.getSessions(), api.getStats()]);
      setSessions(s);
      setStats(st);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (!fontsLoaded) return null;

  const recentSessions = sessions.slice(0, 4);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* HEADER */}
        <View style={s.header}>
          <View>
            <Text style={s.name}>{greeting}, Doctor</Text>
            <Text style={s.greeting}>Welcome to Prana</Text>
          </View>
          <TouchableOpacity style={s.bellBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color={C.dark} />
          </TouchableOpacity>
        </View>

        {/* OFFLINE BANNER */}
        {offline && (
          <TouchableOpacity style={s.offlineBanner} onPress={() => { setLoading(true); loadData(); }} activeOpacity={0.8}>
            <Ionicons name="wifi-outline" size={16} color="#92400e" />
            <Text style={s.offlineTxt}>Backend offline — tap to retry</Text>
          </TouchableOpacity>
        )}

        {/* HERO CARD */}
        <View style={s.heroCard}>
          <Text style={s.heroLabel}>Your sessions</Text>
          <View style={s.heroRow}>
            <Text style={s.heroCount}>{loading ? '—' : stats.total}</Text>
          </View>
          <TouchableOpacity
            style={s.startBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Record')}
          >
            <Text style={s.startTxt}>Start recording</Text>
          </TouchableOpacity>
        </View>

        {/* YOUR NOTES */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Your notes</Text>
          <TouchableOpacity activeOpacity={0.7}><Text style={s.seeAll}>See all</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.notesScroll} style={s.notesScrollWrap}>
          {/* Lime note card */}
          <TouchableOpacity style={[s.noteCard, s.noteCardLime]} activeOpacity={0.85}>
            <View style={s.ncTop}>
              <Text style={s.ncLogo}>P.</Text>
              <Ionicons name="mic-outline" size={20} color={C.dark} />
            </View>
            <View style={s.ncBottom}>
              <View>
                <Text style={s.ncType}>Voice Note</Text>
                <Text style={s.ncId}>#VN-001</Text>
              </View>
              <View style={s.detailsBtn}>
                <Text style={s.detailsTxt}>Details</Text>
                <Ionicons name="arrow-forward" size={12} color={C.dark} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Dark note card */}
          <TouchableOpacity style={[s.noteCard, s.noteCardDark]} activeOpacity={0.85}>
            <View style={s.ncTop}>
              <Text style={[s.ncLogo, { color: C.white }]}>P.</Text>
              <Ionicons name="document-text-outline" size={20} color={C.white} />
            </View>
            <View style={s.ncBottom}>
              <View>
                <Text style={[s.ncType, { color: C.white }]}>Clinical Note</Text>
                <Text style={[s.ncId,   { color: C.muted  }]}>#CN-001</Text>
              </View>
              <View style={[s.detailsBtn, { backgroundColor: '#333' }]}>
                <Text style={[s.detailsTxt, { color: C.white }]}>Details</Text>
                <Ionicons name="arrow-forward" size={12} color={C.white} />
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* TRANSACTIONS / RECENT SESSIONS */}
        <View style={s.txCard}>
          {/* Header inside card */}
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
  name:      { fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold',    color: C.dark },
  greeting:  { fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 3 },
  bellBtn:   { width: 44, height: 44, borderRadius: 14, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },

  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  offlineTxt:    { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: '#92400e', flex: 1 },

  heroCard:  { backgroundColor: C.white, borderRadius: 24, padding: 22, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  heroLabel: { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray, marginBottom: 6 },
  heroRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  heroCount: { fontSize: 48, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, letterSpacing: -2 },
  eyeBtn:    { padding: 4 },
  startBtn:  { backgroundColor: C.dark, borderRadius: 50, paddingVertical: 15, alignItems: 'center' },
  startTxt:  { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.white },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  seeAll:        { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray },

  notesScrollWrap: { marginHorizontal: -20 },
  notesScroll:  { gap: 14, paddingHorizontal: 20, paddingBottom: 24 },
  noteCard:     { width: 280, height: 170, borderRadius: 26, padding: 20, overflow: 'hidden', justifyContent: 'space-between' },
  noteCardLime: { backgroundColor: C.lime },
  noteCardDark: { backgroundColor: C.dark },
  ncTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ncBottom:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  ncLogo:       { fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  ncType:       { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
  ncId:         { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, marginTop: 3 },
  detailsBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.white, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 9 },
  detailsTxt:   { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },

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
});
