// Tier TB6.1 — embedding-cosine MMR diversifier tests.
//
// Hand-built 64-dim embeddings make the cosine math fully predictable:
//   e0 = [1, 0, 0, ...] (basis along axis 0)
//   e1 = [0, 1, 0, ...] (orthogonal)
//   e0_twin = nearly-parallel to e0 (cosine ≈ 0.97)
//   e0_kin  = mildly aligned to e0 (cosine ≈ 0.71)
//
// Tests verify every contractual case from ROADMAP_4.0 Tier TB6.1.

import {
  diversifyByEmbedding,
  type DiversifyByEmbeddingItem,
} from '../../../src/services/recommender/diversifyByEmbedding';

const DIM = 64;

function basis(axis: number): number[] {
  const v = new Array(DIM).fill(0);
  v[axis] = 1;
  return v;
}

/** Build a vector primarily along `axis` with a tiny secondary along `noiseAxis`. */
function near(axis: number, noiseAxis: number, noise: number): number[] {
  const v = basis(axis);
  v[noiseAxis] = noise;
  return v;
}

interface Recipe extends DiversifyByEmbeddingItem {
  id: string;
}

describe('diversifyByEmbedding (TB6.1)', () => {
  describe('(a) MMR formula correctness on 5-recipe fixture', () => {
    // Fixture: 5 recipes, ranks 1-5.
    //  r1: along axis 0 (top relevance)
    //  r2: along axis 0 with tiny noise (cosine to r1 ≈ 0.997 → near-twin)
    //  r3: along axis 0 with bigger noise (cosine to r1 ≈ 0.71 → semantic-twin-not-title-twin)
    //  r4: along axis 1 (orthogonal, cosine 0)
    //  r5: along axis 2 (orthogonal, cosine 0)
    const r1: Recipe = { id: 'r1', title: 'apple pie', embedding: basis(0) };
    const r2: Recipe = { id: 'r2', title: 'cherry tart', embedding: near(0, 5, 0.08) };
    const r3: Recipe = { id: 'r3', title: 'pumpkin loaf', embedding: near(0, 1, 1) };
    const r4: Recipe = { id: 'r4', title: 'fish soup', embedding: basis(1) };
    const r5: Recipe = { id: 'r5', title: 'lentil curry', embedding: basis(2) };

    it('top-1 always emits first', () => {
      const out = diversifyByEmbedding([r1, r2, r3, r4, r5]);
      expect(out[0].id).toBe('r1');
    });

    it('near-twin (r2, cosine ≈ 0.997) defers past r1', () => {
      const out = diversifyByEmbedding([r1, r2, r3, r4, r5]);
      const i1 = out.findIndex((x) => x.id === 'r1');
      const i2 = out.findIndex((x) => x.id === 'r2');
      expect(i2).toBeGreaterThan(i1 + 1); // r2 doesn't sit immediately after r1
    });

    it('semantic-twin without title match (r3, cosine ≈ 0.71) defers below an orthogonal candidate', () => {
      // Even though r3 ranks above r4/r5, its similarity to r1 should push
      // an orthogonal candidate above it within the first few slots.
      const out = diversifyByEmbedding([r1, r3, r4, r5]);
      const i3 = out.findIndex((x) => x.id === 'r3');
      const i4 = out.findIndex((x) => x.id === 'r4');
      expect(i4).toBeLessThan(i3);
    });
  });

  describe('(b) lambda=1.0 reduces to pure relevance order', () => {
    it('preserves input order at lambda=1.0', () => {
      const items: Recipe[] = [
        { id: 'a', title: 'a', embedding: basis(0) },
        { id: 'b', title: 'b', embedding: near(0, 1, 0.1) }, // would normally defer
        { id: 'c', title: 'c', embedding: basis(2) },
        { id: 'd', title: 'd', embedding: basis(3) },
      ];
      const out = diversifyByEmbedding(items, { lambda: 1.0, simThreshold: 1.01 });
      // simThreshold=1.01 disables hard-skip so MMR alone drives order.
      expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('(c) lambda=0.0 reduces to maximum-spread', () => {
    it('picks the orthogonal candidate over the near-twin at lambda=0.0', () => {
      const items: Recipe[] = [
        { id: 'top', title: 't', embedding: basis(0) },
        { id: 'twin', title: 'tw', embedding: near(0, 1, 0.1) },
        { id: 'far', title: 'f', embedding: basis(5) },
      ];
      const out = diversifyByEmbedding(items, { lambda: 0.0, simThreshold: 1.01 });
      // After top emits, both twin and far have rel=0 contribution; max-sim
      // diff favors `far` (orthogonal, sim=0) over `twin` (sim ≈ 0.995).
      expect(out[0].id).toBe('top');
      expect(out[1].id).toBe('far');
      expect(out[2].id).toBe('twin');
    });
  });

  describe('(d) simThreshold hard-skip', () => {
    it('hard-skip fires: near-twin under threshold defers past an orthogonal candidate', () => {
      const items: Recipe[] = [
        { id: 'top', title: 't', embedding: basis(0) },
        { id: 'twin', title: 'tw', embedding: near(0, 1, 0.05) }, // cos ≈ 0.999
        { id: 'far', title: 'f', embedding: basis(5) },
      ];
      const out = diversifyByEmbedding(items, { simThreshold: 0.9 });
      const iTwin = out.findIndex((x) => x.id === 'twin');
      const iFar = out.findIndex((x) => x.id === 'far');
      expect(iFar).toBeLessThan(iTwin);
    });

    it('hard-skip does NOT fire when threshold is above the actual max sim', () => {
      const items: Recipe[] = [
        { id: 'top', title: 't', embedding: basis(0) },
        { id: 'twin', title: 'tw', embedding: near(0, 1, 0.05) },
        { id: 'far', title: 'f', embedding: basis(5) },
      ];
      // With lambda=1.0 + permissive threshold, original order survives.
      const out = diversifyByEmbedding(items, { lambda: 1.0, simThreshold: 1.01 });
      expect(out.map((x) => x.id)).toEqual(['top', 'twin', 'far']);
    });
  });

  describe('(e) null/empty embeddings fall through to title-signature', () => {
    it('all-null embeddings degrade to title-signature without throwing', () => {
      const items: Recipe[] = [
        { id: 'a', title: 'soy honey glazed' },
        { id: 'b', title: 'soy honey teriyaki' }, // title-twin of a
        { id: 'c', title: 'lentil curry' },
        { id: 'd', title: 'mushroom risotto' },
      ];
      expect(() => diversifyByEmbedding(items)).not.toThrow();
      const out = diversifyByEmbedding(items);
      expect(out.length).toBe(items.length);
      // Title-signature defers `b` past `a` since they share the "soy honey" prefix.
      const ia = out.findIndex((x) => x.id === 'a');
      const ib = out.findIndex((x) => x.id === 'b');
      expect(ib).toBeGreaterThan(ia + 1);
    });

    it('mixed null/non-null embeddings does not throw', () => {
      const items: Recipe[] = [
        { id: 'with', title: 'w', embedding: basis(0) },
        { id: 'without1', title: 'wo1' },
        { id: 'with2', title: 'w2', embedding: basis(1) },
        { id: 'without2', title: 'wo2', embedding: null },
        { id: 'without3', title: 'wo3', embedding: [] },
      ];
      expect(() => diversifyByEmbedding(items)).not.toThrow();
      const out = diversifyByEmbedding(items);
      expect(out.length).toBe(items.length);
    });
  });

  describe('(f) deterministic', () => {
    it('repeat invocation with same inputs returns byte-identical output', () => {
      const items: Recipe[] = [
        { id: 'r1', title: 't1', embedding: basis(0) },
        { id: 'r2', title: 't2', embedding: near(0, 1, 0.08) },
        { id: 'r3', title: 't3', embedding: basis(2) },
        { id: 'r4', title: 't4', embedding: basis(3) },
        { id: 'r5', title: 't5', embedding: near(0, 4, 0.5) },
      ];
      const a = diversifyByEmbedding(items).map((x) => x.id);
      const b = diversifyByEmbedding(items).map((x) => x.id);
      const c = diversifyByEmbedding(items).map((x) => x.id);
      expect(a).toEqual(b);
      expect(b).toEqual(c);
    });
  });

  describe('(g) no recipes added or dropped', () => {
    it('out.length === ranked.length on a near-twin-heavy fixture', () => {
      const items: Recipe[] = Array.from({ length: 20 }, (_, i) => ({
        id: `r${i}`,
        title: `recipe ${i}`,
        embedding: near(0, i, 0.01), // all very similar to axis 0
      }));
      const out = diversifyByEmbedding(items);
      expect(out.length).toBe(20);
      const idsIn = items.map((x) => x.id).sort();
      const idsOut = out.map((x) => x.id).sort();
      expect(idsOut).toEqual(idsIn);
    });

    it('out.length === ranked.length on empty input', () => {
      expect(diversifyByEmbedding([])).toEqual([]);
    });

    it('out.length === ranked.length on single-item input', () => {
      const item: Recipe = { id: 'only', title: 'only', embedding: basis(0) };
      expect(diversifyByEmbedding([item])).toEqual([item]);
    });
  });
});
