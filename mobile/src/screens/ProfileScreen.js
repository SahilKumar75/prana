import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color="#888" />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SettingRow({ icon, label, right, last, onPress, danger }) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, !last && styles.settingRowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={danger ? '#e57373' : '#888'} />
      </View>
      <Text style={[styles.settingLabel, danger && { color: '#e57373' }]}>{label}</Text>
      <View style={styles.settingRight}>{right}</View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* HEADER */}
        <Text style={styles.pageTitle}>Profile</Text>

        {/* AVATAR BLOCK */}
        <View style={styles.avatarBlock}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>SA</Text>
            </View>
            <TouchableOpacity style={styles.avatarEdit} activeOpacity={0.7}>
              <Ionicons name="pencil-outline" size={14} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* PERSONAL INFO */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Personal info</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <InfoRow icon="person-outline"   label="Name"             value="Sahil Kumar Singh" />
          <InfoRow icon="mail-outline"      label="Role"             value="Clinician / Doctor" />
          <InfoRow icon="language-outline"  label="Default language" value="हिंदी" />
          <InfoRow icon="location-outline"  label="Department"       value="General Medicine" last />
        </View>

        {/* ACCOUNT INFO */}
        <Text style={styles.sectionTitle}>Account info</Text>
        <View style={styles.card}>
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            right={<Text style={styles.settingVal}>On</Text>}
          />
          <SettingRow
            icon="information-circle-outline"
            label="About Prana"
            right={<Ionicons name="chevron-forward" size={16} color="#bbb" />}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            right={<Ionicons name="chevron-forward" size={16} color="#bbb" />}
          />
          <SettingRow
            icon="help-circle-outline"
            label="Help & Support"
            right={<Ionicons name="chevron-forward" size={16} color="#bbb" />}
            last
          />
        </View>

        {/* SIGN OUT */}
        <View style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            label="Sign out"
            right={null}
            last
            danger
          />
        </View>

        <Text style={styles.version}>Prana v1.0.0 · Built for healthcare</Text>
        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#F5F5F2' },
  scroll:            { paddingHorizontal: 20, paddingTop: 16 },

  pageTitle:         { fontSize: 28, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 24 },

  avatarBlock:       { alignItems: 'center', marginBottom: 28 },
  avatarWrap:        { position: 'relative' },
  avatar:            { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F5B8DB', alignItems: 'center', justifyContent: 'center' },
  avatarInitials:    { fontSize: 30, fontWeight: '800', color: '#1A1A1A' },
  avatarEdit:        { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EBEBEB' },

  sectionHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle:      { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  editBtn:           { fontSize: 14, fontWeight: '600', color: '#F5B8DB' },

  card:              { backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, overflow: 'hidden' },

  infoRow:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  infoRowBorder:     { borderBottomWidth: 1, borderBottomColor: '#F5F5F2' },
  infoIcon:          { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F5F5F2', alignItems: 'center', justifyContent: 'center' },
  infoBody:          { flex: 1 },
  infoLabel:         { fontSize: 11, color: '#888', marginBottom: 2 },
  infoValue:         { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },

  settingRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  settingRowBorder:  { borderBottomWidth: 1, borderBottomColor: '#F5F5F2' },
  settingLabel:      { flex: 1, fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  settingRight:      { alignItems: 'flex-end' },
  settingVal:        { fontSize: 14, color: '#888' },

  version:           { textAlign: 'center', fontSize: 12, color: '#ccc', marginBottom: 8 },
});
