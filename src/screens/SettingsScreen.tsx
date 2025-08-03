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

// Define threshold options (updated with more granular options)
const THRESHOLD_OPTIONS = [
  { label: '20 minutes', value: 20 },
  { label: '25 minutes', value: 25 },
  { label: '30 minutes', value: 30 },
  { label: '35 minutes', value: 35 },
  { label: '40 minutes', value: 40 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
];

// Define sensitivity options
const SENSITIVITY_OPTIONS = [
  { label: 'Low (Less sensitive)', value: 'low' as const },
  { label: 'Medium (Balanced)', value: 'medium' as const },
  { label: 'High (More sensitive)', value: 'high' as const },
];

// Define background persistence options
const PERSISTENCE_OPTIONS = [
  { label: 'Normal', value: 'normal' as const },
  { label: 'Aggressive', value: 'aggressive' as const },
  { label: 'Maximum', value: 'maximum' as const },
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
  const [adaptiveThreshold, setAdaptiveThreshold] = useState(settings.adaptiveThreshold ?? true);
  const [napDetection, setNapDetection] = useState(settings.napDetection ?? true);
  // New advanced settings state
  const [smartWakeupWindow, setSmartWakeupWindow] = useState(settings.smartWakeupWindow ?? true);
  const [confidenceBasedAdjustment, setConfidenceBasedAdjustment] = useState(settings.confidenceBasedAdjustment ?? true);
  const [contextualNotifications, setContextualNotifications] = useState(settings.contextualNotifications ?? true);
  const [advancedSensorFiltering, setAdvancedSensorFiltering] = useState(settings.advancedSensorFiltering ?? true);
  const [batteryOptimizedMode, setBatteryOptimizedMode] = useState(settings.batteryOptimizedMode ?? false);
  const [weekendModeEnabled, setWeekendModeEnabled] = useState(settings.weekendModeEnabled ?? true);
  const [sleepDataValidation, setSleepDataValidation] = useState(settings.sleepDataValidation ?? true);

  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [showSensitivityModal, setShowSensitivityModal] = useState(false);
  const [showPersistenceModal, setShowPersistenceModal] = useState(false);
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
      considerTimeOfDay !== settings.considerTimeOfDay ||
      adaptiveThreshold !== (settings.adaptiveThreshold || true) ||
      napDetection !== (settings.napDetection || true) ||
      smartWakeupWindow !== (settings.smartWakeupWindow ?? true) ||
      confidenceBasedAdjustment !== (settings.confidenceBasedAdjustment ?? true) ||
      contextualNotifications !== (settings.contextualNotifications ?? true) ||
      advancedSensorFiltering !== (settings.advancedSensorFiltering ?? true) ||
      batteryOptimizedMode !== (settings.batteryOptimizedMode ?? false) ||
      weekendModeEnabled !== (settings.weekendModeEnabled ?? true) ||
      sleepDataValidation !== (settings.sleepDataValidation ?? true)) {

      setUseMachineLearning(settings.useMachineLearning);
      setConsiderTimeOfDay(settings.considerTimeOfDay);
      setAdaptiveThreshold(settings.adaptiveThreshold || true);
      setNapDetection(settings.napDetection || true);
      // New advanced settings synchronization
      setSmartWakeupWindow(settings.smartWakeupWindow ?? true);
      setConfidenceBasedAdjustment(settings.confidenceBasedAdjustment ?? true);
      setContextualNotifications(settings.contextualNotifications ?? true);
      setAdvancedSensorFiltering(settings.advancedSensorFiltering ?? true);
      setBatteryOptimizedMode(settings.batteryOptimizedMode ?? false);
      setWeekendModeEnabled(settings.weekendModeEnabled ?? true);
      setSleepDataValidation(settings.sleepDataValidation ?? true);
      setSettingsInitialized(true);
      console.log('Settings Screen synchronized with context:', settings);
    }
  }, [
    settings.useMachineLearning,
    settings.considerTimeOfDay,
    settings.adaptiveThreshold,
    settings.napDetection,
    settings.smartWakeupWindow,
    settings.confidenceBasedAdjustment,
    settings.contextualNotifications,
    settings.advancedSensorFiltering,
    settings.batteryOptimizedMode,
    settings.weekendModeEnabled,
    settings.sleepDataValidation,
    settingsInitialized
  ]);

  // Find the current options
  const currentThresholdOption = THRESHOLD_OPTIONS.find(
    option => option.value === settings.inactivityThreshold
  ) || THRESHOLD_OPTIONS[3]; // Default to 35 min if not found

  const currentSensitivityOption = SENSITIVITY_OPTIONS.find(
    option => option.value === settings.sensitivityLevel
  ) || SENSITIVITY_OPTIONS[1]; // Default to medium if not found

  const currentPersistenceOption = PERSISTENCE_OPTIONS.find(
    option => option.value === settings.backgroundPersistence
  ) || PERSISTENCE_OPTIONS[1]; // Default to aggressive if not found

  // Find the current theme option
  const currentThemeOption = THEME_OPTIONS.find(
    option => option.value === themeMode
  ) || THEME_OPTIONS[0]; // Default to auto if not found

  // Handle threshold selection
  const handleThresholdSelect = (value: number) => {
    updateSettings({ inactivityThreshold: value });
    setShowThresholdModal(false);
  };

  // Handle sensitivity selection
  const handleSensitivitySelect = (value: 'low' | 'medium' | 'high') => {
    updateSettings({ sensitivityLevel: value });
    setShowSensitivityModal(false);
  };

  // Handle persistence selection
  const handlePersistenceSelect = (value: 'normal' | 'aggressive' | 'maximum') => {
    updateSettings({ backgroundPersistence: value });
    setShowPersistenceModal(false);
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

  // Handle adaptive threshold toggle
  const handleAdaptiveThresholdToggle = (value: boolean) => {
    setAdaptiveThreshold(value);
    updateSettings({ adaptiveThreshold: value });
    if (value) {
      Alert.alert(
        'Adaptive Threshold Enabled',
        'Sleep detection will now adjust the inactivity threshold based on time of day and your patterns for more accurate detection.'
      );
    }
  };

  // Handle nap detection toggle
  const handleNapDetectionToggle = (value: boolean) => {
    setNapDetection(value);
    updateSettings({ napDetection: value });
  };

  // Handle smart wakeup window toggle
  const handleSmartWakeupWindowToggle = (value: boolean) => {
    setSmartWakeupWindow(value);
    updateSettings({ smartWakeupWindow: value });
  };

  // Handle confidence based adjustment toggle
  const handleConfidenceBasedAdjustmentToggle = (value: boolean) => {
    setConfidenceBasedAdjustment(value);
    updateSettings({ confidenceBasedAdjustment: value });
  };

  // Handle contextual notifications toggle
  const handleContextualNotificationsToggle = (value: boolean) => {
    setContextualNotifications(value);
    updateSettings({ contextualNotifications: value });
  };

  // Handle advanced sensor filtering toggle
  const handleAdvancedSensorFilteringToggle = (value: boolean) => {
    setAdvancedSensorFiltering(value);
    updateSettings({ advancedSensorFiltering: value });
  };

  // Handle battery optimized mode toggle
  const handleBatteryOptimizedModeToggle = (value: boolean) => {
    setBatteryOptimizedMode(value);
    updateSettings({ batteryOptimizedMode: value });
  };

  // Handle weekend mode toggle
  const handleWeekendModeToggle = (value: boolean) => {
    setWeekendModeEnabled(value);
    updateSettings({ weekendModeEnabled: value });
  };

  // Handle sleep data validation toggle
  const handleSleepDataValidationToggle = (value: boolean) => {
    setSleepDataValidation(value);
    updateSettings({ sleepDataValidation: value });
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
              Base inactivity time before considered asleep
            </Text>
          </View>
          <View style={themedStyles.dropdownValueContainer}>
            <Text style={themedStyles.dropdownValue}>{currentThresholdOption.label}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={themedStyles.dropdownButton}
          onPress={() => setShowSensitivityModal(true)}
        >
          <View>
            <Text style={themedStyles.settingLabel}>Movement Sensitivity</Text>
            <Text style={themedStyles.settingDescription}>
              How sensitive to detect phone movement and usage
            </Text>
          </View>
          <View style={themedStyles.dropdownValueContainer}>
            <Text style={themedStyles.dropdownValue}>{currentSensitivityOption.label}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={themedStyles.dropdownButton}
          onPress={() => setShowPersistenceModal(true)}
        >
          <View>
            <Text style={themedStyles.settingLabel}>Background Persistence</Text>
            <Text style={themedStyles.settingDescription}>
              How aggressively to maintain background monitoring
            </Text>
          </View>
          <View style={themedStyles.dropdownValueContainer}>
            <Text style={themedStyles.dropdownValue}>{currentPersistenceOption.label}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Adaptive Detection</Text>
        <View style={themedStyles.settingItem}>
          <View style={themedStyles.switchContainer}>
            <Text style={themedStyles.settingLabel}>Adaptive Threshold</Text>
            <Switch
              value={adaptiveThreshold}
              onValueChange={handleAdaptiveThresholdToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={adaptiveThreshold ? colors.primary : colors.surface}
            />
          </View>
          <Text style={themedStyles.settingDescription}>
            Automatically adjust threshold based on time of day and patterns
          </Text>
        </View>

        <View style={themedStyles.settingItem}>
          <View style={themedStyles.switchContainer}>
            <Text style={themedStyles.settingLabel}>Enhanced Nap Detection</Text>
            <Switch
              value={napDetection}
              onValueChange={handleNapDetectionToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={napDetection ? colors.primary : colors.surface}
            />
          </View>
          <Text style={themedStyles.settingDescription}>
            Optimized detection for short afternoon naps and unusual sleep times
          </Text>
        </View>
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
        <Text style={themedStyles.sectionTitle}>Advanced Settings</Text>
        <View style={themedStyles.settingItem}>
          <View style={themedStyles.switchContainer}>
            <Text style={themedStyles.settingLabel}>Smart Wakeup Window</Text>
            <Switch
              value={smartWakeupWindow}
              onValueChange={handleSmartWakeupWindowToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={smartWakeupWindow ? colors.primary : colors.surface}
            />
          </View>
          <Text style={themedStyles.settingDescription}>
            Optimize wakeup detection during light sleep phases
          </Text>
        </View>

        <View style={themedStyles.settingItem}>
          <View style={themedStyles.switchContainer}>
            <Text style={themedStyles.settingLabel}>Confidence-Based Adjustment</Text>
            <Switch
              value={confidenceBasedAdjustment}
              onValueChange={handleConfidenceBasedAdjustmentToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={confidenceBasedAdjustment ? colors.primary : colors.surface}
            />
          </View>
          <Text style={themedStyles.settingDescription}>
            Adjust detection thresholds based on confidence scoring
          </Text>
        </View>

        <View style={themedStyles.settingItem}>
          <View style={themedStyles.switchContainer}>
            <Text style={themedStyles.settingLabel}>Contextual Notifications</Text>
            <Switch
              value={contextualNotifications}
              onValueChange={handleContextualNotificationsToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={contextualNotifications ? colors.primary : colors.surface}
            />
          </View>
          <Text style={themedStyles.settingDescription}>
            Generate notifications based on sleep context and time
          </Text>
        </View>

        <View style={themedStyles.settingItem}>
          <View style={themedStyles.switchContainer}>
            <Text style={themedStyles.settingLabel}>Advanced Sensor Filtering</Text>
            <Switch
              value={advancedSensorFiltering}
              onValueChange={handleAdvancedSensorFilteringToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={advancedSensorFiltering ? colors.primary : colors.surface}
            />
          </View>
          <Text style={themedStyles.settingDescription}>
            Use enhanced multi-layer sensor filtering for better accuracy
          </Text>
        </View>
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Power & Lifestyle</Text>
        <View style={themedStyles.settingItem}>
          <View style={themedStyles.switchContainer}>
            <Text style={themedStyles.settingLabel}>Battery Optimized Mode</Text>
            <Switch
              value={batteryOptimizedMode}
              onValueChange={handleBatteryOptimizedModeToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={batteryOptimizedMode ? colors.primary : colors.surface}
            />
          </View>
          <Text style={themedStyles.settingDescription}>
            Reduce battery usage with optimized monitoring intervals
          </Text>
        </View>

        <View style={themedStyles.settingItem}>
          <View style={themedStyles.switchContainer}>
            <Text style={themedStyles.settingLabel}>Weekend Mode</Text>
            <Switch
              value={weekendModeEnabled}
              onValueChange={handleWeekendModeToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={weekendModeEnabled ? colors.primary : colors.surface}
            />
          </View>
          <Text style={themedStyles.settingDescription}>
            Adjust detection patterns for weekend sleep schedules
          </Text>
        </View>

        <View style={themedStyles.settingItem}>
          <View style={themedStyles.switchContainer}>
            <Text style={themedStyles.settingLabel}>Sleep Data Validation</Text>
            <Switch
              value={sleepDataValidation}
              onValueChange={handleSleepDataValidationToggle}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={sleepDataValidation ? colors.primary : colors.surface}
            />
          </View>
          <Text style={themedStyles.settingDescription}>
            Validate and clean sleep data for improved reliability
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

      {/* Sensitivity Selection Modal */}
      <Modal
        visible={showSensitivityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSensitivityModal(false)}
      >
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.modalContent}>
            <View style={themedStyles.modalHeader}>
              <Text style={themedStyles.modalTitle}>Select Movement Sensitivity</Text>
              <TouchableOpacity onPress={() => setShowSensitivityModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={SENSITIVITY_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    themedStyles.thresholdOption,
                    item.value === settings.sensitivityLevel && themedStyles.selectedOption
                  ]}
                  onPress={() => handleSensitivitySelect(item.value)}
                >
                  <Text
                    style={[
                      themedStyles.thresholdOptionText,
                      item.value === settings.sensitivityLevel && themedStyles.selectedOptionText
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === settings.sensitivityLevel && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={themedStyles.separator} />}
            />

            <Text style={themedStyles.modalDescription}>
              High sensitivity detects even small movements but may trigger false positives. Low sensitivity is more conservative but might miss subtle activity.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Background Persistence Selection Modal */}
      <Modal
        visible={showPersistenceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPersistenceModal(false)}
      >
        <View style={themedStyles.modalOverlay}>
          <View style={themedStyles.modalContent}>
            <View style={themedStyles.modalHeader}>
              <Text style={themedStyles.modalTitle}>Select Background Persistence</Text>
              <TouchableOpacity onPress={() => setShowPersistenceModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={PERSISTENCE_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    themedStyles.thresholdOption,
                    item.value === settings.backgroundPersistence && themedStyles.selectedOption
                  ]}
                  onPress={() => handlePersistenceSelect(item.value)}
                >
                  <Text
                    style={[
                      themedStyles.thresholdOptionText,
                      item.value === settings.backgroundPersistence && themedStyles.selectedOptionText
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === settings.backgroundPersistence && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={themedStyles.separator} />}
            />

            <Text style={themedStyles.modalDescription}>
              Higher persistence improves accuracy but may use more battery. Maximum persistence works best on devices with battery optimization disabled.
            </Text>
          </View>
        </View>
      </Modal>
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