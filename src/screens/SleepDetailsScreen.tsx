import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { useSleep } from '../context/SleepContext';
import { formatTime, formatDuration, formatDate } from '../utils/dateUtils';
import { parseISO } from 'date-fns';

type SleepDetailsScreenRouteProp = RouteProp<RootStackParamList, 'SleepDetails'>;

interface SleepDetailsScreenProps {
  route: SleepDetailsScreenRouteProp;
}

const SleepDetailsScreen = ({ route }: SleepDetailsScreenProps) => {
  const { date } = route.params;
  const { dailySummaries } = useSleep();
  
  // Find the sleep summary for the selected date
  const sleepSummary = dailySummaries.find(summary => summary.date === date);
  
  if (!sleepSummary) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No sleep data available for this date</Text>
      </View>
    );
  }
  
  // Format the date for display
  const formattedDate = formatDate(parseISO(date).getTime());
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.date}>{formattedDate}</Text>
        <Text style={styles.totalSleep}>
          Total Sleep: {formatDuration(sleepSummary.totalSleepMinutes)}
        </Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sleep Periods</Text>
        {sleepSummary.sleepPeriods.length === 0 ? (
          <Text style={styles.noPeriodsText}>No sleep periods recorded</Text>
        ) : (
          sleepSummary.sleepPeriods.map((period, index) => (
            <View key={index} style={styles.periodItem}>
              <View style={styles.periodHeader}>
                <Text style={styles.periodTitle}>Sleep Period {index + 1}</Text>
                <Text style={styles.periodDuration}>
                  {formatDuration((period.end - period.start) / (1000 * 60))}
                </Text>
              </View>
              
              <View style={styles.timeContainer}>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Fell Asleep</Text>
                  <Text style={styles.timeValue}>{formatTime(period.start)}</Text>
                </View>
                
                <View style={styles.timeSeparator} />
                
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Woke Up</Text>
                  <Text style={styles.timeValue}>{formatTime(period.end)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sleep Quality</Text>
        <View style={styles.qualityContainer}>
          {getSleepQualityInfo(sleepSummary.totalSleepMinutes)}
        </View>
      </View>
    </ScrollView>
  );
};

// Helper function to get sleep quality information
const getSleepQualityInfo = (totalSleepMinutes: number) => {
  // Determine sleep quality based on total sleep time
  if (totalSleepMinutes >= 480) { // 8 hours or more
    return (
      <>
        <Text style={[styles.qualityText, { color: '#4CAF50' }]}>Excellent</Text>
        <Text style={styles.qualityDescription}>
          You got 8+ hours of sleep, which is optimal for most adults.
        </Text>
      </>
    );
  } else if (totalSleepMinutes >= 420) { // 7 hours
    return (
      <>
        <Text style={[styles.qualityText, { color: '#8BC34A' }]}>Good</Text>
        <Text style={styles.qualityDescription}>
          You got 7+ hours of sleep, which is recommended for adults.
        </Text>
      </>
    );
  } else if (totalSleepMinutes >= 360) { // 6 hours
    return (
      <>
        <Text style={[styles.qualityText, { color: '#FFC107' }]}>Fair</Text>
        <Text style={styles.qualityDescription}>
          You got 6+ hours of sleep, which is adequate but not optimal.
        </Text>
      </>
    );
  } else if (totalSleepMinutes >= 300) { // 5 hours
    return (
      <>
        <Text style={[styles.qualityText, { color: '#FF9800' }]}>Poor</Text>
        <Text style={styles.qualityDescription}>
          You got 5+ hours of sleep, which is below recommended levels.
        </Text>
      </>
    );
  } else {
    return (
      <>
        <Text style={[styles.qualityText, { color: '#F44336' }]}>Very Poor</Text>
        <Text style={styles.qualityDescription}>
          You got less than 5 hours of sleep, which is insufficient for most adults.
        </Text>
      </>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#6200ee',
    padding: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  date: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  totalSleep: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
  noPeriodsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
  periodItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 16,
    marginBottom: 16,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  periodDuration: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6200ee',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeSeparator: {
    width: 20,
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  qualityContainer: {
    alignItems: 'center',
    padding: 16,
  },
  qualityText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  qualityDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SleepDetailsScreen; 