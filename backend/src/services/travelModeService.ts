// ROADMAP 4.0 G2.1 — Sazon Travel mode service.
//
// Detects when a user is "traveling" (>TRAVEL_DISTANCE_MI from home for
// >TRAVEL_DURATION_HOURS) and resolves the closest catalog city. Used by
// the Today header to flip into "Eat the world" mode.
//
// Heartbeat protocol: client posts current lat/lng on app open (or on
// significant location change). First heartbeat seeds the home location.
// Subsequent heartbeats:
//   - within home radius → travel state cleared, travelMode=false
//   - outside radius, no timer running → start timer, travelMode=false
//   - outside radius, timer running but < duration threshold → travelMode=false
//   - outside radius, timer running and >= duration threshold → travelMode=true

import { prisma } from '@/lib/prisma';
import { CITY_CUISINE_CATALOG } from '../data/cityCuisineCatalog';

const TRAVEL_DISTANCE_MI = 50;
const TRAVEL_DURATION_HOURS = 24;
const NEAREST_CITY_RADIUS_MI = 60;

const EARTH_RADIUS_MI = 3958.8;
const DEG_TO_RAD = Math.PI / 180;

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversineMiles(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const lat1 = a.lat * DEG_TO_RAD;
  const lat2 = b.lat * DEG_TO_RAD;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_MI * c;
}

export interface NearestCityResult {
  slug: string;
  displayName: string;
  country: string;
  distanceMi: number;
}

export function resolveNearestCity(coord: LatLng): NearestCityResult | null {
  let best: NearestCityResult | null = null;
  for (const [slug, city] of Object.entries(CITY_CUISINE_CATALOG)) {
    const d = haversineMiles(coord, { lat: city.latitude, lng: city.longitude });
    if (d > NEAREST_CITY_RADIUS_MI) continue;
    if (!best || d < best.distanceMi) {
      best = {
        slug,
        displayName: city.displayName,
        country: city.country,
        distanceMi: d,
      };
    }
  }
  return best;
}

export interface HeartbeatInput {
  userId: string;
  latitude: number;
  longitude: number;
  /** Optional home override on first heartbeat (e.g. user-set home in profile). */
  homeLatitude?: number;
  homeLongitude?: number;
  /** Override for testing. */
  now?: Date;
}

export interface HeartbeatResult {
  travelMode: boolean;
  citySlug: string | null;
  cityDisplayName: string | null;
  /** Miles from home at this heartbeat. Null when home is not yet set. */
  distanceFromHomeMi: number | null;
  /** Hours since travel timer started, when applicable. */
  travelDurationHours: number | null;
  reason: string;
}

function isValidCoord(lat: number, lng: number): true | string {
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    return 'latitude must be in [-90, 90]';
  }
  if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return 'longitude must be in [-180, 180]';
  }
  return true;
}

export async function recordHeartbeat(input: HeartbeatInput): Promise<HeartbeatResult> {
  if (!input.userId) {
    throw new Error('userId is required');
  }
  const coordCheck = isValidCoord(input.latitude, input.longitude);
  if (coordCheck !== true) {
    throw new Error(`invalid coordinate: ${coordCheck}`);
  }

  const now = input.now ?? new Date();
  const user = (await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      homeLatitude: true,
      homeLongitude: true,
      travelStartedAt: true,
      travelCitySlug: true,
    },
  })) as {
    id: string;
    homeLatitude: number | null;
    homeLongitude: number | null;
    travelStartedAt: Date | null;
    travelCitySlug: string | null;
  } | null;

  // No row → can't proceed
  if (!user) {
    throw new Error('User not found');
  }

  // First-heartbeat / no home → set home, travelMode=false.
  let homeLat = user.homeLatitude;
  let homeLng = user.homeLongitude;
  if (homeLat == null || homeLng == null) {
    homeLat = input.homeLatitude ?? input.latitude;
    homeLng = input.homeLongitude ?? input.longitude;
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        homeLatitude: homeLat,
        homeLongitude: homeLng,
        travelStartedAt: null,
        travelCitySlug: null,
      },
    });
    return {
      travelMode: false,
      citySlug: null,
      cityDisplayName: null,
      distanceFromHomeMi: 0,
      travelDurationHours: null,
      reason: 'home location seeded',
    };
  }

  const distanceMi = haversineMiles(
    { lat: homeLat, lng: homeLng },
    { lat: input.latitude, lng: input.longitude },
  );

  // Within home radius → clear any travel state.
  if (distanceMi <= TRAVEL_DISTANCE_MI) {
    if (user.travelStartedAt != null || user.travelCitySlug != null) {
      await prisma.user.update({
        where: { id: input.userId },
        data: { travelStartedAt: null, travelCitySlug: null },
      });
    }
    return {
      travelMode: false,
      citySlug: null,
      cityDisplayName: null,
      distanceFromHomeMi: distanceMi,
      travelDurationHours: null,
      reason: 'within home radius',
    };
  }

  // Outside home radius — resolve nearest catalog city (best-effort).
  const nearest = resolveNearestCity({ lat: input.latitude, lng: input.longitude });
  const citySlug = nearest?.slug ?? null;
  const cityDisplayName = nearest?.displayName ?? null;

  // Timer not yet started → start it.
  if (user.travelStartedAt == null) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { travelStartedAt: now, travelCitySlug: citySlug },
    });
    return {
      travelMode: false,
      citySlug,
      cityDisplayName,
      distanceFromHomeMi: distanceMi,
      travelDurationHours: 0,
      reason: 'timer started',
    };
  }

  // Timer running — compute duration.
  const durationHours =
    (now.getTime() - user.travelStartedAt.getTime()) / (60 * 60 * 1000);

  // Update the catalog city if it changed (user moved between cities).
  if (citySlug && citySlug !== user.travelCitySlug) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { travelCitySlug: citySlug },
    });
  }

  if (durationHours < TRAVEL_DURATION_HOURS) {
    return {
      travelMode: false,
      citySlug,
      cityDisplayName,
      distanceFromHomeMi: distanceMi,
      travelDurationHours: durationHours,
      reason: 'too soon (duration below threshold)',
    };
  }

  return {
    travelMode: true,
    citySlug,
    cityDisplayName,
    distanceFromHomeMi: distanceMi,
    travelDurationHours: durationHours,
    reason: 'travel mode active',
  };
}

export const __forTest = {
  TRAVEL_DISTANCE_MI,
  TRAVEL_DURATION_HOURS,
  NEAREST_CITY_RADIUS_MI,
};
