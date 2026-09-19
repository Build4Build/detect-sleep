import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { SleepProvider, useSleep } from '../context/SleepContext';
import { SleepStatus } from '../types';

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

const settle = (ms = 50) => act(async () => {
  await new Promise(resolve => setTimeout(resolve, ms));
});

// The App Review notes describe this as the quickest way to see the app work.
describe('manual sleep flow', () => {
  it('saves a sleep period from "I\'m Asleep" followed by "I\'m Awake"', async () => {
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

    await act(async () => {
      await sleep.manuallySetStatus(SleepStatus.ASLEEP);
    });
    expect(sleep.currentStatus).toBe(SleepStatus.ASLEEP);
    await settle(20);

    await act(async () => {
      await sleep.manuallySetStatus(SleepStatus.AWAKE);
    });
    await settle();

    expect(sleep.currentStatus).toBe(SleepStatus.AWAKE);
    expect(sleep.sleepSessions).toHaveLength(1);
    expect(sleep.sleepSessions[0].source).toBe('manual');
    expect(sleep.dailySummaries).toHaveLength(1);

    await act(async () => renderer.unmount());
  });
});
