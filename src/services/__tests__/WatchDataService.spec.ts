jest.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: jest.fn(() => null),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import {
  parseWatchSleepSnapshot,
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
});
