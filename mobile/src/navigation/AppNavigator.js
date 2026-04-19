import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen     from '../screens/DashboardScreen';
import RecordScreen        from '../screens/RecordScreen';
import HistoryScreen       from '../screens/HistoryScreen';
import SettingsScreen      from '../screens/SettingsScreen';
import ProfileScreen       from '../screens/ProfileScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TABS = [
  { name: 'Dashboard', label: 'Home',     filled: 'home',          outline: 'home-outline'          },
  { name: 'Record',    label: 'Record',   filled: 'mic',           outline: 'mic-outline'           },
  { name: 'History',   label: 'History',  filled: 'document-text', outline: 'document-text-outline' },
  { name: 'Settings',  label: 'Settings', filled: 'settings',      outline: 'settings-outline'      },
  { name: 'Profile',   label: 'Profile',  filled: 'person',        outline: 'person-outline'        },
];

// ─── Fully custom tab bar ────────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.tabBar}>
      {/* Fixed-height row — icons always dead-center in 70px */}
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const tab     = TABS[index];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={focused ? tab.filled : tab.outline}
                size={25}
                color={focused ? '#202020' : '#BBBBBB'}
              />
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Safe-area spacer — home indicator zone, purely empty */}
      <View style={{ height: insets.bottom, backgroundColor: '#ffffff' }} />
    </View>
  );
}

// ─── Tab navigator ───────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      safeAreaInsets={{ bottom: 0 }}
    >
      {TABS.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={
          tab.name === 'Dashboard' ? DashboardScreen :
          tab.name === 'Record'    ? RecordScreen    :
          tab.name === 'History'   ? HistoryScreen   :
          tab.name === 'Settings'  ? SettingsScreen  :
          ProfileScreen
        } />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs"      component={MainTabs}          />
        <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 20,
  },

  tabRow: {
    flexDirection: 'row',
    height: 60,
    marginTop: 16,
    paddingHorizontal: 12,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#BBBBBB',
  },
  tabLabelActive: {
    color: '#202020',
    fontWeight: '700',
  },
});
