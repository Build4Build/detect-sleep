import {
  createSleepSession,
  isValidCandidateWindow,
  shouldAttemptHealthSync,
  updateSessionSyncState,
  upsertSleepSession,
} from '../SleepSessionService';

describe('SleepSessionService', () => {
  it('accepts only reviewable candidate windows', () => {
    const hour = 60 * 60_000;
    const now = 100 * hour;
    expect(isValidCandidateWindow(now - 9 * hour, now - hour, now)).toBe(true);
    expect(isValidCandidateWindow(now - hour, now - hour, now)).toBe(false);
    expect(isValidCandidateWindow(now - 21 * hour, now - 30 * 60_000, now)).toBe(false);
    // Nudging the wake time past the present must not be saved.
    expect(isValidCandidateWindow(now - 8 * hour, now + 15 * 60_000, now)).toBe(false);
    expect(isValidCandidateWindow(Number.NaN, now, now)).toBe(false);
  });

  it('rejects invalid completed sessions', () => {
    expect(() =>
      createSleepSession({
        startTime: 200,
        endTime: 100,
        confidence: 50,
        source: 'app-inactivity',
        userConfirmed: true,
      }),
    ).toThrow();
  });

  it('deduplicates lifecycle replays without combining nearby sessions', () => {
    const first = createSleepSession({
      startTime: 1_000_000,
      endTime: 29_800_000,
      confidence: 55,
      source: 'app-inactivity',
      userConfirmed: true,
      now: 1,
    });
    const replay = createSleepSession({
      startTime: first.startTime + 60_000,
      endTime: first.endTime! - 60_000,
      confidence: 60,
      source: 'apple-watch',
      userConfirmed: true,
      now: 2,
    });
    const nap = createSleepSession({
      startTime: first.endTime! + 10 * 60_000,
      endTime: first.endTime! + 50 * 60_000,
      confidence: 70,
      source: 'manual',
      userConfirmed: true,
      now: 3,
    });

    const result = upsertSleepSession(upsertSleepSession([first], replay), nap);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(first.id);
    expect(result[0].source).toBe('combined');
  });

  it('preserves a successful sync when the same boundaries are replayed', () => {
    const first = {
      ...createSleepSession({
        startTime: 1,
        endTime: 10_000,
        confidence: 80,
        source: 'manual',
        userConfirmed: true,
      }),
      healthSyncState: 'synced' as const,
    };
    const replay = createSleepSession({
      startTime: 1,
      endTime: 10_000,
      confidence: 80,
      source: 'manual',
      userConfirmed: true,
    });

    expect(upsertSleepSession([first], replay)[0].healthSyncState).toBe('synced');
  });

  it('records retryable Health sync failures', () => {
    const session = createSleepSession({
      startTime: 1,
      endTime: 10_000,
      confidence: 80,
      source: 'manual',
      userConfirmed: true,
    });
    const [updated] = updateSessionSyncState([session], session.id, 'failed', 'Denied');
    expect(updated.healthSyncState).toBe('failed');
    expect(updated.healthSyncError).toBe('Denied');
  });
});

describe('shouldAttemptHealthSync', () => {
  const now = 10 * 60 * 60_000;
  const session = createSleepSession({
    startTime: 1_000,
    endTime: 2_000,
    confidence: 90,
    source: 'manual',
    userConfirmed: true,
    now,
  });

  it('backs off failed and in-flight writes while retrying stale ones', () => {
    const failed = {
      ...updateSessionSyncState([session], session.id, 'failed', 'Denied')[0],
      updatedAt: now,
    };
    expect(shouldAttemptHealthSync(failed, now + 60_000)).toBe(false);
    expect(shouldAttemptHealthSync(failed, now + 6 * 60 * 60_000)).toBe(true);

    const pending = { ...session, healthSyncState: 'pending' as const, updatedAt: now };
    expect(shouldAttemptHealthSync(pending, now + 14 * 60_000)).toBe(false);
    expect(shouldAttemptHealthSync(pending, now + 15 * 60_000)).toBe(true);
  });
});
