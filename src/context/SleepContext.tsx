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
import {
  ActivityRecord,
  AppSettings,
  DailySleepSummary,
  DailyWellnessCheckIn,
  DailyWellnessReport,
  HealthRecoverySnapshot,
  SleepCandidate,
  SleepSession,
  SleepStatus,
  WatchSleepSnapshot,
} from '../types';
import { SleepEntry } from '../types/SleepEntry';
import { BackgroundActivityService, InactivePeriod } from '../services/BackgroundActivityService';
import { NotificationService } from '../services/NotificationService';
import { HealthService } from '../services/HealthService';
import { buildDailySleepSummaries, detectSleepSession } from '../services/SleepDetectionService';
import { analyzeSleepCandidate } from '../services/SleepAnalysisService';
import { WatchDataService, watchSleepOverlapRatio } from '../services/WatchDataService';
import { buildDailyWellnessReport } from '../services/WellnessReportService';
import {
  createSleepSession,
  updateSessionSyncState,
  upsertSleepSession,
} from '../services/SleepSessionService';

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
const SLEEP_CANDIDATES_KEY = 'sleep-tracker-candidates';
const SLEEP_SESSIONS_KEY = 'sleep-tracker-sessions-v1';
const WELLNESS_REPORTS_KEY = 'sleep-tracker-wellness-reports-v1';
const WELLNESS_CHECK_INS_KEY = 'sleep-tracker-wellness-check-ins-v1';
const WELLNESS_REFRESH_INTERVAL_MS = 15 * 60_000;

