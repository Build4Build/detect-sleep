/**
 * Represents a sleep entry in the app
 */
export interface SleepEntry {
  /**
   * Unique identifier for the entry
   */
  id: string;
  
  /**
   * Start time of the sleep entry in milliseconds since epoch
   */
  startTime: number;
  
  /**
   * End time of the sleep entry in milliseconds since epoch
   */
  endTime: number;
  
  /**
   * Whether the user was awake during this entry
   */
  isAwake: boolean;
  
  /**
   * Confidence level of the detection (0-100)
   */
  confidence: number;
  
  /**
   * Source of the sleep data (e.g., 'app', 'Apple Health', 'Google Fit')
   */
  source: string;
} 