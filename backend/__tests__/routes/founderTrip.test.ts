// ROADMAP 4.0 G2.4 — founder-trip route tests.

const mockGenerate = jest.fn();
const mockList = jest.fn();
const mockUpdate = jest.fn();
const mockUserFindUnique = jest.fn();

jest.mock('@/services/founderTripService', () => ({
  generateTripTasks: jest.fn((arg) => mockGenerate(arg)),
  getTasksForUser: jest.fn((arg) => mockList(arg)),
  updateTaskProgress: jest.fn((arg) => mockUpdate(arg)),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn((arg) => mockUserFindUnique(arg)) },
  },
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

import express from 'express';
import request from 'supertest';
import { founderTripRouter } from '../../src/modules/founderTrip/founderTripRoutes';
import { requireAdmin } from '../../src/middleware/requireAdmin';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/founder-trips', requireAdmin, founderTripRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: requesting user is admin
  mockUserFindUnique.mockResolvedValue({ isAdmin: true });
});

describe('admin gate', () => {
  it('403 when User.isAdmin is false', async () => {
    mockUserFindUnique.mockResolvedValue({ isAdmin: false });
    const res = await request(makeApp())
      .get('/api/admin/founder-trips/tasks')
      .set('x-user-id', 'u-not-admin');
    expect(res.status).toBe(403);
    expect(mockList).not.toHaveBeenCalled();
  });

  it('403 when user has no row', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const res = await request(makeApp())
      .get('/api/admin/founder-trips/tasks')
      .set('x-user-id', 'ghost');
    expect(res.status).toBe(403);
  });
});

describe('POST /api/admin/founder-trips', () => {
  it('201 + result on success', async () => {
    mockGenerate.mockResolvedValue({ tasksCreated: 3 });
    const res = await request(makeApp())
      .post('/api/admin/founder-trips')
      .set('x-user-id', 'admin-1')
      .send({ locale: 'es-MX', citySlug: 'cdmx' });
    expect(res.status).toBe(201);
    expect(res.body.tasksCreated).toBe(3);
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin-1', locale: 'es-MX', citySlug: 'cdmx' }),
    );
  });

  it('400 when locale missing', async () => {
    const res = await request(makeApp())
      .post('/api/admin/founder-trips')
      .set('x-user-id', 'admin-1')
      .send({});
    expect(res.status).toBe(400);
  });

  it('400 on unknown task type from service', async () => {
    mockGenerate.mockRejectedValue(new Error('unknown task type: foo'));
    const res = await request(makeApp())
      .post('/api/admin/founder-trips')
      .set('x-user-id', 'admin-1')
      .send({ locale: 'es-MX' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/founder-trips/tasks', () => {
  it('200 + tasks', async () => {
    mockList.mockResolvedValue([{ id: 't1' }]);
    const res = await request(makeApp())
      .get('/api/admin/founder-trips/tasks')
      .set('x-user-id', 'admin-1');
    expect(res.status).toBe(200);
    expect(res.body.tasks).toHaveLength(1);
  });

  it('passes status filter through', async () => {
    mockList.mockResolvedValue([]);
    await request(makeApp())
      .get('/api/admin/founder-trips/tasks?status=pending')
      .set('x-user-id', 'admin-1');
    const args = mockList.mock.calls[0][0];
    expect(args.status).toBe('pending');
  });
});

describe('PATCH /api/admin/founder-trips/tasks/:id', () => {
  it('200 on success', async () => {
    mockUpdate.mockResolvedValue({ id: 't1', status: 'in_progress' });
    const res = await request(makeApp())
      .patch('/api/admin/founder-trips/tasks/t1')
      .set('x-user-id', 'admin-1')
      .send({ completedCount: 5 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });

  it('404 when task not found', async () => {
    mockUpdate.mockRejectedValue(new Error('Task not found'));
    const res = await request(makeApp())
      .patch('/api/admin/founder-trips/tasks/missing')
      .set('x-user-id', 'admin-1')
      .send({ completedCount: 5 });
    expect(res.status).toBe(404);
  });

  it('400 on unknown status', async () => {
    mockUpdate.mockRejectedValue(new Error('unknown status: wat'));
    const res = await request(makeApp())
      .patch('/api/admin/founder-trips/tasks/t1')
      .set('x-user-id', 'admin-1')
      .send({ status: 'wat' });
    expect(res.status).toBe(400);
  });
});
