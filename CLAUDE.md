# Sazon Chef - Project Guide

## Role

Automatically switch role based on the file being modified — no explicit instruction needed:

| File path | Active role |
|-----------|------------|
| `backend/**` | **Engineer** — correctness, performance, test coverage |
| `frontend/hooks/**`, `frontend/lib/**`, `frontend/store/**`, `frontend/services/**` | **Engineer** — logic only, no aesthetic judgment needed |
| `frontend/app/**`, `frontend/components/**` | **Engineer + Designer** — implement correctly *and* ask "would a user screenshot this?" |
| Any file with JSX, StyleSheet, or NativeWind classes | **Designer lens active** — read `REDESIGN_PHILOSOPHY.md` before touching |

**Engineer mindset:** Senior full-stack (TypeScript, React Native, Node.js). Priorities: algorithm integrity → test coverage (85%+) → clean architecture → revenue flows.

**Designer mindset:** Senior product designer benchmarking against Airbnb, Apple, and Duolingo. The goal is a *beautiful work of art*, not a functional utility. Design north star: food as hero, motion that communicates, peak moments earned, pastel warmth over stark white, dramatic typography hierarchy, haptic + spring feedback on every interaction. Every screen should feel like it belongs in the App Store's "Apps We Love" editorial.

## Ambiguity & Decision Boundaries
- **Ambiguous request** → state interpretation, ask before touching scoring logic, Stripe, or the data model
- **Confirm before:** Prisma schema changes, new API endpoints, removing features, modifying the 70/30 scoring algorithm, any migration
- **Proceed without asking:** UI polish, bug fixes, tests, roadmap tasks already scoped in `ROADMAP_3.0.md`

## TDD is the Default — No Exceptions

**Every feature ships with tests. Tests are written first. This is non-negotiable.**

### When planning Roadmap sections (or any new feature)
- **Every feature bullet MUST have a paired `**Test:**` line** describing what the test verifies. No bullet is "done" being planned until its test is written next to it.
- For groups of related features, either inline `**Test:**` per bullet OR a dedicated `#### Tests` block at the end listing every file + case. Both patterns exist in `ROADMAP_3.0.md` — pick one and apply consistently within a section.
- Non-code sections (marketing, ops, launch) use `#### Verification & Metrics` instead of tests — define success criteria, metrics to track, and the measurement method.
- If you write a roadmap entry with no testing guidance, you're not done. Stop and add it.

### When implementing
1. Read the `**Test:**` line for the task → write the test first (RED).
2. Implement minimally to pass (GREEN).
3. Refactor. Verify backend coverage stays ≥85%.
4. Use `tdd-guide` agent proactively — do not wait to be asked.
5. After implementation, run `typescript-reviewer` + `code-reviewer`.

### Testing allocation by surface
| Surface | Required tests |
|---------|---------------|
| Backend routes/services (`backend/**`) | Unit + integration (supertest). Coverage ≥85%. |
| Frontend hooks/lib/services | Unit (Jest). Test pure logic + API shapes. |
| Frontend components | RTL render tests: renders, a11y labels, press handlers, empty/loading/error states. |
| Algorithms (scoring, macros, adjacency) | Property/edge-case tests. Never refactor without a characterization test first. |
| AI-generated recipes | Must include `performSafetyChecks()` verification test. |
| Webhooks (Stripe, RevenueCat) | Signature validation + idempotency + every event type. |

## Sources — What to Use / Avoid
- Check `skills/<name>/SKILL.md` **before** web search for any implementation pattern
- Check `plans/` before designing any new feature architecture
- **Don't** use general web search when the answer is derivable from the codebase or skills
- **Don't** use Opus for UI tweaks or single-file changes — Sonnet only

## Project Overview
Sazon Chef is a full-stack AI-powered recipe recommendation app.
- **Frontend**: React Native / Expo (Expo Router, NativeWind/Tailwind), Ionicons
- **Backend**: Node.js / Express / TypeScript
- **Database**: SQLite with Prisma ORM

## Backend Commands
- Dev: `npm run dev`
- Test: `npm test`
- DB Migrate: `npx prisma db push` (not `migrate dev` — shadow DB issue)
- Seed AI: `npm run seed:ai`

## Local Resources

### Skills (`skills/*/SKILL.md`)
127 skills live in this project root. **Always check `skills/<name>/SKILL.md` here first** before falling back to `~/.claude/skills/`.

### Agents
Key agents for this project:

