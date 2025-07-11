import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { NotificationService } from '../services/NotificationService';

interface NotificationSettings {
  sleepDetectionEnabled: boolean;
  wakeDetectionEnabled: boolean;
  sleepRemindersEnabled: boolean;
  bedtimeReminderHour: number;
}

export const NotificationSettingsScreen = () => {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>({
    sleepDetectionEnabled: true,
    wakeDetectionEnabled: true,
    sleepRemindersEnabled: true,
    bedtimeReminderHour: 22,
  });
  const [notificationService] = useState(() => NotificationService.getInstance());

  // Create themed styles
  const themedStyles = createThemedStyles(colors);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = notificationService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: any) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await notificationService.updateSettings({ [key]: value });

      // Handle special cases
      if (key === 'sleepRemindersEnabled' || key === 'bedtimeReminderHour') {
        if (newSettings.sleepRemindersEnabled) {
          await notificationService.scheduleBedtimeReminder();
        } else {
          await notificationService.cancelBedtimeReminder();
        }
      }
    } catch (error) {
      console.error('Failed to update notification setting:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const sendTestNotification = async () => {
    try {
      await notificationService.sendTestNotification();
      Alert.alert('Test Sent', 'Check your notifications!');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const formatHour = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const changeBedtimeHour = () => {
    Alert.alert(
      'Bedtime Reminder',
      'Select your preferred bedtime reminder hour:',
      [
        { text: '9:00 PM', onPress: () => updateSetting('bedtimeReminderHour', 21) },
        { text: '10:00 PM', onPress: () => updateSetting('bedtimeReminderHour', 22) },
        { text: '11:00 PM', onPress: () => updateSetting('bedtimeReminderHour', 23) },
        { text: '12:00 AM', onPress: () => updateSetting('bedtimeReminderHour', 0) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <ScrollView style={themedStyles.container}>
      <View style={themedStyles.header}>
        <Text style={themedStyles.title}>Notification Settings</Text>
        <Text style={themedStyles.subtitle}>Configure your sleep tracking notifications</Text>
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Sleep Detection</Text>
        
        <View style={themedStyles.settingRow}>
          <View style={themedStyles.settingInfo}>
            <Ionicons name="moon-outline" size={24} color={colors.primary} />
            <View style={themedStyles.settingText}>
              <Text style={themedStyles.settingLabel}>Sleep Detection Alerts</Text>
              <Text style={themedStyles.settingDescription}>
                Get notified when inactivity-based sleep is detected
              </Text>
            </View>
          </View>
          <Switch
            value={settings.sleepDetectionEnabled}
            onValueChange={(value) => updateSetting('sleepDetectionEnabled', value)}
            trackColor={{ false: colors.border, true: colors.primary + '40' }}
            thumbColor={settings.sleepDetectionEnabled ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={themedStyles.settingRow}>
          <View style={themedStyles.settingInfo}>
            <Ionicons name="sunny-outline" size={24} color={colors.primary} />
            <View style={themedStyles.settingText}>
              <Text style={themedStyles.settingLabel}>Wake Detection Alerts</Text>
              <Text style={themedStyles.settingDescription}>
                Get a summary when you wake up with sleep duration and quality
              </Text>
            </View>
          </View>
          <Switch
            value={settings.wakeDetectionEnabled}
            onValueChange={(value) => updateSetting('wakeDetectionEnabled', value)}
            trackColor={{ false: colors.border, true: colors.primary + '40' }}
            thumbColor={settings.wakeDetectionEnabled ? colors.primary : colors.textSecondary}
          />
        </View>
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Sleep Reminders</Text>
        
        <View style={themedStyles.settingRow}>
          <View style={themedStyles.settingInfo}>
            <Ionicons name="alarm-outline" size={24} color={colors.primary} />
            <View style={themedStyles.settingText}>
              <Text style={themedStyles.settingLabel}>Bedtime Reminders</Text>
              <Text style={themedStyles.settingDescription}>
                Daily reminders to maintain a consistent sleep schedule
              </Text>
            </View>
          </View>
          <Switch
            value={settings.sleepRemindersEnabled}
            onValueChange={(value) => updateSetting('sleepRemindersEnabled', value)}
            trackColor={{ false: colors.border, true: colors.primary + '40' }}
            thumbColor={settings.sleepRemindersEnabled ? colors.primary : colors.textSecondary}
          />
        </View>

        {settings.sleepRemindersEnabled && (
          <TouchableOpacity style={themedStyles.timeSelector} onPress={changeBedtimeHour}>
            <View style={themedStyles.settingInfo}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
              <View style={themedStyles.settingText}>
                <Text style={themedStyles.settingLabel}>Bedtime Reminder Time</Text>
                <Text style={themedStyles.settingDescription}>
                  Currently set for {formatHour(settings.bedtimeReminderHour)}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={themedStyles.section}>
        <Text style={themedStyles.sectionTitle}>Testing</Text>
        
        <TouchableOpacity style={themedStyles.testButton} onPress={sendTestNotification}>
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
          <Text style={themedStyles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>
      </View>

      <View style={themedStyles.infoSection}>
        <Text style={themedStyles.infoTitle}>ℹ️ About Notifications</Text>
        <Text style={themedStyles.infoText}>
          • Sleep detection notifications are sent when you've been inactive for your set threshold
        </Text>
        <Text style={themedStyles.infoText}>
          • Wake notifications include your sleep duration and quality assessment
        </Text>
        <Text style={themedStyles.infoText}>
          • Bedtime reminders help maintain consistent sleep schedules
        </Text>
        <Text style={themedStyles.infoText}>
          • All notifications respect your device's Do Not Disturb settings
        </Text>
      </View>
    </ScrollView>
  );
};

const createThemedStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    margin: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginTop: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 8,
  },
  infoSection: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default NotificationSettingsScreen;
