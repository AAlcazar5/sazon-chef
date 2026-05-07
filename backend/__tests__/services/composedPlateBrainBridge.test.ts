// ROADMAP 4.0 N7.1 — Build-a-Plate brain bridge test.

import { recommendSlotViaBrain } from '../../src/services/composedPlateBrainBridge';
import * as brain from '../../src/services/recommender/sazonBrain';

jest.mock('../../src/services/recommender/sazonBrain');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('N7.1 — recommendSlotViaBrain', () => {
  it('falls back to legacy when userId is empty (no user → no brain hit)', async () => {
    const legacyFallback = jest.fn().mockResolvedValue({ recipeId: 'r-legacy' });
    const result = await recommendSlotViaBrain({
      userId: '',
      slot: 'protein',
      legacyFallback,
    });
    expect(result.fromBrain).toBe(false);
    expect(result.source).toBe('legacy_no_user');
    expect(brain.recommend).not.toHaveBeenCalled();
    expect(legacyFallback).toHaveBeenCalledTimes(1);
  });

  it('falls back when brain returns ranker_unavailable (today\'s default for build_a_plate_slot)', async () => {
    (brain.recommend as jest.Mock).mockResolvedValue({
      surface: 'build_a_plate_slot',
      candidates: [],
      rationale: '',
      source: 'ranker_unavailable',
      fallbackUsed: true,
      context: {},
    });
    const legacyFallback = jest.fn().mockResolvedValue({ recipeId: 'r-legacy' });
    const result = await recommendSlotViaBrain({
      userId: 'u1',
      slot: 'protein',
      legacyFallback,
    });
    expect(result.fromBrain).toBe(false);
    expect(result.source).toBe('ranker_unavailable');
    expect(legacyFallback).toHaveBeenCalled();
  });

  it('returns brain candidates when ranker is available', async () => {
    (brain.recommend as jest.Mock).mockResolvedValue({
      surface: 'build_a_plate_slot',
      candidates: [
        { recipeId: 'r-brain-1', score: 0.9 },
        { recipeId: 'r-brain-2', score: 0.7 },
      ],
      rationale: '',
      source: 'ranker_t_bis',
      fallbackUsed: false,
      context: {},
    });
    const legacyFallback = jest.fn();
    const result = await recommendSlotViaBrain({
      userId: 'u1',
      slot: 'protein',
      legacyFallback,
    });
    expect(result.fromBrain).toBe(true);
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates![0].recipeId).toBe('r-brain-1');
    expect(legacyFallback).not.toHaveBeenCalled();
  });

  it('falls back when brain throws (defensive — never break the moat feature)', async () => {
    (brain.recommend as jest.Mock).mockRejectedValue(new Error('boom'));
    const legacyFallback = jest.fn().mockResolvedValue({ recipeId: 'r-legacy' });
    const result = await recommendSlotViaBrain({
      userId: 'u1',
      slot: 'protein',
      legacyFallback,
    });
    expect(result.fromBrain).toBe(false);
    expect(result.source).toBe('legacy_brain_error');
    expect(legacyFallback).toHaveBeenCalled();
  });

  it('falls back when brain returns empty candidates (graceful — no recipes for this slot)', async () => {
    (brain.recommend as jest.Mock).mockResolvedValue({
      surface: 'build_a_plate_slot',
      candidates: [],
      rationale: '',
      source: 'ranker_t_bis',
      fallbackUsed: false,
      context: {},
    });
    const legacyFallback = jest.fn().mockResolvedValue({ recipeId: 'r-legacy' });
    const result = await recommendSlotViaBrain({
      userId: 'u1',
      slot: 'protein',
      legacyFallback,
    });
    expect(result.fromBrain).toBe(false);
    expect(legacyFallback).toHaveBeenCalled();
  });

  it('passes the canonical surface to the brain (N0.1 enum stays stable)', async () => {
    (brain.recommend as jest.Mock).mockResolvedValue({
      surface: 'build_a_plate_slot',
      candidates: [],
      rationale: '',
      source: 'ranker_unavailable',
      fallbackUsed: true,
      context: {},
    });
    await recommendSlotViaBrain({
      userId: 'u1',
      slot: 'protein',
      legacyFallback: jest.fn().mockResolvedValue({}),
    });
    const call = (brain.recommend as jest.Mock).mock.calls[0][0];
    expect(call.surface).toBe('build_a_plate_slot');
    expect(call.userId).toBe('u1');
  });
});
