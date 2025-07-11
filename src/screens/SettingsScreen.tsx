import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, Modal, FlatList, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useSleep } from '../context/SleepContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HealthIntegrationSettings from '../components/HealthIntegrationSettings';
import BackgroundMonitorDebug from '../components/BackgroundMonitorDebug';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Define threshold options
const THRESHOLD_OPTIONS = [
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
];

// Define theme options
const THEME_OPTIONS = [
  { label: 'Auto (System)', value: 'auto' as ThemeMode },
  { label: 'Light', value: 'light' as ThemeMode },
  { label: 'Dark', value: 'dark' as ThemeMode },
];

const SettingsScreen = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { settings, updateSettings } = useSleep();
  const { themeMode, setThemeMode, colors, isDarkMode } = useTheme();
  const [useMachineLearning, setUseMachineLearning] = useState(settings.useMachineLearning);
  const [considerTimeOfDay, setConsiderTimeOfDay] = useState(settings.considerTimeOfDay);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showDebugMonitor, setShowDebugMonitor] = useState(false);
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  // Create themed styles
  const themedStyles = createThemedStyles(colors);

  // Sync local state with context settings when they change
  useEffect(() => {
    // Only update local state if we haven't initialized yet or if settings have actually changed
    if (!settingsInitialized || 
        useMachineLearning !== settings.useMachineLearning ||
        considerTimeOfDay !== settings.considerTimeOfDay) {
      
      setUseMachineLearning(settings.useMachineLearning);
      setConsiderTimeOfDay(settings.considerTimeOfDay);
      setSettingsInitialized(true);
      console.log('Settings Screen synchronized with context:', settings);
    }
  }, [settings.useMachineLearning, settings.considerTimeOfDay, settingsInitialized]);

  // Find the current threshold option
  const currentThresholdOption = THRESHOLD_OPTIONS.find(
    option => option.value === settings.inactivityThreshold
  ) || THRESHOLD_OPTIONS[1]; // Default to 45 min if not found

  // Find the current theme option
  const currentThemeOption = THEME_OPTIONS.find(
    option => option.value === themeMode
  ) || THEME_OPTIONS[0]; // Default to auto if not found

  // Handle threshold selection
  const handleThresholdSelect = (value: number) => {
    updateSettings({ inactivityThreshold: value });
    setShowThresholdModal(false);
  };

  // Handle theme selection
  const handleThemeSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
    setShowThemeModal(false);
  };

  // Handle machine learning toggle
  const handleMachineLearningToggle = (value: boolean) => {
    setUseMachineLearning(value);
    updateSettings({ useMachineLearning: value });
    if (value) {
      Alert.alert(
        'Enhanced Detection Enabled',
        'Sleep Detector will now learn from your sleep patterns to improve accuracy. This may take a few days to build up enough data.'
      );
    }
  };

  // Handle time of day consideration toggle
  const handleTimeOfDayToggle = (value: boolean) => {
    setConsiderTimeOfDay(value);
    updateSettings({ considerTimeOfDay: value });
  };

  // Reset sleep data
  const resetSleepData = async () => {
    Alert.alert(
      'Reset Sleep Data',
      'Are you sure you want to reset all sleep data? This will keep your settings but delete all sleep records.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset Data',
          style: 'destructive',
          onPress: async () => {
            try {
              // Only clear sleep-related data, not settings
              await AsyncStorage.multiRemove([
                'sleep-tracker-activity-records',
                'sleep-tracker-daily-summaries',
                'sleep-tracker-patterns'
              ]);
              Alert.alert('Success', 'All sleep data has been reset.');
            } catch (error) {
              console.error('Error resetting data:', error);
              Alert.alert('Error', 'Failed to reset data. Please try again.');
            }
          },
        },
      ],
    );
  };

  // Clear all data
  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all sleep data and settings? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data has been cleared. Please restart the app.');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ],
    );
  };

  const openMealSnapApp = (): void => {
    Linking.openURL('https://apps.apple.com/app/mealsnap-ai-food-log-tracker/id6475162854');
  };

  return (
    <ScrollView style={themedStyles.container} contentContainerStyle={themedStyles.scrollContent}>
      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Sleep Detection</Text>
        <TouchableOpacity
          style={themedStyles.dropdownButton}
          onPress={() => setShowThresholdModal(true)}
        >
          <View>
            <Text style={themedStyles.settingLabel}>Inactivity Threshold</Text>
            <Text style={themedStyles.settingDescription}>
              Inactivity time before considered asleep
            </Text>
          </View>
          <View style={themedStyles.dropdownValueContainer}>
            <Text style={themedStyles.dropdownValue}>{currentThresholdOption.label}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Accuracy Settings</Text>
        <View style={themedStyles.settingItem}>
          <View style={themedStyles.switchContainer}>
            <Text style={themedStyles.settingLabel}>Enhanced Detection</Text>
            <Switch
              value={useMachineLearning}
              onValueChange={handleMachineLearningToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={useMachineLearning ? colors.primary : colors.surface}
            />
          </View>
          <Text style={themedStyles.settingDescription}>
            Learn from your sleep patterns to improve accuracy
          </Text>
        </View>

        <View style={themedStyles.settingItem}>
          <View style={themedStyles.switchContainer}>
            <Text style={themedStyles.settingLabel}>Consider Time of Day</Text>
            <Switch
              value={considerTimeOfDay}
              onValueChange={handleTimeOfDayToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={considerTimeOfDay ? colors.primary : colors.surface}
            />
          </View>
          <Text style={themedStyles.settingDescription}>
            Factor in typical sleep hours for better detection
          </Text>
        </View>
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Appearance</Text>
        <TouchableOpacity
          style={themedStyles.dropdownButton}
          onPress={() => setShowThemeModal(true)}
        >
          <View>
            <Text style={themedStyles.settingLabel}>Theme</Text>
            <Text style={themedStyles.settingDescription}>
              Choose your preferred color scheme
            </Text>
          </View>
          <View style={themedStyles.dropdownValueContainer}>
            <Text style={themedStyles.dropdownValue}>{currentThemeOption.label}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Health Integration</Text>
        <HealthIntegrationSettings />
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Notifications</Text>
        <TouchableOpacity
          style={themedStyles.dataButton}
          onPress={() => navigation.navigate('NotificationSettings')}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          <Text style={[themedStyles.buttonText, { color: colors.primary }]}>Notification Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Data Management</Text>
        <TouchableOpacity style={themedStyles.dataButton} onPress={resetSleepData}>
          <Ionicons name="refresh-outline" size={20} color={colors.warning} />
          <Text style={[themedStyles.buttonText, { color: colors.warning }]}>Reset Sleep Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[themedStyles.dataButton, themedStyles.deleteButton]} onPress={clearAllData}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={themedStyles.buttonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Debug & Monitoring</Text>
        <TouchableOpacity
          style={themedStyles.dataButton}
          onPress={() => setShowDebugMonitor(!showDebugMonitor)}
        >
          <Ionicons
            name={showDebugMonitor ? "eye-off-outline" : "eye-outline"}
            size={20}
            color="#2196F3"
          />
          <Text style={[themedStyles.buttonText, { color: '#2196F3' }]}>
            {showDebugMonitor ? 'Hide' : 'Show'} Background Monitor
          </Text>
        </TouchableOpacity>

        {showDebugMonitor && (
          <View style={themedStyles.debugContainer}>
            <BackgroundMonitorDebug />
          </View>
        )}
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>About</Text>
        <View style={themedStyles.aboutContainer}>
          <Text style={themedStyles.appName}>Sleep Detector</Text>
          <Text style={themedStyles.appVersion}>Version 1.0.0</Text>
          <Text style={themedStyles.description}>
            Track your sleep patterns based on phone usage.
          </Text>
          <Text style={[themedStyles.description, themedStyles.mealSnapLink]} onPress={openMealSnapApp}>
            MealSnap helps with your eating habits
          </Text>
        </View>
      </View>

      {/* Threshold Selection Modal */}
      <Modal
        visible={showThresholdModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowThresholdModal(false)}
      >
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.modalContent}>
            <View style={themedStyles.modalHeader}>
              <Text style={themedStyles.modalTitle}>Select Inactivity Threshold</Text>
              <TouchableOpacity onPress={() => setShowThresholdModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={THRESHOLD_OPTIONS}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    themedStyles.thresholdOption,
                    item.value === settings.inactivityThreshold && themedStyles.selectedOption
                  ]}
                  onPress={() => handleThresholdSelect(item.value)}
                >
                  <Text
                    style={[
                      themedStyles.thresholdOptionText,
                      item.value === settings.inactivityThreshold && themedStyles.selectedOptionText
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === settings.inactivityThreshold && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={themedStyles.separator} />}
            />

            <Text style={themedStyles.modalDescription}>
              This is how long your phone needs to be inactive before Sleep Detector considers you asleep.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.modalContent}>
            <View style={themedStyles.modalHeader}>
              <Text style={themedStyles.modalTitle}>Select Theme</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={THEME_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    themedStyles.thresholdOption,
                    item.value === themeMode && themedStyles.selectedOption
                  ]}
                  onPress={() => handleThemeSelect(item.value)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons 
                      name={
                        item.value === 'auto' ? 'phone-portrait-outline' :
                        item.value === 'light' ? 'sunny-outline' : 'moon-outline'
                      } 
                      size={20} 
                      color={colors.textSecondary} 
                      style={{ marginRight: 12 }}
                    />
                    <Text
                      style={[
                        themedStyles.thresholdOptionText,
                        item.value === themeMode && themedStyles.selectedOptionText
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  {item.value === themeMode && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={themedStyles.separator} />}
            />

            <Text style={themedStyles.modalDescription}>
              Auto follows your system theme. Perfect for checking your sleep before bed in dark mode! 🌙
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// Create themed styles function
const createThemedStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
    color: colors.text,
  },
  aboutContainer: {
    alignItems: 'center',
    padding: 8,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  appVersion: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dropdownValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '35%',
  },
  dropdownValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    marginRight: 4,
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.modalBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  thresholdOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  selectedOption: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  thresholdOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  selectedOptionText: {
    fontWeight: '600',
    color: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 16,
    fontStyle: 'italic',
  },
  mealSnapLink: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    color: colors.primary,
  },
  debugContainer: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
    height: 400,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6200ee',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
    color: '#fff',
  },
  aboutContainer: {
    alignItems: 'center',
    padding: 8,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dropdownValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '35%',
  },
  dropdownValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6200ee',
    marginRight: 4,
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  thresholdOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  selectedOption: {
    backgroundColor: '#f0e6ff',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  thresholdOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#6200ee',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
    fontStyle: 'italic',
  },
  mealSnapLink: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    color: '#6200ee',
  },
  debugContainer: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
    height: 400,
  },
});

export default SettingsScreen; 