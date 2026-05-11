# Post-launch roadmap

Single source of truth for every roadmap item gated on **production
traffic, launch volume, or post-launch dogfood data**. Items here can't
be unblocked by writing more code pre-launch — each waits on a real-world
signal. Compiled from ROADMAP_4.0.md on 2026-05-11; update both files
when an item ships or its gate changes.

> **How to use this doc:** scan the section that matches the trigger
> that just fired (e.g., "launch event" or "30 days of TB3 logging") and
> work the items in priority order within that section. Each entry
> includes the gate, the reversal-trigger condition that fires it, and
> the upgrade / shipping playbook.

---

## Timeline overview

| Window | Gate | Items |
|---|---|---|
| **Day 0** | App Store launch | M4 post-launch feeds activate |
| **Week 1** | Real production traffic | Q4 SLO baseline + alert thresholds |
| **Week 2** | 14 days of HX7 events | HX1.5 Stretch+PlateOfWeek ablation |
| **Week 3-4** | First-week cost data | Q9 cost telemetry digest |
| **Month 1** | First-month production load | Q2 query-plan audit, **U20** Anthropic SDK upgrade, **U25** Prisma index audit |
| **Month 1** | 30 days of TB3 logging | R14 retire rule-based 70/30 scorer |
| **Month 1** | Founder dogfood | T4.2 → T5.1/T5.2/WK12.1 cascade |
| **Month 2-3** | 2mo of Feed 3 running | M7 Mobbin decision |
| **Month 2-3** | ≥8 measured proposals in ledger | M6 quarterly self-audit recursion |
| **Quarter 2+** | Major-version stability window | **U26** Prisma 5 → 7 upgrade |
| **Volume-gated** | ≥50K RecommenderEvent rows | TB5.1/TB5.2 distill recommender |
| **Engagement-gated** | Real engagement data | F1/F2/F3 refinements, F7 video decision |
| **Calendar gate** | Dec 28 | J13 Sazon Wrapped public reveal |
| **Founder-decision** | User picks the lane | Manual ops cascade (Spanish/Brazil/France/G3+G4+G7/G11.x/Family Cooking) |

---

## Day 0 — Automatic activation on launch

### M4: Post-launch feeds (review scanner + Coach patterns)

**Status:** code shipped 2026-05-10 (commit `3b6fb00`); cron lies dormant
until App Store launch volume arrives.

**Gate:** **App Store launch.** Feed 4 (review scanner) needs live App
Store + Play Store IDs flowing through AppFollow; Feed 8 (Coach query
patterns) needs post-launch Coach query volume to cluster.

**What fires automatically:**
- Cron `self-improvement-post-launch-feeds` (daily 04:30 UTC) calls
  both feeds.
- `runReviewScannerFeed` returns `status=skipped` pre-launch when
  AppFollow returns empty; activates the moment IDs ship.
- `runCoachPatternsFeed` writes meta-only aggregations
  (`char_count` + `has_attached_recipe` + intent cluster + UTC hour
  bucket) — **body never persisted** (privacy guardrail).

**Verification:** within the first 7 days post-launch, confirm both
feeds produce non-skipped output and the markdown digests render.

---

## Week 1 — Production traffic baseline

### Q4: Error budget / SLO instrumentation

**Status:** code-gateable; threshold setup deferred.

**Gate:** **Real production traffic.** Sentry transactions + route
wrappers can ship pre-launch, but alerting thresholds against zero data
pick arbitrary noise floors.

**Trigger:** ≥14 days of post-launch traffic to baseline p95/error-rate
distributions. Set alert thresholds at p99 + 2σ.

**Playbook:**
1. Wrap golden-signal routes with `Sentry.startSpan` transactions:
   - `/api/recipes/home-feed`, `/api/recipes/recipe-of-the-day`
   - `/api/meal-plan/weekly`, `/api/meal-plan/daily`
   - `/api/today/...`, `/api/coach/...`
2. Track: crash-free session %, p95 latency per top-10 route,
   `/api/recipes` error rate, AI provider fallback rate, ranker
   low-confidence rate.
3. After 14 days, compute p99 + 2σ from real distributions; write to
   `docs/SLO.md`.
4. Wire alerts on threshold breach.

**Test:** `backend/__tests__/quality/sloInstrumentation.test.ts` — every
golden-signal route has a `Sentry.startSpan(...)` wrapper.

---

## Week 2 — First metric-gated decisions

### HX1.5: Stretch + PlateOfWeek ablation wiring

