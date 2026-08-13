import { SleepEvidence, SleepSession, SleepSessionSource } from '../types';

const MINUTE = 60_000;
const PENDING_SYNC_RETRY_MS = 15 * MINUTE;
const FAILED_SYNC_RETRY_MS = 6 * 60 * MINUTE;

const uniqueEvidence = (items: SleepEvidence[]): SleepEvidence[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.kind}:${item.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function createSleepSession(input: {
  id?: string;
  startTime: number;
  endTime: number;
  confidence: number;
  source: SleepSessionSource;
  evidence?: SleepEvidence[];
  userConfirmed: boolean;
  now?: number;
}): SleepSession {
  if (
    !Number.isFinite(input.startTime) ||
    !Number.isFinite(input.endTime) ||
    input.endTime <= input.startTime
  ) {
    throw new Error('A sleep session must have a finite end after its start.');
  }

  const now = input.now ?? Date.now();
  return {
    id: input.id ?? `sleep-${input.startTime}-${input.endTime}`,
    startTime: input.startTime,
    endTime: input.endTime,
    confidence: Math.round(Math.min(100, Math.max(0, input.confidence))),
    source: input.source,
    evidence: uniqueEvidence(input.evidence ?? []),
    userConfirmed: input.userConfirmed,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    createdAt: now,
    updatedAt: now,
    healthSyncState: 'not-requested',
  };
}

function duplicateRatio(left: SleepSession, right: SleepSession): number {
  if (left.endTime === undefined || right.endTime === undefined) return 0;
  const intersection = Math.max(
    0,
    Math.min(left.endTime, right.endTime) -
      Math.max(left.startTime, right.startTime),
  );
  const shorter = Math.min(
    left.endTime - left.startTime,
    right.endTime - right.startTime,
  );
  return shorter > 0 ? intersection / shorter : 0;
}

/**
 * Inserts a completed session while preventing lifecycle replays from creating
 * duplicate nights. Slight overlaps remain separate so a night and a nearby nap
 * are never silently merged.
 */
export function upsertSleepSession(
  sessions: SleepSession[],
  incoming: SleepSession,
): SleepSession[] {
  if (incoming.endTime === undefined || incoming.endTime <= incoming.startTime) {
    throw new Error('Only completed sleep sessions can be persisted.');
  }
  const incomingEnd = incoming.endTime;

  const duplicateIndex = sessions.findIndex(session => {
    if (session.id === incoming.id) return true;
    const boundariesMatch =
      session.endTime !== undefined &&
      Math.abs(session.startTime - incoming.startTime) <= 5 * MINUTE &&
      Math.abs(session.endTime - incomingEnd) <= 5 * MINUTE;
    return boundariesMatch || duplicateRatio(session, incoming) >= 0.9;
  });

  const next = [...sessions];
  if (duplicateIndex >= 0) {
    const existing = next[duplicateIndex];
    const boundariesUnchanged =
      existing.startTime === incoming.startTime &&
      existing.endTime === incoming.endTime;
    next[duplicateIndex] = {
      ...incoming,
      id: existing.id,
      source: existing.source === incoming.source ? incoming.source : 'combined',
      evidence: uniqueEvidence([...existing.evidence, ...incoming.evidence]),
      createdAt: Math.min(existing.createdAt, incoming.createdAt),
      healthSyncState: boundariesUnchanged
        ? existing.healthSyncState
        : incoming.healthSyncState,
      healthSyncError: boundariesUnchanged
        ? existing.healthSyncError
        : incoming.healthSyncError,
    };
  } else {
    next.push(incoming);
  }

  return next.sort((left, right) => left.startTime - right.startTime);
}

export function updateSessionSyncState(
  sessions: SleepSession[],
  id: string,
  state: SleepSession['healthSyncState'],
  error?: string,
): SleepSession[] {
  return sessions.map(session =>
    session.id === id
      ? {
          ...session,
          healthSyncState: state,
          healthSyncError: error,
          updatedAt: Date.now(),
        }
      : session,
  );
}

/** Avoids retrying unavailable Health permissions on every foreground event. */
export function shouldAttemptHealthSync(
  session: SleepSession,
  now = Date.now(),
): boolean {
  if (
    session.endTime === undefined ||
    !session.userConfirmed ||
    session.healthSyncState === 'synced'
  ) {
    return false;
  }
  if (session.healthSyncState === 'pending') {
    const lastAttempt = Number.isFinite(session.updatedAt) ? session.updatedAt : 0;
    return now - lastAttempt >= PENDING_SYNC_RETRY_MS;
  }
  if (session.healthSyncState === 'failed') {
    const lastAttempt = Number.isFinite(session.updatedAt) ? session.updatedAt : 0;
    return now - lastAttempt >= FAILED_SYNC_RETRY_MS;
  }
  return true;
}
