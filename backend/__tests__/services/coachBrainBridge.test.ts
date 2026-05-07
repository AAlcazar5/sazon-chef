// ROADMAP 4.0 N10.1 — Sazon-tab brain bridge test.

import { recommendCoachReplyViaBrain } from '../../src/services/coachBrainBridge';
import * as brain from '../../src/services/recommender/sazonBrain';

jest.mock('../../src/services/recommender/sazonBrain');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('N10.1 — recommendCoachReplyViaBrain', () => {
  it('falls back to legacy on empty userId', async () => {
    const legacyFallback = jest.fn().mockResolvedValue('legacy reply');
    const result = await recommendCoachReplyViaBrain({
      userId: '',
      legacyFallback,
    });
    expect(result.fromBrain).toBe(false);
    expect(result.source).toBe('legacy_no_user');
    expect(brain.recommend).not.toHaveBeenCalled();
    expect(legacyFallback).toHaveBeenCalled();
  });

  it('falls back when brain returns ranker_unavailable (default for sazon_chat today)', async () => {
    (brain.recommend as jest.Mock).mockResolvedValue({
      surface: 'sazon_chat',
      candidates: [],
      rationale: '',
      source: 'ranker_unavailable',
      fallbackUsed: true,
      context: {},
    });
    const legacyFallback = jest.fn().mockResolvedValue('legacy reply');
    const result = await recommendCoachReplyViaBrain({
      userId: 'u1',
      legacyFallback,
    });
    expect(result.fromBrain).toBe(false);
    expect(result.source).toBe('ranker_unavailable');
    expect(legacyFallback).toHaveBeenCalled();
  });

  it('returns brain pick + candidates when ranker is available', async () => {
    (brain.recommend as jest.Mock).mockResolvedValue({
      surface: 'sazon_chat',
      candidates: [
        { recipeId: 'r-brain-1', score: 0.85 },
        { recipeId: 'r-brain-2', score: 0.72 },
      ],
      rationale: 'You said earlier you wanted Persian — fancy fesenjan?',
      source: 'ranker_t_bis',
      fallbackUsed: false,
      context: {},
    });
    const legacyFallback = jest.fn();
    const result = await recommendCoachReplyViaBrain({
      userId: 'u1',
      legacyFallback,
    });
    expect(result.fromBrain).toBe(true);
    expect(result.pick!.recipeId).toBe('r-brain-1');
    expect(result.pick!.rationale).toContain('fesenjan');
    expect(result.candidates).toHaveLength(2);
    expect(legacyFallback).not.toHaveBeenCalled();
  });

  it('falls back when brain throws', async () => {
    (brain.recommend as jest.Mock).mockRejectedValue(new Error('brain down'));
    const legacyFallback = jest.fn().mockResolvedValue('legacy reply');
    const result = await recommendCoachReplyViaBrain({
      userId: 'u1',
      legacyFallback,
    });
    expect(result.fromBrain).toBe(false);
    expect(result.source).toBe('legacy_brain_error');
    expect(legacyFallback).toHaveBeenCalled();
  });

  it('passes the canonical sazon_chat surface to the brain (N0.1 enum)', async () => {
    (brain.recommend as jest.Mock).mockResolvedValue({
      surface: 'sazon_chat',
      candidates: [],
      rationale: '',
      source: 'ranker_unavailable',
      fallbackUsed: true,
      context: {},
    });
    await recommendCoachReplyViaBrain({
      userId: 'u1',
      legacyFallback: jest.fn().mockResolvedValue('x'),
    });
    const call = (brain.recommend as jest.Mock).mock.calls[0][0];
    expect(call.surface).toBe('sazon_chat');
    expect(call.userId).toBe('u1');
  });

  it('omits rationale on the pick when brain returned no rationale', async () => {
    (brain.recommend as jest.Mock).mockResolvedValue({
      surface: 'sazon_chat',
      candidates: [{ recipeId: 'r-1', score: 0.8 }],
      rationale: '',
      source: 'ranker_t_bis',
      fallbackUsed: false,
      context: {},
    });
    const result = await recommendCoachReplyViaBrain({
      userId: 'u1',
      legacyFallback: jest.fn(),
    });
    expect(result.pick!.rationale).toBeUndefined();
  });
});
