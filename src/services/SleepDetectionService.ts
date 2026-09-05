import { format } from 'date-fns';
import { ActivityRecord, DailySleepSummary, SleepSession, SleepStatus } from '../types';

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

  return {
    // The threshold validates the candidate; it is not part of the sleep interval.
    // A user must confirm this heuristic before it is recorded.
    startTime: inactiveStart,
    endTime: resumedAt,
    confidence: 50,
  };
}

/** Builds sessions from transitions and assigns each one to its wake-up date. */
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
    const date = format(record.timestamp, 'yyyy-MM-dd');
    const summary = summaries.get(date) ?? { date, totalSleepMinutes: 0, sleepPeriods: [] };
    summary.sleepPeriods.push({
      start: asleepRecord.timestamp,
      end: record.timestamp,
      confidence,
    });
    summary.totalSleepMinutes += (record.timestamp - asleepRecord.timestamp) / 60_000;
    summaries.set(date, summary);
    asleepRecord = null;
  }

  return [...summaries.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Builds daily totals from durable completed sessions, assigning nights to wake date. */
export function buildDailySleepSummariesFromSessions(
  sessions: SleepSession[],
): DailySleepSummary[] {
  const summaries = new Map<string, DailySleepSummary>();
  const completed = sessions.filter(session =>
    Number.isFinite(session.startTime) &&
    Number.isFinite(session.endTime) &&
    (session.endTime ?? 0) > session.startTime,
  );

  for (const session of completed) {
    const endTime = session.endTime!;
    const date = format(endTime, 'yyyy-MM-dd');
    const summary = summaries.get(date) ?? { date, totalSleepMinutes: 0, sleepPeriods: [] };
    summary.sleepPeriods.push({
      start: session.startTime,
      end: endTime,
      confidence: session.confidence,
    });
    summary.totalSleepMinutes += (endTime - session.startTime) / 60_000;
    summaries.set(date, summary);
  }

  return [...summaries.values()].sort((left, right) => left.date.localeCompare(right.date));
}
