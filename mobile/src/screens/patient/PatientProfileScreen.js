import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
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
import { useRole } from '../../context/RoleContext';

const C = {
  bg:    '#f2f3f5',
  white: '#ffffff',
  dark:  '#202020',
  pink:  '#FBBF24',
  gray:  '#888888',
  muted: '#bbbbbe',
};

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[s.infoRow, !last && s.infoRowBorder]}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={20} color={C.dark} />
      </View>
      <View style={s.infoBody}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function PatientProfileScreen() {
  const { profile, signOut } = useRole();
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) return null;

  const initials = (profile?.name || 'PP')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* HEADER */}
        <Text style={s.pageTitle}>Profile</Text>

        {/* AVATAR */}
        <View style={s.avatarBlock}>
          <View style={s.avatarWrap}>
            <View style={[s.avatar, { backgroundColor: C.pink }]}>
              <Text style={s.avatarInitials}>{initials}</Text>
            </View>
          </View>
          <Text style={s.avatarName}>{profile?.name || 'Patient'}</Text>
          <View style={s.roleBadge}>
            <Ionicons name="person-outline" size={12} color={C.dark} />
            <Text style={s.roleTxt}>Patient</Text>
          </View>
        </View>

        {/* PERSONAL INFO */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Personal info</Text>
        </View>
        <View style={s.card}>
          <InfoRow icon="person-outline"   label="Name"         value={profile?.name || '—'} />
          <InfoRow icon="call-outline"     label="Phone number" value={profile?.phone || '+91 98765 43210'} />
          <InfoRow icon="calendar-outline" label="Member since" value="April 2026" last />
        </View>

        {/* ACCOUNT INFO */}
        <Text style={s.sectionTitle}>Account</Text>
        <View style={s.card}>
          <InfoRow icon="shield-checkmark-outline" label="Role"        value="Patient" />
          <InfoRow icon="language-outline"         label="Preferred language" value="हिंदी (Hindi)" last />
        </View>

        {/* SWITCH ROLE */}
        <TouchableOpacity style={s.switchBtn} onPress={signOut} activeOpacity={0.8}>
          <Ionicons name="swap-horizontal-outline" size={18} color={C.dark} />
          <Text style={s.switchTxt}>Switch role</Text>
        </TouchableOpacity>

        {/* SIGN OUT */}
        <TouchableOpacity style={s.signOutBtn} onPress={signOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#e57373" />
          <Text style={s.signOutTxt}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { paddingHorizontal: 20, paddingTop: 12 },

  pageTitle:  { fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, marginBottom: 24 },

  avatarBlock:    { alignItems: 'center', marginBottom: 28 },
  avatarWrap:     { marginBottom: 12 },
  avatar:         { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 30, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  avatarName:     { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, marginBottom: 6 },
  roleBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.pink, borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5 },
  roleTxt:        { fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:     { fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, marginBottom: 10, marginTop: 4 },

  card:          { backgroundColor: C.white, borderRadius: 20, overflow: 'hidden', marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  infoRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: C.bg },
  infoIcon:      { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoBody:      { flex: 1 },
  infoLabel:     { fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray },
  infoValue:     { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark, marginTop: 2 },

  switchBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.white, borderRadius: 50, paddingVertical: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  switchTxt:  { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: C.dark },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff0f0', borderRadius: 50, paddingVertical: 14 },
  signOutTxt: { fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', color: '#e57373' },
});
