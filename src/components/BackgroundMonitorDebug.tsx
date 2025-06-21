import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { BackgroundActivityService } from '../services/BackgroundActivityService';
import { useSleep } from '../context/SleepContext';
import { useTheme } from '../context/ThemeContext';

interface ActivityData {
  timestamp: number;
  hasMovement: boolean;
  appState: string;
  confidence: number;
}

export const BackgroundMonitorDebug: React.FC = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(0);
  const [inactivityDuration, setInactivityDuration] = useState<number>(0);
  const [genuineInactivityDuration, setGenuineInactivityDuration] = useState<number>(0);
  const [recentActivities, setRecentActivities] = useState<ActivityData[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const backgroundService = BackgroundActivityService.getInstance();
  const { currentStatus, currentConfidence, settings } = useSleep();
  const { colors } = useTheme();

  // Create themed styles
  const themedStyles = createThemedStyles(colors);

  useEffect(() => {
    const updateStatus = async () => {
      try {
        setIsMonitoring(backgroundService.isActive());
        
        if (backgroundService.isActive()) {
          const lastActivityTime = await backgroundService.getLastActivityTimestamp();
          setLastActivity(lastActivityTime);
          
          const inactivity = await backgroundService.getInactivityDuration(true);
          setInactivityDuration(inactivity);
          
          const genuineInactivity = await backgroundService.getInactivityDuration(false);
          setGenuineInactivityDuration(genuineInactivity);
          
          const activities = await backgroundService.getActivityLog(2); // Last 2 hours
          setRecentActivities(activities.slice(-10)); // Last 10 activities
          
          setRefreshCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error updating debug status:', error);
      }
    };

    // Update every 3 seconds for more responsive debugging
    const interval = setInterval(updateStatus, 3000);
    updateStatus(); // Initial update

    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const manualTestMovement = async () => {
    // Simulate movement detection for testing
    console.log('Manual movement test triggered');
    // The service will automatically detect this as app usage
  };

  const recordUserActivity = async () => {
    // Record genuine user activity
    backgroundService.recordUserActivity();
    console.log('Genuine user activity recorded');
  };

  const getInactivityStatus = (duration: number) => {
    const threshold = settings.inactivityThreshold;
    if (duration >= threshold * 1.5) {
      return { text: 'DEEP SLEEP', color: '#D32F2F' };
    } else if (duration >= threshold) {
      return { text: 'ASLEEP', color: '#FF5722' };
    } else if (duration >= threshold * 0.8) {
      return { text: 'DROWSY', color: '#FF9800' };
    } else if (duration >= threshold * 0.5) {
      return { text: 'GETTING TIRED', color: '#FFC107' };
    } else {
      return { text: 'ACTIVE', color: '#4CAF50' };
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return '#4CAF50';
    if (confidence >= 70) return '#8BC34A';
    if (confidence >= 50) return '#FFC107';
    return '#FF5722';
  };

  const inactivityStatus = getInactivityStatus(inactivityDuration);
  const genuineInactivityStatus = getInactivityStatus(genuineInactivityDuration);

  return (
    <View style={themedStyles.container}>
      <Text style={themedStyles.title}>Background Monitor Debug</Text>
      <Text style={themedStyles.subtitle}>Refresh #{refreshCount} • Updated every 3s</Text>
      
      <View style={themedStyles.statusContainer}>
        <View style={[themedStyles.statusIndicator, { backgroundColor: isMonitoring ? colors.success : colors.error }]}>
          <Text style={themedStyles.statusText}>
            {isMonitoring ? 'MONITORING' : 'STOPPED'}
          </Text>
        </View>
      </View>

      <View style={themedStyles.infoContainer}>
        <Text style={themedStyles.infoLabel}>Current Sleep Status:</Text>
        <Text style={[themedStyles.infoValue, { color: getConfidenceColor(currentConfidence) }]}>
          {currentStatus} ({currentConfidence}% confidence)
        </Text>
        
        <Text style={themedStyles.infoLabel}>Inactivity Threshold:</Text>
        <Text style={themedStyles.infoValue}>{settings.inactivityThreshold} minutes</Text>
        
        <Text style={themedStyles.infoLabel}>Last Genuine Activity:</Text>
        <Text style={themedStyles.infoValue}>{formatTime(lastActivity)}</Text>
        
        <Text style={themedStyles.infoLabel}>Total Inactivity (Including App Checks):</Text>
        <Text style={[themedStyles.infoValue, { color: inactivityStatus.color }]}>
          {formatDuration(inactivityDuration)} - {inactivityStatus.text}
        </Text>
        
        <Text style={themedStyles.infoLabel}>🎯 Genuine Inactivity (Sleep Detection):</Text>
        <Text style={[themedStyles.infoValue, { color: genuineInactivityStatus.color, fontWeight: 'bold' }]}>
          {formatDuration(genuineInactivityDuration)} - {genuineInactivityStatus.text}
        </Text>
        
        <Text style={themedStyles.infoLabel}>Time of Day Factor:</Text>
        <Text style={themedStyles.infoValue}>
          {settings.considerTimeOfDay ? 'Enabled ✅' : 'Disabled ❌'}
        </Text>
        
        <Text style={themedStyles.infoLabel}>Machine Learning:</Text>
        <Text style={themedStyles.infoValue}>
          {settings.useMachineLearning ? 'Enabled ✅' : 'Disabled ❌'}
        </Text>
      </View>

      <View style={themedStyles.buttonContainer}>
        <TouchableOpacity style={themedStyles.testButton} onPress={manualTestMovement}>
          <Text style={themedStyles.testButtonText}>Test Movement Detection</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[themedStyles.testButton, themedStyles.activityButton]} onPress={recordUserActivity}>
          <Text style={themedStyles.testButtonText}>Record Real Activity</Text>
        </TouchableOpacity>
      </View>

      <Text style={themedStyles.sectionTitle}>Recent Activity Log:</Text>
      <ScrollView style={themedStyles.activityLog}>
        {recentActivities.map((activity, index) => {
          const activityType = activity.hasMovement ? '🟢 Movement' : '🔴 No Movement';
          const isGenuineActivity = activity.hasMovement && activity.confidence > 80;
          
          return (
            <View key={index} style={themedStyles.activityItem}>
              <Text style={themedStyles.activityTime}>{formatTime(activity.timestamp)}</Text>
              <Text style={[themedStyles.activityType, isGenuineActivity && themedStyles.genuineActivity]}>
                {activityType} {isGenuineActivity ? '✨' : ''}
              </Text>
              <Text style={themedStyles.activityState}>App: {activity.appState}</Text>
              <Text style={themedStyles.activityConfidence}>Confidence: {activity.confidence}%</Text>
            </View>
          );
        })}
        {recentActivities.length === 0 && (
          <Text style={themedStyles.noActivity}>No recent activity logged</Text>
        )}
      </ScrollView>
    </View>
  );
};

// Create themed styles function
const createThemedStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    color: colors.textSecondary,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text,
  },
  activityLog: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
  },
  activityItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  activityType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  genuineActivity: {
    color: colors.success,
    fontWeight: 'bold',
  },
  activityState: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  activityConfidence: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noActivity: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 20,
  },
  testButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  activityButton: {
    backgroundColor: colors.success,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  activityLog: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
  },
  activityItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  activityType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  genuineActivity: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  activityState: {
    fontSize: 12,
    color: '#888',
  },
  activityConfidence: {
    fontSize: 12,
    color: '#666',
  },
  noActivity: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
  testButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  activityButton: {
    backgroundColor: '#4CAF50',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BackgroundMonitorDebug;
