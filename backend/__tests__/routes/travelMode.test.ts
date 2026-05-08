// ROADMAP 4.0 G2.1 — travel mode route tests.

const mockHeartbeat = jest.fn();

jest.mock('@/services/travelModeService', () => ({
  recordHeartbeat: jest.fn((arg) => mockHeartbeat(arg)),
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

import express from 'express';
import request from 'supertest';
import { travelModeRouter } from '../../src/modules/travelMode/travelModeRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/travel-mode', travelModeRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/travel-mode/heartbeat', () => {
  it('200 + state on success', async () => {
    mockHeartbeat.mockResolvedValue({
      travelMode: true,
      citySlug: 'cdmx',
      cityDisplayName: 'Mexico City',
      distanceFromHomeMi: 1880,
      travelDurationHours: 30,
      reason: 'travel mode active',
    });
    const res = await request(makeApp())
      .post('/api/travel-mode/heartbeat')
      .set('x-user-id', 'u1')
      .send({ latitude: 19.4326, longitude: -99.1332 });
    expect(res.status).toBe(200);
    expect(res.body.travelMode).toBe(true);
    expect(res.body.citySlug).toBe('cdmx');
    expect(mockHeartbeat).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', latitude: 19.4326, longitude: -99.1332 }),
    );
  });

  it('400 when latitude missing', async () => {
    const res = await request(makeApp())
      .post('/api/travel-mode/heartbeat')
      .set('x-user-id', 'u1')
      .send({ longitude: -99 });
    expect(res.status).toBe(400);
    expect(mockHeartbeat).not.toHaveBeenCalled();
  });

  it('400 on invalid coordinate from service', async () => {
    mockHeartbeat.mockRejectedValue(new Error('invalid coordinate: latitude must be in [-90, 90]'));
    const res = await request(makeApp())
      .post('/api/travel-mode/heartbeat')
      .set('x-user-id', 'u1')
      .send({ latitude: 91, longitude: 0 });
    expect(res.status).toBe(400);
  });

  it('forwards optional home override', async () => {
    mockHeartbeat.mockResolvedValue({
      travelMode: false,
      citySlug: null,
      cityDisplayName: null,
      distanceFromHomeMi: 0,
      travelDurationHours: null,
      reason: 'home location seeded',
    });
    await request(makeApp())
      .post('/api/travel-mode/heartbeat')
      .set('x-user-id', 'u1')
      .send({
        latitude: 19,
        longitude: -99,
        homeLatitude: 40.7128,
        homeLongitude: -74.006,
      });
    const args = mockHeartbeat.mock.calls[0][0];
    expect(args.homeLatitude).toBe(40.7128);
    expect(args.homeLongitude).toBe(-74.006);
  });

  it('500 on unknown service error', async () => {
    mockHeartbeat.mockRejectedValue(new Error('boom'));
    const res = await request(makeApp())
      .post('/api/travel-mode/heartbeat')
      .set('x-user-id', 'u1')
      .send({ latitude: 19, longitude: -99 });
    expect(res.status).toBe(500);
  });
});
