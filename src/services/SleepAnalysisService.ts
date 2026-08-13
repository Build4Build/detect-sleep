import {
  LocalModelAssessment,
  SleepAnalysisDecision,
  SleepAnalysisFeatures,
  SleepEvidence,
  SleepSession,
} from "../types";
import { SleepEntry } from "../types/SleepEntry";
import { LocalSleepIntelligence } from "./local/LocalSleepIntelligence";

const MINUTE = 60_000;
const MAX_CANDIDATE_MINUTES = 20 * 60;
const MAX_SLEEP_STAGE_GAP = 90 * MINUTE;

export interface SleepAnalysisInput {
  startTime: number;
  endTime: number;
  historicalSessions?: SleepSession[];
  healthKitOverlapRatio?: number;
  watchLowMotionRatio?: number;
  watchHeartRateDropPercent?: number;
  allowLocalModel?: boolean;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const minuteOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
};

const circularDistance = (left: number, right: number): number => {
  const distance = Math.abs(left - right) % 1440;
  return Math.min(distance, 1440 - distance);
};

const circularMean = (values: number[]): number | undefined => {
  if (values.length === 0) return undefined;
  const radians = values.map((value) => (value / 1440) * Math.PI * 2);
  const x =
    radians.reduce((total, value) => total + Math.cos(value), 0) /
    values.length;
  const y =
    radians.reduce((total, value) => total + Math.sin(value), 0) /
    values.length;
  const angle = Math.atan2(y, x);
  return Math.round(
    (((angle < 0 ? angle + Math.PI * 2 : angle) / (Math.PI * 2)) * 1440) % 1440,
  );
};

export interface VerifiedSleepWindow {
  startTime: number;
  endTime: number;
  asleepMinutes: number;
}

/**
 * Finds the strongest contiguous Health sleep block inside an app-away window.
 * Stage samples are commonly split into REM/core/deep intervals, so short awake
 * gaps are kept in the same night while unrelated naps remain separate.
 */
export function strongestHealthSleepWindow(
  entries: SleepEntry[],
  startTime: number,
  endTime: number,
): VerifiedSleepWindow | null {
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return null;
  }
  const intervals = entries
    .filter(entry =>
      !entry.isAwake &&
      Number.isFinite(entry.startTime) &&
      Number.isFinite(entry.endTime),
    )
    .map(entry => ({
      startTime: Math.max(startTime, entry.startTime),
      endTime: Math.min(endTime, entry.endTime),
    }))
    .filter(interval => interval.endTime > interval.startTime)
    .sort((left, right) => left.startTime - right.startTime);

  const clusters: Array<{ startTime: number; endTime: number; intervals: typeof intervals }> = [];
  for (const interval of intervals) {
    const current = clusters[clusters.length - 1];
    if (!current || interval.startTime - current.endTime > MAX_SLEEP_STAGE_GAP) {
      clusters.push({
        startTime: interval.startTime,
        endTime: interval.endTime,
        intervals: [interval],
      });
    } else {
      current.endTime = Math.max(current.endTime, interval.endTime);
      current.intervals.push(interval);
    }
  }

  const ranked = clusters.map(cluster => {
    let asleepMilliseconds = 0;
    let coveredUntil = cluster.startTime;
    for (const interval of cluster.intervals) {
      const uncoveredStart = Math.max(coveredUntil, interval.startTime);
      if (interval.endTime > uncoveredStart) {
        asleepMilliseconds += interval.endTime - uncoveredStart;
        coveredUntil = interval.endTime;
      }
    }
    return { ...cluster, asleepMilliseconds };
  }).sort((left, right) => right.asleepMilliseconds - left.asleepMilliseconds);

  const strongest = ranked[0];
  if (!strongest || strongest.asleepMilliseconds < 30 * MINUTE) return null;
  return {
    startTime: strongest.startTime,
    endTime: strongest.endTime,
    asleepMinutes: strongest.asleepMilliseconds / MINUTE,
  };
}

