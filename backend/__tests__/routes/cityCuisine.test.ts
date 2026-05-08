// ROADMAP 4.0 G2.2 — city-cuisine recommendations route.

const mockGetReco = jest.fn();

jest.mock('@/services/cityCuisineService', () => ({
  getCityDishRecommendations: (...a: unknown[]) => mockGetReco(...a),
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

import express from 'express';
import request from 'supertest';
import { cityCuisineRouter } from '../../src/modules/cityCuisine/cityCuisineRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/city-cuisine', cityCuisineRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/city-cuisine/recommendations', () => {
  it('200 + dishes when city resolves', async () => {
    mockGetReco.mockResolvedValue({
      city: {
        displayName: 'Mexico City',
        country: 'Mexico',
        region: 'Valle de México',
        latitude: 19.4326,
        longitude: -99.1332,
        aliases: ['mexico city'],
      },
      dishes: [
        { name: 'Mole', cuisine: 'oaxacan', hook: 'Layered chile sauce.', score: 1.5, affinityMatched: ['oaxacan'] },
      ],
    });
    const app = makeApp();
    const res = await request(app)
      .get('/api/city-cuisine/recommendations?city=cdmx&k=5')
      .set('x-user-id', 'user-1');
    expect(res.status).toBe(200);
    expect(res.body.city.country).toBe('Mexico');
    expect(res.body.dishes).toHaveLength(1);
    expect(mockGetReco).toHaveBeenCalledWith({
      userId: 'user-1',
      city: 'cdmx',
      k: 5,
    });
  });

  it('default k applied when not provided', async () => {
    mockGetReco.mockResolvedValue({
      city: { displayName: 'Lima', country: 'Peru', region: 'Costa', latitude: 0, longitude: 0, aliases: [] },
      dishes: [],
    });
    const app = makeApp();
    await request(app)
      .get('/api/city-cuisine/recommendations?city=lima')
      .set('x-user-id', 'user-1');
    const args = mockGetReco.mock.calls[0][0];
    expect(args.k).toBeUndefined(); // service defaults to 5
  });

  it('400 when city query param missing', async () => {
    const app = makeApp();
    const res = await request(app)
      .get('/api/city-cuisine/recommendations')
      .set('x-user-id', 'user-1');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/city/i);
    expect(mockGetReco).not.toHaveBeenCalled();
  });

  it('404 when city does not resolve', async () => {
    mockGetReco.mockResolvedValue({ city: null, dishes: [] });
    const app = makeApp();
    const res = await request(app)
      .get('/api/city-cuisine/recommendations?city=atlantis')
      .set('x-user-id', 'user-1');
    expect(res.status).toBe(404);
    expect(res.body.dishes).toEqual([]);
  });

  it('500 on service error', async () => {
    mockGetReco.mockRejectedValue(new Error('boom'));
    const app = makeApp();
    const res = await request(app)
      .get('/api/city-cuisine/recommendations?city=cdmx')
      .set('x-user-id', 'user-1');
    expect(res.status).toBe(500);
  });

  it('garbage k falls through to service default', async () => {
    mockGetReco.mockResolvedValue({
      city: { displayName: 'Tokyo', country: 'Japan', region: 'Kantō', latitude: 0, longitude: 0, aliases: [] },
      dishes: [],
    });
    const app = makeApp();
    await request(app)
      .get('/api/city-cuisine/recommendations?city=tokyo&k=garbage')
      .set('x-user-id', 'user-1');
    const args = mockGetReco.mock.calls[0][0];
    // garbage parses to NaN → undefined → service uses default
    expect(args.k).toBeUndefined();
  });
});
