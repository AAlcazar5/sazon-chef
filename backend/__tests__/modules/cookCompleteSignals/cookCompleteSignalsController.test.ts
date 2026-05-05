// backend/__tests__/modules/cookCompleteSignals/cookCompleteSignalsController.test.ts
// ROADMAP 4.0 Tier J14 + J16 — combined cook-complete-signals HTTP layer (TDD).

import type { Request, Response } from 'express';

const mockResolveIntensity = jest.fn();
const mockComputeRecap = jest.fn();
const mockGetUserId = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@/services/cookCompleteIntensityResolver', () => ({
  resolveCookCompleteIntensity: (...args: unknown[]) => mockResolveIntensity(...args),
}));
jest.mock('@/services/cookRecapInsightService', () => ({
  computeCookRecapInsight: (...args: unknown[]) => mockComputeRecap(...args),
}));
jest.mock('@/utils/authHelper', () => ({
  getUserId: (...args: unknown[]) => mockGetUserId(...args),
}));
jest.mock('@/utils/logger', () => ({
  logger: { error: (...args: unknown[]) => mockLoggerError(...args) },
}));

import { cookCompleteSignalsController } from '../../../src/modules/cookCompleteSignals/cookCompleteSignalsController';

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status, _res: ({ json, status } as unknown) as Response };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUserId.mockReturnValue('u1');
});

describe('cookCompleteSignalsController.get', () => {
  it('returns intensity + recap insight for a valid request', async () => {
    mockResolveIntensity.mockResolvedValue('big');
    mockComputeRecap.mockResolvedValue('Third Persian dish this month.');

    const req = {
      query: { cuisine: 'Persian', recipeId: 'r1', rating: '5' },
    } as unknown as Request;
    const r = makeRes();

    await cookCompleteSignalsController.get(req, r._res);

    expect(mockResolveIntensity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        cuisine: 'Persian',
        recipeId: 'r1',
        rating: 5,
      }),
    );
    expect(mockComputeRecap).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        cuisine: 'Persian',
      }),
    );
    expect(r.json).toHaveBeenCalledWith({
      intensity: 'big',
      recapInsight: 'Third Persian dish this month.',
    });
  });

  it('omits rating when not a parseable number', async () => {
    mockResolveIntensity.mockResolvedValue('quiet');
    mockComputeRecap.mockResolvedValue(null);

    const req = {
      query: { cuisine: 'Persian', recipeId: 'r1', rating: 'not-a-number' },
    } as unknown as Request;
    const r = makeRes();

    await cookCompleteSignalsController.get(req, r._res);

    const callArgs = mockResolveIntensity.mock.calls[0][0];
    expect(callArgs.rating).toBeUndefined();
    expect(r.json).toHaveBeenCalledWith({
      intensity: 'quiet',
      recapInsight: null,
    });
  });

  it('handles missing query params (cuisine empty, no recipeId)', async () => {
    mockResolveIntensity.mockResolvedValue('quiet');
    mockComputeRecap.mockResolvedValue(null);

    const req = { query: {} } as unknown as Request;
    const r = makeRes();

    await cookCompleteSignalsController.get(req, r._res);

    expect(mockResolveIntensity).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', cuisine: '' }),
    );
    expect(r.json).toHaveBeenCalledWith({
      intensity: 'quiet',
      recapInsight: null,
    });
  });

  it('returns 500 + logs when the resolver throws', async () => {
    mockResolveIntensity.mockRejectedValue(new Error('boom'));
    mockComputeRecap.mockResolvedValue(null);

    const req = {
      query: { cuisine: 'Persian' },
    } as unknown as Request;
    const r = makeRes();

    await cookCompleteSignalsController.get(req, r._res);

    expect(mockLoggerError).toHaveBeenCalled();
    expect(r.status).toHaveBeenCalledWith(500);
  });
});
