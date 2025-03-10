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
}

// Daily sleep summary
export interface DailySleepSummary {
  date: string; // ISO date string (YYYY-MM-DD)
  totalSleepMinutes: number;
  sleepPeriods: {
    start: number; // Unix timestamp
    end: number; // Unix timestamp
  }[];
}

// App settings
export interface AppSettings {
  inactivityThreshold: number; // Minutes of inactivity before considered asleep
  notificationsEnabled: boolean;
}

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
  SleepDetails: { date: string };
  Export: undefined;
  History: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  History: undefined;
  Stats: undefined;
}; 