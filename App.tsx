import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { SleepProvider } from './src/context/SleepContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerWidget } from './src/widgets/SleepWidget';

export default function App() {
  // Register the widget on app startup (iOS only)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      registerWidget().catch(err => 
        console.error('Failed to register widget:', err)
      );
    }
  }, []);

  return (
    <SafeAreaProvider>
      <SleepProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SleepProvider>
    </SafeAreaProvider>
  );
} 