// Tier TB6.2 — surface-aware diversifier wrapper tests.

import { diversifyForSurface } from '../../../src/services/recommender/diversifyForSurface';

const DIM = 64;
const basis = (axis: number) => {
  const v = new Array(DIM).fill(0);
  v[axis] = 1;
  return v;
};
const near = (axis: number, noiseAxis: number, noise: number) => {
  const v = basis(axis);
  v[noiseAxis] = noise;
  return v;
};

interface R {
  id: string;
  title?: string;
  embedding?: number[] | null;
}

beforeEach(() => {
  delete process.env.DIVERSITY_HOME_FEED_LAMBDA;
  delete process.env.DIVERSITY_HOME_FEED_K;
  delete process.env.DIVERSITY_HOME_FEED_SIM_THRESHOLD;
  delete process.env.DIVERSITY_MORE_LIKE_THIS_LAMBDA;
  delete process.env.DIVERSITY_RECIPE_SECTIONS_LAMBDA;
});

describe('diversifyForSurface (TB6.2)', () => {
  it('preserves length on every fixture', () => {
    const items: R[] = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`,
      title: `r${i}`,
      embedding: basis(i % 5),
    }));
    expect(diversifyForSurface(items, 'home-feed').length).toBe(10);
    expect(diversifyForSurface(items, 'more-like-this').length).toBe(10);
    expect(diversifyForSurface(items, 'recipe-sections').length).toBe(10);
  });

  it('returns identical reference-free copy on length ≤ 1', () => {
    expect(diversifyForSurface([], 'home-feed')).toEqual([]);
    const single: R[] = [{ id: 'a', title: 'a' }];
    const out = diversifyForSurface(single, 'home-feed');
    expect(out).toEqual(single);
  });

  it('all-null embeddings → falls through to title-signature stopgap', () => {
    const items: R[] = [
      { id: 'a', title: 'soy honey glazed' },
      { id: 'b', title: 'soy honey teriyaki' }, // title-twin
      { id: 'c', title: 'lentil curry' },
      { id: 'd', title: 'mushroom risotto' },
    ];
    const out = diversifyForSurface(items, 'home-feed');
    const ia = out.findIndex((x) => x.id === 'a');
    const ib = out.findIndex((x) => x.id === 'b');
    expect(ib).toBeGreaterThan(ia + 1); // title-signature defers near-twin
  });

  it('non-null embeddings → MMR defers near-twin past orthogonal', () => {
    const items: R[] = [
      { id: 'top', title: 'a', embedding: basis(0) },
      { id: 'twin', title: 'b', embedding: near(0, 1, 0.05) },
      { id: 'far', title: 'c', embedding: basis(5) },
    ];
    const out = diversifyForSurface(items, 'home-feed');
    const iTwin = out.findIndex((x) => x.id === 'twin');
    const iFar = out.findIndex((x) => x.id === 'far');
    expect(iFar).toBeLessThan(iTwin);
  });

  it('respects per-surface lambda — more-like-this (λ=0.9) keeps near-twin closer to top than recipe-sections (λ=0.5)', () => {
    // With lambda override removed (high simThreshold so hard-skip doesn't fire),
    // more-like-this should rank near-twin higher than recipe-sections does.
    const items: R[] = [
      { id: 'top', title: 'a', embedding: basis(0) },
      { id: 'twin', title: 'b', embedding: near(0, 5, 0.1) }, // cosine ~0.995, under 1.01 threshold
      { id: 'far', title: 'c', embedding: basis(2) },
      { id: 'far2', title: 'd', embedding: basis(3) },
      { id: 'far3', title: 'e', embedding: basis(4) },
    ];
    process.env.DIVERSITY_MORE_LIKE_THIS_SIM_THRESHOLD = '1.01';
    process.env.DIVERSITY_RECIPE_SECTIONS_SIM_THRESHOLD = '1.01';
    const moreLike = diversifyForSurface(items, 'more-like-this');
    const sections = diversifyForSurface(items, 'recipe-sections');

    const moreLikeTwinIdx = moreLike.findIndex((x) => x.id === 'twin');
    const sectionsTwinIdx = sections.findIndex((x) => x.id === 'twin');
    expect(moreLikeTwinIdx).toBeLessThanOrEqual(sectionsTwinIdx);
  });

  it('ENV override on the surface flows through', () => {
    // Set lambda=1.0 on home-feed; near-twin should NOT be deferred
    // (relevance dominates entirely).
    process.env.DIVERSITY_HOME_FEED_LAMBDA = '1.0';
    process.env.DIVERSITY_HOME_FEED_SIM_THRESHOLD = '1.01';
    const items: R[] = [
      { id: 'top', title: 'a', embedding: basis(0) },
      { id: 'twin', title: 'b', embedding: near(0, 1, 0.05) },
      { id: 'far', title: 'c', embedding: basis(5) },
    ];
    const out = diversifyForSurface(items, 'home-feed');
    expect(out.map((x) => x.id)).toEqual(['top', 'twin', 'far']);
  });

  it('idempotent — diversifying an already-diverse list does not reorder it', () => {
    const items: R[] = [
      { id: 'a', title: 'a', embedding: basis(0) },
      { id: 'b', title: 'b', embedding: basis(1) },
      { id: 'c', title: 'c', embedding: basis(2) },
      { id: 'd', title: 'd', embedding: basis(3) },
    ];
    const once = diversifyForSurface(items, 'home-feed').map((x) => x.id);
    const twice = diversifyForSurface(
      diversifyForSurface(items, 'home-feed'),
      'home-feed',
    ).map((x) => x.id);
    expect(once).toEqual(twice);
  });
});