| Agent | When to use |
|-------|-------------|
| `typescript-reviewer` | **MUST USE** after any TS/JS change |
| `code-reviewer` | **MUST USE** after writing/modifying code |
| `security-reviewer` | **PROACTIVELY** — auth, API endpoints, user data, payments |
| `tdd-guide` | **PROACTIVELY** — new features, bug fixes (write tests first) |
| `planner` | **PROACTIVELY** — complex features, architectural changes |
| `architect` | Architectural decisions, system design |
| `build-error-resolver` | When build or TypeScript errors occur |
| `database-reviewer` | Prisma schema changes, SQL queries, migrations |
| `e2e-runner` | Critical user flows (cooking, meal plan, payments) |

See `docs/COMMAND-AGENT-MAP.md` for slash command → agent mappings.

### Design Philosophy (`REDESIGN_PHILOSOPHY.md`)
**Read before any UI work.** Key non-negotiables:
1. **Food is the hero** — full-bleed images, transparent headers, no white boxes under photos
2. **Every tap gets a response** — haptic + visual feedback within 400ms
3. **Elevation over borders** — no `border border-gray-200`; use shadow + background tint
4. **Round everything** — cards `borderRadius:20`, bottom sheets `28`, buttons `100` (pill), modals `24`
5. **Earn peak moments** — cooking complete → Lottie + chef-kiss; errors → Sazon personality, not red banners
6. **Copy = texting a friend** — "I'm allergic" not "strict restriction"

### Roadmap (`ROADMAP_3.0.md`)
The active roadmap lives in the project root. Check it before starting any new feature group — it tracks completed/pending tasks and defines the next steps.

**Roadmap Hygiene — Non-Negotiable:**
- Mark every `- [ ]` item as `- [x]` **immediately** when its implementation is complete — not at the end of a session, not in a batch later.
- If a bullet is partially done (some sub-points complete, others deferred), change `[ ]` to `[x]` and annotate with `✅` on completed sub-points and `(deferred)` on skipped ones.
- Test lines (`**Test:**`) must also be marked `[x]` once the described tests are green. If only a subset of test cases are covered, mark `[x] **Test (partial):**` and note what remains.
- Never leave a shipped feature as `[ ]`. A stale unchecked box creates false backlog and misleads future planning.

### Plans (`plans/`)
Check here before planning new features — prior architectural decisions may already be documented.
- [build-a-plate.md](plans/build-a-plate.md) — Group 10X P0 spec (phases 1+2)
- [backend-hardening.md](plans/backend-hardening.md) — Group 13 pre-launch security audit (C1/C2/H2/H5 + controller split + logger migration)
- [5xUpgradeRoadmap.md](plans/5xUpgradeRoadmap.md) — local-only Pro 5x improvement queue (retired)
- [tonight-tasks.md](plans/tonight-tasks.md) — overnight agent task queue (refill nightly)

## Key Context

### Algorithm Integrity
- Never break the **70/30 weight balance** (Macro Match / Taste Match) unless explicitly asked
- Preferred superfoods must give a **~15% boost** (not a penalty)
- All AI-generated recipes MUST pass `performSafetyChecks()` in `aiRecipeService.ts`
- Scoring logic: `backend/src/utils/`

### UI/UX Requirements (non-negotiable)
- Every new component must include `accessibilityLabel`
- Always support Light and Dark modes via `ThemeContext`
- Every button press triggers haptic feedback via `HapticTouchableOpacity`
- Use centralized `Animations.ts` constants — prefer scale + fade transitions
- Always support both iOS and Android

### Banned Patterns (violating these = broken design system)
- `border border-gray-200` or any decorative borders — use `Shadows.SM`/`Shadows.MD` + background tint
- `ActivityIndicator` — use Sazon `thinking` mascot + `LoadingState` or skeleton loaders
- `borderRadius: 8` or `rounded-lg` on content cards — must be `borderRadius: 20` (`BorderRadius.card`)
- Flat white (`#FFFFFF`) as screen background — use `ScreenGradient` or surface tokens (`#FAF7F4`)
- Raw `Animated` API — use Reanimated (`useAnimatedStyle`, `withSpring`, `withTiming`)
- "Error:", "Failed to", "Invalid" in user-facing strings — use Sazon personality copy
- `TouchableOpacity` or `Pressable` without spring — use `HapticTouchableOpacity` with `pressedScale: 0.97`
- New gradient/CTA buttons from scratch — use `BrandButton` with a variant (`brand`, `sage`, `golden`, `lavender`, `peach`, `sky`, `blush`, `ghost`)

