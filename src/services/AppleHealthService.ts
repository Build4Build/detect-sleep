import { Platform } from 'react-native';
import { SleepEntry } from '../types/SleepEntry';

let AppleHealthKit: any = null;
try {
  AppleHealthKit = require('react-native-health').default;
} catch (error) {
  console.warn('react-native-health not available:', error);
}

// Define permission options for HealthKit
const permissions = {
  permissions: {
    read: [
      'SleepAnalysis',
    ],
    write: [
      'SleepAnalysis',
    ],
  },
};

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
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Check if initHealthKit method exists
        if (typeof AppleHealthKit.initHealthKit !== 'function') {
          console.warn('AppleHealthKit.initHealthKit is not available - health integration disabled');
          this.hasPermission = false;
          resolve(); // Don't reject - just disable health integration
          return;
        }

        AppleHealthKit.initHealthKit(permissions, (error: string) => {
          if (error) {
            console.warn(`HealthKit initialization failed: ${error} - health integration disabled`);
            this.hasPermission = false;
            resolve(); // Don't reject - just disable health integration
            return;
          }

          this.hasPermission = true;
          console.log('HealthKit initialized successfully');
          resolve();
        });
      } catch (error) {
        console.warn('Failed to initialize health service:', error, '- health integration disabled');
        this.hasPermission = false;
        resolve(); // Don't reject - just disable health integration
      }
    });
  }

  /**
   * Check if HealthKit is available on this device
   * @returns Boolean indicating if HealthKit is available
   */
  public isAvailable(): boolean {
    return Platform.OS === 'ios' && AppleHealthKit !== null;
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
    if (!this.isAvailable() || !this.hasPermission || !AppleHealthKit) {
      return Promise.resolve([]);
    }

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    return new Promise((resolve, reject) => {
      try {
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
      } catch (error) {
        console.error('Failed to get sleep data:', error);
        resolve([]);
      }
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

    // TODO: Write to HealthKit
    //  startDate: new Date(sleepEntry.startTime).toISOString(),
    //endDate: new Date(sleepEntry.endTime).toISOString(),
    //value: sleepEntry.isAwake ? 0 : 1, // 0 is awake, 1 is asleep in HealthKit


    // Mock successful write
    return Promise.resolve();

    // Note: To actually implement this when ready, you'll need to:
    // 1. Add additional native code to support writing to HealthKit
    // 2. Update react-native-health to the latest version
    // 3. Use the appropriate method, which might be named differently
    //    depending on the library version
  }
} 