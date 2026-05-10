// Tier TB6.4 — per-surface diversity tuning panel tests.

import {
  getDiversityConfig,
  DIVERSITY_SURFACE_DEFAULTS,
} from '../../../src/services/recommender/diversityConfig';

const ENV_KEYS = [
  'DIVERSITY_HOME_FEED_LAMBDA',
  'DIVERSITY_HOME_FEED_K',
  'DIVERSITY_HOME_FEED_SIM_THRESHOLD',
  'DIVERSITY_MORE_LIKE_THIS_LAMBDA',
  'DIVERSITY_MORE_LIKE_THIS_K',
  'DIVERSITY_RECIPE_SECTIONS_LAMBDA',
  'DIVERSITY_RECIPE_SECTIONS_K',
  'DIVERSITY_DEFAULT_LAMBDA',
];

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe('diversityConfig (TB6.4)', () => {
  describe('default values per surface', () => {
    it('home-feed: λ=0.7, k=2, simThreshold=0.92', () => {
      const cfg = getDiversityConfig('home-feed');
      expect(cfg.lambda).toBe(0.7);
      expect(cfg.k).toBe(2);
      expect(cfg.simThreshold).toBe(0.92);
    });

    it('more-like-this: λ=0.9, k=1 (relevance-dominant)', () => {
      const cfg = getDiversityConfig('more-like-this');
      expect(cfg.lambda).toBe(0.9);
      expect(cfg.k).toBe(1);
    });

    it('recipe-sections: λ=0.5, k=3 (diversity-dominant)', () => {
      const cfg = getDiversityConfig('recipe-sections');
      expect(cfg.lambda).toBe(0.5);
      expect(cfg.k).toBe(3);
    });

    it('default fallback: λ=0.7, k=2', () => {
      const cfg = getDiversityConfig('default');
      expect(cfg.lambda).toBe(0.7);
      expect(cfg.k).toBe(2);
    });
  });

  describe('ENV overrides', () => {
    it('DIVERSITY_HOME_FEED_LAMBDA overrides home-feed lambda', () => {
      process.env.DIVERSITY_HOME_FEED_LAMBDA = '0.85';
      expect(getDiversityConfig('home-feed').lambda).toBe(0.85);
    });

    it('DIVERSITY_MORE_LIKE_THIS_K overrides more-like-this k', () => {
      process.env.DIVERSITY_MORE_LIKE_THIS_K = '4';
      expect(getDiversityConfig('more-like-this').k).toBe(4);
    });

    it('SIM_THRESHOLD ENV override flows through', () => {
      process.env.DIVERSITY_HOME_FEED_SIM_THRESHOLD = '0.85';
      expect(getDiversityConfig('home-feed').simThreshold).toBe(0.85);
    });

    it('an override on one surface does not bleed into another', () => {
      process.env.DIVERSITY_HOME_FEED_LAMBDA = '0.99';
      const home = getDiversityConfig('home-feed');
      const sections = getDiversityConfig('recipe-sections');
      expect(home.lambda).toBe(0.99);
      expect(sections.lambda).toBe(0.5);
    });
  });

  describe('malformed ENV values fall back to defaults', () => {
    it('non-numeric lambda → default', () => {
      process.env.DIVERSITY_HOME_FEED_LAMBDA = 'not-a-number';
      expect(getDiversityConfig('home-feed').lambda).toBe(0.7);
    });

    it('empty lambda → default', () => {
      process.env.DIVERSITY_HOME_FEED_LAMBDA = '';
      expect(getDiversityConfig('home-feed').lambda).toBe(0.7);
    });

    it('non-positive k → default', () => {
      process.env.DIVERSITY_HOME_FEED_K = '0';
      expect(getDiversityConfig('home-feed').k).toBe(2);
    });

    it('non-integer k → default', () => {
      process.env.DIVERSITY_HOME_FEED_K = 'three';
      expect(getDiversityConfig('home-feed').k).toBe(2);
    });
  });

  describe('exported defaults map', () => {
    it('contains every surface', () => {
      expect(DIVERSITY_SURFACE_DEFAULTS['home-feed']).toBeDefined();
      expect(DIVERSITY_SURFACE_DEFAULTS['more-like-this']).toBeDefined();
      expect(DIVERSITY_SURFACE_DEFAULTS['recipe-sections']).toBeDefined();
      expect(DIVERSITY_SURFACE_DEFAULTS['default']).toBeDefined();
    });
  });
});
