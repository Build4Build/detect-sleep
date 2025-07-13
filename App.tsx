import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, AppStateStatus } from 'react-native';
import { SleepProvider } from './src/context/SleepContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import BackgroundActivityService from './src/services/BackgroundActivityService';
import ErrorBoundary from './src/components/ErrorBoundary';

const AppContent = () => {
  const { isDarkMode } = useTheme();
  return (
    <>
      <AppNavigator />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
};

export default function App() {
  useEffect(() => {
    // Handle app state changes to prevent crashes on force close
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log(`🔄 App state changed to: ${nextAppState}`);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        try {
          // Gracefully handle app going to background
          console.log('📱 App going to background - preparing cleanup');
        } catch (error) {
          console.error('❌ Error handling app background state:', error);
        }
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup function to prevent memory leaks
    return () => {
      console.log('🧹 Cleaning up app state subscription');
      subscription?.remove();
      
      // Emergency cleanup for background service
      try {
        const backgroundService = BackgroundActivityService.getInstance();
        backgroundService.stopMonitoring().catch(console.error);
      } catch (error) {
        console.error('❌ Emergency cleanup error:', error);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <SleepProvider>
            <AppContent />
          </SleepProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}