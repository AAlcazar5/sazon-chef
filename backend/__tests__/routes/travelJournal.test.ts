// ROADMAP 4.0 G2.3 — travel journal route tests.

const mockRecord = jest.fn();
const mockGet = jest.fn();
const mockShare = jest.fn();
const mockContribute = jest.fn();

jest.mock('@/services/travelJournalService', () => ({
  recordEntry: (...a: unknown[]) => mockRecord(...a),
  getEntriesForUser: (...a: unknown[]) => mockGet(...a),
  shareWithFriends: (...a: unknown[]) => mockShare(...a),
  contributeAnonymized: (...a: unknown[]) => mockContribute(...a),
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

import express from 'express';
import request from 'supertest';
import { travelJournalRouter } from '../../src/modules/travelJournal/travelJournalRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/travel-journal', travelJournalRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/travel-journal', () => {
  it('201 + entry on success', async () => {
    mockRecord.mockResolvedValue({ id: 'e1', dishName: 'Mole' });
    const res = await request(makeApp())
      .post('/api/travel-journal')
      .set('x-user-id', 'u1')
      .send({ dishName: 'Mole', citySlug: 'cdmx', cuisineTag: 'oaxacan' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('e1');
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', dishName: 'Mole', citySlug: 'cdmx', cuisineTag: 'oaxacan' }),
    );
  });

  it('400 on validation error', async () => {
    mockRecord.mockRejectedValue(new Error('dishName is required'));
    const res = await request(makeApp())
      .post('/api/travel-journal')
      .set('x-user-id', 'u1')
      .send({});
    expect(res.status).toBe(400);
  });

  it('500 on unknown error', async () => {
    mockRecord.mockRejectedValue(new Error('database boom'));
    const res = await request(makeApp())
      .post('/api/travel-journal')
      .set('x-user-id', 'u1')
      .send({ dishName: 'X' });
    expect(res.status).toBe(500);
  });

  it('parses occurredAt ISO string', async () => {
    mockRecord.mockResolvedValue({ id: 'e1' });
    await request(makeApp())
      .post('/api/travel-journal')
      .set('x-user-id', 'u1')
      .send({ dishName: 'X', occurredAt: '2026-05-08T10:00:00Z' });
    const args = mockRecord.mock.calls[0][0];
    expect(args.occurredAt).toBeInstanceOf(Date);
    expect(args.occurredAt.toISOString()).toBe('2026-05-08T10:00:00.000Z');
  });
});

describe('GET /api/travel-journal', () => {
  it('200 + entries', async () => {
    mockGet.mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]);
    const res = await request(makeApp())
      .get('/api/travel-journal')
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
  });

  it('passes since + limit through', async () => {
    mockGet.mockResolvedValue([]);
    await request(makeApp())
      .get('/api/travel-journal?since=2026-05-01T00:00:00Z&limit=10')
      .set('x-user-id', 'u1');
    const args = mockGet.mock.calls[0][0];
    expect(args.userId).toBe('u1');
    expect(args.since).toBeInstanceOf(Date);
    expect(args.limit).toBe(10);
  });

  it('garbage since silently dropped', async () => {
    mockGet.mockResolvedValue([]);
    await request(makeApp())
      .get('/api/travel-journal?since=garbage')
      .set('x-user-id', 'u1');
    const args = mockGet.mock.calls[0][0];
    expect(args.since).toBeUndefined();
  });
});

describe('PATCH /api/travel-journal/:id/share', () => {
  it('200 on success', async () => {
    mockShare.mockResolvedValue({ id: 'e1', isPrivate: false });
    const res = await request(makeApp())
      .patch('/api/travel-journal/e1/share')
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.isPrivate).toBe(false);
  });

  it('404 when entry not found', async () => {
    mockShare.mockRejectedValue(new Error('Entry not found'));
    const res = await request(makeApp())
      .patch('/api/travel-journal/missing/share')
      .set('x-user-id', 'u1');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/travel-journal/:id/contribute', () => {
  it('200 on success', async () => {
    mockContribute.mockResolvedValue({ id: 'e1', contributedAnonymizedAt: new Date() });
    const res = await request(makeApp())
      .patch('/api/travel-journal/e1/contribute')
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.contributedAnonymizedAt).toBeTruthy();
  });

  it('404 when entry not found', async () => {
    mockContribute.mockRejectedValue(new Error('Entry not found'));
    const res = await request(makeApp())
      .patch('/api/travel-journal/missing/contribute')
      .set('x-user-id', 'u1');
    expect(res.status).toBe(404);
  });
});
