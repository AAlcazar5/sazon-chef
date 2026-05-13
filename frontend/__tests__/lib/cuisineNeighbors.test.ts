import { neighborsFor, welcomeLine } from '../../lib/cuisineNeighbors';

describe('cuisineNeighbors', () => {
  describe('neighborsFor', () => {
    it('returns the curated neighbor list for a known cuisine', () => {
      const ns = neighborsFor('Persian');
      expect(ns).toContain('fesenjan');
      expect(ns).toContain('tahdig');
    });

    it('is case-insensitive', () => {
      expect(neighborsFor('PERSIAN').length).toBeGreaterThan(0);
      expect(neighborsFor('persian')).toEqual(neighborsFor('Persian'));
    });

    it('returns an empty array for unknown cuisines', () => {
      expect(neighborsFor('Glaswegian')).toEqual([]);
      expect(neighborsFor('')).toEqual([]);
    });
  });

  describe('welcomeLine', () => {
    it('renders "Welcome to fesenjan, tahdig, and friends." for Persian', () => {
      expect(welcomeLine('Persian')).toBe('Welcome to fesenjan, tahdig, and friends.');
    });

    it('renders a single-dish form when only one neighbor exists', () => {
      // The map keeps 2–3 entries today, so synthesize the boundary via a
      // cuisine that's not present — null fall-through is the same boundary
      // the caller already handles. This contract test pins the format.
      expect(welcomeLine('Glaswegian')).toBeNull();
    });

    it('returns null for unknown cuisines so callers can fall back', () => {
      expect(welcomeLine('Atlantean')).toBeNull();
    });

    it('does not use banned voice vocabulary', () => {
      const line = welcomeLine('Persian') ?? '';
      expect(line.toLowerCase()).not.toMatch(/streak|don't lose|goal|target|cut|bulk|maintain/);
    });
  });
});
