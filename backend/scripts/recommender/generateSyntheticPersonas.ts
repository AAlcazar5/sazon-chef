// ROADMAP 4.0 TB4.1 — Synthetic persona generator.
//
// Deterministic test fixtures only — these never enter training. The
// persona space covers Sazon's target distribution along cuisine,
// dietary, skill, household, and cook-frequency axes so the regression
// test can stress-test the pipeline before real users hit it.

import { EMBEDDING_DIM } from '../../src/services/recommender/embeddingStore';

export interface Persona {
  id: string;
  cuisinePreferences: string[];
  allergies: string[];
  dietary: string[];
  skillLevel: 'beginner' | 'home_cook' | 'confident' | 'chef';
  householdSize: number;
  cookFrequency: 'rare' | 'weekend' | 'weeknight' | 'daily';
  tasteSeed: number[];
}

interface Options {
  seed: number;
  count?: number;
}

const CUISINES = [
  'italian',
  'mexican',
  'thai',
  'japanese',
  'korean',
  'indian',
  'french',
  'mediterranean',
  'persian',
  'vietnamese',
  'american',
  'chinese',
];

const ALLERGENS = ['peanut', 'tree_nut', 'shellfish', 'soy', 'gluten', 'dairy'];
const DIETARY = ['vegetarian', 'vegan', 'pescatarian', 'low_carb', 'paleo'];
const SKILLS: Persona['skillLevel'][] = [
  'beginner',
  'home_cook',
  'confident',
  'chef',
];
const FREQUENCIES: Persona['cookFrequency'][] = [
  'rare',
  'weekend',
  'weeknight',
  'daily',
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(rng: () => number, arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

export function generateSyntheticPersonas(opts: Options): Persona[] {
  const count = opts.count ?? 100;
  const personas: Persona[] = [];

  for (let i = 0; i < count; i++) {
    // Per-persona RNG: seed + i so generation is deterministic and
    // resilient to count changes.
    const rng = mulberry32(opts.seed * 1009 + i + 1);

    const nCuisines = 2 + Math.floor(rng() * 3); // 2..4
    const cuisines = pickN(rng, CUISINES, nCuisines);

    // ~20% of personas have allergies (chance gate).
    const allergies = rng() < 0.25 ? pickN(rng, ALLERGENS, 1 + Math.floor(rng() * 2)) : [];

    // ~30% have dietary tags.
    const dietary = rng() < 0.3 ? pickN(rng, DIETARY, 1) : [];

    const skillLevel = pick(rng, SKILLS);
    const householdSize = 1 + Math.floor(rng() * 5);
    // Bias toward weeknight (~30%) so the test gate is robust.
    const freqRoll = rng();
    const cookFrequency: Persona['cookFrequency'] =
      freqRoll < 0.3
        ? 'weeknight'
        : freqRoll < 0.6
          ? 'weekend'
          : freqRoll < 0.85
            ? 'daily'
            : 'rare';

    const tasteSeed: number[] = [];
    for (let j = 0; j < EMBEDDING_DIM; j++) {
      tasteSeed.push(rng() * 2 - 1);
    }
    // Add an offset by persona index so two personas can't collide
    // even if RNG state degenerates.
    tasteSeed[0] = i / count - 0.5;

    personas.push({
      id: `synthetic-${i.toString().padStart(3, '0')}`,
      cuisinePreferences: cuisines,
      allergies,
      dietary,
      skillLevel,
      householdSize,
      cookFrequency,
      tasteSeed,
    });
  }
  return personas;
}

if (require.main === module) {
  const seed = Number(process.env.PERSONAS_SEED ?? 42);
  const out = generateSyntheticPersonas({ seed });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(out, null, 2));
}
