// backend/__tests__/modules/recipe/newToYouController.test.ts
// Thin handler tests — service is mocked. Service-level logic lives in
// __tests__/services/newToYouFeedService.test.ts.

import { Request, Response } from 'express';

const mockBuildNewToYouFeed = jest.fn();

jest.mock('@/services/newToYouFeedService', () => ({
  buildNewToYouFeed: (...args: unknown[]) => mockBuildNewToYouFeed(...args),
}));

jest.mock('@/utils/authHelper', () => ({
  getUserId: jest.fn(() => 'test-user-id'),
}));

import { newToYouController } from '../../../src/modules/recipe/newToYouController';

function buildRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response & { status: jest.Mock; json: jest.Mock };
}

describe('newToYouController.getNewToYou', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildNewToYouFeed.mockResolvedValue({
      recipes: [],
      isColdStart: true,
      sourceCuisines: [],
      adjacentCuisines: [],
    });
  });

  it('passes default limit=8 when query param is absent', async () => {
    const req = { query: {} } as unknown as Request;
    const res = buildRes();

    await newToYouController.getNewToYou(req, res);

    expect(mockBuildNewToYouFeed).toHaveBeenCalledWith('test-user-id', { limit: 8 });
  });

  it('passes through a sane numeric limit', async () => {
    const req = { query: { limit: '12' } } as unknown as Request;
    const res = buildRes();

    await newToYouController.getNewToYou(req, res);

    expect(mockBuildNewToYouFeed).toHaveBeenCalledWith('test-user-id', { limit: 12 });
  });

  it('clamps limit at 24 to defeat unbounded reads', async () => {
    const req = { query: { limit: '5000' } } as unknown as Request;
    const res = buildRes();

    await newToYouController.getNewToYou(req, res);

    expect(mockBuildNewToYouFeed).toHaveBeenCalledWith('test-user-id', { limit: 24 });
  });

  it('falls back to default when limit is non-numeric', async () => {
    const req = { query: { limit: 'banana' } } as unknown as Request;
    const res = buildRes();

    await newToYouController.getNewToYou(req, res);

    expect(mockBuildNewToYouFeed).toHaveBeenCalledWith('test-user-id', { limit: 8 });
  });

  it('returns the service feed shape verbatim on success', async () => {
    const feed = {
      recipes: [
        {
          id: 'r1',
          title: 'Pho Bo',
          cuisine: 'Vietnamese',
          personalizationReason: 'Because you cooked Thai',
          sourceCuisine: 'Thai',
        },
      ],
      isColdStart: false,
      sourceCuisines: ['Thai'],
      adjacentCuisines: ['Vietnamese', 'Burmese'],
    };
    mockBuildNewToYouFeed.mockResolvedValueOnce(feed);
    const req = { query: {} } as unknown as Request;
    const res = buildRes();

    await newToYouController.getNewToYou(req, res);

    expect(res.json).toHaveBeenCalledWith(feed);
  });

  it('returns 500 when the service throws', async () => {
    mockBuildNewToYouFeed.mockRejectedValueOnce(new Error('db down'));
    const req = { query: {} } as unknown as Request;
    const res = buildRes();

    await newToYouController.getNewToYou(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to build new-to-you feed' });
  });
});
