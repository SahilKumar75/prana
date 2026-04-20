import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useRole } from '../context/RoleContext';

const C = {
  bg:     '#f2f3f5',
  white:  '#ffffff',
  dark:   '#202020',
  lime:   '#c9f158',
  pink:   '#F5B8DB',
  gray:   '#888888',
  muted:  '#bbbbbe',
};

export default function RoleSelectScreen() {
  const { selectRole } = useRole();
  const [fontsLoaded]  = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>
        {/* LOGO */}
        <View style={s.logoWrap}>
          <Text style={s.logoText}>P.</Text>
          <Text style={s.brandName}>Prana</Text>
          <Text style={s.tagline}>Voice-driven clinical intelligence</Text>
        </View>

        <Text style={s.question}>Who are you today?</Text>

        {/* DOCTOR TILE */}
        <TouchableOpacity
          style={[s.tile, s.tileLime]}
          onPress={() => selectRole('doctor')}
          activeOpacity={0.88}
        >
          <View style={s.tileIcon}>
            <Ionicons name="medkit-outline" size={32} color={C.dark} />
          </View>
          <View style={s.tileBody}>
            <Text style={s.tileTitle}>I'm a Doctor</Text>
            <Text style={s.tileDesc}>Record consultations, manage patients, generate prescriptions</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={C.dark} />
        </TouchableOpacity>

        {/* PATIENT TILE */}
        <TouchableOpacity
          style={[s.tile, s.tilePink]}
          onPress={() => selectRole('patient')}
          activeOpacity={0.88}
        >
          <View style={s.tileIcon}>
            <Ionicons name="person-outline" size={32} color={C.dark} />
          </View>
          <View style={s.tileBody}>
            <Text style={s.tileTitle}>I'm a Patient</Text>
            <Text style={s.tileDesc}>Find doctors, request consultations, view your visit history</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={C.dark} />
        </TouchableOpacity>

        <Text style={s.footer}>For demo — no sign-in required</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner:     { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },

  logoWrap:  { alignItems: 'center', marginBottom: 48 },
  logoText:  { fontSize: 52, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, letterSpacing: -2 },
  brandName: { fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, marginTop: -8 },
  tagline:   { fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', color: C.gray, marginTop: 6 },

  question:  { fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark, marginBottom: 20, textAlign: 'center' },

  tile:      { flexDirection: 'row', alignItems: 'center', borderRadius: 24, padding: 20, marginBottom: 14, gap: 16 },
  tileLime:  { backgroundColor: C.lime },
  tilePink:  { backgroundColor: C.pink },
  tileIcon:  { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  tileBody:  { flex: 1 },
  tileTitle: { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', color: C.dark },
  tileDesc:  { fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', color: C.dark, opacity: 0.7, marginTop: 3 },

  footer:    { textAlign: 'center', fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', color: C.muted, marginTop: 32 },
});
