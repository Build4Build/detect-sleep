import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { ActivityRecord, SleepStatus, DailySleepSummary, AppSettings } from '../types';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  inactivityThreshold: 45, // 45 minutes of inactivity before considered asleep
  notificationsEnabled: true,
};

// Storage keys
const ACTIVITY_RECORDS_KEY = 'sleep-tracker-activity-records';
const DAILY_SUMMARIES_KEY = 'sleep-tracker-daily-summaries';
const SETTINGS_KEY = 'sleep-tracker-settings';

// Context interface
interface SleepContextType {
  currentStatus: SleepStatus;
  todayRecords: ActivityRecord[];
  dailySummaries: DailySleepSummary[];
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  exportData: () => Promise<string>;
  getTodaySleepDuration: () => number;
}

// Create context
const SleepContext = createContext<SleepContextType | undefined>(undefined);

// Provider component
export const SleepProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStatus, setCurrentStatus] = useState<SleepStatus>(SleepStatus.AWAKE);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySleepSummary[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [lastActiveTimestamp, setLastActiveTimestamp] = useState<number>(Date.now());
  
  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load activity records
        const recordsJson = await AsyncStorage.getItem(ACTIVITY_RECORDS_KEY);
        if (recordsJson) {
          setActivityRecords(JSON.parse(recordsJson));
        }
        
        // Load daily summaries
        const summariesJson = await AsyncStorage.getItem(DAILY_SUMMARIES_KEY);
        if (summariesJson) {
          setDailySummaries(JSON.parse(summariesJson));
        }
        
        // Load settings
        const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
        if (settingsJson) {
          setSettings(JSON.parse(settingsJson));
        }
      } catch (error) {
        console.error('Failed to load data from storage:', error);
      }
    };
    
    loadData();
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
    }
  }, [dailySummaries]);
  
  // Save settings when they change
  useEffect(() => {
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);
  
  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const now = Date.now();
      
      if (nextAppState === 'active') {
        // App became active
        const inactiveTime = (now - lastActiveTimestamp) / (1000 * 60); // Convert to minutes
        
        if (currentStatus === SleepStatus.ASLEEP) {
          // If we were asleep, record waking up
          addActivityRecord(SleepStatus.AWAKE);
        } else if (inactiveTime >= settings.inactivityThreshold) {
          // If we were inactive for longer than the threshold, we were asleep
          // First record that we fell asleep after the threshold was reached
          const fellAsleepAt = lastActiveTimestamp + settings.inactivityThreshold * 60 * 1000;
          addActivityRecord(SleepStatus.ASLEEP, fellAsleepAt);
          // Then record that we're now awake
          addActivityRecord(SleepStatus.AWAKE);
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background, update last active timestamp
        setLastActiveTimestamp(now);
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
  }, [currentStatus, lastActiveTimestamp, settings.inactivityThreshold]);
  
  // Add a new activity record
  const addActivityRecord = (status: SleepStatus, timestamp = Date.now()) => {
    const newRecord: ActivityRecord = {
      id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      status,
    };
    
    setActivityRecords(prev => [...prev, newRecord]);
    setCurrentStatus(status);
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
      const sleepPeriods: { start: number; end: number }[] = [];
      let totalSleepMinutes = 0;
      
      // Find sleep periods
      for (let i = 0; i < dayRecords.length - 1; i++) {
        if (dayRecords[i].status === SleepStatus.ASLEEP && dayRecords[i + 1].status === SleepStatus.AWAKE) {
          const start = dayRecords[i].timestamp;
          const end = dayRecords[i + 1].timestamp;
          sleepPeriods.push({ start, end });
          
          // Add to total sleep time
          totalSleepMinutes += (end - start) / (1000 * 60);
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
        todayRecords: getTodayRecords(),
        dailySummaries,
        settings,
        updateSettings,
        exportData,
        getTodaySleepDuration,
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