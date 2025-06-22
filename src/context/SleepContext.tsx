import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { ActivityRecord, SleepStatus, DailySleepSummary, AppSettings } from '../types';
import { BackgroundActivityService } from '../services/BackgroundActivityService';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  inactivityThreshold: 45, // 45 minutes of inactivity before considered asleep
  useMachineLearning: true, // New setting for enhanced detection
  considerTimeOfDay: true, // New setting to consider typical sleep hours
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
      } catch (error) {
        console.error('Failed to load data from storage:', error);
        // Ensure we have default settings even if storage fails
        setSettings(DEFAULT_SETTINGS);
        // Mark settings as loaded even in error case
        setSettingsLoaded(true);
      }
    };

    loadData();

    // Cleanup function
    return () => {
      backgroundService.stopMonitoring();
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

  // Calculate sleep detection confidence based on multiple factors
  const calculateSleepConfidence = (
    inactiveTime: number,
    currentHour: number
  ): [SleepStatus, number] => {
    // Base confidence from inactivity
    let confidence = 0;
    let status = SleepStatus.AWAKE;

    // Determine status based on inactivity threshold
    if (inactiveTime >= settings.inactivityThreshold) {
      status = SleepStatus.ASLEEP;
      // Calculate confidence based on how long past threshold
      const excessTime = inactiveTime - settings.inactivityThreshold;
      confidence = 75 + Math.min(25, excessTime / 30 * 25); // Scale from 75% to 100% over 30 minutes
    } else {
      status = SleepStatus.AWAKE;
      // Higher confidence the more recent the activity
      const proximityToThreshold = inactiveTime / settings.inactivityThreshold;
      confidence = 100 - (proximityToThreshold * 40); // Scale from 100% to 60%
    }

    // Consider time of day if enabled
    if (settings.considerTimeOfDay) {
      const { typicalSleepStart, typicalSleepEnd } = sleepPatterns;

      // Determine if it's typical sleep hours
      const isNighttime = (currentHour >= typicalSleepStart) || (currentHour < typicalSleepEnd);

      // Adjust confidence based on time appropriateness
      if (status === SleepStatus.ASLEEP) {
        if (isNighttime) {
          // Sleeping at night is expected - boost confidence
          confidence = Math.min(100, confidence + 20);
        } else {
          // Sleeping during day is less typical - reduce confidence
          confidence = Math.max(30, confidence - 25);
        }
      } else {
        if (isNighttime && inactiveTime > settings.inactivityThreshold * 0.5) {
          // Being awake late at night when inactive is suspicious
          confidence = Math.max(40, confidence - 20);
        } else if (!isNighttime) {
          // Being awake during day is expected
          confidence = Math.min(100, confidence + 10);
        }
      }
    }

    // Additional confidence boost for very long inactivity periods
    if (status === SleepStatus.ASLEEP && inactiveTime > settings.inactivityThreshold * 2) {
      confidence = Math.min(100, confidence + 10);
    }

    return [status, Math.round(Math.max(0, Math.min(100, confidence)))];
  };

  // Periodic sleep detection check using background service
  useEffect(() => {
    const checkSleepStatus = async () => {
      try {
        // Get inactivity duration, excluding the current app check session
        const inactiveMinutes = await backgroundService.getInactivityDuration(false);
        const currentHour = new Date().getHours();

        console.log(`🔍 Sleep status check: ${Math.round(inactiveMinutes)} minutes genuine inactivity`);

        // Calculate sleep status and confidence based on inactivity
        const [detectedStatus, confidence] = calculateSleepConfidence(inactiveMinutes, currentHour);

        // Only update if status changed or confidence changed significantly
        if (detectedStatus !== currentStatus || Math.abs(confidence - currentConfidence) > 15) {
          console.log(`🔄 Status change detected: ${detectedStatus} (${confidence}% confidence)`);

          if (detectedStatus === SleepStatus.ASLEEP && currentStatus === SleepStatus.AWAKE) {
            // Transitioning to sleep - use the actual time when we believe sleep started
            const estimatedSleepStart = Date.now() - (inactiveMinutes * 60 * 1000);
            addActivityRecord(SleepStatus.ASLEEP, estimatedSleepStart, confidence);
            console.log(`😴 Sleep detected - estimated sleep start: ${new Date(estimatedSleepStart).toLocaleTimeString()}`);
          } else if (detectedStatus === SleepStatus.AWAKE && currentStatus === SleepStatus.ASLEEP) {
            // Waking up
            addActivityRecord(SleepStatus.AWAKE, Date.now(), confidence);
            console.log(`☀️ Wake detected at ${new Date().toLocaleTimeString()}`);
          }

          // Update current status even if no transition (for confidence changes)
          setCurrentStatus(detectedStatus);
          setCurrentConfidence(confidence);
        }
      } catch (error) {
        console.error('❌ Error checking sleep status:', error);
      }
    };

    // Check every 2 minutes when app is active
    const interval = setInterval(checkSleepStatus, 2 * 60 * 1000);

    // Initial check
    checkSleepStatus();

    return () => clearInterval(interval);
  }, [currentStatus, currentConfidence, settings.inactivityThreshold, settings.considerTimeOfDay]);
  // Handle app state changes (enhanced with background service integration)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const now = Date.now();
      const currentHour = new Date().getHours();

      console.log(`App state changed to: ${nextAppState}`);

      if (nextAppState === 'active') {
        // App became active - get actual inactivity time from background service
        const inactiveTime = await backgroundService.getInactivityDuration(false);

        console.log(`App became active after ${Math.round(inactiveTime)} minutes of inactivity`);

        if (currentStatus === SleepStatus.ASLEEP) {
          // If we were asleep, record waking up only if we interact beyond just checking
          // For now, record as awake but with lower confidence until we get real interaction
          addActivityRecord(SleepStatus.AWAKE, now, 85); // Slightly lower confidence for just opening app
        } else if (inactiveTime >= settings.inactivityThreshold) {
          // If we were inactive for longer than the threshold, we were asleep
          const [detectedStatus, confidence] = calculateSleepConfidence(inactiveTime, currentHour);

          if (detectedStatus === SleepStatus.ASLEEP) {
            // First record that we fell asleep after the threshold was reached
            const fellAsleepAt = now - (inactiveTime * 60 * 1000) + (settings.inactivityThreshold * 60 * 1000);
            addActivityRecord(SleepStatus.ASLEEP, fellAsleepAt, confidence);
            // Then record that we're now awake
            addActivityRecord(SleepStatus.AWAKE, now, 95);
          }
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background, but background service will continue monitoring
        setLastActiveTimestamp(now);
        console.log('App went to background - background monitoring will continue');
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
  const manuallySetStatus = (status: SleepStatus) => {
    // Add record with high confidence since user manually set it
    addActivityRecord(status, Date.now(), 100);

    // Also record this as genuine user activity in the background service
    backgroundService.recordUserActivity();
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

  // Update settings
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
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