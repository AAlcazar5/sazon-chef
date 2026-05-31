// Tier Q — Beta build flag.
//
// Sourced from EAS profile via EXPO_PUBLIC_BUILD_CHANNEL (eas.json). Falls
// back to `development` in Metro / Expo Go so devs see the badge locally.
// Production builds set the channel to `production` and IS_BETA is false.

import Constants from 'expo-constants';

export type BuildChannel = 'development' | 'preview' | 'production';

function readChannel(): BuildChannel {
  const fromEnv = (process.env.EXPO_PUBLIC_BUILD_CHANNEL || '').toLowerCase();
  if (fromEnv === 'production' || fromEnv === 'preview' || fromEnv === 'development') {
    return fromEnv;
  }
  const updates = (Constants.expoConfig as { updates?: { channel?: string } } | null)?.updates;
  const fromExpo = (updates?.channel || '').toLowerCase();
  if (fromExpo === 'production' || fromExpo === 'preview' || fromExpo === 'development') {
    return fromExpo;
  }
  return 'development';
}

export const BUILD_CHANNEL: BuildChannel = readChannel();

export const IS_BETA = BUILD_CHANNEL !== 'production';
export const IS_PRODUCTION = BUILD_CHANNEL === 'production';

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';
export const BUILD_NUMBER: string =
  (Constants.expoConfig?.ios?.buildNumber as string | undefined) ??
  (Constants.expoConfig?.android?.versionCode as number | undefined)?.toString() ??
  '0';
