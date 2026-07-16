import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { ActivityRecord, AppSettings, DailySleepSummary, SleepStatus } from '../types';
import { BackgroundActivityService, InactivePeriod } from '../services/BackgroundActivityService';
import { NotificationService } from '../services/NotificationService';
import { HealthService } from '../services/HealthService';
import { buildDailySleepSummaries, detectSleepSession } from '../services/SleepDetectionService';

const DEFAULT_SETTINGS: AppSettings = {
  inactivityThreshold: 30,
  useMachineLearning: true,
  considerTimeOfDay: true,
  sensitivityLevel: 'medium',
  adaptiveThreshold: true,
  napDetection: true,
  backgroundPersistence: 'aggressive',
  smartWakeupWindow: true,
  confidenceBasedAdjustment: true,
  contextualNotifications: true,
  advancedSensorFiltering: true,
  batteryOptimizedMode: false,
  weekendModeEnabled: true,
  sleepDataValidation: true,
};

const ACTIVITY_RECORDS_KEY = 'sleep-tracker-activity-records';
const DAILY_SUMMARIES_KEY = 'sleep-tracker-daily-summaries';
const SETTINGS_KEY = 'sleep-tracker-settings';
const SLEEP_PATTERNS_KEY = 'sleep-tracker-patterns';

interface SleepContextType {
  currentStatus: SleepStatus;
  currentConfidence: number;
  todayRecords: ActivityRecord[];
  dailySummaries: DailySleepSummary[];
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  exportData: () => Promise<string>;
  getTodaySleepDuration: () => number;
  manuallySetStatus: (status: SleepStatus) => void;
}

const SleepContext = createContext<SleepContextType | undefined>(undefined);

const makeRecord = (status: SleepStatus, timestamp: number, confidence: number): ActivityRecord => ({
  id: `${timestamp}-${status}-${Math.random().toString(36).slice(2, 9)}`,
  timestamp,
  status,
  confidence,
});

const sleepQuality = (minutes: number): string => {
  if (minutes >= 480) return 'Excellent';
  if (minutes >= 420) return 'Good';
  if (minutes >= 360) return 'Adequate';
  if (minutes >= 300) return 'Poor';
  return 'Insufficient';
};

