// ROADMAP 4.0 G1.1 — diaspora onboarding route tests.

const mockApply = jest.fn();

jest.mock('@/services/diasporaOnboardingService', () => ({
  HERITAGE_CUISINES: [
    { cuisine: 'mexican', label: 'Mexican', suggestedLocale: 'es-MX', emoji: '🇲🇽' },
    { cuisine: 'brazilian', label: 'Brazilian', suggestedLocale: 'pt-BR', emoji: '🇧🇷' },
  ],
  applyDiasporaOnboarding: jest.fn((arg) => mockApply(arg)),
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

import express from 'express';
import request from 'supertest';
import { diasporaOnboardingRouter } from '../../src/modules/diasporaOnboarding/diasporaOnboardingRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/onboarding/diaspora', diasporaOnboardingRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/onboarding/diaspora/options', () => {
  it('200 + heritage options', async () => {
    const res = await request(makeApp()).get('/api/onboarding/diaspora/options');
    expect(res.status).toBe(200);
    expect(res.body.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cuisine: 'mexican' }),
        expect.objectContaining({ cuisine: 'brazilian' }),
      ]),
    );
  });
});

describe('POST /api/onboarding/diaspora', () => {
  it('200 + apply result on success', async () => {
    mockApply.mockResolvedValue({
      heritagesApplied: ['mexican'],
      seededWeights: 5,
      localeApplied: 'es-MX',
    });
    const res = await request(makeApp())
      .post('/api/onboarding/diaspora')
      .set('x-user-id', 'u1')
      .send({ heritages: ['mexican'], deviceLocale: 'en-US' });
    expect(res.status).toBe(200);
    expect(res.body.localeApplied).toBe('es-MX');
    expect(mockApply).toHaveBeenCalledWith({
      userId: 'u1',
      heritages: ['mexican'],
      deviceLocale: 'en-US',
    });
  });

  it('400 when heritages is missing or not an array', async () => {
    const res = await request(makeApp())
      .post('/api/onboarding/diaspora')
      .set('x-user-id', 'u1')
      .send({ deviceLocale: 'en-US' });
    expect(res.status).toBe(400);
  });

  it('400 when deviceLocale is missing', async () => {
    const res = await request(makeApp())
      .post('/api/onboarding/diaspora')
      .set('x-user-id', 'u1')
      .send({ heritages: ['mexican'] });
    expect(res.status).toBe(400);
  });

  it('500 on service error', async () => {
    mockApply.mockRejectedValue(new Error('database boom'));
    const res = await request(makeApp())
      .post('/api/onboarding/diaspora')
      .set('x-user-id', 'u1')
      .send({ heritages: ['mexican'], deviceLocale: 'en-US' });
    expect(res.status).toBe(500);
  });

  it('accepts empty heritages array (no-op)', async () => {
    mockApply.mockResolvedValue({
      heritagesApplied: [],
      seededWeights: 0,
      localeApplied: null,
    });
    const res = await request(makeApp())
      .post('/api/onboarding/diaspora')
      .set('x-user-id', 'u1')
      .send({ heritages: [], deviceLocale: 'en-US' });
    expect(res.status).toBe(200);
    expect(res.body.seededWeights).toBe(0);
  });
});
