import { ActivityRecord, SleepStatus } from '../../types';
import { buildDailySleepSummaries, detectSleepSession } from '../SleepDetectionService';

const record = (status: SleepStatus, timestamp: number, confidence = 100): ActivityRecord => ({
  id: `${status}-${timestamp}`,
  status,
  timestamp,
  confidence,
});

describe('detectSleepSession', () => {
  it('does not create sleep before the inactivity threshold', () => {
    const start = Date.now();
    expect(detectSleepSession(start, start + 29 * 60_000, 30)).toBeNull();
  });

  it('requires inactivity to exceed the configured threshold', () => {
    const start = Date.now();
    expect(detectSleepSession(start, start + 30 * 60_000, 30)).toBeNull();
    expect(detectSleepSession(start, start + 30 * 60_000 + 1, 30)).not.toBeNull();
  });

  it('creates a completed session when use resumes after prolonged inactivity', () => {
    const inactiveAt = new Date(2026, 6, 15, 22, 0).getTime();
    const resumedAt = new Date(2026, 6, 16, 6, 0).getTime();
    const session = detectSleepSession(inactiveAt, resumedAt, 30);

    expect(session).not.toBeNull();
    expect(session?.startTime).toBe(inactiveAt);
    expect(session?.endTime).toBe(resumedAt);
    expect(session?.confidence).toBe(50);
  });
});

describe('buildDailySleepSummaries', () => {
  it('pairs transitions and splits sleep that crosses midnight', () => {
    const asleepAt = new Date(2026, 6, 15, 23, 30).getTime();
    const awakeAt = new Date(2026, 6, 16, 1, 30).getTime();
    const summaries = buildDailySleepSummaries([
      record(SleepStatus.AWAKE, asleepAt - 60_000),
      record(SleepStatus.ASLEEP, asleepAt, 90),
      record(SleepStatus.AWAKE, awakeAt, 100),
    ]);

    expect(summaries).toHaveLength(2);
    expect(summaries[0].sleepPeriods[0]).toMatchObject({ start: asleepAt });
    expect(summaries[1].sleepPeriods[0]).toMatchObject({ end: awakeAt });
    expect(summaries[0].totalSleepMinutes).toBeCloseTo(30);
    expect(summaries[1].totalSleepMinutes).toBeCloseTo(90);
  });

  it('ignores an unfinished sleep record until a wake transition exists', () => {
    expect(buildDailySleepSummaries([
      record(SleepStatus.ASLEEP, Date.now()),
    ])).toEqual([]);
  });

  it('reports elapsed duration independently from confidence', () => {
    const asleepAt = new Date(2026, 6, 15, 1, 0).getTime();
    const awakeAt = asleepAt + 2 * 60 * 60_000;
    const [summary] = buildDailySleepSummaries([
      record(SleepStatus.ASLEEP, asleepAt, 20),
      record(SleepStatus.AWAKE, awakeAt, 40),
    ]);

    expect(summary.totalSleepMinutes).toBe(120);
    expect(summary.sleepPeriods[0].confidence).toBe(30);
  });
});
