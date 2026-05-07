// ROADMAP 4.0 N1.2 — cap test: no parallel RecommenderEvent sibling tables.
//
// IG9.1 / WK13.1 / HX7.1 / RD7.1 originally planned their own per-surface
// event tables (`IngredientRecommenderEvent`, `WeekPlanEvent`,
// `HomeSurfaceEvent`, `RecommenderEventOutcome`-as-separate). N1.1 unified
// these onto the existing `RecommenderEvent` table with a `surface`
// discriminator embedded in `contextSnapshot`.
//
// This test pins the unification: only the canonical Recommender models +
// pre-existing webhook/surface tables are allowed. New per-surface event
// tables fail this cap until they're folded into the unified table.

import * as fs from 'fs';
import * as path from 'path';

const SCHEMA_PATH = path.resolve(
  __dirname,
  '../../prisma/schema.prisma',
);

/** Models that pre-date N1.1 and serve a different purpose (webhooks, etc). */
const ALLOWED_EVENT_MODELS: ReadonlySet<string> = new Set([
  'StripeWebhookEvent', // payment audit
  'RevenueCatWebhookEvent', // payment audit
  'CravingSearchEvent', // older surface, not recommender-typed
  'SurfaceEvent', // Tier B impression tracking — distinct from RecommenderEvent
  'RecommenderEvent', // the unified recommender table
  'RecommenderRunnerUp', // 1-to-many sibling for runner-up recipes
  'RecommenderEventOutcome', // 1-to-1 outcome attribution
]);

function listModels(): string[] {
  const src = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const out: string[] = [];
  const re = /^model\s+([A-Za-z0-9_]+)\s*\{/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

const BANNED_PATTERNS = [
  /RecommenderEvent$/, // any sibling like IngredientRecommenderEvent etc
  /PlanEvent$/, // WeekPlanEvent / DayPlanEvent etc
  /SurfaceEvent$/, // HomeSurfaceEvent / RecipeSurfaceEvent etc — must use surface discriminator
];

describe('N1.2 — only one RecommenderEvent table (no per-surface siblings)', () => {
  const models = listModels();

  it('schema.prisma has the canonical RecommenderEvent + sibling models', () => {
    expect(models).toContain('RecommenderEvent');
    expect(models).toContain('RecommenderRunnerUp');
    expect(models).toContain('RecommenderEventOutcome');
  });

  it('no new per-surface event tables sprout', () => {
    const violations: string[] = [];
    for (const name of models) {
      if (ALLOWED_EVENT_MODELS.has(name)) continue;
      for (const re of BANNED_PATTERNS) {
        if (re.test(name)) {
          violations.push(`${name} (matches /${re.source}/)`);
          break;
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `N1.2: new per-surface event tables found — fold them into the unified RecommenderEvent table:\n` +
          violations.map((v) => `  - ${v}`).join('\n'),
      );
    }
  });

  it('the canonical sibling list cannot grow without a planning update', () => {
    // Pin the count so adding a new model under "allowed" requires updating
    // both the cap test AND the planning doc that justifies it.
    expect(ALLOWED_EVENT_MODELS.size).toBe(7);
  });
});
