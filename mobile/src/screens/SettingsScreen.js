import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView } from 'react-native';
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

// Each row is its own individual card — matches reference exactly
function SettingCard({ icon, label, subtitle, right }) {
  return (
    <TouchableOpacity style={ss.card} activeOpacity={0.7}>
      <View style={ss.cardIcon}>
        <Ionicons name={icon} size={22} color={C.dark} />
      </View>
      <View style={ss.cardBody}>
        <Text style={ss.cardLabel}>{label}</Text>
        {subtitle ? <Text style={ss.cardSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={ss.cardRight}>
        {right ?? <Ionicons name="chevron-forward" size={18} color={C.muted} />}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [allowRec, setAllowRec] = useState(true);

  return (
    <SafeAreaView style={ss.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll}>

        <Text style={ss.pageTitle}>Settings</Text>

        {/* APP SETTINGS */}
        <Text style={ss.sectionTitle}>App settings</Text>

        <SettingCard
          icon="mic-outline"
          label="Allow recording"
          subtitle={allowRec ? 'Recording is allowed' : 'Recording is disabled'}
          right={
            <Switch
              value={allowRec}
              onValueChange={setAllowRec}
              trackColor={{ false: '#e0e0e0', true: C.lime }}
              thumbColor={C.white}
              ios_backgroundColor="#e0e0e0"
            />
          }
        />

        <SettingCard
          icon="language-outline"
          label="Default language"
          subtitle="हिंदी (Hindi)"
        />

        <SettingCard
          icon="cloud-upload-outline"
          label="Auto-sync notes"
          subtitle="Notes sync when online"
        />

        <SettingCard
          icon="download-outline"
          label="Export my data"
          subtitle="Download all sessions as PDF"
        />

        <SettingCard
          icon="notifications-outline"
          label="Notifications"
        />

        {/* ACCOUNT */}
        <Text style={[ss.sectionTitle, { marginTop: 8 }]}>Account</Text>

        <SettingCard icon="lock-closed-outline"       label="Change password"     />
        <SettingCard icon="shield-checkmark-outline"  label="Privacy & security"  />
        <SettingCard icon="help-circle-outline"       label="Help & support"      />

        {/* SIGN OUT */}
        <TouchableOpacity style={ss.signOutCard} activeOpacity={0.8}>
          <View style={[ss.cardIcon, { backgroundColor: '#fff0f0' }]}>
            <Ionicons name="log-out-outline" size={22} color="#e57373" />
          </View>
          <Text style={ss.signOutLabel}>Log out</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  scroll:       { paddingHorizontal: 20, paddingTop: 12 },

  pageTitle:    { fontSize: 20, fontWeight: '700', color: C.dark, textAlign: 'center', marginBottom: 24, letterSpacing: -0.2 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: C.dark, marginBottom: 14, letterSpacing: -0.3 },

  // Individual card per row
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 10, gap: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardIcon:     { width: 42, height: 42, borderRadius: 13, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  cardBody:     { flex: 1 },
  cardLabel:    { fontSize: 16, fontWeight: '600', color: C.dark },
  cardSubtitle: { fontSize: 12, color: C.gray, marginTop: 2 },
  cardRight:    { alignItems: 'center', justifyContent: 'center' },

  signOutCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, marginTop: 4, marginBottom: 10, gap: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  signOutLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#e57373' },
});