**Status:** analyzer + 8/8 tests shipped 2026-05-08; per-surface
wiring is the gated follow-up.

**Gate:** **HX7 events flowing for 14 days.** Need a 50/50 hide/show
session log for both surfaces before the per-surface tap-through can
be computed.

**Trigger:** 14 days after HX7 events go live (HX7.1 shipped 2026-05-06
→ gate fires ~2026-05-20).

**Playbook:**
1. Confirm `homeSurfaceEvent` is logging both `shown` and `tapped` for
   `stretch` + `plate-of-week` surfaces.
2. Run `homeSurfaceCounterfactual.computeRetireDecisions()` against the
   last 14 days.
3. For each surface: if `retire: true` AND `shownCount >= minSample`,
   strip it from `index.tsx`.
4. Document the decision in `.context/learnings/2026-QN-stretch-plateofweek-decision.md`.

---

## Week 3-4 — Cost monitoring

### Q9: Cost telemetry dashboard

**Status:** aggregator code shipped 2026-05-10; weekly digest renders
zeros pre-launch.

**Gate:** **Real Anthropic + Cloudinary + server spend volume.**
Pre-launch the per-feed costs are zero — no live coach traffic, no
synthesis cron output yet meaningful.

**Trigger:** ≥7 days of post-launch traffic with non-trivial Coach +
AI-recipe + synthesis spend.

**Playbook:**
1. Wire actual provider-spend ingestion (Anthropic billing API,
   Cloudinary usage API, PM2 process stats).
2. Weekly digest writes to `.context/learnings/cost-<week>.md`.
3. Add a budget alert: weekly delta > 30% triggers a Telegram ping.

**Test:** `backend/__tests__/services/costTelemetry.test.ts` — aggregator
math + digest renders + kill switch.

---

## Month 1 — Production-load performance

### Q2: Database query-plan audit

**Status:** deferred — not started.

**Gate:** **Production traffic / real row counts.** EXPLAIN ANALYZE
against the seeded dev DB picks noise — Postgres planners switch
strategies above ~10K rows.

**Trigger:** post-launch + first month of cohort growth (representative
volume on staging or production).

**Playbook:**
1. EXPLAIN ANALYZE the top-10 slowest backend routes (read from
   Sentry transaction p95 ranking).
2. Document missing composite indexes, accidental seq scans on large
   tables, N+1 patterns hidden by Prisma `include`.
3. Add indexes via Prisma migration; record before/after timings in
   `backend/docs/query-plans/<route>.md`.
4. Run a benchmark suite confirming no regression on the existing fast
   paths.

**Test:** `backend/__tests__/quality/queryPlanAudit.test.ts` — static
check that every model with >10K row potential has an index covering
the top-2 query patterns.

---

### U20 — Anthropic SDK 0.68 → 0.95

**Status:** deferred to first month post-launch. Freeze ratchet pins
`^0.68.0` in `package.json`.

**Why deferred:**
- Current SDK works for every shipped Coach + Recipe-generation flow.
- 0.95 adds model-version flexibility (Opus 4.7 / Sonnet 4.6 / Haiku 4.5
  routing surface) we don't actively need at launch.
- Breaking changes around `messages.create` tool-use response shape:
  `ToolUseBlock.input` was `unknown`, now strictly typed.
- Coach is the highest-value Pro feature. A regression here loses
  paying users — pre-launch is the worst time to take that risk.

**Reversal trigger** — revisit when ANY of:
- We need a model version (Opus 4.7, Sonnet 4.6) the current SDK can't
  reach.
- Anthropic deprecates the 0.6x line.
- The 0.95 SDK ships a feature we want (extended thinking, prompt
  caching v2, fine-grained tool streaming).

**Upgrade playbook:**
1. Bump `@anthropic-ai/sdk` to latest in `backend/package.json`.
2. Run the full Coach test suite: `npm test -- coach`.
3. Type-check: `tsc --noEmit -p tsconfig.json`.
4. Fix any `ToolUseBlock` consumers (typically 2-3 sites).
5. Deploy to staging, run a 24h smoke against the live Coach surface.
6. Ship behind a feature flag for 1 week before flipping default.

---

### U25 — Prisma index audit

**Status:** deferred to first month post-launch.

**Why deferred:**
- 146 indexes for 92 models (ratio 1.6) — under-indexed by the rough
  heuristic, but EXPLAIN-driven analysis requires real production
  query patterns + load. Without launch traffic, any guess is fiction.
