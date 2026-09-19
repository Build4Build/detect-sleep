jest.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: jest.fn(() => null),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  parseWatchSleepSnapshot,
  strongestWatchSleepWindow,
  WatchDataService,
  watchSleepOverlapRatio,
} from "../WatchDataService";

const snapshot = {
  schemaVersion: 1,
  id: "watch-1",
  generatedAt: 2_000,
  sleepStart: 1_000,
  sleepEnd: 5_000,
  totalSleepMinutes: 4 / 60,
  awakeMinutes: 0,
  coreMinutes: 4 / 60,
  deepMinutes: 0,
  remMinutes: 0,
  unspecifiedMinutes: 0,
  source: "apple-watch-healthkit",
} as const;

describe("WatchDataService", () => {
  it("accepts a valid versioned Watch snapshot", () => {
    expect(parseWatchSleepSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it("rejects invalid or reversed Watch snapshots", () => {
    expect(parseWatchSleepSnapshot("not-json")).toBeNull();
    expect(
      parseWatchSleepSnapshot(
        JSON.stringify({ ...snapshot, sleepEnd: snapshot.sleepStart }),
      ),
    ).toBeNull();
  });

  it("calculates overlap against the complete candidate interval", () => {
    expect(watchSleepOverlapRatio([snapshot], 0, 5_000)).toBeCloseTo(0.8);
    expect(watchSleepOverlapRatio([snapshot], 6_000, 7_000)).toBe(0);
  });

  it("discounts awake gaps inside a Watch sleep episode", () => {
    const fragmented = {
      ...snapshot,
      sleepStart: 0,
      sleepEnd: 8 * 60 * 60_000,
      totalSleepMinutes: 4 * 60,
    };

    expect(
      watchSleepOverlapRatio([fragmented], 0, 8 * 60 * 60_000),
    ).toBeCloseTo(0.5);
  });

  it("selects the Watch night with the most asleep time", () => {
    const hour = 60 * 60_000;
    const short = {
      ...snapshot,
      id: "short",
      sleepStart: hour,
      sleepEnd: 2 * hour,
      totalSleepMinutes: 45,
    };
    const overnight = {
      ...snapshot,
      id: "overnight",
      sleepStart: 4 * hour,
      sleepEnd: 12 * hour,
      totalSleepMinutes: 420,
    };

    expect(strongestWatchSleepWindow([short, overnight], 0, 14 * hour)).toEqual({
      startTime: 4 * hour,
      endTime: 12 * hour,
      asleepMinutes: 420,
    });
  });
  it("keeps one snapshot per night when the Watch resends it under new ids", async () => {
    // The Watch app assigns a fresh random id on every refresh.
    await AsyncStorage.setItem(
      "sleep-detector-watch-snapshots-v1",
      JSON.stringify([
        { ...snapshot, id: "first-refresh", generatedAt: 2_000, remMinutes: 0 },
        { ...snapshot, id: "second-refresh", generatedAt: 3_000, remMinutes: 1 / 60 },
        { ...snapshot, id: "other-night", sleepStart: 10_000, sleepEnd: 15_000, generatedAt: 16_000 },
      ]),
    );

    const merged = await WatchDataService.consumePendingSnapshots();

    expect(merged.map((item) => item.id)).toEqual(["second-refresh", "other-night"]);
  });
});