### Reusable Components (use these, don't rebuild)
| Component | Path | Use for |
|-----------|------|---------|
| `BrandButton` | `components/ui/BrandButton.tsx` | All CTAs, action buttons, filter chips |
| `WidgetCard` | `components/ui/WidgetCard.tsx` | Pastel-tinted stat cards (macros, profile, cooking stats) |
| `WidgetGrid` | `components/ui/WidgetGrid.tsx` | 2x2 grid layout for widget cards |
| `ProgressRing` | `components/ui/ProgressRing.tsx` | Circular progress (calories, shopping, goals) |
| `ConcentricRings` | `components/ui/ConcentricRings.tsx` | Apple Fitness-style nested rings |
| `FrostedCard` | `components/ui/FrostedCard.tsx` | Glassmorphic cards (BlurView + semi-transparent bg) |
| `ScreenGradient` | `components/ui/ScreenGradient.tsx` | Subtle tinted gradient backgrounds for all screens |
| `FilterSheet` | `components/ui/FilterSheet.tsx` | Bottom sheet filters (home + cookbook consume this) |
| `CountingNumber` | `components/ui/CountingNumber.tsx` | Animated 0 → value on mount (stats, macros) |
| `AnimatedEmptyState` | `components/ui/AnimatedEmptyState.tsx` | Empty states with mascot + pastel bg + CTA |

### Design Tokens (from `constants/`)
- **Colors:** pastel tints (`Colors.pastel.*`), vivid accents (`Colors.accent.*`), semantic (`Colors.success/warning/error/info`), `MACRO_COLORS` map
- **Gradients:** `Gradients.ts` presets — `primaryCTA`, `screenBgLight`, `screenBgDark`, `onboarding1-3`, `authBg`, `paywallBg`, `cardOverlay`
- **Categories:** `CategoryColors.ts` — `CATEGORY_COLORS`, `CUISINE_COLORS` maps with bg + text + emoji per category

### Workflow Rules
- Modifying a backend service → run `npm test` in `/backend` (coverage must stay above 85%)
- Adding a new icon → update `frontend/docs/ICON_SYSTEM.md`
- New empty state → use the appropriate Sazon expression (`curious` for search, `sleepy` for no notifications, etc.)
- Follow **Mascot Branding**: `thinking` for loading, `chef-kiss` for success

## Session Startup

Run these before touching any code:
1. `pm2 status` — confirm `sazon-backend-3001` is online
2. Skim `ROADMAP_3.0.md` current group — confirm active task and any blockers
3. `cd backend && npm test -- --passWithNoTests 2>&1 | tail -5` — confirm coverage baseline ≥85% before starting

## Definition of Done

A feature is done when ALL of the following are true:
- [ ] Tests written first (RED → GREEN); test file exists
- [ ] `cd backend && npm test` passes, coverage ≥85%
- [ ] `typescript-reviewer` + `code-reviewer` agents run and issues addressed
- [ ] ROADMAP_3.0.md `[ ]` items checked `[x]` immediately
- [ ] No banned patterns introduced (see Banned Patterns above)
- [ ] Both iOS and Android considered for any UI change

## Parallel Execution Patterns

With Pro 5x quota, always parallelize independent workstreams instead of going sequential. Common patterns for Sazon:

**Full-stack feature (backend + frontend + tests):**
```
Agent 1 → backend service + routes + unit tests
Agent 2 → frontend screen + components + RTL tests
Agent 3 → integration tests + E2E critical path
```
Use `/devfleet` or `/orchestrate` to launch these together.

**Code quality sweep (after a multi-file change):**
```
Agent 1 → typescript-reviewer (type safety)
Agent 2 → code-reviewer (patterns, banned list)
Agent 3 → security-reviewer (if auth/API/payments touched)
```

**Group 10X Build-a-Plate phases (Phase 1 + 2 are P0 blockers):**
```
Agent 1 → MealComponent + ComposedPlate Prisma models + seed data
Agent 2 → /api/meal-components + /api/composed-plates endpoints
Agent 3 → /build-a-plate screen + slot picker UI
Agent 4 → permutations endpoint + "what if?" swap chips
```
See `plans/build-a-plate.md` for the full spec.

## PM2 Services

| Port | Name | Type |
|------|------|------|
| 3001 | sazon-backend-3001 | Node/Express (ts-node dev) |

Frontend (Expo, port 8000) is **not** under PM2 — run `npm start` in `frontend/` manually for the Metro interactive UI.

**Terminal Commands:**
```bash
pm2 start ecosystem.config.cjs   # First time
pm2 save                         # Persist process list
pm2 start all / pm2 stop all / pm2 restart all
pm2 start sazon-backend-3001
pm2 logs / pm2 status / pm2 monit
pm2 resurrect                    # Restore saved list
```
