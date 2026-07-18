import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppStateStatus } from 'react-native';

const LAST_ACTIVITY_KEY = 'last-device-activity';
const INACTIVE_SINCE_KEY = 'sleep-detector-inactive-since';
const ACTIVITY_LOG_KEY = 'device-activity-log';
const SETTINGS_KEY = 'sleep-tracker-settings';

interface ActivityData {
  timestamp: number;
  hasMovement: boolean;
  appState: AppStateStatus;
  confidence: number;
}

export interface InactivePeriod {
  startTime: number;
  endTime: number;
  durationMinutes: number;
}

/**
 * Persists the app lifecycle boundary used by automatic sleep detection.
 *
 * iOS suspends JavaScript shortly after an app is backgrounded, so timers and
 * motion listeners cannot be used as a reliable clock. Persisting the boundary
 * lets us calculate the complete inactive interval when the app is used again,
 * including after process termination or a device restart.
 */
export class BackgroundActivityService {
  private static instance: BackgroundActivityService;
  private isMonitoring = false;

  public static getInstance(): BackgroundActivityService {
    if (!BackgroundActivityService.instance) {
      BackgroundActivityService.instance = new BackgroundActivityService();
    }
    return BackgroundActivityService.instance;
  }

  public async initialize(): Promise<void> {
    this.isMonitoring = true;
    const lastActivity = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) {
      await AsyncStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  }

  public async startMonitoring(): Promise<void> {
    await this.initialize();
  }

  public async stopMonitoring(): Promise<void> {
    this.isMonitoring = false;
  }

  public emergencyShutdown(): void {
    this.isMonitoring = false;
  }

  public isActive(): boolean {
    return this.isMonitoring;
  }

  /** Preserve the first inactive timestamp across inactive -> background events. */
  public async recordAppInactive(timestamp = Date.now()): Promise<void> {
    const existing = await AsyncStorage.getItem(INACTIVE_SINCE_KEY);
    if (!existing) {
      await AsyncStorage.setItem(INACTIVE_SINCE_KEY, timestamp.toString());
      await this.logActivity({
        timestamp,
        hasMovement: false,
        appState: 'background',
        confidence: 100,
      });
    }
  }

  /**
   * Atomically consumes the pending inactive interval before recording resume.
   * Reading this interval before updating LAST_ACTIVITY_KEY fixes the former
   * resume bug where inactivity was always observed as approximately zero.
   */
  public async consumeInactivePeriod(resumedAt = Date.now()): Promise<InactivePeriod | null> {
    const stored = await AsyncStorage.getItem(INACTIVE_SINCE_KEY);
    await AsyncStorage.removeItem(INACTIVE_SINCE_KEY);
    await this.recordUserActivity(resumedAt);

    if (!stored) return null;

    const startTime = Number(stored);
    if (!Number.isFinite(startTime) || startTime >= resumedAt) return null;

    return {
      startTime,
      endTime: resumedAt,
      durationMinutes: (resumedAt - startTime) / 60_000,
    };
  }

  public async recordUserActivity(timestamp = Date.now()): Promise<void> {
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, timestamp.toString());
    await this.logActivity({
      timestamp,
      hasMovement: true,
      appState: 'active',
      confidence: 100,
    });
  }

  public async getLastActivityTimestamp(): Promise<number> {
    const inactiveSince = await AsyncStorage.getItem(INACTIVE_SINCE_KEY);
    if (inactiveSince && Number.isFinite(Number(inactiveSince))) return Number(inactiveSince);

    const timestamp = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    return timestamp && Number.isFinite(Number(timestamp)) ? Number(timestamp) : Date.now();
  }

  public async getInactivityDuration(_includeCurrentCheck = false): Promise<number> {
    const lastActivity = await this.getLastActivityTimestamp();
    return Math.max(0, (Date.now() - lastActivity) / 60_000);
  }

  public async getActivityLog(hours = 24): Promise<ActivityData[]> {
    try {
      const raw = await AsyncStorage.getItem(ACTIVITY_LOG_KEY);
      const log: ActivityData[] = raw ? JSON.parse(raw) : [];
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      return log.filter(item => item.timestamp >= cutoff);
    } catch {
      return [];
    }
  }

  public async forceThresholdCheck(): Promise<boolean> {
    const [inactiveMinutes, rawSettings] = await Promise.all([
      this.getInactivityDuration(),
      AsyncStorage.getItem(SETTINGS_KEY),
    ]);
    const threshold = rawSettings ? JSON.parse(rawSettings).inactivityThreshold : 30;
    return inactiveMinutes >= threshold;
  }

  public async hasThresholdCrossingEvent(): Promise<boolean> {
    return this.forceThresholdCheck();
  }

  public async clearThresholdCrossingEvent(): Promise<void> {
    await AsyncStorage.removeItem(INACTIVE_SINCE_KEY);
  }

  public async resetTrackingState(timestamp = Date.now()): Promise<void> {
    await AsyncStorage.multiRemove([INACTIVE_SINCE_KEY, ACTIVITY_LOG_KEY, LAST_ACTIVITY_KEY]);
    await this.recordUserActivity(timestamp);
  }

  private async logActivity(activity: ActivityData): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(ACTIVITY_LOG_KEY);
      const log: ActivityData[] = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify([...log, activity].slice(-250)));
    } catch (error) {
      console.warn('Unable to persist activity diagnostic:', error);
    }
  }
}

export default BackgroundActivityService;
