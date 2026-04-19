import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg:    '#f2f3f5',
  white: '#ffffff',
  dark:  '#202020',
  gray:  '#888888',
  muted: '#bbbbbe',
  lime:  '#c9f158',
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

export default function ProfileScreen() {
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* HEADER */}
        <Text style={s.pageTitle}>Profile</Text>

        {/* AVATAR */}
        <View style={s.avatarBlock}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarInitials}>SA</Text>
            </View>
            <TouchableOpacity style={s.avatarEdit} activeOpacity={0.7}>
              <Ionicons name="pencil-outline" size={16} color={C.dark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* PERSONAL INFO */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Personal info</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={s.editBtn}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={s.card}>
          <InfoRow icon="person-outline"    label="Name"             value="Sahil Kumar Singh" />
          <InfoRow icon="mail-outline"      label="E-mail"           value="sahil@prana.health" />
          <InfoRow icon="call-outline"      label="Phone number"     value="+91 98765 43210" />
          <InfoRow icon="location-outline"  label="Department"       value="General Medicine" last />
        </View>

        {/* ACCOUNT INFO */}
        <Text style={s.sectionTitle}>Account info</Text>
        <View style={s.card}>
          <InfoRow icon="medkit-outline"    label="Role"             value="Clinician / Doctor" />
          <InfoRow icon="language-outline" label="Default language" value="हिंदी (Hindi)" />
          <InfoRow icon="calendar-outline" label="Member since"     value="April 2026" last />
        </View>

        {/* SIGN OUT */}
        <TouchableOpacity style={s.signOutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#e57373" />
          <Text style={s.signOutTxt}>Sign out</Text>
        </TouchableOpacity>

        <Text style={s.version}>Prana v1.0.0 · Built for healthcare</Text>
        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  scroll:          { paddingHorizontal: 20, paddingTop: 12 },

  pageTitle:       { fontSize: 20, fontWeight: '700', color: C.dark, textAlign: 'center', marginBottom: 28, letterSpacing: -0.2 },

  avatarBlock:     { alignItems: 'center', marginBottom: 32 },
  avatarWrap:      { position: 'relative' },
  avatar:          { width: 100, height: 100, borderRadius: 50, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },
  avatarInitials:  { fontSize: 36, fontWeight: '800', color: C.dark },
  avatarEdit:      { position: 'absolute', bottom: 2, right: -4, width: 34, height: 34, borderRadius: 10, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 6, elevation: 4 },

  sectionHeaderRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:    { fontSize: 22, fontWeight: '800', color: C.dark, marginBottom: 12, letterSpacing: -0.3 },
  editBtn:         { fontSize: 15, fontWeight: '600', color: C.dark },

  card:            { backgroundColor: C.white, borderRadius: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, overflow: 'hidden' },

  infoRow:         { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 16 },
  infoRowBorder:   { borderBottomWidth: 1, borderBottomColor: C.bg },
  infoIcon:        { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  infoBody:        { flex: 1 },
  infoLabel:       { fontSize: 12, color: C.gray, marginBottom: 3, fontWeight: '400' },
  infoValue:       { fontSize: 16, fontWeight: '600', color: C.dark },

  signOutBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.white, borderRadius: 16, paddingVertical: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  signOutTxt:      { fontSize: 15, fontWeight: '600', color: '#e57373' },

  version:         { textAlign: 'center', fontSize: 12, color: C.muted, marginBottom: 8 },
});

