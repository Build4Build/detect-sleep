import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = 'notification-settings';

// Notification settings interface
interface NotificationSettings {
  sleepDetectionEnabled: boolean;
  wakeDetectionEnabled: boolean;
  sleepRemindersEnabled: boolean;
  bedtimeReminderHour: number; // 22 = 10 PM
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  sleepDetectionEnabled: false,
  wakeDetectionEnabled: false,
  sleepRemindersEnabled: false,
  bedtimeReminderHour: 22,
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS;
  private appSettings: any = null; // App settings for contextual notifications

  private constructor() { }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  public async initialize(): Promise<void> {
    try {
      // Load settings
      await this.loadSettings();

      // Set up notification channels for Android
      await this.setupNotificationChannels();

      console.log('✅ NotificationService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize NotificationService:', error);
    }
  }

  /**
   * Update app settings for contextual notifications
   */
  public updateAppSettings(appSettings: any): void {
    this.appSettings = appSettings;
  }

  /**
   * Request notification permissions
   */
  public async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }
    return true;
  }

  /**
   * Set up notification channels for Android
   */
  private async setupNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      // Sleep Detection Channel
      await Notifications.setNotificationChannelAsync('sleep-detection', {
        name: 'Sleep Detection',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
        sound: 'default',
      });

      // Wake Detection Channel
      await Notifications.setNotificationChannelAsync('wake-detection', {
        name: 'Wake Detection',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#4CAF50',
        sound: 'default',
      });

      // Bedtime Reminders Channel
      await Notifications.setNotificationChannelAsync('bedtime-reminders', {
        name: 'Bedtime Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#FF9800',
        sound: 'default',
      });
    }
  }

  /**
   * Load notification settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (settingsJson) {
        this.settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(settingsJson) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      this.settings = DEFAULT_NOTIFICATION_SETTINGS;
    }
  }

  /**
   * Save notification settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(this.settings));
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
   * Update notification settings
   */
  public async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
  }

  /**
   * Send sleep detection notification with accurate context
   */
  public async notifySleepDetected(inactiveMinutes: number): Promise<void> {
    if (!this.settings.sleepDetectionEnabled) return;

    try {
      const currentHour = new Date().getHours();
      const currentDay = new Date().getDay();
      const isWeekend = currentDay === 0 || currentDay === 6;

      // Format inactive time
      const hours = Math.floor(inactiveMinutes / 60);
      const minutes = Math.floor(inactiveMinutes % 60);
      const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      // Determine sleep context based on time of day
      const isLikelyNightSleep = (currentHour >= 20 || currentHour <= 6);
      const isLikelyAfternoonNap = (currentHour >= 12 && currentHour <= 17);
      const isLikelyEveningNap = (currentHour >= 17 && currentHour <= 20);
      const isLikelyMorningRest = (currentHour >= 6 && currentHour <= 12);

      let sleepTitle = '';
      let sleepBody = '';

      // Context-aware sleep detection messages
      if (isLikelyNightSleep) {
        sleepTitle = '🌙 Sleep Detected';
        if (isWeekend) {
          sleepBody = `Detected ${timeText} of nighttime sleep. Weekend rest is important for recovery.`;
        } else {
          sleepBody = `Detected ${timeText} of nighttime sleep. Sleep tracking is active.`;
        }
      } else if (isLikelyAfternoonNap) {
        sleepTitle = '☀️ Afternoon Nap';
        sleepBody = `Detected ${timeText} afternoon nap. Power naps can be refreshing!`;
      } else if (isLikelyEveningNap) {
        sleepTitle = '🌅 Evening Rest';
        sleepBody = `Detected ${timeText} evening rest. Try not to nap too long before bedtime.`;
      } else if (isLikelyMorningRest) {
        if (isWeekend) {
          sleepTitle = '🛏️ Weekend Sleep-In';
          sleepBody = `Detected ${timeText} weekend sleep-in. Weekend rest is important!`;
        } else {
          sleepTitle = '🌅 Morning Rest';
          sleepBody = `Detected ${timeText} morning rest. Consider your evening sleep schedule.`;
        }
      } else {
        // Fallback for unusual times
        sleepTitle = '😴 Sleep Detected';
        if (inactiveMinutes < 60) {
          sleepBody = `Brief ${timeText} rest detected. Monitoring your sleep patterns.`;
        } else {
          sleepBody = `Extended ${timeText} sleep period detected. Sleep tracking is active.`;
        }
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: sleepTitle,
          body: sleepBody,
          data: {
            type: 'sleep-detected',
            inactiveMinutes,
            timestamp: Date.now(),
            sleepType: isLikelyNightSleep ? 'night' : isLikelyAfternoonNap ? 'afternoon-nap' :
              isLikelyEveningNap ? 'evening-nap' : isLikelyMorningRest ? 'morning-rest' : 'other',
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
        identifier: 'sleep-detected',
      });

      console.log(`✅ Sleep detection notification sent: ${sleepTitle} - ${timeText} inactive`);
    } catch (error) {
      console.error('❌ Failed to send sleep detection notification:', error);
    }
  }

  /**
   * Send wake detection notification with ACCURATE time-based context
   * FIXES THE "Good Morning" issue by checking CURRENT TIME, not sleep duration
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

      // Enhanced context-aware emojis and quality assessment
      let emoji = '☀️';
      let qualityEmoji = '';

      if (sleepQuality === 'Excellent') {
        emoji = '🌟';
        qualityEmoji = '✨';
      } else if (sleepQuality === 'Good') {
        emoji = '😊';
        qualityEmoji = '👍';
      } else if (sleepQuality === 'Adequate') {
        emoji = '😐';
        qualityEmoji = '👌';
      } else if (sleepQuality === 'Poor') {
        emoji = '😴';
        qualityEmoji = '⚠️';
      } else if (sleepQuality === 'Insufficient') {
        emoji = '😵';
        qualityEmoji = '❗';
      }

      // CRITICAL FIX: Get CURRENT time for accurate contextual greetings
      const currentHour = new Date().getHours();
      const currentDay = new Date().getDay();
      const isWeekend = currentDay === 0 || currentDay === 6;

      // Sleep duration categories
      const wasVeryShortRest = sleepDuration < 45; // Less than 45 minutes
      const wasShortNap = sleepDuration >= 45 && sleepDuration < 120; // 45min-2hrs
      const wasLongNap = sleepDuration >= 120 && sleepDuration < 300; // 2-5 hours
      const wasFullSleep = sleepDuration >= 300; // 5+ hours

      let greetingTitle = '';
      let contextualMessage = '';

      // Check if contextual notifications are enabled
      const contextualEnabled = this.appSettings?.contextualNotifications ?? true;

      if (contextualEnabled) {
        // ENHANCED CONTEXTUAL NOTIFICATIONS - Time-aware and accurate
        if (currentHour >= 5 && currentHour < 12) {
          // Morning (5 AM - 12 PM) - ONLY show "Good Morning" if it's ACTUALLY morning
          greetingTitle = `🌅 Good Morning!`;
          if (wasVeryShortRest) {
            contextualMessage = `Your ${durationText} morning rest is over. Ready to start the day?`;
          } else if (wasShortNap) {
            contextualMessage = `Your ${durationText} morning nap is complete. Time to get going!`;
          } else if (wasLongNap && isWeekend) {
            contextualMessage = `Nice ${durationText} weekend sleep-in! Hope you feel refreshed.`;
          } else if (wasFullSleep) {
            contextualMessage = `You slept for ${durationText}. Hope you had a restful night!`;
          } else {
            contextualMessage = `Your ${durationText} sleep is complete. Good morning!`;
          }
        } else if (currentHour >= 12 && currentHour < 17) {
          // Afternoon (12 PM - 5 PM) - NEVER show "Good Morning" during afternoon
          greetingTitle = `☀️ Good Afternoon!`;
          if (wasVeryShortRest) {
            contextualMessage = `Your ${durationText} afternoon break is over. Feeling refreshed?`;
          } else if (wasShortNap) {
            contextualMessage = `Your ${durationText} afternoon nap is complete. Power nap done!`;
          } else if (wasLongNap) {
            contextualMessage = `Your ${durationText} afternoon rest is over. Consider your evening sleep schedule.`;
          } else if (wasFullSleep) {
            contextualMessage = `You slept for ${durationText} during the day. You might want to stay active this evening.`;
          } else {
            contextualMessage = `Your ${durationText} rest is complete. Good afternoon!`;
          }
        } else if (currentHour >= 17 && currentHour < 22) {
          // Evening (5 PM - 10 PM) - NEVER show "Good Morning" during evening
          greetingTitle = `🌆 Good Evening!`;
          if (wasVeryShortRest) {
            contextualMessage = `Your ${durationText} evening break is over. Time for dinner or activities?`;
          } else if (wasShortNap) {
            contextualMessage = `Your ${durationText} evening nap is complete. Try to stay awake until bedtime.`;
          } else if (wasLongNap) {
            contextualMessage = `Your ${durationText} evening rest might affect tonight's sleep. Consider staying active.`;
          } else if (wasFullSleep) {
            contextualMessage = `You slept for ${durationText}. This might impact your nighttime sleep schedule.`;
          } else {
            contextualMessage = `Your ${durationText} rest is complete. Good evening!`;
          }
        } else {
          // Late night/Early morning (10 PM - 5 AM) - NEVER show "Good Morning" during night
          greetingTitle = `🌙 Wake Up`;
          if (wasVeryShortRest) {
            contextualMessage = `Your ${durationText} night rest is over. It's quite late/early.`;
          } else if (wasShortNap) {
            contextualMessage = `Your ${durationText} late night rest is complete. Consider getting back to sleep.`;
          } else if (wasLongNap) {
            contextualMessage = `Your ${durationText} sleep session ended during the night. Hope you can get back to sleep.`;
          } else if (wasFullSleep) {
            contextualMessage = `You slept for ${durationText}. Waking up quite early!`;
          } else {
            contextualMessage = `Your ${durationText} sleep is complete. It's still nighttime.`;
          }
        }
      } else {
        // BASIC NOTIFICATIONS - Simple, generic messages
        if (wasFullSleep) {
          greetingTitle = `${emoji} Wake Up`;
          contextualMessage = `You slept for ${durationText}.`;
        } else if (wasShortNap || wasLongNap) {
          greetingTitle = `${emoji} Nap Complete`;
          contextualMessage = `Your ${durationText} nap is over.`;
        } else {
          greetingTitle = `${emoji} Rest Complete`;
          contextualMessage = `Your ${durationText} rest period is over.`;
        }
      }

      // Enhanced quality-specific advice
      let qualityAdvice = '';
      if (sleepQuality === 'Excellent') {
        qualityAdvice = wasFullSleep ? 'Outstanding sleep! Keep this routine up. 🎉' : 'Great rest quality! 💪';
      } else if (sleepQuality === 'Good') {
        qualityAdvice = wasFullSleep ? 'Solid night of sleep! Well rested. 👍' : 'Good quality rest! ✅';
      } else if (sleepQuality === 'Adequate') {
        if (wasVeryShortRest || wasShortNap) {
          qualityAdvice = 'Short rest can be refreshing too! 👌';
        } else {
          qualityAdvice = 'Decent sleep, but aim for 7-8 hours tonight. 🎯';
        }
      } else if (sleepQuality === 'Poor') {
        if (wasFullSleep) {
          qualityAdvice = 'Consider better sleep hygiene for deeper rest. 🌙';
        } else {
          qualityAdvice = 'Short rest detected. Consider a longer sleep period. ⚠️';
        }
      } else if (sleepQuality === 'Insufficient') {
        qualityAdvice = wasFullSleep ? 'Your body needs more rest. Early bedtime tonight? ⚡' : 'Very brief rest. Ensure adequate sleep tonight. 🛌';
      }

      const fullMessage = `${contextualMessage}

Duration assessment: ${sleepQuality} ${qualityEmoji}
${qualityAdvice}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: greetingTitle,
          body: fullMessage,
          data: {
            type: 'wake-detected',
            sleepDuration,
            sleepQuality,
            timestamp: Date.now(),
            currentHour, // Include actual wake time for debugging
            sleepCategory: wasVeryShortRest ? 'very-short' : wasShortNap ? 'short-nap' : wasLongNap ? 'long-nap' : 'full-sleep',
            timeOfDay: currentHour >= 5 && currentHour < 12 ? 'morning' :
              currentHour >= 12 && currentHour < 17 ? 'afternoon' :
                currentHour >= 17 && currentHour < 22 ? 'evening' : 'night',
            contextualEnabled,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Send immediately
        identifier: 'wake-detected',
      });

      console.log(`✅ FIXED wake notification sent: ${greetingTitle} - ${durationText} sleep, ${sleepQuality} quality at ${currentHour}:xx (contextual: ${contextualEnabled})`);
    } catch (error) {
      console.error('❌ Failed to send wake detection notification:', error);
    }
  }

  /**
   * Schedule bedtime reminder
   */
  public async scheduleBedtimeReminder(): Promise<void> {
    if (!this.settings.sleepRemindersEnabled) return;
    if (!(await this.requestPermissions())) return;

    try {
      // Cancel existing bedtime reminders
      await Notifications.cancelScheduledNotificationAsync('bedtime-reminder');

      const reminderHour = this.settings.bedtimeReminderHour;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌙 Bedtime Reminder',
          body: 'Time to start winding down for a good night\'s sleep!',
          data: { type: 'bedtime-reminder' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: reminderHour,
          minute: 0,
          repeats: true,
        },
        identifier: 'bedtime-reminder',
      });

      console.log(`✅ Bedtime reminder scheduled for ${reminderHour}:00`);
    } catch (error) {
      console.error('❌ Failed to schedule bedtime reminder:', error);
    }
  }

  /**
   * Send test notification with current time context
   */
  public async sendTestNotification(): Promise<void> {
    try {
      if (!(await this.requestPermissions())) {
        throw new Error('Notification permission was not granted.');
      }
      const currentHour = new Date().getHours();
      let testTitle = '';
      let testBody = '';

      // Test with current time context - demonstrates the fix
      if (currentHour >= 5 && currentHour < 12) {
        testTitle = '🌅 Good Morning Test!';
        testBody = 'This is a test notification sent during morning hours.';
      } else if (currentHour >= 12 && currentHour < 17) {
        testTitle = '☀️ Good Afternoon Test!';
        testBody = 'This is a test notification sent during afternoon hours. Note: NO "Good Morning" message!';
      } else if (currentHour >= 17 && currentHour < 22) {
        testTitle = '🌆 Good Evening Test!';
        testBody = 'This is a test notification sent during evening hours. Note: NO "Good Morning" message!';
      } else {
        testTitle = '🌙 Night Test';
        testBody = 'This is a test notification sent during nighttime hours. Note: NO "Good Morning" message!';
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: testTitle,
          body: testBody,
          data: {
            type: 'test',
            testTime: currentHour,
            timestamp: Date.now(),
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Send immediately
        identifier: 'test-notification',
      });

      console.log(`✅ Test notification sent: ${testTitle} at ${currentHour}:xx`);
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
    }
  }

  /**
   * Cancel bedtime reminder
   */
  public async cancelBedtimeReminder(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync('bedtime-reminder');
      console.log('✅ Bedtime reminder cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel bedtime reminder:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ All scheduled notifications cancelled');
    } catch (error) {
      console.error('❌ Failed to cancel notifications:', error);
    }
  }
}

// Export as both named and default
export default NotificationService;
