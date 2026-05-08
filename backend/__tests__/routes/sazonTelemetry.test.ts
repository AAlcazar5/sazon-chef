// ROADMAP 4.0 IA2.8 — Sazon telemetry route tests.

const mockLog = jest.fn();

jest.mock('@/services/sazonOpenLog', () => ({
  logSazonOpen: jest.fn((arg) => mockLog(arg)),
  SAZON_OPEN_SOURCES: ['fab_tap', 'fab_long_press', 'history_link', 'tab', 'deep_link', 'other'],
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: (req: { headers: Record<string, string> }) =>
    req.headers['x-user-id'] || 'user-1',
  isAuthenticated: () => true,
}));

import express from 'express';
import request from 'supertest';
import { sazonTelemetryRouter } from '../../src/modules/sazonTelemetry/sazonTelemetryRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/telemetry', sazonTelemetryRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLog.mockResolvedValue(undefined);
});

describe('POST /api/telemetry/sazon-open', () => {
  it('204 on success', async () => {
    const res = await request(makeApp())
      .post('/api/telemetry/sazon-open')
      .set('x-user-id', 'u1')
      .send({ source: 'fab_tap' });
    expect(res.status).toBe(204);
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', source: 'fab_tap' }),
    );
  });

  it('400 when source missing', async () => {
    const res = await request(makeApp())
      .post('/api/telemetry/sazon-open')
      .set('x-user-id', 'u1')
      .send({});
    expect(res.status).toBe(400);
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('400 when source unknown', async () => {
    const res = await request(makeApp())
      .post('/api/telemetry/sazon-open')
      .set('x-user-id', 'u1')
      .send({ source: 'evil' });
    expect(res.status).toBe(400);
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('forwards contextSeed + locale + extra', async () => {
    await request(makeApp())
      .post('/api/telemetry/sazon-open')
      .set('x-user-id', 'u1')
      .send({
        source: 'fab_long_press',
        contextSeed: 'tonight?',
        locale: 'pt-BR',
        extra: { screenContext: 'today' },
      });
    const arg = mockLog.mock.calls[0][0];
    expect(arg.contextSeed).toBe('tonight?');
    expect(arg.locale).toBe('pt-BR');
    expect(arg.extra).toEqual({ screenContext: 'today' });
  });

  it('500 on unknown service error', async () => {
    mockLog.mockRejectedValue(new Error('boom'));
    const res = await request(makeApp())
      .post('/api/telemetry/sazon-open')
      .set('x-user-id', 'u1')
      .send({ source: 'fab_tap' });
    expect(res.status).toBe(500);
  });
});
