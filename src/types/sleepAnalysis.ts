export type SleepEvidenceKind =
  | "app-away"
  | "historical-schedule"
  | "healthkit-sleep"
  | "watch-low-motion"
  | "watch-heart-rate"
  | "user-confirmed"
  | "user-edited";

export interface SleepEvidence {
  kind: SleepEvidenceKind;
  weight: number;
  detail: string;
}

export type SleepAnalysisSource = "deterministic" | "apple-foundation-model";

export interface SleepAnalysisFeatures {
  startTime: number;
  endTime: number;
  durationMinutes: number;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
  historicalSessionCount: number;
  historicalBedtimeMinute?: number;
  historicalWakeMinute?: number;
  healthKitOverlapRatio?: number;
  watchLowMotionRatio?: number;
  watchHeartRateDropPercent?: number;
}

export interface SleepAnalysisDecision {
  startTime: number;
  endTime: number;
  confidence: number;
  classification: "likely-sleep" | "uncertain" | "unlikely-sleep";
  source: SleepAnalysisSource;
  explanation: string;
  evidence: SleepEvidence[];
  requiresConfirmation: boolean;
}

export interface LocalModelAvailability {
  available: boolean;
  reason:
    | "available"
    | "unsupported-platform"
    | "unsupported-os"
    | "device-not-eligible"
    | "model-not-ready"
    | "native-module-unavailable"
    | "unknown";
}

export interface LocalModelAssessment {
  classification: SleepAnalysisDecision["classification"];
  confidence: number;
  suggestedStartOffsetMinutes: number;
  suggestedEndOffsetMinutes: number;
  explanation: string;
}

export type SleepSessionSource =
  | "app-inactivity"
  | "manual"
  | "apple-watch"
  | "healthkit"
  | "combined";
export type HealthSyncState = "not-requested" | "pending" | "synced" | "failed";

export interface SleepSession {
  id: string;
  startTime: number;
  endTime?: number;
  confidence: number;
  source: SleepSessionSource;
  evidence: SleepEvidence[];
  userConfirmed: boolean;
  timezone: string;
  createdAt: number;
  updatedAt: number;
  healthSyncState: HealthSyncState;
  healthSyncError?: string;
}

export interface SleepStageMinutes {
  awake: number;
  core: number;
  deep: number;
  rem: number;
  unspecified: number;
}

export interface WatchSleepSnapshot {
  schemaVersion: 1;
  id: string;
  generatedAt: number;
  sleepStart: number;
  sleepEnd: number;
  totalSleepMinutes: number;
  awakeMinutes: number;
  coreMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  unspecifiedMinutes: number;
  restingHeartRate?: number;
  heartRateVariabilityMs?: number;
  respiratoryRate?: number;
  wristTemperatureCelsius?: number;
  source: "apple-watch-healthkit";
}

export interface HealthRecoverySnapshot {
  startTime: number;
  endTime: number;
  restingHeartRate?: number;
  heartRateVariabilityMs?: number;
  respiratoryRate?: number;
  wristTemperatureCelsius?: number;
}

/** Wellness observations only. These values must never be presented as a diagnosis. */
export interface DailyWellnessReport {
  date: string;
  sleepStart?: number;
  sleepEnd?: number;
  sleepMinutes: number;
  sleepConsistencyScore: number;
  sleepContinuityScore?: number;
  sleepStages?: SleepStageMinutes;
  restingHeartRate?: number;
  heartRateVariabilityMs?: number;
  respiratoryRate?: number;
  wristTemperatureCelsius?: number;
  selfReportedStress?: number;
  selfReportedAnxiety?: number;
  recoverySignal: "limited-data" | "below-usual" | "typical" | "above-usual";
  observations: string[];
  modelSource: SleepAnalysisSource;
  generatedAt: number;
}

export interface DailyWellnessCheckIn {
  date: string;
  stressLevel?: 1 | 2 | 3 | 4 | 5;
  anxietyLevel?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  updatedAt: number;
}
