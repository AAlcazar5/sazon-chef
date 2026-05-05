// backend/__tests__/modules/telemetry/surfaceEventController.test.ts
// ROADMAP 4.0 Tier B3 — surface event sink controller (TDD).

const mockSurfaceEventCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    surfaceEvent: { create: (...a: unknown[]) => mockSurfaceEventCreate(...a) },
  },
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: () => 'user_test',
}));

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { Request, Response } from 'express';
import { surfaceEventController } from '../../../src/modules/telemetry/surfaceEventController';

function makeRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSurfaceEventCreate.mockResolvedValue({});
});

describe('POST /api/telemetry/surface-events — single event', () => {
  it('persists a single valid event and returns accepted=1', async () => {
    const req = {
      body: {
        surface: 'today_hero',
        action: 'impression',
        recipeId: 'r-1',
      },
    } as Request;
    const res = makeRes();

    await surfaceEventController.record(req, res);

    expect(mockSurfaceEventCreate).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ accepted: 1, total: 1 });
  });

  it('400s on unknown surface', async () => {
    const req = {
      body: { surface: 'totally-fake', action: 'impression' },
    } as Request;
    const res = makeRes();
    await surfaceEventController.record(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockSurfaceEventCreate).not.toHaveBeenCalled();
  });

  it('400s on unknown action', async () => {
    const req = {
      body: { surface: 'today_hero', action: 'eaten' },
    } as Request;
    const res = makeRes();
    await surfaceEventController.record(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('POST /api/telemetry/surface-events — batched events', () => {
  it('persists each event in the batch and returns aggregate counts', async () => {
    const req = {
      body: {
        events: [
          { surface: 'today_hero', action: 'impression', recipeId: 'r-1' },
          { surface: 'today_hero', action: 'tap', recipeId: 'r-1' },
          { surface: 'kitchen_discover', action: 'impression', recipeId: 'r-2' },
        ],
      },
    } as Request;
    const res = makeRes();

    await surfaceEventController.record(req, res);

    expect(mockSurfaceEventCreate).toHaveBeenCalledTimes(3);
    expect(res.json).toHaveBeenCalledWith({ accepted: 3, total: 3 });
  });

  it('continues batch when one event fails (best-effort)', async () => {
    mockSurfaceEventCreate
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('dropped'))
      .mockResolvedValueOnce({});

    const req = {
      body: {
        events: [
          { surface: 'today_hero', action: 'impression', recipeId: 'r-1' },
          { surface: 'today_hero', action: 'tap', recipeId: 'r-1' },
          { surface: 'kitchen_discover', action: 'impression', recipeId: 'r-2' },
        ],
      },
    } as Request;
    const res = makeRes();

    await surfaceEventController.record(req, res);

    expect(res.json).toHaveBeenCalledWith({ accepted: 2, total: 3 });
  });

  it('400s on a batch exceeding 50 events', async () => {
    const events = Array.from({ length: 51 }, () => ({
      surface: 'today_hero',
      action: 'impression',
    }));
    const req = { body: { events } } as Request;
    const res = makeRes();
    await surfaceEventController.record(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
