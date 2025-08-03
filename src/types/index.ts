// Types for sleep tracking app

// Sleep status enum
export enum SleepStatus {
  AWAKE = 'awake',
  ASLEEP = 'asleep',
}

// Activity record interface
export interface ActivityRecord {
  id: string;
  timestamp: number; // Unix timestamp
  status: SleepStatus;
  confidence: number; // 0-100 confidence score in detection accuracy
}

// Daily sleep summary
export interface DailySleepSummary {
  date: string; // ISO date string (YYYY-MM-DD)
  totalSleepMinutes: number;
  sleepPeriods: {
    start: number; // Unix timestamp
    end: number; // Unix timestamp
    confidence: number; // 0-100 confidence score
  }[];
}

// App settings
export interface AppSettings {
  inactivityThreshold: number; // Minutes of inactivity before considered asleep
  useMachineLearning: boolean; // Whether to use enhanced ML-based detection
  considerTimeOfDay: boolean; // Consider typical sleep hours in detection
  sensitivityLevel: 'low' | 'medium' | 'high'; // Movement detection sensitivity
  adaptiveThreshold: boolean; // Adapt threshold based on time and patterns
  napDetection: boolean; // Enable enhanced nap detection
  backgroundPersistence: 'normal' | 'aggressive' | 'maximum'; // Background service persistence
  // New advanced options for enhanced control
  smartWakeupWindow: boolean; // Enable smart wake-up within a time window
  confidenceBasedAdjustment: boolean; // Adjust thresholds based on detection confidence
  contextualNotifications: boolean; // Enhanced context-aware notification messages
  advancedSensorFiltering: boolean; // Use multi-layer sensor noise filtering
  batteryOptimizedMode: boolean; // Balance accuracy vs battery usage
  weekendModeEnabled: boolean; // Different thresholds for weekends
  sleepDataValidation: boolean; // Additional validation for sleep records
}

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
  SleepDetails: { date: string };
  Export: undefined;
  History: undefined;
  NotificationSettings: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  History: undefined;
  Stats: undefined;
}; 