interface SleepContextType {
  currentStatus: SleepStatus;
  currentConfidence: number;
  todayRecords: ActivityRecord[];
  dailySummaries: DailySleepSummary[];
  sleepSessions: SleepSession[];
  todayWellnessReport: DailyWellnessReport | null;
  settings: AppSettings;
  pendingSleepCandidate: SleepCandidate | null;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  exportData: () => Promise<string>;
  getTodaySleepDuration: () => number;
  manuallySetStatus: (status: SleepStatus) => void;
  confirmSleepCandidate: () => Promise<void>;
  dismissSleepCandidate: () => Promise<void>;
  updateSleepCandidateBounds: (startTime: number, endTime: number) => void;
  syncHealthSessions: () => Promise<void>;
  saveWellnessCheckIn: (checkIn: Omit<DailyWellnessCheckIn, 'date' | 'updatedAt'>) => Promise<void>;
  clearSleepData: () => Promise<void>;
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

const historicalSessionsFromRecords = (records: ActivityRecord[]): SleepSession[] => {
  const sorted = [...records].sort((left, right) => left.timestamp - right.timestamp);
  const sessions: SleepSession[] = [];
  let asleep: ActivityRecord | null = null;
  for (const record of sorted) {
    if (record.status === SleepStatus.ASLEEP) {
      asleep = record;
    } else if (asleep && record.timestamp > asleep.timestamp) {
      sessions.push({
        id: `legacy-${asleep.id}-${record.id}`,
        startTime: asleep.timestamp,
        endTime: record.timestamp,
        confidence: Math.round((asleep.confidence + record.confidence) / 2),
        source: 'combined',
        evidence: [],
        userConfirmed: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        createdAt: asleep.timestamp,
        updatedAt: record.timestamp,
        healthSyncState: 'not-requested',
      });
      asleep = null;
    }
  }
  return sessions;
};

const reportRangeForDate = (date: string): { start: Date; end: Date } => {
  const end = new Date(`${date}T12:00:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return { start, end };
};

const reportDateForTimestamp = (timestamp: number): string => {
  const wakeDate = new Date(timestamp);
  if (wakeDate.getHours() >= 12) wakeDate.setDate(wakeDate.getDate() + 1);
  return format(wakeDate, 'yyyy-MM-dd');
};

const summaryForReportRange = (
  sessions: SleepSession[],
  date: string,
  start: number,
  end: number,
): DailySleepSummary => {
  const sleepPeriods = sessions.flatMap(session => {
    if (session.endTime === undefined) return [];
    const clippedStart = Math.max(start, session.startTime);
    const clippedEnd = Math.min(end, session.endTime);
    return clippedEnd > clippedStart
      ? [{ start: clippedStart, end: clippedEnd, confidence: session.confidence }]
      : [];
  });
  return {
    date,
    sleepPeriods,
    totalSleepMinutes: sleepPeriods.reduce(
      (total, period) => total + (period.end - period.start) / 60_000,
      0,
    ),
  };
};

export const SleepProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStatus, setCurrentStatus] = useState(SleepStatus.AWAKE);
  const [currentConfidence, setCurrentConfidence] = useState(100);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [sleepCandidates, setSleepCandidates] = useState<SleepCandidate[]>([]);
  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>([]);
  const [wellnessReports, setWellnessReports] = useState<DailyWellnessReport[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const recordsRef = useRef<ActivityRecord[]>([]);
  const statusRef = useRef(SleepStatus.AWAKE);
  const confidenceRef = useRef(100);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const sessionsRef = useRef<SleepSession[]>([]);
  const wellnessReportsRef = useRef<DailyWellnessReport[]>([]);
  const wellnessCheckInsRef = useRef<DailyWellnessCheckIn[]>([]);
  const initializedRef = useRef(false);
  const candidateActionRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lifecycleQueueRef = useRef<Promise<void>>(Promise.resolve());
  const watchSnapshotsRef = useRef<WatchSleepSnapshot[]>([]);
  const backgroundService = useMemo(() => BackgroundActivityService.getInstance(), []);
  const notificationService = useMemo(() => NotificationService.getInstance(), []);
  const healthService = useMemo(() => HealthService.getInstance(), []);

  const dailySummaries = useMemo(
    () => buildDailySleepSummaries(activityRecords),
    [activityRecords],
  );
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const todayWellnessReport = useMemo(
    () => wellnessReports.find(report => report.date === todayDate) ?? null,
    [todayDate, wellnessReports],
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

  const persistSessions = useCallback((sessions: SleepSession[]) => {
    sessionsRef.current = sessions;
    setSleepSessions(sessions);
    return AsyncStorage.setItem(SLEEP_SESSIONS_KEY, JSON.stringify(sessions));
  }, []);

  const syncSleepSession = useCallback(async (session: SleepSession) => {
    try {
      if (!(await healthService.getSyncEnabled())) return;
      const pending = updateSessionSyncState(
        sessionsRef.current,
        session.id,
        'pending',
      );
      await persistSessions(pending);
      if (!(await healthService.initialize(false))) {
        throw new Error('Apple Health sleep write permission is unavailable.');
      }
      await healthService.saveSleepData({
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime!,
        isAwake: false,
        confidence: session.confidence,
        source: 'Sleep Detector',
      });
      await persistSessions(
        updateSessionSyncState(sessionsRef.current, session.id, 'synced'),
      );
    } catch (error) {
      console.error('Unable to sync completed sleep to Apple Health:', error);
      await persistSessions(
        updateSessionSyncState(
          sessionsRef.current,
          session.id,
          'failed',
          error instanceof Error ? error.message : 'Unknown Apple Health error',
        ),
      );
    }
  }, [healthService, persistSessions]);

  const syncHealthSessions = useCallback(async () => {
    if (!(await healthService.getSyncEnabled())) return;
    for (const session of sessionsRef.current) {
      if (
        session.endTime !== undefined &&
        session.userConfirmed &&
        session.healthSyncState !== 'synced'
      ) {
        await syncSleepSession(session);
      }
    }
  }, [healthService, syncSleepSession]);

  const refreshWellnessReport = useCallback(async (
    date = format(new Date(), 'yyyy-MM-dd'),
    force = false,
  ) => {
    const existingReport = wellnessReportsRef.current.find(report => report.date === date);
    const reportAge = existingReport ? Date.now() - existingReport.generatedAt : undefined;
    if (
      !force &&
      existingReport &&
      reportAge !== undefined &&
      reportAge >= 0 &&
      reportAge < WELLNESS_REFRESH_INTERVAL_MS
    ) {
      return;
    }
    const range = reportRangeForDate(date);
    const summary = summaryForReportRange(
      sessionsRef.current,
      date,
      range.start.getTime(),
      range.end.getTime(),
    );
    let healthSleepEntries: SleepEntry[] = [];
    let recovery: HealthRecoverySnapshot | undefined;
    try {
      healthSleepEntries = await healthService.getSleepData(range.start, range.end);
      const asleepHealthEntries = healthSleepEntries.filter(entry =>
        !entry.isAwake && entry.endTime > entry.startTime,
      );
      const sleepStarts = asleepHealthEntries.length > 0
        ? asleepHealthEntries.map(entry => entry.startTime)
        : summary.sleepPeriods.map(period => period.start);
      const sleepEnds = asleepHealthEntries.length > 0
        ? asleepHealthEntries.map(entry => entry.endTime)
        : summary.sleepPeriods.map(period => period.end);
      if (sleepStarts.length > 0 && sleepEnds.length > 0) {
        const recoveryStart = new Date(Math.min(...sleepStarts));
        const recoveryEnd = new Date(Math.max(...sleepEnds));
        recovery = await healthService.getRecoverySnapshot(recoveryStart, recoveryEnd);
      }
    } catch (error) {
      // The deterministic local report remains useful when Health access is
      // unavailable, denied, or contains no samples.
      console.warn('Health data was unavailable for the wellness report:', error);
    }
    const previousReports = wellnessReportsRef.current.filter(
      report => report.date !== date,
    );
    const report = buildDailyWellnessReport({
      date,
      summary,
      healthSleepEntries,
      recovery,
      checkIn: wellnessCheckInsRef.current.find(item => item.date === date),
      previousReports,
    });
    const next = [...previousReports, report]
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-90);
    wellnessReportsRef.current = next;
    setWellnessReports(next);
    await AsyncStorage.setItem(WELLNESS_REPORTS_KEY, JSON.stringify(next));
  }, [healthService]);

  const finishSleep = useCallback(async (
    startTime: number,
    endTime: number,
    confidence: number,
    recordStart = true,
    source: SleepSession['source'] = 'app-inactivity',
    evidence: SleepSession['evidence'] = [],
    userConfirmed = true,
  ) => {
    if (endTime <= startTime) return;
    const durationMinutes = (endTime - startTime) / 60_000;
    const completedSession = createSleepSession({
      startTime,
      endTime,
      confidence,
      source,
      evidence,
      userConfirmed,
    });
    const nextSessions = upsertSleepSession(
      sessionsRef.current,
      completedSession,
    );
    await persistSessions(nextSessions);
    const savedSession = nextSessions.find(item => item.id === completedSession.id)
      ?? nextSessions.find(item =>
        item.startTime === completedSession.startTime &&
        item.endTime === completedSession.endTime,
      )
      ?? completedSession;
    appendRecords([
      ...(recordStart ? [makeRecord(SleepStatus.ASLEEP, startTime, confidence)] : []),
      makeRecord(SleepStatus.AWAKE, endTime, 100),
    ]);
    await syncSleepSession(savedSession);
    await refreshWellnessReport(reportDateForTimestamp(endTime), true);
    await notificationService.notifyWakeDetected(durationMinutes, sleepQuality(durationMinutes));
  }, [appendRecords, notificationService, persistSessions, refreshWellnessReport, syncSleepSession]);

  const processInactivePeriod = useCallback(async (
    period: InactivePeriod | null,
    effectiveSettings: AppSettings,
  ) => {
    if (!period) return;

    if (statusRef.current === SleepStatus.ASLEEP) {
      const start = [...recordsRef.current]
        .reverse()
        .find(record => record.status === SleepStatus.ASLEEP)?.timestamp;
      if (start) {
        await finishSleep(
          start,
          period.endTime,
          confidenceRef.current,
          false,
          'manual',
          [{ kind: 'user-confirmed', weight: 100, detail: 'The user manually started this sleep session.' }],
        );
      }
      return;
    }

    const session = detectSleepSession(
      period.startTime,
      period.endTime,
      effectiveSettings.inactivityThreshold,
    );
    if (session) {
      const analysis = await analyzeSleepCandidate({
        startTime: session.startTime,
        endTime: session.endTime,
        historicalSessions: sessionsRef.current.length > 0
          ? sessionsRef.current
          : historicalSessionsFromRecords(recordsRef.current),
        healthKitOverlapRatio: watchSleepOverlapRatio(
          watchSnapshotsRef.current,
          session.startTime,
          session.endTime,
        ),
        allowLocalModel: effectiveSettings.useMachineLearning,
      });
      if (analysis.classification === 'unlikely-sleep') return;
      const candidate: SleepCandidate = {
        id: `candidate-${analysis.startTime}-${analysis.endTime}`,
        startTime: analysis.startTime,
        endTime: analysis.endTime,
        originalStartTime: session.startTime,
        originalEndTime: session.endTime,
        confidence: analysis.confidence,
        classification: analysis.classification,
        analysisSource: analysis.source,
        explanation: analysis.explanation,
        evidence: analysis.evidence,
        createdAt: Date.now(),
      };
      setSleepCandidates(previous => previous.some(item => item.id === candidate.id)
        ? previous
        : [...previous, candidate].sort((a, b) => a.startTime - b.startTime));
    }
  }, [finishSleep]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [
          recordsJson,
          settingsJson,
          candidatesJson,
          sessionsJson,
          wellnessReportsJson,
          wellnessCheckInsJson,
        ] = await Promise.all([
          AsyncStorage.getItem(ACTIVITY_RECORDS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(SLEEP_CANDIDATES_KEY),
          AsyncStorage.getItem(SLEEP_SESSIONS_KEY),
          AsyncStorage.getItem(WELLNESS_REPORTS_KEY),
          AsyncStorage.getItem(WELLNESS_CHECK_INS_KEY),
        ]);
        if (cancelled) return;

        const loadedRecords: ActivityRecord[] = recordsJson ? JSON.parse(recordsJson) : [];
        const loadedSettings = settingsJson
          ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) }
          : DEFAULT_SETTINGS;
        const loadedCandidates: SleepCandidate[] = candidatesJson ? JSON.parse(candidatesJson) : [];
        const loadedSessions: SleepSession[] = sessionsJson
          ? JSON.parse(sessionsJson)
          : historicalSessionsFromRecords(loadedRecords);
        const loadedWellnessReports: DailyWellnessReport[] = wellnessReportsJson
          ? JSON.parse(wellnessReportsJson)
          : [];
        const loadedWellnessCheckIns: DailyWellnessCheckIn[] = wellnessCheckInsJson
          ? JSON.parse(wellnessCheckInsJson)
          : [];
        const latest = [...loadedRecords].sort((a, b) => b.timestamp - a.timestamp)[0];

        recordsRef.current = loadedRecords;
        setActivityRecords(loadedRecords);
        setSleepCandidates(loadedCandidates);
        sessionsRef.current = loadedSessions;
        setSleepSessions(loadedSessions);
        wellnessReportsRef.current = loadedWellnessReports;
        wellnessCheckInsRef.current = loadedWellnessCheckIns;
        setWellnessReports(loadedWellnessReports);
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
        watchSnapshotsRef.current = await WatchDataService.consumePendingSnapshots();
        notificationService.updateAppSettings(loadedSettings);

        await syncHealthSessions();
        await refreshWellnessReport();

        const pendingPeriod = await backgroundService.consumeInactivePeriod(Date.now());
        await processInactivePeriod(pendingPeriod, loadedSettings);
        initializedRef.current = true;
        if (AppState.currentState === 'background') {
          await backgroundService.recordAppInactive(Date.now());
        }
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
  }, [backgroundService, healthService, notificationService, processInactivePeriod, refreshWellnessReport, syncHealthSessions]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      if (!initializedRef.current) return;

      lifecycleQueueRef.current = lifecycleQueueRef.current
        .then(async () => {
          if (nextState === 'active' && previousState !== 'active') {
            watchSnapshotsRef.current = await WatchDataService.consumePendingSnapshots();
            await syncHealthSessions();
            await refreshWellnessReport();
            const period = await backgroundService.consumeInactivePeriod(Date.now());
            await processInactivePeriod(period, settingsRef.current);
          } else if (nextState === 'background' && previousState !== 'background') {
            await backgroundService.recordAppInactive(Date.now());
          }
        })
        .catch(error => {
          console.error('Failed to process app activity transition:', error);
        });
    });
    return () => subscription.remove();
  }, [backgroundService, processInactivePeriod, refreshWellnessReport, syncHealthSessions]);

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

  useEffect(() => {
    if (!settingsLoaded) return;
    AsyncStorage.setItem(SLEEP_CANDIDATES_KEY, JSON.stringify(sleepCandidates)).catch(console.error);
  }, [settingsLoaded, sleepCandidates]);

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
      if (start) {
        await finishSleep(
          start,
          now,
          100,
          false,
          'manual',
          [{ kind: 'user-confirmed', weight: 100, detail: 'The user manually marked this sleep session.' }],
        );
      }
    } else {
      appendRecords([makeRecord(SleepStatus.ASLEEP, now, 100)]);
    }
    await backgroundService.recordUserActivity(now);
  };

  const confirmSleepCandidate = async (): Promise<void> => {
    if (candidateActionRef.current) return;
    const candidate = sleepCandidates[0];
    if (!candidate) return;
    candidateActionRef.current = true;
    setSleepCandidates(previous => previous.filter(item => item.id !== candidate.id));
    try {
      const independentEvidence = candidate.evidence?.some(item =>
        item.kind === 'healthkit-sleep' ||
        item.kind === 'watch-low-motion' ||
        item.kind === 'watch-heart-rate',
      );
      await finishSleep(
        candidate.startTime,
        candidate.endTime,
        candidate.confidence,
        true,
        independentEvidence ? 'combined' : 'app-inactivity',
        [
          ...(candidate.evidence ?? []),
          { kind: 'user-confirmed', weight: 100, detail: 'The user confirmed this estimated sleep period.' },
        ],
      );
    } finally {
      candidateActionRef.current = false;
    }
  };

  const dismissSleepCandidate = async (): Promise<void> => {
    if (candidateActionRef.current) return;
    const candidate = sleepCandidates[0];
    if (!candidate) return;
    candidateActionRef.current = true;
    setSleepCandidates(previous => previous.filter(item => item.id !== candidate.id));
    candidateActionRef.current = false;
  };

  const updateSleepCandidateBounds = (startTime: number, endTime: number): void => {
    if (
      !Number.isFinite(startTime) ||
      !Number.isFinite(endTime) ||
      endTime <= startTime ||
      endTime - startTime > 20 * 60 * 60_000
    ) return;
    setSleepCandidates(previous => previous.map((candidate, index) =>
      index === 0
        ? {
            ...candidate,
            startTime,
            endTime,
            evidence: [
              ...(candidate.evidence ?? []).filter(item => item.kind !== 'user-edited'),
              { kind: 'user-edited', weight: 100, detail: 'The user adjusted the estimated sleep boundaries.' },
            ],
          }
        : candidate,
    ));
  };

  const saveWellnessCheckIn = async (
    checkIn: Omit<DailyWellnessCheckIn, 'date' | 'updatedAt'>,
  ): Promise<void> => {
    const item: DailyWellnessCheckIn = {
      ...checkIn,
      date: format(new Date(), 'yyyy-MM-dd'),
      updatedAt: Date.now(),
    };
    const next = [
      ...wellnessCheckInsRef.current.filter(existing => existing.date !== item.date),
      item,
    ].sort((left, right) => left.date.localeCompare(right.date)).slice(-90);
    wellnessCheckInsRef.current = next;
    await AsyncStorage.setItem(WELLNESS_CHECK_INS_KEY, JSON.stringify(next));
    await refreshWellnessReport(item.date, true);
  };

  const clearSleepData = async (): Promise<void> => {
    recordsRef.current = [];
    statusRef.current = SleepStatus.AWAKE;
    confidenceRef.current = 100;
    setActivityRecords([]);
    setSleepCandidates([]);
    sessionsRef.current = [];
    setSleepSessions([]);
    wellnessReportsRef.current = [];
    wellnessCheckInsRef.current = [];
    setWellnessReports([]);
    setCurrentStatus(SleepStatus.AWAKE);
    setCurrentConfidence(100);
    await Promise.all([
      AsyncStorage.multiRemove([
        ACTIVITY_RECORDS_KEY,
        DAILY_SUMMARIES_KEY,
        SLEEP_PATTERNS_KEY,
        SLEEP_CANDIDATES_KEY,
        SLEEP_SESSIONS_KEY,
        WELLNESS_REPORTS_KEY,
        WELLNESS_CHECK_INS_KEY,
      ]),
      backgroundService.resetTrackingState(),
      WatchDataService.clear(),
    ]);
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
    sleepCandidates,
    sleepSessions,
    wellnessReports,
    settings,
    exportDate: new Date().toISOString(),
  }, null, 2);

  return (
    <SleepContext.Provider value={{
      currentStatus,
      currentConfidence,
      todayRecords,
      dailySummaries,
      sleepSessions,
      todayWellnessReport,
      settings,
      pendingSleepCandidate: sleepCandidates[0] ?? null,
      updateSettings,
      exportData,
      getTodaySleepDuration,
      manuallySetStatus,
      confirmSleepCandidate,
      dismissSleepCandidate,
      updateSleepCandidateBounds,
      syncHealthSessions,
      saveWellnessCheckIn,
      clearSleepData,
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
