import { Platform } from 'react-native';
import {
  AuthorizationStatus,
  CategoryValueSleepAnalysis,
  authorizationStatusFor,
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  requestAuthorization,
  saveCategorySample,
} from '@kingstinct/react-native-healthkit';
import { SleepEntry } from '../types/SleepEntry';
import { HealthRecoverySnapshot } from '../types';

const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis' as const;
const RESTING_HEART_RATE_TYPE = 'HKQuantityTypeIdentifierRestingHeartRate' as const;
const HRV_TYPE = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN' as const;
const RESPIRATORY_RATE_TYPE = 'HKQuantityTypeIdentifierRespiratoryRate' as const;
// Session id formats this app has used as HKSyncIdentifier values.
const SLEEP_DETECTOR_ID_PREFIXES = ['sleep-', 'legacy-', 'detected-'];
const WRIST_TEMPERATURE_TYPE = 'HKQuantityTypeIdentifierAppleSleepingWristTemperature' as const;

/** Apple HealthKit adapter for reading and writing sleep analysis samples. */
export class AppleHealthService {
  private hasPermission = false;

  public async initialize(requestPermissions = false): Promise<boolean> {
    if (!this.isAvailable()) {
      this.hasPermission = false;
      return false;
    }

    try {
      if (requestPermissions) {
        await requestAuthorization({
          toRead: [
            SLEEP_TYPE,
            RESTING_HEART_RATE_TYPE,
            HRV_TYPE,
            RESPIRATORY_RATE_TYPE,
            WRIST_TEMPERATURE_TYPE,
          ],
          toShare: [SLEEP_TYPE],
        });
      }
      this.hasPermission = authorizationStatusFor(SLEEP_TYPE) === AuthorizationStatus.sharingAuthorized;
      return this.hasPermission;
    } catch (error) {
      this.hasPermission = false;
      console.warn('HealthKit authorization failed:', error);
      return false;
    }
  }

  public isAvailable(): boolean {
    return Platform.OS === 'ios' && isHealthDataAvailable();
  }

  public hasRequiredPermissions(): boolean {
    return this.hasPermission;
  }

  public async getSleepData(startDate: Date, endDate: Date): Promise<SleepEntry[]> {
    if (!this.isAvailable()) return [];

    const samples = await queryCategorySamples(SLEEP_TYPE, {
      limit: 0,
      ascending: true,
      // Include samples that begin before the requested boundary but overlap
      // it, then clip/merge them in the analysis layer.
      filter: { date: { startDate, endDate, strictStartDate: false } },
    });

    return samples.flatMap(sample => {
      const stage = this.sleepStage(sample.value);
      if (!stage) return [];
      return [{
        id: `health-${sample.uuid}`,
        startTime: sample.startDate.getTime(),
        endTime: sample.endDate.getTime(),
        source: sample.sourceRevision.source.name || 'Apple Health',
        confidence: 95,
        isAwake: stage === 'awake',
        stage,
      }];
    });
  }

  public async getRecoverySnapshot(startDate: Date, endDate: Date): Promise<HealthRecoverySnapshot> {
    if (!this.isAvailable()) return { startTime: startDate.getTime(), endTime: endDate.getTime() };

    const filter = { date: { startDate, endDate, strictStartDate: true } };
    const [restingHeartRate, hrv, respiratoryRate, wristTemperature] = await Promise.all([
      queryQuantitySamples(RESTING_HEART_RATE_TYPE, {
        limit: 0,
        ascending: true,
        unit: 'count/min',
        filter,
      }),
      queryQuantitySamples(HRV_TYPE, {
        limit: 0,
        ascending: true,
        unit: 'ms',
        filter,
      }),
      queryQuantitySamples(RESPIRATORY_RATE_TYPE, {
        limit: 0,
        ascending: true,
        unit: 'count/min',
        filter,
      }),
      queryQuantitySamples(WRIST_TEMPERATURE_TYPE, {
        limit: 0,
        ascending: true,
        unit: 'degC',
        filter,
      }),
    ]);

    return {
      startTime: startDate.getTime(),
      endTime: endDate.getTime(),
      restingHeartRate: this.average(restingHeartRate.map(sample => sample.quantity)),
      heartRateVariabilityMs: this.average(hrv.map(sample => sample.quantity)),
      respiratoryRate: this.average(respiratoryRate.map(sample => sample.quantity)),
      wristTemperatureCelsius: this.average(wristTemperature.map(sample => sample.quantity)),
    };
  }

