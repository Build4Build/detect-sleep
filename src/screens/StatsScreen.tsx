import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useSleep } from '../context/SleepContext';
import { formatDuration } from '../utils/dateUtils';
import { getPastWeekDates, getPastMonthDates, getDayOfWeek } from '../utils/dateUtils';
import { BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const StatsScreen = () => {
  const { dailySummaries } = useSleep();
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [averageSleep, setAverageSleep] = useState<number>(0);
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [{ data: [] }],
  });

  // Update chart data when time range or daily summaries change
  useEffect(() => {
    if (dailySummaries.length === 0) return;

    // Get date range based on selected time range
    const dateRange = timeRange === 'week' ? getPastWeekDates() : getPastMonthDates();

    // Map sleep data to dates
    const sleepData = dateRange.map(date => {
      const summary = dailySummaries.find(s => s.date === date);
      return summary ? summary.totalSleepMinutes / 60 : 0; // Convert to hours
    });

    // Calculate average sleep
    const totalSleep = sleepData.reduce((sum, hours) => sum + hours, 0);
    const avg = totalSleep / sleepData.filter(h => h > 0).length || 0;
    setAverageSleep(avg * 60); // Store in minutes for formatting

    // Format labels based on time range
    const labels = dateRange.map(date =>
      timeRange === 'week' ? getDayOfWeek(date) : date.slice(5) // MM-DD format for month
    );

    // Update chart data
    setChartData({
      labels,
      datasets: [{ data: sleepData }],
    });
  }, [timeRange, dailySummaries]);

  // Calculate sleep quality metrics
  const calculateSleepMetrics = () => {
    if (dailySummaries.length === 0) return { consistency: 0, efficiency: 0 };

    // Get date range
    const dateRange = timeRange === 'week' ? getPastWeekDates() : getPastMonthDates();

    // Filter summaries in the date range
    const filteredSummaries = dailySummaries.filter(
      summary => dateRange.includes(summary.date)
    );

    // Calculate sleep consistency (lower standard deviation is better)
    const sleepDurations = filteredSummaries.map(s => s.totalSleepMinutes / 60);
    const mean = sleepDurations.reduce((sum, val) => sum + val, 0) / sleepDurations.length;
    const variance = sleepDurations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sleepDurations.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to a 0-100 scale (lower stdDev is better consistency)
    const maxStdDev = 4; // 4 hours is considered high variability
    const consistency = Math.max(0, Math.min(100, 100 - (stdDev / maxStdDev) * 100));

    // Calculate sleep efficiency (percentage of days with good sleep)
    const goodSleepThreshold = 7 * 60; // 7 hours in minutes
    const daysWithGoodSleep = filteredSummaries.filter(s => s.totalSleepMinutes >= goodSleepThreshold).length;
    const efficiency = (daysWithGoodSleep / filteredSummaries.length) * 100;

    return { consistency, efficiency };
  };

  const metrics = calculateSleepMetrics();

  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 1,
  };

  // Ensure chartData has proper format for the chart library
  useEffect(() => {
    if (chartData.datasets[0].data.length > 0) {
      // Add color information for bars
      const colors = chartData.datasets[0].data.map((value: number) =>
        value >= 8 ? '#4CAF50' : // Good sleep (8+ hours)
          value >= 6 ? '#FFC107' : // Medium sleep (6-8 hours)
            '#F44336'                // Poor sleep (<6 hours)
      );

      setChartData({
        ...chartData,
        datasets: [{
          data: chartData.datasets[0].data,
          colors: colors
        }]
      });
    }
  }, [chartData.datasets[0].data]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sleep Statistics</Text>
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
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Average Sleep</Text>
        <Text style={styles.averageSleep}>{formatDuration(averageSleep)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sleep Duration</Text>
        {dailySummaries.length > 0 ? (
          <View>
            <BarChart
              data={chartData}
              width={width - 64}
              height={220}
              yAxisSuffix="h"
              yAxisLabel=""
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
                labelColor: () => '#333333',
                style: {
                  borderRadius: 8,
                },
                barPercentage: 0.7,
                propsForLabels: {
                  fontSize: 12,
                },
              }}
              style={styles.chart}
              showBarTops={true}
              fromZero={true}
              withInnerLines={true}
            />
            <Text style={styles.chartDescription}>
              Average sleep: {formatDuration(averageSleep)}
            </Text>
          </View>
        ) : (
          <Text style={styles.noDataText}>No sleep data available</Text>
        )}
      </View>

      <View style={styles.metricsContainer}>
        <View style={[styles.metricCard, { marginRight: 8 }]}>
          <Text style={styles.metricTitle}>Consistency</Text>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${metrics.consistency}%` },
                getProgressColor(metrics.consistency),
              ]}
            />
          </View>
          <Text style={styles.metricValue}>{Math.round(metrics.consistency)}%</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>Efficiency</Text>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${metrics.efficiency}%` },
                getProgressColor(metrics.efficiency),
              ]}
            />
          </View>
          <Text style={styles.metricValue}>{Math.round(metrics.efficiency)}%</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sleep Pattern</Text>
        <Text style={styles.patternDescription}>
          Based on your sleep data, you typically:
        </Text>
        {dailySummaries.length > 0 ? (
          <View style={styles.patternInfo}>
            <Text style={styles.patternText}>
              • Sleep an average of {formatDuration(averageSleep)} per night
            </Text>
            <Text style={styles.patternText}>
              • Have a sleep consistency of {Math.round(metrics.consistency)}%
            </Text>
            <Text style={styles.patternText}>
              • Achieve good sleep {Math.round(metrics.efficiency)}% of the time
            </Text>
          </View>
        ) : (
          <Text style={styles.noDataText}>No sleep data available</Text>
        )}
      </View>
    </ScrollView>
  );
};

// Helper function to get color based on value
const getProgressColor = (value: number) => {
  if (value >= 80) {
    return { backgroundColor: '#4CAF50' }; // Good
  } else if (value >= 60) {
    return { backgroundColor: '#FFC107' }; // Medium
  } else {
    return { backgroundColor: '#F44336' }; // Poor
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
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
  averageSleep: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6200ee',
    textAlign: 'center',
    marginVertical: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  chartPlaceholder: {
    height: 220,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  chartPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6200ee',
    marginBottom: 8,
  },
  chartDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  chartNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 0,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
  },
  patternDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  patternInfo: {
    marginTop: 8,
  },
  patternText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
});

export default StatsScreen; 