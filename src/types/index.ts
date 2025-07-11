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