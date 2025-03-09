import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SleepProvider } from './src/context/SleepContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <SleepProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SleepProvider>
    </SafeAreaProvider>
  );
} 