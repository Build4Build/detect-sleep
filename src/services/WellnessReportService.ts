import {
  DailySleepSummary,
  DailyWellnessCheckIn,
  DailyWellnessReport,
  HealthRecoverySnapshot,
  SleepStageMinutes,
} from "../types";
import { SleepEntry } from "../types/SleepEntry";

export interface WellnessReportInput {
  date: string;
  summary?: DailySleepSummary;
  healthSleepEntries?: SleepEntry[];
  recovery?: HealthRecoverySnapshot;
  checkIn?: DailyWellnessCheckIn;
  previousReports?: DailyWellnessReport[];
  now?: number;
}

/** "6 hr 58 min" reads naturally; "418 minutes" makes the reader do arithmetic. */
const formatSleepLength = (minutes: number): string => {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (hours === 0) return `${remainder} min`;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const average = (values: Array<number | undefined>): number | undefined => {
  const finite = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  if (finite.length === 0) return undefined;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
};

const minuteOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
};

const circularDistance = (left: number, right: number): number => {
  const direct = Math.abs(left - right) % 1440;
  return Math.min(direct, 1440 - direct);
};

const circularMean = (
  values: Array<number | undefined>,
): number | undefined => {
  const finite = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  if (finite.length === 0) return undefined;
  const angles = finite.map((value) => (value / 1440) * Math.PI * 2);
  const x =
    angles.reduce((sum, value) => sum + Math.cos(value), 0) / angles.length;
  const y =
    angles.reduce((sum, value) => sum + Math.sin(value), 0) / angles.length;
  const angle = Math.atan2(y, x);
  return (
    (((angle < 0 ? angle + Math.PI * 2 : angle) / (Math.PI * 2)) * 1440) % 1440
  );
};

function mergedMinutes(entries: SleepEntry[]): number {
  const sorted = entries
    .filter((entry) => !entry.isAwake && entry.endTime > entry.startTime)
    .map((entry) => [entry.startTime, entry.endTime] as [number, number])
    .sort((left, right) => left[0] - right[0]);
  const first = sorted[0];
  if (!first) return 0;
  let [start, end] = first;
  let total = 0;
  for (const interval of sorted.slice(1)) {
    if (interval[0] <= end) {
      end = Math.max(end, interval[1]);
    } else {
      total += end - start;
      [start, end] = interval;
    }
  }
  return (total + end - start) / 60_000;
}

function stageMinutes(entries: SleepEntry[]): SleepStageMinutes | undefined {
  if (!entries.some((entry) => entry.stage)) return undefined;
  const result: SleepStageMinutes = {
    awake: 0,
    core: 0,
    deep: 0,
    rem: 0,
    unspecified: 0,
  };
  const staged = entries.filter(
    (entry): entry is SleepEntry & { stage: NonNullable<SleepEntry['stage']> } =>
      Boolean(entry.stage) && entry.endTime > entry.startTime,
  );
  const hasDetailedStages = staged.some(entry =>
    entry.stage === 'core' || entry.stage === 'deep' || entry.stage === 'rem',
  );
  const usable = hasDetailedStages
    ? staged.filter(entry => entry.stage !== 'unspecified')
    : staged;
  const boundaries = [...new Set(
    usable.flatMap(entry => [entry.startTime, entry.endTime]),
  )].sort((left, right) => left - right);
  const stagePriority: SleepEntry['stage'][] = [
    'awake',
    'deep',
    'rem',
    'core',
    'unspecified',
  ];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    if (end <= start) continue;
    const activeStages = new Set(
      usable
        .filter(entry => entry.startTime < end && entry.endTime > start)
        .map(entry => entry.stage),
    );
    const selected = stagePriority.find(stage => stage && activeStages.has(stage));
    if (selected) result[selected] += (end - start) / 60_000;
  }
  return result;
}

function pearson(left: number[], right: number[]): number | undefined {
  if (left.length !== right.length || left.length < 5) return undefined;
  const leftMean = average(left)!;
  const rightMean = average(right)!;
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    covariance += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }
  const denominator = Math.sqrt(leftVariance * rightVariance);
  return denominator > 0 ? covariance / denominator : undefined;
}

function correlationObservation(
  reports: DailyWellnessReport[],
  metric:
    | "heartRateVariabilityMs"
    | "selfReportedStress"
    | "selfReportedAnxiety",
  label: string,
): string | undefined {
  const pairs = reports
    .filter(
      (report) =>
        report.sleepMinutes > 0 &&
        typeof report[metric] === "number" &&
        Number.isFinite(report[metric]),
    )
    .map(
      (report) => [report.sleepMinutes, report[metric]!] as [number, number],
    );
  const value = pearson(
    pairs.map((pair) => pair[0]),
    pairs.map((pair) => pair[1]),
  );
  if (value === undefined || Math.abs(value) < 0.35) return undefined;
  const direction = value > 0 ? "higher" : "lower";
  return `Across ${pairs.length} recorded days, longer sleep coincided with ${direction} ${label} (r=${value.toFixed(2)}). This is correlation, not causation.`;
}

