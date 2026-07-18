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
  const bestOverlap = snapshots.reduce((best, snapshot) => {
    const overlap = Math.max(
      0,
      Math.min(endTime, snapshot.sleepEnd) -
        Math.max(startTime, snapshot.sleepStart),
    );
    return Math.max(best, overlap);
  }, 0);
  return Math.min(1, bestOverlap / (endTime - startTime));
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
