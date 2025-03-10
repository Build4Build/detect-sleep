import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSleep } from '../context/SleepContext';
import { formatDuration } from '../utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define threshold options
const THRESHOLD_OPTIONS = [
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
];

const SettingsScreen = () => {
  const { settings, updateSettings } = useSleep();
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);
  const [useMachineLearning, setUseMachineLearning] = useState(settings.useMachineLearning);
  const [considerTimeOfDay, setConsiderTimeOfDay] = useState(settings.considerTimeOfDay);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  
  // Find the current threshold option
  const currentThresholdOption = THRESHOLD_OPTIONS.find(
    option => option.value === settings.inactivityThreshold
  ) || THRESHOLD_OPTIONS[1]; // Default to 45 min if not found
  
  // Handle threshold selection
  const handleThresholdSelect = (value: number) => {
    updateSettings({ inactivityThreshold: value });
    setShowThresholdModal(false);
  };
  
  // Handle notifications toggle
  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    updateSettings({ notificationsEnabled: value });
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
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sleep Detection</Text>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setShowThresholdModal(true)}
        >
          <View>
            <Text style={styles.settingLabel}>Inactivity Threshold</Text>
            <Text style={styles.settingDescription}>
              Time of inactivity before considered asleep
            </Text>
          </View>
          <View style={styles.dropdownValueContainer}>
            <Text style={styles.dropdownValue}>{currentThresholdOption.label}</Text>
            <Ionicons name="chevron-down" size={20} color="#6200ee" />
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accuracy Settings</Text>
        <View style={styles.settingItem}>
          <View style={styles.switchContainer}>
            <Text style={styles.settingLabel}>Enhanced Detection</Text>
            <Switch
              value={useMachineLearning}
              onValueChange={handleMachineLearningToggle}
              trackColor={{ false: '#e0e0e0', true: '#b39ddb' }}
              thumbColor={useMachineLearning ? '#6200ee' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.settingDescription}>
            Learn from your sleep patterns to improve accuracy
          </Text>
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.switchContainer}>
            <Text style={styles.settingLabel}>Consider Time of Day</Text>
            <Switch
              value={considerTimeOfDay}
              onValueChange={handleTimeOfDayToggle}
              trackColor={{ false: '#e0e0e0', true: '#b39ddb' }}
              thumbColor={considerTimeOfDay ? '#6200ee' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.settingDescription}>
            Factor in typical sleep hours for better detection
          </Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingItem}>
          <View style={styles.switchContainer}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: '#e0e0e0', true: '#b39ddb' }}
              thumbColor={notificationsEnabled ? '#6200ee' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.settingDescription}>
            Receive notifications about your sleep patterns
          </Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display</Text>
        <View style={styles.settingItem}>
          <View style={styles.switchContainer}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Switch
              value={false}
              onValueChange={() => Alert.alert('Coming Soon', 'Dark mode will be available in the next update!')}
              trackColor={{ false: '#e0e0e0', true: '#b39ddb' }}
              thumbColor={'#f4f3f4'}
            />
          </View>
          <Text style={styles.settingDescription}>
            Switch between light and dark themes (coming soon)
          </Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        <TouchableOpacity style={styles.dataButton} onPress={resetSleepData}>
          <Ionicons name="refresh-outline" size={20} color="#FF9800" />
          <Text style={[styles.buttonText, { color: '#FF9800' }]}>Reset Sleep Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.dataButton, styles.deleteButton]} onPress={clearAllData}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutContainer}>
          <Text style={styles.appName}>Sleep Detector</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            Track your sleep patterns based on phone usage
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Inactivity Threshold</Text>
              <TouchableOpacity onPress={() => setShowThresholdModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={THRESHOLD_OPTIONS}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.thresholdOption,
                    item.value === settings.inactivityThreshold && styles.selectedOption
                  ]}
                  onPress={() => handleThresholdSelect(item.value)}
                >
                  <Text 
                    style={[
                      styles.thresholdOptionText,
                      item.value === settings.inactivityThreshold && styles.selectedOptionText
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === settings.inactivityThreshold && (
                    <Ionicons name="checkmark" size={20} color="#6200ee" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
            
            <Text style={styles.modalDescription}>
              This is how long your phone needs to be inactive before Sleep Detector considers you asleep.
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
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
    marginTop: 4,
    marginBottom: 12,
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
  appDescription: {
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
  },
  dropdownValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6200ee',
    marginRight: 4,
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
});

export default SettingsScreen; 