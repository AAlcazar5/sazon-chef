// backend/src/services/cuisineCoherence.ts
// Group 10X Phase 2 — Cuisine coherence rules and scoring.

export type ClashPair = [string[], string[]];

export const CUISINE_CLASHES: ClashPair[] = [
  [['Korean', 'Asian'], ['Argentinian', 'South American']],
  [['Mexican', 'Latin'], ['Japanese', 'Asian']],
  [['Indian'], ['Italian']],
  [['French', 'European'], ['Vietnamese', 'Asian']],
];

interface ComponentWithCuisineTags {
  cuisineTags: string[];
}

export const componentsClash = (
  a: ComponentWithCuisineTags,
  b: ComponentWithCuisineTags
): boolean => {
  if (a.cuisineTags.length === 0 || b.cuisineTags.length === 0) return false;

  for (const [setA, setB] of CUISINE_CLASHES) {
    const aInSetA = a.cuisineTags.some((t) => setA.includes(t));
    const bInSetB = b.cuisineTags.some((t) => setB.includes(t));
    const aInSetB = a.cuisineTags.some((t) => setB.includes(t));
    const bInSetA = b.cuisineTags.some((t) => setA.includes(t));

    if ((aInSetA && bInSetB) || (aInSetB && bInSetA)) return true;
  }
  return false;
};

export const plateCoherenceScore = (
  components: ComponentWithCuisineTags[]
): number => {
  if (components.length === 0) return 0;
  if (components.length === 1) return 1;

  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      if (componentsClash(components[i], components[j])) return 0;
    }
  }

  const allTags = components.flatMap((c) => c.cuisineTags);
  const tagCounts = new Map<string, number>();
  for (const tag of allTags) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const maxShared = Math.max(0, ...tagCounts.values());
  const sharedFraction = maxShared / components.length;

  return Math.min(1, 0.5 + sharedFraction * 0.5);
};
