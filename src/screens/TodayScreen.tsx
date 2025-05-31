import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, SleepStatus } from '../types';
import { useSleep } from '../context/SleepContext';
import { formatTime, formatDuration } from '../utils/dateUtils';

type TodayScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Sleep tips for better sleep
const SLEEP_TIPS = [
  "Keep a consistent sleep schedule, even on weekends",
  "Avoid caffeine and alcohol close to bedtime",
  "Create a relaxing bedtime routine to wind down",
  "Ensure your bedroom is quiet, dark, and cool",
  "Limit screen time at least 1 hour before bed",
  "Regular exercise can help you fall asleep faster",
  "Avoid large meals and beverages late at night",
  "Try relaxation techniques like deep breathing",
  "Limit daytime naps to 30 minutes or less",
  "If you can't sleep, get up and do something relaxing",
  "Consider using a white noise machine to block disturbances",
  "Keep your sleep environment free from electronic devices",
];

const TodayScreen = () => {
  const navigation = useNavigation<TodayScreenNavigationProp>();
  const { 
    currentStatus, 
    currentConfidence, 
    todayRecords, 
    getTodaySleepDuration,
    manuallySetStatus
  } = useSleep();
  const [dailyTip, setDailyTip] = useState('');
  const [greeting, setGreeting] = useState('');
  
  // Calculate sleep duration for today
  const sleepDuration = getTodaySleepDuration();
  
  // Get today's date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      setGreeting('Good morning');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
    
    // Get a random sleep tip
    const randomIndex = Math.floor(Math.random() * SLEEP_TIPS.length);
    setDailyTip(SLEEP_TIPS[randomIndex]);
  }, []);
  
  // Navigate to settings
  const goToSettings = () => {
    navigation.navigate('Settings');
  };
  
  // Get sleep quality assessment
  const getSleepQualityText = () => {
    if (sleepDuration >= 480) { // 8+ hours
      return { text: 'Excellent', color: '#4CAF50' };
    } else if (sleepDuration >= 420) { // 7+ hours
      return { text: 'Good', color: '#8BC34A' };
    } else if (sleepDuration >= 360) { // 6+ hours
      return { text: 'Adequate', color: '#FFC107' };
    } else if (sleepDuration >= 300) { // 5+ hours
      return { text: 'Poor', color: '#FF9800' };
    } else {
      return { text: 'Insufficient', color: '#F44336' };
    }
  };
  
  // Handle manual status override
  const handleStatusOverride = () => {
    Alert.alert(
      'Override Sleep Status',
      'Would you like to manually set your current status?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'I\'m Awake',
          onPress: () => manuallySetStatus(SleepStatus.AWAKE),
        },
        {
          text: 'I\'m Asleep',
          onPress: () => manuallySetStatus(SleepStatus.ASLEEP),
        },
      ]
    );
  };
  
  const sleepQuality = getSleepQualityText();
  
  // Get color for confidence level
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#4CAF50'; // High confidence - green
    if (confidence >= 60) return '#FFC107'; // Medium confidence - yellow
    return '#F44336'; // Low confidence - red
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
        <TouchableOpacity onPress={goToSettings} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#6200ee" />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.statusCard}
        onPress={handleStatusOverride}
        activeOpacity={0.8}
      >
        <View style={styles.statusHeader}>
          <Text style={styles.statusLabel}>Current Status</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={handleStatusOverride}
          >
            <Ionicons name="pencil-outline" size={16} color="#6200ee" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusContainer}>
          <View 
            style={[
              styles.statusIndicator, 
              { backgroundColor: currentStatus === 'awake' ? '#4CAF50' : '#2196F3' }
            ]} 
          />
          <Text style={styles.statusText}>
            {currentStatus === 'awake' ? 'Awake' : 'Asleep'}
          </Text>
        </View>
        
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Detection Confidence:</Text>
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill, 
                { 
                  width: `${currentConfidence}%`,
                  backgroundColor: getConfidenceColor(currentConfidence)
                }
              ]} 
            />
          </View>
          <Text style={[
            styles.confidenceValue,
            { color: getConfidenceColor(currentConfidence) }
          ]}>
            {currentConfidence}%
          </Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.sleepCard}>
        <Text style={styles.cardTitle}>Today's Sleep</Text>
        <View style={styles.sleepInfo}>
          <Ionicons name="bed-outline" size={40} color="#6200ee" />
          <View style={styles.sleepDataContainer}>
            <Text style={styles.sleepDuration}>{formatDuration(sleepDuration)}</Text>
            <View style={styles.qualityContainer}>
              <Text style={styles.qualityLabel}>Quality:</Text>
              <Text style={[styles.qualityValue, { color: sleepQuality.color }]}>
                {sleepQuality.text}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.activityCard}>
        <Text style={styles.cardTitle}>Activity Timeline</Text>
        {todayRecords.length === 0 ? (
          <Text style={styles.noActivity}>No activity recorded yet today</Text>
        ) : (
          <View style={styles.timeline}>
            {todayRecords.map((record, index) => (
              <View key={record.id} style={styles.timelineItem}>
                <View 
                  style={[
                    styles.timelineDot, 
                    { backgroundColor: record.status === 'awake' ? '#4CAF50' : '#2196F3' }
                  ]} 
                />
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineTime}>{formatTime(record.timestamp)}</Text>
                    <Text style={[
                      styles.timelineConfidence,
                      { color: getConfidenceColor(record.confidence) }
                    ]}>
                      {record.confidence}% confident
                    </Text>
                  </View>
                  <Text style={styles.timelineStatus}>
                    {record.status === 'awake' ? 'Woke up' : 'Fell asleep'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
      
      <View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Ionicons name="bulb-outline" size={24} color="#FFC107" />
          <Text style={styles.tipTitle}>Daily Sleep Tip</Text>
        </View>
        <Text style={styles.tipText}>{dailyTip}</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => navigation.navigate('Export')}
        >
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Export Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => navigation.navigate('History')}
        >
          <Ionicons name="calendar-outline" size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Sleep History</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#666',
  },
  settingsButton: {
    padding: 8,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editText: {
    fontSize: 14,
    color: '#6200ee',
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  confidenceContainer: {
    marginTop: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  sleepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  sleepInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sleepDataContainer: {
    marginLeft: 16,
  },
  sleepDuration: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  qualityLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  qualityValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noActivity: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
  },
  timeline: {
    paddingTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  timelineConfidence: {
    fontSize: 12,
    fontWeight: '500',
  },
  timelineStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tipCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
    marginTop: 8,
  },
  exportButton: {
    backgroundColor: '#6200ee',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    flex: 1,
    marginRight: 8,
  },
  historyButton: {
    backgroundColor: '#03A9F4',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    flex: 1,
    marginLeft: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  }
});

export default TodayScreen; 