- Current p95 latency is acceptable in dev. Real bottlenecks will
  surface from logs + Sentry once we have N=100+ active users.

**Reversal trigger** — run the audit at the first of:
- p95 latency on `/api/recipes/home-feed` > 500ms sustained for 1 hour.
- p95 latency on `/api/meal-plan/weekly` > 800ms sustained for 1 hour.
- DB CPU > 60% sustained for 1 hour.

**Playbook:**
1. Enable Prisma query logging in staging.
2. Mirror a week of production traffic shape (or capture EXPLAIN ANALYZE
   for the top-50 query patterns from logs).
3. For each query >100ms, check if a composite index would help.
4. Add indexes one at a time + benchmark each (an over-indexed table
   slows writes; a single bad index can hurt more than it helps).
5. Output: `prisma/index-audit-2026-Q3.md` with the recommended adds +
   measured latency deltas.

---

## Month 1 — Tonight Mode validation cascade

### T4.2 → T5.1/T5.2 → WK12.1

**Status:** all 4 items in Tier Gated, gated on the founder running a
14-day Tonight Mode dogfood.

**Gate:** **14 days of user-driven dogfood journaling** with metric
thresholds: acceptance rate ≥60%, swap-then-accept ≥75%, escape rate
<25%.

**Trigger:** founder commits to using Tonight Mode exclusively for 14
days and writes a daily one-line journal entry.

**Day-14 decision gate:**
- If all three thresholds clear → promote T5.1/T5.2 (freemium gating) +
  WK12.1 (Tonight↔Week dovetail) to active work.
- If any threshold fails → archive the `tonight-mode` branch entirely.

**T5.1/T5.2 playbook** (only if T4.2 passes):
- T5.1: Free tier = Tonight only. Add `fullIA: { free: false, premium:
  true }` to `subscriptionTierService` feature matrix.
- T5.2: Paywall hero copy → *"Sazon picks dinner. Membership lets you
  plan the week, build your library, and chat with Sazon anytime."*

**WK12.1 playbook** (only if T4.2 passes):
- Tonight accept writes to Week-plan's tonight slot.
- Detect conflicts with tomorrow's Week-planned dinner; suppress or
  propose complementary candidate.

---

### R14: Retire rule-based 70/30 scorer

**Status:** Tier Gated. TB2.2 live in `/api/tonight/proposal` ✓ (shipped
2026-05-06); awaiting 30 days of TB3 logging.

**Gate:** **TB2.2 live AND ≥30 days of TB3 production logging** showing
the new pipeline matches/beats the rule-based scorer on home-feed
acceptance rate.

**Trigger:** ~2026-06-05 at earliest (30 days after TB3 shipped).

**Playbook:**
1. Demote `backend/src/utils/scoring/*` from primary ranker to
   *fallback only* — called when TB2 returns `ranker_unavailable` or
   `low_confidence`.
2. Move all home-feed candidate selection in `useRecipeFetcher` from
   rule-based → TB1 retrieval + TB2 rerank.
3. Delete unused intermediate scoring helpers that no callers reference
   after the demotion.
4. Document the fallback contract.

**Test:** `backend/__tests__/services/scoringFallback.test.ts` — when
TB2 returns `low_confidence`, the rule-based scorer fires; when TB2
returns 200, rule-based is never invoked.

---

## Month 2-3 — Strategic decisions

### M6: Quarterly self-audit (recursion enabled)

**Status:** code shipped 2026-05-10; lies dormant until ledger
threshold.

**Gate:** **≥8 measured proposals** in
`.context/learnings/proposals-outcomes.md`. Below that threshold the
training signal is too sparse for Opus to weight prompt revisions
reliably.

**Trigger:** M5's monthly measurement loop accrues outcomes; gate fires
when the ledger reaches 8 tagged rows (post-launch given the metric
provider is a placeholder until PostHog/RevenueCat ships).

**Playbook:** quarterly cron (1st of Jan/Apr/Jul/Oct, 07:00 UTC) calls
Opus to draft `synthesis-prompt-v(N+1)-candidate.md`. **No auto-
promotion** — human renames to drop the `-candidate.md` suffix.

---

### M7: Mobbin / paid design intel decision

**Status:** deferred — decision gate, not coding work.

**Gate:** **2 months of free Feed 3 running** (M1 launched 2026-05-06
→ revisit window opens ~2026-07-06).

**Trigger:** 2 months of free Feed 3 output to evaluate against.

