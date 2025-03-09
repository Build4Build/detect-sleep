import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useSleep } from '../context/SleepContext';
import { formatTime, formatDuration } from '../utils/dateUtils';

type TodayScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TodayScreen = () => {
  const navigation = useNavigation<TodayScreenNavigationProp>();
  const { currentStatus, todayRecords, getTodaySleepDuration } = useSleep();
  
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
  
  // Navigate to settings
  const goToSettings = () => {
    navigation.navigate('Settings');
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.date}>{formattedDate}</Text>
        <TouchableOpacity onPress={goToSettings} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#6200ee" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Current Status</Text>
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
      </View>
      
      <View style={styles.sleepCard}>
        <Text style={styles.cardTitle}>Today's Sleep</Text>
        <View style={styles.sleepInfo}>
          <Ionicons name="bed-outline" size={40} color="#6200ee" />
          <Text style={styles.sleepDuration}>{formatDuration(sleepDuration)}</Text>
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
                  <Text style={styles.timelineTime}>{formatTime(record.timestamp)}</Text>
                  <Text style={styles.timelineStatus}>
                    {record.status === 'awake' ? 'Woke up' : 'Fell asleep'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.exportButton}
        onPress={() => navigation.navigate('Export')}
      >
        <Ionicons name="share-outline" size={20} color="#fff" />
        <Text style={styles.exportButtonText}>Export Data</Text>
      </TouchableOpacity>
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
  date: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
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
  statusLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
    padding: 16,
  },
  sleepDuration: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6200ee',
    marginLeft: 16,
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
  timelineTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  timelineStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  exportButton: {
    backgroundColor: '#6200ee',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    margin: 16,
    marginTop: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default TodayScreen; 