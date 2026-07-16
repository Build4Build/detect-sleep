import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { HealthService } from '../services/HealthService';
import { useTheme } from '../context/ThemeContext';
import { useSleep } from '../context/SleepContext';

interface HealthIntegrationSettingsProps {
  onStatusChange?: (connected: boolean) => void;
}

const HealthIntegrationSettings: React.FC<HealthIntegrationSettingsProps> = ({ onStatusChange }) => {
  const healthService = useMemo(() => HealthService.getInstance(), []);
  const { dailySummaries } = useSleep();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const serviceName = healthService.getServiceName();

  useEffect(() => {
    const load = async () => {
      const isAvailable = healthService.isAvailable();
      setAvailable(isAvailable);
      setEnabled(isAvailable && await healthService.getSyncEnabled());
      if (isAvailable) await healthService.initialize(false);
      setLoading(false);
    };
    load().catch(error => {
      console.error('Unable to load health integration:', error);
      setLoading(false);
    });
  }, [healthService]);

  const backfillRecordedSleep = async () => {
    for (const summary of dailySummaries) {
      for (const period of summary.sleepPeriods) {
        await healthService.saveSleepData({
          id: `detected-${period.start}-${period.end}`,
          startTime: period.start,
          endTime: period.end,
          isAwake: false,
          confidence: period.confidence,
          source: 'Sleep Detector',
        });
      }
    }
  };

  const changeSync = async (value: boolean) => {
    setLoading(true);
    try {
      const success = await healthService.setSyncEnabled(value);
      if (!success) {
        Alert.alert(
          'Apple Health Permission Needed',
          'Allow Sleep Detector to write Sleep Analysis in the Health permission sheet, then try again.',
        );
        return;
      }
      setEnabled(value);
      onStatusChange?.(value);
      if (value) await backfillRecordedSleep();
    } catch (error) {
      console.error('Unable to update health sync:', error);
      Alert.alert('Health Sync Error', `Could not update ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{serviceName} Integration</Text>
      {!available ? (
        <Text style={styles.secondary}>{serviceName} is not available on this device.</Text>
      ) : (
        <>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.label}>Sync detected sleep</Text>
              <Text style={styles.secondary}>Write completed sleep periods to the Health app.</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={changeSync}
              disabled={loading}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={enabled ? colors.primary : colors.surface}
            />
          </View>
          <Text style={styles.status}>{loading ? 'Checking permissions…' : enabled ? 'Connected' : 'Not connected'}</Text>
        </>
      )}
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.card, borderRadius: 8, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  copy: { flex: 1, paddingRight: 12 },
  label: { fontSize: 16, color: colors.text, fontWeight: '600' },
  secondary: { color: colors.textSecondary, marginTop: 4 },
  status: { color: colors.success, marginTop: 12, fontWeight: '600' },
});

export default HealthIntegrationSettings;
