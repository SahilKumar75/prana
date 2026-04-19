import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const statusIcon  = (s) => ({ processed: 'checkmark-circle', error: 'close-circle', pending: 'time-outline' }[s] || 'time-outline');
const statusColor = (s) => ({ processed: '#9AAB63', error: '#e57373', pending: '#c09a1a' }[s] || '#bbb');
const statusLabel = (s) => ({ processed: 'Processed', error: 'Error', pending: 'Pending' }[s] || s || 'Pending');

const fmt = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export default function SessionDetailScreen({ route, navigation }) {
  const { session, accent = '#F5B8DB' } = route.params;
  const accentLight = accent + '22';

  const entities = session.processed_data?.entities || session.ai_entities || [];
  const summary  = session.processed_data?.summary || session.ai_summary || null;
  const lang     = (session.language || 'hi-IN').split('-')[0].toUpperCase();

  const copyToClipboard = () => {
    Alert.alert('Copied', 'Transcript copied to clipboard.');
  };

  const share = () => {
    Alert.alert('Share', 'Share functionality coming soon.');
  };

  return (
    <SafeAreaView style={[styles.container]} edges={['top']}>
      {/* HEADER AREA */}
      <View style={[styles.headerArea, { backgroundColor: accentLight }]}>
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back-outline" size={16} color="#1A1A1A" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: accent + '33', marginTop: 12 }]}>
          <Ionicons name={statusIcon(session.status)} size={13} color={statusColor(session.status)} />
          <Text style={[styles.statusText, { color: statusColor(session.status) }]}>
            {statusLabel(session.status)}
          </Text>
        </View>

        {/* Date + language */}
        <Text style={styles.headerMeta}>{fmt(session.created_at)}  ·  {lang}</Text>

        {/* Session ID */}
        <Text style={styles.sessionId}>ID: {session.id}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* TRANSCRIPT */}
        <Text style={styles.sectionLabel}>TRANSCRIPT</Text>
        <View style={styles.card}>
          {session.raw_transcript ? (
            <Text style={styles.transcriptText}>{session.raw_transcript}</Text>
          ) : (
            <Text style={styles.transcriptEmpty}>No transcript recorded</Text>
          )}
        </View>

        {/* AI INSIGHTS */}
        {(entities.length > 0 || summary) && (
          <>
            <Text style={styles.sectionLabel}>AI INSIGHTS</Text>
            {entities.length > 0 && (
              <View style={styles.chipRow}>
                {entities.map((e, i) => (
                  <View key={i} style={styles.entityChip}>
                    <Text style={styles.entityText}>{e.text || e}</Text>
                  </View>
                ))}
              </View>
            )}
            {summary && <Text style={styles.summaryText}>{summary}</Text>}
          </>
        )}

        {/* METADATA CARD */}
        <View style={[styles.metaCard, { backgroundColor: accent + '22' }]}>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>Language</Text>
              <Text style={styles.metaVal}>{lang}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>Status</Text>
              <Text style={styles.metaVal}>{statusLabel(session.status)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>Date</Text>
              <Text style={styles.metaVal}>{fmt(session.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionPill} onPress={share} activeOpacity={0.85}>
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={styles.actionPillText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionOutline} onPress={copyToClipboard} activeOpacity={0.8}>
            <Ionicons name="copy-outline" size={16} color="#1A1A1A" />
            <Text style={styles.actionOutlineText}>Copy</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#FDF8F0' },

  headerArea:     { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24 },
  backBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  backText:       { fontSize: 13, fontWeight: '600', color: '#fff' },

  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  statusText:     { fontSize: 13, fontWeight: '600' },

  headerMeta:     { fontSize: 13, color: '#666', marginTop: 8 },
  sessionId:      { fontSize: 11, color: '#aaa', marginTop: 4 },

  scroll:         { paddingHorizontal: 22, paddingTop: 24 },

  sectionLabel:   { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },

  card:           { backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E8E0D5', marginBottom: 20 },
  transcriptText: { fontSize: 15, lineHeight: 24, color: '#1A1A1A' },
  transcriptEmpty:{ fontSize: 14, color: '#bbb', fontStyle: 'italic' },

  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  entityChip:     { backgroundColor: '#F5B8DB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  entityText:     { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  summaryText:    { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 20 },

  metaCard:       { borderRadius: 20, padding: 18, marginTop: 12, marginBottom: 12 },
  metaGrid:       { gap: 12 },
  metaItem:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaKey:        { fontSize: 13, color: '#888', fontWeight: '500' },
  metaVal:        { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },

  actionsRow:     { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionPill:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A1A1A', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 32 },
  actionPillText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  actionOutline:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 32, borderWidth: 1.5, borderColor: '#1A1A1A' },
  actionOutlineText: { color: '#1A1A1A', fontSize: 15, fontWeight: '700' },
});
