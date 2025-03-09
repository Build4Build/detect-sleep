import React from 'react';
import { getWidgetAsync, Widget, WidgetPreviewProvider } from 'expo-widgets';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { SleepStatus, DailySleepSummary } from '../types';

// Storage keys (matching the ones used in SleepContext)
const ACTIVITY_RECORDS_KEY = 'sleep-tracker-activity-records';
const DAILY_SUMMARIES_KEY = 'sleep-tracker-daily-summaries';

// Format minutes to hours and minutes (simplified version from dateUtils)
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

// Widget Component
export const SleepStatsWidget = async () => {
  try {
    // Get today's date in the format stored in the app
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Load sleep data from storage
    const summariesJson = await AsyncStorage.getItem(DAILY_SUMMARIES_KEY);
    const activityRecordsJson = await AsyncStorage.getItem(ACTIVITY_RECORDS_KEY);
    
    let sleepDuration = 0;
    let currentStatus = SleepStatus.AWAKE;
    
    if (summariesJson) {
      const summaries: DailySleepSummary[] = JSON.parse(summariesJson);
      const todaySummary = summaries.find(summary => summary.date === today);
      
      if (todaySummary) {
        sleepDuration = todaySummary.totalSleepMinutes;
      }
    }
    
    if (activityRecordsJson) {
      const records = JSON.parse(activityRecordsJson);
      if (records.length > 0) {
        // Get the most recent status
        const latestRecord = records.sort((a, b) => b.timestamp - a.timestamp)[0];
        currentStatus = latestRecord.status;
      }
    }
    
    return (
      <Widget
        title="Sleep Detector"
        subtitle="Today's Stats"
        accessibility={{
          label: `Sleep Detector. Today's sleep: ${formatDuration(sleepDuration)}. Current status: ${currentStatus === SleepStatus.AWAKE ? 'Awake' : 'Asleep'}.`,
        }}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Sleep Detector</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <View style={styles.statusContainer}>
              <View 
                style={[
                  styles.statusIndicator, 
                  { backgroundColor: currentStatus === SleepStatus.AWAKE ? '#4CAF50' : '#2196F3' }
                ]} 
              />
              <Text style={styles.statusText}>
                {currentStatus === SleepStatus.AWAKE ? 'Awake' : 'Asleep'}
              </Text>
            </View>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Today's Sleep:</Text>
            <Text style={styles.value}>{formatDuration(sleepDuration)}</Text>
          </View>
        </View>
      </Widget>
    );
  } catch (error) {
    console.error('Widget error:', error);
    
    // Fallback widget in case of error
    return (
      <Widget
        title="Sleep Detector"
        subtitle="Widget Error"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Sleep Detector</Text>
          <Text style={styles.errorText}>Unable to load sleep data</Text>
          <Text style={styles.errorSubtext}>Tap to open app</Text>
        </View>
      </Widget>
    );
  }
};

// Widget Preview for development
export const SleepStatsWidgetPreview = () => (
  <WidgetPreviewProvider>
    <View style={styles.container}>
      <Text style={styles.title}>Sleep Detector</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>Status:</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.statusText}>Awake</Text>
        </View>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Today's Sleep:</Text>
        <Text style={styles.value}>7h 30m</Text>
      </View>
    </View>
  </WidgetPreviewProvider>
);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    textAlign: 'center',
    marginVertical: 8,
  },
  errorSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

// Register widget with Expo
export const registerWidget = async () => {
  await getWidgetAsync('SleepStatsWidget').then(widget => {
    widget.setUpdatePeriod(30 * 60); // Update every 30 minutes
    widget.register(SleepStatsWidget);
  });
}; 