export function buildDailyWellnessReport(
  input: WellnessReportInput,
): DailyWellnessReport {
  const healthEntries = input.healthSleepEntries ?? [];
  const asleepEntries = healthEntries.filter((entry) => !entry.isAwake);
  const healthMinutes = mergedMinutes(asleepEntries);
  const localMinutes = input.summary?.totalSleepMinutes ?? 0;
  const sleepMinutes = healthMinutes > 0 ? healthMinutes : localMinutes;
  const starts =
    asleepEntries.length > 0
      ? asleepEntries.map((entry) => entry.startTime)
      : (input.summary?.sleepPeriods.map((period) => period.start) ?? []);
  const ends =
    asleepEntries.length > 0
      ? asleepEntries.map((entry) => entry.endTime)
      : (input.summary?.sleepPeriods.map((period) => period.end) ?? []);
  const sleepStart = starts.length > 0 ? Math.min(...starts) : undefined;
  const sleepEnd = ends.length > 0 ? Math.max(...ends) : undefined;
  const stages = stageMinutes(healthEntries);
  const previous = (input.previousReports ?? []).slice(-28);

  const bedtimeBaseline = circularMean(
    previous.map((report) =>
      report.sleepStart ? minuteOfDay(report.sleepStart) : undefined,
    ),
  );
  const wakeBaseline = circularMean(
    previous.map((report) =>
      report.sleepEnd ? minuteOfDay(report.sleepEnd) : undefined,
    ),
  );
  const timingDeviation =
    sleepStart !== undefined &&
    sleepEnd !== undefined &&
    bedtimeBaseline !== undefined &&
    wakeBaseline !== undefined
      ? circularDistance(minuteOfDay(sleepStart), bedtimeBaseline) +
        circularDistance(minuteOfDay(sleepEnd), wakeBaseline)
      : undefined;
  const sleepConsistencyScore = Math.round(
    timingDeviation === undefined
      ? 50
      : clamp(100 - timingDeviation / 3.6, 0, 100),
  );
  const timeInWindow =
    sleepStart !== undefined && sleepEnd !== undefined
      ? (sleepEnd - sleepStart) / 60_000
      : undefined;
  const continuity =
    timeInWindow && timeInWindow > 0
      ? Math.round(clamp((sleepMinutes / timeInWindow) * 100, 0, 100))
      : undefined;

  const hrvBaseline = average(
    previous.map((report) => report.heartRateVariabilityMs),
  );
  const heartRateBaseline = average(
    previous.map((report) => report.restingHeartRate),
  );
  const hrv = input.recovery?.heartRateVariabilityMs;
  const heartRate = input.recovery?.restingHeartRate;
  let recoverySignal: DailyWellnessReport["recoverySignal"] = "limited-data";
  if (previous.length >= 3 && (hrv !== undefined || heartRate !== undefined)) {
    const below =
      (hrv !== undefined &&
        hrvBaseline !== undefined &&
        hrv < hrvBaseline * 0.85) ||
      (heartRate !== undefined &&
        heartRateBaseline !== undefined &&
        heartRate > heartRateBaseline * 1.1);
    const above =
      (hrv !== undefined &&
        hrvBaseline !== undefined &&
        hrv > hrvBaseline * 1.15) ||
      (heartRate !== undefined &&
        heartRateBaseline !== undefined &&
        heartRate < heartRateBaseline * 0.9);
    recoverySignal = below ? "below-usual" : above ? "above-usual" : "typical";
  }

  const observations: string[] = [];
  if (sleepMinutes > 0) {
    observations.push(
      sleepMinutes >= 420
        ? `Recorded sleep was ${formatSleepLength(sleepMinutes)}.`
        : `Recorded sleep was ${formatSleepLength(sleepMinutes)}, below the general seven-hour reference used for this wellness summary.`,
    );
  }
  if (recoverySignal === "below-usual") {
    observations.push(
      "One or more recovery signals were below your recent baseline; many factors can affect these measurements.",
    );
  }

  const reportsForCorrelation: DailyWellnessReport[] = [
    ...previous,
    {
      date: input.date,
      sleepStart,
      sleepEnd,
      sleepMinutes,
      sleepConsistencyScore,
      sleepContinuityScore: continuity,
      sleepStages: stages,
      restingHeartRate: heartRate,
      heartRateVariabilityMs: hrv,
      respiratoryRate: input.recovery?.respiratoryRate,
      wristTemperatureCelsius: input.recovery?.wristTemperatureCelsius,
      selfReportedStress: input.checkIn?.stressLevel,
      selfReportedAnxiety: input.checkIn?.anxietyLevel,
      recoverySignal,
      observations: [],
      modelSource: "deterministic",
      generatedAt: input.now ?? Date.now(),
    },
  ];
  [
    correlationObservation(
      reportsForCorrelation,
      "heartRateVariabilityMs",
      "HRV",
    ),
    correlationObservation(
      reportsForCorrelation,
      "selfReportedStress",
      "self-reported stress",
    ),
    correlationObservation(
      reportsForCorrelation,
      "selfReportedAnxiety",
      "self-reported anxiety",
    ),
  ].forEach((observation) => {
    if (observation) observations.push(observation);
  });

  return {
    date: input.date,
    sleepStart,
    sleepEnd,
    sleepMinutes,
    sleepConsistencyScore,
    sleepContinuityScore: continuity,
    sleepStages: stages,
    restingHeartRate: heartRate,
    heartRateVariabilityMs: hrv,
    respiratoryRate: input.recovery?.respiratoryRate,
    wristTemperatureCelsius: input.recovery?.wristTemperatureCelsius,
    selfReportedStress: input.checkIn?.stressLevel,
    selfReportedAnxiety: input.checkIn?.anxietyLevel,
    recoverySignal,
    observations,
    modelSource: "deterministic",
    generatedAt: input.now ?? Date.now(),
  };
}
