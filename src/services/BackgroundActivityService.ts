import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { NotificationService } from './NotificationService';

// Background task name
const BACKGROUND_ACTIVITY_TASK = 'background-activity-monitor';

// Storage keys
const LAST_ACTIVITY_KEY = 'last-device-activity';
const ACTIVITY_LOG_KEY = 'device-activity-log';
const SETTINGS_KEY = 'sleep-tracker-settings'; // Same key as SleepContext

// Activity detection thresholds
const MOVEMENT_THRESHOLD = 0.1; // Lowered threshold for detecting movement
const GYRO_THRESHOLD = 0.05; // Threshold for gyroscope rotation detection
const ACTIVITY_CHECK_INTERVAL = 30000; // Check every 30 seconds when active
const BACKGROUND_CHECK_INTERVAL = 60000; // Check every 60 seconds in background
const INACTIVITY_UPDATE_INTERVAL = 300000; // Update inactivity every 5 minutes

// Default settings (should match SleepContext)
const DEFAULT_SETTINGS = {
  inactivityThreshold: 45, // 45 minutes of inactivity before considered asleep
  useMachineLearning: true,
  considerTimeOfDay: true,
};

interface ActivityData {
  timestamp: number;
  hasMovement: boolean;
  appState: AppStateStatus;
  confidence: number;
}

export class BackgroundActivityService {
  private static instance: BackgroundActivityService;
  private isMonitoring = false;
  private lastMovementTimestamp = Date.now();
  private lastActivityUpdate = Date.now(); // Track when we last updated activity
  private accelerometerSubscription: any = null;
  private gyroscopeSubscription: any = null;
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private inactivityUpdateInterval: NodeJS.Timeout | null = null; // New interval for inactivity updates
  private appStateSubscription: any = null;
  private currentAppState: AppStateStatus = 'active';

  public static getInstance(): BackgroundActivityService {
    if (!BackgroundActivityService.instance) {
      BackgroundActivityService.instance = new BackgroundActivityService();
    }
    return BackgroundActivityService.instance;
  }

  /**
   * Initialize the background activity monitoring service
   */
  public async initialize(): Promise<void> {
    try {
      // Register background task
      await this.registerBackgroundTask();

      // Set up sensor monitoring
      await this.setupSensorMonitoring();

      // Set up app state monitoring
      this.setupAppStateMonitoring();

      // Start background fetch
      await this.startBackgroundFetch();

      console.log('BackgroundActivityService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize BackgroundActivityService:', error);
    }
  }

