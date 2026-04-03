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
The active roadmap lives in the project root. Check it before starting any new feature group — it tracks completed/pending tasks and defines the next steps. Mark tasks as complete as you go.

### Plans (`plans/`)
Check here before planning new features — prior architectural decisions may already be documented.

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
