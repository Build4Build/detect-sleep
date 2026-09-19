import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';

import { SleepProvider } from '../context/SleepContext';
import { ThemeProvider } from '../context/ThemeContext';
import TodayScreen from '../screens/TodayScreen';
import HistoryScreen from '../screens/HistoryScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ExportScreen from '../screens/ExportScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import SleepDetailsScreen from '../screens/SleepDetailsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@kingstinct/react-native-healthkit', () => ({
  AuthorizationStatus: { sharingAuthorized: 2 },
  CategoryValueSleepAnalysis: {
    inBed: 0,
    asleepUnspecified: 1,
    awake: 2,
    asleepCore: 3,
    asleepDeep: 4,
    asleepREM: 5,
  },
  authorizationStatusFor: jest.fn(() => 0),
  isHealthDataAvailable: jest.fn(() => false),
  queryCategorySamples: jest.fn(async () => []),
  queryQuantitySamples: jest.fn(async () => []),
  requestAuthorization: jest.fn(async () => true),
  saveCategorySample: jest.fn(async () => true),
}));

// Icon fonts are irrelevant here and pull in native asset loading.
jest.mock('@expo/vector-icons', () => {
  const { Text: MockText } = require('react-native');
  return { Ionicons: MockText, MaterialIcons: MockText, MaterialCommunityIcons: MockText };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', TIME_INTERVAL: 'timeInterval' },
}));

const navigation = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };

const textOf = (root: ReactTestInstance): string =>
  root
    .findAll(node => typeof node.type === 'string' && (node.type as string) === 'Text')
    .map(node => node.children.filter(child => typeof child === 'string').join(''))
    .join(' ');

async function renderScreen(element: React.ReactElement) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <ThemeProvider>
        <SleepProvider>
          <NavigationContainer>{element}</NavigationContainer>
        </SleepProvider>
      </ThemeProvider>,
    );
  });
  // Let storage loading and the launch queue settle.
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
  });
  return renderer;
}

describe('screen smoke tests', () => {
  const screens: [string, () => React.ReactElement, string][] = [
    ['Today', () => <TodayScreen />, 'Current Status'],
    ['History', () => <HistoryScreen />, ''],
    ['Stats', () => <StatsScreen />, ''],
    ['Settings', () => <SettingsScreen {...({ navigation } as any)} />, ''],
    ['Export', () => <ExportScreen {...({ navigation } as any)} />, ''],
    ['NotificationSettings', () => <NotificationSettingsScreen {...({ navigation } as any)} />, ''],
    [
      'SleepDetails',
      () => <SleepDetailsScreen {...({ navigation, route: { params: { date: '2026-01-01' } } } as any)} />,
      '',
    ],
  ];

  it.each(screens)('%s renders with the real providers', async (_name, build, expected) => {
    const renderer = await renderScreen(build());
    const text = textOf(renderer.root);
    expect(text.length).toBeGreaterThan(0);
    if (expected) expect(text).toContain(expected);
    await act(async () => renderer.unmount());
  });
});
