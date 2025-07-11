import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const NOTIFICATION_TOKEN_KEY = 'notification-token';
const NOTIFICATION_SETTINGS_KEY = 'notification-settings';

// Notification settings interface
interface NotificationSettings {
  sleepDetectionEnabled: boolean;
  wakeDetectionEnabled: boolean;
  sleepRemindersEnabled: boolean;
  bedtimeReminderHour: number; // 22 = 10 PM
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  sleepDetectionEnabled: true,
  wakeDetectionEnabled: true,
  sleepRemindersEnabled: true,
  bedtimeReminderHour: 22,
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service
   */
  public async initialize(): Promise<void> {
    try {
      // Load settings
      await this.loadSettings();
      
      // Request permissions and get token
      await this.registerForPushNotificationsAsync();
      
      console.log('NotificationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
    }
  }

  /**
   * Register for push notifications and get token
   */
  private async registerForPushNotificationsAsync(): Promise<string | null> {
    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('sleep-detection', {
        name: 'Sleep Detection',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
        description: 'Notifications for sleep and wake detection',
      });

      await Notifications.setNotificationChannelAsync('sleep-reminders', {
        name: 'Sleep Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#FFC107',
        description: 'Bedtime and sleep schedule reminders',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: 'c1f660d1-2639-4a53-9a69-0e3e3dd453fb',
        })).data;
        
        console.log('Push notification token:', token);
        
        // Store token
        await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
        this.expoPushToken = token;
      } catch (error) {
        console.error('Error getting push token:', error);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  /**
   * Load notification settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (settingsJson) {
        const savedSettings = JSON.parse(settingsJson);
        this.settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...savedSettings };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      this.settings = DEFAULT_NOTIFICATION_SETTINGS;
    }
  }

  /**
   * Save notification settings
   */
  public async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(this.settings));
      console.log('Notification settings updated:', this.settings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  }

  /**
   * Get current notification settings
   */
  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Send sleep detection notification
   */
  public async notifySleepDetected(inactiveMinutes: number): Promise<void> {
    if (!this.settings.sleepDetectionEnabled) return;

    try {
      const inactiveHours = Math.floor(inactiveMinutes / 60);
      const remainingMinutes = Math.floor(inactiveMinutes % 60);
      
      let timeText = '';
      if (inactiveHours > 0) {
        timeText = `${inactiveHours}h ${remainingMinutes}m`;
      } else {
        timeText = `${remainingMinutes}m`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '😴 Sleep Detected',
          body: `You've been inactive for ${timeText}. Sleep tracking started.`,
          data: {
            type: 'sleep-detected',
            inactiveMinutes,
            timestamp: Date.now(),
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
      });

      console.log(`Sleep detection notification sent: ${timeText} inactive`);
    } catch (error) {
      console.error('Failed to send sleep detection notification:', error);
    }
  }

  /**
   * Send wake detection notification with sleep summary
   */
  public async notifyWakeDetected(sleepDuration: number, sleepQuality: string): Promise<void> {
    if (!this.settings.wakeDetectionEnabled) return;

    try {
      const sleepHours = Math.floor(sleepDuration / 60);
      const sleepMinutes = Math.floor(sleepDuration % 60);
      
      let durationText = '';
      if (sleepHours > 0) {
        durationText = `${sleepHours}h ${sleepMinutes}m`;
      } else {
        durationText = `${sleepMinutes}m`;
      }

      // Choose emoji based on sleep quality
      let emoji = '☀️';
      if (sleepQuality === 'Excellent') emoji = '🌟';
      else if (sleepQuality === 'Good') emoji = '😊';
      else if (sleepQuality === 'Adequate') emoji = '😐';
      else if (sleepQuality === 'Poor') emoji = '😴';
      else if (sleepQuality === 'Insufficient') emoji = '😵';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${emoji} Good Morning!`,
          body: `You slept for ${durationText}. Sleep quality: ${sleepQuality}`,
          data: {
            type: 'wake-detected',
            sleepDuration,
            sleepQuality,
            timestamp: Date.now(),
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Send immediately
      });

      console.log(`Wake detection notification sent: ${durationText} sleep, ${sleepQuality} quality`);
    } catch (error) {
      console.error('Failed to send wake detection notification:', error);
    }
  }

  /**
   * Send bedtime reminder notification
   */
  public async scheduleBedtimeReminder(): Promise<void> {
    if (!this.settings.sleepRemindersEnabled) return;

    try {
      // Cancel any existing bedtime reminders
      await this.cancelBedtimeReminder();

      // Schedule daily bedtime reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 Bedtime Reminder',
          body: 'Time to wind down for a good night\'s sleep!',
          data: {
            type: 'bedtime-reminder',
            timestamp: Date.now(),
          },
          sound: true,
        },
        trigger: {
          hour: this.settings.bedtimeReminderHour,
          minute: 0,
          repeats: true,
        },
      });

      console.log(`Bedtime reminder scheduled for ${this.settings.bedtimeReminderHour}:00`);
    } catch (error) {
      console.error('Failed to schedule bedtime reminder:', error);
    }
  }

  /**
   * Cancel bedtime reminder
   */
  public async cancelBedtimeReminder(): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === 'bedtime-reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
      console.log('Bedtime reminders cancelled');
    } catch (error) {
      console.error('Failed to cancel bedtime reminder:', error);
    }
  }

  /**
   * Send sleep summary notification (for testing or manual trigger)
   */
  public async sendSleepSummary(totalSleep: number, sleepQuality: string, bedtime: string, wakeTime: string): Promise<void> {
    try {
      const sleepHours = Math.floor(totalSleep / 60);
      const sleepMinutes = Math.floor(totalSleep % 60);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Sleep Summary',
          body: `Sleep: ${sleepHours}h ${sleepMinutes}m • Quality: ${sleepQuality} • Bedtime: ${bedtime}`,
          data: {
            type: 'sleep-summary',
            totalSleep,
            sleepQuality,
            bedtime,
            wakeTime,
            timestamp: Date.now(),
          },
          sound: false,
        },
        trigger: null,
      });

      console.log('Sleep summary notification sent');
    } catch (error) {
      console.error('Failed to send sleep summary notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  public async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  /**
   * Get push token for external use
   */
  public getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Test notification (for debugging)
   */
  public async sendTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from Sleep Detector!',
          data: { type: 'test' },
        },
        trigger: null,
      });
      console.log('Test notification sent');
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  }
}

export default NotificationService;
