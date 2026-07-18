import { buildDailyWellnessReport } from "../WellnessReportService";
import { DailyWellnessReport } from "../../types";

describe("WellnessReportService", () => {
  it("uses HealthKit asleep stages without counting in-bed or awake time", () => {
    const report = buildDailyWellnessReport({
      date: "2026-07-18",
      healthSleepEntries: [
        {
          id: "core",
          startTime: 0,
          endTime: 60 * 60_000,
          isAwake: false,
          confidence: 95,
          source: "Watch",
          stage: "core",
        },
        {
          id: "awake",
          startTime: 60 * 60_000,
          endTime: 90 * 60_000,
          isAwake: true,
          confidence: 95,
          source: "Watch",
          stage: "awake",
        },
        {
          id: "deep",
          startTime: 90 * 60_000,
          endTime: 150 * 60_000,
          isAwake: false,
          confidence: 95,
          source: "Watch",
          stage: "deep",
        },
      ],
      now: 123,
    });

    expect(report.sleepMinutes).toBe(120);
    expect(report.sleepStages?.awake).toBe(30);
    expect(report.sleepStages?.core).toBe(60);
    expect(report.sleepStages?.deep).toBe(60);
    expect(report.generatedAt).toBe(123);
  });

  it("labels recovery as limited data until a personal baseline exists", () => {
    const report = buildDailyWellnessReport({
      date: "2026-07-18",
      recovery: { startTime: 0, endTime: 1, heartRateVariabilityMs: 30 },
    });
    expect(report.recoverySignal).toBe("limited-data");
  });

  it("does not double-count a broad app sample over detailed Watch stages", () => {
    const base = {
      startTime: 0,
      endTime: 60 * 60_000,
      isAwake: false,
      confidence: 95,
    };
    const report = buildDailyWellnessReport({
      date: "2026-07-18",
      healthSleepEntries: [
        { ...base, id: "app", source: "Sleep Detector", stage: "unspecified" },
        { ...base, id: "watch", source: "Watch", stage: "core" },
      ],
    });

    expect(report.sleepMinutes).toBe(60);
    expect(report.sleepStages?.core).toBe(60);
    expect(report.sleepStages?.unspecified).toBe(0);
  });

  it("states correlation without claiming causation", () => {
    const previousReports: DailyWellnessReport[] = [1, 2, 3, 4].map(
      (value) => ({
        date: `2026-07-0${value}`,
        sleepMinutes: value * 60,
        sleepConsistencyScore: 80,
        selfReportedStress: 6 - value,
        recoverySignal: "typical",
        observations: [],
        modelSource: "deterministic",
        generatedAt: value,
      }),
    );
    const report = buildDailyWellnessReport({
      date: "2026-07-05",
      summary: {
        date: "2026-07-05",
        totalSleepMinutes: 300,
        sleepPeriods: [{ start: 0, end: 300 * 60_000, confidence: 80 }],
      },
      checkIn: { date: "2026-07-05", stressLevel: 1, updatedAt: 1 },
      previousReports,
    });

    expect(
      report.observations.some((item) => item.includes("self-reported stress")),
    ).toBe(true);
    expect(
      report.observations.some((item) => item.includes("not causation")),
    ).toBe(true);
  });
});
