// backend/__tests__/services/imageQualityScorer.test.ts
// ROADMAP 4.0 Tier D2.1 — Image quality scorer.

import {
  scoreImageHeuristics,
  scoreImage,
  STOCK_PHOTO_HOSTS,
} from '../../src/services/imageQualityScorer';

describe('scoreImageHeuristics (pure)', () => {
  it('returns 5 for high-res square food photo from non-stock host', () => {
    const r = scoreImageHeuristics({
      width: 2048,
      height: 2048,
      sourceUrl: 'https://cdn.sazonchef.com/recipes/abc.jpg',
      visionScore: 5,
    });
    expect(r.score).toBe(5);
    expect(r.reasons).toEqual([]);
  });

  it('penalizes resolution below 1024 short edge', () => {
    const r = scoreImageHeuristics({
      width: 800,
      height: 600,
      sourceUrl: 'https://cdn.sazonchef.com/x.jpg',
      visionScore: 5,
    });
    expect(r.score).toBeLessThan(5);
    expect(r.reasons.some((x) => x.code === 'low_resolution')).toBe(true);
  });

  it('penalizes extreme aspect ratios outside [0.75, 1.78]', () => {
    const r = scoreImageHeuristics({
      width: 4000,
      height: 1000, // 4:1 banner
      sourceUrl: 'https://cdn.sazonchef.com/x.jpg',
      visionScore: 5,
    });
    expect(r.reasons.some((x) => x.code === 'bad_aspect_ratio')).toBe(true);
  });

  it('flags stock-CDN sources', () => {
    expect(STOCK_PHOTO_HOSTS.length).toBeGreaterThan(0);
    const r = scoreImageHeuristics({
      width: 2000,
      height: 2000,
      sourceUrl: 'https://images.unsplash.com/photo-abc.jpg',
      visionScore: 5,
    });
    expect(r.reasons.some((x) => x.code === 'stock_photo_host')).toBe(true);
    expect(r.score).toBeLessThan(5);
  });

  it('uses vision score as primary signal — vision=2 caps total at ≤2', () => {
    const r = scoreImageHeuristics({
      width: 2000,
      height: 2000,
      sourceUrl: 'https://cdn.sazonchef.com/x.jpg',
      visionScore: 2,
    });
    expect(r.score).toBeLessThanOrEqual(2);
  });

  it('returns 0 when source url is empty (image_unreachable)', () => {
    const r = scoreImageHeuristics({
      width: 0,
      height: 0,
      sourceUrl: '',
      visionScore: null,
    });
    expect(r.score).toBe(0);
    expect(r.reasons.some((x) => x.code === 'image_unreachable')).toBe(true);
  });

  it('rejects vision scores outside 1-5', () => {
    expect(() =>
      scoreImageHeuristics({
        width: 2000,
        height: 2000,
        sourceUrl: 'https://cdn.sazonchef.com/x.jpg',
        visionScore: 6,
      }),
    ).toThrow();
  });
});

describe('scoreImage (async, with mocked deps)', () => {
  it('returns image_unreachable when HEAD fetch fails', async () => {
    const r = await scoreImage('https://cdn.sazonchef.com/missing.jpg', {
      headFetch: async () => {
        throw new Error('boom');
      },
      visionRate: async () => 5,
    });
    expect(r.score).toBe(0);
    expect(r.reasons.some((x) => x.code === 'image_unreachable')).toBe(true);
  });

  it('combines HEAD-derived dimensions with vision rating', async () => {
    const r = await scoreImage('https://cdn.sazonchef.com/good.jpg', {
      headFetch: async () => ({ width: 1600, height: 1200 }),
      visionRate: async () => 5,
    });
    expect(r.score).toBeGreaterThanOrEqual(4);
  });

  it('skips vision call when image_unreachable', async () => {
    const visionSpy = jest.fn(async () => 5);
    await scoreImage('', {
      headFetch: async () => {
        throw new Error('boom');
      },
      visionRate: visionSpy,
    });
    expect(visionSpy).not.toHaveBeenCalled();
  });
});
