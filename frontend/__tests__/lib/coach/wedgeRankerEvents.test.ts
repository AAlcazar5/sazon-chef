// Y-Rank-6 (founder roadmap Telegram 2026-05-20) — telemetry helper
// tests. The post is fire-and-forget; we mock the API client and
// verify the payload contract + error-swallowing behavior.

const mockPost = jest.fn();
jest.mock('../../../lib/api', () => ({
  apiClient: { post: (...args: unknown[]) => mockPost(...args) },
}));

import { logWedgeRankerEvent } from '../../../lib/coach/wedgeRankerEvents';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('logWedgeRankerEvent', () => {
  it('POSTs the payload to /telemetry/wedge-ranker-events', () => {
    mockPost.mockResolvedValue({});
    logWedgeRankerEvent({
      recipeId: 'rcp_42',
      primarySource: 'pantry',
      altsPoolSize: 4,
    });
    expect(mockPost).toHaveBeenCalledWith(
      '/telemetry/wedge-ranker-events',
      {
        recipeId: 'rcp_42',
        primarySource: 'pantry',
        altsPoolSize: 4,
      },
    );
  });

  it('handles null recipeId (AI-gen path)', () => {
    mockPost.mockResolvedValue({});
    logWedgeRankerEvent({
      recipeId: null,
      primarySource: 'ai-gen',
      altsPoolSize: 0,
    });
    expect(mockPost).toHaveBeenCalledWith(
      '/telemetry/wedge-ranker-events',
      {
        recipeId: null,
        primarySource: 'ai-gen',
        altsPoolSize: 0,
      },
    );
  });

  it('silently swallows POST errors (telemetry never blocks UX)', () => {
    mockPost.mockRejectedValue(new Error('network'));
    expect(() =>
      logWedgeRankerEvent({
        recipeId: 'rcp_1',
        primarySource: 'dice',
        altsPoolSize: 0,
      }),
    ).not.toThrow();
  });
});
