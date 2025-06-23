import { Platform } from 'react-native';
import { SleepEntry } from '../types/SleepEntry';
import { AppleHealthService } from './AppleHealthService';
import { GoogleFitService } from './GoogleFitService';

/**
 * A unified service for health integrations that works on both iOS and Android
 */
export class HealthService {
  private appleHealthService: AppleHealthService | null = null;
  private googleFitService: GoogleFitService | null = null;
  private initialized: boolean = false;

  constructor() {
    // Initialize the platform-specific service
    if (Platform.OS === 'ios') {
      this.appleHealthService = new AppleHealthService();
    } else if (Platform.OS === 'android') {
      this.googleFitService = new GoogleFitService();
    }
  }

  /**
   * Initialize the health service for the current platform
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      if (Platform.OS === 'ios' && this.appleHealthService) {
        await this.appleHealthService.initialize();
        this.initialized = true;
        return true;
      } else if (Platform.OS === 'android' && this.googleFitService) {
        await this.googleFitService.initialize();
        this.initialized = true;
        return true;
      }
      
      // Not supported on this platform
      console.warn('Health integration not supported on this platform');
      return false;
    } catch (error) {
      console.warn('Failed to initialize health service:', error, '- continuing without health integration');
      return false;
    }
  }

  /**
   * Check if health services are available on this device
   * @returns Boolean indicating availability
   */
  public isAvailable(): boolean {
    if (Platform.OS === 'ios' && this.appleHealthService) {
      return this.appleHealthService.isAvailable();
    } else if (Platform.OS === 'android' && this.googleFitService) {
      return this.googleFitService.isAvailable();
    }
    return false;
  }

  /**
   * Check if we have the required permissions
   * @returns Boolean indicating if permissions are granted
   */
  public hasRequiredPermissions(): boolean {
    if (Platform.OS === 'ios' && this.appleHealthService) {
      return this.appleHealthService.hasRequiredPermissions();
    } else if (Platform.OS === 'android' && this.googleFitService) {
      return this.googleFitService.hasRequiredPermissions();
    }
    return false;
  }

  /**
   * Get sleep data for a specific date range
   * @param startDate Beginning date to fetch from
   * @param endDate End date to fetch to
   * @returns Promise with array of sleep entries
   */
  public async getSleepData(startDate: Date, endDate: Date): Promise<SleepEntry[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (Platform.OS === 'ios' && this.appleHealthService) {
      return this.appleHealthService.getSleepData(startDate, endDate);
    } else if (Platform.OS === 'android' && this.googleFitService) {
      return this.googleFitService.getSleepData(startDate, endDate);
    }
    
    return [];
  }

  /**
   * Save sleep data to the health service
   * @param sleepEntry The sleep entry to save
   * @returns Promise that resolves when saved
   */
  public async saveSleepData(sleepEntry: SleepEntry): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (Platform.OS === 'ios' && this.appleHealthService) {
      return this.appleHealthService.saveSleepData(sleepEntry);
    } else if (Platform.OS === 'android' && this.googleFitService) {
      return this.googleFitService.saveSleepData(sleepEntry);
    }
    
    return Promise.resolve();
  }

  /**
   * Get the name of the health service for the current platform
   * @returns String representing the service name
   */
  public getServiceName(): string {
    if (Platform.OS === 'ios') {
      return 'Apple Health';
    } else if (Platform.OS === 'android') {
      return 'Google Fit';
    }
    return 'Unknown Health Service';
  }
} 