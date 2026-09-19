import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { SleepProvider, useSleep } from '../context/SleepContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@kingstinct/react-native-healthkit', () => ({
  AuthorizationStatus: { sharingAuthorized: 2 },
  CategoryValueSleepAnalysis: { asleepUnspecified: 1, awake: 2, asleepCore: 3, asleepDeep: 4, asleepREM: 5 },
  authorizationStatusFor: jest.fn(() => 0),
  isHealthDataAvailable: jest.fn(() => false),
  queryCategorySamples: jest.fn(async () => []),
  queryQuantitySamples: jest.fn(async () => []),
  requestAuthorization: jest.fn(async () => true),
  saveCategorySample: jest.fn(async () => true),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
}));

const SESSIONS_KEY = 'sleep-tracker-sessions-v1';
const RECORDS_KEY = 'sleep-tracker-activity-records';

const settle = () => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 50));
});

describe('Clear All Data', () => {
  it('erases stored and in-memory data so later saves cannot restore it', async () => {
    const start = Date.now() - 9 * 60 * 60_000;
    const end = Date.now() - 60 * 60_000;
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify([{
      id: `sleep-${start}-${end}`,
      startTime: start,
      endTime: end,
      confidence: 80,
      source: 'manual',
      evidence: [],
      userConfirmed: true,
      timezone: 'UTC',
      createdAt: end,
      updatedAt: end,
      healthSyncState: 'not-requested',
    }]));
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify([
      { id: 'a', timestamp: start, status: 'asleep', confidence: 80 },
      { id: 'b', timestamp: end, status: 'awake', confidence: 100 },
    ]));

    let sleep!: ReturnType<typeof useSleep>;
    const Probe = () => {
      sleep = useSleep();
      return null;
    };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<SleepProvider><Probe /></SleepProvider>);
    });
    await settle();
    expect(sleep.sleepSessions).toHaveLength(1);

    await act(async () => {
      await sleep.clearAllData();
    });
    await settle();
    expect(sleep.sleepSessions).toHaveLength(0);
    expect(sleep.dailySummaries).toHaveLength(0);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();

    // The old bug: any later save wrote the erased history straight back.
    await act(async () => {
      sleep.updateSettings({ inactivityThreshold: 45 });
      await sleep.saveWellnessCheckIn({ stressLevel: 2, anxietyLevel: 2 });
    });
    await settle();
    expect(await AsyncStorage.getItem(SESSIONS_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(RECORDS_KEY)).toBeNull();
    expect(sleep.sleepSessions).toHaveLength(0);

    // Unmount so the provider's midnight timer cannot keep Jest alive.
    await act(async () => renderer.unmount());
  });
});
