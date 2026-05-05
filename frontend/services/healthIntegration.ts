// frontend/services/healthIntegration.ts
// ROADMAP 4.0 E9 — read HealthKit (iOS) + Health Connect (Android).
//
// v1 is READ-ONLY. The HealthIntegration model has a `mealWriteEnabled`
// flag that's gated behind a separate Apple-review checkpoint; we never
// flip it from the client.
//
// Loaded via dynamic require so:
//   - tests can mock the native module without it being installed
//   - dev/web bundles don't fail when @kingstinct/react-native-healthkit
//     or react-native-health-connect aren't compiled in.

import { Platform } from 'react-native';

export type HealthPlatform = 'healthkit' | 'healthconnect';

export interface HealthSnapshot {
  weightKg: number | null;
  bodyFatPercent: number | null;
  activeKilocalories: number | null;
  sleepMinutes: number | null;
}

export interface HealthPermissions {
  weight: boolean;
  bodyComposition: boolean;
  activity: boolean;
  sleep: boolean;
}

interface HealthKitModule {
  isHealthDataAvailable: () => Promise<boolean>;
  requestAuthorization: (perms: string[]) => Promise<boolean>;
  getMostRecentQuantitySample: (type: string) => Promise<{ value: number; unit: string } | null>;
  queryQuantitySamples: (type: string, opts?: { from?: Date; to?: Date }) => Promise<Array<{ value: number; startDate: string; endDate: string }>>;
}

interface HealthConnectModule {
  initialize: () => Promise<boolean>;
  requestPermission: (perms: { accessType: 'read'; recordType: string }[]) => Promise<unknown>;
  readRecords: (recordType: string, opts: unknown) => Promise<{ records: Array<Record<string, unknown>> }>;
}

function loadHealthKit(): HealthKitModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@kingstinct/react-native-healthkit');
  } catch {
    return null;
  }
}

function loadHealthConnect(): HealthConnectModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-health-connect');
  } catch {
    return null;
  }
}

export function detectPlatform(): HealthPlatform | null {
  if (Platform.OS === 'ios') return 'healthkit';
  if (Platform.OS === 'android') return 'healthconnect';
  return null;
}

export async function isHealthAvailable(): Promise<boolean> {
  const platform = detectPlatform();
  if (!platform) return false;
  if (platform === 'healthkit') {
    const m = loadHealthKit();
    if (!m) return false;
    try {
      return await m.isHealthDataAvailable();
    } catch {
      return false;
    }
  }
  const m = loadHealthConnect();
  if (!m) return false;
  try {
    return await m.initialize();
  } catch {
    return false;
  }
}

export async function requestPermissions(perms: HealthPermissions): Promise<boolean> {
  const platform = detectPlatform();
  if (!platform) return false;
  if (platform === 'healthkit') {
    const m = loadHealthKit();
    if (!m) return false;
    const types: string[] = [];
    if (perms.weight) types.push('HKQuantityTypeIdentifierBodyMass');
    if (perms.bodyComposition) types.push('HKQuantityTypeIdentifierBodyFatPercentage');
    if (perms.activity) types.push('HKQuantityTypeIdentifierActiveEnergyBurned');
    if (perms.sleep) types.push('HKCategoryTypeIdentifierSleepAnalysis');
    return m.requestAuthorization(types);
  }
  const m = loadHealthConnect();
  if (!m) return false;
  const list: { accessType: 'read'; recordType: string }[] = [];
  if (perms.weight) list.push({ accessType: 'read', recordType: 'Weight' });
  if (perms.bodyComposition) list.push({ accessType: 'read', recordType: 'BodyFat' });
  if (perms.activity) list.push({ accessType: 'read', recordType: 'ActiveCaloriesBurned' });
  if (perms.sleep) list.push({ accessType: 'read', recordType: 'SleepSession' });
  await m.requestPermission(list);
  return true;
}

export async function readSnapshot(): Promise<HealthSnapshot> {
  const empty: HealthSnapshot = {
    weightKg: null,
    bodyFatPercent: null,
    activeKilocalories: null,
    sleepMinutes: null,
  };

  const platform = detectPlatform();
  if (!platform) return empty;

  if (platform === 'healthkit') {
    const m = loadHealthKit();
    if (!m) return empty;
    try {
      const [weight, bodyFat, activity] = await Promise.all([
        m.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass').catch(() => null),
        m.getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage').catch(() => null),
        m.getMostRecentQuantitySample('HKQuantityTypeIdentifierActiveEnergyBurned').catch(() => null),
      ]);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sleepSamples = await m
        .queryQuantitySamples('HKCategoryTypeIdentifierSleepAnalysis', { from: yesterday, to: new Date() })
        .catch(() => [] as Array<{ value: number; startDate: string; endDate: string }>);
      const sleepMs = sleepSamples.reduce((sum, s) => {
        const start = Date.parse(s.startDate);
        const end = Date.parse(s.endDate);
        return Number.isFinite(start) && Number.isFinite(end) && end > start ? sum + (end - start) : sum;
      }, 0);
      return {
        weightKg: weight?.value ?? null,
        bodyFatPercent: bodyFat?.value ?? null,
        activeKilocalories: activity?.value ?? null,
        sleepMinutes: sleepMs ? Math.round(sleepMs / 60_000) : null,
      };
    } catch {
      return empty;
    }
  }

  // Android — Health Connect
  const m = loadHealthConnect();
  if (!m) return empty;
  try {
    const [weightRes, bodyFatRes, activityRes, sleepRes] = await Promise.all([
      m.readRecords('Weight', { timeRangeFilter: { operator: 'before', endTime: new Date().toISOString() } }).catch(() => ({ records: [] })),
      m.readRecords('BodyFat', { timeRangeFilter: { operator: 'before', endTime: new Date().toISOString() } }).catch(() => ({ records: [] })),
      m.readRecords('ActiveCaloriesBurned', { timeRangeFilter: { operator: 'between', startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), endTime: new Date().toISOString() } }).catch(() => ({ records: [] })),
      m.readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), endTime: new Date().toISOString() } }).catch(() => ({ records: [] })),
    ]);

    const latestWeight = weightRes.records.at(-1) as { weight?: { inKilograms?: number } } | undefined;
    const latestBodyFat = bodyFatRes.records.at(-1) as { percentage?: number } | undefined;
    const totalActiveKcal = activityRes.records.reduce((sum, r: any) => sum + (r?.energy?.inKilocalories ?? 0), 0);
    const totalSleepMs = sleepRes.records.reduce((sum, r: any) => {
      const start = Date.parse(r?.startTime ?? '');
      const end = Date.parse(r?.endTime ?? '');
      return Number.isFinite(start) && Number.isFinite(end) && end > start ? sum + (end - start) : sum;
    }, 0);

    return {
      weightKg: latestWeight?.weight?.inKilograms ?? null,
      bodyFatPercent: latestBodyFat?.percentage ?? null,
      activeKilocalories: totalActiveKcal || null,
      sleepMinutes: totalSleepMs ? Math.round(totalSleepMs / 60_000) : null,
    };
  } catch {
    return empty;
  }
}