**Decision criteria:** does Mobbin Pro ($60/mo) measurably improve
proposal quality?
- Count of accepted proposals/month from Feed 3
- Win-rate of Feed-3-sourced shipped proposals
- Mobbin pays for itself if Feed-3 win-rate × proposal value clears
  $60/mo.

**Output:** subscribe + wire as richer Feed 3, OR document why-not in
`.context/learnings/2026-QN-mobbin-decision.md` and revisit next
quarter.

---

## Quarter 2+ — Major upgrades

### U26 — Prisma 5.22 → 7.x

**Status:** deferred to T+1 month minimum, possibly longer. Freeze
ratchet pins `^5.22.0` (client) + `^5.7.1` (CLI).

**Why deferred:**
- Two majors behind. Breaking changes touch `$transaction` callback
  shape, raw query helpers, type generation strategy, and (in 7.x)
  default behavior for `findMany` cursor pagination.
- No user-facing benefit at launch — Prisma 5 ships every query we run.
- High blast radius: failure mode is silent runtime errors after a
  successful build, not compile-time failures.

**Reversal trigger** — bump on any of:
- A security advisory affecting Prisma 5.
- A feature we genuinely need (Prisma 7 ships type-safe raw SQL via
  `Prisma.sql` template tags + the new query optimizer).
- The Prisma 5 line falls out of maintenance support.

**Upgrade playbook:**
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

## Volume-gated — TB5 distillation

### TB5.1 / TB5.2 — Distill recommender to specialized model

**Status:** Tier Gated.

**Gate:** **≥50,000 `RecommenderEvent` rows with outcomes.** Below that
threshold the training set is too sparse and noisy — any specialized
model would overfit. The LLM ranker (TB2) handles the cold-start
period; this tier fires only when real interaction volume justifies
distillation.

**Trigger:** ledger row count crosses 50K.

**Playbook:**
- TB5.1: Train two-tower user × recipe model on real interactions.
  Holdout test: model's top-1 accuracy on held-out 20% of
  `RecommenderEvent` rows ≥ LLM ranker's accuracy. If not, ship as
  ensemble (LLM tiebreaks low-confidence specialized-model picks).
- TB5.2: Cost rollover after specialized model proves out. LLM call
  rate drops from 100% of proposals to ~20% (only low-confidence +
  edge cases). Token cost expected to fall ~80%.

**Verification:** track cost/proposal week-over-week post-rollout;
assert ≥70% reduction within 30 days. If not, the specialized model is
leaking to LLM fallback too often — investigate before claiming win.

---

## Engagement-data refinements (Tier F follow-ups)

Each shipped F-tier item carried a "post-launch" refinement bullet
that's gated on real engagement data.

### F1 — Friends feed v2

**Trigger:** ≥100 active users with ≥1 follow each, ≥4 weeks of feed
engagement data.

**Scope:**
- Suggested follows (based on cuisine affinity overlap).
- Push notifications when a followed friend shares a plate.
- Privacy controls: block, mute, request-to-follow.

### F2 — Dessert breakdowns refinement

**Trigger:** ≥4 weeks of cuisine-dessert CTR data.

**Scope:**
- Re-rank desserts within each cuisine by CTR.
- Retire low-engagement rows.
- Expand under-represented cuisines once usage data shows demand.

### F3 — Appliance tagger v2

**Trigger:** ≥10K recipes tagged + user appliance filter usage data.

**Scope:**
- ML-based tagger (current is rule-based heuristic).
- Brand-name detection beyond major SKUs (Ninja Creami / Air Fryer /
  etc.).
- Frontend filter chip wiring on home + cookbook (D6 dependency).

### F7 — Cooking technique videos

**Status:** Tier Gated.

**Gate:** **(a) demand signal** — ≥X% abandonment-mid-cook on
technique-heavy recipes from `CookingLog` data, AND **(b)**
production-budget approval.

**Trigger:** both gates fire concurrently.

**Decision:** speculative video production before either signal lands
is wasted spend. Document the demand-signal review in
`.context/learnings/2026-QN-technique-video-decision.md`.

---

## Calendar gate

### J13 — Sazon Wrapped (yearly retrospective)

**Status:** engine + surface shipped 2026-05-07; surface dormant outside
the Dec 28 – Jan 2 window.

**Gate:** calendar — public reveal **December 28**, soft-launch internal
**mid-November**, build began September.

**Trigger:** local-date enters Dec 28 – Jan 2 window AND user has cooked
≥1 recipe this year AND year hasn't been seen yet (AsyncStorage
`@sazon/wrapped/year_seen` guard).

