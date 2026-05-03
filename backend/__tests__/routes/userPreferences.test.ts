// Group 10Y Phase 6 (10Y-C): weeklyCheckinOptIn pref endpoint tests.
// Verifies Pro gate when toggling on, free-allowed when toggling off.

const mockUserFindUnique = jest.fn();
const mockPreferencesFindUnique = jest.fn();
const mockPreferencesUpsert = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    userPreferences: {
      findUnique: (...a: unknown[]) => mockPreferencesFindUnique(...a),
      upsert: (...a: unknown[]) => mockPreferencesUpsert(...a),
    },
  },
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

const mockEmit = jest.fn();
jest.mock('@/services/coachAnalytics', () => ({
  emit: (...a: unknown[]) => mockEmit(...a),
}));

import express from 'express';
import request from 'supertest';
import { userPreferencesRoutes } from '../../src/modules/user/userPreferencesRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/user', userPreferencesRoutes);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPreferencesFindUnique.mockResolvedValue({
    id: 'p1',
    userId: 'user-1',
    weeklyCheckinOptIn: false,
  });
  mockPreferencesUpsert.mockImplementation(({ update, create, where }) =>
    Promise.resolve({
      id: 'p1',
      userId: where.userId,
      weeklyCheckinOptIn:
        update?.weeklyCheckinOptIn ?? create?.weeklyCheckinOptIn ?? false,
    }),
  );
});

describe('PATCH /api/user/preferences/weekly-checkin — Pro gating', () => {
  it('returns 403 PRO_FEATURE when a free user tries to opt in', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-free',
      subscriptionTier: 'free',
      subscriptionStatus: 'free',
    });

    const res = await request(makeApp())
      .patch('/api/user/preferences/weekly-checkin')
      .set('x-user-id', 'user-free')
      .send({ weeklyCheckinOptIn: true });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PRO_FEATURE');
    expect(res.body.feature).toBe('weekly_checkin');
    expect(res.body.paywall).toBeDefined();
    expect(mockPreferencesUpsert).not.toHaveBeenCalled();
  });

  it('persists the value when a Pro user opts in (200)', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-pro',
      subscriptionTier: 'premium',
      subscriptionStatus: 'active',
    });

    const res = await request(makeApp())
      .patch('/api/user/preferences/weekly-checkin')
      .set('x-user-id', 'user-pro')
      .send({ weeklyCheckinOptIn: true });

    expect(res.status).toBe(200);
    expect(res.body.weeklyCheckinOptIn).toBe(true);
    expect(mockPreferencesUpsert).toHaveBeenCalledTimes(1);
    const upsertCall = mockPreferencesUpsert.mock.calls[0][0];
    expect(upsertCall.where.userId).toBe('user-pro');
    expect(upsertCall.update.weeklyCheckinOptIn).toBe(true);
  });

  it('allows a free user to opt OUT (200) — turning off does not require Pro', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-free',
      subscriptionTier: 'free',
      subscriptionStatus: 'free',
    });

    const res = await request(makeApp())
      .patch('/api/user/preferences/weekly-checkin')
      .set('x-user-id', 'user-free')
      .send({ weeklyCheckinOptIn: false });

    expect(res.status).toBe(200);
    expect(res.body.weeklyCheckinOptIn).toBe(false);
    expect(mockPreferencesUpsert).toHaveBeenCalledTimes(1);
  });

  it('rejects non-boolean payloads with 400', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'user-pro',
      subscriptionTier: 'premium',
      subscriptionStatus: 'active',
    });

    const res = await request(makeApp())
      .patch('/api/user/preferences/weekly-checkin')
      .set('x-user-id', 'user-pro')
      .send({ weeklyCheckinOptIn: 'yes' });

    expect(res.status).toBe(400);
    expect(mockPreferencesUpsert).not.toHaveBeenCalled();
  });
});
