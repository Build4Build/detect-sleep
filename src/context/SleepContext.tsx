import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { ActivityRecord, SleepStatus, DailySleepSummary, AppSettings } from '../types';
import { BackgroundActivityService } from '../services/BackgroundActivityService';
import { NotificationService } from '../services/NotificationService';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  inactivityThreshold: 30, // Reduced to 30 minutes for more responsive detection
  useMachineLearning: true, // Enhanced ML-based detection
  considerTimeOfDay: true, // Consider typical sleep hours
  sensitivityLevel: 'medium', // Movement detection sensitivity
  adaptiveThreshold: true, // Adapt threshold based on time and patterns
  napDetection: true, // Better short nap detection
  backgroundPersistence: 'aggressive', // Background service persistence level
  // New advanced options for enhanced control
  smartWakeupWindow: true, // Enable smart wake-up detection
  confidenceBasedAdjustment: true, // Dynamic threshold adjustment
  contextualNotifications: true, // Enhanced notification messages
  advancedSensorFiltering: true, // Multi-layer sensor filtering
  batteryOptimizedMode: false, // Full accuracy by default
  weekendModeEnabled: true, // Different weekend behavior
  sleepDataValidation: true, // Additional data validation
};

// Storage keys
const ACTIVITY_RECORDS_KEY = 'sleep-tracker-activity-records';
const DAILY_SUMMARIES_KEY = 'sleep-tracker-daily-summaries';
const SETTINGS_KEY = 'sleep-tracker-settings';
const SLEEP_PATTERNS_KEY = 'sleep-tracker-patterns';

// Typical sleep hours (used for improved detection)
const TYPICAL_SLEEP_START_HOUR = 22; // 10 PM
const TYPICAL_SLEEP_END_HOUR = 8; // 8 AM

// Context interface
interface SleepContextType {
  currentStatus: SleepStatus;
  currentConfidence: number; // New: confidence level in current status
  todayRecords: ActivityRecord[];
  dailySummaries: DailySleepSummary[];
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  exportData: () => Promise<string>;
  getTodaySleepDuration: () => number;
  manuallySetStatus: (status: SleepStatus) => void; // New: allow manual status setting
}

// Create context
const SleepContext = createContext<SleepContextType | undefined>(undefined);

