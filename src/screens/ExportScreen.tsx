import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSleep } from '../context/SleepContext';
import { exportDataToJson, exportDataToCsv } from '../services/exportService';

const ExportScreen = () => {
  const { exportData, dailySummaries } = useSleep();
  const [isExporting, setIsExporting] = useState(false);
  
  // Export data as JSON
  const handleExportJson = async () => {
    try {
      setIsExporting(true);
      const jsonData = await exportData();
      await exportDataToJson(jsonData);
      setIsExporting(false);
    } catch (error) {
      console.error('Error exporting JSON data:', error);
      Alert.alert('Export Error', 'Failed to export data. Please try again.');
      setIsExporting(false);
    }
  };
  
  // Export data as CSV
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const jsonData = await exportData();
      const parsedData = JSON.parse(jsonData);
      await exportDataToCsv(parsedData.dailySummaries, parsedData.activityRecords);
      setIsExporting(false);
    } catch (error) {
      console.error('Error exporting CSV data:', error);
      Alert.alert('Export Error', 'Failed to export data. Please try again.');
      setIsExporting(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Export Sleep Data</Text>
        <Text style={styles.description}>
          Export your sleep data to share or analyze in other applications.
        </Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Export Options</Text>
        
        <TouchableOpacity 
          style={styles.exportOption}
          onPress={handleExportJson}
          disabled={isExporting}
        >
          <View style={styles.optionIcon}>
            <Ionicons name="document-text-outline" size={24} color="#6200ee" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Export as JSON</Text>
            <Text style={styles.optionDescription}>
              Complete data in JSON format for backup or analysis
            </Text>
          </View>
          {isExporting ? (
            <ActivityIndicator size="small" color="#6200ee" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#999" />
          )}
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity 
          style={styles.exportOption}
          onPress={handleExportCsv}
          disabled={isExporting}
        >
          <View style={styles.optionIcon}>
            <Ionicons name="grid-outline" size={24} color="#6200ee" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Export as CSV</Text>
            <Text style={styles.optionDescription}>
              Spreadsheet format for easy viewing in Excel or Google Sheets
            </Text>
          </View>
          {isExporting ? (
            <ActivityIndicator size="small" color="#6200ee" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#999" />
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>Data Summary</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{dailySummaries.length}</Text>
            <Text style={styles.statLabel}>Days Tracked</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {dailySummaries.reduce((total, summary) => total + summary.sleepPeriods.length, 0)}
            </Text>
            <Text style={styles.statLabel}>Sleep Periods</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.privacyNote}>
        Your data is stored locally on your device and is only shared when you export it.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0e6ff',
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
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
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
    color: '#6200ee',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  privacyNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default ExportScreen; 