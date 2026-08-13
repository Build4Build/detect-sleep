jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { BackgroundActivityService } from '../BackgroundActivityService';

describe('BackgroundActivityService', () => {
  const service = BackgroundActivityService.getInstance();

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('preserves the first background boundary and completes it at resume', async () => {
    await service.recordAppInactive(1_000);
    await service.recordAppInactive(2_000);

    await expect(service.consumeInactivePeriod(61_000)).resolves.toEqual({
      startTime: 1_000,
      endTime: 61_000,
      durationMinutes: 1,
    });
    await expect(service.consumeInactivePeriod(62_000)).resolves.toBeNull();
  });

  it('rejects malformed and future boundaries after a clock change', async () => {
    await AsyncStorage.setItem('sleep-detector-inactive-since', 'not-a-time');
    await expect(service.consumeInactivePeriod(10_000)).resolves.toBeNull();

    await service.recordAppInactive(20_000);
    await expect(service.consumeInactivePeriod(10_000)).resolves.toBeNull();
  });

  it('returns the completed period even when cleanup storage fails', async () => {
    await service.recordAppInactive(1_000);
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('disk busy'));

    await expect(service.consumeInactivePeriod(61_000)).resolves.toMatchObject({
      startTime: 1_000,
      endTime: 61_000,
    });
  });
});
