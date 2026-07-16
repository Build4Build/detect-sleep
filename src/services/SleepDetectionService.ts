import { format } from 'date-fns';
import { ActivityRecord, DailySleepSummary, SleepStatus } from '../types';

export interface DetectedSleepSession {
  startTime: number;
  endTime: number;
  confidence: number;
}

export function detectSleepSession(
  inactiveStart: number,
  resumedAt: number,
  thresholdMinutes: number,
): DetectedSleepSession | null {
  const thresholdMs = Math.max(1, thresholdMinutes) * 60_000;
  const duration = resumedAt - inactiveStart;
  if (!Number.isFinite(duration) || duration <= thresholdMs) return null;

  const detectedDurationMinutes = (duration - thresholdMs) / 60_000;
  return {
    startTime: inactiveStart + thresholdMs,
    endTime: resumedAt,
    confidence: Math.round(Math.min(100, 80 + detectedDurationMinutes / 12)),
  };
}

function nextLocalMidnight(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
}

/** Builds summaries from transitions globally, then splits overnight sleep by day. */
export function buildDailySleepSummaries(records: ActivityRecord[]): DailySleepSummary[] {
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  const summaries = new Map<string, DailySleepSummary>();
  let asleepRecord: ActivityRecord | null = null;

  for (const record of sorted) {
    if (record.status === SleepStatus.ASLEEP) {
      asleepRecord = record;
      continue;
    }

    if (!asleepRecord || record.timestamp <= asleepRecord.timestamp) continue;

    const confidence = (asleepRecord.confidence + record.confidence) / 2;
    let cursor = asleepRecord.timestamp;
    while (cursor < record.timestamp) {
      const segmentEnd = Math.min(record.timestamp, nextLocalMidnight(cursor));
      const date = format(cursor, 'yyyy-MM-dd');
      const summary = summaries.get(date) ?? { date, totalSleepMinutes: 0, sleepPeriods: [] };
      summary.sleepPeriods.push({ start: cursor, end: segmentEnd, confidence });
      summary.totalSleepMinutes += ((segmentEnd - cursor) / 60_000) * (confidence / 100);
      summaries.set(date, summary);
      cursor = segmentEnd;
    }
    asleepRecord = null;
  }

  return [...summaries.values()].sort((a, b) => a.date.localeCompare(b.date));
}
