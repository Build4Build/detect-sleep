import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

import { useSleep } from '../context/SleepContext';
import { useTheme } from '../context/ThemeContext';
import { formatDuration } from '../utils/dateUtils';
import { getPastWeekDates, getPastMonthDates, getDayOfWeek } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

const StatsScreen = () => {
  const { dailySummaries } = useSleep();
  const { colors, isDarkMode } = useTheme();
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [averageSleep, setAverageSleep] = useState<number>(0);
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [{ data: [] }],
  });

  // Create themed styles
  const themedStyles = createThemedStyles(colors);

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
    const labels = dateRange.map((date, index) => {
      if (timeRange === 'week') {
        return getDayOfWeek(date);
      } else {
        // For month view, show labels more strategically to avoid overcrowding
        // Show labels for first day, last day, and every 5th day
        if (index === 0 || index === dateRange.length - 1 || index % 5 === 0) {
          // Show only day number for better readability
          const dayNum = date.slice(-2); // Get DD from YYYY-MM-DD
          return dayNum.startsWith('0') ? dayNum.slice(1) : dayNum; // Remove leading zero
        } else {
          return ''; // Empty label for intermediate days
        }
      }
    });

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

  // Get custom colors based on sleep quality
  const getBarColor = (value: number, opacity = 1) => {
    if (value >= 8) return `rgba(76, 175, 80, ${opacity})`; // Good sleep (green)
    if (value >= 6) return `rgba(255, 193, 7, ${opacity})`; // Medium sleep (yellow)
    return `rgba(244, 67, 54, ${opacity})`; // Poor sleep (red)
  };

  // Chart configuration with custom color function
  const chartConfig = {
    backgroundGradientFrom: colors.chartBackground,
    backgroundGradientTo: colors.chartBackground,
    color: (opacity = 1, dataPointIndex?: number) => {
      // If we have a data point index, use custom colors based on sleep hours
      if (dataPointIndex !== undefined && chartData.datasets[0]?.data[dataPointIndex] !== undefined) {
        const sleepHours = chartData.datasets[0].data[dataPointIndex];
        return getBarColor(sleepHours, opacity);
      }
      // Default color for other chart elements
      return colors.primary;
    },
    labelColor: () => colors.text,
    strokeWidth: 2,
    barPercentage: timeRange === 'week' ? 0.7 : 0.5, // Thinner bars for month view
    useShadowColorFromDataset: false,
    decimalPlaces: 1,
    style: {
      borderRadius: 8,
    },
    propsForLabels: {
      fontSize: timeRange === 'week' ? 12 : 10, // Smaller font for month view
    },
    formatXLabel: (value: string) => {
      // For month view, ensure we don't show overlapping labels
      if (timeRange === 'month' && value === '') {
        return '';
      }
      return value;
    },
  };

  // Enhanced chart data with proper structure
  const enhancedChartData = {
    labels: chartData.labels,
    datasets: [{
      data: chartData.datasets[0].data,
      // Add colors array for fallback support
      colors: chartData.datasets[0].data.map((value: number, index: number) =>
        (opacity = 1) => getBarColor(value, opacity)
      )
    }]
  };

  return (
    <ScrollView style={themedStyles.container}>
      <View style={themedStyles.header}>
        <Text style={themedStyles.title}>Sleep Statistics</Text>
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
        </View>
      </View>

      <View style={themedStyles.card}>
        <Text style={themedStyles.cardTitle}>Average Sleep</Text>
        <Text style={themedStyles.averageSleep}>{formatDuration(averageSleep)}</Text>
      </View>

      <View style={themedStyles.card}>
        <Text style={themedStyles.cardTitle}>Sleep Duration</Text>
        {enhancedChartData.datasets[0].data.length > 0 ? (
          <View>
            <BarChart
              data={enhancedChartData}
              width={width - 64}
              height={220}
              yAxisSuffix="h"
              yAxisLabel=""
              chartConfig={chartConfig}
              style={themedStyles.chart}
              showBarTops={true}
              fromZero={true}
              withInnerLines={true}
            />
            <Text style={themedStyles.chartDescription}>
              Average sleep: {formatDuration(averageSleep)}
              {timeRange === 'month' && (
                <Text style={themedStyles.chartNote}>
                  {'\n'}Numbers shown represent key days of the month
                </Text>
              )}
            </Text>

            {/* Color legend */}
            <View style={themedStyles.legendContainer}>
              <View style={themedStyles.legendItem}>
                <View style={[themedStyles.legendColor, { backgroundColor: '#4CAF50' }]} />
                <Text style={themedStyles.legendText}>Good (8+ hours)</Text>
              </View>
              <View style={themedStyles.legendItem}>
                <View style={[themedStyles.legendColor, { backgroundColor: '#FFC107' }]} />
                <Text style={themedStyles.legendText}>Fair (6-8 hours)</Text>
              </View>
              <View style={themedStyles.legendItem}>
                <View style={[themedStyles.legendColor, { backgroundColor: '#F44336' }]} />
                <Text style={themedStyles.legendText}>Poor (under 6h)</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={themedStyles.noDataText}>No sleep data available</Text>
        )}
      </View>

      <View style={themedStyles.metricsContainer}>
        <View style={[themedStyles.metricCard, { marginRight: 8 }]}>
          <Text style={themedStyles.metricTitle}>Consistency</Text>
          <View style={themedStyles.progressContainer}>
            <View
              style={[
                themedStyles.progressBar,
                { width: `${metrics.consistency}%` },
                getProgressColor(metrics.consistency),
              ]}
            />
          </View>
          <Text style={themedStyles.metricValue}>{Math.round(metrics.consistency)}%</Text>
        </View>

        <View style={themedStyles.metricCard}>
          <Text style={themedStyles.metricTitle}>Efficiency</Text>
          <View style={themedStyles.progressContainer}>
            <View
              style={[
                themedStyles.progressBar,
                { width: `${metrics.efficiency}%` },
                getProgressColor(metrics.efficiency),
              ]}
            />
          </View>
          <Text style={themedStyles.metricValue}>{Math.round(metrics.efficiency)}%</Text>
        </View>
      </View>

      <View style={themedStyles.card}>
        <Text style={themedStyles.cardTitle}>Sleep Pattern</Text>
        <Text style={themedStyles.patternDescription}>
          Based on your sleep data, you typically:
        </Text>
        {dailySummaries.length > 0 ? (
          <View style={themedStyles.patternInfo}>
            <Text style={themedStyles.patternText}>
              • Sleep an average of {formatDuration(averageSleep)} per night
            </Text>
            <Text style={themedStyles.patternText}>
              • Have a sleep consistency of {Math.round(metrics.consistency)}%
            </Text>
            <Text style={themedStyles.patternText}>
              • Achieve good sleep {Math.round(metrics.efficiency)}% of the time
            </Text>
          </View>
        ) : (
          <Text style={themedStyles.noDataText}>No sleep data available</Text>
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

// Themed styles
const createThemedStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
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
      backgroundColor: colors.card,
    },
    activeFilter: {
      backgroundColor: colors.primary,
    },
    filterText: {
      color: colors.textSecondary,
      fontWeight: '500',
    },
    activeFilterText: {
      color: colors.card,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      margin: 16,
      shadowColor: colors.shadow,
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
    averageSleep: {
      fontSize: 36,
      fontWeight: 'bold',
      color: colors.primary,
      textAlign: 'center',
      marginVertical: 16,
    },
    chart: {
      marginVertical: 8,
      borderRadius: 8,
    },
    chartPlaceholder: {
      height: 220,
      backgroundColor: colors.card,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    chartPlaceholderText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 8,
    },
    chartDescription: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
    },
    legendContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 2,
      marginRight: 6,
    },
    legendText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    chartNote: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    noDataText: {
      textAlign: 'center',
      color: colors.textSecondary,
      padding: 16,
    },
    metricsContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 0,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    metricTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    progressContainer: {
      height: 8,
      backgroundColor: colors.border,
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
      color: colors.text,
      textAlign: 'center',
      marginTop: 8,
    },
    patternDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    patternInfo: {
      marginTop: 8,
    },
    patternText: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 8,
    },
  });

export default StatsScreen;