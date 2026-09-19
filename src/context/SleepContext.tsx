import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
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
import {
  buildDailySleepSummaries,
  buildDailySleepSummariesFromSessions,
  detectSleepSession,
} from '../services/SleepDetectionService';
import {
  analyzeSleepCandidate,
  clipLongAbsence,
  healthSleepOverlapRatio,
  LONG_ABSENCE_MAX_CONFIDENCE,
  LONG_ABSENCE_MIN_CONFIDENCE,
  strongestHealthSleepWindow,
} from '../services/SleepAnalysisService';
import {
  strongestWatchSleepWindow,
  WatchDataService,
  watchSleepOverlapRatio,
} from '../services/WatchDataService';
import { buildDailyWellnessReport } from '../services/WellnessReportService';
import {
  createSleepSession,
  isValidCandidateWindow,
  shouldAttemptHealthSync,
  updateSessionSyncState,
  upsertSleepSession,
} from '../services/SleepSessionService';
import { sleepQualityForMinutes } from '../utils/sleepQuality';

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

function parseStoredJson<T>(raw: string | null, label: string): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Ignoring unreadable ${label} data:`, error);
    return undefined;
  }
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const SLEEP_SESSION_SOURCES: SleepSession['source'][] = [
  'app-inactivity',
  'manual',
  'apple-watch',
  'healthkit',
  'combined',
];

const validEvidence = (value: unknown): SleepSession['evidence'] => {
  const kinds: SleepSession['evidence'][number]['kind'][] = [
    'app-away',
    'historical-schedule',
    'healthkit-sleep',
    'watch-low-motion',
    'watch-heart-rate',
    'user-confirmed',
    'user-edited',
  ];
  return (Array.isArray(value) ? value : []).filter(item =>
    typeof item === 'object' &&
    item !== null &&
    kinds.includes(item.kind as SleepSession['evidence'][number]['kind']) &&
    isFiniteNumber(item.weight) &&
    typeof item.detail === 'string',
  ) as SleepSession['evidence'];
};

const validActivityRecords = (value: unknown): ActivityRecord[] =>
  (Array.isArray(value) ? value : []).filter((item): item is ActivityRecord =>
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    isFiniteNumber(item.timestamp) &&
    (item.status === SleepStatus.AWAKE || item.status === SleepStatus.ASLEEP) &&
    isFiniteNumber(item.confidence),
  );

const validSleepCandidates = (value: unknown): SleepCandidate[] =>
  (Array.isArray(value) ? value : []).flatMap(item => {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.id !== 'string' ||
      !isFiniteNumber(item.startTime) ||
      !isFiniteNumber(item.endTime) ||
      item.endTime <= item.startTime ||
      !isFiniteNumber(item.confidence) ||
      !isFiniteNumber(item.createdAt)
    ) {
      return [];
    }
    return [{
      ...item,
      confidence: Math.min(100, Math.max(0, item.confidence)),
      evidence: validEvidence(item.evidence),
    } as SleepCandidate];
  });

const validSleepSessions = (value: unknown): SleepSession[] =>
  (Array.isArray(value) ? value : []).flatMap(item => {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.id !== 'string' ||
      !isFiniteNumber(item.startTime) ||
      !isFiniteNumber(item.endTime) ||
      item.endTime <= item.startTime ||
      !isFiniteNumber(item.confidence)
    ) {
      return [];
    }
    const session = item as Partial<SleepSession>;
    const validSyncStates: SleepSession['healthSyncState'][] = [
      'not-requested',
      'pending',
      'synced',
      'failed',
    ];
    return [{
      ...session,
      id: item.id,
      startTime: item.startTime,
      endTime: item.endTime,
      confidence: Math.min(100, Math.max(0, item.confidence)),
      source: SLEEP_SESSION_SOURCES.includes(session.source as SleepSession['source'])
        ? session.source as SleepSession['source']
        : 'combined',
      evidence: validEvidence(session.evidence),
      userConfirmed: session.userConfirmed !== false,
      timezone: typeof session.timezone === 'string'
        ? session.timezone
        : Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: isFiniteNumber(session.createdAt) ? session.createdAt : item.startTime,
      updatedAt: isFiniteNumber(session.updatedAt) ? session.updatedAt : item.endTime,
      healthSyncState: validSyncStates.includes(session.healthSyncState as SleepSession['healthSyncState'])
        ? session.healthSyncState as SleepSession['healthSyncState']
        : 'not-requested',
    }];
  });

const validDatedItems = <T extends { date: string }>(value: unknown): T[] =>
  (Array.isArray(value) ? value : []).filter((item): item is T =>
    typeof item === 'object' && item !== null && typeof item.date === 'string',
  );

const normalizedSettings = (value: unknown): AppSettings => {
  const parsed = typeof value === 'object' && value !== null
    ? value as Partial<AppSettings>
    : {};
  const threshold = Number(parsed.inactivityThreshold);
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    inactivityThreshold: Number.isFinite(threshold)
      ? Math.min(12 * 60, Math.max(5, threshold))
      : DEFAULT_SETTINGS.inactivityThreshold,
    useMachineLearning: typeof parsed.useMachineLearning === 'boolean'
      ? parsed.useMachineLearning
      : DEFAULT_SETTINGS.useMachineLearning,
    contextualNotifications: typeof parsed.contextualNotifications === 'boolean'
      ? parsed.contextualNotifications
      : DEFAULT_SETTINGS.contextualNotifications,
  };
};

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
  syncHealthSessions: (force?: boolean) => Promise<void>;
  saveWellnessCheckIn: (checkIn: Omit<DailyWellnessCheckIn, 'date' | 'updatedAt'>) => Promise<void>;
  clearSleepData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const SleepContext = createContext<SleepContextType | undefined>(undefined);

const makeRecord = (status: SleepStatus, timestamp: number, confidence: number): ActivityRecord => ({
  id: `${timestamp}-${status}-${Math.random().toString(36).slice(2, 9)}`,
  timestamp,
  status,
  confidence,
});

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
  const candidatesRef = useRef<SleepCandidate[]>([]);
  const wellnessReportsRef = useRef<DailyWellnessReport[]>([]);
  const wellnessCheckInsRef = useRef<DailyWellnessCheckIn[]>([]);
  const initializedRef = useRef(false);
  const candidateActionRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lifecycleQueueRef = useRef<Promise<void>>(Promise.resolve());
  const resumeWorkQueueRef = useRef<Promise<void>>(Promise.resolve());
  const watchSnapshotsRef = useRef<WatchSleepSnapshot[]>([]);
  const backgroundService = useMemo(() => BackgroundActivityService.getInstance(), []);
  const notificationService = useMemo(() => NotificationService.getInstance(), []);
  const healthService = useMemo(() => HealthService.getInstance(), []);

  const dailySummaries = useMemo(
    () => sleepSessions.length > 0
      ? buildDailySleepSummariesFromSessions(sleepSessions)
      : buildDailySleepSummaries(activityRecords),
    [activityRecords, sleepSessions],
  );
  const [todayDate, setTodayDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const todayWellnessReport = useMemo(
    () => wellnessReports.find(report => report.date === todayDate) ?? null,
    [todayDate, wellnessReports],
  );

  const appendRecords = useCallback(async (records: ActivityRecord[]) => {
    if (records.length === 0) return;
    const existingKeys = new Set(
      recordsRef.current.map(existing => `${existing.timestamp}-${existing.status}`),
    );
    const uniqueRecords = records.filter(
      record => !existingKeys.has(`${record.timestamp}-${record.status}`),
    );
    if (uniqueRecords.length > 0) {
      const next = [...recordsRef.current, ...uniqueRecords]
        .sort((a, b) => a.timestamp - b.timestamp);
      recordsRef.current = next;
      setActivityRecords(next);
      await AsyncStorage.setItem(ACTIVITY_RECORDS_KEY, JSON.stringify(next));
    }
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

  const persistCandidates = useCallback((candidates: SleepCandidate[]) => {
    candidatesRef.current = candidates;
    setSleepCandidates(candidates);
    return AsyncStorage.setItem(SLEEP_CANDIDATES_KEY, JSON.stringify(candidates));
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

  const syncHealthSessions = useCallback(async (force = false) => {
    if (!(await healthService.getSyncEnabled())) return;
    const now = Date.now();
    for (const session of sessionsRef.current) {
      const eligible = session.endTime !== undefined &&
        session.userConfirmed &&
        session.healthSyncState !== 'synced';
      if (eligible && (force || shouldAttemptHealthSync(session, now))) {
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
    await appendRecords([
      ...(recordStart ? [makeRecord(SleepStatus.ASLEEP, startTime, confidence)] : []),
      makeRecord(SleepStatus.AWAKE, endTime, 100),
    ]);
    const followUpResults = await Promise.allSettled([
      syncSleepSession(savedSession),
      refreshWellnessReport(reportDateForTimestamp(endTime), true),
      notificationService.notifyWakeDetected(durationMinutes, sleepQualityForMinutes(durationMinutes).label),
    ]);
    followUpResults.forEach(result => {
      if (result.status === 'rejected') {
        console.warn('A non-critical post-save sleep task failed:', result.reason);
      }
    });
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
      let analysisStart = session.startTime;
      let analysisEnd = session.endTime;
      let healthEntries: SleepEntry[] = [];
      const watchWindow = strongestWatchSleepWindow(
        watchSnapshotsRef.current,
        session.startTime,
        session.endTime,
      );
      let verifiedWindow = watchWindow;
      let independentSleepOverlap = watchSleepOverlapRatio(
        watchSnapshotsRef.current,
        session.startTime,
        session.endTime,
      );
      if (Platform.OS === 'ios' && healthService.isAvailable()) {
        try {
          healthEntries = await healthService.getSleepData(
            new Date(session.startTime),
            new Date(session.endTime),
          );
          const healthWindow = strongestHealthSleepWindow(
            healthEntries,
            session.startTime,
            session.endTime,
          );
          if (!verifiedWindow || (healthWindow?.asleepMinutes ?? 0) > verifiedWindow.asleepMinutes) {
            verifiedWindow = healthWindow;
          }
          independentSleepOverlap = Math.max(
            independentSleepOverlap,
            healthSleepOverlapRatio(
              healthEntries,
              session.startTime,
              session.endTime,
            ),
          );
        } catch (error) {
          console.warn('Apple Health sleep evidence was unavailable:', error);
        }
      }
      if (verifiedWindow) {
        analysisStart = verifiedWindow.startTime;
        analysisEnd = verifiedWindow.endTime;
        independentSleepOverlap = Math.max(
          watchSleepOverlapRatio(watchSnapshotsRef.current, analysisStart, analysisEnd),
          healthSleepOverlapRatio(healthEntries, analysisStart, analysisEnd),
        );
      }
      const historicalSessions = sessionsRef.current.length > 0
        ? sessionsRef.current
        : historicalSessionsFromRecords(recordsRef.current);
      let longAbsence = false;
      if (!verifiedWindow) {
        const recentNight = clipLongAbsence(analysisStart, analysisEnd, historicalSessions);
        analysisStart = recentNight.startTime;
        analysisEnd = recentNight.endTime;
        longAbsence = recentNight.clipped;
      }
      const analysis = await analyzeSleepCandidate({
        startTime: analysisStart,
        endTime: analysisEnd,
        historicalSessions,
        healthKitOverlapRatio: independentSleepOverlap,
        allowLocalModel: effectiveSettings.useMachineLearning,
      });
      if (analysis.classification === 'unlikely-sleep') return;
      if (longAbsence && analysis.confidence < LONG_ABSENCE_MIN_CONFIDENCE) return;
      const candidate: SleepCandidate = {
        id: `candidate-${analysis.startTime}-${analysis.endTime}`,
        startTime: analysis.startTime,
        endTime: analysis.endTime,
        originalStartTime: session.startTime,
        originalEndTime: session.endTime,
        confidence: longAbsence
          ? Math.min(analysis.confidence, LONG_ABSENCE_MAX_CONFIDENCE)
          : analysis.confidence,
        classification: longAbsence ? 'uncertain' : analysis.classification,
        analysisSource: analysis.source,
        explanation: longAbsence
          ? 'Sleep Detector was not opened for more than a day, so this is only a rough guess at the most recent night. Adjust the times or dismiss it.'
          : analysis.explanation,
        evidence: analysis.evidence,
        createdAt: Date.now(),
      };
      if (!candidatesRef.current.some(item => item.id === candidate.id)) {
        await persistCandidates(
          [...candidatesRef.current, candidate].sort((a, b) => a.startTime - b.startTime),
        );
      }
    }
  }, [finishSleep, healthService, persistCandidates]);

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

        const loadedRecords = validActivityRecords(
          parseStoredJson<unknown>(recordsJson, 'activity record'),
        );
        const loadedSettings = normalizedSettings(
          parseStoredJson<unknown>(settingsJson, 'settings'),
        );
        const loadedCandidates = validSleepCandidates(
          parseStoredJson<unknown>(candidatesJson, 'sleep candidate'),
        );
        const parsedSessions = parseStoredJson<unknown>(sessionsJson, 'sleep session');
        const loadedSessions = parsedSessions === undefined
          ? historicalSessionsFromRecords(loadedRecords)
          : validSleepSessions(parsedSessions);
        const loadedWellnessReports = validDatedItems<DailyWellnessReport>(
          parseStoredJson<unknown>(wellnessReportsJson, 'wellness report'),
        );
        const loadedWellnessCheckIns = validDatedItems<DailyWellnessCheckIn>(
          parseStoredJson<unknown>(wellnessCheckInsJson, 'wellness check-in'),
        );
        const latest = [...loadedRecords].sort((a, b) => b.timestamp - a.timestamp)[0];

        recordsRef.current = loadedRecords;
        setActivityRecords(loadedRecords);
        candidatesRef.current = loadedCandidates;
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

        await backgroundService.startMonitoring();
        const pendingPeriod = await backgroundService.consumeInactivePeriod(Date.now());
        await Promise.all([
          notificationService.initialize(),
          healthService.initialize(false),
        ]);
        try {
          watchSnapshotsRef.current = await WatchDataService.consumePendingSnapshots();
        } catch (error) {
          console.warn('Unable to load Apple Watch sleep evidence:', error);
        }
        notificationService.updateAppSettings(loadedSettings);
        if (parsedSessions === undefined && loadedSessions.length > 0) {
          await AsyncStorage.setItem(SLEEP_SESSIONS_KEY, JSON.stringify(loadedSessions));
        }

        // The consumed boundary only exists in memory now, so turn it into a
        // durable candidate before the slower Health sync and report work.
        await processInactivePeriod(pendingPeriod, loadedSettings);
        initializedRef.current = true;
        if (AppState.currentState === 'background') {
          await backgroundService.recordAppInactive(Date.now());
        }

        // Share the resume queue so a foreground event during startup cannot
        // sync the same session to Apple Health twice.
        resumeWorkQueueRef.current = resumeWorkQueueRef.current
          .then(async () => {
            await syncHealthSessions();
            await refreshWellnessReport();
          })
          .catch(error => {
            console.error('Failed to refresh sleep data after launch:', error);
          });
        await resumeWorkQueueRef.current;
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
      const transitionAt = Date.now();
      appStateRef.current = nextState;
      if (nextState === 'active') setTodayDate(format(transitionAt, 'yyyy-MM-dd'));
      if (!initializedRef.current) return;

      lifecycleQueueRef.current = lifecycleQueueRef.current
        .then(async () => {
          if (nextState === 'active' && previousState !== 'active') {
            const period = await backgroundService.consumeInactivePeriod(transitionAt);
            // Keep lifecycle persistence independent from HealthKit, Watch, and
            // model latency so a quick re-background cannot lose its boundary.
            resumeWorkQueueRef.current = resumeWorkQueueRef.current
              .then(async () => {
                try {
                  watchSnapshotsRef.current = await WatchDataService.consumePendingSnapshots();
                } catch (error) {
                  console.warn('Unable to refresh Apple Watch sleep evidence:', error);
                }
                await processInactivePeriod(period, settingsRef.current);
                await syncHealthSessions();
                await refreshWellnessReport();
              })
              .catch(error => {
                console.error('Failed to refresh foreground sleep data:', error);
              });
          } else if (nextState === 'background' && previousState !== 'background') {
            await backgroundService.recordAppInactive(transitionAt);
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
    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 1, 0);
    const timer = setTimeout(
      () => setTodayDate(format(new Date(), 'yyyy-MM-dd')),
      nextMidnight.getTime() - Date.now(),
    );
    return () => clearTimeout(timer);
  }, [todayDate]);

  const updateSettings = useCallback((changes: Partial<AppSettings>) => {
    const updated = { ...settingsRef.current, ...changes };
    settingsRef.current = updated;
    setSettings(updated);
    notificationService.updateAppSettings(updated);
  }, [notificationService]);

  const manuallySetStatus = useCallback(async (status: SleepStatus) => {
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
      await appendRecords([makeRecord(SleepStatus.ASLEEP, now, 100)]);
    }
    await backgroundService.recordUserActivity(now);
  }, [appendRecords, backgroundService, finishSleep]);

  const confirmSleepCandidate = useCallback(async (): Promise<void> => {
    if (candidateActionRef.current) return;
    const candidate = candidatesRef.current[0];
    if (!candidate) return;
    candidateActionRef.current = true;
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
      await persistCandidates(
        candidatesRef.current.filter(item => item.id !== candidate.id),
      );
    } finally {
      candidateActionRef.current = false;
    }
  }, [finishSleep, persistCandidates]);

  const dismissSleepCandidate = useCallback(async (): Promise<void> => {
    if (candidateActionRef.current) return;
    const candidate = candidatesRef.current[0];
    if (!candidate) return;
    candidateActionRef.current = true;
    try {
      await persistCandidates(
        candidatesRef.current.filter(item => item.id !== candidate.id),
      );
    } finally {
      candidateActionRef.current = false;
    }
  }, [persistCandidates]);

  const updateSleepCandidateBounds = useCallback((startTime: number, endTime: number): void => {
    if (!isValidCandidateWindow(startTime, endTime)) return;
    const next: SleepCandidate[] = candidatesRef.current.map((candidate, index) =>
      index === 0
        ? {
            ...candidate,
            startTime,
            endTime,
            evidence: [
              ...(candidate.evidence ?? []).filter(item => item.kind !== 'user-edited'),
              { kind: 'user-edited' as const, weight: 100, detail: 'The user adjusted the estimated sleep boundaries.' },
            ],
          }
        : candidate,
    );
    void persistCandidates(next).catch(console.error);
  }, [persistCandidates]);

  const saveWellnessCheckIn = useCallback(async (
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
  }, [refreshWellnessReport]);

  const clearSleepData = useCallback(async (): Promise<void> => {
    recordsRef.current = [];
    statusRef.current = SleepStatus.AWAKE;
    confidenceRef.current = 100;
    setActivityRecords([]);
    candidatesRef.current = [];
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
  }, [backgroundService]);

  /** Resets in-memory state too, so later saves cannot restore erased data. */
  const clearAllData = useCallback(async (): Promise<void> => {
    await clearSleepData();
    await healthService.setSyncEnabled(false);
    settingsRef.current = DEFAULT_SETTINGS;
    setSettings(DEFAULT_SETTINGS);
    notificationService.updateAppSettings(DEFAULT_SETTINGS);
    await notificationService.resetToDefaults();
    await AsyncStorage.clear();
  }, [clearSleepData, healthService, notificationService]);

  const todayRecords = useMemo(() => {
    const start = new Date(`${todayDate}T00:00:00`);
    const end = new Date(start);
    // Calendar arithmetic keeps 23- and 25-hour daylight-saving days correct.
    end.setDate(end.getDate() + 1);
    const dayStart = start.getTime();
    const dayEnd = end.getTime();
    return activityRecords.filter(
      record => record.timestamp >= dayStart && record.timestamp < dayEnd,
    );
  }, [activityRecords, todayDate]);

  const getTodaySleepDuration = useCallback(
    (): number =>
      dailySummaries.find(summary => summary.date === todayDate)?.totalSleepMinutes ?? 0,
    [dailySummaries, todayDate],
  );

  const exportData = useCallback(async (): Promise<string> => JSON.stringify({
    activityRecords,
    dailySummaries,
    sleepCandidates,
    sleepSessions,
    wellnessReports,
    settings,
    exportDate: new Date().toISOString(),
  }, null, 2), [activityRecords, dailySummaries, settings, sleepCandidates, sleepSessions, wellnessReports]);

  const pendingSleepCandidate = sleepCandidates[0] ?? null;
  const value = useMemo<SleepContextType>(() => ({
    currentStatus,
    currentConfidence,
    todayRecords,
    dailySummaries,
    sleepSessions,
    todayWellnessReport,
    settings,
    pendingSleepCandidate,
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
    clearAllData,
  }), [
    currentStatus,
    currentConfidence,
    todayRecords,
    dailySummaries,
    sleepSessions,
    todayWellnessReport,
    settings,
    pendingSleepCandidate,
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
    clearAllData,
  ]);

  return (
    <SleepContext.Provider value={value}>
      {children}
    </SleepContext.Provider>
  );
};

export const useSleep = (): SleepContextType => {
  const context = useContext(SleepContext);
  if (!context) throw new Error('useSleep must be used within a SleepProvider');
  return context;
};
