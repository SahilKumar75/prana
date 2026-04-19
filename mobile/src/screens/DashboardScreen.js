import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ActivityIndicator, ScrollView,
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

// ─── Design tokens ─────────────────────────────────────────────────────────
const C = {
  bg:    '#f2f3f5',
  white: '#ffffff',
  dark:  '#202020',
  lime:  '#c9f158',
  gray:  '#888888',
  muted: '#bbbbbe',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const statusMeta = {
  processed: { color: '#3a6e00', bg: '#c9f158', label: '+Done'    },
  error:     { color: '#c0392b', bg: '#fce8e6', label: 'Error'    },
  pending:   { color: '#9a6e00', bg: '#fef7e0', label: '~Pending' },
};
const getStatus = (st) => statusMeta[st] ?? { color: C.muted, bg: '#f0f0f0', label: 'Pending' };

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const [sessions, setSessions] = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [offline,  setOffline]  = useState(false);
  const [hidden,   setHidden]   = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const loadData = async () => {
    setOffline(false);
    try {
      const [sessData, statsData] = await Promise.all([api.getSessions(), api.getStats()]);
      setSessions(sessData);
      setStats(statsData);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    }
  };

  useEffect(() => { loadData(); }, []);

  const total          = sessions.length;
  const processedCount = stats?.processedCount ?? sessions.filter(s => s.status === 'processed').length;

  if (loading || !fontsLoaded) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color={C.dark} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Good morning, Doctor</Text>
            <Text style={s.greetingSub}>Welcome to Prana</Text>
          </View>
          <TouchableOpacity style={s.headerBtn} onPress={() => { setLoading(true); loadData(); }} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color={C.dark} />
          </TouchableOpacity>
        </View>

        {/* ── OFFLINE ────────────────────────────────────────────────────── */}
        {offline && (
          <TouchableOpacity style={s.offlineBanner} onPress={() => { setLoading(true); loadData(); }} activeOpacity={0.8}>
            <Ionicons name="wifi-outline" size={14} color="#92400e" />
            <Text style={s.offlineTxt}>Backend offline — tap to retry</Text>
          </TouchableOpacity>
        )}

        {/* ── HERO CARD ──────────────────────────────────────────────────── */}
        <View style={s.heroCard}>
          {/* Label row */}
          <Text style={s.heroLabel}>Your sessions</Text>

          {/* Number + eye icon on same row */}
          <View style={s.heroNumRow}>
            <Text style={s.heroNum}>{hidden ? '••••' : String(total)}</Text>
            <TouchableOpacity onPress={() => setHidden(!hidden)} activeOpacity={0.7}>
              <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* Full-width black pill CTA */}
          <TouchableOpacity style={s.heroCTA} onPress={() => navigation.navigate('Record')} activeOpacity={0.85}>
            <Text style={s.heroCTATxt}>Start recording</Text>
          </TouchableOpacity>
        </View>

        {/* ── YOUR NOTES (card carousel) ─────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Your notes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Record')} activeOpacity={0.7}>
            <Text style={s.sectionLink}>+ New note</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.cardsScroll}
          contentContainerStyle={s.cardsContent}
        >
          {/* Lime (active) card */}
          <TouchableOpacity style={[s.noteCard, s.noteCardLime]} onPress={() => navigation.navigate('History')} activeOpacity={0.88}>
            <View style={s.ncTop}>
              <Text style={s.ncLogo}>P.</Text>
              <Ionicons name="mic" size={20} color={C.dark} />
            </View>
            <View style={s.ncBottom}>
              <View>
                <Text style={s.ncType}>Voice Note</Text>
                <Text style={s.ncId}>•••• {processedCount || '0'} done</Text>
              </View>
              <TouchableOpacity style={s.detailsBtn} activeOpacity={0.8}>
                <Ionicons name="eye-outline" size={13} color={C.dark} />
                <Text style={s.detailsTxt}>Details</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Dark card */}
          <TouchableOpacity style={[s.noteCard, s.noteCardDark]} onPress={() => navigation.navigate('History')} activeOpacity={0.88}>
            <View style={s.ncTop}>
              <Text style={[s.ncLogo, { color: '#555' }]}>P.</Text>
              <Text style={s.ncVisaLbl}>AI</Text>
            </View>
            <View style={s.ncBottom}>
              <View>
                <Text style={[s.ncType, { color: C.muted }]}>Clinical Note</Text>
                <Text style={[s.ncId, { color: C.muted }]}>•••• {total} total</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* ── TRANSACTIONS / SESSIONS ────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')} activeOpacity={0.7}>
            <Text style={s.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>

        {sessions.length > 0 ? (
          <View style={s.txCard}>
            {sessions.slice(0, 5).map((item, idx) => {
              const meta   = getStatus(item.status);
              const isLast = idx === Math.min(sessions.length, 5) - 1;
              const isDone = item.status === 'processed';
              return (
                <TouchableOpacity
                  key={String(item.id)}
                  style={[s.txRow, !isLast && s.txBorder]}
                  onPress={() => navigation.navigate('SessionDetail', { session: item })}
                  activeOpacity={0.7}
                >
                  <View style={s.txIcon}>
                    <Ionicons name="mic-outline" size={20} color={C.dark} />
                  </View>
                  <View style={s.txBody}>
                    <Text style={s.txName} numberOfLines={1}>
                      {item.raw_transcript ? item.raw_transcript.slice(0, 26) + '…' : 'Voice session'}
                    </Text>
                    <Text style={s.txTime}>{fmt(item.created_at)}</Text>
                  </View>
                  <View style={s.txRight}>
                    <Text style={s.txAmt}>
                      {item.language ? '-' + item.language.split('-')[0].toUpperCase() : '—'}
                    </Text>
                    {isDone && (
                      <View style={s.cashPill}>
                        <Text style={s.cashTxt}>+Done</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={s.txCard}>
            <View style={s.txEmptyRow}>
              <View style={s.txIcon}>
                <Ionicons name="mic-outline" size={20} color={C.muted} />
              </View>
              <View style={s.txBody}>
                <Text style={[s.txName, { color: C.muted }]}>No sessions yet</Text>
                <Text style={s.txTime}>Tap Start recording to begin</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 130 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:    { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 },

  // Header
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  greeting:    { fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, letterSpacing: -0.3 },
  greetingSub: { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 2 },
  headerBtn:   { width: 42, height: 42, borderRadius: 13, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },

  // Offline
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  offlineTxt:    { fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', color: '#92400e', flex: 1 },

  // Hero card — matches reference exactly
  heroCard:   { backgroundColor: C.white, borderRadius: 24, padding: 22, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, elevation: 4 },
  heroLabel:  { fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginBottom: 4 },
  heroNumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  heroNum:    { fontSize: 42, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, letterSpacing: -1.5, lineHeight: 50 },
  heroCTA:    { backgroundColor: C.dark, borderRadius: 50, paddingVertical: 17, alignItems: 'center' },
  heroCTATxt: { color: C.white, fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold' },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  sectionLink:   { fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },

  // Cards carousel
  cardsScroll:  { marginHorizontal: -20, marginBottom: 24 },
  cardsContent: { paddingHorizontal: 20, gap: 14, paddingRight: 20 },

  noteCard:     { width: 220, height: 132, borderRadius: 22, padding: 16, overflow: 'hidden', justifyContent: 'space-between' },
  noteCardLime: { backgroundColor: C.lime },
  noteCardDark: { backgroundColor: C.dark },

  ncTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ncLogo:     { fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  ncVisaLbl:  { fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', color: '#555', letterSpacing: 1 },
  ncBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  ncType:      { fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium', color: C.dark },
  ncId:        { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, marginTop: 2 },
  detailsBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.white, borderRadius: 50, paddingHorizontal: 11, paddingVertical: 6 },
  detailsTxt:  { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },

  // Transaction list card
  txCard:  { backgroundColor: C.white, borderRadius: 22, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, marginBottom: 8 },
  txRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  txBorder:{ borderBottomWidth: 1, borderBottomColor: C.bg },
  txIcon:  { width: 46, height: 46, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  txBody:  { flex: 1 },
  txName:  { fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
  txTime:  { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 5 },
  txAmt:   { fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
  cashPill:{ backgroundColor: C.lime, borderRadius: 50, paddingHorizontal: 9, paddingVertical: 3 },
  cashTxt: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', color: '#3a6e00' },

  // Empty row inside tx card
  txEmptyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 20 },
});
