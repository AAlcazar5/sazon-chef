// backend/src/modules/minVersion/minVersionController.ts
// ROADMAP 4.0 U3 — Force-upgrade gate.
//
// Returns the minimum supported app version per platform. Read from env
// (not DB) so the gate works even if Prisma / DB is down. Public endpoint:
// auth is intentionally omitted so the client can resolve the floor before
// any token round-trip.

import type { Request, Response } from 'express';

const DEFAULT_IOS = '1.0.0';
const DEFAULT_ANDROID = '1.0.0';
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

interface MinVersionPayload {
  ios: string;
  android: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function readPlatform(envKey: string, fallback: string): string {
  const raw = process.env[envKey];
  if (raw && SEMVER.test(raw)) return raw;
  return fallback;
}

export const minVersionController = {
  get(_req: Request, res: Response<ApiResponse<MinVersionPayload>>): Response {
    const payload: MinVersionPayload = {
      ios: readPlatform('MIN_APP_VERSION_IOS', DEFAULT_IOS),
      android: readPlatform('MIN_APP_VERSION_ANDROID', DEFAULT_ANDROID),
    };
    return res.status(200).json({ success: true, data: payload });
  },
};