  /**
   * Get user settings from storage
   */
  private async getUserSettings(): Promise<typeof DEFAULT_SETTINGS> {
    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settingsJson) {
        const loadedSettings = JSON.parse(settingsJson);
        return { ...DEFAULT_SETTINGS, ...loadedSettings };
      }
    } catch (error) {
      console.error('Failed to load user settings in background service:', error);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Register the background task for activity monitoring
   */
  private async registerBackgroundTask(): Promise<void> {
    TaskManager.defineTask(BACKGROUND_ACTIVITY_TASK, async () => {
      try {
        const now = Date.now();
        const lastActivity = await this.getLastActivityTimestamp();
        const inactiveTime = (now - lastActivity) / (1000 * 60); // minutes

        // Get user settings
        const userSettings = await this.getUserSettings();

        // Log activity check
        await this.logActivity({
          timestamp: now,
          hasMovement: false, // No movement detected in background
          appState: 'background',
          confidence: 90
        });

        // If inactive for more than user's threshold, user is likely asleep
        if (inactiveTime >= userSettings.inactivityThreshold) {
          await this.notifyPotentialSleep(inactiveTime);
          console.log(`🛌 Sleep threshold reached: ${Math.round(inactiveTime)} minutes inactive`);
        } else {
          console.log(`⏰ Background check: ${Math.round(inactiveTime)} minutes inactive (threshold: ${userSettings.inactivityThreshold})`);
        }

        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Background task error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  /**
   * Set up sensor monitoring for movement detection
   */
  private async setupSensorMonitoring(): Promise<void> {
    try {
      // Configure accelerometer with optimized settings
      Accelerometer.setUpdateInterval(1000); // Check every second to reduce noise

      let lastSignificantMovement = 0;

      this.accelerometerSubscription = Accelerometer.addListener(accelerometerData => {
        const { x, y, z } = accelerometerData;
        const magnitude = Math.sqrt(x * x + y * y + z * z);

        // Detect significant movement with noise filtering
        if (magnitude > MOVEMENT_THRESHOLD) {
          const now = Date.now();
          // Debounce movements - only record if it's been at least 3 seconds since last
          if (now - lastSignificantMovement > 3000) {
            lastSignificantMovement = now;
            this.onMovementDetected('accelerometer');
          }
        }
      });

      // Configure gyroscope for rotation detection
      Gyroscope.setUpdateInterval(1000); // Check every second

      let lastSignificantRotation = 0;

      this.gyroscopeSubscription = Gyroscope.addListener(gyroscopeData => {
        const { x, y, z } = gyroscopeData;
        const magnitude = Math.sqrt(x * x + y * y + z * z);

        // Detect phone rotation/usage with noise filtering
        if (magnitude > GYRO_THRESHOLD) {
          const now = Date.now();
          // Debounce rotations - only record if it's been at least 2 seconds since last
          if (now - lastSignificantRotation > 2000) {
            lastSignificantRotation = now;
            this.onMovementDetected('gyroscope');
          }
        }
      });

      console.log('🔧 Sensor monitoring configured with enhanced detection and noise filtering');
    } catch (error) {
      console.error('❌ Failed to set up sensor monitoring:', error);
    }
  }

  /**
   * Set up app state monitoring
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousState = this.currentAppState;
      this.currentAppState = nextAppState;

      console.log(`📱 App state changed from ${previousState} to ${nextAppState}`);

      // If app becomes active, record as movement but be conservative about timing
      if (nextAppState === 'active' && previousState !== 'active') {
        // Start a grace period to see if user actually interacts with the app
        this.startAppActiveGracePeriod();
      }

      // If app goes to background, start more aggressive monitoring
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.onAppBackground();
        console.log('🌙 App went to background - starting background monitoring');
      }
    });
  }

  /**
   * Start a grace period when app becomes active to determine if it's genuine usage
   */
  private startAppActiveGracePeriod(): void {
    // Initially mark as just a check
    this.onMovementDetected('app_active_check');

    // Set up a timer to upgrade to genuine activity if user stays active
    setTimeout(() => {
      if (this.currentAppState === 'active') {
        // User has been actively using the app for 15 seconds
        this.onMovementDetected('app_active');
        console.log('⏰ Upgraded app check to genuine activity - user actively using app');

        // Set up another timer for extended genuine usage
        setTimeout(() => {
          if (this.currentAppState === 'active') {
            // User has been using app for 45 seconds - definitely genuine activity
            this.onMovementDetected('user_interaction');
            console.log('🎯 Confirmed extended app usage - marking as strong user interaction');
          }
        }, 30000); // Additional 30 seconds = 45 total
      }
    }, 15000); // Increased to 15 seconds for more reliable detection
  }

  /**
   * Start background fetch service
   */
  private async startBackgroundFetch(): Promise<void> {
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_ACTIVITY_TASK, {
        minimumInterval: 60, // Minimum 1 minute between checks
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background fetch registered successfully');
    } catch (error) {
      console.error('Failed to register background fetch:', error);
    }
  }

  /**
   * Handle detected movement
   */
  private onMovementDetected(source: string = 'sensor'): void {
    const now = Date.now();

    // Only update last movement for actual physical movement, not just app activation
    if (source !== 'app_active_check') {
      this.lastMovementTimestamp = now;
      this.lastActivityUpdate = now;

      // Store last activity timestamp
      AsyncStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      console.log(`🟢 GENUINE ACTIVITY detected from ${source} at ${new Date(now).toLocaleTimeString()}`);
    } else {
      console.log(`📱 APP CHECK detected at ${new Date(now).toLocaleTimeString()} - not updating activity timer`);
    }

    // Log the activity with proper confidence scoring
    this.logActivity({
      timestamp: now,
      hasMovement: source !== 'app_active_check',
      appState: this.currentAppState,
      confidence: this.getSourceConfidence(source)
    });
  }

  /**
   * Get confidence level based on activity source
   */
  private getSourceConfidence(source: string): number {
    switch (source) {
      case 'user_interaction': return 100; // Manual user activity recording
      case 'accelerometer': return 90; // Physical movement
      case 'gyroscope': return 85; // Phone rotation/usage
      case 'app_active': return 80; // App became active with likely usage
      case 'app_active_check': return 40; // Just checking the app
      default: return 70; // Generic sensor activity
    }
  }

  /**
   * Handle app going to background
   */
  private onAppBackground(): void {
    console.log('Setting up background monitoring...');

    // Clear any existing intervals
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }
    if (this.inactivityUpdateInterval) {
      clearInterval(this.inactivityUpdateInterval);
    }

    // Set up periodic checks while in background
    this.activityCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastMovement = now - this.lastMovementTimestamp;
      const timeSinceLastUpdate = now - this.lastActivityUpdate;

      // Log inactivity every check
      this.logActivity({
        timestamp: now,
        hasMovement: false,
        appState: 'background',
        confidence: 70
      });

      console.log(`Background check: ${Math.round(timeSinceLastMovement / (1000 * 60))} minutes since last movement`);
    }, BACKGROUND_CHECK_INTERVAL);

    // Set up regular inactivity updates
    this.inactivityUpdateInterval = setInterval(async () => {
      const now = Date.now();
      const inactiveMinutes = (now - this.lastMovementTimestamp) / (1000 * 60);

      // Update the last activity timestamp in storage to current time if no movement
      // This ensures getInactivityDuration() returns the correct value
      if (inactiveMinutes > 1) { // Only if we've been inactive for more than 1 minute
        console.log(`Updating inactivity: ${Math.round(inactiveMinutes)} minutes inactive`);
      }

      this.lastActivityUpdate = now;
    }, INACTIVITY_UPDATE_INTERVAL);
  }

  /**
   * Log activity data
   */
  private async logActivity(activity: ActivityData): Promise<void> {
    try {
      const existingLog = await AsyncStorage.getItem(ACTIVITY_LOG_KEY);
      const log: ActivityData[] = existingLog ? JSON.parse(existingLog) : [];

      // Add new activity
      log.push(activity);

      // Keep only last 1000 entries to manage storage
      const recentLog = log.slice(-1000);

      await AsyncStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(recentLog));
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Record genuine user activity (for when we know the user is actually using the phone)
   */
  public recordUserActivity(): void {
    this.onMovementDetected('user_interaction');
  }

  /**
   * Get the timestamp of the last detected activity
   */
  public async getLastActivityTimestamp(): Promise<number> {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
      return timestamp ? parseInt(timestamp) : Date.now();
    } catch (error) {
      console.error('Failed to get last activity timestamp:', error);
      return Date.now();
    }
  }

  /**
   * Get recent activity log
   */
  public async getActivityLog(hours: number = 24): Promise<ActivityData[]> {
    try {
      const log = await AsyncStorage.getItem(ACTIVITY_LOG_KEY);
      if (!log) return [];

      const activities: ActivityData[] = JSON.parse(log);
      const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);

      return activities.filter(activity => activity.timestamp >= cutoffTime);
    } catch (error) {
      console.error('Failed to get activity log:', error);
      return [];
    }
  }

  /**
   * Notify about potential sleep state
   */
  private async notifyPotentialSleep(inactiveMinutes: number): Promise<void> {
    // This will be called by the sleep context to update sleep status
    console.log(`Potential sleep detected: ${inactiveMinutes} minutes of inactivity`);

    // Send notification if user has been inactive long enough
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.notifySleepDetected(inactiveMinutes);
    } catch (error) {
      console.error('Failed to send sleep detection notification from background:', error);
    }
  }

  /**
   * Check if device has been inactive for specified duration
   * @param includeCurrentCheck - if false, returns time since last genuine activity (not just app checks)
   */
  public async getInactivityDuration(includeCurrentCheck: boolean = false): Promise<number> {
    const lastActivity = await this.getLastActivityTimestamp();
    const now = Date.now();
    const inactiveMinutes = (now - lastActivity) / (1000 * 60);

    // If we're currently checking the app but want to ignore the current session
    if (!includeCurrentCheck && this.currentAppState === 'active') {
      // Get the activity log to find the last non-check activity
      const recentActivity = await this.getActivityLog(3); // Extended to 3 hours for better analysis

      // Find the last activity that was genuine movement (not just app checks)
      const lastGenuineActivity = recentActivity
        .filter(activity => activity.hasMovement === true && activity.confidence >= 70)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (lastGenuineActivity) {
        const genuineInactiveMinutes = (now - lastGenuineActivity.timestamp) / (1000 * 60);
        console.log(`📊 Inactivity Analysis: ${Math.round(inactiveMinutes)}min total, ${Math.round(genuineInactiveMinutes)}min genuine inactivity`);
        return Math.max(0, genuineInactiveMinutes);
      } else {
        // If no genuine activity found in recent history, analyze recent app state changes
        const recentAppActivity = recentActivity
          .filter(activity => activity.timestamp > (now - (2 * 60 * 60 * 1000))) // Last 2 hours
          .sort((a, b) => b.timestamp - a.timestamp);

        if (recentAppActivity.length > 0) {
          // Find the most recent high-confidence activity
          const lastHighConfidenceActivity = recentAppActivity.find(activity => activity.confidence >= 85);
          if (lastHighConfidenceActivity) {
            const adjustedInactiveMinutes = (now - lastHighConfidenceActivity.timestamp) / (1000 * 60);
            console.log(`📊 Using high-confidence activity timestamp: ${Math.round(adjustedInactiveMinutes)}min inactivity`);
            return Math.max(0, adjustedInactiveMinutes);
          }
        }

        // Fall back to buffered approach but with more conservative buffer
        const bufferedInactiveMinutes = Math.max(0, inactiveMinutes - 5); // 5 minute buffer for app session
        console.log(`📊 No recent genuine activity found, using conservative buffered inactivity: ${Math.round(bufferedInactiveMinutes)}min`);
        return bufferedInactiveMinutes;
      }
    }

    // Log the inactivity check for debugging
    console.log(`📊 Total inactivity: ${Math.round(inactiveMinutes)} minutes since last activity`);

    return Math.max(0, inactiveMinutes); // Ensure non-negative return
  }

  /**
   * Start monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Background monitoring already active');
      return;
    }

    this.isMonitoring = true;
    this.lastMovementTimestamp = Date.now();
    this.lastActivityUpdate = Date.now();

    // Initialize the last activity timestamp
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());

    await this.initialize();
    console.log('Background activity monitoring started successfully');
  }

  /**
   * Stop monitoring with enhanced error handling
   */
  public async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      console.log('📱 Background monitoring already stopped');
      return;
    }

    console.log('🛑 Stopping background activity monitoring...');
    this.isMonitoring = false;

    // Enhanced cleanup with individual try-catch blocks to prevent cascade failures
    
    // Clean up accelerometer subscription
    try {
      if (this.accelerometerSubscription) {
        this.accelerometerSubscription.remove();
        this.accelerometerSubscription = null;
        console.log('✅ Accelerometer subscription cleaned up');
      }
    } catch (error) {
      console.error('❌ Error cleaning up accelerometer:', error);
    }

    // Clean up gyroscope subscription
    try {
      if (this.gyroscopeSubscription) {
        this.gyroscopeSubscription.remove();
        this.gyroscopeSubscription = null;
        console.log('✅ Gyroscope subscription cleaned up');
      }
    } catch (error) {
      console.error('❌ Error cleaning up gyroscope:', error);
    }

    // Clean up app state subscription
    try {
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
        console.log('✅ App state subscription cleaned up');
      }
    } catch (error) {
      console.error('❌ Error cleaning up app state subscription:', error);
    }

    // Clear intervals
    try {
      if (this.activityCheckInterval) {
        clearInterval(this.activityCheckInterval);
        this.activityCheckInterval = null;
        console.log('✅ Activity check interval cleared');
      }
    } catch (error) {
      console.error('❌ Error clearing activity check interval:', error);
    }

    try {
      if (this.inactivityUpdateInterval) {
        clearInterval(this.inactivityUpdateInterval);
        this.inactivityUpdateInterval = null;
        console.log('✅ Inactivity update interval cleared');
      }
    } catch (error) {
      console.error('❌ Error clearing inactivity update interval:', error);
    }

    // Unregister background task with timeout protection
    try {
      console.log('🔄 Unregistering background task...');
      
      // Add timeout to prevent hanging
      const unregisterPromise = BackgroundFetch.unregisterTaskAsync(BACKGROUND_ACTIVITY_TASK);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Background task unregister timeout')), 5000)
      );
      
      await Promise.race([unregisterPromise, timeoutPromise]);
      console.log('✅ Background task unregistered successfully');
    } catch (error) {
      console.error('❌ Failed to unregister background task (non-critical):', error);
      // Don't throw here - this is cleanup, not critical for app function
    }

    console.log('🎯 Background activity monitoring stopped successfully');
  }

  /**
   * Get monitoring status
   */
  public isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Emergency shutdown - force cleanup without waiting for async operations
   * Use this when the app is being force-closed
   */
  public emergencyShutdown(): void {
    console.log('🚨 Emergency shutdown initiated');
    
    try {
      this.isMonitoring = false;
      
      // Synchronous cleanup only
      if (this.activityCheckInterval) {
        clearInterval(this.activityCheckInterval);
        this.activityCheckInterval = null;
      }
      
      if (this.inactivityUpdateInterval) {
        clearInterval(this.inactivityUpdateInterval);
        this.inactivityUpdateInterval = null;
      }

      // Note: We skip sensor cleanup here as it might be async and cause crashes
      console.log('🎯 Emergency shutdown completed');
    } catch (error) {
      console.error('❌ Error during emergency shutdown:', error);
      // Don't rethrow - we're already in an emergency situation
    }
  }
}

export default BackgroundActivityService;