export const SleepProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStatus, setCurrentStatus] = useState(SleepStatus.AWAKE);
  const [currentConfidence, setCurrentConfidence] = useState(100);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const recordsRef = useRef<ActivityRecord[]>([]);
  const statusRef = useRef(SleepStatus.AWAKE);
  const confidenceRef = useRef(100);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const initializedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundService = useMemo(() => BackgroundActivityService.getInstance(), []);
  const notificationService = useMemo(() => NotificationService.getInstance(), []);
  const healthService = useMemo(() => HealthService.getInstance(), []);

  const dailySummaries = useMemo(
    () => buildDailySleepSummaries(activityRecords),
    [activityRecords],
  );

  const appendRecords = useCallback((records: ActivityRecord[]) => {
    if (records.length === 0) return;
    setActivityRecords(previous => {
      const next = [...previous, ...records].sort((a, b) => a.timestamp - b.timestamp);
      recordsRef.current = next;
      return next;
    });
    const latest = records[records.length - 1];
    statusRef.current = latest.status;
    confidenceRef.current = latest.confidence;
    setCurrentStatus(latest.status);
    setCurrentConfidence(latest.confidence);
  }, []);

  const syncSleepPeriod = useCallback(async (startTime: number, endTime: number, confidence: number) => {
    try {
      if (!(await healthService.getSyncEnabled())) return;
      if (!healthService.hasRequiredPermissions() && !(await healthService.initialize(false))) return;
      await healthService.saveSleepData({
        id: `detected-${startTime}-${endTime}`,
        startTime,
        endTime,
        isAwake: false,
        confidence,
        source: 'Sleep Detector',
      });
    } catch (error) {
      console.error('Unable to sync completed sleep to Apple Health:', error);
    }
  }, [healthService]);

  const finishSleep = useCallback(async (
    startTime: number,
    endTime: number,
    confidence: number,
    recordStart = true,
  ) => {
    if (endTime <= startTime) return;
    const durationMinutes = (endTime - startTime) / 60_000;
    appendRecords([
      ...(recordStart ? [makeRecord(SleepStatus.ASLEEP, startTime, confidence)] : []),
      makeRecord(SleepStatus.AWAKE, endTime, 100),
    ]);
    await syncSleepPeriod(startTime, endTime, confidence);
    await notificationService.notifyWakeDetected(durationMinutes, sleepQuality(durationMinutes));
  }, [appendRecords, notificationService, syncSleepPeriod]);

  const processInactivePeriod = useCallback(async (
    period: InactivePeriod | null,
    effectiveSettings: AppSettings,
  ) => {
    if (!period) return;

    if (statusRef.current === SleepStatus.ASLEEP) {
      const start = [...recordsRef.current]
        .reverse()
        .find(record => record.status === SleepStatus.ASLEEP)?.timestamp;
      if (start) await finishSleep(start, period.endTime, confidenceRef.current, false);
      return;
    }

    const session = detectSleepSession(
      period.startTime,
      period.endTime,
      effectiveSettings.inactivityThreshold,
    );
    if (session) await finishSleep(session.startTime, session.endTime, session.confidence);
  }, [finishSleep]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [recordsJson, settingsJson] = await Promise.all([
          AsyncStorage.getItem(ACTIVITY_RECORDS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);
        if (cancelled) return;

        const loadedRecords: ActivityRecord[] = recordsJson ? JSON.parse(recordsJson) : [];
        const loadedSettings = settingsJson
          ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) }
          : DEFAULT_SETTINGS;
        const latest = [...loadedRecords].sort((a, b) => b.timestamp - a.timestamp)[0];

        recordsRef.current = loadedRecords;
        setActivityRecords(loadedRecords);
        settingsRef.current = loadedSettings;
        setSettings(loadedSettings);
        setSettingsLoaded(true);
        if (latest) {
          statusRef.current = latest.status;
          confidenceRef.current = latest.confidence;
          setCurrentStatus(latest.status);
          setCurrentConfidence(latest.confidence);
        }

        await Promise.all([
          backgroundService.startMonitoring(),
          notificationService.initialize(),
          healthService.initialize(false),
        ]);
        notificationService.updateAppSettings(loadedSettings);

        const pendingPeriod = await backgroundService.consumeInactivePeriod(Date.now());
        initializedRef.current = true;
        await processInactivePeriod(pendingPeriod, loadedSettings);
      } catch (error) {
        console.error('Failed to initialize sleep tracking:', error);
        setSettingsLoaded(true);
        initializedRef.current = true;
      }
    };

    load();
    return () => {
      cancelled = true;
      backgroundService.stopMonitoring().catch(console.error);
    };
  }, [backgroundService, healthService, notificationService, processInactivePeriod]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextState => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      if (!initializedRef.current) return;

      try {
        if (nextState === 'active' && previousState !== 'active') {
          const period = await backgroundService.consumeInactivePeriod(Date.now());
          await processInactivePeriod(period, settingsRef.current);
        } else if (previousState === 'active' && (nextState === 'inactive' || nextState === 'background')) {
          await backgroundService.recordAppInactive(Date.now());
        }
      } catch (error) {
        console.error('Failed to process app activity transition:', error);
      }
    });
    return () => subscription.remove();
  }, [backgroundService, processInactivePeriod]);

  useEffect(() => {
    if (!settingsLoaded) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(console.error);
  }, [settings, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    AsyncStorage.setItem(ACTIVITY_RECORDS_KEY, JSON.stringify(activityRecords)).catch(console.error);
  }, [activityRecords, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    AsyncStorage.setItem(DAILY_SUMMARIES_KEY, JSON.stringify(dailySummaries)).catch(console.error);
  }, [dailySummaries, settingsLoaded]);

  const updateSettings = (changes: Partial<AppSettings>) => {
    const updated = { ...settingsRef.current, ...changes };
    settingsRef.current = updated;
    setSettings(updated);
    notificationService.updateAppSettings(updated);
  };

  const manuallySetStatus = async (status: SleepStatus) => {
    if (statusRef.current === status) return;
    const now = Date.now();
    if (status === SleepStatus.AWAKE) {
      const start = [...recordsRef.current]
        .reverse()
        .find(record => record.status === SleepStatus.ASLEEP)?.timestamp;
      if (start) await finishSleep(start, now, 100, false);
    } else {
      appendRecords([makeRecord(SleepStatus.ASLEEP, now, 100)]);
    }
    await backgroundService.recordUserActivity(now);
  };

  const todayRecords = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return activityRecords.filter(record => format(record.timestamp, 'yyyy-MM-dd') === today);
  }, [activityRecords]);

  const getTodaySleepDuration = (): number => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return dailySummaries.find(summary => summary.date === today)?.totalSleepMinutes ?? 0;
  };

  const exportData = async (): Promise<string> => JSON.stringify({
    activityRecords,
    dailySummaries,
    settings,
    exportDate: new Date().toISOString(),
  }, null, 2);

  return (
    <SleepContext.Provider value={{
      currentStatus,
      currentConfidence,
      todayRecords,
      dailySummaries,
      settings,
      updateSettings,
      exportData,
      getTodaySleepDuration,
      manuallySetStatus,
    }}>
      {children}
    </SleepContext.Provider>
  );
};

export const useSleep = (): SleepContextType => {
  const context = useContext(SleepContext);
  if (!context) throw new Error('useSleep must be used within a SleepProvider');
  return context;
};
