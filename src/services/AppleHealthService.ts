import AppleHealthKit, {
  HealthKitPermissions,
} from 'react-native-health';
import { Platform } from 'react-native';
import { SleepEntry } from '../types/SleepEntry';

// Define permission options for HealthKit
const permissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
    ],
  },
} as HealthKitPermissions;

// Define the sleep sample interface
interface SleepSample {
  id?: string;
  startDate: string;
  endDate: string;
  value: number;
  sourceId?: string;
  sourceName?: string;
}

/**
 * Service for interacting with Apple HealthKit
 */
export class AppleHealthService {
  // Flag to track if we have permission
  private hasPermission: boolean = false;

  /**
   * Initialize the health service and request permissions
   * @returns Promise that resolves when permissions are granted
   */
  public initialize(): Promise<void> {
    // Only proceed on iOS
    if (Platform.OS !== 'ios') {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          this.hasPermission = false;
          reject(new Error(`HealthKit initialization failed: ${error}`));
          return;
        }
        
        this.hasPermission = true;
        resolve();
      });
    });
  }

  /**
   * Check if HealthKit is available on this device
   * @returns Boolean indicating if HealthKit is available
   */
  public isAvailable(): boolean {
    return Platform.OS === 'ios';
  }

  /**
   * Check if we have required permissions
   * @returns Boolean indicating if we have permissions
   */
  public hasRequiredPermissions(): boolean {
    return this.hasPermission;
  }

  /**
   * Get sleep data from HealthKit for a specific date range
   * @param startDate Beginning date to fetch from
   * @param endDate End date to fetch to
   * @returns Promise with array of sleep entries
   */
  public async getSleepData(startDate: Date, endDate: Date): Promise<SleepEntry[]> {
    if (!this.isAvailable() || !this.hasPermission) {
      return Promise.resolve([]);
    }

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    return new Promise((resolve, reject) => {
      AppleHealthKit.getSleepSamples(options, (error: string, results: SleepSample[]) => {
        if (error) {
          reject(new Error(`Error getting sleep samples: ${error}`));
          return;
        }

        // Convert HealthKit samples to our SleepEntry format
        const sleepEntries: SleepEntry[] = results.map(sample => ({
          id: `health-${sample.id || sample.startDate}`,
          startTime: new Date(sample.startDate).getTime(),
          endTime: new Date(sample.endDate).getTime(),
          source: sample.sourceName || 'Apple Health',
          confidence: 95, // High confidence for HealthKit data
          isAwake: sample.value === 0, // Convert HealthKit's sleep values to our format
        }));

        resolve(sleepEntries);
      });
    });
  }

  /**
   * Save sleep data to HealthKit
   * This is a mock implementation since direct writing to HealthKit requires
   * additional native code setup that may not be available in the current app build
   * @param sleepEntry The sleep entry to save
   * @returns Promise that resolves when saved
   */
  public async saveSleepData(sleepEntry: SleepEntry): Promise<void> {
    if (!this.isAvailable() || !this.hasPermission) {
      return Promise.resolve();
    }

    // In a real implementation, we would write to HealthKit
    // For now, we'll log the action and resolve the promise
    console.log('Would save to Apple Health:', {
      startDate: new Date(sleepEntry.startTime).toISOString(),
      endDate: new Date(sleepEntry.endTime).toISOString(),
      value: sleepEntry.isAwake ? 0 : 1, // 0 is awake, 1 is asleep in HealthKit
    });

    // Mock successful write
    return Promise.resolve();

    // Note: To actually implement this when ready, you'll need to:
    // 1. Add additional native code to support writing to HealthKit
    // 2. Update react-native-health to the latest version
    // 3. Use the appropriate method, which might be named differently
    //    depending on the library version
  }
} 