// Provider component
export const SleepProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStatus, setCurrentStatus] = useState<SleepStatus>(SleepStatus.AWAKE);
  const [currentConfidence, setCurrentConfidence] = useState<number>(100);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySleepSummary[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false); // Track if settings are loaded
  const [lastActiveTimestamp, setLastActiveTimestamp] = useState<number>(Date.now());
  const [backgroundService] = useState(() => BackgroundActivityService.getInstance());
  const [notificationService] = useState(() => NotificationService.getInstance());
  const [sleepPatterns, setSleepPatterns] = useState<{
    typicalSleepStart: number; // hour 0-23
    typicalSleepEnd: number; // hour 0-23
    averageSleepDuration: number; // minutes
  }>({
    typicalSleepStart: TYPICAL_SLEEP_START_HOUR,
    typicalSleepEnd: TYPICAL_SLEEP_END_HOUR,
    averageSleepDuration: 480, // 8 hours default
  });

  // Load data from storage on mount and initialize background service
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load activity records
        const recordsJson = await AsyncStorage.getItem(ACTIVITY_RECORDS_KEY);
        if (recordsJson) {
          try {
            setActivityRecords(JSON.parse(recordsJson));
          } catch (parseError) {
            console.error('Failed to parse activity records:', parseError);
            // Reset to empty array if corrupted
            setActivityRecords([]);
          }
        }

        // Load daily summaries
        const summariesJson = await AsyncStorage.getItem(DAILY_SUMMARIES_KEY);
        if (summariesJson) {
          try {
            setDailySummaries(JSON.parse(summariesJson));
          } catch (parseError) {
            console.error('Failed to parse daily summaries:', parseError);
            setDailySummaries([]);
          }
        }

        // Load settings with better error handling
        const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
        if (settingsJson) {
          try {
            const loadedSettings = JSON.parse(settingsJson);
            // Merge with defaults to ensure all properties exist
            const mergedSettings = { ...DEFAULT_SETTINGS, ...loadedSettings };
            setSettings(mergedSettings);
            console.log('Settings loaded successfully:', mergedSettings);
          } catch (parseError) {
            console.error('Failed to parse settings, using defaults:', parseError);
            setSettings(DEFAULT_SETTINGS);
            // Save the default settings
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
          }
        } else {
          console.log('No saved settings found, using defaults');
          setSettings(DEFAULT_SETTINGS);
          // Save the default settings for next time
          await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
        }

        // Mark settings as loaded
        setSettingsLoaded(true);

        // Load sleep patterns
        const patternsJson = await AsyncStorage.getItem(SLEEP_PATTERNS_KEY);
        if (patternsJson) {
          try {
            setSleepPatterns(JSON.parse(patternsJson));
          } catch (parseError) {
            console.error('Failed to parse sleep patterns:', parseError);
            // Reset to default patterns if corrupted
            setSleepPatterns({
              typicalSleepStart: TYPICAL_SLEEP_START_HOUR,
              typicalSleepEnd: TYPICAL_SLEEP_END_HOUR,
              averageSleepDuration: 480,
            });
          }
        }

        // Initialize background activity monitoring
        await backgroundService.startMonitoring();
        console.log('Background activity monitoring started');

        // Initialize notification service
        await notificationService.initialize();
        // Pass app settings to notification service for contextual notifications
        notificationService.updateAppSettings(settings);
        console.log('Notification service initialized');
      } catch (error) {
        console.error('Failed to load data from storage:', error);
        // Ensure we have default settings even if storage fails
        setSettings(DEFAULT_SETTINGS);
        // Mark settings as loaded even in error case
        setSettingsLoaded(true);
      }
    };

    loadData();

    // Enhanced cleanup function with error handling
    return () => {
      console.log('🧹 SleepContext cleanup initiated');

      try {
        // Try graceful shutdown first
        backgroundService.stopMonitoring().catch((error) => {
          console.error('❌ Graceful shutdown failed, trying emergency shutdown:', error);
          // Fallback to emergency shutdown if graceful fails
          backgroundService.emergencyShutdown();
        });
      } catch (error) {
        console.error('❌ Critical error during cleanup:', error);
        // Last resort - emergency shutdown
        try {
          backgroundService.emergencyShutdown();
        } catch (emergencyError) {
          console.error('❌ Emergency shutdown also failed:', emergencyError);
        }
      }

      console.log('✅ SleepContext cleanup completed');
    };
  }, []);

  // Save activity records when they change
  useEffect(() => {
    if (activityRecords.length > 0) {
      AsyncStorage.setItem(ACTIVITY_RECORDS_KEY, JSON.stringify(activityRecords));
      updateDailySummaries();
    }
  }, [activityRecords]);

  // Save daily summaries when they change
  useEffect(() => {
    if (dailySummaries.length > 0) {
      AsyncStorage.setItem(DAILY_SUMMARIES_KEY, JSON.stringify(dailySummaries));
      // Learn from sleep patterns
      if (settings.useMachineLearning) {
        learnSleepPatterns();
      }
    }
  }, [dailySummaries]);

  // Save settings when they change (but only after initial load)
  useEffect(() => {
    if (settingsLoaded) {
      const saveSettings = async () => {
        try {
          await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
          console.log('Settings saved successfully:', settings);
        } catch (error) {
          console.error('Failed to save settings:', error);
        }
      };
      saveSettings();
    }
  }, [settings, settingsLoaded]);

  // Save sleep patterns when they change
  useEffect(() => {
    AsyncStorage.setItem(SLEEP_PATTERNS_KEY, JSON.stringify(sleepPatterns));
  }, [sleepPatterns]);

  // Learn from sleep data to improve detection
  const learnSleepPatterns = () => {
    // Skip if not enough data
    if (dailySummaries.length < 3) return;

    // Calculate average sleep metrics from the last week
    const lastWeekSummaries = dailySummaries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7);

    if (lastWeekSummaries.length === 0) return;

    // Calculate average sleep duration
    const totalSleepMinutes = lastWeekSummaries.reduce(
      (sum, day) => sum + day.totalSleepMinutes, 0
    );
    const averageSleepDuration = totalSleepMinutes / lastWeekSummaries.length;

    // Find typical sleep start and end times
    let sleepStartHours: number[] = [];
    let sleepEndHours: number[] = [];

    lastWeekSummaries.forEach(day => {
      day.sleepPeriods.forEach(period => {
        const startDate = new Date(period.start);
        const endDate = new Date(period.end);

        // Record sleep start and end hours
        sleepStartHours.push(startDate.getHours());
        sleepEndHours.push(endDate.getHours());
      });
    });

    // Calculate most common sleep start/end hours
    const typicalSleepStart = sleepStartHours.length > 0
      ? calculateMostFrequentHour(sleepStartHours)
      : TYPICAL_SLEEP_START_HOUR;

    const typicalSleepEnd = sleepEndHours.length > 0
      ? calculateMostFrequentHour(sleepEndHours)
      : TYPICAL_SLEEP_END_HOUR;

    // Update sleep patterns
    setSleepPatterns({
      typicalSleepStart,
      typicalSleepEnd,
      averageSleepDuration,
    });
  };

  // Helper to find most frequent hour
  const calculateMostFrequentHour = (hours: number[]): number => {
    const hourCounts = hours.reduce((counts, hour) => {
      counts[hour] = (counts[hour] || 0) + 1;
      return counts;
    }, {} as Record<number, number>);

    let mostFrequentHour = 0;
    let highestCount = 0;

    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > highestCount) {
        highestCount = count;
        mostFrequentHour = parseInt(hour);
      }
    });

    return mostFrequentHour;
  };

  // Calculate sleep detection confidence based on multiple factors with adaptive threshold
  const calculateSleepConfidence = (
    inactiveTime: number,
    currentHour: number
  ): [SleepStatus, number] => {
    // Base confidence from inactivity
    let confidence = 0;
    let status = SleepStatus.AWAKE;

    // Get adaptive threshold based on settings and time of day
    let effectiveThreshold = settings.inactivityThreshold;

    if (settings.adaptiveThreshold) {
      // Adjust threshold based on time of day and patterns
      if (currentHour >= 22 || currentHour <= 6) {
        // Nighttime - reduce threshold for faster detection
        effectiveThreshold = Math.max(20, settings.inactivityThreshold - 15);
      } else if (currentHour >= 13 && currentHour <= 15) {
        // Typical nap time - slightly reduce threshold
        effectiveThreshold = Math.max(25, settings.inactivityThreshold - 10);
      } else if (currentHour >= 7 && currentHour <= 11) {
        // Morning - increase threshold (less likely to be sleeping)
        effectiveThreshold = settings.inactivityThreshold + 10;
      }
    }

    // Enhanced nap detection
    const isNapTimeframe = currentHour >= 12 && currentHour <= 17;
    const isNightTimeframe = currentHour >= 21 || currentHour <= 6;

    // Determine status based on adaptive threshold
    if (inactiveTime >= effectiveThreshold) {
      status = SleepStatus.ASLEEP;
      // Calculate confidence based on how long past threshold
      const excessTime = inactiveTime - effectiveThreshold;
      // More gradual confidence increase over longer periods
      confidence = 70 + Math.min(30, (excessTime / 60) * 30); // Scale from 70% to 100% over 60 minutes

      // Boost confidence for expected sleep times
      if (isNightTimeframe) {
        confidence = Math.min(100, confidence + 15); // Night sleep bonus
      } else if (isNapTimeframe && settings.napDetection) {
        confidence = Math.min(100, confidence + 10); // Nap detection bonus
      }
    } else {
      status = SleepStatus.AWAKE;
      // Higher confidence the more recent the activity
      const proximityToThreshold = inactiveTime / effectiveThreshold;
      confidence = 100 - (proximityToThreshold * 35); // Scale from 100% to 65%

      // Reduce confidence if it's expected sleep time but we're awake
      if (isNightTimeframe && inactiveTime > effectiveThreshold * 0.7) {
        confidence = Math.max(50, confidence - 20); // Late night activity penalty
      }
    }

    // Consider time of day if enabled
    if (settings.considerTimeOfDay) {
      const { typicalSleepStart, typicalSleepEnd } = sleepPatterns;

      // Determine if it's typical sleep hours (handle overnight periods)
      const isNighttime = typicalSleepStart > typicalSleepEnd
        ? (currentHour >= typicalSleepStart || currentHour < typicalSleepEnd)
        : (currentHour >= typicalSleepStart && currentHour < typicalSleepEnd);

      // Adjust confidence based on time appropriateness
      if (status === SleepStatus.ASLEEP) {
        if (isNighttime) {
          // Sleeping at night is expected - boost confidence
          confidence = Math.min(100, confidence + 15);
        } else {
          // Sleeping during day - reduce confidence but don't penalize too much (naps are normal)
          confidence = Math.max(40, confidence - 15);
        }
      } else {
        if (isNighttime && inactiveTime > effectiveThreshold * 0.6) {
          // Being awake late at night when quite inactive is suspicious
          confidence = Math.max(45, confidence - 15);
        } else if (!isNighttime) {
          // Being awake during day is expected
          confidence = Math.min(100, confidence + 10);
        }
      }
    }

    // Additional confidence adjustments based on extended inactivity
    if (status === SleepStatus.ASLEEP) {
      if (inactiveTime > effectiveThreshold * 3) {
        // Very long inactivity (3x threshold) strongly suggests sleep
        confidence = Math.min(100, confidence + 15);
      } else if (inactiveTime > effectiveThreshold * 2) {
        // Extended inactivity (2x threshold) suggests sleep
        confidence = Math.min(100, confidence + 10);
      }
    }

    // Ensure minimum confidence levels for decision stability
    if (status === SleepStatus.ASLEEP && confidence < 60) {
      confidence = 60; // Minimum 60% confidence for sleep detection
    } else if (status === SleepStatus.AWAKE && confidence < 70) {
      confidence = 70; // Minimum 70% confidence for awake detection
    }

    console.log(`🧠 Adaptive detection: threshold ${effectiveThreshold}min (base: ${settings.inactivityThreshold}min), inactive: ${Math.round(inactiveTime)}min, confidence: ${Math.round(confidence)}%`);

    return [status, Math.round(Math.max(0, Math.min(100, confidence)))];
  };

  // Calculate sleep quality based on duration
  const calculateSleepQuality = (sleepDuration: number): string => {
    if (sleepDuration >= 480) { // 8+ hours
      return 'Excellent';
    } else if (sleepDuration >= 420) { // 7+ hours
      return 'Good';
    } else if (sleepDuration >= 360) { // 6+ hours
      return 'Adequate';
    } else if (sleepDuration >= 300) { // 5+ hours
      return 'Poor';
    } else {
      return 'Insufficient';
    }
  };

  // Periodic sleep detection check using background service
  useEffect(() => {
    const checkSleepStatus = async () => {
      try {
        // Get inactivity duration, excluding the current app check session
        const inactiveMinutes = await backgroundService.getInactivityDuration(false);
        const currentHour = new Date().getHours();
        const now = Date.now();

        // CRITICAL FIX: Check for threshold crossing event from background service
        try {
          const thresholdEvent = await AsyncStorage.getItem('SLEEP_THRESHOLD_CROSSED');
          if (thresholdEvent) {
            const event = JSON.parse(thresholdEvent);
            // Process threshold crossing events if we're currently awake and event is recent
            const eventAge = (now - event.timestamp) / (1000 * 60); // minutes

            if (event.detected && eventAge < 10 && currentStatus === SleepStatus.AWAKE) {
              // Use the sleep start time calculated by background service if available
              const sleepStartTime = event.sleepStartTime || (event.timestamp - ((event.inactiveMinutes - settings.inactivityThreshold) * 60 * 1000));

              // Record sleep with accurate start time and high confidence
              addActivityRecord(SleepStatus.ASLEEP, sleepStartTime, 90);

              // Send sleep detection notification if not already sent
              if (!event.notificationSent) {
                await notificationService.notifySleepDetected(event.inactiveMinutes);
              }

              // Clear the event so we don't process it again
              await AsyncStorage.removeItem('SLEEP_THRESHOLD_CROSSED');
              console.log(`✅ Threshold crossing event processed and cleared`);

              return; // Exit early - we've handled the threshold crossing
            } else if (eventAge >= 10) {
              // Clean up old events
              await AsyncStorage.removeItem('SLEEP_THRESHOLD_CROSSED');
              console.log(`🧹 Cleaned up old threshold event (${Math.round(eventAge)}min old)`);
            }
          }
        } catch (thresholdError) {
          console.error('Error checking threshold crossing event:', thresholdError);
        }

        // Calculate sleep status and confidence based on inactivity
        const [detectedStatus, confidence] = calculateSleepConfidence(inactiveMinutes, currentHour);

        // ENHANCED THRESHOLD DETECTION: Immediate sleep recording when threshold is reached
        if (inactiveMinutes >= settings.inactivityThreshold && currentStatus === SleepStatus.AWAKE) {
          console.log(`🛌 SLEEP THRESHOLD REACHED: ${Math.round(inactiveMinutes)} minutes >= ${settings.inactivityThreshold} minutes`);

          // Calculate accurate sleep start time (when threshold was reached)
          const sleepStartTime = now - (settings.inactivityThreshold * 60 * 1000);

          // Record sleep with the correct start time
          addActivityRecord(SleepStatus.ASLEEP, sleepStartTime, confidence);
          console.log(`😴 Sleep auto-recorded from foreground check - start: ${new Date(sleepStartTime).toLocaleTimeString()}, current duration: ${Math.round(inactiveMinutes)}min`);

          // Send sleep detection notification
          await notificationService.notifySleepDetected(inactiveMinutes);

          // Also trigger a force threshold check to ensure background service is in sync
          try {
            await backgroundService.forceThresholdCheck();
          } catch (error) {
            console.error('Error in force threshold check:', error);
          }

          return; // Exit early to avoid duplicate processing
        }

        // FALLBACK: Force threshold check if we're close to threshold (90% of threshold)
        const closeToThreshold = inactiveMinutes >= (settings.inactivityThreshold * 0.9);
        if (closeToThreshold && currentStatus === SleepStatus.AWAKE) {
          console.log(`⚠️ Close to threshold: ${Math.round(inactiveMinutes)}min (${Math.round((inactiveMinutes / settings.inactivityThreshold) * 100)}% of ${settings.inactivityThreshold}min threshold)`);

          // Force a background threshold check
          try {
            const thresholdTriggered = await backgroundService.forceThresholdCheck();
            if (thresholdTriggered) {
              console.log(`🚨 Force threshold check triggered sleep detection`);
              return; // Exit to let the event be processed on next cycle
            }
          } catch (error) {
            console.error('Error in force threshold check:', error);
          }
        }

        const wakeThreshold = Math.min(15, settings.inactivityThreshold * 0.4); // More responsive wake detection
        if (inactiveMinutes < wakeThreshold && currentStatus === SleepStatus.ASLEEP) {
          // Record wake time
          addActivityRecord(SleepStatus.AWAKE, now, confidence);

          // Calculate sleep duration and quality for wake notification
          const sleepDuration = getTodaySleepDuration();
          const sleepQuality = calculateSleepQuality(sleepDuration);
          await notificationService.notifyWakeDetected(sleepDuration, sleepQuality);

          return; // Exit early
        }

        // Only update if status changed or confidence changed significantly (>15%)
        const significantConfidenceChange = Math.abs(confidence - currentConfidence) > 15;
        const statusChanged = detectedStatus !== currentStatus;

        if (statusChanged || significantConfidenceChange) {
          if (statusChanged) {
            setCurrentStatus(detectedStatus);
            setCurrentConfidence(confidence);
          } else if (significantConfidenceChange) {
            setCurrentConfidence(confidence);
          }
        }
      } catch (error) {
        console.error('❌ Error checking sleep status:', error);
      }
    };

    const interval = setInterval(checkSleepStatus, 30 * 1000);

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkSleepStatus, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [currentStatus, currentConfidence, settings.inactivityThreshold, settings.considerTimeOfDay]);
  // Handle app state changes (enhanced with background service integration)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const now = Date.now();
      const currentHour = new Date().getHours();

      if (nextAppState === 'active') {
        // App became active - record genuine user activity
        backgroundService.recordUserActivity();

        // Check if there was a pending threshold crossing event that we need to clear
        const hadThresholdEvent = await backgroundService.hasThresholdCrossingEvent();
        if (hadThresholdEvent) {
          console.log('🚨 User became active with pending sleep detection - clearing threshold event');
          await backgroundService.clearThresholdCrossingEvent();
        }

        // Get actual inactivity time from background service
        const inactiveTime = await backgroundService.getInactivityDuration(false);
        console.log(`📱 App became active after ${Math.round(inactiveTime)} minutes of inactivity`);

        // ENHANCED WAKE DETECTION: More responsive wake detection
        if (currentStatus === SleepStatus.ASLEEP) {
          // User was sleeping and just became active - this is a wake event
          console.log('☀️ WAKE DETECTED: User opened app while sleeping');

          addActivityRecord(SleepStatus.AWAKE, now, 95); // High confidence for active app usage

          // Send wake detection notification with sleep summary
          const sleepDuration = getTodaySleepDuration();
          const sleepQuality = calculateSleepQuality(sleepDuration);
          await notificationService.notifyWakeDetected(sleepDuration, sleepQuality);

        } else if (inactiveTime >= settings.inactivityThreshold) {
          // If we were inactive for longer than the threshold, we missed the sleep detection
          console.log(`🛌 MISSED SLEEP DETECTION: App became active after ${Math.round(inactiveTime)}min (threshold: ${settings.inactivityThreshold}min)`);

          const [detectedStatus, confidence] = calculateSleepConfidence(inactiveTime, currentHour);

          if (detectedStatus === SleepStatus.ASLEEP) {
            // Record retroactive sleep period
            const fellAsleepAt = now - (inactiveTime * 60 * 1000) + (settings.inactivityThreshold * 60 * 1000);
            addActivityRecord(SleepStatus.ASLEEP, fellAsleepAt, confidence);

            // Then record that we're now awake
            addActivityRecord(SleepStatus.AWAKE, now, 95);

            // Send wake notification with sleep summary
            const sleepDuration = getTodaySleepDuration();
            const sleepQuality = calculateSleepQuality(sleepDuration);
            await notificationService.notifyWakeDetected(sleepDuration, sleepQuality);
          }
        } else {
          // Just a normal app activation - record minor activity update
          console.log(`📱 Normal app activation after ${Math.round(inactiveTime)} minutes`);
        }

      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background - background service will continue monitoring
        setLastActiveTimestamp(now);
        console.log('📵 App went to background - background monitoring will continue');
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial activity record if none exists
    if (activityRecords.length === 0) {
      addActivityRecord(SleepStatus.AWAKE);
    }

    return () => {
      subscription.remove();
    };
  }, [currentStatus, lastActiveTimestamp, settings.inactivityThreshold, settings.considerTimeOfDay]);

  // Add a new activity record
  const addActivityRecord = (
    status: SleepStatus,
    timestamp = Date.now(),
    confidence = 100
  ) => {
    const newRecord: ActivityRecord = {
      id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      status,
      confidence: confidence,
    };

    setActivityRecords(prev => [...prev, newRecord]);
    setCurrentStatus(status);
    setCurrentConfidence(confidence);
  };

  // Allow manual setting of sleep status
  const manuallySetStatus = async (status: SleepStatus) => {
    const previousStatus = currentStatus;

    // Add record with high confidence since user manually set it
    addActivityRecord(status, Date.now(), 100);

    // Also record this as genuine user activity in the background service
    backgroundService.recordUserActivity();

    // Handle notifications for manual status changes
    try {
      if (status === SleepStatus.AWAKE && previousStatus === SleepStatus.ASLEEP) {
        // User manually marked as awake - send wake notification
        const sleepDuration = getTodaySleepDuration();
        const sleepQuality = calculateSleepQuality(sleepDuration);
        await notificationService.notifyWakeDetected(sleepDuration, sleepQuality);
        console.log('Wake notification sent for manual status change');
      }
      // Note: We don't send sleep detection notification for manual sleep setting
      // since the user is actively using the phone to set the status
    } catch (error) {
      console.error('Failed to send notification for manual status change:', error);
    }
  };

  // Update daily summaries based on activity records
  const updateDailySummaries = () => {
    // Group records by day
    const recordsByDay: Record<string, ActivityRecord[]> = {};

    activityRecords.forEach(record => {
      const date = format(record.timestamp, 'yyyy-MM-dd');
      if (!recordsByDay[date]) {
        recordsByDay[date] = [];
      }
      recordsByDay[date].push(record);
    });

    // Calculate sleep periods and totals for each day
    const newSummaries: DailySleepSummary[] = Object.keys(recordsByDay).map(date => {
      const dayRecords = recordsByDay[date].sort((a, b) => a.timestamp - b.timestamp);
      const sleepPeriods: { start: number; end: number; confidence: number }[] = [];
      let totalSleepMinutes = 0;

      // Find sleep periods
      for (let i = 0; i < dayRecords.length - 1; i++) {
        if (dayRecords[i].status === SleepStatus.ASLEEP && dayRecords[i + 1].status === SleepStatus.AWAKE) {
          const start = dayRecords[i].timestamp;
          const end = dayRecords[i + 1].timestamp;
          // Average confidence between sleep and wake events
          const confidence = (dayRecords[i].confidence + dayRecords[i + 1].confidence) / 2;

          sleepPeriods.push({ start, end, confidence });

          // Add to total sleep time (weighted by confidence)
          const periodMinutes = (end - start) / (1000 * 60);
          totalSleepMinutes += periodMinutes * (confidence / 100);
        }
      }

      return {
        date,
        totalSleepMinutes,
        sleepPeriods,
      };
    });

    setDailySummaries(newSummaries);
  };

  // Update settings and pass to services
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    // Update notification service settings for contextual notifications
    notificationService.updateAppSettings(updatedSettings);
  };

  // Export data as JSON
  const exportData = async (): Promise<string> => {
    const data = {
      activityRecords,
      dailySummaries,
      settings,
      sleepPatterns,
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  };

  // Get today's sleep duration in minutes
  const getTodaySleepDuration = (): number => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaySummary = dailySummaries.find(summary => summary.date === today);
    return todaySummary?.totalSleepMinutes || 0;
  };

  // Get today's activity records
  const getTodayRecords = (): ActivityRecord[] => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return activityRecords.filter(record =>
      format(record.timestamp, 'yyyy-MM-dd') === today
    );
  };

  // Test method to check current sleep detection status (for debugging)
  const testSleepDetection = async (): Promise<{
    inactivityMinutes: number;
    currentHour: number;
    detectedStatus: SleepStatus;
    confidence: number;
    threshold: number;
  }> => {
    const inactivityMinutes = await backgroundService.getInactivityDuration(false);
    const currentHour = new Date().getHours();
    const [detectedStatus, confidence] = calculateSleepConfidence(inactivityMinutes, currentHour);

    return {
      inactivityMinutes,
      currentHour,
      detectedStatus,
      confidence,
      threshold: settings.inactivityThreshold
    };
  };

  return (
    <SleepContext.Provider
      value={{
        currentStatus,
        currentConfidence,
        todayRecords: getTodayRecords(),
        dailySummaries,
        settings,
        updateSettings,
        exportData,
        getTodaySleepDuration,
        manuallySetStatus,
      }}
    >
      {children}
    </SleepContext.Provider>
  );
};

// Custom hook to use the sleep context
export const useSleep = (): SleepContextType => {
  const context = useContext(SleepContext);
  if (context === undefined) {
    throw new Error('useSleep must be used within a SleepProvider');
  }
  return context;
};