import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, SleepStatus } from '../types';
import { useSleep } from '../context/SleepContext';
import { useTheme } from '../context/ThemeContext';
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
  "Try mouth taping to promote nasal breathing during sleep",
  "Consider using blackout curtains to block light",
  "Use eye masks or earplugs if needed",
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
  const { colors, isDarkMode } = useTheme();
  const [dailyTip, setDailyTip] = useState('');
  const [greeting, setGreeting] = useState('');
  
  // Create themed styles
  const themedStyles = createThemedStyles(colors);
  
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
    <ScrollView style={themedStyles.container}>
      <View style={themedStyles.header}>
        <View>
          <Text style={themedStyles.greeting}>{greeting}</Text>
          <Text style={themedStyles.date}>{formattedDate}</Text>
        </View>
        <TouchableOpacity onPress={goToSettings} style={themedStyles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={themedStyles.statusCard}
        onPress={handleStatusOverride}
        activeOpacity={0.8}
      >
        <View style={themedStyles.statusHeader}>
          <Text style={themedStyles.statusLabel}>Current Status</Text>
          <TouchableOpacity 
            style={themedStyles.editButton}
            onPress={handleStatusOverride}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            <Text style={themedStyles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={themedStyles.statusContainer}>
          <View 
            style={[
              themedStyles.statusIndicator, 
              { backgroundColor: currentStatus === 'awake' ? '#4CAF50' : '#2196F3' }
            ]} 
          />
          <Text style={themedStyles.statusText}>
            {currentStatus === 'awake' ? 'Awake' : 'Asleep'}
          </Text>
        </View>
        
        <View style={themedStyles.confidenceContainer}>
          <Text style={themedStyles.confidenceLabel}>Detection Confidence:</Text>
          <View style={themedStyles.confidenceBar}>
            <View 
              style={[
                themedStyles.confidenceFill, 
                { 
                  width: `${currentConfidence}%`,
                  backgroundColor: getConfidenceColor(currentConfidence)
                }
              ]} 
            />
          </View>
          <Text style={[
            themedStyles.confidenceValue,
            { color: getConfidenceColor(currentConfidence) }
          ]}>
            {currentConfidence}%
          </Text>
        </View>
      </TouchableOpacity>
      
      <View style={themedStyles.sleepCard}>
        <Text style={themedStyles.cardTitle}>Today's Sleep</Text>
        <View style={themedStyles.sleepInfo}>
          <Ionicons name="bed-outline" size={40} color={colors.primary} />
          <View style={themedStyles.sleepDataContainer}>
            <Text style={themedStyles.sleepDuration}>{formatDuration(sleepDuration)}</Text>
            <View style={themedStyles.qualityContainer}>
              <Text style={themedStyles.qualityLabel}>Quality:</Text>
              <Text style={[themedStyles.qualityValue, { color: sleepQuality.color }]}>
                {sleepQuality.text}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={themedStyles.activityCard}>
        <Text style={themedStyles.cardTitle}>Activity Timeline</Text>
        {todayRecords.length === 0 ? (
          <Text style={themedStyles.noActivity}>No activity recorded yet today</Text>
        ) : (
          <View style={themedStyles.timeline}>
            {todayRecords.map((record, index) => (
              <View key={record.id} style={themedStyles.timelineItem}>
                <View 
                  style={[
                    themedStyles.timelineDot, 
                    { backgroundColor: record.status === 'awake' ? '#4CAF50' : '#2196F3' }
                  ]} 
                />
                <View style={themedStyles.timelineContent}>
                  <View style={themedStyles.timelineHeader}>
                    <Text style={themedStyles.timelineTime}>{formatTime(record.timestamp)}</Text>
                    <Text style={[
                      themedStyles.timelineConfidence,
                      { color: getConfidenceColor(record.confidence) }
                    ]}>
                      {record.confidence}% confident
                    </Text>
                  </View>
                  <Text style={themedStyles.timelineStatus}>
                    {record.status === 'awake' ? 'Woke up' : 'Fell asleep'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
      
      <View style={themedStyles.tipCard}>
        <View style={themedStyles.tipHeader}>
          <Ionicons name="bulb-outline" size={24} color="#FFC107" />
          <Text style={themedStyles.tipTitle}>Daily Sleep Tip</Text>
        </View>
        <Text style={themedStyles.tipText}>{dailyTip}</Text>
      </View>
      
      <View style={themedStyles.buttonContainer}>
        <TouchableOpacity 
          style={themedStyles.exportButton}
          onPress={() => navigation.navigate('Export')}
        >
          <Ionicons name="share-outline" size={20} color="#fff" />
          <Text style={themedStyles.exportButtonText}>Export Data</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={themedStyles.historyButton}
          onPress={() => navigation.navigate('History')}
        >
          <Ionicons name="calendar-outline" size={20} color="#fff" />
          <Text style={themedStyles.exportButtonText}>Sleep History</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Create themed styles function
const createThemedStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  settingsButton: {
    padding: 8,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: colors.text,
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
    color: colors.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editText: {
    fontSize: 14,
    color: colors.primary,
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
    color: colors.text,
  },
  confidenceContainer: {
    marginTop: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: colors.border,
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
    backgroundColor: colors.card,
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
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
    color: colors.primary,
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  qualityLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginRight: 8,
  },
  qualityValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noActivity: {
    textAlign: 'center',
    color: colors.textSecondary,
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
    color: colors.text,
  },
  timelineConfidence: {
    fontSize: 12,
    fontWeight: '500',
  },
  timelineStatus: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tipCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: colors.text,
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
    color: colors.text,
    marginLeft: 8,
  },
  tipText: {
    fontSize: 16,
    color: colors.text,
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
    backgroundColor: colors.primary,
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