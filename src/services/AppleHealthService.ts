import { Platform } from 'react-native';
import {
  AuthorizationStatus,
  CategoryValueSleepAnalysis,
  authorizationStatusFor,
  isHealthDataAvailable,
  queryCategorySamples,
  requestAuthorization,
  saveCategorySample,
} from '@kingstinct/react-native-healthkit';
import { SleepEntry } from '../types/SleepEntry';

const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis' as const;

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
        await requestAuthorization({ toRead: [SLEEP_TYPE], toShare: [SLEEP_TYPE] });
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
    if (!this.hasPermission) return [];

    const samples = await queryCategorySamples(SLEEP_TYPE, {
      limit: 0,
      ascending: true,
      filter: { date: { startDate, endDate, strictStartDate: true } },
    });

    return samples.map(sample => ({
      id: `health-${sample.uuid}`,
      startTime: sample.startDate.getTime(),
      endTime: sample.endDate.getTime(),
      source: sample.sourceRevision.source.name || 'Apple Health',
      confidence: 95,
      isAwake: sample.value === CategoryValueSleepAnalysis.awake,
    }));
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
        && syncIdentifier.startsWith('detected-');
      const coversEntry = sample.startDate.getTime() <= sleepEntry.startTime
        && sample.endDate.getTime() >= sleepEntry.endTime;

      return syncIdentifier === sleepEntry.id || (isSleepDetectorSample && coversEntry);
    });
    if (alreadySynced) return;

    await saveCategorySample(
      SLEEP_TYPE,
      CategoryValueSleepAnalysis.asleepUnspecified,
      new Date(sleepEntry.startTime),
      new Date(sleepEntry.endTime),
      {
        HKWasUserEntered: false,
        HKTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        HKExternalUUID: sleepEntry.id,
        HKSyncIdentifier: sleepEntry.id,
        HKSyncVersion: 1,
      } as any,
    );
  }
}