/** Calculates unique asleep-stage coverage without double-counting sources. */
export function healthSleepOverlapRatio(
  entries: SleepEntry[],
  startTime: number,
  endTime: number,
): number {
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return 0;
  }
  const intervals = entries
    .filter(
      (entry) =>
        !entry.isAwake &&
        Number.isFinite(entry.startTime) &&
        Number.isFinite(entry.endTime),
    )
    .map((entry) => [
      Math.max(startTime, entry.startTime),
      Math.min(endTime, entry.endTime),
    ] as const)
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0]);

  let covered = 0;
  let currentStart: number | undefined;
  let currentEnd: number | undefined;
  for (const [intervalStart, intervalEnd] of intervals) {
    if (currentStart === undefined || currentEnd === undefined) {
      currentStart = intervalStart;
      currentEnd = intervalEnd;
    } else if (intervalStart <= currentEnd) {
      currentEnd = Math.max(currentEnd, intervalEnd);
    } else {
      covered += currentEnd - currentStart;
      currentStart = intervalStart;
      currentEnd = intervalEnd;
    }
  }
  if (currentStart !== undefined && currentEnd !== undefined) {
    covered += currentEnd - currentStart;
  }
  return clamp(covered / (endTime - startTime), 0, 1);
}

export function buildSleepAnalysisFeatures(
  input: SleepAnalysisInput,
): SleepAnalysisFeatures {
  const history = (input.historicalSessions ?? []).filter(
    (session) =>
      Number.isFinite(session.startTime) &&
      Number.isFinite(session.endTime) &&
      (session.endTime ?? 0) > session.startTime,
  );
  const recentHistory = history
    .sort((left, right) => (right.endTime ?? 0) - (left.endTime ?? 0))
    .slice(0, 28);

  return {
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: (input.endTime - input.startTime) / MINUTE,
    startMinuteOfDay: minuteOfDay(input.startTime),
    endMinuteOfDay: minuteOfDay(input.endTime),
    historicalSessionCount: recentHistory.length,
    historicalBedtimeMinute: circularMean(
      recentHistory.map((session) => minuteOfDay(session.startTime)),
    ),
    historicalWakeMinute: circularMean(
      recentHistory.map((session) => minuteOfDay(session.endTime!)),
    ),
    healthKitOverlapRatio: input.healthKitOverlapRatio,
    watchLowMotionRatio: input.watchLowMotionRatio,
    watchHeartRateDropPercent: input.watchHeartRateDropPercent,
  };
}

export function deterministicSleepAnalysis(
  features: SleepAnalysisFeatures,
): SleepAnalysisDecision {
  if (
    !Number.isFinite(features.startTime) ||
    !Number.isFinite(features.endTime) ||
    features.endTime <= features.startTime ||
    !Number.isFinite(features.durationMinutes)
  ) {
    throw new Error(
      "Sleep analysis requires a finite interval with an end after its start.",
    );
  }

  const evidence: SleepEvidence[] = [
    {
      kind: "app-away",
      weight: 15,
      detail: "Sleep Detector was not in the foreground during this interval.",
    },
  ];
  let score = 15;

  if (features.durationMinutes >= 90 && features.durationMinutes <= 720) {
    score += 15;
  } else if (features.durationMinutes >= 20 && features.durationMinutes < 90) {
    score += 5;
  } else if (features.durationMinutes > MAX_CANDIDATE_MINUTES) {
    score -= 20;
  }

  const bedtimeLike =
    features.startMinuteOfDay >= 18 * 60 || features.startMinuteOfDay <= 4 * 60;
  const wakeLike =
    features.endMinuteOfDay >= 4 * 60 && features.endMinuteOfDay <= 13 * 60;
  if (bedtimeLike) score += 10;
  if (wakeLike) score += 10;

  if (
    features.historicalSessionCount >= 3 &&
    features.historicalBedtimeMinute !== undefined &&
    features.historicalWakeMinute !== undefined
  ) {
    const bedtimeDistance = circularDistance(
      features.startMinuteOfDay,
      features.historicalBedtimeMinute,
    );
    const wakeDistance = circularDistance(
      features.endMinuteOfDay,
      features.historicalWakeMinute,
    );
    const scheduleWeight = Math.round(
      clamp(20 - (bedtimeDistance + wakeDistance) / 24, 0, 20),
    );
    if (scheduleWeight > 0) {
      score += scheduleWeight;
      evidence.push({
        kind: "historical-schedule",
        weight: scheduleWeight,
        detail:
          "The interval is close to the user’s recent confirmed sleep schedule.",
      });
    }
  }

  const healthOverlap = clamp(features.healthKitOverlapRatio ?? 0, 0, 1);
  if (healthOverlap >= 0.25) {
    const weight = Math.round(35 * healthOverlap);
    score += weight;
    evidence.push({
      kind: "healthkit-sleep",
      weight,
      detail: "Apple Health contains overlapping asleep-stage evidence.",
    });
  }

  const lowMotion = clamp(features.watchLowMotionRatio ?? 0, 0, 1);
  if (lowMotion >= 0.5) {
    const weight = Math.round(20 * lowMotion);
    score += weight;
    evidence.push({
      kind: "watch-low-motion",
      weight,
      detail: "Apple Watch observed sustained low wrist motion.",
    });
  }

  const heartRateDrop = clamp(features.watchHeartRateDropPercent ?? 0, 0, 40);
  if (heartRateDrop >= 5) {
    const weight = Math.round(clamp(heartRateDrop / 2, 3, 12));
    score += weight;
    evidence.push({
      kind: "watch-heart-rate",
      weight,
      detail: "Apple Watch observed a heart-rate change consistent with rest.",
    });
  }

  const hasStrongEvidence = healthOverlap >= 0.5 || lowMotion >= 0.7;
  const confidence = Math.round(clamp(score, 5, hasStrongEvidence ? 95 : 55));
  const classification =
    confidence >= 75
      ? "likely-sleep"
      : confidence < 25
        ? "unlikely-sleep"
        : "uncertain";

  return {
    startTime: features.startTime,
    endTime: features.endTime,
    confidence,
    classification,
    source: "deterministic",
    explanation: hasStrongEvidence
      ? "The estimate combines app inactivity with independent health or Watch evidence."
      : "This estimate is based on app inactivity and schedule context, so its times require review.",
    evidence,
    requiresConfirmation: !hasStrongEvidence,
  };
}

