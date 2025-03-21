import AsyncStorage from '@react-native-async-storage/async-storage';
import { SleepEntry } from '../types/SleepEntry';
import { HealthService } from './HealthService';

// Create a singleton instance of our health service
const healthService = new HealthService();

// Storage key for sleep data
const SLEEP_DATA_KEY = '@SleepDetector:sleepData';
const HEALTH_SYNC_ENABLED_KEY = '@SleepDetector:healthSyncEnabled';

/**
 * Service for tracking and managing sleep data
 */
export class SleepTrackerService {
  private sleepData: SleepEntry[] = [];
  private healthSyncEnabled: boolean = false;

  /**
   * Initialize the service by loading saved data
   */
  public async initialize(): Promise<void> {
    await this.loadSleepData();
    await this.loadHealthSyncSetting();
    
    // Initialize health service if sync is enabled
    if (this.healthSyncEnabled) {
      await healthService.initialize();
    }
  }

  /**
   * Load sleep data from storage
   */
  private async loadSleepData(): Promise<void> {
    try {
      const dataString = await AsyncStorage.getItem(SLEEP_DATA_KEY);
      if (dataString) {
        this.sleepData = JSON.parse(dataString);
      }
    } catch (error) {
      console.error('Error loading sleep data:', error);
      this.sleepData = [];
    }
  }

  /**
   * Load health sync setting
   */
  private async loadHealthSyncSetting(): Promise<void> {
    try {
      const value = await AsyncStorage.getItem(HEALTH_SYNC_ENABLED_KEY);
      this.healthSyncEnabled = value === 'true';
    } catch (error) {
      console.error('Error loading health sync setting:', error);
      this.healthSyncEnabled = false;
    }
  }

  /**
   * Set whether health sync is enabled
   */
  public async setHealthSyncEnabled(enabled: boolean): Promise<void> {
    this.healthSyncEnabled = enabled;
    await AsyncStorage.setItem(HEALTH_SYNC_ENABLED_KEY, enabled.toString());
    
    // Initialize health service if enabling
    if (enabled) {
      await healthService.initialize();
    }
  }

  /**
   * Get whether health sync is enabled
   */
  public isHealthSyncEnabled(): boolean {
    return this.healthSyncEnabled;
  }

  /**
   * Save current sleep data to storage
   */
  private async saveSleepData(): Promise<void> {
    try {
      await AsyncStorage.setItem(SLEEP_DATA_KEY, JSON.stringify(this.sleepData));
    } catch (error) {
      console.error('Error saving sleep data:', error);
    }
  }

  /**
   * Add a new sleep entry
   */
  public async addSleepEntry(entry: SleepEntry): Promise<void> {
    this.sleepData.push(entry);
    await this.saveSleepData();
    
    // Sync to health service if enabled
    if (this.healthSyncEnabled && healthService.hasRequiredPermissions()) {
      try {
        await healthService.saveSleepData(entry);
      } catch (error) {
        console.error('Error syncing sleep entry to health service:', error);
      }
    }
  }

  /**
   * Delete a sleep entry by ID
   */
  public async deleteSleepEntry(id: string): Promise<void> {
    this.sleepData = this.sleepData.filter(entry => entry.id !== id);
    await this.saveSleepData();
  }

  /**
   * Update an existing sleep entry
   */
  public async updateSleepEntry(updatedEntry: SleepEntry): Promise<void> {
    const index = this.sleepData.findIndex(entry => entry.id === updatedEntry.id);
    if (index !== -1) {
      this.sleepData[index] = updatedEntry;
      await this.saveSleepData();
      
      // Sync to health service if enabled
      if (this.healthSyncEnabled && healthService.hasRequiredPermissions()) {
        try {
          await healthService.saveSleepData(updatedEntry);
        } catch (error) {
          console.error('Error syncing updated sleep entry to health service:', error);
        }
      }
    }
  }

  /**
   * Get all sleep entries
   */
  public getSleepEntries(): SleepEntry[] {
    return [...this.sleepData];
  }

  /**
   * Get sleep entries for a specific date range
   */
  public getSleepEntriesForRange(startTime: number, endTime: number): SleepEntry[] {
    return this.sleepData.filter(entry => {
      // Include entries that overlap with the range
      return (entry.startTime >= startTime && entry.startTime <= endTime) ||
             (entry.endTime >= startTime && entry.endTime <= endTime) ||
             (entry.startTime <= startTime && entry.endTime >= endTime);
    });
  }

  /**
   * Import sleep data from health service
   */
  public async importFromHealthService(startDate: Date, endDate: Date): Promise<number> {
    if (!healthService.hasRequiredPermissions()) {
      return 0;
    }
    
    try {
      // Get sleep data from health service
      const healthData = await healthService.getSleepData(startDate, endDate);
      if (!healthData || healthData.length === 0) {
        return 0;
      }
      
      // Filter out entries we already have
      const existingIds = new Set(this.sleepData.map(entry => entry.id));
      const newEntries = healthData.filter(entry => !existingIds.has(entry.id));
      
      // Add new entries
      if (newEntries.length > 0) {
        this.sleepData = [...this.sleepData, ...newEntries];
        await this.saveSleepData();
      }
      
      return newEntries.length;
    } catch (error) {
      console.error('Error importing from health service:', error);
      return 0;
    }
  }

  /**
   * Export sleep data to health service
   */
  public async exportToHealthService(): Promise<number> {
    if (!healthService.hasRequiredPermissions()) {
      return 0;
    }
    
    let exportedCount = 0;
    
    try {
      // Get entries not from health service (avoid re-exporting)
      const entriesToExport = this.sleepData.filter(entry => 
        !entry.source.includes('Health') && !entry.source.includes('Fit')
      );
      
      // Export each entry
      for (const entry of entriesToExport) {
        await healthService.saveSleepData(entry);
        exportedCount++;
      }
      
      return exportedCount;
    } catch (error) {
      console.error('Error exporting to health service:', error);
      return exportedCount;
    }
  }

  /**
   * Clear all sleep data
   */
  public async clearAllData(): Promise<void> {
    this.sleepData = [];
    await this.saveSleepData();
  }
} 