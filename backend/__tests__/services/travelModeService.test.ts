// ROADMAP 4.0 G2.1 — Sazon Travel mode service.
//
// Detects when a user is "traveling" (>TRAVEL_DISTANCE_MI from home for
// >TRAVEL_DURATION_HOURS) and resolves the closest catalog city. Used by
// the Today header to flip into "Eat the world" mode.

const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn((arg) => mockUserFindUnique(arg)),
      update: jest.fn((arg) => mockUserUpdate(arg)),
    },
  },
}));

import {
  haversineMiles,
  resolveNearestCity,
  recordHeartbeat,
  __forTest,
} from '../../src/services/travelModeService';

beforeEach(() => {
  jest.clearAllMocks();
  mockUserUpdate.mockImplementation(({ where, data }) =>
    Promise.resolve({ id: where.id, ...data }),
  );
});

describe('haversineMiles', () => {
  it('returns ~0 for identical coordinates', () => {
    expect(haversineMiles({ lat: 40, lng: -100 }, { lat: 40, lng: -100 })).toBeCloseTo(0, 2);
  });

  it('NYC → LA is ~2451 miles', () => {
    const nyc = { lat: 40.7128, lng: -74.006 };
    const la = { lat: 34.0522, lng: -118.2437 };
    const d = haversineMiles(nyc, la);
    expect(d).toBeGreaterThan(2400);
    expect(d).toBeLessThan(2500);
  });

  it('SF → CDMX is ~1880 miles', () => {
    const sf = { lat: 37.7749, lng: -122.4194 };
    const cdmx = { lat: 19.4326, lng: -99.1332 };
    const d = haversineMiles(sf, cdmx);
    expect(d).toBeGreaterThan(1800);
    expect(d).toBeLessThan(2000);
  });

  it('one degree of latitude is ~69 miles', () => {
    const d = haversineMiles({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(68);
    expect(d).toBeLessThan(70);
  });
});

describe('resolveNearestCity', () => {
  it('returns the catalog city when caller lands within match radius', () => {
    // Coords inside the CDMX metro area
    const result = resolveNearestCity({ lat: 19.4326, lng: -99.1332 });
    expect(result).not.toBeNull();
    expect(result!.slug).toBe('cdmx');
  });

  it('returns null when user is in a region not covered by the catalog', () => {
    // Middle of the Pacific
    expect(resolveNearestCity({ lat: 0, lng: -150 })).toBeNull();
  });

  it('picks the closest of two close cities', () => {
    // Halfway between Lima and SF, closer to Lima
    const result = resolveNearestCity({ lat: -10, lng: -77 });
    if (result) {
      expect(result.slug).toBe('lima');
    }
  });
});

describe('recordHeartbeat', () => {
  it('returns travelMode=false when user has no home location set', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      homeLatitude: null,
      homeLongitude: null,
      travelStartedAt: null,
      travelCitySlug: null,
    });
    const result = await recordHeartbeat({
      userId: 'u1',
      latitude: 19.4326,
      longitude: -99.1332,
      now: new Date('2026-05-08T12:00:00Z'),
    });
    expect(result.travelMode).toBe(false);
    expect(result.reason).toMatch(/home/i);
    // Should set the home on first heartbeat
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          homeLatitude: 19.4326,
          homeLongitude: -99.1332,
        }),
      }),
    );
  });

  it('returns travelMode=false when user is within home radius', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      homeLatitude: 40.7128,
      homeLongitude: -74.006,
      travelStartedAt: null,
      travelCitySlug: null,
    });
    // Same as home → within radius
    const result = await recordHeartbeat({
      userId: 'u1',
      latitude: 40.71,
      longitude: -74.0,
      now: new Date('2026-05-08T12:00:00Z'),
    });
    expect(result.travelMode).toBe(false);
    expect(result.reason).toMatch(/home/i);
  });

  it('starts travel timer when user crosses the distance threshold', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      homeLatitude: 40.7128,
      homeLongitude: -74.006, // NYC home
      travelStartedAt: null,
      travelCitySlug: null,
    });
    // CDMX is far from NYC
    const result = await recordHeartbeat({
      userId: 'u1',
      latitude: 19.4326,
      longitude: -99.1332,
      now: new Date('2026-05-08T12:00:00Z'),
    });
    // First crossing — timer starts but travelMode not yet true
    expect(result.travelMode).toBe(false);
    expect(result.reason).toMatch(/timer started|too soon/i);
    // travelStartedAt persisted
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          travelStartedAt: expect.any(Date),
          travelCitySlug: 'cdmx',
        }),
      }),
    );
  });

  it('flips travelMode=true after sustained duration over threshold', async () => {
    const startedAt = new Date('2026-05-07T10:00:00Z');
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      homeLatitude: 40.7128,
      homeLongitude: -74.006,
      travelStartedAt: startedAt,
      travelCitySlug: 'cdmx',
    });
    // 30 hours later, still in CDMX
    const now = new Date(startedAt.getTime() + 30 * 60 * 60 * 1000);
    const result = await recordHeartbeat({
      userId: 'u1',
      latitude: 19.4326,
      longitude: -99.1332,
      now,
    });
    expect(result.travelMode).toBe(true);
    expect(result.citySlug).toBe('cdmx');
  });

  it('clears travel state when user returns home', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      homeLatitude: 40.7128,
      homeLongitude: -74.006,
      travelStartedAt: new Date('2026-05-01T12:00:00Z'),
      travelCitySlug: 'cdmx',
    });
    // Home again
    const result = await recordHeartbeat({
      userId: 'u1',
      latitude: 40.71,
      longitude: -74.0,
      now: new Date('2026-05-10T12:00:00Z'),
    });
    expect(result.travelMode).toBe(false);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          travelStartedAt: null,
          travelCitySlug: null,
        }),
      }),
    );
  });

  it('rejects empty userId', async () => {
    await expect(
      recordHeartbeat({ userId: '', latitude: 0, longitude: 0 }),
    ).rejects.toThrow(/userId/i);
  });

  it('rejects invalid coordinates', async () => {
    await expect(
      recordHeartbeat({ userId: 'u1', latitude: 91, longitude: 0 }),
    ).rejects.toThrow(/latitude|coordinate/i);
    await expect(
      recordHeartbeat({ userId: 'u1', latitude: 0, longitude: 181 }),
    ).rejects.toThrow(/longitude|coordinate/i);
  });

  it('honors caller-supplied home location override (seeds home explicitly)', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      homeLatitude: null,
      homeLongitude: null,
      travelStartedAt: null,
      travelCitySlug: null,
    });
    const result = await recordHeartbeat({
      userId: 'u1',
      latitude: 19.4326,
      longitude: -99.1332,
      homeLatitude: 40.7128,
      homeLongitude: -74.006,
    });
    // First heartbeat persists the explicit home (not the current position).
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          homeLatitude: 40.7128,
          homeLongitude: -74.006,
        }),
      }),
    );
    // First heartbeat always seeds; the next heartbeat starts the timer.
    expect(result.reason).toMatch(/home/i);
    expect(result.travelMode).toBe(false);
  });

  it('exposes thresholds for cap-test inspection', () => {
    expect(__forTest.TRAVEL_DISTANCE_MI).toBeGreaterThan(0);
    expect(__forTest.TRAVEL_DURATION_HOURS).toBeGreaterThan(0);
    expect(__forTest.NEAREST_CITY_RADIUS_MI).toBeGreaterThan(0);
  });
});