export function applyLocalModelAssessment(
  deterministic: SleepAnalysisDecision,
  assessment: LocalModelAssessment,
): SleepAnalysisDecision {
  const hasStrongEvidence = deterministic.evidence.some(
    (item) =>
      item.kind === "healthkit-sleep" || item.kind === "watch-low-motion",
  );
  const maximumConfidence = hasStrongEvidence ? 95 : 60;
  const confidence = Math.round(
    clamp(
      deterministic.confidence * 0.7 +
        clamp(assessment.confidence, 0, 100) * 0.3,
      5,
      maximumConfidence,
    ),
  );
  const maxBoundaryAdjustment = hasStrongEvidence ? 90 : 30;
  const startOffset = clamp(
    assessment.suggestedStartOffsetMinutes,
    -maxBoundaryAdjustment,
    maxBoundaryAdjustment,
  );
  const endOffset = clamp(
    assessment.suggestedEndOffsetMinutes,
    -maxBoundaryAdjustment,
    maxBoundaryAdjustment,
  );
  const proposedStart = deterministic.startTime + startOffset * MINUTE;
  const proposedEnd = deterministic.endTime + endOffset * MINUTE;

  return {
    ...deterministic,
    startTime:
      proposedEnd > proposedStart ? proposedStart : deterministic.startTime,
    endTime: proposedEnd > proposedStart ? proposedEnd : deterministic.endTime,
    confidence,
    classification:
      confidence >= 75
        ? "likely-sleep"
        : confidence < 25
          ? "unlikely-sleep"
          : "uncertain",
    source: "apple-foundation-model",
    explanation: assessment.explanation.trim() || deterministic.explanation,
    // Model reasoning is advisory and never becomes independent evidence.
    requiresConfirmation: deterministic.requiresConfirmation,
  };
}

export async function analyzeSleepCandidate(
  input: SleepAnalysisInput,
): Promise<SleepAnalysisDecision> {
  const features = buildSleepAnalysisFeatures(input);
  const deterministic = deterministicSleepAnalysis(features);
  if (input.allowLocalModel === false) return deterministic;

  const availability = await LocalSleepIntelligence.getAvailability();
  if (!availability.available) return deterministic;

  try {
    const assessment = await LocalSleepIntelligence.analyze(features);
    return applyLocalModelAssessment(deterministic, assessment);
  } catch (error) {
    console.warn(
      "On-device sleep analysis was unavailable; using deterministic analysis.",
      error,
    );
    return deterministic;
  }
}
