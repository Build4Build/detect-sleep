import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

import { WatchSleepSnapshot } from "../types";

const WATCH_SNAPSHOTS_KEY = "sleep-detector-watch-snapshots-v1";

interface WatchNativeModule {
  consumeWatchSnapshots(): Promise<string[]>;
  getWatchState(): { supported: boolean; paired: boolean; installed: boolean };
}

const nativeModule =
  Platform.OS === "ios"
    ? requireOptionalNativeModule<WatchNativeModule>("SleepIntelligence")
    : null;

function isOptionalFinite(value: unknown): value is number | undefined {
  return (
    value === undefined || (typeof value === "number" && Number.isFinite(value))
  );
}

export function parseWatchSleepSnapshot(
  payload: string,
): WatchSleepSnapshot | null {
  try {
    const value = JSON.parse(payload) as Partial<WatchSleepSnapshot>;
    if (
      value.schemaVersion !== 1 ||
      typeof value.id !== "string" ||
      typeof value.generatedAt !== "number" ||
      typeof value.sleepStart !== "number" ||
      typeof value.sleepEnd !== "number" ||
      typeof value.totalSleepMinutes !== "number" ||
      typeof value.awakeMinutes !== "number" ||
      typeof value.coreMinutes !== "number" ||
      typeof value.deepMinutes !== "number" ||
      typeof value.remMinutes !== "number" ||
      typeof value.unspecifiedMinutes !== "number" ||
      value.source !== "apple-watch-healthkit" ||
      !isOptionalFinite(value.restingHeartRate) ||
      !isOptionalFinite(value.heartRateVariabilityMs) ||
      !isOptionalFinite(value.respiratoryRate) ||
      !isOptionalFinite(value.wristTemperatureCelsius) ||
      !Number.isFinite(value.generatedAt) ||
      !Number.isFinite(value.sleepStart) ||
      !Number.isFinite(value.sleepEnd) ||
      value.sleepEnd <= value.sleepStart ||
      value.totalSleepMinutes < 0
    ) {
      return null;
    }
    return value as WatchSleepSnapshot;
  } catch {
    return null;
  }
}

export function watchSleepOverlapRatio(
  snapshots: WatchSleepSnapshot[],
  startTime: number,
  endTime: number,
): number {
  if (endTime <= startTime) return 0;
  return snapshots.reduce((best, snapshot) => {
    const overlap = Math.max(
      0,
      Math.min(endTime, snapshot.sleepEnd) -
        Math.max(startTime, snapshot.sleepStart),
    );
    const snapshotSpan = snapshot.sleepEnd - snapshot.sleepStart;
    if (snapshotSpan <= 0) return best;

    // A snapshot's outer boundaries can contain awake gaps. Weighting the
    // boundary overlap by actual asleep time prevents a fragmented night from
    // being treated as continuous, independently verified sleep.
    const sleepEfficiency = Math.min(
      1,
      Math.max(0, snapshot.totalSleepMinutes * 60_000) / snapshotSpan,
    );
    const ratio = (overlap / (endTime - startTime)) * sleepEfficiency;
    return Math.max(best, ratio);
  }, 0);
}

/** Selects the Watch night with the most actual asleep time in the app-away window. */
export function strongestWatchSleepWindow(
  snapshots: WatchSleepSnapshot[],
  startTime: number,
  endTime: number,
): { startTime: number; endTime: number; asleepMinutes: number } | null {
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return null;
  }
  const ranked = snapshots.flatMap(snapshot => {
    const clippedStart = Math.max(startTime, snapshot.sleepStart);
    const clippedEnd = Math.min(endTime, snapshot.sleepEnd);
    const snapshotSpan = snapshot.sleepEnd - snapshot.sleepStart;
    if (clippedEnd <= clippedStart || snapshotSpan <= 0) return [];
    const overlapFraction = (clippedEnd - clippedStart) / snapshotSpan;
    const asleepMinutes = Math.min(
      (clippedEnd - clippedStart) / 60_000,
      snapshot.totalSleepMinutes * overlapFraction,
    );
    return [{ startTime: clippedStart, endTime: clippedEnd, asleepMinutes }];
  }).sort((left, right) => right.asleepMinutes - left.asleepMinutes);

  return ranked[0] && ranked[0].asleepMinutes >= 30 ? ranked[0] : null;
}

export const WatchDataService = {
  getState(): { supported: boolean; paired: boolean; installed: boolean } {
    return (
      nativeModule?.getWatchState() ?? {
        supported: false,
        paired: false,
        installed: false,
      }
    );
  },

  async consumePendingSnapshots(): Promise<WatchSleepSnapshot[]> {
    const stored = await AsyncStorage.getItem(WATCH_SNAPSHOTS_KEY);
    let existing: WatchSleepSnapshot[] = [];
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          existing = parsed
            .map((value) => parseWatchSleepSnapshot(JSON.stringify(value)))
            .filter((value): value is WatchSleepSnapshot => Boolean(value));
        }
      } catch {
        existing = [];
      }
    }
    const payloads = nativeModule
      ? await nativeModule.consumeWatchSnapshots()
      : [];
    const incoming = payloads
      .map(parseWatchSleepSnapshot)
      .filter((value): value is WatchSleepSnapshot => Boolean(value));
    const byId = new Map(existing.map((snapshot) => [snapshot.id, snapshot]));
    incoming.forEach((snapshot) => byId.set(snapshot.id, snapshot));
    const merged = [...byId.values()]
      .sort((left, right) => left.sleepStart - right.sleepStart)
      .slice(-60);
    await AsyncStorage.setItem(WATCH_SNAPSHOTS_KEY, JSON.stringify(merged));
    return merged;
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(WATCH_SNAPSHOTS_KEY);
    if (nativeModule) await nativeModule.consumeWatchSnapshots();
  },
};
