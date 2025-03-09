import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useSleep } from '../context/SleepContext';
import { formatDuration } from '../utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const { settings, updateSettings } = useSleep();
  const [inactivityThreshold, setInactivityThreshold] = useState(settings.inactivityThreshold);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);
  
  // Handle inactivity threshold change
  const handleThresholdChange = (value: number) => {
    setInactivityThreshold(value);
  };
  
  // Handle inactivity threshold change complete
  const handleThresholdChangeComplete = (value: number) => {
    updateSettings({ inactivityThreshold: value });
  };
  
  // Handle notifications toggle
  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    updateSettings({ notificationsEnabled: value });
  };
  
  // Clear all data
  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all sleep data? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Data',
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
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sleep Detection</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Inactivity Threshold</Text>
            <Text style={styles.settingValue}>
              {formatDuration(inactivityThreshold)}
            </Text>
          </View>
          <Text style={styles.settingDescription}>
            Time of inactivity before considered asleep
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={15}
            maximumValue={120}
            step={5}
            value={inactivityThreshold}
            onValueChange={handleThresholdChange}
            onSlidingComplete={handleThresholdChangeComplete}
            minimumTrackTintColor="#6200ee"
            maximumTrackTintColor="#e0e0e0"
            thumbTintColor="#6200ee"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>15 min</Text>
            <Text style={styles.sliderLabel}>120 min</Text>
          </View>
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
        <Text style={styles.sectionTitle}>Data Management</Text>
        <TouchableOpacity style={styles.button} onPress={clearAllData}>
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
    </View>
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
  settingLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
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
});

export default SettingsScreen; 