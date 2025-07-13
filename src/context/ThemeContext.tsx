import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme storage key
const THEME_STORAGE_KEY = 'sleep-tracker-theme';

// Define theme types
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  notification: string;
  success: string;
  warning: string;
  error: string;
  sleepActive: string;
  sleepInactive: string;
  chartLine: string;
  chartBackground: string;
  modalBackground: string;
  modalOverlay: string;
}

// Light theme colors
const lightTheme: ThemeColors = {
  primary: '#6200ee',
  background: '#ffffff',
  surface: '#f5f5f5',
  card: '#ffffff',
  text: '#000000',
  textSecondary: '#666666',
  border: '#e0e0e0',
  notification: '#ff4444',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#f44336',
  sleepActive: '#3f51b5',
  sleepInactive: '#9e9e9e',
  chartLine: '#2196f3',
  chartBackground: '#f0f0f0',
  modalBackground: '#ffffff',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
};

// Dark theme colors
const darkTheme: ThemeColors = {
  primary: '#bb86fc',
  background: '#121212',
  surface: '#1e1e1e',
  card: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#aaaaaa',
  border: '#404040',
  notification: '#cf6679',
  success: '#81c784',
  warning: '#ffb74d',
  error: '#e57373',
  sleepActive: '#9c27b0',
  sleepInactive: '#616161',
  chartLine: '#64b5f6',
  chartBackground: '#2d2d2d',
  modalBackground: '#2d2d2d',
  modalOverlay: 'rgba(0, 0, 0, 0.8)',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
          setThemeModeState(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };

    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Determine if dark mode should be active
  const isDarkMode = 
    themeMode === 'dark' || 
    (themeMode === 'auto' && systemColorScheme === 'dark');

  // Get current theme colors
  const colors = isDarkMode ? darkTheme : lightTheme;

  // Set theme mode and save to storage
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      console.log(`Theme mode saved and applied: ${mode}`);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      // Revert the state if save failed
      setThemeModeState(themeMode);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDarkMode,
        colors,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Helper function to create themed styles
export const createThemedStyles = <T extends Record<string, any>>(
  styleFactory: (colors: ThemeColors) => T
) => {
  return (colors: ThemeColors): T => styleFactory(colors);
};

export default ThemeProvider;
