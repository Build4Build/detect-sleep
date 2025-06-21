import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSleep } from '../context/SleepContext';
import { useTheme } from '../context/ThemeContext';
import { exportDataToJson, exportDataToCsv } from '../services/exportService';

const ExportScreen = () => {
  const { exportData, dailySummaries } = useSleep();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  // Create themed styles
  const themedStyles = createThemedStyles(colors);

  // Export data as JSON
  const handleExportJson = async () => {
    try {
      setLoading(true);
      const jsonData = await exportData();
      await exportDataToJson(jsonData);
      setLoading(false);
    } catch (error) {
      console.error('Error exporting JSON data:', error);
      Alert.alert('Export Error', 'Failed to export data. Please try again.');
      setLoading(false);
    }
  };
  
  // Export data as CSV
  const handleExportCsv = async () => {
    try {
      setLoading(true);
      const jsonData = await exportData();
      const parsedData = JSON.parse(jsonData);
      await exportDataToCsv(parsedData.dailySummaries, parsedData.activityRecords);
      setLoading(false);
    } catch (error) {
      console.error('Error exporting CSV data:', error);
      Alert.alert('Export Error', 'Failed to export data. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <View style={[themedStyles.container, { backgroundColor: colors.background }]}>
      <View style={themedStyles.header}>
        <Text style={[themedStyles.title, { color: colors.text }]}>Export Sleep Data</Text>
        <Text style={[themedStyles.description, { color: colors.text }]}>
          Export your sleep data to share or analyze in other applications.
        </Text>
      </View>
      
      <View style={themedStyles.card}>
        <Text style={[themedStyles.cardTitle, { color: colors.text }]}>Export Options</Text>
        
        <TouchableOpacity 
          style={themedStyles.exportOption}
          onPress={handleExportJson}
          disabled={loading}
        >
          <View style={themedStyles.optionIcon}>
            <Ionicons name="document-text-outline" size={24} color="#6200ee" />
          </View>
          <View style={themedStyles.optionContent}>
            <Text style={[themedStyles.optionTitle, { color: colors.text }]}>Export as JSON</Text>
            <Text style={[themedStyles.optionDescription, { color: colors.text }]}>
              Complete data in JSON format for backup or analysis
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#6200ee" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#999" />
          )}
        </TouchableOpacity>
        
        <View style={themedStyles.divider} />
        
        <TouchableOpacity 
          style={themedStyles.exportOption}
          onPress={handleExportCsv}
          disabled={loading}
        >
          <View style={themedStyles.optionIcon}>
            <Ionicons name="grid-outline" size={24} color="#6200ee" />
          </View>
          <View style={themedStyles.optionContent}>
            <Text style={[themedStyles.optionTitle, { color: colors.text }]}>Export as CSV</Text>
            <Text style={[themedStyles.optionDescription, { color: colors.text }]}>
              Spreadsheet format for easy viewing in Excel or Google Sheets
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#6200ee" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#999" />
          )}
        </TouchableOpacity>
      </View>
      
      <View style={themedStyles.statsCard}>
        <Text style={[themedStyles.cardTitle, { color: colors.text }]}>Data Summary</Text>
        <View style={themedStyles.statsRow}>
          <View style={themedStyles.statItem}>
            <Text style={[themedStyles.statValue, { color: colors.primary }]}>{dailySummaries.length}</Text>
            <Text style={[themedStyles.statLabel, { color: colors.text }]}>Days Tracked</Text>
          </View>
          
          <View style={themedStyles.statDivider} />
          
          <View style={themedStyles.statItem}>
            <Text style={[themedStyles.statValue, { color: colors.primary }]}>
              {dailySummaries.reduce((total, summary) => total + summary.sleepPeriods.length, 0)}
            </Text>
            <Text style={[themedStyles.statLabel, { color: colors.text }]}>Sleep Periods</Text>
          </View>
        </View>
      </View>
      
      <Text style={[themedStyles.privacyNote, { color: colors.text }]}>
        Your data is stored locally on your device and is only shared when you export it.
      </Text>
    </View>
  );
};

const createThemedStyles = (colors: any) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: colors.background,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
      color: colors.text,
    },
    description: {
      fontSize: 16,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
      color: colors.text,
    },
    exportOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    optionContent: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
      color: colors.text,
    },
    optionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    statsCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 8,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 4,
      color: colors.primary,
    },
    statLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
    },
    privacyNote: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 16,
      fontStyle: 'italic',
      color: colors.textSecondary,
    },
  });
};

export default ExportScreen;