**Playbook:** no engineering needed at trigger time — the surface
auto-renders via `useSazonWrappedGating`. Only the per-card image
capture (ViewShot) is pending v2 polish.

---

## Founder-decision gates (manual ops)

These fire when the founder explicitly commits to a market /
partnership / spend. None are blocked on engineering — code is ready
or there's no code at all (process / partnership / content).

### Territory rollouts (chained dependencies)

| Item | Gate | Engineering |
|---|---|---|
| **i18n-OPS1.1/.2** Spanish store submission | "Pursue Spanish markets" | ~1 hr EAS submit + App Store/Play Console toggles |
| **i18n-OPS2.1/.2** Spanish screenshots | OPS1 ships + design budget | Design work, not engineering |
| **I1.3** pt-BR metadata | "Pursue Brazil" + OPS1 first | Mirror OPS1 for pt-BR |
| **I1B.5** French metadata | First-month signal from pt-BR | Mirror OPS1 for fr-FR + fr-CA |
| **I3.4** PPP-aware pricing | Brazil/MX rollout decision | RevenueCat dashboard config (~1 hr) |
| **G1.3** Diaspora paid social | $2K budget allocation | 2-4 week observation |

### Funding model

| Item | Gate |
|---|---|
| **I3.2** Founding Eater one-time IAP | RevenueCat product + App Store listing + legal review of badge/credits language |
| **I3.5** "Why we're free" disclosure surface | I3.2 ships first |
| **I2.5** Postal-code → store directory | I2.1-I2.4 ship + ≥2K non-en-US users + Google Places budget (~$200/mo) |
| **I2.6** Affiliate deeplinks per market | I2.5 + per-market partner agreement + legal review |

### Content authority

| Item | Gate |
|---|---|
| **G3.1** 12 cuisine cultural primers | Editorial sprint budget + cuisine selection sign-off |
| **G3.2** 50 ingredient deep-dives | Editorial budget |
| **G3.3** Founder-trip travel essays | Per-trip basis |
| **G4.1/.2** Creator outreach + co-curated collections | 6-month founder relationship bandwidth |
| **G5.1** "Make this at home" restaurant pilot | 5-restaurant partnership sign-off |
| **G5.2** Cooking-school alumni network | Founder soft outreach bandwidth |

### Beyond-subscription revenue

| Item | Gate |
|---|---|
| **G6.1** Affiliate beyond grocery | Bookshop/Amazon/spice-brand affiliate programs |
| **G6.2** Sponsored ingredient discovery | Brand partner agreements + quarterly honesty audit |
| **G6.3** B2B licensing of adjacency engine | ≥6mo of trained adjacency-engine data + ≥10K MAU |
| **G6.4** Travel-tourism partnerships | G2.1 ships + ≥1K MAU using travel mode |

### Community

| Item | Gate |
|---|---|
| **G7.1** 4-city Founders' Dinners | $3-5K/city × 4 + founder travel + community-management bandwidth |
| **G7.2** Regional Discord/Telegram channels | Founder + early team bandwidth |

### Off-app coach (WhatsApp + web widget + voice)

| Item | Gate |
|---|---|
| **G11.1/.3/.6** WhatsApp fridge-photo + cross-channel context + privacy disclosure (paired PR) | ElevenAgents account + WhatsApp Business API + ElevenLabs voice subscription |
| **G11.2** Web widget on sazonchef.com | G3.1 has ≥3 cuisine primers live |
| **G11.4** ElevenLabs voice replies | S3 in-app TTS proven (✓ already shipped) + ElevenLabs voice subscription |
| **G11.5** Location-aware WhatsApp recs | G2.1-G2.2 ship |

### Family Cooking

**Gate:** **(a) demand signal** — ≥1 tracked /build-a-plate-family
deep-link hit per week OR explicit user request through Sazon Coach,
AND **(b) UX redesign passes the joy-bar test** — sketch/prototype a
multi-eater household would screenshot and send to a friend.

The 2026-05-09 build was removed because the slot-picker × N-plates
surface was too complex for the lifestyle-eater persona.

---

## Freeze ratchets

A test (`backend/__tests__/quality/postLaunchUpgradeFreeze.test.ts`)
pins the current pinned versions of `@anthropic-ai/sdk`, `prisma`, and
`@prisma/client`. The test FAILS if any of these change without a
paired update to this doc — forcing the reversal rationale to be
written before the upgrade lands.
