jest.mock("../local/LocalSleepIntelligence", () => ({
  LocalSleepIntelligence: {
    getAvailability: jest.fn(async () => ({
      available: false,
      reason: "native-module-unavailable",
    })),
    analyze: jest.fn(),
  },
}));

import {
  applyLocalModelAssessment,
  buildSleepAnalysisFeatures,
  deterministicSleepAnalysis,
  healthSleepOverlapRatio,
  strongestHealthSleepWindow,
} from "../SleepAnalysisService";

const localTimestamp = (
  year: number,
  month: number,
  day: number,
  hour: number,
): number => new Date(year, month - 1, day, hour, 0, 0, 0).getTime();

describe("SleepAnalysisService", () => {
  it("keeps app-only inactivity uncertain and capped at low confidence", () => {
    const features = buildSleepAnalysisFeatures({
      startTime: localTimestamp(2026, 7, 1, 23),
      endTime: localTimestamp(2026, 7, 2, 7),
    });

    const result = deterministicSleepAnalysis(features);

    expect(result.classification).toBe("uncertain");
    expect(result.confidence).toBeLessThanOrEqual(55);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.evidence.map((item) => item.kind)).toEqual(["app-away"]);
  });

  it("allows independent HealthKit overlap to produce a strong decision", () => {
    const features = buildSleepAnalysisFeatures({
      startTime: localTimestamp(2026, 7, 1, 23),
      endTime: localTimestamp(2026, 7, 2, 7),
      healthKitOverlapRatio: 1,
    });

    const result = deterministicSleepAnalysis(features);

    expect(result.classification).toBe("likely-sleep");
    expect(result.confidence).toBeGreaterThanOrEqual(75);
    expect(result.requiresConfirmation).toBe(false);
    expect(
      result.evidence.some((item) => item.kind === "healthkit-sleep"),
    ).toBe(true);
  });

  it("never lets model opinion turn weak evidence into high confidence", () => {
    const deterministic = deterministicSleepAnalysis(
      buildSleepAnalysisFeatures({
        startTime: localTimestamp(2026, 7, 1, 23),
        endTime: localTimestamp(2026, 7, 2, 7),
      }),
    );

    const result = applyLocalModelAssessment(deterministic, {
      classification: "likely-sleep",
      confidence: 100,
      suggestedStartOffsetMinutes: -300,
      suggestedEndOffsetMinutes: 300,
      explanation: "The schedule resembles sleep.",
    });

    expect(result.confidence).toBeLessThanOrEqual(60);
    expect(result.classification).toBe("uncertain");
    expect(result.startTime).toBe(deterministic.startTime - 30 * 60_000);
    expect(result.endTime).toBe(deterministic.endTime + 30 * 60_000);
    expect(result.requiresConfirmation).toBe(true);
  });

  it("rejects invalid intervals before any model is consulted", () => {
    const features = buildSleepAnalysisFeatures({
      startTime: 1000,
      endTime: 1000,
    });
    expect(() => deterministicSleepAnalysis(features)).toThrow(
      /end after its start/,
    );
  });

  it("merges overlapping Health sleep stages without double-counting", () => {
    const entries = [
      { id: "core", startTime: 1_000, endTime: 5_000, source: "Watch", confidence: 95, isAwake: false },
      { id: "deep", startTime: 3_000, endTime: 7_000, source: "Watch", confidence: 95, isAwake: false },
      { id: "awake", startTime: 7_000, endTime: 9_000, source: "Watch", confidence: 95, isAwake: true },
    ];

    expect(healthSleepOverlapRatio(entries, 1_000, 9_000)).toBeCloseTo(0.75);
  });

  it("uses the strongest Health sleep block to refine broad app inactivity", () => {
    const hour = 60 * 60_000;
    const entries = [
      { id: "nap", startTime: 2 * hour, endTime: 2.5 * hour, source: "Watch", confidence: 95, isAwake: false },
      { id: "core", startTime: 5 * hour, endTime: 8 * hour, source: "Watch", confidence: 95, isAwake: false },
      { id: "deep", startTime: 8.25 * hour, endTime: 10 * hour, source: "Watch", confidence: 95, isAwake: false },
      { id: "awake", startTime: 8 * hour, endTime: 8.25 * hour, source: "Watch", confidence: 95, isAwake: true },
    ];

    expect(strongestHealthSleepWindow(entries, 0, 12 * hour)).toEqual({
      startTime: 5 * hour,
      endTime: 10 * hour,
      asleepMinutes: 285,
    });
  });

  it("does not refine a candidate from only a brief Health sample", () => {
    const entries = [
      { id: "brief", startTime: 0, endTime: 29 * 60_000, source: "Watch", confidence: 95, isAwake: false },
    ];
    expect(strongestHealthSleepWindow(entries, 0, 8 * 60 * 60_000)).toBeNull();
  });
});