  public async saveSleepData(sleepEntry: SleepEntry): Promise<void> {
    if (!this.hasPermission) {
      throw new Error('Apple Health sleep write permission has not been granted.');
    }
    if (sleepEntry.isAwake || sleepEntry.endTime <= sleepEntry.startTime) return;

    const existing = await queryCategorySamples(SLEEP_TYPE, {
      limit: 0,
      filter: {
        date: {
          startDate: new Date(sleepEntry.startTime),
          endDate: new Date(sleepEntry.endTime),
        },
      },
    });
    const alreadySynced = existing.some(sample => {
      const syncIdentifier = sample.metadata?.HKSyncIdentifier;
      const isSleepDetectorSample = typeof syncIdentifier === 'string'
        && SLEEP_DETECTOR_ID_PREFIXES.some(prefix => syncIdentifier.startsWith(prefix));
      const coversEntry = sample.startDate.getTime() <= sleepEntry.startTime
        && sample.endDate.getTime() >= sleepEntry.endTime;

      return syncIdentifier === sleepEntry.id || (isSleepDetectorSample && coversEntry);
    });
    if (alreadySynced) return;

    const asleepIntervals = existing.flatMap(sample => {
      const stage = this.sleepStage(sample.value);
      if (!stage || stage === 'awake') return [];
      const start = Math.max(sleepEntry.startTime, sample.startDate.getTime());
      const end = Math.min(sleepEntry.endTime, sample.endDate.getTime());
      return end > start ? [{ start, end }] : [];
    }).sort((left, right) => left.start - right.start);
    let coveredMilliseconds = 0;
    let coveredUntil = sleepEntry.startTime;
    for (const interval of asleepIntervals) {
      const uncoveredStart = Math.max(coveredUntil, interval.start);
      if (interval.end > uncoveredStart) {
        coveredMilliseconds += interval.end - uncoveredStart;
        coveredUntil = interval.end;
      }
    }
    if (coveredMilliseconds / (sleepEntry.endTime - sleepEntry.startTime) >= 0.9) {
      // Another Health source already represents this night. Avoid writing a
      // duplicate sample that would inflate totals in downstream apps.
      return;
    }

    await saveCategorySample(
      SLEEP_TYPE,
      CategoryValueSleepAnalysis.asleepUnspecified,
      new Date(sleepEntry.startTime),
      new Date(sleepEntry.endTime),
      {
        HKWasUserEntered: true,
        HKTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        HKExternalUUID: sleepEntry.id,
        HKSyncIdentifier: sleepEntry.id,
        HKSyncVersion: 1,
      } as any,
    );
  }

  private average(values: readonly number[]): number | undefined {
    const finite = values.filter(Number.isFinite);
    if (finite.length === 0) return undefined;
    return finite.reduce((sum, value) => sum + value, 0) / finite.length;
  }

  private sleepStage(value: CategoryValueSleepAnalysis): SleepEntry['stage'] | null {
    switch (value) {
      case CategoryValueSleepAnalysis.awake:
        return 'awake';
      case CategoryValueSleepAnalysis.asleepCore:
        return 'core';
      case CategoryValueSleepAnalysis.asleepDeep:
        return 'deep';
      case CategoryValueSleepAnalysis.asleepREM:
        return 'rem';
      case CategoryValueSleepAnalysis.asleepUnspecified:
        return 'unspecified';
      default:
        // `inBed` is not proof of sleep and must not be counted as asleep.
        return null;
    }
  }
}
