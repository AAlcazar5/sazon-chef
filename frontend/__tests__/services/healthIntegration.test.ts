// frontend/__tests__/services/healthIntegration.test.ts
// ROADMAP 4.0 E9 — read-mode health integration with platform branching.

const mockHealthKitIsAvailable = jest.fn();
const mockHealthKitRequestAuth = jest.fn();
const mockHealthKitGetMostRecent = jest.fn();
const mockHealthKitQuerySamples = jest.fn();

jest.mock(
  '@kingstinct/react-native-healthkit',
  () => ({
    isHealthDataAvailable: () => mockHealthKitIsAvailable(),
    requestAuthorization: (perms: string[]) => mockHealthKitRequestAuth(perms),
    getMostRecentQuantitySample: (type: string) => mockHealthKitGetMostRecent(type),
    queryQuantitySamples: (type: string, opts: unknown) => mockHealthKitQuerySamples(type, opts),
  }),
  { virtual: true },
);

const mockHCInitialize = jest.fn();
const mockHCRequestPerm = jest.fn();
const mockHCRead = jest.fn();

jest.mock(
  'react-native-health-connect',
  () => ({
    initialize: () => mockHCInitialize(),
    requestPermission: (perms: unknown) => mockHCRequestPerm(perms),
    readRecords: (type: string, opts: unknown) => mockHCRead(type, opts),
  }),
  { virtual: true },
);

import { Platform } from 'react-native';
import {
  detectPlatform,
  isHealthAvailable,
  requestPermissions,
  readSnapshot,
} from '../../services/healthIntegration';

function setPlatform(os: 'ios' | 'android' | 'web') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('detectPlatform', () => {
  it('returns healthkit on iOS', () => {
    setPlatform('ios');
    expect(detectPlatform()).toBe('healthkit');
  });
  it('returns healthconnect on Android', () => {
    setPlatform('android');
    expect(detectPlatform()).toBe('healthconnect');
  });
  it('returns null on web', () => {
    setPlatform('web');
    expect(detectPlatform()).toBeNull();
  });
});

describe('isHealthAvailable', () => {
  it('iOS — delegates to HealthKit isHealthDataAvailable', async () => {
    setPlatform('ios');
    mockHealthKitIsAvailable.mockResolvedValue(true);
    expect(await isHealthAvailable()).toBe(true);
    expect(mockHealthKitIsAvailable).toHaveBeenCalled();
  });

  it('Android — delegates to Health Connect initialize', async () => {
    setPlatform('android');
    mockHCInitialize.mockResolvedValue(true);
    expect(await isHealthAvailable()).toBe(true);
    expect(mockHCInitialize).toHaveBeenCalled();
  });

  it('returns false on web', async () => {
    setPlatform('web');
    expect(await isHealthAvailable()).toBe(false);
  });
});

describe('requestPermissions', () => {
  it('iOS — translates flags into HealthKit identifiers', async () => {
    setPlatform('ios');
    mockHealthKitRequestAuth.mockResolvedValue(true);
    await requestPermissions({
      weight: true,
      bodyComposition: true,
      activity: true,
      sleep: true,
    });
    expect(mockHealthKitRequestAuth).toHaveBeenCalledWith([
      'HKQuantityTypeIdentifierBodyMass',
      'HKQuantityTypeIdentifierBodyFatPercentage',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'HKCategoryTypeIdentifierSleepAnalysis',
    ]);
  });

  it('Android — translates flags into Health Connect record types (read access)', async () => {
    setPlatform('android');
    mockHCRequestPerm.mockResolvedValue(undefined);
    await requestPermissions({ weight: true, bodyComposition: false, activity: true, sleep: false });
    expect(mockHCRequestPerm).toHaveBeenCalledWith([
      { accessType: 'read', recordType: 'Weight' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    ]);
  });
});

describe('readSnapshot — iOS HealthKit', () => {
  beforeEach(() => setPlatform('ios'));

  it('pulls weight + body fat + activity + sleep duration', async () => {
    mockHealthKitGetMostRecent.mockImplementation((type: string) => {
      if (type === 'HKQuantityTypeIdentifierBodyMass') return Promise.resolve({ value: 72.5, unit: 'kg' });
      if (type === 'HKQuantityTypeIdentifierBodyFatPercentage') return Promise.resolve({ value: 18.5, unit: '%' });
      if (type === 'HKQuantityTypeIdentifierActiveEnergyBurned') return Promise.resolve({ value: 480, unit: 'kcal' });
      return Promise.resolve(null);
    });
    mockHealthKitQuerySamples.mockResolvedValue([
      { value: 1, startDate: '2026-05-04T22:00:00Z', endDate: '2026-05-05T05:30:00Z' },
    ]);

    const snap = await readSnapshot();
    expect(snap.weightKg).toBe(72.5);
    expect(snap.bodyFatPercent).toBe(18.5);
    expect(snap.activeKilocalories).toBe(480);
    expect(snap.sleepMinutes).toBe(7 * 60 + 30);
  });

  it('gracefully degrades when permissions are denied (returns null fields)', async () => {
    mockHealthKitGetMostRecent.mockRejectedValue(new Error('permission denied'));
    mockHealthKitQuerySamples.mockRejectedValue(new Error('permission denied'));
    const snap = await readSnapshot();
    expect(snap).toEqual({
      weightKg: null,
      bodyFatPercent: null,
      activeKilocalories: null,
      sleepMinutes: null,
    });
  });
});

describe('readSnapshot — Android Health Connect', () => {
  beforeEach(() => setPlatform('android'));

  it('reads weight + body fat + active calories + sleep session totals', async () => {
    mockHCRead.mockImplementation((type: string) => {
      if (type === 'Weight') return Promise.resolve({ records: [{ weight: { inKilograms: 72.0 } }] });
      if (type === 'BodyFat') return Promise.resolve({ records: [{ percentage: 19.2 }] });
      if (type === 'ActiveCaloriesBurned') {
        return Promise.resolve({
          records: [
            { energy: { inKilocalories: 200 } },
            { energy: { inKilocalories: 280 } },
          ],
        });
      }
      if (type === 'SleepSession') {
        return Promise.resolve({
          records: [
            { startTime: '2026-05-04T22:30:00Z', endTime: '2026-05-05T05:30:00Z' },
          ],
        });
      }
      return Promise.resolve({ records: [] });
    });

    const snap = await readSnapshot();
    expect(snap.weightKg).toBe(72.0);
    expect(snap.bodyFatPercent).toBe(19.2);
    expect(snap.activeKilocalories).toBe(480);
    expect(snap.sleepMinutes).toBe(7 * 60);
  });
});
