import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useSleep } from '../context/SleepContext';
import { useTheme } from '../context/ThemeContext';
import { formatDuration } from '../utils/dateUtils';
import { format, parseISO } from 'date-fns';

type HistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HistoryScreen = () => {
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const { dailySummaries } = useSleep();
  const { colors } = useTheme();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  
  // Create themed styles
  const themedStyles = createThemedStyles(colors);
  
  // Filter summaries based on selected time range
  const filteredSummaries = () => {
    const sortedSummaries = [...dailySummaries].sort(
      (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()
    );
    
    if (timeRange === 'all') {
      return sortedSummaries;
    }
    
    const now = new Date();
    const cutoffDate = new Date();
    
    if (timeRange === 'week') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      cutoffDate.setDate(now.getDate() - 30);
    }
    
    return sortedSummaries.filter(
      summary => parseISO(summary.date).getTime() >= cutoffDate.getTime()
    );
  };
  
  // Navigate to sleep details screen
  const viewSleepDetails = (date: string) => {
    navigation.navigate('SleepDetails', { date });
  };
  
  // Render a day item
  const renderDayItem = ({ item }: { item: any }) => {
    const date = parseISO(item.date);
    const dayName = format(date, 'EEE');
    const monthDay = format(date, 'MMM d');
    
    return (
      <TouchableOpacity 
        style={themedStyles.dayItem}
        onPress={() => viewSleepDetails(item.date)}
      >
        <View style={themedStyles.dayHeader}>
          <View style={themedStyles.dayInfo}>
            <Text style={themedStyles.dayName}>{dayName}</Text>
            <Text style={themedStyles.monthDay}>{monthDay}</Text>
          </View>
          <Text style={themedStyles.sleepDuration}>
            {formatDuration(item.totalSleepMinutes)}
          </Text>
        </View>
        
        <View style={themedStyles.sleepPeriods}>
          {item.sleepPeriods.map((period: any, index: number) => (
            <View key={index} style={themedStyles.periodItem}>
              <Text style={themedStyles.periodTime}>
                {format(period.start, 'h:mm a')} - {format(period.end, 'h:mm a')}
              </Text>
              <Text style={themedStyles.periodDuration}>
                {formatDuration((period.end - period.start) / (1000 * 60))}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.filterContainer}>
        <TouchableOpacity
          style={[themedStyles.filterButton, timeRange === 'week' && themedStyles.activeFilter]}
          onPress={() => setTimeRange('week')}
        >
          <Text style={[themedStyles.filterText, timeRange === 'week' && themedStyles.activeFilterText]}>
            Week
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[themedStyles.filterButton, timeRange === 'month' && themedStyles.activeFilter]}
          onPress={() => setTimeRange('month')}
        >
          <Text style={[themedStyles.filterText, timeRange === 'month' && themedStyles.activeFilterText]}>
            Month
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[themedStyles.filterButton, timeRange === 'all' && themedStyles.activeFilter]}
          onPress={() => setTimeRange('all')}
        >
          <Text style={[themedStyles.filterText, timeRange === 'all' && themedStyles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
      </View>
      
      {filteredSummaries().length === 0 ? (
        <View style={themedStyles.emptyContainer}>
          <Text style={themedStyles.emptyText}>No sleep data available</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSummaries()}
          renderItem={renderDayItem}
          keyExtractor={item => item.date}
          contentContainerStyle={themedStyles.listContent}
        />
      )}
    </View>
  );
};

// Create themed styles function
const createThemedStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  dayItem: {
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
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  monthDay: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  sleepDuration: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  sleepPeriods: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  periodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  periodTime: {
    fontSize: 14,
    color: colors.text,
  },
  periodDuration: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default HistoryScreen;