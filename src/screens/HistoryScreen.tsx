import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useSleep } from '../context/SleepContext';
import { formatDuration } from '../utils/dateUtils';
import { format, parseISO } from 'date-fns';

type HistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HistoryScreen = () => {
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const { dailySummaries } = useSleep();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  
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
        style={styles.dayItem}
        onPress={() => viewSleepDetails(item.date)}
      >
        <View style={styles.dayHeader}>
          <View style={styles.dayInfo}>
            <Text style={styles.dayName}>{dayName}</Text>
            <Text style={styles.monthDay}>{monthDay}</Text>
          </View>
          <Text style={styles.sleepDuration}>
            {formatDuration(item.totalSleepMinutes)}
          </Text>
        </View>
        
        <View style={styles.sleepPeriods}>
          {item.sleepPeriods.map((period: any, index: number) => (
            <View key={index} style={styles.periodItem}>
              <Text style={styles.periodTime}>
                {format(period.start, 'h:mm a')} - {format(period.end, 'h:mm a')}
              </Text>
              <Text style={styles.periodDuration}>
                {formatDuration((period.end - period.start) / (1000 * 60))}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, timeRange === 'week' && styles.activeFilter]}
          onPress={() => setTimeRange('week')}
        >
          <Text style={[styles.filterText, timeRange === 'week' && styles.activeFilterText]}>
            Week
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, timeRange === 'month' && styles.activeFilter]}
          onPress={() => setTimeRange('month')}
        >
          <Text style={[styles.filterText, timeRange === 'month' && styles.activeFilterText]}>
            Month
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, timeRange === 'all' && styles.activeFilter]}
          onPress={() => setTimeRange('all')}
        >
          <Text style={[styles.filterText, timeRange === 'all' && styles.activeFilterText]}>
            All
          </Text>
        </TouchableOpacity>
      </View>
      
      {filteredSummaries().length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No sleep data available</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSummaries()}
          renderItem={renderDayItem}
          keyExtractor={item => item.date}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: '#6200ee',
  },
  filterText: {
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  dayItem: {
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
    color: '#333',
    marginRight: 8,
  },
  monthDay: {
    fontSize: 16,
    color: '#666',
  },
  sleepDuration: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  sleepPeriods: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  periodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  periodTime: {
    fontSize: 14,
    color: '#333',
  },
  periodDuration: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default HistoryScreen; 