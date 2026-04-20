import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

  const [doctors,           setDoctors]           = useState([]);
  const [requests,          setRequests]          = useState([]); // patient's sent requests
  const [pastSessions,      setPastSessions]      = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [showAcceptedBanner, setShowAcceptedBanner] = useState(false);

  // ── AI Chat ──────────────────────────────────────────────────────────────
  const [chatOpen,     setChatOpen]     = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput,    setChatInput]    = useState('');
  const [chatLoading,  setChatLoading]  = useState(false);
  const [contextCases, setContextCases] = useState([]); // session ids used as context
  const [chatLang,     setChatLang]     = useState('en'); // 'en' | 'hi' | 'mr'
  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const chatScrollRef = useRef(null);
  const insets = useSafeAreaInsets();

  const CHAT_LANGS = [
    { key: 'en', label: 'EN' },
    { key: 'hi', label: 'HI' },
    { key: 'mr', label: 'MR' },
  ];
  const LANG_NAMES = { en: 'English', hi: 'Hindi', mr: 'Marathi' };

  const toggleContextCase = (id) => {
    setContextCases(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const newMsg = { role: 'user', content: text };
    const updated = [...chatMessages, newMsg];
    setChatMessages(updated);
    setChatInput('');
    setChatLoading(true);
    try {
      const selected = pastSessions.filter(s => contextCases.includes(s.id));
      const caseCtx = selected.map(s => {
        const d = s.extracted_data || {};
        return `Visit ${new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}:\n- Diagnosis: ${d.diagnosis || 'N/A'}\n- Symptoms: ${(d.symptoms || []).join(', ') || 'N/A'}\n- Medications: ${(d.medications || []).map(m => m.name).join(', ') || 'N/A'}\n- Follow-up: ${d.follow_up || 'N/A'}`;
      }).join('\n\n');
      const langInstruction = chatLang === 'hi' ? 'Always reply in Hindi.' : chatLang === 'mr' ? 'Always reply in Marathi.' : 'Always reply in English.';
      const systemPrompt = `You are a strict AI health assistant for ${profile?.name || 'the patient'}. ${langInstruction} Reply in 2-3 short sentences max. ONLY answer questions about health, symptoms, medications, or the patient's medical history. If the user asks anything unrelated to health or medicine, respond only with: "I can only help with health-related questions. Please ask your doctor for other queries." Never diagnose. Always remind the patient to consult their doctor.${caseCtx ? `\n\nPatient medical history:\n${caseCtx}` : ''}`;
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, ...updated],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });
      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not get a response right now.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

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

  // Auto-dismiss accepted banner after 5 s
  useEffect(() => {
    const hasAccepted = requests.some(r => r.status === 'accepted');
    if (hasAccepted) {
      setShowAcceptedBanner(true);
      const t = setTimeout(() => setShowAcceptedBanner(false), 5000);
      return () => clearTimeout(t);
    } else {
      setShowAcceptedBanner(false);
    }
  }, [requests]);

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
    if (!req) return null;
    // If there is a follow-up session for this doctor that still needs actioning,
    // treat the doctor card as needing a fresh Request (not Accepted)
    const hasPendingFollowUp = pastSessions.some(
      s => s.doctor_id === doctorId && s.extracted_data?.follow_up_required === true
    );
    if (req.status === 'accepted' && hasPendingFollowUp) return null;
    return req.status;
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

        {/* PENDING / ACCEPTED REQUESTS banner — auto-dismisses after 5 s */}
        {showAcceptedBanner && (
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
            // Only suppress the Request button if there is an actively PENDING request
            // (not accepted — accepted = old session done, follow-up is a NEW request)
            const alreadyRequested = requests.some(r =>
              r.status === 'pending' && r.doctor_id === sess.doctor_id
            );
            return (
              <View key={sess.id} style={s.fuBanner}>
                <View style={s.fuBannerLeft}>
                  <Ionicons name="calendar" size={18} color="#1d4ed8" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.fuBannerTitle}>Follow-up recommended</Text>
                    <Text style={s.fuBannerSub} numberOfLines={2}>
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
          pastSessions.map((sess, i) => {
            const d = sess.extracted_data || {};
            const fu = d.follow_up_required === true;
            const done = sess.status === 'processed';
            const accent = fu ? '#ef4444' : done ? '#22c55e' : '#d1d5db';
            return (
              <VisitCard
                key={sess.id}
                session={sess}
                accent={accent}
                onPress={() => navigation.navigate('SessionDetail', { session: sess })}
              />
            );
          })
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Floating AI Chat button ── */}
      <TouchableOpacity
        style={[s.chatFab, { bottom: insets.bottom + 20 }]}
        onPress={() => setChatOpen(true)}
        activeOpacity={0.88}
      >
        <Ionicons name="chatbubble-ellipses" size={22} color="#ffffff" />
      </TouchableOpacity>

      {/* ── AI Chat Modal ── */}
      <Modal visible={chatOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setChatOpen(false)}>
        <SafeAreaView style={cm.container} edges={['top', 'bottom']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

            {/* Header */}
            <View style={cm.header}>
              <View style={cm.headerLeft}>
                <View>
                  <Text style={cm.headerTitle}>Prana AI</Text>
                  <Text style={cm.headerSub}>Your personal health assistant</Text>
                </View>
              </View>
              <TouchableOpacity style={cm.closeBtn} onPress={() => setChatOpen(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={C.dark} />
              </TouchableOpacity>
            </View>

            {/* Language toggle */}
            <View style={cm.langRow}>
              <Ionicons name="language-outline" size={14} color={C.gray} />
              <Text style={cm.langLabel}>Reply in:</Text>
              {CHAT_LANGS.map(l => (
                <TouchableOpacity
                  key={l.key}
                  style={[cm.langChip, chatLang === l.key && cm.langChipActive]}
                  onPress={() => setChatLang(l.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[cm.langChipTxt, chatLang === l.key && cm.langChipTxtActive]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Case context selector — removed inline chips, now via attach button */}

            {/* Selected-case tags (shown above messages when cases are attached) */}
            {contextCases.length > 0 && (
              <View style={cm.attachedRow}>
                <Ionicons name="attach-outline" size={13} color="#1d4ed8" />
                <Text style={cm.attachedLabel}>
                  {contextCases.length} visit{contextCases.length > 1 ? 's' : ''} attached
                </Text>
                <TouchableOpacity onPress={() => setContextCases([])} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={15} color={C.muted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Messages */}
            <ScrollView
              ref={chatScrollRef}
              style={cm.messages}
              contentContainerStyle={cm.messagesContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {chatMessages.length === 0 && (
                <View style={cm.emptyChat}>
                  <Ionicons name="chatbubble-outline" size={36} color={C.muted} />
                  <Text style={cm.emptyChatTxt}>Ask me anything about your health</Text>
                  <Text style={cm.emptyChatSub}>Tap the attach icon to add past visits as context</Text>
                </View>
              )}
              {chatMessages.map((msg, i) => (
                <View key={i} style={[cm.bubble, msg.role === 'user' ? cm.bubbleUser : cm.bubbleAI]}>
                  <Text style={[cm.bubbleTxt, msg.role === 'user' && cm.bubbleTxtUser]}>{msg.content}</Text>
                </View>
              ))}
              {chatLoading && (
                <View style={[cm.bubble, cm.bubbleAI, { paddingVertical: 14 }]}>
                  <ActivityIndicator size="small" color="#7c3aed" />
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={cm.inputRow}>
              {pastSessions.length > 0 && (
                <TouchableOpacity
                  style={cm.attachBtn}
                  onPress={() => setCasePickerOpen(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="add" size={22} color={contextCases.length > 0 ? '#1d4ed8' : C.gray} />
                </TouchableOpacity>
              )}
              <TextInput
                style={cm.input}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a message…"
                placeholderTextColor={C.muted}
                multiline
                maxLength={400}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                style={[cm.sendBtn, (!chatInput.trim() || chatLoading) && cm.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={!chatInput.trim() || chatLoading}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={18} color={C.dark} />
              </TouchableOpacity>
            </View>

            {/* Case picker bottom sheet */}
            <Modal
              visible={casePickerOpen}
              animationType="slide"
              transparent
              onRequestClose={() => setCasePickerOpen(false)}
            >
              <TouchableOpacity style={cm.pickerOverlay} activeOpacity={1} onPress={() => setCasePickerOpen(false)} />
              <View style={cm.pickerSheet}>
                <View style={cm.pickerHandle} />
                <Text style={cm.pickerTitle}>Attach past visits as context</Text>
                <Text style={cm.pickerSub}>The AI will use these to give personalised answers</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
                  {pastSessions.slice(0, 10).map((sess) => {
                    const d = sess.extracted_data || {};
                    const on = contextCases.includes(sess.id);
                    return (
                      <TouchableOpacity
                        key={sess.id}
                        style={[cm.pickerRow, on && cm.pickerRowOn]}
                        onPress={() => toggleContextCase(sess.id)}
                        activeOpacity={0.75}
                      >
                        <View style={cm.pickerRowLeft}>
                          <Ionicons name="document-text-outline" size={18} color={on ? '#1d4ed8' : C.gray} />
                          <View>
                            <Text style={[cm.pickerRowTitle, on && { color: '#1d4ed8' }]} numberOfLines={1}>
                              {d.diagnosis || 'Consultation'}
                            </Text>
                            <Text style={cm.pickerRowDate}>{fmtDate(sess.created_at)}</Text>
                          </View>
                        </View>
                        {on
                          ? <Ionicons name="checkmark-circle" size={20} color="#1d4ed8" />
                          : <View style={cm.pickerCircle} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={cm.pickerDone} onPress={() => setCasePickerOpen(false)} activeOpacity={0.85}>
                  <Text style={cm.pickerDoneTxt}>Done ({contextCases.length} selected)</Text>
                </TouchableOpacity>
              </View>
            </Modal>

          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

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
  fuBannerLeft:   { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, minWidth: 0 },
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

  chatFab: { position: 'absolute', right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', shadowColor: '#22c55e', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
});

const cm = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.white },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon:   { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  headerSub:    { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  langRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.bg },
  langLabel:    { fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium', color: C.gray },
  langChip:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 50, backgroundColor: C.bg },
  langChipActive:   { backgroundColor: C.dark },
  langChipTxt:      { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.gray },
  langChipTxtActive:{ color: C.white },

  attachedRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#eff6ff', borderBottomWidth: 1, borderBottomColor: '#dbeafe' },
  attachedLabel:{ flex: 1, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#1d4ed8' },

  messages:        { flex: 1 },
  messagesContent: { padding: 16, gap: 10 },
  emptyChat:       { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyChatTxt:    { fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.gray, textAlign: 'center' },
  emptyChatSub:    { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted, textAlign: 'center' },

  bubble:        { maxWidth: '82%', borderRadius: 18, padding: 13 },
  bubbleUser:    { alignSelf: 'flex-end', backgroundColor: '#2563eb' },
  bubbleAI:      { alignSelf: 'flex-start', backgroundColor: C.white, borderWidth: 1, borderColor: '#e5e7eb' },
  bubbleTxt:     { fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, lineHeight: 21 },
  bubbleTxtUser: { color: C.white },

  inputRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.bg, backgroundColor: C.white },
  attachBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  input:      { flex: 1, backgroundColor: C.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: C.dark, maxHeight: 110 },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.35 },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  pickerSheet:   { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  pickerHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 16 },
  pickerTitle:   { fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, marginBottom: 4 },
  pickerSub:     { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginBottom: 16 },
  pickerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.bg },
  pickerRowOn:   { backgroundColor: '#eff6ff', marginHorizontal: -20, paddingHorizontal: 20 },
  pickerRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pickerRowTitle:{ fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
  pickerRowDate: { fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted, marginTop: 2 },
  pickerCircle:  { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db' },
  pickerDone:    { marginTop: 16, backgroundColor: C.dark, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  pickerDoneTxt: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', color: C.white },
});
