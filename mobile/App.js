import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { RoleProvider } from './src/context/RoleContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RoleProvider>
        <AppNavigator />
      </RoleProvider>
    </SafeAreaProvider>
  );
}
