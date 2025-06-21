import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { useSleep } from '../context/SleepContext';
import { useTheme } from '../context/ThemeContext';
import { formatTime, formatDuration, formatDate } from '../utils/dateUtils';
import { parseISO } from 'date-fns';

type SleepDetailsScreenRouteProp = RouteProp<RootStackParamList, 'SleepDetails'>;

interface SleepDetailsScreenProps {
  route: SleepDetailsScreenRouteProp;
}

const SleepDetailsScreen = ({ route }: SleepDetailsScreenProps) => {
  const { date } = route.params;
  const { dailySummaries } = useSleep();
  const { colors } = useTheme();
  
  // Create themed styles
  const themedStyles = createThemedStyles(colors);

  // Find the sleep summary for the selected date
  const sleepSummary = dailySummaries.find(summary => summary.date === date);
  
  if (!sleepSummary) {
    return (
      <View style={themedStyles.container}>
        <Text style={themedStyles.noDataText}>No sleep data available for this date</Text>
      </View>
    );
  }
  
  // Format the date for display
  const formattedDate = formatDate(parseISO(date).getTime());
  
  return (
    <ScrollView style={themedStyles.container}>
      <View style={themedStyles.header}>
        <Text style={themedStyles.date}>{formattedDate}</Text>
        <Text style={themedStyles.totalSleep}>
          Total Sleep: {formatDuration(sleepSummary.totalSleepMinutes)}
        </Text>
      </View>
      
      <View style={themedStyles.card}>
        <Text style={themedStyles.cardTitle}>Sleep Periods</Text>
        {sleepSummary.sleepPeriods.length === 0 ? (
          <Text style={themedStyles.noPeriodsText}>No sleep periods recorded</Text>
        ) : (
          sleepSummary.sleepPeriods.map((period, index) => (
            <View key={index} style={themedStyles.periodItem}>
              <View style={themedStyles.periodHeader}>
                <Text style={themedStyles.periodTitle}>Sleep Period {index + 1}</Text>
                <Text style={themedStyles.periodDuration}>
                  {formatDuration((period.end - period.start) / (1000 * 60))}
                </Text>
              </View>
              
              <View style={themedStyles.timeContainer}>
                <View style={themedStyles.timeItem}>
                  <Text style={themedStyles.timeLabel}>Fell Asleep</Text>
                  <Text style={themedStyles.timeValue}>{formatTime(period.start)}</Text>
                </View>
                
                <View style={themedStyles.timeSeparator} />
                
                <View style={themedStyles.timeItem}>
                  <Text style={themedStyles.timeLabel}>Woke Up</Text>
                  <Text style={themedStyles.timeValue}>{formatTime(period.end)}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
      
      <View style={themedStyles.card}>
        <Text style={themedStyles.cardTitle}>Sleep Quality</Text>
        <View style={themedStyles.qualityContainer}>
          {getSleepQualityInfo(sleepSummary.totalSleepMinutes, colors)}
        </View>
      </View>
    </ScrollView>
  );
};

// Helper function to get sleep quality information
const getSleepQualityInfo = (totalSleepMinutes: number, colors: any) => {
  // Determine sleep quality based on total sleep time
  if (totalSleepMinutes >= 480) { // 8 hours or more
    return (
      <>
        <Text style={[{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }, { color: colors.success }]}>Excellent</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          You got 8+ hours of sleep, which is optimal for most adults.
        </Text>
      </>
    );
  } else if (totalSleepMinutes >= 420) { // 7 hours
    return (
      <>
        <Text style={[{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }, { color: '#8BC34A' }]}>Good</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          You got 7+ hours of sleep, which is recommended for adults.
        </Text>
      </>
    );
  } else if (totalSleepMinutes >= 360) { // 6 hours
    return (
      <>
        <Text style={[{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }, { color: colors.warning }]}>Fair</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          You got 6+ hours of sleep, which is adequate but not optimal.
        </Text>
      </>
    );
  } else if (totalSleepMinutes >= 300) { // 5 hours
    return (
      <>
        <Text style={[{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }, { color: '#FF9800' }]}>Poor</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          You got 5+ hours of sleep, which is below recommended levels.
        </Text>
      </>
    );
  } else {
    return (
      <>
        <Text style={[{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }, { color: colors.error }]}>Very Poor</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          You got less than 5 hours of sleep, which is insufficient for most adults.
        </Text>
      </>
    );
  }
};

const createThemedStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
  noPeriodsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: 16,
  },
  periodItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.text,
  },
  periodDuration: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
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
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
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
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SleepDetailsScreen;