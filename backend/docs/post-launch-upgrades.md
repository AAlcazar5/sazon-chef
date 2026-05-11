# Post-launch upgrade plan

Tier U Group D U20 / U25 / U26 — three high-blast-radius upgrades
deliberately deferred until **after v1.0 ships**. Each has a freeze
ratchet that pins the current version so accidental partial upgrades
fail CI.

---

## U20 — Anthropic SDK 0.68 → 0.95

**Status:** deferred to first month post-launch.

### Why deferred

- Current SDK works for every shipped Coach + Recipe-generation flow.
- 0.95 adds model-version flexibility (Opus 4.7 / Sonnet 4.6 / Haiku 4.5
  routing surface) we don't actively need at launch.
- Breaking changes around `messages.create` tool-use response shape:
  `ToolUseBlock.input` was `unknown`, now strictly typed.
- Coach is the highest-value Pro feature. A regression here loses
  paying users — pre-launch is the worst time to take that risk.

### Reversal trigger

Revisit when ANY of the following:
- We need a model version (Opus 4.7, Sonnet 4.6) the current SDK can't
  reach.
- Anthropic deprecates the 0.6x line.
- The 0.95 SDK ships a feature we want (extended thinking, prompt
  caching v2, fine-grained tool streaming).

### How to upgrade safely

1. Bump `@anthropic-ai/sdk` to latest in `backend/package.json`.
2. Run the full Coach test suite: `npm test -- coach`.
3. Type-check: `tsc --noEmit -p tsconfig.json`.
4. Fix any `ToolUseBlock` consumers (typically 2-3 sites).
5. Deploy to staging, run a 24h smoke against the live Coach surface.
6. Ship behind a feature flag for 1 week before flipping default.

---

## U25 — Prisma index audit

**Status:** deferred to first month post-launch.

### Why deferred

- 146 indexes for 92 models (ratio 1.6) — under-indexed by the rough
  heuristic, but EXPLAIN-driven analysis requires real production
  query patterns + load. Without launch traffic, any guess is fiction.
- Current p95 latency is acceptable in dev. Real bottlenecks will
  surface from logs + Sentry once we have N=100+ active users.

### Trigger

Run the audit at the first of:
- p95 latency on `/api/recipes/home-feed` > 500ms sustained for 1 hour.
- p95 latency on `/api/meal-plan/weekly` > 800ms sustained for 1 hour.
- DB CPU > 60% sustained for 1 hour.

### How to run

1. Enable Prisma query logging in staging.
2. Mirror a week of production traffic shape (or capture EXPLAIN ANALYZE
   for the top-50 query patterns from logs).
3. For each query >100ms, check if a composite index would help.
4. Add indexes one at a time + benchmark each (an over-indexed table
   slows writes; a single bad index can hurt more than it helps).
5. Output: `prisma/index-audit-2026-Q3.md` with the recommended adds +
   measured latency deltas.

---

## U26 — Prisma 5.22 → 7.x

**Status:** deferred to T+1 month minimum, possibly longer.

### Why deferred

- Two majors behind. Breaking changes touch `$transaction` callback
  shape, raw query helpers, type generation strategy, and (in 7.x)
  default behavior for `findMany` cursor pagination.
- No user-facing benefit at launch — Prisma 5 ships every query we run.
- High blast radius: failure mode is silent runtime errors after a
  successful build, not compile-time failures.

### Trigger

- A security advisory affecting Prisma 5.
- A feature we genuinely need (Prisma 7 ships type-safe raw SQL via
  `Prisma.sql` template tags + the new query optimizer).
- The Prisma 5 line falls out of maintenance support.

### How to upgrade

1. Bump `prisma` + `@prisma/client` to latest in `backend/package.json`.
2. Run `npx prisma generate` — fix any new type-narrowing errors.
3. Re-run every integration test. Pay special attention to:
   - `$transaction` callback shape (Prisma 6 changed return-type
     inference; explicit annotations may need to be removed).
   - `findMany` cursor semantics (Prisma 7 changed default).
4. Benchmark suite: `findMany` + `$transaction` p99 must not regress
   more than 5%.
5. Stage for 2 weeks before production.

---

## Freeze ratchets

A test (`backend/__tests__/quality/postLaunchUpgradeFreeze.test.ts`)
pins the current pinned versions of `@anthropic-ai/sdk`, `prisma`, and
`@prisma/client`. The test FAILS if any of these change without a
paired update to this doc — forcing the reversal rationale to be
written before the upgrade lands.
