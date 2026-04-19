import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl, Animated, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';

const ACCENT = ['#F5B8DB', '#9AAB63', '#B6CAEB', '#F5D867'];

export default function HistoryScreen({ navigation }) {
  const [sessions, setSessions]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline]       = useState(false);
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

  const statusColor = (s) => ({ processed: '#9AAB63', error: '#e57373', pending: '#c09a1a' }[s] || '#bbb');
  const statusLabel = (s) => ({ processed: 'Done', error: 'Error', pending: 'Pending' }[s] || s || 'Pending');

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color="#F5B8DB" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View style={[{ flex: 1 }, { opacity: fade }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5B8DB" />}
          contentContainerStyle={styles.scroll}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Sessions</Text>
            <View style={styles.countBadge}>
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
              <Text style={styles.offlineBannerText}>Backend offline — tap to retry</Text>
            </TouchableOpacity>
          )}

          {/* SESSION LIST */}
          {sessions.length > 0 ? (
            <>
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>All sessions</Text>
                <Text style={styles.listHeaderTotal}>{sessions.length} total</Text>
              </View>
              <View style={styles.card}>
                {sessions.map((item, index) => {
                  const accent = ACCENT[index % ACCENT.length];
                  const lang   = (item.language || 'hi-IN').split('-')[0].toUpperCase();
                  const isLast = index === sessions.length - 1;
                  return (
                    <TouchableOpacity
                      key={String(item.id)}
                      style={[styles.row, !isLast && styles.rowBorder]}
                      onPress={() => navigation.navigate('SessionDetail', { session: item, accent })}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.rowIcon, { backgroundColor: accent + '33' }]}>
                        <View style={[styles.rowDot, { backgroundColor: accent }]} />
                      </View>
                      <View style={styles.rowBody}>
                        <Text style={styles.rowText} numberOfLines={1}>
                          {item.raw_transcript || 'No transcript'}
                        </Text>
                        <Text style={styles.rowMeta}>{fmt(item.created_at)}</Text>
                      </View>
                      <View style={styles.rowRight}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '22' }]}>
                          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                            {statusLabel(item.status)}
                          </Text>
                        </View>
                        <View style={[styles.langChip, { backgroundColor: accent + '66' }]}>
                          <Text style={styles.langChipText}>{lang}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="mic-outline" size={28} color="#F5B8DB" />
              </View>
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptySub}>Your recordings will appear here</Text>
            </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#F5F5F2' },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:            { paddingHorizontal: 20, paddingTop: 16 },

  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle:         { fontSize: 28, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  countBadge:        { backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 },
  countBadgeText:    { color: '#fff', fontSize: 14, fontWeight: '700' },

  offlineBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, borderWidth: 1, borderColor: '#F59E0B33' },
  offlineBannerText: { fontSize: 13, fontWeight: '500', color: '#92400e', flex: 1 },

  listHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listHeaderText:    { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  listHeaderTotal:   { fontSize: 13, color: '#888' },

  card:              { backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, overflow: 'hidden' },

  row:               { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder:         { borderBottomWidth: 1, borderBottomColor: '#F5F5F2' },
  rowIcon:           { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowDot:            { width: 10, height: 10, borderRadius: 5 },
  rowBody:           { flex: 1, gap: 3 },
  rowText:           { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  rowMeta:           { fontSize: 12, color: '#bbb' },
  rowRight:          { alignItems: 'flex-end', gap: 5 },

  statusBadge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText:        { fontSize: 11, fontWeight: '600' },
  langChip:          { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  langChipText:      { fontSize: 10, fontWeight: '700', color: '#1A1A1A' },

  emptyWrap:         { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIconWrap:     { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF0F7', alignItems: 'center', justifyContent: 'center' },
  emptyTitle:        { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  emptySub:          { fontSize: 13, color: '#888' },
});
