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
});
