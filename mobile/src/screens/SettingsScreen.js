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

function SettingRow({ icon, label, last, danger, right }) {
  return (
    <TouchableOpacity
      style={[ss.row, !last && ss.rowBorder]}
      activeOpacity={0.7}
    >
      <View style={ss.rowIcon}>
        <Ionicons name={icon} size={18} color={danger ? '#e57373' : C.dark} />
      </View>
      <Text style={[ss.rowLabel, danger && { color: '#e57373' }]}>{label}</Text>
      <View style={ss.rowRight}>
        {right ?? <Ionicons name="chevron-forward" size={16} color={C.muted} />}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [allowTx, setAllowTx] = useState(true);

  return (
    <SafeAreaView style={ss.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll}>

        <Text style={ss.pageTitle}>Settings</Text>

        {/* CARD SETTINGS */}
        <Text style={ss.sectionTitle}>Recording settings</Text>
        <View style={ss.card}>
          <SettingRow
            icon="mic-outline"
            label="Allow recording"
            right={
              <Switch
                value={allowTx}
                onValueChange={setAllowTx}
                trackColor={{ false: '#e0e0e0', true: C.lime }}
                thumbColor={C.white}
                ios_backgroundColor="#e0e0e0"
              />
            }
          />
          <SettingRow icon="language-outline"  label="Default language"    />
          <SettingRow icon="cloud-upload-outline" label="Auto-sync notes"   />
          <SettingRow icon="time-outline"       label="Session timeout"    last />
        </View>

        {/* ACCOUNT */}
        <Text style={ss.sectionTitle}>Account</Text>
        <View style={ss.card}>
          <SettingRow icon="person-outline"       label="Edit profile"           />
          <SettingRow icon="lock-closed-outline"  label="Change password"        />
          <SettingRow icon="shield-checkmark-outline" label="Privacy & security" />
          <SettingRow icon="help-circle-outline"  label="Help & support"    last />
        </View>

        {/* DANGER */}
        <View style={ss.card}>
          <SettingRow icon="log-out-outline" label="Log out"       danger last />
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  scroll:       { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 },

  pageTitle:    { fontSize: 22, fontWeight: '700', color: C.dark, marginBottom: 24, letterSpacing: -0.3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.dark, marginBottom: 10, marginTop: 8 },

  card:         { backgroundColor: C.white, borderRadius: 22, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },

  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  rowBorder:    { borderBottomWidth: 1, borderBottomColor: C.bg },
  rowIcon:      { width: 36, height: 36, borderRadius: 11, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  rowLabel:     { flex: 1, fontSize: 14, fontWeight: '500', color: C.dark },
  rowRight:     { alignItems: 'center', justifyContent: 'center' },
});
