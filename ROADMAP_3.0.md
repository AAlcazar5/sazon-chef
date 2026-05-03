# 🚀 **Sazon Chef - Roadmap 3.0: Growth, Monetization & Scale + Advanced Features**

*This roadmap covers two areas: (1) Advanced feature enhancements moved from [ROADMAP_2.0](ROADMAP_2.0.md), and (2) analytics, ML optimization, monetization, and scale preparation.*

---

## 🎯 **North Star**

> **Sazon is an N=1 experience.** Every recommendation, screen, and copy choice is tailored to *this* specific user — their pantry, taste history, macros, allergies, schedule, leftovers, and mood today. Generic content is the failure mode.

**Three driving principles** that guide every roadmap decision going forward:

1. **Hypersonalization** — no two users see the same thing. If a feature can be parameterized by user state, it must be. Home feed, Build-a-Plate slots, Cookbook ranking, recipe titles, error copy — all bend to who's looking.
2. **Adaptive iteration** — every signal (cook, save, swap, rate, skip, scroll-past) refines the next recommendation. The app should feel smarter today than yesterday. Static templates and "popular recipes" feeds are the antipattern.
3. **N=1 experience** — start every feature with "what would the right move be for *this* user *right now*?" If the answer is "show them the same thing as everyone else," reconsider.

**How existing systems serve the N=1 north star:**

| Surface | Role in the N=1 experience |
|---------|----------------------------|
| **Build-a-Plate (10X)** | Flagship N=1 surface. Slots filled by *this user's* taste/pantry/macros/leftovers — not a static template. The composer is the user expressing themselves through composition. |
| **Liked Recipes / Cookbook (10Q)** | Training data, not storage. Every save, swap, rating, skip reshapes tomorrow's recommendations. Smart Collections (`favorite`, `composed`, `make-again`, `cooked-recently`) are personalized facets, not generic categories. |
| **Slot affinity, taste learning, cuisine adjacency, leftover continuity, skill tier** | The adaptation engine. They exist to serve N=1 — not as standalone features. Every new piece of intelligence should plug into the same engine. |
| **Pantry, macros, allergies, dietary restrictions** | *Inputs* to a personalized model, not just filters. The data that makes "we built this for you" credible. |
| **Sazon Coach (10Y)** | The conversational layer where the model can *use* everything it knows about this user. Tool-use bridge to the rest of the personalization stack. |
| **Recipe Database (11)** | Adjacency-aware corpus that lets the engine reach for an unexpected-but-perfect-for-you suggestion. The wider the corpus, the higher the ceiling on personalization. |

**Roadmap implication for prioritization going forward:**

- Weight features by **how much new personalization signal they unlock** and **how strongly they make the experience feel built-for-one**.
- Generic features that don't learn or adapt are deprioritized — even if they're cheap.
- When two features compete for engineering time, prefer the one that strengthens the adaptation loop (signal in → better recs out).
- "Show all recipes" / "trending now" / "popular this week" surfaces are anti-pattern unless they're personalized rankings dressed in social copy.

**For every roadmap entry, ask:**
1. *What new signal does this collect about the user?*
2. *Which existing recommendation does this make smarter?*
3. *Could this feature be removed and replaced with a better-personalized version of an existing surface?*

If a roadmap item can't answer these, sharpen the spec before building.

---

## **Overview**

| Group | Focus Area | Est. Hours |
|-------|------------|-----------|
| **Group 1** | Smart Input | ✅ 0h |
| **Group 2** | Cookbook & Cooking | ✅ 0h |
| **Group 3** | Infrastructure & Scaling | ✅ 0h |
| **Group 4** | Meal Plan Advanced | ✅ 0h |
| **Group 5** | Profile Advanced | ✅ 0h |
| **Group 6** | Growth & Marketing | ✅ 0h |
| **Group 7** | Stripe Integration & Subscriptions | ✅ 0h |
| **Group 8** | Revenue Optimization | ✅ 0h |
| **Group 9** | Final App Polish | 62h |
| **Group 10** | User Empowerment — "Healthy Food That Doesn't Suck" | 66h |
| **Group 10V** | V2 Editorial Design Revamp | ~48h |
| **Group 10Y** | Sazon Coach — Conversational AI Companion (VITAL) | 40h |
| **Group 11** | Recipe Database & Recommendation Engine (CRITICAL) | 45h |
| **Group 12** | App Store Launch | 20h |
| **Group 13** | User Acquisition & Growth Hacking | 10h |
| **Group 14** | User Testing & Optimization | 11h |
| **TOTAL** | | **~254h** |

---

*Phase 1 builds on the complete 2.0 refactoring (Shopping List, Cookbook, Home, Profile, Quick Actions, Search — all shipped). Features below are NET NEW only. Already-complete 2.0 features are not repeated here.*

*Philosophy: The user sees simplicity. We handle complexity behind the scenes — auto-learning, smart defaults, AI-powered input. No configuration screens, no manual sorting, no power-user syntax.*

---

### **Group 1: Smart Input** 🎤 ✅ COMPLETE

*Voice input, barcode scanner, and NLP parsing — all shipped. See prior commits and ROADMAP_2.0.*

---

### **Group 2: Cookbook & Cooking** 📚 ✅ COMPLETE

#### Recipe Import
* **Import from URL** — Paste any recipe URL → AI extracts title, ingredients, instructions, photo. Supports all major recipe sites.
  * 📍 Backend: `POST /api/recipes/import-url` → scrape + AI cleanup (Claude Haiku for extraction)

#### Cooking Mode 👨‍🍳
* **Hands-Free Cooking** — Full-screen step-by-step view. Large text, keep-awake, swipe or voice "Next step"
* **Smart Timers** — Auto-detected from recipe text ("bake for 25 minutes" → timer button appears). Multiple concurrent timers with notifications.
* **Ingredient Checklist** — Check off ingredients as you prep. Serving scaler adjusts quantities in real time.

---

### **Group 3: Infrastructure & Scaling** 🏗️ ✅ COMPLETE

*All codeable infrastructure is shipped. Remaining account setups and external service configurations have been moved to Group 12 (App Store Launch) where they belong — you need an account to set up an account.*

#### Security 🔒
* ✅ **Rate Limiting** — Per-user and per-endpoint limits; tier-based (free vs Premium).
* ✅ **Input Validation & Sanitization** — All user inputs validated server-side via `helmet` + `zod`.
* ✅ **CORS Configuration** — Regex allowlist: `FRONTEND_URL` + `exp://`, `exps://`, localhost.

#### Caching ⚡
* ✅ **In-Memory Cache** — `cacheService` wrapping hot endpoints. Upstash Redis upgrade documented in Group 12.

#### Monitoring 👀
* ✅ **Error Tracking** — Sentry backend (`@sentry/node`) wired up, gated on `SENTRY_DSN`. Frontend Sentry setup in Group 12.
* ✅ **Health Check Endpoint** — `GET /api/health` (DB + cache + response time). `GET /health` liveness probe.

#### Deployment & CI/CD 🚀
* ✅ **GitHub Actions Pipeline** — backend + frontend tests + tsc on push/PR.
* ✅ **Secrets Management** — `.env.example` documents all required vars.

#### Database 🗄️
* ✅ **Indexes on Hot Queries** — Recipe by userId, meal plan by userId+startDate+isActive, shopping list by userId+isActive.

---

### **Group 4: Meal Plan Advanced** 📅 ✅ COMPLETE

#### AI-Powered Plan Generation 🤖

* **"Plan My Week" button** — Single tap generates a full 7-day plan. Behind the scenes: pulls user's macro goals + dietary restrictions + cooking skill level + time availability → sends a structured prompt to Claude → returns a full week of meals matched to saved recipes in the user's cookbook + Spoonacular fallbacks for gaps.
  * 📍 Backend: Complete TODO in `mealPlanController.ts:249` — this function stub already exists, just needs the AI call and meal-slot population logic
  * 📍 Prompt strategy: structured JSON output (`{ monday: { breakfast: recipeId, lunch: recipeId, dinner: recipeId }, ... }`), Claude Haiku for speed/cost, with fallback to Sonnet on complex dietary combos
  * 📍 Variety enforcement: no repeated recipes in same week, balance across cuisine types
* **Goal-Based Modes** — Simple selector: Cut / Maintain / Build. No macro math required from the user. Selecting a mode silently adjusts macro targets in all generated plans and suggestions.
  * 📍 Database: `planningMode` field on `MealPlan` (`cut | maintain | build`)
* **Regenerate Single Day** — Tap any day header → "Regenerate this day" → replaces just that day's meals without touching the rest of the week.
* **"Surprised Me" Indicator** — When AI places a recipe the user has never cooked, it gets a subtle ✨ badge. Encourages trying new things without forcing it.

#### Better Empty State 🗓️
* **First-Time Empty State** — Sazon mascot with "Let me plan your week — takes 10 seconds." One tap → Goal Mode selector → Generate. No blank grid, no intimidation.

---

### **Group 5: Profile Advanced** 👤 ✅ COMPLETE

#### Dietary Preferences — The Safety Layer 🛡️

*This is the most under-appreciated feature set in the app. A user with a peanut allergy or celiac disease needs to trust that Sazon never surfaces unsafe recipes. This isn't a nice-to-have — it's the foundation every other feature is built on.*

* **Severity Levels** — For each dietary restriction, two modes: **Strict** (never show, never suggest, flag in shopping list) vs **Prefer to avoid** (can be surfaced with a "contains X" warning). This single distinction prevents the app from being either over-restrictive or dangerous.
  * 📍 Database: `DietaryRestriction { type, severity: 'strict' | 'prefer_avoid' }` on User
* **Life-Threatening Allergy Flag** — Separate checkbox for anaphylactic allergens. When flagged, the app adds a persistent warning banner on any recipe that might contain a cross-contamination risk, even if the allergen isn't a listed ingredient.
* **Propagation** — Dietary settings flow silently everywhere: recipe scoring, home feed, AI-generated meal plans, shopping list compliance checks. Set it once, protected everywhere.

#### Cooking Context — Powers the Whole App 🍳

*These preferences have a disproportionate impact on recommendation quality.*

* **Cooking Skill Level** — Beginner / Home Cook / Confident / Chef. Affects recipe difficulty scoring, which results rank highest, and how the AI phrases instructions. Not a badge — just a filter that works silently.
  * 📍 `skillLevel` on User → passed into scoring weight for `difficulty` field
* **Daily Cooking Time** — Per-day time budget: "Weekdays: 20 min max. Weekends: no limit." This feeds directly into meal plan generation (Group 4) — weekday slots auto-filter to quick recipes. No decisions required in the moment.
  * 📍 Database: `cookingTimePrefs: { weekday: number, weekend: number }` on User profile
  * 📍 Used in: meal plan AI prompt, home feed sorting, search result ranking

#### Smart Notifications 🔔
* **Contextual, Not Noisy** — Notifications fire when genuinely useful, not on a schedule. Examples: "You haven't planned next week yet — want me to generate one?" (Thursday evening). "Chicken thighs expire tomorrow — here are 3 recipes." "Shopping day: your list is ready."
  * 📍 Backend: rule-based notification triggers, not a scheduler loop
* **Granular Controls** — Per-category toggles (meal reminders, shopping reminders, Sazon insights, weekly summaries) + quiet hours + weekend-off option. All in one clean screen.
* **No Streak Notifications** — Deliberately not added. Pressure to maintain a streak is anxiety-inducing. Sazon celebrates, never guilts.

#### Privacy & Data (App Store Required) 📋
* **Delete Account** — Hard delete. User taps "Delete Account" in Profile → confirmation prompt → account + all associated data purged from DB. Required by Apple guideline 5.1.1 — Apple will reject without it.
  * 📍 Backend: `DELETE /api/user/account` — cascade delete all user data (recipes, meal plans, shopping lists, purchase history, chat messages). Wrap in transaction.
  * 📍 Frontend: "Delete Account" button in Profile > Account Settings → confirmation modal with typed "DELETE" confirmation → call endpoint → sign out + navigate to onboarding

---

### **Group 6: Growth & Marketing** 📈 ✅ COMPLETE

#### Push Notifications 📬
* ✅ **Infrastructure** — Expo Push Notifications via `expo-server-sdk`. Device token registered silently on login.
  * 📍 Backend: `POST /api/notifications/register-token` → upsert `PushToken { userId, token, platform, updatedAt }`
  * 📍 Backend: `pushNotificationService.ts` + `notificationTriggerService.ts` — single service that all triggers call
  * 📍 Frontend: `usePushNotifications` hook in `_layout.tsx` — auto-registers on auth, handles notification taps with deep linking

* ✅ **Useful triggers (condition-based, not scheduled):**

  | Trigger | Condition | Message |
  |---------|-----------|---------|
  | Plan reminder | Thursday evening, no plan for next week | "Want me to plan next week? Takes 10 seconds." |
  | Expiry alert | Meal prep portions expiring in < 2 days | "Expiring soon — use them before they go!" |
  | List ready | Meal plan generation creates a shopping list | "Your shopping list is ready — 12 items." |
  | Trial ending | 3 days before trial expiration | Stubbed (Group 7 dependency) |
  | Weekly digest | Sunday morning, if user was active that week | "Your week at a glance — you cooked N meals!" |

* ✅ **Quiet hours** — Respects `quietHoursStart`/`quietHoursEnd` + `weekendsOff` from NotificationSettings.
* ✅ **Scheduler** — `notificationScheduler.ts` runs hourly interval, dispatches triggers based on day/hour.

#### Email 📧
* ✅ **Transactional (must ship before launch):**
  * Password reset (wired into `requestPasswordReset`), email verification, welcome email
  * Payment receipt, subscription change/cancellation — stubbed for Group 7
  * 📍 Backend: Resend (`resend` npm package), gated on `RESEND_API_KEY` — logs to console in dev
  * 📍 Templates: `backend/src/emails/templates.ts` — Sazon-branded HTML email templates

* ✅ **Welcome Email (Day 0):**
  * Sent on registration (fire-and-forget). Intro + "Plan your first week" CTA.

---

### **Group 7: Stripe Integration & Subscription Paywall** 💳 ✅

*Payments are infrastructure, not a feature — get them right once, keep them invisible forever. The user should never have to think about billing. Ship Free + Premium only; a Pro tier is a second product that distracts from making the first one great.*

---

#### **Two Tiers Only**

| | Free | Premium ($9.99/mo · $79.99/yr) |
|---|---|---|
| Recipes | 20 saved | Unlimited |
| Meal plans | Current week | Any horizon |
| Shopping lists | 1 | Unlimited |
| AI chat (Appendix) | 10 messages/day | Unlimited |
| Nutrition by Photo (Appendix) | 3/day | 10/day |
| Video to Recipe (Appendix) | — | 20/month |
| AI Meal Plan Generation (Group 4) | — | ✓ |

> **Why no Pro tier yet?** A Pro tier with family sharing, API access, and white-label options is a separate product. Shipping it now splits focus before the core is validated. Add Pro when Premium has ≥500 paying users.

---

#### **Backend: Stripe Plumbing**

*This is table-stakes — it either works or the app has no revenue. No shortcuts.*

* 🔄 **Schema** — Add to `User` model: `stripeCustomerId`, `subscriptionStatus` (free | trial | active | cancelled | past_due), `subscriptionTier` (free | premium), `trialEndsAt`, `currentPeriodEnd`
  * 📍 `npx prisma db push` after schema update

* 🔄 **Stripe service** (`backend/src/services/stripeService.ts`) — thin wrapper around Stripe SDK: create customer on signup, create checkout session, retrieve subscription, cancel subscription. Handle Stripe errors with typed responses.
  * 📍 `POST /api/stripe/checkout` — returns Stripe Checkout URL; let Stripe host the payment page (no embedded form to maintain PCI scope)
  * 📍 `POST /api/stripe/portal` — returns Stripe Customer Portal URL; billing management without building it ourselves
  * 📍 `GET /api/subscriptions/status` — returns current tier + expiry for the authed user

* 🔄 **Webhooks** (`POST /api/webhooks/stripe`) — verify signature, handle idempotently:
  * `customer.subscription.created/updated/deleted` → sync `subscriptionStatus` + `subscriptionTier` to DB
  * `invoice.payment_succeeded` → extend `currentPeriodEnd`
  * `invoice.payment_failed` → set `past_due`, trigger transactional email
  * `customer.subscription.trial_will_end` → trigger 3-day warning email
  * 📍 Log all events to `StripeWebhookEvent` model for debugging

* 🔄 **7-day free trial** — no credit card required. Higher churn but lower signup friction; re-evaluate after first 100 trial starts.

---

#### **Frontend: Paywall & Subscription UI**

*The paywall is a sales page. It should communicate value in 5 seconds, then get out of the way.*

* 🔄 **Paywall screen** (`/paywall`) — two panels: Free vs Premium, monthly/annual toggle (annual prominent with "Save 33%" badge), one CTA: "Start 7-Day Free Trial". No feature comparison table — use a benefit statement instead: *"Unlimited recipes, AI meal planning, and smarter shopping. Everything Sazon is designed to do."*
  * 📍 `frontend/components/subscription/PaywallScreen.tsx`

* 🔄 **`useSubscription` hook** — reads subscription status from context, exposes `isPremium`, `isTrialing`, `daysLeftInTrial`. Used everywhere for gating.
  * 📍 `frontend/hooks/useSubscription.ts`

* 🔄 **`<PremiumGate>` component** — wraps gated UI. Shows blurred preview + "Upgrade" badge. Tap → navigates to paywall.
  * 📍 `frontend/components/subscription/PremiumGate.tsx`

* 🔄 **Subscription management** — one button in Profile: "Manage Subscription" → opens Stripe Customer Portal (browser). No custom billing screens to build or maintain.

* 🔄 **Trial countdown** — subtle banner: "3 days left in your trial — upgrade to keep going." Shown only in final 3 days. Dismissible once.

* 🔄 **Paywall trigger moments** (show paywall at high-intent moments, never randomly):
  * Hit the 20-recipe save limit
  * Attempt AI chat on day 8 (trial expired)
  * Tap "Generate Meal Plan" without Premium
  * Tap Video to Recipe

---

#### **Transactional Emails** (via Resend — already in Group 6)

* Welcome to Premium + receipt confirmation
* Trial ending: 3 days out + 1 day out
* Payment failed: with direct link to update card (Stripe Portal URL)
* Subscription cancelled: confirmation + "Resume anytime" CTA

---

#### **Feature Gating: API Middleware**

* 🔄 `requirePremium` middleware — checks `subscriptionStatus` on auth token, returns `402` with `{ error: "PREMIUM_REQUIRED", upgradeUrl: "/paywall" }` for gated endpoints
* 🔄 Rate limiting by tier — free tier AI chat capped at 10 messages/day via Redis counter (same Upstash instance from Group 3)
* 🔄 Grace period — `past_due` users retain Premium access for 7 days before downgrade, giving payment retries time to succeed

---

#### **"Buy Me a Coffee" — Voluntary Support for Free-Tier Users** ☕

*Not everyone will pay $9.99/mo — and that's fine. Some users will happily drop $3 to say thanks after a genuinely great moment. This captures that value without a subscription and without guilt.*

**Philosophy:** Show appreciation prompts only at natural success moments, never more than once per 7 days, never to Premium subscribers, never on the same screen as the paywall. The tone is celebratory ("you just crushed that recipe"), not transactional ("please donate").

**Platform:** [Ko-fi](https://ko-fi.com) or [Buy Me a Coffee](https://buymeacoffee.com) — no backend work, no Stripe integration, no PCI scope. Just a public URL opened in the in-app browser. Set up in 10 minutes.

📍 `frontend/components/subscription/CoffeeBanner.tsx` — a dismissible bottom sheet with Sazon mascot (`chef-kiss` expression), a one-liner, and a single CTA button that opens the Ko-fi/BMAC URL via `Linking.openURL()`

**Trigger moments** (pick 2–3 maximum — quality over quantity):

| Moment | Copy | Why here |
|--------|------|----------|
| After completing all cooking mode steps | "Nailed it! If Sazon helped, consider buying us a coffee ☕" | Highest-satisfaction moment in the app |
| After generating first meal plan (free tier) | "Your week is planned — if that saved you some stress, a coffee means a lot 🙏" | Tangible value just delivered |
| After completing a shopping trip (all items checked) | "List done! Sazon's fuelled by coffee if you'd like to chip in ☕" | Loop closed, user is happy |

**Frequency cap (critical — this prevents annoyance):**
* Maximum once per 7 days, stored in `AsyncStorage` as `lastCoffeeBannerShown: ISO timestamp`
* Never shown if user is `isPremium` or `isTrialing`
* Fully dismissible — one tap to close, no second confirmation
* No in-app counter or badge — the button exists quietly in Profile > "Support Sazon" for users who want to find it again

📍 `frontend/app/(tabs)/profile.tsx` — add a "Support Sazon ☕" row in the Account section (always visible to free users, links directly to Ko-fi)

---

#### **Implementation Phases**

**Phase 1 (Core plumbing — 1 week):** Stripe SDK + customer creation + schema + webhook handler + checkout/portal redirect
**Phase 2 (Frontend — 1 week):** Paywall screen + `useSubscription` hook + `PremiumGate` + trial countdown banner
**Phase 3 (Gating — 3 days):** `requirePremium` middleware + rate limiting + in-app paywall triggers
**Phase 4 (Emails — 2 days):** Trial warning + payment failed + cancellation confirmation templates
**Phase 5 (Coffee — 1 day):** `CoffeeBanner` component + frequency cap + profile row

---

#### **Tests to write alongside implementation**

**`backend/tests/services/stripeService.test.ts`**
- Creates a Stripe customer and returns `stripeCustomerId` on user creation
- Returns a valid checkout session URL for the Premium monthly plan
- Returns a valid checkout session URL for the Premium annual plan
- Returns a customer portal URL for billing management
- Handles Stripe SDK errors with typed `RecipeImportError`-style responses (no raw throws)

**`backend/tests/webhooks/stripeWebhook.test.ts`**
- Rejects webhook with missing or invalid `stripe-signature` header (403)
- `customer.subscription.created` → sets `subscriptionStatus: 'active'`, `subscriptionTier: 'premium'`
- `customer.subscription.updated` → updates `subscriptionStatus` and `currentPeriodEnd`
- `customer.subscription.deleted` → sets `subscriptionStatus: 'cancelled'`
- `invoice.payment_succeeded` → extends `currentPeriodEnd` to new period
- `invoice.payment_failed` → sets `subscriptionStatus: 'past_due'`
- `customer.subscription.trial_will_end` → triggers trial-ending warning email (mock emailService)
- Duplicate event handled idempotently (second call does not double-update DB)
- All events logged to `StripeWebhookEvent` model

**`backend/tests/middleware/requirePremium.test.ts`**
- Passes through for `subscriptionStatus: 'active'`
- Passes through for `subscriptionStatus: 'trial'`
- Passes through for `subscriptionStatus: 'past_due'` within 7-day grace period
- Returns 402 with `{ error: 'PREMIUM_REQUIRED', upgradeUrl: '/paywall' }` for `free` status
- Returns 402 for `past_due` users beyond 7-day grace period
- Returns 402 for `cancelled` status
- Returns 401 when no auth token provided

**`backend/tests/modules/subscriptions.test.ts`**
- `GET /api/subscriptions/status` returns `{ tier: 'free', status: 'free' }` for new user
- `GET /api/subscriptions/status` returns `tier: 'premium'`, correct `currentPeriodEnd` for active subscriber
- `GET /api/subscriptions/status` returns `isTrialing: true` + `trialEndsAt` during trial
- `GET /api/subscriptions/status` returns 401 without auth token

**`frontend/__tests__/hooks/useSubscription.test.ts`**
- Returns `isPremium: true` when status is `'active'`
- Returns `isPremium: true` when status is `'trial'`
- Returns `isPremium: false` when status is `'free'`
- Returns `isPremium: false` when status is `'cancelled'`
- Returns `isTrialing: true` + correct `daysLeftInTrial` (3) when trial ends in 3 days
- Returns `daysLeftInTrial: 0` when trial has expired
- Returns `isTrialing: false` for non-trial statuses

**`frontend/__tests__/components/PremiumGate.test.tsx`**
- Renders children when `isPremium` is true
- Renders blurred preview + "Upgrade" badge when `isPremium` is false
- Tapping the upgrade badge navigates to `/paywall`
- Does not render children when not premium (gate is enforced)

**`frontend/__tests__/components/CoffeeBanner.test.tsx`**
- Does not render for Premium or trialing users
- Renders for free-tier users at a valid trigger moment
- Tapping the CTA calls `Linking.openURL()` with the Ko-fi/BMAC URL
- Dismissing the banner sets `lastCoffeeBannerShown` in `AsyncStorage`
- Banner does not appear again within 7 days of last shown (reads `AsyncStorage`)
- Banner appears again after 7 days have elapsed (timestamp check)
- Dismissing banner does not navigate away or affect other UI state

---

### **Group 8: Revenue Optimization** 💵 ✅ COMPLETE

#### **1. Cancellation Off-Ramp**

*Make it easy to cancel. Make it easier to stay.*

When a user initiates cancellation (taps "Cancel Subscription" in Profile):
1. **One-question survey** (required, 3 options + Other): "Too expensive" / "Not using it enough" / "Missing a feature I need" / "Other"
2. **One offer based on their answer**:
   * "Too expensive" → "Pause for 1 month instead? You'll keep your data and can resume anytime." (Stripe Billing pause supported natively)
   * "Not using it enough" → "We'll remind you weekly with a meal idea. Cancel in 3 months if it's still not clicking." (no action, just messaging)
   * "Missing a feature" → Free text "Tell us what's missing" → feeds directly into a Slack channel / email
   * "Other" → proceed to cancel
3. If they still cancel → confirm cleanly, no dark patterns. Send cancellation confirmation email with a "Resume anytime" link.

📍 `frontend/components/subscription/CancellationFlow.tsx` — 2-step modal (survey → offer → confirm)
📍 `POST /api/subscriptions/cancel` — records survey response + calls Stripe cancel or pause

---

#### **2. Payment Failure Recovery (Dunning)**

*Stripe Billing's built-in dunning handles 80% of this automatically — don't rebuild it.*

* Enable **Smart Retries** in Stripe Billing dashboard — Stripe ML picks optimal retry timing (typically recovers ~30% of failed payments automatically)
* Configure retry schedule: +1 day → +3 days → +7 days → downgrade
* Set 7-day grace period (already in Group 7 middleware)
* Transactional email on first failure: "Your payment didn't go through — update your card in one tap" (Stripe Portal link, already in Group 7 emails)

**That's it.** No custom dunning service, no churn prediction ML model. Stripe's automation handles it; the email handles the rest.

---

#### **Implementation**

All Group 8 work is frontend-only (cancellation flow) + Stripe dashboard config (dunning) + one API endpoint (`/api/subscriptions/cancel`). Estimated: **3 days total.**

---

#### **Tests to write alongside implementation**

**`backend/tests/modules/subscriptionCancel.test.ts`**
- `POST /api/subscriptions/cancel` requires auth (401 without token)
- Records survey response in DB before calling Stripe
- Cancels subscription via Stripe when user confirms without accepting offer
- Pauses subscription via Stripe (1 month) when "Too expensive" reason + pause offer accepted
- Does not call Stripe cancel when user accepts the "pause" offer
- Returns 400 if survey answer is not one of the valid enum values
- Returns 200 with `{ cancelled: true }` on successful cancellation
- Returns 200 with `{ paused: true }` on successful pause

**`frontend/__tests__/components/CancellationFlow.test.tsx`**
- Renders survey step first (shows all 4 options: "Too expensive", "Not using it enough", "Missing a feature", "Other")
- Selecting "Too expensive" shows the pause-for-1-month offer before confirm
- Selecting "Not using it enough" shows the messaging offer (stay + weekly reminder) before confirm
- Selecting "Missing a feature" shows the free-text feedback field before proceeding
- Selecting "Other" goes directly to confirmation step
- "Cancel Subscription" final confirm button calls `POST /api/subscriptions/cancel` and triggers sign-out flow
- Accepting the pause offer calls cancel endpoint with `action: 'pause'` not `action: 'cancel'`
- Cancel is always reachable — no step hides or disables the final cancel button

---

### **Group 9: Final App Polish** ✨

*The app works. Now it needs to feel like a work of art. This group is a comprehensive UX/design pass across every screen — guided by REDESIGN_PHILOSOPHY.md — to eliminate flat styling, dead interactions, and visual inconsistencies before App Store submission. The goal: every screen should feel like it belongs in the same app as Uber, Airbnb, or Duolingo. Pure visual and interaction polish — no new features. User-facing features that empower the user (recipe creation, smart collections, craving search, branded food tracking, etc.) live in Group 10.*

*Organized by priority: Foundation first (design system fixes that cascade everywhere), then screen-by-screen polish, then advanced delight.*

---

#### **9A: Design System Foundation** 🎨 ✅ COMPLETE
*Fix the tokens and shared components first — every screen inherits these changes automatically.*

##### Border Purge (P11: Elevation Over Borders) ✅
- [x] **Global border audit** — eliminated decorative borders across 40+ files
- [x] **SettingsRow.tsx** — Removed `borderBottomWidth: 0.5` + `borderBottomColor`
- [x] **Profile screen** — Removed `border-b border-gray-200` from settings sections
- [x] **Recipe form** — Removed borders from section cards and form inputs
- [x] **Scanner results** — Removed red borders from error boxes
- [x] **Tab layout** — Removed border from search bar; removed BlurView frosted footer (Android compat)
- [x] **FrostedHeader** — Removed hairline borders on iOS and Android
- [x] **DraggableMealCard** — Removed resting-state `borderWidth: 2`; kept drag-over state
- [x] **Edit preferences** — Set border color to `'transparent'` to zero-out all borders
- [x] **Edit macro goals** — Set border color to `'transparent'`

##### Surface Color Correction — Warm Cream Palette ✅
- [x] Updated `Colors.ts`: light `surface` → `#FAF7F4`; added `surfaceTint` → `#F5F0EB`; dark `surface` → `#0F0F0F`, `card` → `#1C1C1E`, `cardRaised` → `#2C2C2E`, `cardOverlay` → `#3A3A3C`
- [x] Added Tailwind tokens in `tailwind.config.js`: `bg-surface`, `bg-surface-tint`, dark variants
- [x] Audited 40+ files — replaced all `#F9FAFB` and `bg-gray-50` with surface tokens
- [x] Dark mode uses proper iOS elevation stack

##### Border Radius Consistency ✅
- [x] Content cards upgraded to `borderRadius: 20` (Spacing.ts `BorderRadius.card`)
- [x] Form inputs: `borderRadius: 14` (`BorderRadius.input`)
- [x] CTAs: `borderRadius: 100` (pill) via GradientButton
- [x] Bottom sheets: `borderRadius: 28` (`BorderRadius.sheet`)
- [x] Tailwind tokens added: `rounded-card`, `rounded-input`, `rounded-sheet`

##### Typography Hierarchy ✅
- [x] Added `FontSize.display` (32) and `FontSize.hero` (40)
- [x] Updated heading presets: h1 `extrabold`, h2 `bold`, h3 `semibold`
- [x] Added `display` and `hero` Typography presets
- [x] DM Sans deferred (caused Android crash) — system fonts with weight contrast for now

##### Gradient CTA Standardization ✅
- [x] Converted flat `bg-orange-500` buttons to `GradientButton` (modal, CollectionPickerModal, CollectionSavePicker, recipe-form)
- [x] Converted flat `bg-green-500` "Save Healthified" to `GradientButton.fresh`
- [x] Converted misused `bg-red-600` non-destructive buttons to `GradientButton.brand` (scanner, scanner-results)
- [x] Cooking Next/Done uses dynamic `GradientPresets.fire` / `.fresh`
- [x] Create Collection uses `GradientButton.brand` with pill shape

---

#### **9B: Tab Bar & Navigation** 🧭 ✅ COMPLETE
*The nav frame should be invisible until needed — glass, not chrome.*

##### Frosted Glass Tab Bar ✅
- [x] BlurView (iOS, intensity 40/60 dark/light) with semi-transparent tint overlay; solid semi-transparent on Android
- [x] Use `tabBarBackground` API (NOT custom `tabBar` prop — causes render issues on non-home screens)
- [x] Tab bar `position: 'absolute'` — content scrolls underneath
- [x] Add `ComponentSpacing.tabBar.scrollPaddingBottom` to all tab screens
- [x] ⚠️ Cannot use `href` and `tabBarButton` together (Expo Router constraint) — use `tabBarButton: () => null` alone to hide tabs

##### Tab Bar Icon Animation ✅
- [x] `AnimatedTabIcon` component using Reanimated `withSpring`
- [x] Selected tab: icon scales 1.0 → 1.15, opacity 1.0; unselected: scale 1.0, opacity 0.6

##### Hide Tab Bar in Flow States ✅
- [x] Cooking and scanner are root-level Stack.Screen entries — tab bar is automatically hidden when navigating to them

---

#### **9C: Peak Moment Celebrations** 🎉 ✅ COMPLETE
*People remember how an experience felt at its peak and at its end. Currently, every peak moment ends with a toast or a route change. These are the emotional high points of a cooking app — design them.*

##### Install Celebration Dependencies
- [x] ~~`npx expo install lottie-react-native`~~ — used native Animated API + confetti shapes instead (no native rebuild required)
- [x] `moti` — already installed (v0.30.0), used for MotiView entrance animations
- [x] Created reusable `CelebrationOverlay` component with confetti rain, mascot, stat cards, and CTAs
- [x] **Test:** Created `celebrations.test.tsx` — 18 tests covering all peak moments + `shopping-list.celebration.test.tsx` updated (6 tests)

##### Cooking Complete Celebration
*The single most important peak moment in the app. User just cooked a meal — reward them.*
- [x] Full-screen `CelebrationOverlay`: dark background + animated confetti rain + Sazon `chef-kiss` expression (celebrate animation)
- [x] Colorful stat cards: Steps (orange), Time (blue), Prepped (green) — spring-in staggered entrance
- [x] Next action CTA: fetches next meal from today's plan → "Next: [meal name]" or "Back to Recipe"
- [x] Haptic: `HapticChoreography.cookingComplete()` — success + heavy + medium + light sequence
- [x] **Test:** CelebrationOverlay renders stats, title, CTAs correctly

##### Shopping List Complete Celebration
*Checking off the last item should feel like crossing a finish line.*
- [x] Detect 100% progress → triggers `CelebrationOverlay` with confetti + stats
- [x] Sazon `celebrating` expression + "Shop complete!" title
- [x] Next action: fetches tonight's meal → "Cook [meal] now?" or "Let's cook"
- [x] Haptic: `HapticChoreography.shoppingCelebration()` — heavy + staggered taps + success
- [x] **Test:** Celebration triggers only when all items purchased; does not trigger on partial; no re-trigger guard

##### Recipe Saved Heart Burst
*Airbnb's heart animation is the gold standard. Replicate it.*
- [x] `HeartBurstAnimation` component: heart scales `0.6 → 1.4 → 1.0` with spring + fills red
- [x] 6-particle burst around heart (tiny circles radiate outward in radial pattern)
- [x] Haptic: `HapticChoreography.heartBurst()` — light at squeeze, medium at pop peak
- [x] Removed Alert for recipe save — heart animation + "Saved to cookbook!" banner IS the feedback
- [x] **Test:** Heart renders, haptic fires on save, onAnimationComplete callback works

##### Meal Plan Generated Celebration
*Generating a full week of meals is a major moment — don't let it appear silently.*
- [x] Replaced `SuccessModal` with `CelebrationOverlay` for plan generation success
- [x] Confetti + Sazon `excited` expression + staggered stat entrance
- [x] Haptic: `HapticChoreography.planGenerated()` — medium + light taps + success
- [x] Auto-dismiss after 3s, "View My Plan" CTA
- [x] **Test:** CelebrationOverlay integration test with plan generation props

##### Paywall Conversion Celebration
*The most important business moment. User just became a paying customer — celebrate them.*
- [x] `PremiumCelebration` component: full-screen "Welcome to Premium!" overlay with confetti + Sazon `celebrating`
- [x] Staggered premium benefits list: 4 benefits slide in with spring animation
- [x] Auto-dismiss after 4s + "Let's Cook!" CTA
- [x] Detection: `useSubscription` hook detects free→premium transition, fires `HapticChoreography.premiumConversion()`
- [x] **Test:** PremiumCelebration renders title, benefits, CTA; auto-dismisses

---

#### **9D: Screen-by-Screen Polish** 📱 ✅ COMPLETE

##### Home Screen
*Currently 10+ competing elements. Simplify to: header + hero + chips + carousels.*
- [x] Remove view mode toggle from header — moved inline to "For You" section title row
- [x] Remove search bar from header — moved into Advanced filter modal
- [x] Remove standalone `RecipeSearchBar` and `SearchScopeSelector` from main home view
- [x] Header is now minimal: logo + "Sazon Chef" brand text only
- [x] Make time-aware suggestions automatic (remove toggle from UI); user can override in settings
- [x] Reduce visible quick filter chips to 5–7 most common; "More" chip reveals full list
- [x] Carousel "peek" indicator: show ~12px of next card to signal scrollability
- [x] Migrate `AnimatedRecipeCard` from old `Animated` API to Reanimated (UI thread, no jank)
- [x] Hero recipe card: ensure full-bleed image with dark gradient overlay, text on image (not below)
- [x] Section titles: `FontWeight.extrabold` + `FontSize.xl` for bold hierarchy
- [x] **Test:** Home screen renders with ≤6 visible UI controls; carousels peek next card; animations run at 60fps on device

##### Home Screen — Filter & Search Redesign 🔍
*Consolidated all filtering into a single entry point: an animated Filters button in the header that opens a unified FilterModal. Search lives in the tab bar's search tab. The header is now minimal (logo + brand + filters button), freeing up vertical space for content.*

**Completed:**
- [x] Remove standalone RecipeSearchBar, QuickFiltersBar, and SearchScopeSelector from home screen
- [x] Minimal header: logo + brand name + animated Filters button (gradient pill, spring press, icon rotation, bounce badge)
- [x] Filter count badge on header button (animated bounce + wiggle on count change)
- [x] Merge quick filters into FilterModal (mood, quick, easy, macros, meal prep, budget, one pot chips)
- [x] Rename "Advanced" → "Filters"
- [x] Move grid/list view toggle from header to inline next to "For You" section title
- [x] **Test:** HomeHeader tests (11 passing) — logo, brand, mascot press, filters button render/tap/badge/a11y

**Remaining — Unified Filter Sheet Template & Redesign:**
*We have two filter modals — `FilterModal.tsx` (home) and `CookbookFilterModal.tsx` (cookbook) — that look and behave differently despite serving the same purpose. The header Filters buttons now match perfectly across screens; the sheets behind them need to match too. Build a shared `FilterSheet` template component that both screens consume, then make it beautiful.*

**Phase 1: Shared FilterSheet Template**
*Extract the common structure into a reusable component so both screens are guaranteed to look identical. Screen-specific sections (e.g., home's cuisine/mood, cookbook's collections/view mode/sort) plug in as named slots.*

- [x] Create `frontend/components/ui/FilterSheet.tsx` — shared bottom sheet skeleton:
  - Props: `visible`, `onClose`, `title` (default "Filters"), `activeFilterCount`, `onReset`, `onApply`, `children` (screen-specific sections)
  - Built-in sections rendered in consistent order: quick filters slot → screen-specific slots → reset button
  - Standardized section wrapper: `<FilterSection icon={...} title="..." count={...}>` — renders icon + title + active count badge + children
  - Standardized pill component: `<FilterPill label="..." active={...} emoji={...} onPress={...} />` — shared styling, spring scale animation on tap
  - Bottom bar: gradient "Apply" CTA with filter count + "Reset all" text button (always in same position)
- [x] Create `frontend/components/ui/FilterSection.tsx` — section wrapper with icon, title, count badge, and collapsible content
- [x] Create `frontend/components/ui/FilterPill.tsx` — animated pill with spring scale, shared across all filter UIs
- [x] Migrate `FilterModal.tsx` (home) → thin wrapper around `FilterSheet`, passing home-specific sections (mood, cuisine, dietary, cook time, difficulty) as children
- [x] Migrate `CookbookFilterModal.tsx` (cookbook) → thin wrapper around `FilterSheet`, passing cookbook-specific sections (layout, show, collection, sort, cook time, difficulty, dietary) as children
- [x] Shared quick filter chips: both screens use the same `QuickChip` rendered inside `FilterSheet`'s quick filters slot — currently duplicated as separate `QuickChip` functions in both files
- [x] **Test:** Both modals render with identical structure (same section spacing, pill size, bottom bar); changing a shared component updates both screens; screen-specific sections only appear on their respective screen

**Phase 2: Visual Polish**
*Apply the redesign philosophy to the shared template — every filter interaction should feel alive.*

- [x] Visual hierarchy: `FilterSection` headers with left icon + bold title + right count badge, separated by subtle hairline dividers
- [x] Collapsible sections: sections collapse/expand with Reanimated `useAnimatedStyle` height + opacity spring (default: expanded for sections with active filters, collapsed for others)
- [x] Active filter summary: sticky row at top of sheet showing all active filters as dismissible chips (tap × to deselect) — shared component, not duplicated
- [x] "Clear all" action: always visible when any filter is active, with confirmation haptic + spring fade
- [x] Pill redesign: `FilterPill` gets subtle shadow when selected, gradient tint background (brand orange for general filters, green for dietary), spring scale 0.93 on press
- [x] Section count badges: each `FilterSection` header shows live count of active filters in that group (e.g., "Cuisine (2)")
- [x] Smart guidance: when total filters ≥ 5, mascot appears with animated thinking expression + helpful tip (home already has this partially — move into `FilterSheet` so cookbook gets it too)
- [x] Bottom sheet polish: backdrop blur, animated handle bar, snap points feel natural (75% → 92%)
- [x] Apply button: full-width gradient CTA (orange→red) with filter count in label (e.g., "Apply 3 Filters"), spring press animation, disabled state when no changes
- [x] Reset animation: pills spring-scale to 0 then back to 1 when "Reset all" is tapped (visual confirmation)
- [x] **Test:** Collapsible sections animate open/closed; active chips row updates live; clear all resets state with animation; pill tap has spring scale; mascot appears at ≥ 5 filters; apply button shows correct count; reset triggers pill animation; both home and cookbook sheets are visually identical in structure

##### Recipe Detail (modal.tsx)
*Food should be the first thing users see — not a header bar.*
- [x] Full-screen hero image first (280–320px height), edge-to-edge
- [x] Migrate from `Image` (react-native) to `expo-image` for blur-up placeholder loading
- [x] Floating transparent back/share/save buttons over hero image (no solid header bar)
- [x] Parallax scroll: migrate from old `Animated` API to Reanimated `useAnimatedScrollHandler`
- [x] Sticky frosted glass header: appears on scroll when hero image scrolls away (title + save button)
- [x] "Start Cooking" button: persistent floating FAB at bottom (not buried in scroll)
- [x] Macro pills row: `borderRadius: 100` (pill), subtle background, clean horizontal layout
- [x] Collection picker modal → convert to bottom sheet
- [x] **Test:** Hero image loads with blur-up; parallax is smooth; FAB "Start Cooking" stays visible after scrolling past hero; collection picker opens as bottom sheet (not center modal); back/share buttons float over hero image

##### Cooking Screen
*This is a flow state — zero distractions, full immersion.*
- [x] Hide tab bar and status bar on entry
- [x] Step transitions: cross-fade with spring scale (0.95 → 1.0), not instant text swap
- [x] Step completion: haptic burst + animated checkmark springs in
- [x] Timer ring: animated circular progress arc (SVG-based circular progress with react-native-svg)
- [x] Ingredient checkoff: spring scale + strikethrough animation + slide to "done" section
- [x] Background: subtle dark gradient to reduce eye strain during cooking
- [x] **Test:** No tab bar visible; step transitions animate; timer ring updates in real-time; ingredient checkoff strikes through and moves to done section; completion celebration does not re-trigger if user navigates back to cooking screen

##### Shopping List Screen
- [x] Item check-off: spring scale (1.0 → 0.95 → 1.0) + strikethrough + slide to bottom
- [x] Section completion: green flash on aisle header when all items in section purchased
- [x] In-store mode: frosted glass sticky aisle headers that stick on scroll (SectionList + BlurView)
- [x] Progress text: replace raw percentage with friendly copy ("Almost done! 3 items left")
- [x] Estimated cost: add context ("Estimated total" label with shopping bag icon)
- [x] **Test:** Check-off animates correctly; sections collapse on completion; aisle headers stick on scroll on both iOS and Android; friendly progress text updates correctly ("Almost done! 3 items left" when 3 remain)

##### Meal Plan Screen — Visual Polish
- [x] Day selection pills: spring scale (1.0 → 1.08) on press with haptic
- [x] Week navigation: spring physics on swipe (overshoot + settle) — GestureDetector + pan gesture with spring translateX
- [x] Meal card entrance: staggered animation on tab open (50ms delay per card)
- [x] Progress ring: animates from 0 → current value on mount
- [x] Empty day state: subtle Sazon expression + "Tap + to fill this slot"
- [x] **Test:** Day pill springs; progress ring animates; stagger doesn't replay on tab revisit

##### Cookbook Screen — Visual Polish
- [x] Grid/list toggle moved from header to inline next to recipe count row
- [x] Grid cards: image-first layout with dark gradient overlay, title/meta on image
- [x] Save heart: burst animation on tap (HeartBurstAnimation on save success)
- [x] Star rating: stars scale + rotate on tap; 5-star → tiny confetti burst (ConfettiParticle burst)
- [x] Collection picker: convert from center modal to bottom sheet with card carousel
- [x] CookbookInsights stats: animated counting numbers (0 → actual value over 600ms)
- [x] **Test:** Grid cards show food first; heart animates; star rating springs

##### Profile Screen
- [x] Stats row: animated counting numbers on load (rapid count from 0 → actual)
- [x] Streak counter: animated flame icon (subtle pulse/flicker) — pulsing 🔥 next to "Cooked" stat
- [x] Premium badge: gradient shimmer animation (light sweeps across badge)
- [x] Settings rows: remove all `border-b`; use card grouping with `Shadows.MD` + `gap: 12`
- [x] Chevron on settings rows: slides 4px right on press (spring)
- [x] `ProfileCompletionCard` progress bar: spring animation (not linear timing)
- [x] Completion checklist items: scale bounce when item completes
- [x] **Test:** Stats animate on screen mount; borders fully removed; chevrons respond to press; `ProfileCompletionCard` progress bar uses spring animation; premium badge renders shimmer for premium users and is hidden for free-tier; completion checklist items bounce on state change

##### Onboarding
*8 steps is too many. Cut to 3. Get users to personalized recipes in 60 seconds.*
- [x] Reduce to 3 screens: **Welcome** (name + Sazon waves) → **"Anything you can't eat?"** (top 5 dietary restrictions, not 8+) → **"What's your goal?"** (Balanced / High Protein / Lose Weight — 3 options max)
- [x] Move cuisine preferences, superfoods, banned ingredients, physical profile, skill level → `ProfileCompletionCard` (progressive collection after first session)
- [x] Sazon mascot reacts per screen: `waving` → `thinking` → `chef-kiss`
- [x] Form fields: stagger entrance with Moti (50ms delay per field, translateY 20 → 0)
- [x] Screen transitions: spring slide (scale 0.95 → 1.0 + opacity 0 → 1)
- [x] Replace `ActivityIndicator` with Sazon `thinking` expression during any loading
- [x] Reduce cuisine options from 12 → 6 most popular with "See all" disclosure
- [x] Dietary restrictions: show 4–5 most common with "More" disclosure (not 8 at once)
- [x] **Test:** User reaches personalized recipes within 3 taps; onboarding completes in ≤3 screens; advanced preferences (cuisine, superfoods, physical profile) are NOT in onboarding flow; user reaches home feed within 3 taps from app open

##### Login & Register Screens
*Auth screens are the first brand impression — they should have personality.*
- [x] Sazon mascot: spring entrance on mount (scale 0.6 → 1.0 over 400ms)
- [x] Animated gradient background: increase opacity range (0.3–0.65 → 0.4–0.8) for more visible brand color
- [x] Form fields: stagger entrance with Moti (translateY 30 → 0, 80ms delay per field)
- [x] Error states: Sazon `confused` expression + friendly copy ("Hmm, that didn't work — try again?")
- [x] Success on login/register: brief Sazon `excited` expression (300ms) before navigation
- [x] Social login buttons (Google, Apple): add `Shadows.SM` elevation — currently flat
- [x] Group name + email fields into a visual card with subtle background
- [x] **Test:** Mascot animates on mount; form fields stagger; error shows mascot + friendly message

##### Paywall Screen
- [x] Feature list items: stagger from bottom (150ms delay per item, Moti translateY)
- [x] Price toggle (monthly/annual): spring bounce on switch (not instant swap)
- [x] CTA button: idle shimmer/pulse every 3s (opacity 0.85 → 1.0 → 0.85) to draw eye
- [x] Post-conversion: full-screen celebration (see 9C)
- [x] **Test:** Features stagger on mount; CTA pulses; conversion triggers celebration

##### Scanner Screen
- [x] Animated corner brackets: spring in on camera open (scale 0.8 → 1.0)
- [x] Scan-line animation: subtle line sweeps vertically during scanning
- [x] Processing overlay: replace plain black box with frosted glass + Sazon `thinking` + gradient
- [x] On match found: spring-scale result card entrance + haptic `impactAsync(Medium)`
- [x] No match: Sazon `confused` expression + "Hmm, I didn't catch that — try again?" + search CTA
- [x] Results cards: add `Shadows.MD` elevation (currently flat with borders)
- [x] Internal stagger on result content: image → title → details (80ms delay each)
- [x] **Test:** Corner brackets animate; processing overlay styled; result card springs in

##### Recipe Form
- [x] Section chunking: clear visual cards for Details, Ingredients, Instructions, Nutrition
- [x] Form inputs: replace borders with `Shadows.SM` + subtle `bg-gray-50` fill
- [x] Focus state: animated focus ring (AnimatedInput wrapper with scale + border animation on focus)
- [x] Section navigation pills: highlight active section more prominently (scale 1.08 + bold + solid bg + white text)
- [x] AI generation button: move into a "Quick Start" hero card at top with gradient CTA + sparkles icon
- [x] Nutrition section expand/collapse: spring animation (not linear height change)
- [x] Save success: spring celebration (SuccessModal with checkmark) instead of generic Alert
- [x] **Test:** Form inputs have no borders; focus state animates; sections are visually distinct

##### Edit Macro Goals
*Raw gram inputs are clinical. Absorb the math.*
- [x] Lead with goal picker: "How do you want to eat?" → Balanced / High Protein / Low Carb / Cut / Bulk (3–5 clear tiles)
- [x] Goal tiles: `Shadows.MD` + scale animation on selection (not just border change)
- [x] "Customize" toggle reveals raw macro inputs for power users (progressive disclosure)
- [x] When customizing: animated macro bar preview updates live as user adjusts sliders
- [x] Replace "g" labels with "grams per day" or friendly context ("Protein target")
- [x] **Test:** Default flow doesn't expose raw numbers; custom mode reveals them; live preview updates

##### Edit Preferences
*System language ("strict", "prefer_avoid") must not leak into the UI.*
- [x] Severity framing: "I'm allergic" (maps to `strict`, red badge) / "I try to avoid" (maps to `prefer_avoid`, yellow badge)
- [x] No "severity" terminology visible to user
- [x] Severity toggle: animate badge appearance when toggled (spring scale 0 → 1)
- [x] Cuisine chips: add food emoji/icon per cuisine + spring scale on selection
- [x] All settings cards: replace borders with `Shadows.SM` + background contrast
- [x] Visual hierarchy: primary dietary restrictions visually distinct from "nice to have" preferences — strict chips larger/bolder with left accent border, sorted strict→avoid→unselected
- [x] **Test:** No system terms visible; badges animate; cards have elevation not borders

---

#### **9E: Interaction Polish** ✨ ✅ COMPLETE
*Micro-interactions that make the app feel physically responsive.*

##### Spring Press on All Interactive Elements
- [x] Audit every `TouchableOpacity` in the app — ensure all use `HapticTouchableOpacity` with spring scale
- [x] Any remaining plain `TouchableOpacity` or `Pressable` without spring: wrap or replace
- [x] Verify `pressedScale: 0.97` default is applied consistently
- [x] QuickFilterChips: add spring scale on selection (currently static)
- [x] Category chips (onboarding, preferences): spring scale on tap
- [x] **Test:** Tap any interactive element — it should visually respond with spring + haptic within 100ms
- [x] **Test:** All interactive elements have minimum 44pt tap target; `useReducedMotion()` disables spring animations gracefully; all images have `accessibilityLabel`; VoiceOver can navigate celebration overlays

##### Entrance Animations
- [x] List items (settings rows, shopping items, recipe lists): stagger entrance on first render (30–50ms per item)
- [x] Modal content: spring scale (0.9 → 1.0) + fade on open
- [x] Bottom sheets (when added): spring from bottom with overshoot
- [x] Page transitions between screens: spring slide (not linear timing)
- [x] **Test:** First render of any list shows stagger; no stagger on subsequent scrolls (only mount)

##### Scroll-Driven Behaviors
- [x] All scrollable screens: header opacity/blur increases on scroll (frosted glass effect)
- [x] Recipe detail: hero image parallax (image moves slower than content)
- [x] Carousels: "peek" next card (~12px visible) with snap-to-item physics
- [x] Profile: stats section parallax behind profile header on scroll
- [x] **Test:** Scroll any screen — header evolves; parallax effects are smooth at 60fps

---

#### **9F: Copy & Language Audit** ✍️ ✅ COMPLETE
*Every string the user reads should sound like a text from a friend, not an error log.*

- [x] Error messages: replace any remaining "Error", "Failed", "Invalid" with Sazon personality ("Hmm, something went sideways", "That didn't quite work — try again?")
- [x] Empty states: audit all screens — ensure every empty state uses `AnimatedEmptyState` with mascot + friendly CTA (not just "No items")
- [x] Loading states: replace any `ActivityIndicator` with Sazon `thinking` expression + sequential status copy ("Finding your perfect match...", "Almost ready...")
- [x] Notification settings: "Do Not Disturb" (not `quietHoursStart/End`), "Weekend mode" (not `weekendsOff`)
- [x] Macro goals: "Daily protein target" (not "protein grams"), "How much you want to eat" (not "caloric intake")
- [x] Shopping list progress: "Almost done! 3 items left" (not "75%"), "All done! Time to cook!" (not "100%")
- [x] **Test:** Grep for banned terms (`quietHoursStart`, `prefer_avoid`, `strict`, `Error:`, `Failed to`, `Invalid`, `caloric intake`, `protein grams`) in user-facing strings — zero matches; every empty state renders `AnimatedEmptyState` with mascot; no screen uses raw `ActivityIndicator`

---

#### **9G: Lottie Mascot Animations** 🌶️ ✅ COMPLETE
*Replace static PNG expressions with animated Lottie JSON for the app's emotional moments.*

**Mascot Cleanup (do this first, before commissioning animations):**
- The mascot used in the app header is the canonical Sazon design — all Lottie animations should be based on this version
- [x] Audit all `SazonMascot` / `AnimatedSazon` usages across the app and identify which are using older, off-brand mascot assets
- [x] Replace any remnant mascot images that don't match the header mascot with the correct asset
- [x] Delete stale mascot image files from `assets/` once no longer referenced — removed `sazon-mascot-alternates/` directory (~14MB of test variants) and stale PNGs
- After cleanup, the single canonical PNG becomes the design reference for the animator

**Lottie Integration:**
- [x] Commission or source animated Lottie files per expression: `excited`, `thinking`, `chef-kiss`, `confused`, `waving`, `sleeping`, `celebrating` — created `lottie/` directory with README; Lottie JSON files drop in when ready, component auto-detects them
- [x] `npx expo install lottie-react-native` — installed SDK 54-compatible version
- [x] Replace `SazonMascot` image source with `LottieView`; fall back to PNG if asset missing — created `LottieMascot` + `AnimatedLottieMascot` components with SVG SazonMascot fallback
- [x] Wire Lottie mascot into all peak moments (cooking complete, shopping done, plan generated, paywall conversion) — `CelebrationOverlay`, `cooking.tsx`, `onboarding.tsx`, `ImportFromUrlModal`, `MealPlanEmptyState` all use `AnimatedLottieMascot`
- [x] **Test:** Add `jest.mock('lottie-react-native', ...)` to `jest.setup.js`; verify mascot renders without crash; verify Lottie plays on peak moments — 12 tests in `LottieMascot.test.tsx`, global mock in `jest.setup.js`

---

#### **9H: Modal → Bottom Sheet Migration** 📋 ✅ COMPLETE
*Center modals feel like web popups. Bottom sheets feel native.*

- [x] Install `@gorhom/bottom-sheet` (evaluate against `react-native-true-sheet` first — pick one)
- [x] Convert FilterModal (home screen) → bottom sheet
- [x] Convert CollectionPickerModal (cookbook/recipe detail) → bottom sheet
- [x] Convert AddItemModal (shopping list) → bottom sheet
- [x] Convert MergeListsModal (shopping list) → bottom sheet
- [x] Convert any recipe action menus → bottom sheet
- [x] Keep confirmation dialogs (delete, cancel) as centered alerts (platform convention)
- [x] Bottom sheet styling: `borderRadius: 28` top corners, frosted glass handle, `Shadows.XL`
- [x] **Test:** All converted modals open from bottom with spring animation; dismiss on swipe down; handle visible; each migrated bottom sheet preserves the same functionality as its original center modal (filters apply, items add, collections select); swipe-to-dismiss does not lose unsaved state

---

#### **9I: Advanced Delight** ✨ ✅ COMPLETE (Shared Element Transitions deferred — Reanimated v4 dropped the API; revisit when Expo Router adds official support)
*These items elevate the app from "polished" to "premium." Tackle after 9A–9H.*

##### Shared Element Transitions ⏸️ DEFERRED — Blocked by Reanimated v4
*Recipe card → recipe detail hero image morph.*
- [~] Requires React Navigation Shared Element or Reanimated Layout Animations — `sharedTransitionTag` not yet typed in Reanimated v4; revisit when Expo Router adds official shared element support
- [~] Tag card image with `sharedTransitionTag={recipeId}` and match in `modal.tsx` hero
- [~] **Test:** Tapping a recipe card triggers shared element transition to detail hero image; back navigation reverses the transition; no flash of white/empty during morph
- **When to start:** After Lottie is done (reduces parallel animation complexity). **Blocked:** Reanimated v4 does not expose `sharedTransitionTag` in types. **Unblock signal:** Reanimated v4.x adds `sharedTransitionTag` typing OR Expo Router ships first-class shared element support — re-evaluate quarterly.

##### Dynamic Island / Live Activity (iOS 16+)
*Cooking timer visible in the Dynamic Island and Lock Screen.*
- [x] Requires a native Swift extension (`ActivityKit` / `WidgetKit`)
- Backend: no changes needed — timer state stays local

##### Drag-to-Reorder Meal Plan Slots
*`DraggableMealCard` long-press activates full drag-to-reorder within a day.*
- Infrastructure exists: `isDragging`, `onDragStart`, `onDragEnd` props in `DraggableMealCard`
- [x] Add `onReorder: (fromIndex: number, toIndex: number) => void` prop
- [x] Use Reanimated `useAnimatedReaction` + `GestureDetector` for smooth drag
- [x] **Test:** Long-press activates drag mode; drop calls `onReorder` with correct indices; list reorders correctly

##### Search Bar Cleanup
*Search bars are inconsistent across screens — audit and unify before launch.*
- [x] Audit every search bar in the app (Home, Cookbook, Shopping List, etc.) for visual and behavioural consistency
- [x] Standardise styling: same height, border radius, placeholder text style, icon placement, and focus state across all screens
- [x] Ensure keyboard behaviour is consistent (returnKeyType, autoCorrect, autoCapitalize settings match across all instances)
- [x] Extract a shared `SearchBar` component if one doesn't already exist, and replace one-off implementations
- [x] **Test:** Verify search bar renders correctly and behaves consistently on both iOS and Android

##### Dark Mode Depth Pass
*Dark mode should use elevated surfaces, not just inverted grays.*
- [x] Verify all cards use proper iOS dark elevation stack: base `#1C1C1E`, raised `#2C2C2E`, overlay `#3A3A3C`
- [x] Orange accent becomes electric on near-black — verify CTA buttons and highlights glow
- [x] Glassmorphism on key cards: `BlurView` + semi-transparent bg + subtle inner border for depth
- [x] **Test:** Every screen in dark mode — cards visually separate from background; no "flat gray" syndrome

##### Data Visualization
*Numbers should be beautiful, not just readable.*
- [x] Profile stats: animated counting numbers (0 → actual over 800ms, ease-out)
- [x] Meal plan progress: animated ring/arc (SVG or Skia)
- [x] Shopping list progress: animated progress bar with spring physics
- [x] Macro display (recipe detail, meal plan): consider small donut/ring charts instead of plain text pills
- [x] **Test:** All data visualizations animate on mount; animated counting numbers land on the exact correct value (not off-by-one); progress rings reflect actual data; VoiceOver reads current values correctly

---

---

#### **9-Inspo: Soft Gradient & Frosted Aesthetic** 🧊
*Patterns extracted from Airbnb redesign, ORIX Food Land, ice cream/salad/delivery apps, and dark recipe apps. These are the visual signatures that make an app feel premium and "soft" — not covered by existing Group 9 sections.*

##### Soft Gradient Screen Backgrounds ✅
*Every inspo screen uses a subtle tinted gradient background — never flat white. This is the single biggest difference between "clean" and "premium."*
- [x] Create a `ScreenGradient` wrapper component: `LinearGradient` with brand-tinted top → neutral bottom. Light mode: warm peach-white (`rgba(250,126,18,0.04)` → `#F2F2F7`). Dark mode: deep navy-black (`#1A1A2E` → `#0F0F0F`)
- [x] Apply `ScreenGradient` as the base background on all tab screens (home, cookbook, meal plan, shopping list, profile)
- [x] Auth screens (login, register): stronger gradient — Sazon orange tint at top (`rgba(250,126,18,0.12)` → white), matching the Airbnb onboarding warmth
- [x] Onboarding: full brand gradient background (like Airbnb splash — coral/orange wash behind content)
- [x] Paywall: dark gradient background (near-black → deep orange tint) — premium feel like the dark recipe app
- [x] **Test:** `ScreenGradient` renders on both iOS and Android without performance issues; gradient is visible but subtle (not overwhelming); dark mode uses dark gradient variant; no white flash on screen transitions

##### Frosted Glass Cards ✅
*Cards that look like frosted glass on a tinted background — the ORIX and hot dog detail screen effect.*
- [x] Create a `FrostedCard` component: `BlurView` (expo-blur, intensity ~20) + semi-transparent white bg (`rgba(255,255,255,0.7)`) + `Shadows.MD` + `borderRadius: 20`. On dark mode: semi-transparent dark (`rgba(28,28,30,0.7)`)
- [x] Apply `FrostedCard` to: recipe detail hero info section, profile stats card, meal plan day cards, shopping list category headers (in-store mode), scanner result cards
- [x] Recipe detail: product/food hero section sits inside a frosted card (like ORIX hot dog detail — tinted card with food centered)
- [x] **Test:** `FrostedCard` renders `BlurView` on iOS; Android fallback uses semi-transparent bg without blur; cards are visually distinct from screen gradient background; no performance degradation with multiple frosted cards on screen

##### Circular Food Thumbnails ✅
*Across all food inspo apps — circular images for categories, ingredients, and small previews.*
- [x] Category navigation chips (home, cookbook): replace text-only chips with **circular food emoji/icon + label** below (like the food delivery apps). Horizontally scrollable
- [x] Ingredient display (recipe detail): show ingredients as circular thumbnail + label (like the dark recipe app's "Pork, Noodle, Corn, Eggs" row) instead of plain text list
- [x] Meal plan day view: recipe thumbnails as small circles (40px) next to meal names
- [x] Shopping list items: optional small circular product image next to item name (where available)
- [x] **Test:** Circular thumbnails render as perfect circles (not ovals) on both platforms; images use `borderRadius: width/2`; placeholder shown when image unavailable; category chips show icon + label

##### Bold Typography Weight Contrast ✅
*Every inspo screen has a dramatic gap between headline weight and body weight — much bigger than what we currently have.*
- [x] Screen hero text (home greeting, profile name, paywall headline, onboarding titles): `FontWeight.extrabold` (800) + `FontSize.hero` (40px) — like "Ice cream Lover? Order & Eat." and "Hungry? Order & Eat."
- [x] Mixed-weight headlines: first line bold, second line regular weight (like "My / Cart List", "Hungry? / Order & Eat.") — creates visual interest with two weights in one heading
- [x] Metadata text (timestamps, counts, secondary info): `FontWeight.regular` (400) + `FontSize.xs` + `opacity: 0.5` — should nearly disappear visually
- [x] Price/number emphasis: key numbers (macro values, recipe counts, costs) in `FontWeight.bold` while surrounding text stays regular
- [x] **Test:** Heading-to-body weight ratio is at least 400 weight units apart (e.g., 800 vs 400); hero text renders at ≥36px on all screens; metadata text uses reduced opacity

##### Dark Mode Food Photography Treatment ✅
*The dark recipe app screenshots prove food looks dramatically better on dark backgrounds.*
- [x] Recipe cards in dark mode: use near-black card backgrounds (`#1C1C1E`) — food photos pop against dark
- [x] Star ratings: render in **gold/amber** (`#FFB800`) on dark mode (high contrast, like the dark recipe app)
- [x] Cook time badges: small translucent pill overlaid on recipe image (like "15 min" badge in the dark recipe app)
- [x] Consider an optional "Dark Feed" toggle that uses dark card backgrounds even in light mode for the home feed — food photography just looks better this way
- [x] **Test:** Food images have higher perceived contrast on dark backgrounds; star ratings use gold color in dark mode; cook time badges are legible over both light and dark food images

##### Macro/Nutrition Visual Display ✅
*Inspired by the salad detail and dark recipe app — macros as visual elements, not clinical text.*
- [x] Recipe detail macros: display as **small circular icons** with label below (Salt, Fat, Energy, Protein pattern from salad app) — icon + colored dot + value + label
- [x] Ingredient thumbnails row: horizontal scroll of circular ingredient images with labels (like dark recipe app's ingredient circles)
- [x] Consider color-coding macro values: protein = blue/teal, carbs = amber/orange, fat = purple, calories = red — consistent color language throughout
- [x] **Test:** Macro circles render with correct icons and values; color coding is consistent across recipe detail, meal plan, and shopping list; colors meet WCAG contrast ratio on both light and dark backgrounds

##### CTA Placement & Styling ✅
*Every inspo app puts the primary CTA at the absolute bottom, full-width, unmissable.*
- [x] All primary CTAs: fixed to bottom of screen (not scrolled away), full-width with generous horizontal padding (20px each side), pill shape (`borderRadius: 100`), minimum height 56px
- [x] CTA includes contextual info where relevant: "Add to Cart - $11.88" (like pizza detail), "Checkout - $26.43" (like green delivery cart) — our "Start Cooking" could show cook time, "Add to Meal Plan" could show the day
- [x] Secondary CTAs: outlined style (border + transparent bg) beside primary (like "Add to Cart" + "Buy Now" side-by-side from ORIX)
- [x] **Test:** Primary CTA is visible without scrolling on all screens where it exists; CTA includes contextual data where specified; minimum tap target 56px height

##### Colored Category Cards ✅
*KOJO, Hi Chriz, and multiple food apps use distinct colored backgrounds per food category — green for salads, orange for mains, purple for desserts — not uniform neutral chips.*
- [x] Define a `CATEGORY_COLORS` map: each cuisine/meal category gets a unique soft pastel background + darker text color pair (e.g., Italian → warm terracotta, Breakfast → soft yellow, Desserts → lavender, Salads → mint)
- [x] Home screen category chips: render as rounded rectangles with category-specific background color + white/dark text + optional small icon or emoji
- [x] Cookbook filter chips: same colored treatment — active category uses solid color, inactive uses 15% opacity tint of that color
- [x] **Test:** Each category renders its unique color; colors meet WCAG contrast on both light/dark mode; no two adjacent categories share the same color

##### Ingredient Emoji Icons ✅
*Multiple recipe apps (dark recipe app, Hi Chriz, burger app) display emoji next to each ingredient — 🧅 Onion, 🥑 Avocado — making lists scannable and friendly.*
- [x] Create an `INGREDIENT_EMOJI` map: common ingredients → emoji (tomato → 🍅, onion → 🧅, chicken → 🍗, avocado → 🥑, egg → 🥚, rice → 🍚, cheese → 🧀, pepper → 🌶️, lemon → 🍋, carrot → 🥕, etc. ~40 items)
- [x] Recipe detail ingredient list: prefix each ingredient row with its matched emoji (or a generic 🥄 fallback)
- [x] Shopping list items: show emoji beside item name for visual scanning
- [x] Cooking mode ingredient checklist: emoji + ingredient text for each row
- [x] **Test:** Known ingredients render correct emoji; unknown ingredients use fallback; emoji renders correctly on both iOS and Android; no duplicate emojis in the map

##### Collection Photo Collage Grid ✅
*Recipe collection/cookbook views in multiple apps show a 2x2 photo collage from contained recipes + a recipe count badge ("39+ Recipes") — much more visually appealing than a single cover image.*
- [x] Cookbook collections list: render each collection as a **2x2 photo grid** (top-left large, three smaller) using the first 4 recipe images in that collection
- [x] Recipe count badge: small pill overlay at bottom-right of the collage showing "12 Recipes" count
- [x] Empty collection: show a placeholder pattern with the Sazon mascot + "Add your first recipe" prompt
- [x] **Test:** Collage renders correctly with 0, 1, 2, 3, and 4+ recipe images; recipe count is accurate; images scale proportionally; placeholder shown for empty collections

##### Recipe Detail Hero Bottom Sheet ✅
*Multiple apps (KOJO, orange recipe app, burger app) show the recipe photo as a full-bleed hero taking ~40% of the screen, with detail content sliding up over it as a bottom sheet with a visible drag handle.*
- [x] Recipe detail (`modal.tsx`): hero image fills the top ~40% of the screen edge-to-edge (no padding, no rounded corners at top)
- [x] Content section starts overlapping the hero image with a rounded top (`borderTopLeftRadius: 24, borderTopRightRadius: 24`) + white/dark background — creates the "sheet over photo" effect
- [x] Small drag handle indicator (40px × 4px, centered, `borderRadius: 2`, gray) at the top of the content section
- [x] Parallax scroll: hero image scales down slightly as user scrolls content up (use `Animated.event` on scroll offset)
- [x] **Test:** Hero image fills full width with no gaps; content section overlaps hero by ~20px; drag handle is centered; parallax scroll animates smoothly; back button is visible over hero image (use semi-transparent dark backdrop)

##### Cooking Steps Vertical Timeline ✅
*Several recipe apps (orange AI recipe app, green Hi Chriz) use a vertical dotted or solid line connecting numbered step circles — a visual progression indicator that's much clearer than plain numbered text.*
- [x] Recipe detail steps section: render each step with a numbered circle (Sazon orange bg, white number) connected by a vertical dotted line to the next step
- [x] Active step (in cooking mode): filled circle with pulse animation; completed steps: checkmark in circle; upcoming steps: outline only
- [x] Line segment between steps: 2px dotted line in `Colors.border` (light) or `rgba(255,255,255,0.2)` (dark)
- [x] **Test:** Timeline renders correctly with 1, 5, and 10+ steps; completed/active/upcoming states display distinct visuals; dotted line connects all steps without gaps; scrolling long step lists works smoothly

##### AI Scanner Floating Labels ✅
*The orange recipe app shows ingredient identification with floating glassmorphic labels overlaid on the camera view — "Tomato ✓", "Basil ✓" appearing near detected items.*
- [x] Scanner result overlay: when barcode/image is scanned, show identified items as **frosted pill labels** floating near the camera preview (using `BlurView` + semi-transparent bg, like a glassmorphic chip)
- [x] Each label: ingredient name + small checkmark icon, positioned with absolute layout, subtle fade-in animation (opacity 0→1 over 300ms with spring)
- [x] Labels auto-dismiss after 2s or when user taps "Add All"
- [x] **Test:** Labels render over camera preview without blocking important content; fade-in animation plays; labels are legible on both light and dark camera backgrounds; auto-dismiss timer works

##### Celebration Social Share ✅
*Multiple apps show a completion/celebration screen with a beautiful food photo background and social share buttons — turning accomplishments into shareable moments.*
- [x] Cooking complete celebration: add a "Share My Creation" button below the confetti/mascot moment
- [x] Share generates a branded card image: recipe photo + recipe name + "Cooked with Sazon Chef" watermark + cook time badge
- [x] Use `react-native-share` or Expo's `shareAsync` to open native share sheet
- [x] Optional: "Add a photo of your dish" camera prompt before sharing — user can snap their actual result
- [x] **Test:** Share button opens native share sheet; generated share image includes recipe name and branding; share works on both iOS and Android; photo capture prompt is skippable

##### 2×2 Macro Grid with Accent Colors ✅
*The orange recipe app and salad apps show macros in a compact 2×2 grid where the numeric values are large and accent-colored (orange/teal numbers, gray labels) — scannable at a glance.*
- [x] Recipe detail macro section: display as a **2×2 grid** (Calories top-left, Protein top-right, Carbs bottom-left, Fat bottom-right) instead of a horizontal row
- [x] Each cell: large accent-colored number (`FontWeight.bold`, `FontSize.xl`) + small gray label below (`FontSize.xs`, `opacity: 0.6`). Colors: Calories = `#FF6B35` (orange), Protein = `#00BFA5` (teal), Carbs = `#FFB300` (amber), Fat = `#7C4DFF` (purple)
- [x] Grid background: subtle `FrostedCard` or light surface fill to group the 4 values visually
- [x] Meal plan daily totals: same 2×2 layout for consistency
- [x] **Test:** Grid renders all 4 macros with correct accent colors; numbers are legible on both light and dark mode; colors match the defined palette; layout doesn't break with large numbers (e.g., 2500 calories)

---

#### **9-Blind Spots: Final Audit Gaps** 🔍
*Patterns that appear across 3+ inspo screenshots AND were flagged by a full screen-by-screen audit of the current app — but aren't covered by any existing Group 9 section.*

##### Animated Splash Screen
*The first thing a user sees. Airbnb and ORIX both have a gradient splash with a logo animation — not a static image. This is a brand moment (P4, P8).*
- [x] Create a custom splash/launch screen: brand gradient background (warm orange → peach, matching `ScreenGradient`) + Sazon logo/mascot fades in with spring scale (0.8 → 1.0) + subtle shimmer
- [x] Splash transitions to auth/home with a cross-fade (not a hard cut)
- [x] Use `expo-splash-screen` `preventAutoHideAsync` + manual `hideAsync` to control timing
- [x] **Test:** Splash renders on both iOS and Android without white flash; animation plays for 1.5–2s; transition to next screen is smooth; dark mode uses dark gradient variant

##### Cook Time Badge on Recipe Card Image
*Almost every inspo app overlays a small translucent time pill ("⏱ 15 min") directly ON the food photo. Currently recipe cards show time as text below the image — this wastes vertical space and separates metadata from the hero image (P1 violation).*
- [x] `RecipeCard` component: add a translucent time badge positioned absolute at bottom-left of the image area — semi-transparent dark bg (`rgba(0,0,0,0.6)`) + white text + `borderRadius: 100` pill + clock icon
- [x] Optional difficulty badge: bottom-right of image ("Easy" in green pill, "Medium" in amber, "Hard" in red)
- [x] Recipe detail hero: same time + difficulty badges overlaid on hero image
- [x] **Test:** Badge is legible over both light and dark food photos; badge doesn't overlap heart/save button; renders correctly at different card sizes

##### Custom Pull-to-Refresh with Mascot
*Every premium app has a branded pull-to-refresh. The default iOS rubber band is a missed brand moment (P8: express personality in the gaps).*
- [x] Create a `SazonRefreshControl` wrapper component: Sazon mascot peeks down as user pulls, transitions to `thinking` expression during refresh, snaps to `chef-kiss` on data return
- [x] Apply to all scrollable tab screens (home, cookbook, meal plan, shopping list)
- [x] Fall back to standard `RefreshControl` if `reduceMotion` is enabled
- [x] **Test:** Custom refresh renders mascot on pull; mascot expression changes during refresh cycle; data reloads on release; `reduceMotion` shows standard refresh control

##### Tab Badge Counts
*Ice cream app cart badge, green delivery app notification count — tabs should communicate pending state (P3: silence is broken UX).*
- [x] Shopping list tab: show count badge (number of unchecked items) when items exist
- [x] Meal plan tab: show indicator dot when today has uncooked meals
- [x] Badge styling: small orange circle (16px) with white number, positioned top-right of tab icon
- [x] Badge animates in with spring scale when count changes
- [x] **Test:** Badge shows correct count; updates in real-time when items are checked off; badge hidden when count is 0; animation plays on count change

##### Skeleton Loader Standardization
*Agent audit flagged inconsistent loading states — some screens use skeletons, some use `ActivityIndicator`, some use mascot. Philosophy bans `ActivityIndicator` outright (P3).*
- [x] Audit every screen for loading state: replace ALL `ActivityIndicator` instances with screen-specific skeleton loaders or `LoadingState` with mascot expression
- [x] Create skeleton templates for: recipe card (image placeholder + text lines), settings row (icon + text line), meal plan day (3 meal slots), shopping list category (header + 4 items)
- [x] Ensure skeleton shimmer animation uses Reanimated (UI thread), not `Animated`
- [x] **Test:** Zero `ActivityIndicator` imports exist in the codebase (grep test); every screen that fetches data shows either a skeleton or mascot loading state; shimmer animation runs at 60fps

##### Auth → App Visual Continuity
*Agent audit found login/register use gradient backgrounds and Moti animations, but main app screens are flat white — feels like two different apps (P8 violation).*
- [x] Ensure `ScreenGradient` (from 9-Inspo) is applied to auth screens with the SAME gradient formula as tab screens — auth should use a slightly stronger tint, not a completely different color scheme
- [x] Onboarding gradient should transition smoothly from auth gradient → app gradient (same color family, decreasing intensity)
- [x] First-run home screen should carry a subtle gradient remnant from onboarding (warm peach tint slightly stronger than normal, fading over first 3 sessions via AsyncStorage counter)
- [x] **Test:** Visual continuity — screenshot auth → onboarding → home in sequence; gradient family is consistent (same hue, varying intensity); no jarring color jump between screens

##### Semantic Color Tokens
*Agent audit found random greens, reds, oranges for status states with no defined hierarchy. Users can't quickly identify action types.*
- [x] Add to `Colors.ts`: `success` (green — `#10B981` light / `#34D399` dark), `warning` (amber — `#F59E0B` / `#FBBF24`), `error` (red — `#EF4444` / `#F87171`), `info` (blue — `#3B82F6` / `#60A5FA`)
- [x] Audit all status-colored elements and replace hardcoded hex values with semantic tokens
- [x] Dietary severity: `error` for allergies (strict), `warning` for preferences (prefer_avoid) — replace current red/yellow with semantic tokens
- [x] Shopping list "can't find": use `warning` color; "purchased": use `success` color
- [x] **Test:** Semantic color tokens exist in Colors.ts for success/warning/error/info; each has light and dark mode variants; no hardcoded red/green/yellow hex values remain for status indicators

##### Swipe Affordance Hints
*Shopping list swipe-to-delete and cookbook long-press are invisible. Users won't discover them (P8: familiar patterns need discoverability).*
- [x] First-time hint: on first shopping list visit, show a subtle animated hint — ghost swipe a sample item 40px left then spring back, once only (AsyncStorage `hasSeenSwipeHint`)
- [x] First cookbook long-press: show a tooltip ("Hold to select multiple") on first visit, dismisses on tap
- [x] Swipe affordance: items show a faint directional arrow or colored edge on the leading side (red for delete, green for complete) visible at rest — disappears after user has swiped 3+ times
- [x] **Test:** Hint animation plays only on first visit; AsyncStorage flag persists; hint doesn't replay after dismissal; affordance edge colors match semantic tokens

##### Animated Counting Numbers on Stats
*MacroFactor reference in REDESIGN_PHILOSOPHY calls this out. Profile stats (meals cooked, streak, recipes saved) and macro totals should count up from 0 on mount — not appear static.*
- [x] Create a `CountingNumber` component: animates from 0 → target value over 800ms using `withTiming` (easeOut) on mount
- [x] Apply to: profile stats row (meals cooked, streak, recipes saved), recipe detail macro values, meal plan daily totals, Sazon Score
- [x] Stagger: if multiple counting numbers are on screen, stagger their start by 100ms each (left to right)
- [x] **Test:** Numbers animate from 0 to correct value; animation duration is ~800ms; stagger delay is visible between adjacent numbers; `reduceMotion` shows final value instantly

##### Modal Backdrop Standardization
*Agent audit found inconsistent backdrop opacities (`rgba(0,0,0,0.55)` vs `rgba(0,0,0,0.85)`) across different modals.*
- [x] Define modal backdrop tokens in `Colors.ts`: `backdrop.light` = `rgba(0,0,0,0.4)` (standard modals), `backdrop.heavy` = `rgba(0,0,0,0.7)` (celebration overlays, paywall)
- [x] Audit all modal/overlay components — standardize to use backdrop tokens instead of hardcoded values
- [x] All modal backdrops: fade in over 200ms (not instant)
- [x] **Test:** All modals use one of the two defined backdrop opacities; no hardcoded rgba backdrop values remain; fade-in animation plays

##### Premium Upsell Banner Visual Upgrade
*Current CoffeeBanner is text-heavy. The chicken/bakery app shows "Unlock Unlimited Recipes" as a rich dark rounded card with illustration — visually compelling, not nagging.*
- [x] Redesign `CoffeeBanner`: dark gradient background (`#1A1A2E` → brand navy) + Sazon mascot illustration on the right side + bold white headline ("Unlock the full menu") + subtle shimmer on CTA button
- [x] `borderRadius: 20` + `Shadows.LG` — should feel like a premium card, not an ad banner
- [x] Home screen premium upsell: similar dark card treatment in the recipe feed (between carousels, not above content) — only for free-tier users
- [x] **Test:** Banner renders with dark gradient on both light and dark mode; mascot illustration is visible; CTA is tappable; banner only shows for free-tier users; 7-day cooldown logic still works

##### Trending/Ranking Badges on Recipe Cards
*Dark recipe app shows "Top Trending #1" badge overlaid on cards. Von Restorff Effect (P4) — the best content should visually pop and look different from everything else.*
- [x] Top-rated recipe cards: add a small gradient badge at top-left of the card image ("🔥 Top Pick" or "⭐ #1 This Week") with orange gradient bg + white text
- [x] Recipe of the Day card on home: larger badge treatment ("Recipe of the Day" banner) with distinct visual presence
- [x] Badge only appears on recipes meeting a threshold (e.g., Sazon Score > 85 or top 5% for that user)
- [x] **Test:** Badge renders only on qualifying recipes; badge doesn't overlap other card elements (heart, time); gradient renders correctly; badge hidden on recipes below threshold

---

#### **9K: Pastel Color System & Gradient Foundation** 🎨
*The inspo folder's loudest signal: pastel-tinted surfaces everywhere. Every card, every stat, every category gets a subtle color identity. This is the single biggest gap between our current flat white UI and the warm, alive aesthetic in the inspo. Must be built as tokens FIRST so every screen-level task can consume them.*

##### Pastel Accent Token System
*Each macro, category, and state gets its own pastel. Light tints for backgrounds, vivid versions for progress rings and chart accents. See REDESIGN_PHILOSOPHY.md Color Palette for full spec.*
- [x] Add to `Colors.ts` — **light pastel tints** (card/widget backgrounds):
  - `pastel.sage` → `#E8F5E9` (protein, healthy, vegetables, success)
  - `pastel.golden` → `#FFF8E1` (carbs, breakfast, streaks, star ratings)
  - `pastel.lavender` → `#F3E5F5` (fat/lipids, activity, premium badges)
  - `pastel.peach` → `#FFF3E0` (calories, meal plan, warm prompts)
  - `pastel.sky` → `#E3F2FD` (hydration, cooking time, info states)
  - `pastel.blush` → `#FCE4EC` (desserts, treats, cheat meal tags)
  - `pastel.orange` → `#FFF0E5` (Sazon brand tint for warm card backgrounds)
  - `pastel.red` → `#FFF0EE` (error state backgrounds, severity badges)
- [x] Add to `Colors.ts` — **vivid accents** (rings, charts, active indicators):
  - `accent.sage` → `#81C784`, `accent.golden` → `#FFD54F`, `accent.lavender` → `#CE93D8`
  - `accent.peach` → `#FFB74D`, `accent.sky` → `#64B5F6`, `accent.blush` → `#F06292`
- [x] Add to `Colors.ts` — **dark mode pastel adaptation** (rgba overlays at 12% opacity on `#1C1C1E`):
  - `pastelDark.sage` → `rgba(129, 199, 132, 0.12)`, `pastelDark.golden` → `rgba(255, 213, 79, 0.12)`
  - `pastelDark.lavender` → `rgba(206, 147, 216, 0.12)`, `pastelDark.peach` → `rgba(255, 183, 77, 0.12)`
  - `pastelDark.sky` → `rgba(100, 181, 246, 0.12)`, `pastelDark.blush` → `rgba(240, 98, 146, 0.12)`
- [x] Create **macro-to-color mapping** constant: `MACRO_COLORS = { protein: { bg: pastel.sage, accent: accent.sage }, carbs: { bg: pastel.golden, accent: accent.golden }, fat: { bg: pastel.lavender, accent: accent.lavender }, calories: { bg: pastel.peach, accent: accent.peach } }`
- [x] **Test:** All pastel tokens exist in Colors.ts with both light and dark variants; `MACRO_COLORS` maps all 4 macros correctly; dark mode pastels render as subtle tints (not blown-out light colors) on dark card surfaces

##### Gradient Presets
*Gradients are everywhere in the inspo — backgrounds, CTAs, overlays, onboarding. Centralise them so every screen pulls from the same source.*
- [x] Create `frontend/constants/Gradients.ts` with named presets:
  - `primaryCTA: ['#FF8B41', '#E84D3D']` (orange → red — primary action buttons)
  - `secondaryCTA: ['#FF8B41', '#FFB74D']` (orange → peach — softer CTA)
  - `successCTA: ['#66BB6A', '#43A047']` (green — "Start Cooking", "Complete")
  - `premiumCTA: ['#FF8B41', '#F06292']` (orange → pink — premium/paywall)
  - `screenBgLight: ['#FAF7F4', '#FFF5EE']` (warm cream gradient — all tab screens)
  - `screenBgDark: ['#1A1A2E', '#0F0F0F']` (deep navy → black — dark mode screens)
  - `onboarding1: ['#FFF0E5', '#FAF7F4']` (peach → cream — Welcome screen)
  - `onboarding2: ['#E8F5E9', '#FAF7F4']` (sage → cream — Restrictions screen)
  - `onboarding3: ['#F3E5F5', '#FAF7F4']` (lavender → cream — Goal screen)
  - `authBg: ['rgba(255,139,65,0.12)', '#FAF7F4']` (warm orange tint → cream)
  - `paywallBg: ['#1A1A2E', 'rgba(255,139,65,0.15)']` (dark + orange glow)
  - `cardOverlay: ['transparent', 'rgba(0,0,0,0.65)']` (image text legibility)
  - `heroWarm: ['transparent', 'rgba(255,139,65,0.15)']` (warm orange hero tint)
- [x] Update `ScreenGradient` component (from 9-Inspo) to consume `Gradients.ts` presets instead of hardcoded values
- [x] Update existing `GradientButton` to accept a `gradient` prop that defaults to `Gradients.primaryCTA`
- [x] **Test:** All gradient presets export correctly; `ScreenGradient` renders different presets per screen; `GradientButton` accepts custom gradient arrays; gradients render on both iOS and Android without banding artifacts

##### Brand Button System 🔘
*The "Surprise Me!" FAB nails the feel we want everywhere: gradient pill, bold white text, spring press, colored shadow glow. We need this exact shape as a reusable primitive — a `BrandButton` component — with a **primary brand variant** (orange→red) plus **pastel accent variants** derived from the 9K pastel/accent tokens. Every CTA, chip, and action button in the app should be an instance of this one component.*

**Reference:** `SurpriseMeFAB.tsx` (gradient pill + spring bounce + shadow glow), `GradientButton.tsx` (current generic version — no spring animation, no shadow, no variants), `HomeHeader.tsx` Filters button (spring press + icon rotation + badge)

**Primary brand button (base):**
- [x] Create `frontend/components/ui/BrandButton.tsx` — extends the gradient pill shape:
  - Full-width `borderRadius: 100` pill, `LinearGradient` background, white bold text, optional left icon
  - Reanimated spring press: scale 0.95 on press-in, bounce back 1.0 on press-out (matches SurpriseMeFAB feel)
  - Colored shadow glow: `shadowColor` matches the gradient's dominant hue (e.g., `#EF4444` for fire variant)
  - Idle pulse option: subtle 1.0→1.02 breathing animation for hero CTAs (like Surprise Me), off by default
  - Loading state: `ActivityIndicator` replaces label with spring fade
  - Disabled state: 55% opacity, spring ignored
  - Default gradient: brand orange→red (`['#fa7e12', '#EF4444']`)

**Pastel accent variants:**
- [x] Add `variant` prop with named presets that map to 9K pastel/accent tokens:
  - `'brand'` (default): orange→red gradient, red shadow — primary CTAs (Save, Apply, Start Cooking)
  - `'sage'`: sage green gradient (`['#81C784', '#66BB6A']`), green shadow — success actions (Add to Meal Plan, Complete)
  - `'golden'`: amber gradient (`['#FFD54F', '#FFC107']`), amber shadow, dark text — highlight actions (Streak, Rate)
  - `'lavender'`: purple gradient (`['#CE93D8', '#AB47BC']`), purple shadow — premium actions (Upgrade, Meal Prep)
  - `'peach'`: warm peach gradient (`['#FFB74D', '#FF9800']`), orange shadow — warm prompts (Discover, Explore)
  - `'sky'`: blue gradient (`['#64B5F6', '#42A5F5']`), blue shadow — info actions (Share, Add to List)
  - `'blush'`: pink gradient (`['#F06292', '#EC407A']`), pink shadow — fun actions (Surprise Me, Cheat Meal)
  - `'ghost'`: transparent→5% opacity fill, no shadow, tinted text — secondary/cancel actions
- [x] Each variant auto-derives: gradient colors, shadow color, text color (white for all except `golden` which uses dark text, `ghost` uses tinted text)
- [x] Dark mode: same gradients but shadow opacity reduced to 20%, gradient saturation slightly boosted

**Compact chip variant:**
- [x] Add `size` prop: `'large'` (default, 17px text, py-14, px-24) and `'compact'` (14px text, py-8, px-14)
  - Compact matches the HomeHeader Filters button and quick filter chip dimensions
  - Used for: filter chips, quick actions, inline CTAs
  - Large matches SurpriseMeFAB / Start Cooking dimensions
  - Used for: hero CTAs, bottom sheet apply buttons, onboarding next buttons

**Migration — replace existing buttons:**
- [x] Migrate `GradientButton.tsx` → thin wrapper around `BrandButton` (backward compat, maps `GradientPresets` to variants)
- [x] Migrate `SurpriseMeFAB.tsx` → uses `BrandButton` variant `'brand'` with `idlePulse` enabled
- [x] Migrate HomeHeader Filters button → uses `BrandButton` size `'compact'` variant `'brand'`
- [x] Migrate FilterSheet Apply button → uses `BrandButton` variant `'brand'` with filter count in label
- [x] Audit all `HapticTouchableOpacity` + `LinearGradient` combos across the app and migrate to `BrandButton`
  - Migrated: MealPlanEmptyState "Plan My Week" CTA, CoffeeBanner "Support Sazon" CTA
  - Kept as-is (custom chip/cell patterns, not button shapes): CollectionFilterRow (collection chip with count badge), WeeklyCalendar DayPill (calendar cell with date/meals)

**Test:**
- [x] All 8 variants render correct gradient + shadow color
- [x] Spring press animation fires on press-in/press-out
- [x] Idle pulse only active when `idlePulse` prop is true
- [x] Compact size renders smaller dimensions than large
- [x] Dark mode shadow opacity is reduced
- [x] Loading state shows spinner, disabled state blocks press
- [x] Backward compat: `GradientButton` still works after migration
- [x] Accessibility: all variants have correct role, label, and disabled state

##### Category Color Map
*Each food category gets a unique pastel tint — making chips, cards, and filters scannable at a glance. Seen in KOJO, Copper Spoon, and multiple recipe apps.*
- [x] Create `frontend/constants/CategoryColors.ts`:
  - `CATEGORY_COLORS` map: `{ breakfast: { bg: '#FFF8E1', text: '#F57F17', emoji: '🥞' }, lunch: { bg: '#E8F5E9', text: '#2E7D32', emoji: '🥗' }, dinner: { bg: '#FFF3E0', text: '#E65100', emoji: '🍝' }, dessert: { bg: '#FCE4EC', text: '#C2185B', emoji: '🍰' }, snack: { bg: '#F3E5F5', text: '#7B1FA2', emoji: '🥨' }, healthy: { bg: '#E8F5E9', text: '#2E7D32', emoji: '💪' }, quick: { bg: '#E3F2FD', text: '#1565C0', emoji: '⚡' }, budget: { bg: '#FFF8E1', text: '#F57F17', emoji: '💰' } }`
  - `CUISINE_COLORS` map: `{ italian: { bg: '#FFF3E0', emoji: '🍝' }, mexican: { bg: '#FFF0E5', emoji: '🌮' }, korean: { bg: '#FCE4EC', emoji: '🥘' }, thai: { bg: '#E8F5E9', emoji: '🍜' }, indian: { bg: '#FFF8E1', emoji: '🍛' }, american: { bg: '#FFF3E0', emoji: '🍔' }, japanese: { bg: '#E3F2FD', emoji: '🍱' }, chinese: { bg: '#FFF0EE', emoji: '🥟' }, mediterranean: { bg: '#E8F5E9', emoji: '🫒' }, french: { bg: '#F3E5F5', emoji: '🥐' } }`
- [x] Apply to home screen quick filter chips: render with category-specific `bg` color + `emoji` prefix + `text` color
- [x] Apply to cookbook filter chips: active = solid category color, inactive = 15% opacity tint
- [x] Apply to onboarding cuisine selection chips: icon + label + pastel background
- [x] Apply to meal plan meal type indicators (breakfast/lunch/dinner labels on cards)
- [x] **Test:** Each category renders its unique color; no two adjacent categories share the same color in chip rows; colors meet WCAG contrast on both light and dark; emoji renders correctly on both platforms

---

#### **9L: Widget Cards & Colorful Analytics** 📊
*The inspo folder — Apple Health widgets, Duolingo streaks, MacroFactor rings, Copper Spoon dashboards — demands that data be shown as beautiful, colorful visual moments. Not plain text. This is the biggest transformation for the meal plan, profile, and cooking completion screens.*

##### WidgetCard Component ✅
*A reusable pastel-tinted stat card used across macro display, profile stats, cooking stats, shopping progress. The foundational building block for colorful analytics.*
- [x] Create `frontend/components/ui/WidgetCard.tsx`:
  - Props: `tint` (pastel bg color), `icon` (emoji or Lucide icon), `statValue` (string/number), `statUnit` (optional — "g", "kcal", "days"), `label` (descriptive text), `trend` (optional — `{ value: string, direction: 'up' | 'down' }`)
  - Layout: `borderRadius: 20`, no border, `Shadows.SM`, pastel `tint` background, `icon` top-left, `statValue` in `FontSize.stat` (28px) / `FontWeight.extrabold`, `statUnit` next to value in `FontSize.caption` at 50% opacity, `label` below in `FontSize.label`, optional `trend` arrow in sage (up) or blush (down)
  - Dark mode: use pastelDark tint from Colors.ts instead of light pastel
  - Support `onPress` for tappable widgets (e.g., tap protein card → see protein breakdown)
- [x] Create `frontend/components/ui/WidgetGrid.tsx` — a 2×2 grid layout wrapper (`flexWrap: 'wrap'`, `gap: 12`) that renders 4 `WidgetCard` children
- [x] **Test:** WidgetCard renders with correct tint, stat, label, and trend on both platforms; WidgetGrid renders 4 cards in a 2×2 layout; dark mode uses dark pastel tints; `onPress` fires when provided

##### Macro Widget Grid (Meal Plan Screen) ✅
*Replace the current plain-text macro summary with a colorful 2×2 grid of pastel-tinted widget cards — the single most visual upgrade for the meal plan screen. Inspired by Apple Health goal cards and the widgets-goals inspo image.*
- [x] Add `MacroWidgetGrid` to the top of the meal plan screen (above day selector) — implemented as `DailyMacrosSummary` component:
  - Protein card: sage green tint, 🥩 icon, bold gram value, "Protein" label, weekly trend arrow
  - Carbs card: golden yellow tint, 🌾 icon, bold gram value, "Carbs" label, weekly trend
  - Fat card: soft lavender tint, 🥑 icon, bold gram value, "Fat" label, weekly trend
  - Calories card: warm peach tint, 🔥 icon, bold kcal value, "Calories" label, daily goal % ring
- [x] Each card uses `CountingNumber` (from 9-Blind Spots) to animate from 0 → value on mount
- [x] Tapping a macro card could expand to show a weekly sparkline (progressive disclosure)
- [x] Daily totals below the grid update as user selects different days
- [x] **Test:** Grid renders above day selector; values match actual meal plan data; counting animation plays on mount; dark mode uses dark pastel tints; tapping cards is responsive

##### Progress Ring Component ✅
*A reusable circular progress indicator used for daily calorie goal, shopping progress, cooking streak, Sazon Score. Inspired by Apple Fitness rings.*
- [x] Create `frontend/components/ui/ProgressRing.tsx`:
  - Props: `progress` (0–1), `size` (diameter), `strokeWidth`, `color` (gradient array or solid), `bgColor` (track color), `children` (center content — icon, number, mascot)
  - Implement with `react-native-svg` `Circle` + `strokeDasharray`/`strokeDashoffset`
  - Animated: ring fills from 0 → progress value on mount using Reanimated `withTiming`
  - Support gradient stroke via `LinearGradient` + `Defs` in SVG
- [x] Create `frontend/components/ui/ConcentricRings.tsx` — Apple Fitness-style nested rings:
  - Outer ring: calories (peach vivid gradient)
  - Middle ring: protein (sage vivid gradient)
  - Inner ring: cooking streak (Sazon orange gradient)
  - Center: Sazon mascot expression or day number
- [x] **Test:** Ring animates from 0 to correct progress; gradient renders; nested rings don't overlap; `reduceMotion` shows final state instantly; ring handles 0%, 50%, 100%, and >100% values

##### Meal Plan Screen — Colorful Analytics Integration ✅
*Apply the widget cards, progress rings, and pastel tints to the meal plan screen specifically. This screen becomes the analytics dashboard of the app.*
- [x] **Daily calorie ring** — large ProgressRing (120px) showing today's calories vs goal, centered above the macro widget grid. Sazon mascot expression in center (happy if on track, thinking if behind, chef-kiss if exceeded)
- [x] **Day cards with alternating pastel tints** — each day of the week gets a subtle pastel tint so the week feels colorful: Mon = peach, Tue = sage, Wed = sky, Thu = golden, Fri = lavender, Sat = blush, Sun = orange
- [x] **Meal type indicators** — breakfast/lunch/dinner/snack labels on meal cards rendered as small pastel pills with matching CategoryColors
- [x] **Weekly nutrition trend** — DailyMacrosSummary sparkline charts per macro with weekly data points, day labels, expandable per-macro view
- [x] **Empty day state** — Sazon `curious` expression on AnimatedEmptyState with mascot on pastel bg + "Add meals" friendly copy
- [x] **Meal plan generation loading** — Sazon `thinking` on a peach gradient background + sequential status messages ("Building your perfect week...", "Planning your week...", "Creating your meal plan...")
- [x] **Test:** Calorie ring shows correct daily total; day tints alternate correctly; meal type pills use CategoryColors; weekly trend chart renders with correct macro data; empty state shows mascot on pastel bg; generation loading shows mascot + messages

##### Profile Screen — Stat Widget Grid & Streak Calendar ✅
*Transform the profile stats from static text into a colorful widget dashboard. The streak calendar is the Duolingo move that makes users addicted to consistency.*
- [x] **Stat widget grid** (2×2 or 1×3 row) at top of profile:
  - Cooking streak: golden yellow tint, 🔥 flame icon, bold day count, "Day Streak" label, animated flame pulse
  - Recipes cooked: sage green tint, 👨‍🍳 icon, bold count, "Recipes Cooked" label
  - Sazon Score: warm peach tint, ⭐ icon, bold score with ProgressRing behind it
  - Recipes saved: sky blue tint, 📚 icon, bold count, "In Cookbook" label
- [x] **Streak calendar heat map** (Duolingo-style) below stats:
  - 7-column calendar grid showing last 4 weeks
  - Each day: small circle — sage green dot = cooked that day, faint gray = no activity, Sazon orange = today
  - Current streak number prominent: "🔥 12 day streak" with CountingNumber animation
  - Streak milestones (7, 14, 30 days): golden border on day circles for milestone days
- [x] **Weekly progress comparison** — "This Week vs Last Week" mini comparison cards:
  - Meals cooked this week (sage) vs last week
  - Avg calories (peach) with trend arrow
  - New recipes tried (sky) count
- [x] **Test:** Widget grid renders with correct data and pastel tints; streak calendar shows correct days; today is highlighted; streak count matches actual consecutive cooking days; heat map handles months with different day counts; CountingNumber animates on mount

##### Cooking Complete — Colorful Stat Cards ✅
*The cooking completion celebration (9C) should include colorful stat cards, not just confetti. Each cooking stat gets its own pastel-tinted mini widget.*
- [x] After confetti + Sazon chef-kiss, slide up a row of stat cards:
  - Cook time: sky blue tint (`#E3F2FD`), bold time value
  - Steps completed: sage green tint (`#E8F5E9`), bold count ("8/8 steps")
  - Calories: peach tint (`#FFF3E0`), bold kcal value
  - Difficulty: lavender tint (`#F3E5F5`), difficulty badge ("Easy" / "Medium" / "Hard")
- [x] Stat cards stagger in from bottom (100ms delay per card, spring animation in CelebrationOverlay)
- [x] Each stat value displays with correct pastel tints via `CelebrationOverlay` stats prop
- [x] **Test:** All 4 stat cards render with correct values; stagger animation plays; stats match actual cooking session data

##### Shopping List — Progress Ring & Aisle Tints ✅
*The shopping list needs a visual progress indicator and color-coded aisle sections.*
- [x] **Progress ring at top** — `ShoppingListProgress` component with ProgressRing (80px) showing % items purchased. Ring color transitions from Sazon orange → sage green as progress increases. Center shows remaining count in bold
- [x] **Aisle section headers with pastel tints** — `AISLE_TINT` map in shopping-list screen + `AISLE_EMOJI` from hook:
  - Produce → sage green tint + 🥬
  - Dairy → sky blue tint + 🥛
  - Meat → blush pink tint + 🥩
  - Bakery → golden yellow tint + 🍞
  - Pantry → warm peach tint + 🥫
  - Frozen → sky blue tint + 🧊
  - Snacks → lavender tint + 🍿
  - Can't Find → warm peach tint + 🤷
- [x] **Section completion** — when all items in an aisle are checked, header opacity reduces to 0.5 + "✓ Done" badge
- [x] **Test:** Progress ring updates in real-time as items are checked; aisle headers render with correct pastel tints and emoji; section completion state displays; ring reaches 100% when all items done

---

#### **9M: Ingredient & Category Visual Identity** 🥑 ✅ COMPLETE
*The inspo folder's most striking pattern: ingredient lists with beautiful illustrated icons, not plain text. Every recipe app that looks premium has this. Combined with the category icon system, this transforms text-heavy screens into visual feasts.*

##### Ingredient Icon Map (Comprehensive) ✅
*The beautiful-ingredient-icons inspo images show photorealistic icons next to every ingredient. We start with emoji (free, instant) and upgrade to illustrations later.*
- [x] Create `frontend/constants/IngredientEmoji.ts` with `INGREDIENT_EMOJI_MAP` (~120 items):
  - **Proteins:** chicken → 🍗, beef → 🥩, pork → 🥓, fish → 🐟, shrimp → 🦐, egg → 🥚, tofu → 🫘, turkey → 🦃, salmon → 🐟, tuna → 🐟, lamb → 🥩, bacon → 🥓, sausage → 🌭
  - **Vegetables:** tomato → 🍅, onion → 🧅, garlic → 🧄, pepper → 🌶️, carrot → 🥕, broccoli → 🥦, corn → 🌽, potato → 🥔, mushroom → 🍄, lettuce → 🥬, spinach → 🥬, cucumber → 🥒, avocado → 🥑, celery → 🥬, zucchini → 🥒, eggplant → 🍆, peas → 🫛, sweet potato → 🍠, cabbage → 🥬, cauliflower → 🥦, green onion → 🧅, ginger → 🫚, jalapeño → 🌶️, bell pepper → 🫑
  - **Fruits:** lemon → 🍋, lime → 🍈, apple → 🍎, banana → 🍌, orange → 🍊, strawberry → 🍓, blueberry → 🫐, mango → 🥭, pineapple → 🍍, coconut → 🥥, grape → 🍇, watermelon → 🍉, peach → 🍑, pear → 🍐, cherry → 🍒, kiwi → 🥝
  - **Dairy:** milk → 🥛, cheese → 🧀, butter → 🧈, yogurt → 🥛, cream → 🥛, cream cheese → 🧀, sour cream → 🥛, mozzarella → 🧀, parmesan → 🧀
  - **Grains:** rice → 🍚, pasta → 🍝, bread → 🍞, flour → 🌾, oats → 🌾, tortilla → 🫓, noodles → 🍜, quinoa → 🌾, couscous → 🌾, cornstarch → 🌾
  - **Pantry:** olive oil → 🫒, soy sauce → 🥫, honey → 🍯, sugar → 🍬, salt → 🧂, vinegar → 🫙, peanut butter → 🥜, chocolate → 🍫, vanilla → 🌿, cinnamon → 🌿, cumin → 🌿, paprika → 🌶️, oregano → 🌿, basil → 🌿, thyme → 🌿, rosemary → 🌿, bay leaf → 🍃, chili flakes → 🌶️, nutmeg → 🌰, curry powder → 🍛
  - **Nuts/Seeds:** almond → 🌰, walnut → 🌰, peanut → 🥜, cashew → 🌰, sesame → 🌰, sunflower seeds → 🌻, chia seeds → 🌱, flaxseed → 🌱
  - **Liquids:** water → 💧, broth → 🥣, stock → 🥣, wine → 🍷, beer → 🍺, coconut milk → 🥥, juice → 🧃
  - **Fallback categories:** vegetable → 🥬, fruit → 🍎, meat → 🥩, seafood → 🦐, spice → 🌿, grain → 🌾, dairy → 🥛, nut → 🥜, liquid → 💧, other → 🥄
- [x] Create `getIngredientEmoji(name: string): string` function — fuzzy match ingredient name against map keys (lowercase, remove plurals, strip modifiers like "fresh", "diced", "chopped"), return emoji or fallback
- [x] **Test:** Known ingredients return correct emoji; fuzzy matching handles "diced tomatoes" → 🍅, "fresh basil leaves" → 🌿, "chicken breast" → 🍗; unknown ingredients return 🥄 fallback; no crashes on empty/null input

##### Recipe Detail — Visual Ingredient List ✅
*Transform the ingredient list from plain text bullets into a visually rich display with emoji icons, bold amounts, and grouped sections. Inspired by the beautiful-ingredient-icons inspo images.*
- [x] Each ingredient row: `[emoji icon] [ingredient name]` left-aligned + `[bold amount]` right-aligned (e.g., 🧅 Green onion ............. **10g**)
  - Emoji from `getIngredientEmoji()`
  - Name in `Body` typography (15px/400)
  - Amount in `Body Bold` typography (15px/600)
  - Row height: 48px minimum with `paddingVertical: 8`
- [x] Group ingredients by section when recipe provides them ("The sauce", "The chicken", etc.) — section headers in `Heading 3` (17px/600)
- [x] Metric/US toggle pill at the top of ingredients section (like the inspo — rounded segmented control with `borderRadius: 100`)
- [x] Serving adjuster (– 1 serving +) with rounded pill buttons on peach pastel bg
- [x] **Test:** All ingredients show correct emoji; amounts are right-aligned and bold; sections group correctly; serving adjuster recalculates amounts

##### Recipe Detail — Macro Pills Row with Pastel Tints ✅
*Replace the current plain macro pills with pastel-tinted pills, each macro its own color. Inspired by the 2×2 macro grid and nutrition circles in inspo.*
- [x] Macro pills row below the recipe metadata strip:
  - Protein pill: sage green bg (`pastel.sage`), sage vivid text, "32g protein"
  - Carbs pill: golden bg (`pastel.golden`), golden vivid text, "45g carbs"
  - Fat pill: lavender bg (`pastel.lavender`), lavender vivid text, "18g fat"
  - Calories pill: peach bg (`pastel.peach`), peach vivid text, "480 kcal"
  - Optional fiber pill: sky bg, "8g fiber"
- [x] Pills are `borderRadius: 100` (pill shape), horizontal scroll if needed
- [x] Each pill: pastel tint bg + vivid accent text + bold number + regular unit
- [x] **Test:** All macro pills render with correct pastel tints; colors match MACRO_COLORS mapping; pills scroll horizontally on small screens; values are accurate

##### Cooking Mode — Ingredient Checklist with Icons ✅
*The cooking mode ingredient checklist should show emoji icons next to each ingredient for quick visual scanning while hands are busy.*
- [x] `IngredientChecklist.tsx`: prefix each row with emoji from `getIngredientEmoji()`
- [x] Checked items: emoji stays, text gets strikethrough + reduced opacity, spring scale animation
- [x] Group by recipe section if applicable
- [x] **Test:** Emoji renders next to each ingredient; check/uncheck animates; all ingredients from recipe appear

##### Shopping List — Ingredient Icons ✅
*Shopping list items should also show ingredient emoji for visual scanning, especially in in-store mode where users are moving fast.*
- [x] `ShoppingListItem.tsx`: add emoji prefix from `getIngredientEmoji()` before item name
- [x] In-store mode: emoji is especially prominent (slightly larger) for fast scanning
- [x] **Test:** Emoji renders on shopping list items; emoji matches ingredient; items without a match show fallback emoji

##### Home Screen — Category Chips with Icons & Pastel Tints ✅
*Replace text-only filter chips with icon + label chips on pastel backgrounds. The most visible application of CategoryColors.*
- [x] Quick filter chips: render as `[emoji] [label]` on `CATEGORY_COLORS[category].bg` background with `CATEGORY_COLORS[category].text` text color
- [x] Active chip: full pastel color bg + dark text. Inactive: 15% opacity tint of that pastel
- [x] Spring scale on selection (via `HapticTouchableOpacity`)
- [x] Horizontally scrollable row with `showsHorizontalScrollIndicator: false`
- [x] **Test:** Each chip shows correct emoji + color; active/inactive states are visually distinct; horizontal scroll works without jank

##### Cookbook Screen — Collection Photo Collage with Count Badge ✅
*Multiple inspo apps show recipe collections as a 2×2 photo grid with a count badge — much richer than a single cover image.*
- [x] Each collection card: `CollectionCollageGrid` with 2×2 photo grid using first 4 recipe images
  - Top-left image: larger (2/3 width), right column: smaller
  - All images: `borderRadius: 12`, `overflow: hidden`
- [x] Recipe count badge: small dark pill at bottom-right overlay ("12 Recipes")
- [x] Collection name below the grid in carousel header
- [x] Empty collection: Sazon mascot placeholder + "Add recipes"
- [x] **Test:** Collage renders correctly with 0, 1, 2, 3, and 4+ recipe images; placeholder shows for empty collections; count badge is accurate

---

#### **9N: Onboarding, Auth & Error States — Pastel Personality** 🌸
*The inspo folder shows onboarding with full-screen pastel gradient backgrounds, mascot reactions per screen, and warm, inviting color stories. Error and empty states get pastel backgrounds + mascot expressions instead of flat white + gray text.*

##### Onboarding — Pastel Gradient Backgrounds Per Step
*Each onboarding screen gets its own pastel gradient from `Gradients.ts`. Sazon mascot reacts differently per screen. Seen in the pastel-sample-gradient inspo images.*
- [x] Screen 1 (Welcome/Name): `Gradients.onboarding1` (peach → cream) background. Sazon `waving` expression. Large hero text: "What's your name?" in `FontSize.hero` / `FontWeight.extrabold`
- [x] Screen 2 (Restrictions): `Gradients.onboarding2` (sage → cream) background. Sazon `thinking` expression. Restriction options as icon + label chips with pastel tints (red pastel for allergies, yellow for preferences). Max 5 shown + "More" disclosure
- [x] Screen 3 (Goal): `Gradients.onboarding3` (lavender → cream) background. Sazon `excited` expression. Three large goal cards: "Eat Healthy" (sage tint), "Save Time" (sky tint), "Explore Cuisines" (peach tint) — each with an icon and short description
- [x] Transition between screens: spring slide (scale 0.95 → 1.0 + opacity) with gradient crossfade
- [x] Progress indicator at top: 3-dot pagination with orange active dot
- [x] **Test:** Each screen renders its unique gradient; mascot expression changes per screen; transitions are smooth; progress dots update; user can complete onboarding in exactly 3 taps

##### Auth Screens — Brand Gradient + Mascot
*Login and register should feel warm and branded, not like a utility gate.*
- [x] Background: `Gradients.authBg` (warm orange tint → cream) — subtle but distinctly warmer than the main app
- [x] Sazon mascot bounces in on warm pastel background card at top
- [x] Form inputs grouped in a `FrostedCard` with subtle shadow — not floating individually
- [x] Social login buttons (Google, Apple): on white card with `Shadows.SM`, `borderRadius: 14`
- [x] Error: Sazon `confused` expression replaces the form header + pastel red tint on error card
- [x] Success: brief Sazon `excited` flash (300ms) before navigation
- [x] **Test:** Gradient renders; mascot bounces in; form fields are grouped; error shows mascot + pastel tint; visual continuity from auth → onboarding → home (same color family)

##### Error States — Pastel Backgrounds + Mascot
*Every error state should feel like a moment of personality, not a system failure.*
- [x] API error: Sazon `confused` on lavender pastel background card + witty message ("Hmm, something went sideways — let me try again")
- [x] No results: Sazon `thinking` on peach pastel background card + "Let me think of something else..." + re-generate CTA
- [x] Network offline: Sazon with umbrella expression on sky blue pastel background + "We'll be back when you're connected"
- [x] Timeout: Sazon `sleeping` on golden pastel background + "That took too long — want to try again?"
- [x] Apply to all `AnimatedEmptyState` instances — ensure every empty state has a pastel tint bg, not flat white
- [x] **Test:** Each error type renders correct mascot expression + pastel tint; error messages are friendly (no "Error:", "Failed to", "Invalid"); all empty states have pastel backgrounds

##### Paywall Screen — Dark + Gradient + Colorful Feature Icons
*The paywall is the most important business moment. Dark backgrounds with colorful accents create a premium feel.*
- [x] Background: `Gradients.paywallBg` (dark → orange glow)
- [x] Feature list items: each feature gets a small pastel-tinted icon badge (sage for unlimited recipes, golden for AI meal plans, lavender for analytics, peach for priority support)
- [x] Feature icons are small colored circles with white Lucide icons inside
- [x] Price section: gradient pill with price, spring entrance
- [x] CTA: `Gradients.premiumCTA` (orange → pink) + idle shimmer every 3s
- [x] Post-conversion: golden confetti + "Welcome to Premium!" on golden pastel background + Sazon `celebrating`
- [x] **Test:** Dark gradient renders; feature icons have distinct pastel tints; CTA shimmers; conversion celebration plays

---

#### **9O: Quick Actions Menu Audit & IA Reorganization** 🧹 ✅ SHIPPED (two-tier sheet; contextual relocation deferred)

> **Implementation note (post-ship):** Picked the **two-tier sheet** IA pattern. `frontend/components/action-sheet/QuickActionsSheet.tsx` wraps `ActionSheet` with a primary list of 5 hero items + a "More actions →" row that swaps the same sheet to a secondary list of 8 long-tail items (no close-then-reopen — added a `keepOpen?: boolean` flag to `ActionSheetItem` to support the in-place tier swap). Primary tier: Build a plate (sage hero) / Cook for the family / Log a Meal / Take a Picture / Surprise Me! Secondary tier: Add Recipe / Import Recipe / Quick Timer / Input Daily Weight / Edit Preferences / Create Collection / Create Shopping List / Shopping Mode. **Verification metrics:** ≤6 always-visible rows ✅ (5 hero + "More"), Build-a-Plate stays hero ✅, every item still reachable ✅, tap-through retention not measured (no analytics endpoint yet — proxy verification via test coverage of every item's onPress wiring). **Deferred to follow-up:** contextual relocation of Add Recipe / Import Recipe / Create Collection → Cookbook header (and Edit Preferences / Daily Weight → Profile cards). The two-tier IA is the right surface; the relocation is the natural next pass once those receiving screens get their own audit.

> The center "+" FAB action sheet has grown to **11 items** as features shipped opportunistically (Build a plate, Cook for the family, Take a Picture, Surprise Me!, Add Recipe, Import Recipe, Log a Meal, Quick Timer, Input Daily Weight, Edit Preferences, Create Collection). Long lists aren't strictly bad, but at 11 items they (a) create choice paralysis, (b) dilute the hero affordance (Build a plate at the top is competing with 10 siblings), and (c) bury contextual actions where they don't belong (Edit Preferences in a "+" menu reads like settings creep).

> **Why now.** Build-a-Plate just became the hero of this menu (commit `2dc7ec2`). Before we let the menu calcify, audit every item against the N=1 north star — does it create new content, does it adapt to the user, would the user reach for it from this surface? Items that fail those tests should move (or get cut).

> **How to apply.** Treat this as a discovery → decision → implementation chain. The audit step is non-code (a doc / table). The decision is a one-meeting call (or single design pass). The implementation is the actual menu reshape — likely a `BuildAPlateActionSheet` with tiered sections (Hero / Create / Track / Settings) or progressive disclosure (Primary set + "More…" expander).

**Step 1 — Audit (non-code).** Score every item on three axes:
- [ ] **Usage frequency** — pull last 30 days of analytics (or proxy: Sentry breadcrumbs, manual log). Items < 1× per active user per week are candidates to move/cut.
- [ ] **Criticality** — does the user *need* this from this menu, or is the menu just a convenience surface?
- [ ] **Alternative entry points** — count surfaces that already expose the action (e.g. Add Recipe is also accessible from cookbook tab + recipe-form route; Edit Preferences lives in profile already; Quick Timer lives nowhere else).
- [ ] Output: a table with one row per item + columns for usage / criticality / alt-paths / N=1-aligned (Y/N) / verdict (Keep / Submenu / Move / Cut).

**Step 2 — Brainstorm IA patterns.** Pick the model that fits Sazon's editorial aesthetic; reject the ones that don't:
- **Tiered hero + secondary list** — keep Build a plate / Cook for the family at the top with bigger touch targets + visual emphasis; everything else is a flat secondary list below a divider. Lowest cost, biggest visual win.
- **Sectioned submenus** — group by intent ("Compose", "Track", "Capture", "Manage"). Sections render as collapsed accordions or as labeled groups. Risk: more taps for low-frequency items.
- **Two-tier sheet** — primary set of 4-5 (Build a plate / Cook for the family / Log a meal / Take a Picture / Surprise Me) with a "More actions →" row at the bottom that opens a second sheet with the long tail (Edit Preferences, Quick Timer, Daily Weight, Create Collection). Best at hiding settings creep without burying anything.
- **Contextual relocation** — instead of a submenu, just *move* items to where they belong: Edit Preferences → Profile tab, Create Collection → Cookbook header, Daily Weight → already on profile (verify, then remove from "+"). Risk: discoverability for power users who learned the "+" location.
- **Search-first sheet** — adds a fuzzy text input at top of the sheet. Heavy for an action sheet; reject unless item count grows past ~15.

**Step 3 — Decide.** One round of structured choice:
- [ ] Pick the IA pattern (one of the above; document why).
- [ ] Lock the kept-items list, the moved-items list, and the cut-items list.
- [ ] Write copy for the new sections / labels (the "Texting a friend" voice — see CLAUDE.md banned patterns).

**Step 4 — Implement.** Code changes follow the decision:
- [ ] Refactor `frontend/app/(tabs)/_layout.tsx` `actionItems` array into the chosen structure (likely a new component, e.g. `frontend/components/action-sheet/QuickActionsSheet.tsx`).
- [ ] If "Tiered hero + secondary": extend `ActionSheetItem` with a `featured?: boolean` flag (or a `priority` enum) and update `components/ui/ActionSheet.tsx` to render featured items with larger pastel chips + a divider.
- [ ] If "Two-tier sheet": add a "More" row that opens a second `ActionSheet` instance with the long-tail items.
- [ ] If "Contextual relocation": delete the moved items from the action sheet *and* add their new entry points to the receiving screens (e.g. Cookbook header gets a `+` icon for Create Collection).
- [ ] **Test:** `frontend/__tests__/components/action-sheet/QuickActionsSheet.test.tsx` — renders the hero items first, secondary items below the divider, every kept item navigates correctly, "More" expander (if any) opens the secondary sheet, every moved item is reachable from its new home.
- [ ] **Test:** `frontend/__tests__/app/(tabs)/_layout.test.tsx` (extend) — the "+" FAB opens the new sheet; verifying composition not item-count.

**Verification & Metrics:**
- ✅ The action sheet contains ≤ **6 always-visible items** (the rest live in submenus, secondary surfaces, or were cut).
- ✅ Build a plate stays the hero — biggest touch target or visually distinct treatment, top of the list.
- ✅ Every moved item has a discoverable new entry point on its receiving screen, with `accessibilityLabel`.
- ✅ Day-7 retention on the "+" FAB tap-through (whatever item gets tapped) is unchanged or up — a successful audit shouldn't *reduce* discoverability for the items that survive.
- ✅ Roadmap line marked `[x]` once the new IA ships and the old long sheet is retired (no two parallel implementations).

**Anti-goals:**
- ❌ Do NOT add a 12th item to "fix" the long-list problem.
- ❌ Do NOT introduce a "configure your shortcuts" screen — that's an N=0 escape hatch (we're picking the right IA, not punting it to the user).
- ❌ Do NOT replace the FAB with a hamburger — the always-visible center "+" is well-tested and the affordance is right; only the menu *behind* it changes.

---

#### **9J: Implementation Order (Group 9 — Polish Only)**

*All user empowerment features (craving search, ingredient swaps, cheat meal flow, branded food tracking, snap to log, cookbook power features, "Find Me a Meal", smart collections, skill progression, etc.) have been moved to **Group 10**.*

| Phase | Focus | Est. Hours | Dependencies |
|-------|-------|-----------|--------------|
| **Phase 1: Foundation** | 9A: Design system (borders, warm cream surfaces, radius, DM Sans typography, gradient CTAs) + **9K: Pastel color tokens, gradient presets, category color map** + 9-Inspo: ScreenGradient, FrostedCard, bold typography contrast + 9-Blind Spots: semantic colors, modal backdrops | 18h | None |
| **Phase 2: Navigation & Interaction** | 9B: Tab bar (frosted glass, icon animation, badge counts) + 9E: Spring press + entrance animations + scroll-driven behaviors + 9-Blind Spots: tab badges, swipe affordance hints | 8h | Phase 1 |
| **Phase 3: Component Library** | **9L: WidgetCard + WidgetGrid + ProgressRing + ConcentricRings + CountingNumber** + **9M: IngredientIcons map + getIngredientEmoji()** + 9-Inspo: circular thumbnails, collection collage, cooking timeline, 2×2 macro grid | 12h | Phase 1 |
| **Phase 4: Screen Polish — Core** | 9D: Screen polish (home with icon chips, recipe detail with ingredient icons + pastel macro pills, cooking with icon checklist, shopping with progress ring + aisle tints, meal plan with macro widget grid + day tints + calorie ring) + **9L: Meal plan analytics, shopping progress, profile stat grid + streak calendar** | 20h | Phase 1, 3 |
| **Phase 5: Screen Polish — Secondary** | 9D continued: (cookbook with collection collage, profile with widget stats, onboarding with pastel gradients per step, auth with brand gradient + mascot, paywall dark + pastel feature icons, scanner, recipe form, edit macro goals, edit preferences) + **9N: Onboarding/auth/error pastel states** + 9-Blind Spots: splash screen, auth→app continuity, skeleton standardization | 14h | Phase 1, 3 |
| **Phase 6: Celebrations & Mascot** | 9C: Peak celebrations (cooking complete with colorful stat cards, shopping complete, recipe saved heart burst, plan generated, paywall conversion) + 9G: Lottie mascot + **9L: Cooking complete stat cards** + 9-Blind Spots: counting numbers, pull-to-refresh mascot, celebration share | 10h | `lottie-react-native`, `moti`, Phase 3 |
| **Phase 7: Bottom Sheets & Copy** | 9H: Bottom sheet migration + 9F: Copy & language audit (error states with pastel bgs + mascot, empty states, loading states, terminology) | 6h | `@gorhom/bottom-sheet` |
| **Phase 8: Advanced Delight** | 9I: Shared element transitions, dark mode depth pass, drag-to-reorder, search bar cleanup + 9-Inspo: dark mode food photography, scanner floating labels, cook time badges, trending badges, premium banner upgrade + data visualization polish | 8h | All above |
| **TOTAL** | | **~96h** | |

---

### **Group 10: User Empowerment — "Healthy Food That Doesn't Suck"** 💪🔥

> **The founding insight.** This app exists because meal prep food is disgusting, "healthy" recipes are joyless, and hitting your macros shouldn't mean eating boiled chicken and plain rice for the rest of your life. Every feature below exists to solve the same problem: **make healthy eating so delicious and easy that junk food stops being tempting.** These aren't nice-to-haves — they're the emotional core of the product.
>
> Group 9 makes the app *look* like a work of art. Group 10 makes the app *feel* like it's built for YOU — the user who wants control, variety, and zero compromise between taste and health. These are the features that turn a polished shell into an indispensable daily tool.

> ⚠️ **Integration note (shopping list + budgeting):** The shopping list and budgeting features currently feel disjointed and disconnected from the rest of the app experience — they read as standalone tools rather than natural extensions of cooking, meal planning, and pantry flow. Before shipping new Group 10 work that touches these surfaces (especially 10G cheat-meal budgeting and 10H "What Can I Make Right Now?"), audit the seams between shopping list ↔ meal plan ↔ pantry ↔ cooking and design for continuity: shared state, consistent entry points, and handoffs that feel like one product, not four.

---

#### **10-Pre: Home Screen Section Consolidation** 🏠

*The home feed currently has three sections that overlap heavily: "Today's Recommendation", "Recipe of the Day", and "Perfect Match for You". They all surface algorithmically recommended recipes and the distinction is unclear to users. Consolidate before building new home screen features.*

* [x] **Remove "Perfect Match for You" section** — its purpose is already covered by "Today's Recommendation" and "Recipe of the Day". Removing it reduces scroll depth, cognitive load, and redundant API calls.
* [x] **Remove "Your Favorites" section** — redundant with the Cookbook screen's Liked view. Eliminates scroll clutter on home.
* [x] **Reorder sections:** Quick Meals now renders above "For You" (priority 3 vs 100), directly below the hero.
* [x] **Merge "Recipe of the Day" + "Today's Recommendation"** into a single parallax hero with match %, full macros (cal/protein/carbs/fat), and "Surprise Me" button. Removed `FeaturedRecipeCarousel`.
* [x] Review remaining sections for overlap and ensure each has a clear, distinct purpose — sections now have non-overlapping scopes: **Quick Meals** (time ≤ 15min), **Meal Prep** (batch/freezable), **Macro Optimized** (protein density), **For You** (personalized catchall). Stale `perfectMatchRecipes` option removed from `groupRecipesIntoSections`.
* [x] **"Macro Optimized" section** — Replaced "High in Superfoods" with **Macro Optimized** (💪) in `recipeUtils.ts`. Criterion: `protein ≥ 20g AND protein/calories ≥ 0.08`. Sorted by protein-to-calorie ratio descending so the most macro-friendly recipes surface first. Only renders when recipes qualify (no empty placeholder).
* [x] **Test:** `__tests__/utils/recipeUtils.test.ts` — verifies Macro Optimized section creation, threshold filtering, descending ratio sort, no-render when none qualify, legacy `superfoods` key gone.

---

#### **10A: Cookbook — Recipe Creation & Editing** 🍳

> **Philosophy:** The cookbook is the user's space. They should feel like they *own* it — not just browse what the algorithm gives them. Creating, editing, and organizing recipes should be as natural as writing a note. The existing `recipe-form.tsx` and backend CRUD exist but aren't wired into the cookbook flow.

**Recipe Creation (inline from cookbook)**
- [x] **"Create Recipe" FAB** — `CreateRecipeFAB` (BrandButton-backed gradient pill with `add` icon + idle pulse) rendered in `cookbook.tsx` above the tab bar. Tap → `router.push('/recipe-form')`. If exactly one collection is currently filtered, the active `collectionId` is passed via query param and `recipe-form.tsx` pre-seeds `selectedCollectionIds` — recipe auto-joins that collection on save. Multi-filter / no-filter → opens blank form.
- [x] **Quick-add recipe shortcut** — `QuickAddRecipeModal` bottom sheet reached via a new "＋ New" pill in the `CookbookHeader` (sitting alongside "Import"). Captures title + ingredients (one per line) + optional protein/calories, then `POST /api/recipes` with `collectionIds` auto-seeded to the currently filtered collection (if exactly one). Backend auto-saves to cookbook; on success the cookbook refetches. Instructions and photo can be added later from the full form.
- [x] **AI-assisted creation** — `AIDescriptionAssist` component mounts at the top of the Details card in `recipe-form.tsx` (only on create, not edit). User types a free-text description → `recipeApi.generateFromDescription` → backend `POST /api/recipes/generate-from-description` → `aiRecipeService.generateFromDescription` builds a targeted prompt, reuses the provider manager, validates + normalizes the result, and returns a flattened recipe (ingredients as `"{amount} {unit} {name}"` strings, instructions as plain strings). The form is pre-filled on success and the user can edit everything before saving through the normal createRecipe flow. 429 quota errors surface as a dedicated response code.
- [x] **Test:** FAB visible on cookbook screen; tapping opens recipe form; saving returns to cookbook with new recipe at top; AI-assisted creation returns a valid recipe structure from free-text input (covered by `CreateRecipeFAB.test.tsx`, `QuickAddRecipeModal.test.tsx`, `AIDescriptionAssist.test.tsx`, and backend `recipeController.test.ts > generateFromDescription`)

**Recipe Editing (in-place from cookbook)**
- [x] **Edit button on recipe detail** — "Edit" button on user-created recipes was already live in `modal.tsx`. System recipes in cookbook context now show a "Save My Version" `GradientButton` that calls `recipeApi.forkRecipe(id)` → backend `POST /api/recipes/:id/fork` duplicates the recipe (all fields + ingredients + instructions) as a user-owned copy (`isUserCreated: true`, `source: 'user-created'`), auto-saves it to the cookbook, and the UI redirects into the recipe-form for edits. Original recipe is unchanged. *(Parent-recipe linking via `parentRecipeId` deferred — requires Prisma schema change.)*
  * 📍 Frontend: `handleSaveMyVersion` + `isForking` state in `modal.tsx`, new button in the cookbook system-recipe action block
  * 📍 Backend: `recipeController.forkRecipe` + `POST /api/recipes/:id/fork` route, covered by 4 tests
- [x] **Inline editing in cookbook** — Swipe left on a recipe card (list mode) → quick-edit drawer slides out with: Edit (opens `recipe-form`), Notes (opens `RecipeNotesModal`), Move (opens `CollectionSavePicker`). Implemented via `SwipeableRecipeCard` component wrapping list-mode cards in `CookbookRecipeList`. Grid mode skipped (swipe doesn't work at 50% width). Callbacks wired in `cookbook.tsx` reusing existing modal/picker state.
- [x] **Edit macros/nutrition** — Manual macro override available on any user-created recipe via the Edit swipe action or "Edit" button on recipe detail, both routing to `recipe-form.tsx?id=<recipeId>` which loads all nutrition fields (calories, protein, carbs, fat, fiber, sugar) for editing. Imported and AI-generated recipes that have been forked are `isUserCreated: true` and fully editable.
- [x] **Test:** Fork creates `isUserCreated: true` and `source: 'user-created'` — covered in `recipeController.test.ts` (4 tests); edit button conditional rendering tested in `modal.test.tsx`. `SwipeableRecipeCard.test.tsx` (11 tests): renders children directly when disabled/no callbacks, wraps in Swipeable when callbacks provided, renders Edit/Notes/Move action buttons, fires callbacks on press, correct accessibility labels.

**Recipe Notes (personal annotations on any recipe)**
- [x] **Notes field on recipe detail** — "My Notes" section on saved recipe detail screen (`modal.tsx`, cookbook source only). Tap to open `RecipeNotesModal` (existing component). Notes loaded via `GET /api/recipes/:id/saved-meta` on mount, saved via `PUT /api/recipes/:id/saved-meta`. Shows note text or "Add a note…" placeholder with amber tint. Uses existing `SavedRecipe.notes` field (no new model needed — notes are already user-scoped via the saved recipe relation).
  * 📍 Backend: `recipeController.getSavedMeta` + `GET /:id/saved-meta` route (4 tests in `recipeController.test.ts`)
  * 📍 Frontend: `RecipeNotesModal` renders in `modal.tsx` for cookbook-source recipes
- [x] **Notes indicator on recipe cards** — Recipe cards in the cookbook show a small 📝 badge when the user has notes attached. Quick visual scan to know which recipes have personal annotations.
  * 📍 Frontend: modify recipe card component to check for `hasNotes` flag (returned from saved recipes endpoint) and render badge
- [x] **Quick-add note from cooking screen** — "Add Note" button in cooking mode bottom bar (`cooking.tsx`). Opens compact text input overlay (stays on cooking screen). Appends to existing notes with `[Mon DD, HH:MM AM/PM]` timestamp separator. Fetches existing notes via `getSavedMeta`, saves via `updateSavedMeta`. Haptic success feedback on save.
  * 📍 Frontend: inline note input overlay with Cancel/Save, amber-tinted border, `accessibilityLabel="Add note"` / `"Save note"`
- [x] **Test:** `modal.test.tsx` (5 tests): "My Notes" section renders for cookbook source, displays existing notes, shows placeholder when empty, hidden for non-cookbook, opens modal on tap. `cooking.test.tsx` (3 tests): renders "Add Note" button, opens input overlay on press, saves note via API with content. `recipeController.test.ts` (4 tests): getSavedMeta returns notes/rating, returns nulls when not saved, handles undefined fields, returns 500 on db error. `SwipeableRecipeCard.test.tsx` (11 tests): full component coverage. Notes indicator on cards ✅ (was already marked complete).

---

#### **10B: Cookbook — Collection Browsing & Smart Collections** 📚

> **Philosophy:** A power user will have 30-50+ collections: "Weeknight Quick", "Meal Prep Sunday", "Rainy Day Comfort", "Summer Grilling", "High Protein Snacks", "Impressive Date Night", "Kid-Friendly", "Seasonal Fall", "When I'm Feeling Lazy", etc. The current flat list of collections doesn't scale. Users need to *sift*, *search*, *group*, and *visually scan* their collections the way they browse folders on a phone.

**Collection-First View Mode**
- [x] **Add a third view mode: "Collections"** — Alongside the current Saved/Liked/Disliked tabs, add a "Collections" view that shows the user's collections as the primary browsable unit (not individual recipes). `'collections'` added as a 4th `viewMode` in cookbook; Collections tab renders 2-column grid of Smart Collections + My Collections.
  * 📍 Collection cards: large card with cover image (from first recipe or user-selected), collection name, recipe count, emoji/icon. 2-column grid layout. ✅
  * 📍 Pinned collections stick to top with a subtle "Pinned" badge. (deferred)
  * 📍 Tapping a collection → expands into a full recipe list within that collection (with its own sorting/filtering). Back button returns to collection grid. ✅
- [x] **Collection search** — Search bar at top of Collections view. Searches collection names AND recipe titles within collections. Typing "chicken" shows both collections named "Chicken" and collections containing chicken recipes.
- [x] **Collection grouping with sections** — Auto-group collections by category. Sections: Pinned (isPinned), Meal Type, Cuisine, Mood & Occasion, Dietary, Seasonal, Other (null/custom). Each section has a collapsible header (chevron toggle, count badge). Empty sections hidden. Grouped view replaces flat "My Collections" list. Category assigned via `CollectionEditModal` chip picker (🍽️/🌍/✨/🥗/🌸/📁 + None). Schema: `category String?` added to `Collection` model (`npx prisma db push`). Backend: `createCollection` + `updateCollection` accept `category`. Frontend types: `CollectionCategory` type + `Collection.category` field. API client updated.
  * 📍 Database: `category String?` on `Collection` model — meal_type | cuisine | mood | dietary | seasonal | custom
  * 📍 Frontend: collapsible section groups in Collections view; `CollectionEditModal` category picker chips
  * 📍 Tests: `CollectionEditModal.test.tsx` (5 tests: renders chips, onSave with null category, onSave with selected category, pre-select on edit, no-op when name empty). All green.
- [x] **Test:** Collections view renders sections grouped by category; section headers are collapsible; search filters by name + contained recipe titles — covered by `CollectionEditModal.test.tsx` (5 tests) and manual verification of grouped UI.

**Smart Collections (Auto-Populated)**
- [x] **System-generated smart collections (backend)** — Rule-driven smart collections that auto-populate from the user's saved recipes. No DB schema changes — pure predicates computed on-the-fly. Backend: `smartCollectionsService.ts` exposes `SMART_COLLECTION_DEFINITIONS`, `buildRecipeFilter(id)` (Prisma where-clause), `recipeMatchesSmartCollection(recipe, id)` (in-memory predicate), and `getSmartCollectionById`. Endpoints: `GET /api/recipes/smart-collections` returns all definitions with per-user counts; `GET /api/recipes/smart-collections/:id` returns matching saved recipes. MVP ships 6 collections that rely only on existing Recipe fields: **Quick & Easy** (cookTime ≤ 15 AND difficulty = easy), **High Protein** (≥30g), **Under 400 Cal**, **One-Pot Meals** (keyword match on title/description), **Budget Friendly** (estimatedCostPerServing ≤ $3), **High Fiber** (≥8g). Recently Cooked / 5-Star / Uncooked / Meal Prep / Seasonal deferred (need cook history, ratings, or new fields). Frontend API client wired in `recipeApi.getSmartCollections()` + `getSmartCollectionRecipes(id)`.
  * 📍 Tests: `smartCollectionsService.test.ts` (24 unit tests on definitions + predicates + Prisma filter shape) + `recipeController.test.ts` (6 controller tests covering count aggregation, empty state, 404 on unknown id, filter shape, and 500 error paths). 30/30 green.
- [x] **System-generated smart collections (frontend)** — `SmartCollectionCard` component (pastel-tinted, per-collection color theme, "Smart" badge, count). `'collections'` added as a 4th `viewMode` in cookbook. Switching to Collections tab fetches `/api/recipes/smart-collections` and renders a 2-column grid: Smart Collections section above custom My Collections section. Custom collection cards tap to filter the Saved view by that collection. `ViewMode` type updated across `CookbookFilterModal`, `CollectionPicker`, `SimilarRecipesCarousel`, `useCookbookCache`, and `cookbookCache`.
  * 📍 Test: `SmartCollectionCard.test.tsx` — 7 tests (renders fields, Smart badge, press, singular/plural count, a11y). All green.

  | Smart Collection | Rule | Icon |
  |-----------------|------|------|
  | "Quick & Easy" | `cookTime ≤ 15 AND difficulty = 'easy'` | ⚡ |
  | "High Protein" | `protein ≥ 30` | 💪 |
  | "Under 400 Cal" | `calories ≤ 400` | 🔥 |
  | "Recently Cooked" | `lastCooked within 30 days` | 🕐 |
  | "5-Star Favorites" | `rating = 5` | ⭐ |
  | "Uncooked" | `cookCount = 0 AND savedDate > 7 days ago` | 🆕 |
  | "Meal Prep Ready" | `mealPrepSuitable = true OR batchFriendly = true` | 📦 |
  | "One-Pot Meals" | `source includes 'one-pot' OR title/description match` | 🍲 |
  | "Budget Friendly" | `estimatedCostPerServing < 3` | 💵 |
  | "Seasonal" | Based on current season + ingredient seasonality | 🍂 |

  * 📍 Backend: Smart collections are computed on-the-fly (not stored in DB). New endpoint `GET /api/recipes/smart-collections` returns the list of smart collection definitions + recipe counts. `GET /api/recipes/saved?smartCollection=high_protein` filters saved recipes by the smart rule.
  * 📍 Frontend: Render smart collections in the Collections view grid with a distinct "Smart" badge. They appear in their own "Smart Collections" section above custom collections.

- [x] **Weather-aware collection** — Uses device location + OpenWeather API. Surfaces appropriate recipes: cold/rainy → dinner / cookTime ≥ 20; hot → calories ≤ 500 or cookTime ≤ 20; mild → all recipes. Backend: `WEATHER_COLLECTION_DEFINITION` + `buildWeatherFilter(condition)` + `recipeMatchesWeather(recipe, condition)` in `smartCollectionsService.ts`. New endpoint `GET /api/recipes/smart-collections/weather-today?lat&lon`. Frontend: `useWeatherSmartCollection` hook (location → API → 1-hour AsyncStorage cache). Card appears first in Smart Collections grid with condition-specific emoji (❄️ cold, 🌧️ rainy, ☀️ hot, 🌤️ mild). Fixes pre-existing bug: `mealType` now included in `getSmartCollections` select so `right_now` counts correctly.
  * 📍 Frontend: `expo-location` for coordinates → `GET /api/recipes/smart-collections/weather-today` → `useWeatherSmartCollection` hook
  * 📍 Tests: `smartCollectionsService.test.ts` (+13 tests: WEATHER_COLLECTION_DEFINITION, buildWeatherFilter, recipeMatchesWeather). `useWeatherSmartCollection.test.ts` (7 tests). 54 service tests + 7 hook tests green.
- [x] **Time-of-day collection** — "Right Now" smart collection that filters by current meal period (breakfast 6-11am, lunch 11am-3pm, dinner 5-9pm, snack otherwise). Backend: `getCurrentMealType(now)` + `right_now` predicate in `smartCollectionsService.ts`. Frontend: client-side mirror `recipeMatchesSmartCollectionClient`. 34 backend tests + 9 SmartCollectionCard tests green.
- [x] **Test:** Smart collections return correct recipe counts; "High Protein" only includes recipes with ≥30g protein; "Quick & Easy" only includes recipes ≤15min; time-of-day collection changes by hour — covered in `smartCollectionsService.test.ts` (47 tests). Weather collection covered in `smartCollectionsService.test.ts` (+13) + `useWeatherSmartCollection.test.ts` (7).

**Collection Pagination & Infinite Scroll**
- [x] **Infinite scroll within collections** — Replaced page-based pagination (`CookbookPagination` / Prev/Next buttons) with scroll-triggered infinite load. `visibleCount` starts at 20, grows by 20 as user scrolls within 30% of the bottom (via `onScroll` + `handleRecipeListScroll` on the main `ScrollView`). When local supply is exhausted, triggers `loadMore()` for server-side pages. Footer shows "Showing X of Y" or "Loading more…" status. `X recipes` count in header shows total filtered count.
  * 📍 Implementation: `cookbook.tsx` — `visibleCount` state, `displayedRecipes` slice, `handleLoadMore`, `handleRecipeListScroll`; `CookbookPagination` component removed from cookbook render
- [x] **Collection carousel preview** — In the Collections grid view, each collection card shows a mini 3-image preview strip (first 3 recipe images) below the cover image. Gives users a visual hint of what's inside without tapping. `SmartCollectionCard` and custom collection cards both render a full-bleed 3-image strip; grey placeholder fills for missing slots.
- [x] **Swipe between collections** — When inside a collection (saved view with a collection selected), a navigation bar shows the collection name with ← → arrows. Tap ← or → to move to the adjacent collection. Pinned collections are first, then alphabetical. Implemented as a `CollectionNavBar` inline in `cookbook.tsx` using `sortedCollectionsForNav` memo.
  * 📍 Full swipe gesture (PagerView) deferred — nav arrows deliver the core navigation flow without conflicting with vertical scroll gestures
- [x] **Collection stats bar** — When viewing a collection, show a compact stats bar: total recipes, avg cook time, avg calories, avg protein, most common cuisine. `CollectionStatsBar` component; shown above recipe list when a custom collection is selected. 8 tests green.
- [x] **Test (partial):** Collection carousel preview shows 3 images — covered in `SmartCollectionCard.test.tsx` (9 tests). Stats bar shows accurate aggregates — covered in `CollectionStatsBar.test.tsx` (8 tests). Infinite scroll + collection nav arrows verified via unit + integration tests. Full PagerView swipe deferred.

**Collection Quick-Create Suggestions**
- [x] **Suggested collections on first use** — When a user has saved 10+ recipes but created 0 collections, show a one-time prompt: "Organize your cookbook? Create a collection." `CollectionSuggestionBanner` component with 3 suggestion chips (Weeknight Dinners, Meal Prep Sunday, Date Night), dismiss X persisted in AsyncStorage. 6 tests green.
- [x] **"Add to Collection" — Recently used collections** — Collection picker shows recently-used collections floated to top with a "Recent" section header, MRU order preserved. `recentCollections.ts` lib (AsyncStorage-backed, MRU, de-duped, capped at 10). `recordRecentCollections` called after successful save; `recentCollectionIds` prop wired to `CollectionSavePicker`. 7 lib tests + 11 picker tests green.
  * 📍 AI-suggested collections and backend `GET /api/recipes/:id/suggested-collections` deferred to a later group
- [x] **Test (partial):** Suggestion prompt appears after 10 saved + 0 collections — `CollectionSuggestionBanner.test.tsx` (6 tests). Collection picker shows recently used first — `CollectionSavePicker.test.tsx` (11 tests) + `recentCollections.test.ts` (7 tests). AI-suggested collections deferred.

---

#### **10C: Meal Plan — "Find Me a Meal"** 🎯

> **Philosophy:** The current generation flow is all-or-nothing — "Plan My Week" generates everything using your global macro goals. But real life isn't that clean. Sometimes you need one specific meal: "I have 400 calories left today, I want something Latin American with at least 30g protein and low fat." The user should be able to make targeted requests with specific constraints and get back options to choose from — not just accept whatever the AI generates.

**The Request Flow**

* [x] **"Find Me a Meal" button** — New action available in two places:
  1. ✅ **Quick Actions Bar** — "Find Me a Meal" 🎯 badge added to `QuickActionsBar.tsx`
  2. ✅ **Empty meal slot** — "Find Me a Meal" option in `handleAddMealToHour` Alert (alongside "From Cookbook", "Quick Log")
  * 📍 Tapping opens the `MealRequestModal` (new component)

* [x] **`MealRequestModal` — The constraint builder** — Bottom sheet modal `frontend/components/meal-plan/MealRequestModal.tsx`
  - ✅ Count selector: 1 / 3 / 5 options (pill buttons, default 3)
  - ✅ Smart presets: High Protein, Low Cal, Low Fat, Balanced, Post-Workout, Light Snack
  - ✅ Macro sliders: Calories max, Protein min, Fat max, Fiber min — custom `MacroSlider` (Reanimated + GestureDetector, "Any" when at minimum)
  - ✅ Meal type filter: any / breakfast / lunch / dinner / snack / dessert
  - ✅ Cuisine filter (cuisines array passed to API)
  - (deferred) Cuisine family expansion with CUISINE_FAMILIES — depends on Group 11 Phase 1 (tracked there)

* [x] **Backend: `POST /api/meal-plan/find-recipes`** — `mealPlanFindRecipesController.ts`
  - ✅ Two-tier: DB-first with in-memory macro filtering, AI fallback for shortfalls
  - ✅ Full request/response shape per spec
  - ✅ matchScore (0-100) + matchBreakdown per option
  - ✅ 14 passing tests in `tests/integration/findRecipes-integration.test.ts`

* [x] **Results view: `MealRequestResults` component** — `frontend/components/meal-plan/MealRequestResults.tsx`
  - ✅ Recipe cards with matchScore badge, cuisine badge, cook time, difficulty
  - ✅ Macro pills (green = constraint met)
  - ✅ "Add to Plan" button per card
  - ✅ "None of these — generate more" link re-runs with same constraints
  - ✅ AI-generated count badge

* [x] **Remaining calories integration** — Pre-populates from `dailyMacros` vs `targetMacros` in meal-plan screen
  - ✅ Shows "You have ~X calories and Yg protein remaining today" context banner

* [x] **Request history** — Last 5 request configs saved to AsyncStorage, shown as re-runnable chips

---

#### **10D: "I'm Craving..." Search** 🍕 *(Home Screen)*

*The anti-meal-prep-boredom feature. The user doesn't always know a cuisine or recipe name — they know a FEELING. "Something cheesy", "warm and comforting", "crunchy and spicy", "sweet but not heavy." Match cravings to healthy recipes.*

* [x] **Craving-based search mode** — On the home screen search bar, add a toggle: "Search" (current) vs "I'm Craving..." mode. In craving mode, the user types natural language and the AI maps it to recipes.
  * 📍 Backend: `POST /api/recipes/craving-search` — takes free-text craving → Claude maps it to flavor profiles + texture + temperature preferences → queries recipe database with expanded search (title, description, ingredients, cuisine) → returns ranked results
  * 📍 Examples that should work:
    - "something cheesy and warm" → mac & cheese (lightened), quesadillas, khachapuri, grilled cheese, cheese fondue
    - "cold and refreshing" → ceviche, gazpacho, poke bowl, Vietnamese fresh rolls, watermelon feta salad
    - "spicy noodles" → dan dan noodles, pad kee mao, Korean ramyeon, Burmese shan noodles
    - "comfort food but healthy" → lightened shepherd's pie, chicken soup, congee, dal, Ethiopian lentil stew
    - "something sweet after dinner" → protein ice cream, Greek yogurt parfait, dark chocolate mousse, mochi
  * 📍 Craving search should respect user's dietary restrictions automatically

* [x] **Craving chips** — In the filter modal's "I'm Craving..." section, show wrapping craving chips: "Comfort Food", "Something Light", "Spicy", "Sweet Tooth", "Crunchy", "Warm & Cozy", "Fresh & Cold", "Cheesy", "Carb Fix", "Snacky". Chips toggle on/off (tap active chip to deselect). Filter modal stays open while selecting so craving + other filters can be combined.
  * ✅ Bug fixed: infinite re-render loop caused by `applyFetchResult` dep chain — resolved with `useRef` dedup key
  * ✅ Bug fixed: filter badge count now includes active craving (+1 when craving active)
  * ✅ Filter combination: craving search passes active cuisine/dietary/cookTime/difficulty/mealPrepMode filters to backend — results respect all active filters simultaneously
  * ✅ Bug fixed: applying traditional filters while craving is active now re-runs the craving search instead of overwriting with a generic `GET /recipes` fetch

* [x] **Test:** Craving search for "something cheesy" returns recipes containing cheese; respects dietary restrictions (vegan user doesn't get dairy-based results); craving chips trigger search with correct query; `searchQuery` stays empty during craving search (prevents `useInitialRecipeLoad` re-fire)

---

#### **10D-ii: Search & Filter Relevance** 🎯 *(Home Screen + Backend)*

*The craving search works, but the results feel random. A user who taps "Cheesy" and "Mexican" and "≤30 min" expects cheesy quesadillas, not a vaguely related chicken bowl that happens to mention "sprinkle of cheese" in step 7. This section makes every filter combination return results the user would actually screenshot and cook.*

> **Core problem:** The current craving scoring is keyword-frequency-based — a recipe that says "cheese" once in its ingredients scores the same whether it's a cheese-centric dish or one that uses a tablespoon of parmesan as garnish. Filters narrow the candidate pool but don't influence ranking. The result: technically correct but emotionally wrong results.

**Smarter Craving Scoring**
- [x] **Weighted field scoring with diminishing returns** — Title matches are the strongest signal (a recipe *named* "Cheesy Quesadillas" is more relevant than one that *contains* cheese). Current scoring already weights title > description > ingredients, but multiple hits in the same field shouldn't multiply linearly. Apply diminishing returns: first title hit = +5, second = +3, third = +1. This prevents recipes with repetitive titles from dominating.
  * 📍 Backend: refactor `scoreCravingMatch()` in `cravingSearchService.ts` — per-field hit counting with decay
  * **Test:** recipe titled "Cheesy Mac and Cheese" scores higher than "Grilled Chicken with Cheese Garnish"; but not absurdly higher than "Four Cheese Pasta" (diminishing returns prevent runaway scores from keyword-stuffed titles)

- [x] **"Hero ingredient" detection** — Distinguish between a recipe where the craving term is the *star* vs. a *supporting player*. If a search term appears in the recipe title OR in ≥3 ingredients, mark it as a hero match and apply a 2x multiplier to the recipe's total score. A "cheesy" search should heavily favor recipes where cheese is central.
  * 📍 Backend: add `isHeroIngredient()` check in `scoreCravingMatch()` — count ingredient lines containing the term
  * **Test:** "Mac and Cheese" (cheese in title + 3 ingredients) scores ≥2x higher than "Greek Salad" (feta mentioned once)

- [x] **Negative signal filtering** — Some recipes technically match but are clearly wrong. A "Spicy" search shouldn't return a recipe whose only spicy element is "pinch of cayenne" in step 4. If a search term appears *only* in instructions (not title, description, or ingredients), apply a penalty (score × 0.5) rather than a bonus.
  * 📍 Backend: add instruction-only detection in `scoreCravingMatch()` — if a term matches instructions but nothing else, halve rather than boost
  * **Test:** recipe with "cayenne" only in instructions scores lower than recipe with "spicy" in title

**Improved Candidate Selection**
- [x] **Expand candidate pool intelligently** — Currently fetches 400 most recent recipes. This misses older high-quality recipes. Instead: fetch 200 recent + 200 random (seeded by craving hash for consistency) to ensure coverage across the full database. As the recipe DB grows past 1000+, this becomes critical.
  * 📍 Backend: split `prisma.recipe.findMany` in `cravingSearch` into two queries — recent (200, `orderBy: createdAt desc`) + random (200, `orderBy: id` with offset = hash(query) % totalCount) — then deduplicate by ID before scoring
  * **Test:** craving search with >400 recipes in DB returns results from both recent and older recipes (not just the latest 400)

- [x] **Pre-filter by craving keywords at the DB level** — Instead of fetching 400 recipes and scoring all of them in JS, add a Prisma `OR` filter that matches craving search terms against `title` and `description` using `contains` (case-insensitive via `LOWER()`). This reduces the candidate pool to already-relevant recipes, improving both speed and relevance. Fall through to the broad pool only if the filtered set returns <20 results.
  * 📍 Backend: build dynamic `OR` conditions from `mapping.searchTerms` — `title: { contains: term }` and `description: { contains: term }` — applied to the Prisma query. Use SQLite-compatible `LOWER()` via raw query or Prisma's built-in string filtering (no `mode: 'insensitive'`)
  * **Test:** craving search for "cheesy" queries DB with title/description containing "chees" (stemmed); recipes with no keyword match in title or description are excluded from initial pool

**Filter-Aware Ranking**
- [x] **Craving search respects active filters** — ✅ Shipped. The backend `cravingSearch` endpoint now accepts `cuisines`, `dietaryRestrictions`, `maxCookTime`, `difficulty`, and `mealPrepMode` from the request body and applies them as Prisma `where` clauses before scoring. The frontend hook passes all active filter state to the API call. The craving dedup key includes filters so changing filters triggers a fresh search. `applyFilters` and `handleQuickFilter` now re-run the craving search instead of overwriting with a generic fetch when a craving is active.
- [x] **Boost recipes matching active filters in scoring** — Filters currently narrow the candidate pool but don't affect ranking within it. When both a craving AND traditional filters are active, recipes that match the filter criteria more precisely should score higher. Add a +3 bonus per active filter match to the craving score, so e.g. "Cheesy" + "Mexican" strongly favors cheesy Mexican recipes over cheesy non-Mexican ones.
  * 📍 Backend: pass active filters into `scoreCravingMatch()` — if recipe cuisine matches a selected cuisine filter, +3; if recipe cook time is under selected max, +2; if difficulty matches, +2
  * **Test:** with "Cheesy" craving + "Mexican" cuisine filter, "Cheesy Quesadillas" (Mexican) scores higher than "Mac and Cheese" (American) even though both are strongly cheesy

- [x] **"Perfect match" indicator** — When a recipe scores in the top 90th percentile of results AND matches all active filters, tag it with a `perfectMatch: true` flag in the API response. Frontend renders a subtle sparkle badge or "Perfect Match" label on the card.
  * 📍 Backend: calculate score threshold after scoring, tag top results
  * 📍 Frontend: render badge on recipe card when `perfectMatch` is true — use existing `FrostedCard` style with accent tint
  * **Test:** top-scoring recipe in a filtered craving search has `perfectMatch: true`; recipe at position 15 does not

**Result Quality Feedback Loop**
- [x] **Implicit relevance signal from user actions** — Track which craving search results users actually tap, save, or cook. Over time, use these signals to adjust scoring weights. Phase 1 (this task): log the event `{ cravingQuery, recipeId, action: 'tap' | 'save' | 'cook' }` to a new `CravingSearchEvent` table. Phase 2 (future): use logged data to train a simple scoring boost for recipes that historically perform well for similar cravings.
  * 📍 Backend: new `CravingSearchEvent` model in Prisma schema (id, userId, cravingQuery, recipeId, action, createdAt). New `POST /api/recipes/craving-search/event` endpoint. Frontend fires on recipe card tap and save from craving results.
  * **Test:** tapping a recipe card from craving results fires the event endpoint; event is persisted with correct query and action

#### Tests

**`backend/src/services/__tests__/cravingSearchService.test.ts`** (extend existing)
- [x] Diminishing returns: 3 title hits score less than 3× a single title hit
- [x] Hero ingredient detection: cheese in title + 3 ingredients → 2x score vs. cheese in 1 ingredient
- [x] Instruction-only match applies 0.5x penalty
- [x] Filter-aware boost: matching cuisine adds +3 to score

**`backend/src/modules/recipe/__tests__/cravingSearch.integration.test.ts`** (new)
- [x] Craving search with cuisine filter returns only matching cuisine recipes
- [x] Craving search with maxCookTime filter excludes slow recipes
- [x] Combined craving + multiple filters narrows results correctly
- [x] Perfect match flag present on top result, absent on low-ranked result
- [x] Candidate pool includes both recent and older recipes when DB is large

**`frontend/__tests__/components/home/CravingPerfectMatch.test.tsx`** (new)
- [x] Recipe card renders "Perfect Match" badge when `perfectMatch: true`
- [x] Badge not rendered when `perfectMatch` is absent or false

**`frontend/__tests__/hooks/useCravingSearch.test.ts`** (regression — extend existing, guard against 10D bugs re-emerging)
- [x] **No infinite loop:** craving search fires exactly once per unique (query + filter) combination; calling `applyFetchResult` does not trigger a second API call (guards against the `userFeedback` dep-chain loop)
- [x] **Filter badge count:** `isCravingSearch = true` contributes +1 to the active filter count (verify the `activeFilterCount` computation includes the craving flag)
- [x] **Chip deselection:** tapping an active craving chip (same label as `activeCravingQuery`) calls `onCravingSearch('')` — not `onCravingSearch(chip.label)` again
- [x] **Filter modal stays open on chip tap:** `onCravingSearch` with a non-empty query does NOT call `closeFilterModal` (modal remains open for further filter selection)
- [x] **Applying filters preserves craving:** when `isCravingSearch = true` and `applyFilters` is called, `fetchRecipes` (regular GET) is NOT called — `onRerunCravingSearch` is called instead
- [x] **Quick filter toggle preserves craving:** when `isCravingSearch = true` and `handleQuickFilter` is called, `fetchRecipes` is NOT called — `onRerunCravingSearch` is called instead (verified by existing `useFilterActions` implementation)
- [x] **Filters change re-runs craving:** changing any filter value while `cravingParam` is set triggers a new `cravingSearch` API call with the updated filter params (dedup key includes filter state)
- [x] **`clearSearch` resets all craving state:** after `clearSearch()`, `isCravingSearch = false`, `cravingQuery = ''`, `searchQuery = ''`, and the dedup ref is cleared so the next craving param fires fresh

---

#### **10E: Ingredient Substitution Engine** 🔄 *(Recipe Detail)*

*"I don't have Greek yogurt" or "chicken breast is boring." Let users swap ingredients with macro-aware alternatives that preserve flavor.*

* [x] **"Swap Ingredient" button on recipe detail** — Each ingredient in the ingredient list gets a subtle swap icon. Tapping it shows 3-5 alternatives with macro impact:

  | Original | Swap | Macro Impact | Flavor Note |
  |----------|------|-------------|-------------|
  | Chicken breast (31g protein, 3g fat) | Chicken thigh (26g protein, 9g fat) | +6g fat, more flavorful | "Juicier, more forgiving to cook" |
  | Chicken breast | Turkey breast (29g protein, 1g fat) | -2g fat | "Leaner, similar texture" |
  | Chicken breast | Firm tofu (20g protein, 5g fat) | -11g protein, +2g fat | "Plant-based, press for best texture" |
  | White rice | Cauliflower rice | -35g carbs, -150 cal | "Low-carb swap, different texture" |
  | White rice | Brown rice | +3g fiber, same cal | "More fiber, nuttier flavor" |
  | Sour cream | Greek yogurt | +8g protein, -5g fat | "Almost identical taste, way better macros" |
  | Butter | Olive oil | Same cal, healthier fats | "Swap 1:1, adds Mediterranean flavor" |
  | Sugar | Monkfruit sweetener | -100% cal, -100% carbs | "Zero cal, no glycemic impact" |
  | All-purpose flour | Oat flour | +2g fiber, +3g protein | "Heartier texture, works great in pancakes" |

  * 📍 Backend: `GET /api/recipes/ingredient-swaps?ingredient=chicken+breast` — returns alternatives with macro deltas and flavor notes. Use a curated swap database (not AI per-request — too slow). ~200 common ingredients with 3-5 swaps each.
  * 📍 Frontend: tapping an ingredient shows a compact bottom sheet with swap options. Tapping a swap updates the recipe view temporarily (doesn't save unless user confirms "Save My Version")
  * 📍 Macro impact shown inline: "+6g fat" in orange, "-150 cal" in green, "+3g fiber" in blue

* [x] **"Make It Healthier" one-tap** — Already exists as "Healthify" for D/F rated recipes. Expand this: show on ALL recipes (not just low-rated ones) as a persistent "Lighter Version" toggle at the top of the ingredient list. Toggle on → all substitutions applied at once, macro summary updates live.
  * 📍 Backend: `POST /api/recipes/:id/healthify` already exists — extend to accept custom swap preferences (e.g., "I prefer oat flour over almond flour")

* [x] **"Make It Exciting" button** — The opposite of healthify. Take a bland-looking recipe and get AI suggestions for sauce/spice/topping additions that add flavor without blowing macros:
  - "Add 1 tbsp gochujang (+15 cal, +2g carbs) for a Korean kick"
  - "Finish with a squeeze of lime and fresh cilantro (+0 cal) for brightness"
  - "Top with everything bagel seasoning (+5 cal) for crunch"
  - "Drizzle 1 tsp chili crisp (+40 cal, +4g fat) for heat and texture"
  * 📍 Backend: `POST /api/recipes/:id/flavor-boost` — AI analyzes recipe's flavor profile and suggests 3-5 additions with macro costs. Prioritizes high-impact, low-calorie additions.
  * 📍 Frontend: expandable section on recipe detail below instructions: "Flavor Boosters" with each suggestion as a chip the user can tap to add to the recipe

* [x] **Test:** Ingredient swap for "chicken breast" returns ≥3 alternatives with macro deltas; "Make It Healthier" reduces total calories by ≥10%; "Make It Exciting" suggestions each add ≤50 calories; swaps respect dietary restrictions (vegan user doesn't see meat swaps)

**AI-Assisted Substitutions & "Save My Version" Flow** *(cross-cuts 10A editing + 10E swaps)*

> **NOTE — Future feature with significant complexity.** The idea: when a user doesn't have an ingredient or wants to change something, they can ask Sazon (conversationally or via a swap button) for substitutions. Accepting a substitution creates a personal copy ("fork") of the recipe in their cookbook with the changes applied, preserving the original recipe untouched.

* [x] **"I don't have this" per-ingredient action** ✅ — Added an "I don't have this" option inside `IngredientSwapSheet` (below the curated swaps list). Tapping it closes the swap sheet and opens `AskSazonSheet` pre-filled with `"I don't have {ingredient}"`, auto-submitting the question. (Pantry integration deferred — suggestions are currently generic via AI.)

* [x] **Conversational substitution request** ✅ — `AskSazonSheet` is a chat-style bottom sheet with a free-text input. Users can ask "I don't have coconut milk, what can I use?" or "Make this dairy-free" and Sazon returns a structured diff.
  * 📍 Backend: `POST /api/recipes/:id/ask-substitution` ✅ — `substitutionService.ts` sends recipe context (title, cuisine, ingredients, instructions, macros) + user question + dietary restrictions to AI, parses back a validated `SubstitutionDiff` with `ingredientChanges`, `instructionChanges`, `macroImpact`, and a friendly `summary`. Rejects AI-hallucinated ingredients/steps; partial-match normalization maps loose AI text back to exact recipe ingredients.
  * 📍 Frontend: `AskSazonSheet.tsx` ✅ — input bar + send button, loading state, result view showing strikethrough→new ingredient swaps, updated instruction steps (blue cards with step number), macro impact pills (green/orange), `BrandButton` "Apply Changes" CTA, and a disclaimer noting that applying creates a personal copy.

* [x] **Fork-on-edit ("Save My Version")** ✅ — When the user accepts substitutions from the swap engine, "I don't have this", or the conversational flow, `handleSaveMyVersion` in `modal.tsx` now passes the full state to the fork endpoint.
  * 📍 Extended `POST /api/recipes/:id/fork` ✅ — accepts `substitutions: Record<originalText, replacementText>`, `macroAdjustments`, and `instructionChanges`. Applies all substitutions atomically in one fork operation (no per-swap forks).
  * 📍 Forked recipe gets `source: 'user-modified'` (when swaps applied) or `user-created` (plain fork), `parentRecipeId` pointing to the original, and `isUserCreated: true` ✅
  * 📍 Prisma schema: added `parentRecipeId String?` + self-relation `parentRecipe`/`forks` on `Recipe` model; `onDelete: SetNull` so deleting an original doesn't cascade-delete user forks ✅
  * 📍 The fork includes ALL accepted substitutions applied, with macros recalculated and clamped to ≥0 ✅
  * 📍 Instruction changes from the AI diff are merged by step number — only changed steps are updated; untouched steps are preserved verbatim ✅
  * 📍 Original recipe remains unchanged in the database and for other users ✅
  * 📍 Frontend `VisualIngredientList` now accepts `activeSwaps` + `onUndoSwap` props and renders swapped ingredients with a green tint, the new name, a strikethrough original below, and a ↩️ undo button ✅

* **⚠️ Complexity notes:**
  - **Fork divergence:** If the original recipe is updated (e.g., corrected macros, better instructions), the user's fork won't get those updates. Need to decide: (a) forks are fully independent (simple, current plan), (b) forks track upstream changes and surface "Original recipe was updated — review changes?" (complex, deferred). Start with (a).
  - **Fork proliferation:** A user who substitutes often could end up with many near-duplicate recipes cluttering their cookbook. Mitigation: group forks visually under the parent recipe (show "Original" + "My Version" as a stacked card), and allow the user to "reset to original" to delete the fork.
  - **Macro recalculation accuracy:** Swapping one ingredient changes macros, but also affects the recipe holistically (e.g., swapping butter for applesauce in baking changes texture, moisture, cook time — not just fat grams). AI-generated substitutions need to flag when a swap affects technique, not just macros. The structured diff from the AI should include `instructionChanges` alongside `ingredientChanges`.
  - **Multi-swap compounding:** User swaps 3 ingredients in one session — each swap may interact (e.g., removing dairy + adding coconut milk + swapping flour changes the recipe substantially). Need to re-validate the full recipe after all swaps, not just each swap in isolation. Consider a "review all changes" step before forking.
  - **Pantry integration dependency:** "I don't have this" is most powerful when connected to a pantry/inventory system (knows what the user DOES have). Without it, suggestions are generic. Can launch with generic suggestions first, enhance later if pantry tracking is added.
  - **AI cost per request:** Conversational substitution hits the AI on every question. Rate-limit to prevent abuse, and cache common substitution Q&A pairs (e.g., "dairy-free swap for Greek yogurt" is asked constantly — cache the answer).

* [x] **Test:** ✅
  - `substitutionService.test.ts` (7 tests): parses ingredient-only swaps, parses instruction changes, rejects AI-hallucinated ingredients, rejects invalid step numbers, accepts partial matches and normalizes to exact original text, handles malformed JSON safely, threads dietary restrictions into the prompt
  - `recipeController.test.ts` forkRecipe (7 tests): 400/404 guards, original fork preserves data, **substitution fork sets `parentRecipeId`**, **adjusts macros**, **flips source to `user-modified`**, **applies replacement ingredient text**, **applies instruction changes by step number**, plain fork without swaps keeps `user-created` source, **macros clamp to ≥0** on large negative deltas
  - `recipeController.test.ts` askSubstitution (3 tests): 400 when question missing/empty, 404 when recipe not found
  - All 60 tests pass: `substitutionService` (7), `ingredientSwapService` (12), `recipeController` (41)

---

#### **10F: Taste Rating & Flavor Feedback** ⭐ *(Cooking Complete → Home Feed)*

*The current feedback loop is: like/dislike + star rating. But "I liked it" doesn't tell the engine WHY. Was it the spice? The texture? The cuisine? Better taste feedback = dramatically better recommendations.*

* [x] **Post-cook taste survey (2 taps, not a form)** ✅ — `TasteSurveySheet` bottom sheet shown after cooking completion via "Rate This Meal" button.

  **Question 1: "How did it taste?"** — 5-emoji scale (😐 😕 😊 😄 🤤) mapped to tasteRating 1-5

  **Question 2: "What stood out?"** — Quick-tap flavor tag chips (select 1-3):
  `Too bland` · `Perfect spice` · `Great texture` · `Too salty` · `Loved the sauce` · `Kid-approved` · `Would make again` · `Needs more protein` · `Too much effort` · `Great leftovers`

  * 📍 Backend: `tasteRating Int?` + `flavorTags String?` (JSON) on `Meal` model ✅; `POST /api/meal-plan/meals/:mealId/taste-feedback` endpoint in `tasteFeedbackController.ts` ✅
  * 📍 Syncs to `RecipeFeedback`: tasteRating >= 4 → liked=true, <= 2 → disliked=true, always consumed=true ✅
  * 📍 Behavioral scoring integration deferred to future iteration (requires taste-tag aggregation per cuisine — data collection ships first)
  * 📍 "Would make again" 2x weight deferred to scoring pass when enough data collected

* [x] **Flavor profile on recipe cards** ✅ — `flavorProfile.ts` rules engine detects flavors from ingredients + cuisine (no AI):
  🌶️ (spicy), 🧀 (cheesy/rich), 🥗 (light/fresh), 🍯 (sweet), 🔥 (smoky), ❄️ (cold/refreshing)
  * 📍 `detectFlavorProfile()` — keyword matching for 6 flavor categories, spicy cuisine set, max 3 icons ✅
  * 📍 Icons rendered on `RecipeCard` (list + grid/carousel variants) after macro row ✅
  * 📍 Returned in home feed API response via `scoreRecipe()` ✅

* [x] **"Why this recipe?" transparency** ✅ — `recommendationReason.ts` generates one-liner from scoring breakdown:
  * 📍 Priority-ranked candidates: liked cuisine (90), high protein for muscle gain (85), low cal for weight loss (85), behavioral history (80), weekend adventure (75), quick cook (70), macro match (65), health grade A (60), temporal (55), fallback "Picked for you by Sazon"
  * 📍 Displayed as a purple ✨ chip on recipe detail screen (modal.tsx) — hidden for generic fallback and non-recommendation contexts ✅

* [x] **Test:** ✅
  - `flavorProfile.test.ts` (17 tests): spicy detection (cuisine + ingredient), cheesy vs rich, fresh, sweet, smoky, cold/refreshing, multiple flavors, max 3 cap, string[] format, edge cases
  - `recommendationReason.test.ts` (9 tests): liked cuisine, high protein, low calorie, quick cook, behavioral, weekend adventure, fallback, priority ordering, non-empty guarantee
  - `tasteFeedback.test.ts` (9 tests): 400 on missing/invalid tasteRating, 404 on bad meal, saves rating + tags, defaults empty tags, updates vs creates RecipeFeedback, liked=true when >= 4, skips feedback for custom meals
  - All 837 backend tests pass

---

#### **10G: Macro Flexibility & "Cheat Meal" Budgeting** 📊 *(Meal Plan)*

*Real life isn't perfectly balanced every day. Had a light Monday? Eat richer on Tuesday. Want pizza tonight? Adjust lunch to compensate. The app should say YES to cravings and help you budget around them — not just say "that doesn't fit your macros."*

**10G-Pre: Continuity Audit — Shopping ↔ Meal Plan ↔ Pantry ↔ Cooking** 🔗

*Before the weekly budget bar and craving flow land, fix the broken seams between the four surfaces. Audit found: shopping check-off never populates pantry, cooking never consumes pantry, budget state is duplicated across two screens, pantry has no first-class surface, cross-surface handoffs are inconsistent. If we ship 10G (and 10H) on top of this, the new features inherit the disjointedness.*

* [x] **Shopping check-off → Pantry auto-stock** — When a shopping item is toggled `purchased: true`, upsert a `PantryItem` with the same name + category (non-blocking, parallel to existing `recordPurchase()`). When toggled back to unpurchased, remove the matching pantry item if it was auto-added (track via a `source: 'shopping'` column on PantryItem, new field).
  * 📍 Backend: extend `shoppingListController.toggleItemPurchased` (line ~1262) + bulk variants to also call `pantryService.markPurchased()`. Add `source` to `PantryItem` schema (`'manual' | 'shopping' | 'cooking'`). ✅
  * 📍 Frontend: no UI change — this is a silent auto-sync. Pantry list in shopping-list screen reflects the update on refetch. ✅
  * [x] **Test:** `backend/tests/modules/shoppingPantrySync.test.ts` — toggling an item creates a PantryItem with `source: 'shopping'`; toggling back removes it; manual entries are preserved; batch update stocks multiple (5/5 passing).

* [x] **Cooking complete → Pantry consume** — After `handleToggleMealCompletion(isCompleted: true)` fires in `useMealCompletion.ts`, show an opt-in `ConsumeIngredientsSheet` listing the recipe's ingredients with checkboxes (pre-checked). User confirms → POST `/api/pantry/consume` with the ingredient list → backend removes/decrements matching pantry items. Not silent (users must trust the mapping).
  * 📍 Backend: `POST /api/pantry/consume` accepts `{ ingredients: string[] }` → fuzzy token match against user's pantry → remove matches. Returns `{ consumed, unmatched }`. ✅
  * 📍 Frontend: new `components/cooking/ConsumeIngredientsSheet.tsx` triggered from `cooking.tsx` on completion. Pre-checked list, "Mark as used" CTA, dismissable, non-blocking on failure. ✅
  * [x] **Test:** `backend/tests/modules/pantryConsume.test.ts` (8/8) — exact + fuzzy match, no double-consume, error handling; `frontend/__tests__/components/ConsumeIngredientsSheet.test.tsx` (6/6) — pre-checked render, API payload, toggle, Skip, disabled empty, non-blocking failure.

* [x] **Pantry as a first-class surface** — Promote `PantrySection` out of shopping-list into its own `/pantry` screen accessible from shopping-list header chip. Shopping-list keeps an inline collapsed summary ("N items in pantry") that deep-links to the new screen.
  * 📍 Frontend: new `app/pantry.tsx` reuses `PantrySection`, adds header + back button + "Recipes you can make right now" ContinuityCTA. Shopping-list shows a `pantry-chip` ContinuityCTA deep-linking to `/pantry`. ✅
  * [x] **Test:** `frontend/__tests__/app/pantry.test.tsx` (5/5) — loads pantry on mount + focus, renders count, back button, empty state, API error graceful.

* [x] **Unified `useBudget()` hook** — Kill the duplicated `userApi.getPreferences()` calls. Create `frontend/hooks/useBudget.ts` returning `{ weeklyGrocery, dailyGrocery, weeklyCalories, dailyCalories, weeklyProtein, dailyProtein, loading, refresh }`. Consumed by shopping-list (and available for meal-plan + 10G weekly budget bar).
  * 📍 Frontend: `hooks/useBudget.ts` reads `userApi.getPreferences()` once, filters zero/negative as null, converts weekly↔daily; `shopping-list.tsx` consumes it (meal-plan migration deferred). ✅
  * 📍 Backend: no change — composes from existing `userApi.getPreferences()`. (10G's `GET /api/meal-plan/weekly-budget` will replace the client-side computation later.)
  * [x] **Test:** `frontend/__tests__/hooks/useBudget.test.ts` (6/6) — returns expected shape, refresh, handles missing budget (nulls not zeros), weekly↔daily conversion.

* [x] **`ContinuityCTA` primitive** — A single small component for cross-surface handoffs so they look and behave identically. Props: `{ icon, label, onPress, tint, accessibilityLabel, testID }`. Supports 6 pastel tints (sage, golden, lavender, peach, sky, blush). Currently used by shopping-list (pantry chip) and pantry screen (recipes CTA). Remaining call-sites land with 10G/10H.
  * 📍 Frontend: `components/ui/ContinuityCTA.tsx` — pastel pill with icon + arrow, haptic on press via `HapticTouchableOpacity`. ✅
  * [x] **Test:** `frontend/__tests__/components/ContinuityCTA.test.tsx` (4/4) — renders label + icon, fires onPress, a11y label, tint variants.

* [x] **Prisma: `PantryItem.source` column** — Added `source String @default("manual")` to track how each pantry item got there (`manual | shopping | cooking`). Needed for the auto-remove-on-untoggle logic and for future analytics.
  * 📍 Backend: `schema.prisma` updated + `npx prisma db push`. Existing rows default to `'manual'`. ✅
  * [x] **Test:** covered by `shoppingPantrySync.test.ts` — upsert writes source, manual entries preserved on both toggle directions.

---

* [x] **Weekly macro view (not just daily)** — The `WeeklyNutritionSummary` already shows weekly totals, but add a **weekly budget bar** that shows how much macro "runway" remains. If you're under on Monday, Tuesday's suggestions auto-adjust upward.
  * 📍 Backend: `GET /api/meal-plan/weekly-budget` — returns daily targets adjusted by previous days' actuals. Monday was 300 cal under → Tuesday target = daily + 150 (split deficit across remaining days, not all at once) ✅
  * 📍 Frontend: "Weekly Budget" card on meal plan screen showing remaining weekly calories/protein as a progress bar with "X remaining across Y days" ✅
  * [x] **Test:** `backend/tests/modules/weeklyBudget.test.ts` (6/6) — null shape when no macro goals, surplus adjustment, deficit adjustment, ignores incomplete meals, clamps at 0 when over budget, daysRemaining=7 on Monday. `frontend/__tests__/components/WeeklyBudgetBar.test.tsx` (7/7) — renders nothing when null, remaining + days, surplus/deficit rollover, on-target hides rollover, a11y label, protein row. `frontend/__tests__/hooks/useBudget.test.ts` extended (9/9) — exposes `weeklyBudget`, null when no goals, refresh re-fetches.

* [x] **"I want to eat [X] tonight" flow** — User declares a craving or specific meal (pizza, burger, pasta) and the app presents **three paths**, not just one:

  1. User taps "I have a craving" on meal plan
  2. Enters or selects the craving (free text → AI estimates macros, or select from recipes)
  3. App shows macro impact: "A typical pizza is ~800 cal, 35g protein" and presents **three options as cards:**

  | Option | What it does | Example |
  |--------|-------------|---------|
  | **🍕 "Go for it"** | Slot the real thing, adjust remaining meals to compensate | "Switch lunch to [this 350-cal salad] and skip the afternoon snack to stay on target" — or "You're 200 cal over daily but within your weekly budget — you're fine!" |
  | **🥦 "Make a healthier version"** | Generate a macro-friendly version of the craving using the same ingredient substitution engine | Pizza: cauliflower crust + skim mozzarella + turkey pepperoni → **~280 cal** vs 800 cal. "Won't lie — not quite Round Table, but it'll crush the craving at 1/3 the calories." Show side-by-side macro comparison. |
  | **🔀 "Something similar but lighter"** | Find a different recipe that scratches the same itch | Craving pizza → suggest flatbread caprese (350 cal), Turkish lahmajun (280 cal), or naan pizza (320 cal). Same cheesy/savory/warm satisfaction, different dish. |

  * 📍 **Option 2 detail — "Healthier Version" generation:**
    - Backend: `POST /api/recipes/healthify-craving` — takes craving text → AI generates a macro-friendly version using the substitution database (cauliflower crust, skim cheese, turkey meats, oat flour, Greek yogurt, etc.)
    - Response includes: original estimated macros, healthified macros, side-by-side comparison, and an honesty note ("Tastes 80% as good at 35% of the calories — worth the trade")
    - The honesty is key — never claim the healthy version is "just as good." Users respect authenticity: "This cauliflower crust pizza is legit good. Is it delivery pizza? No. But it's 280 cal with 32g protein and it'll satisfy the craving."
    - Save the healthified recipe to cookbook if user likes it
  * 📍 **Option 3 detail — "Similar but lighter" suggestions:**
    - Backend: reuse craving search (`/api/recipes/craving-search`) with the craving text + calorie ceiling (user's remaining daily budget)
    - Return 3-5 recipes from the database that match the craving's flavor profile but fit the macros
  * 📍 This is the anti-guilt feature. It never says "no." It says "yes, AND here are two smarter ways if you want them."
  * ✅ Backend: `cravingFlowService` wraps AIProviderManager to return `{ original, healthified, honestyNote }`; clamps absurd AI output. `POST /api/recipes/craving-flow` runs healthify + lighter-recipe search in parallel (calorie ceiling = `macroGoals.calories / 3`). `maxCalories` filter added to existing craving-search.
  * ✅ Frontend: `CravingFlowModal` (bottom sheet, FlowState union `input | loading | error | options`) — input step, 3 OptionCards (peach/sage/sky), original macros strip, honesty note. Wired into meal plan via new "🍕 I have a craving" quick action badge. Handlers: `onGoForIt` → alert acknowledging, `onSaveHealthified` → `recipeApi.createRecipe` to cookbook, `onBrowseLighter` → router.push first suggestion.
  * [x] **Test:** `backend/src/services/__tests__/cravingFlowService.test.ts` (5/5) — parses response, forwards user goals, throws on invalid, throws on empty craving, clamps absurd values. `backend/src/modules/recipe/__tests__/cravingFlow.integration.test.ts` (5/5) — 400 on empty, returns full shape, forwards macro goals + calorie ceiling, 500 on service error. `backend/src/modules/recipe/__tests__/cravingSearch.integration.test.ts` extended (10/10) — maxCalories filter applied, zero/negative ignored. `frontend/__tests__/components/CravingFlowModal.test.tsx` (9/9) — renders input, hidden when invisible, 3 option cards, original + honesty, rejects empty, each callback fires with correct payload, error state.

* [x] **Macro rollover display** — On each day in the meal plan, show a subtle indicator: "↑ 150 cal from yesterday" (surplus carried forward) or "↓ 200 cal to make up" (deficit to recover). Visual: green arrow for surplus (eat more today), orange for deficit (eat lighter).
  * ✅ Pure `computeDailyRollovers` util (`frontend/utils/dailyRollover.ts`) — takes `{ dailyConsumed, dailyTarget }` and emits `Map<nextDayKey, { delta, fromDate }>`; skips zero-consumption days, handles DST-safe date math via UTC.
  * ✅ `DailyMacrosSummary` accepts optional `rollover` prop and renders a pastel pill (sage + chevron-up for surplus, peach + chevron-down for deficit) above the macros grid with accessibility labels. Hides when delta === 0 or rollover is null.
  * ✅ Wired into `app/(tabs)/meal-plan.tsx` — builds `dailyConsumed` from completed meals in `weeklyPlan`, computes rollover for the selected date, passes to `DailyMacrosSummary`.
  * [x] **Test:** `frontend/__tests__/utils/dailyRollover.test.ts` (8/8) — empty input, first-day no-prior, surplus (+delta), deficit (−delta), zero-consumption skip, multi-day chain, exact-match emits 0, zero/negative target returns empty. `frontend/__tests__/components/DailyMacrosSummary.test.tsx` extended (10/10) — surplus pill renders `+N`, deficit pill renders `N`, hidden when null, hidden when delta=0.

* [x] **Test:** Weekly budget adjusts Tuesday target when Monday was under; "I want pizza" flow shows all 3 options (go for it, healthier version, similar but lighter); healthier version has fewer calories than original estimate; "similar but lighter" results fit within daily remaining budget; daily macro rollover indicator shows correct surplus/deficit; weekly budget bar reflects actual consumption; healthified recipe can be saved to cookbook — **all covered by sub-section tests 10G-A/B/C (weeklyBudget 6/6, cravingFlowService 5/5, cravingFlow integration 5/5, cravingSearch maxCalories 10/10, CravingFlowModal 9/9, dailyRollover 8/8, DailyMacrosSummary 10/10, WeeklyBudgetBar 7/7, useBudget 9/9).**

---

#### **10H: "What Can I Make Right Now?"** 🧊 *(Home Screen + Shopping List)*

*Don't make me shop to cook. Show me what I can make with what I already have.*

* [x] **Pantry-based recipe matching** — New section on home screen: "Cook with What You Have". User's pantry is inferred from:
  1. **Shopping list completion** — items checked off = items in pantry (auto-tracked)
  2. **Manual pantry** — simple add/remove list in profile (already partially exists via "Add to pantry" on shopping list)
  3. **Recipe completion** — if user cooked a recipe, leftover ingredients likely still available for 3-5 days
  * ✅ Backend: `GET /api/recipes/pantry-match` — `pantryMatchService.computePantryMatch` normalizes ingredients (quantity-strip + token fuzzy match), counts staples (salt/pepper/oil/water) as always-matched, returns `{ matched, missing, matchPercentage, canSubstitute }`. Controller pulls pantry + candidate pool (500 recipes), filters by `minMatch` (default 70%) and optional `maxMissing`, sorts by percentage DESC.
  * ✅ Response: `{ recipes: [{ id, title, cuisine, calories, protein, matchPercentage, missingIngredients, canSubstitute }], pantrySize }`
  * ✅ Frontend: `PantryMatchCard` home widget (hidden when pantry empty) + `/pantry-matches` list screen with per-recipe match badge, missing-ingredient hint, and "you have everything" confirmation.

* [x] **"Just need 1-2 more items"** filter — `PantryMatchCard` has a toggle between "All matches" and "Just 1–2 more items"; the list screen respects `maxMissing` query param. "You're one lime away from ceviche."

* [x] **Leftover transformer** — After `handleDone()` in cooking mode, `LeftoverIdeasSheet` opens with up to 5 recipes that reuse ≥2 ingredients from the recipe just cooked, excluding the source recipe + its cuisine so suggestions feel genuinely different. Silent (unmounts) when no ideas are found — no guilt prompt.
  * ✅ Backend: `POST /api/recipes/leftover-ideas` — reuses `computePantryMatch` with leftovers as pantry, filters `reuseCount >= 2`, excludes source recipe + cuisine.

* [x] **Test:** `backend/src/services/__tests__/pantryMatchService.test.ts` (14/14) — normalize, isStaple, matchesPantry, computePantryMatch (100%, staples, partial, zero, canSubstitute true/false, empty input, quantity prefixes). `backend/src/modules/recipe/__tests__/pantryMatch.integration.test.ts` (11/11) — pantryMatch (empty pantry, 70% threshold, custom minMatch, maxMissing filter, sort DESC, 500 on error) + leftoverIdeas (400 on missing/empty, reuses ≥2, excludeCuisine/excludeRecipeId applied to where, limit clamp). `frontend/__tests__/components/PantryMatchCard.test.tsx` (8/8) — loading, empty-pantry hidden, error hidden, total count, near-match toggle, onPress with/without filter, API params. `frontend/__tests__/components/LeftoverIdeasSheet.test.tsx` (7/7) — invisible no-fetch, fetches with exclusions, renders cards, onSelect+onClose, empty-result silent, API error silent, empty ingredients no-fetch.

---

#### **10I: Cooking Skill Progression & Confidence Building** 📈 *(Profile + Cooking Mode)*

*The skill level setting is static — "beginner" forever. Real users grow. The app should notice and celebrate growth without making beginners feel inadequate.*

* [x] **Cooking stats dashboard** — `CookingJourneyCard` lives in profile (`frontend/components/profile/CookingJourneyCard.tsx`), backed by `useCookingJourney` hook → `GET /api/user/cooking-stats`. Renders pastel widget tiles for cooked-this-month / all-time, cuisines explored count, current + longest streak, skill level + difficulty trend, plus a horizontal flag chip strip of all cuisines collected. Backend service `cookingStatsService.computeCookingStats` aggregates from existing `CookingLog` + `Recipe` joins (cuisine, difficulty, cookedAt) — no schema change.

* [x] **Gentle skill-up nudges** — `GET /api/user/skill-progress` joins `CookingLog` with `Meal.tasteRating` per recipe and runs `computeSkillProgress`. Thresholds: beginner→home_cook = 10 easy cooks with tasteRating ≥ 3; home_cook→confident = 10 medium cooks; confident→chef = 5 hard cooks with tasteRating ≥ 3. Returns `{ readyToLevelUp, nextLevel, reason }`. The `CookingJourneyCard` shows a peach-tinted nudge banner when ready; tapping calls `POST /api/user/skill-progress/accept` which upserts `UserPreferences.cookingSkillLevel`.

* [x] **"First time cooking [X]" badges** — Derivable without a new table: `cookingStatsService` returns `firstCookedCuisines: [{ cuisine, firstCookedAt }]` computed from the earliest `CookingLog.cookedAt` per cuisine. Surfaced in the cuisine flag chip strip on `CookingJourneyCard`. (CuisineExploration table deferred — pure aggregation works for the v1 flag grid.)

* [x] **Technique tips in cooking mode** — Curated 35-technique glossary in `frontend/lib/cookingTechniques.ts` with regex pattern-match (`detectTechniques(stepText, seenIds)`). `cooking.tsx` tracks a `seenTechniques` Set per cooking session and renders a collapsible `<TechniqueTip />` below each step text whenever a new technique appears (braise, deglaze, temper, fold, bloom spices, roux, julienne, chiffonade, sauté, caramelize, poach, marinate, rest, proof, knead, baste, render, score, brine, emulsify, etc.). Once opened, the technique is added to `seenTechniques` so it doesn't re-prompt later in the session.

* [x] **Seed-your-journey edit sheet** — `CookingJourneyCard` header is tappable (`testID="cooking-journey-edit-trigger"`) and opens `CookingJourneyEditSheet`, a bottom sheet with a 14-cuisine multi-select grid + skill level picker. Persists via `PUT /api/user/cooking-journey/seed` → `UserPreferences.seededCuisines` (JSON array) + `cookingSkillLevel`. Seeded cuisines merge into `cuisinesExplored` (so the flag grid reflects reality) but NOT `firstCookedCuisines` (which must be earned through real `CookingLog` entries). Onboarding promotion deferred — A/B test in profile first, feature more prominently if engagement is high.

* [x] **Test:** `cookingStats.test.ts` (14 tests + 2 seeded-cuisine tests = 16) — empty input zeros, this-month vs all-time counts, cuisine dedup + first-cooked-at, difficulty average + leveling-up trend detection, null-safe handling, streak edge cases (broken streaks, today/yesterday detection, multi-cooks-same-day). `cookingJourney.controller.test.ts` (12 tests — adds seededCuisines merge, malformed JSON, PUT validation + dedup + skill-only update) — `getCookingStats` aggregation, 500 on db error, `getSkillProgress` joining logs with taste ratings, default-to-beginner when prefs missing, `acceptSkillLevelUp` validation + upsert. `cookingTechniques.test.ts` (7 tests) — braise/deglaze/temper detection, seen-set filtering, no false positives, no duplicates, glossary size guard. `CookingJourneyCard.test.tsx` (4 tests) — stats render, level-up nudge appears + fires `acceptSkillLevelUp`, nudge hidden when not ready, header tap opens edit sheet. `CookingJourneyEditSheet.test.tsx` (2 tests) — toggles cuisines + skill and fires `onSave` with current selection, renders nothing when not visible.

---

#### **10J: Meal Prep Variety Enforcer** 🎨 *(Meal Plan Generation)*

*If you're prepping 5 lunches for the week, they should NOT all be chicken + rice + broccoli. The AI should enforce variety across flavor profiles, textures, cuisines, and colors — because eating the same thing 5 days in a row is what makes people quit.*

* [x] **Variety scoring in meal plan generation** — When generating multiple meals for the same meal type across a week, enforce:
  - **No repeated proteins** across consecutive days (chicken Mon → fish Tue → beef Wed → tofu Thu → chicken Fri is OK; chicken Mon-Wed is not)
  - **No repeated cuisines** on consecutive days
  - **Texture variety** — not all soft foods; mix grilled, roasted, raw, steamed
  - **Color variety** — not all brown food; ensure green, orange, white, red representation across the week
  - **Temperature variety** — not all hot meals; include cold salads, wraps, overnight oats
  * 📍 Add variety constraints to `generateMealPlan` AI prompt: "Ensure no protein source repeats on consecutive days. Vary textures (grilled, steamed, raw) and ensure visual color variety across the week."
  * 📍 Post-generation validation: score the week for variety and flag if too repetitive

* [x] **"Boring week" detection** — After a meal plan is generated (or manually filled), if the variety score is low, show a subtle nudge: "Your lunches are looking a bit samey — want Sazon to mix it up?" → one tap regenerates just the repetitive meals.
  * 📍 Variety score: count unique proteins, cuisines, cooking methods. Score 0-100. Below 40 → show nudge.

* [x] **Test:** Generated meal plan has no repeated protein on consecutive days; generated plan spans ≥3 different cuisines across the week; "boring week" detection triggers when variety score < 40; regeneration only replaces repetitive meals, not the whole plan ✅ `backend/tests/modules/varietyScore.test.ts`, `varietyController.test.ts`, `frontend/__tests__/components/BoringWeekNudge.test.tsx`

---

#### **10K: Serving Scaler with Live Macro Recalculation** 📐 *(Recipe Detail)*

*Users want to adjust portions instantly — "I need this to be 500 cal, not 700" or "make this for 4 people". The macros and ingredients should update in real time.*

* [x] **Scaling pills on recipe detail** — Below the recipe title, show quick-tap pills: `½×` `1×` `2×` `4×` + "Custom" pill for exact serving count. Tapping instantly updates:
  - All ingredient quantities
  - All macro values (calories, protein, carbs, fat, fiber)
  - Estimated cost
  - Cook time hint ("May need 5 extra minutes for larger batch")
  * 📍 Frontend-only calculation (multiply by scale factor) — no backend call needed
  * 📍 "Custom" opens a small input: "How many servings?" or "Target calories:" (reverse-calculates serving size to hit a calorie target)

* [x] **"Hit my macros" scaler** — Instead of choosing servings, user enters their remaining macro budget ("I have 450 cal and 35g protein left") → the app calculates the exact portion size to fit. Shows: "1.3 servings = 442 cal, 34g protein."
  * 📍 Frontend calculation: `targetCalories / perServingCalories = scaleFactor`
  * 📍 Integrates with meal plan "remaining calories" context

* [x] **Test:** Scaling pills update ingredient quantities and macros correctly; 2× doubles all values; custom serving input accepts decimal values; "Hit my macros" scaler calculates correct portion to match target calories within 5%

---

#### **10L: Branded Food & Restaurant Tracking** 🍕🏪 *(Meal Plan + Quick Log)*

*The macro-tracking blind spot. Users don't always cook — sometimes they eat Round Table pizza, grab a Chipotle bowl, or snack on a KIND bar. Right now they can only use QuickMealLogModal (manual entry) or barcode scan. What's missing: **text-based search for branded/restaurant items** so users can log "Round Table pepperoni pizza" and get real macros without guessing.*

**What already exists:**
- `QuickMealLogModal` — manual name + macro entry (works but tedious)
- Barcode scanning — OpenFoodFacts + Nutritionix lookup (works for packaged goods you physically have)
- Food photo recognition — OpenAI Vision (works but estimates, not exact)
- `Meal` model has `customName`, `customCalories`, `customProtein`, `customCarbs`, `customFat` for non-recipe logging

**What's missing:**
- Text-based branded food search ("Round Table pizza", "Chipotle burrito bowl", "KIND protein bar")
- Cached food items for instant re-logging (no API call for frequently eaten items)
- "Recent Foods" and "Frequent Foods" lists for one-tap logging

* [x] **`FoodItem` model** — New Prisma model for caching branded/restaurant food items:
  ```
  model FoodItem {
    id            String   @id @default(uuid())
    name          String                    // "Round Table Pepperoni Pizza (1 slice)"
    brand         String?                   // "Round Table"
    category      String?                   // "restaurant" | "packaged" | "fast_food"
    servingSize   String?                   // "1 slice (125g)"
    calories      Float
    protein       Float
    carbs         Float
    fat           Float
    fiber         Float?
    source        String                    // "nutritionix" | "openfoodfacts" | "user"
    externalId    String?                   // Nutritionix item_id or OFF barcode for dedup
    imageUrl      String?
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
    @@unique([source, externalId])
    @@index([name])
  }
  ```
  * 📍 Also add `foodItemId` optional FK on `Meal` model — links a logged meal to a cached food item for easy re-logging

* [x] **Branded food search endpoint** — `GET /api/food/search?q=round+table+pizza`
  * 📍 Two-tier search: (1) local `FoodItem` cache first, (2) external API fallback
  * 📍 **Nutritionix Instant API** for restaurant items — covers 900k+ restaurant menu items (Chipotle, McDonald's, local chains). Requires API key (`NUTRITIONIX_APP_ID`, `NUTRITIONIX_API_KEY` — already used for barcode scanning)
  * 📍 **OpenFoodFacts text search** for packaged goods — free, no key required
  * 📍 Cache results to `FoodItem` on first lookup (avoids repeat API calls)
  * 📍 Response: `{ results: FoodItem[], source: "cache" | "nutritionix" | "openfoodfacts" }`

* [x] **"Log Food" quick-add flow** — Streamlined alternative to QuickMealLogModal:
  1. User taps "+" on a meal slot in the meal plan → shows options: "Add Recipe" (existing), **"Log Food"** (new)
  2. "Log Food" opens a search sheet with: **search bar** + **Recent Foods** (last 10 logged) + **Frequent Foods** (top 10 by count)
  3. User searches → taps result → confirms serving size → logged to meal plan as a `Meal` with `foodItemId` + auto-filled macros
  4. One-tap re-log from recents: no search needed, just tap → done
  * 📍 Frontend: `LogFoodSheet.tsx` component (bottom sheet)
  * 📍 Backend: `GET /api/food/recent` (user's recent logged food items), `GET /api/food/frequent` (user's most-logged food items, sorted by frequency)
  * 📍 Backend: `POST /api/food/log` — creates `Meal` entry with `foodItemId`, updates usage count for frequency sorting

* [x] **Serving size adjustment** — When logging a branded food, show a simple stepper: "How many servings?" (default 1, support decimals like 1.5 or 2). Macros recalculate live (same frontend-only pattern as serving scaler).

* [x] **User-submitted food items** — If a branded food isn't found in search, allow manual entry (like current QuickMealLogModal) but save it to `FoodItem` with `source: "user"` so it's available for future re-logging. "You entered Round Table Gourmet Veggie Pizza — we'll remember this for next time."

* [x] **Test:** Search for "Chipotle" returns restaurant items with macros; search checks local cache before external API; first external lookup caches to FoodItem; recent foods returns user's last 10 logged items in order; frequent foods returns top 10 by usage count; logging a branded food creates Meal with correct macros and foodItemId; serving size adjustment recalculates macros correctly; user-submitted food items appear in future searches

---

#### **10M: Snap to Log — Photo-Based Meal Tracking** 📸 *(Meal Plan + Home Screen)*

*We already have GPT-4V food recognition (`foodRecognitionService.ts`) accessible via the Quick Actions "Take a Picture" menu and the dedicated scanner screen (`scanner.tsx`). The problem: it's buried, disconnected from meal tracking, and only estimates calories — not full macros. This upgrade turns a cool demo into an essential daily-use feature.*

**What already exists:**
- `POST /api/scanner/recognize-food` — accepts image, returns `FoodRecognitionResult` with food names + estimated calories via GPT-4V
- `QuickCameraModal` in `_layout.tsx` — camera snap from Quick Actions "+" menu (buried in a 12-item action sheet)
- `scanner.tsx` — full scanner screen with Food Photo / Barcode tabs
- `scanner-results.tsx` — shows results with "Add to Shopping List" and "Find Recipes" buttons

**What's broken / missing:**
- **No "Log to Meal Plan" action** — user can scan food but can't track it. The results dead-end at shopping list or recipe search.
- **Calories only, no full macros** — GPT-4V prompt only asks for calorie estimates, not protein/carbs/fat breakdown.
- **Buried access** — 2 taps deep in a 12-item action sheet. Most users will never find it.
- **No portion adjustment** — AI estimates a portion but user can't say "that was actually 2 servings."
- **No connection to FoodItem cache** — photo-scanned foods aren't saved for re-logging.

* [x] **Enhanced GPT-4V prompt for full macros** — Update `foodRecognitionService.ts` prompt to request full macro breakdown per food item, not just calories:
  * ✅ Current response shape: `{ name, confidence, estimatedCalories, estimatedPortion }`
  * ✅ New response shape: `{ name, confidence, estimatedCalories, estimatedProtein, estimatedCarbs, estimatedFat, estimatedFiber, estimatedPortion, portionGrams }`
  * ✅ Update the GPT-4V system prompt: "For each food item, estimate calories, protein (g), carbs (g), fat (g), and fiber (g) per the visible portion. Include estimated portion size in grams."
  * ✅ Update `FoodRecognitionResult` interface and all consumers

* [x] **"Log This Meal" button on scan results** — After photo recognition returns results, add a prominent "Log to Meal Plan" CTA alongside the existing "Add to Shopping List" and "Find Recipes" buttons.
  * ✅ On `scanner.tsx` results view: new orange "Log This Meal" button (most prominent position)
  * ✅ On `scanner-results.tsx`: same button added
  * ✅ Tapping opens a confirmation sheet: shows detected foods with full macros, total meal macros, serving adjustment (stepper: ½×, 1×, 1.5×, 2×), and meal slot picker (Breakfast / Lunch / Dinner / Snack + date selector defaulting to today's next empty slot)
  * ✅ Confirm → creates `Meal` entry with `customName` (AI meal description), full macros from recognition, and `source: "photo_scan"`
  * ✅ Also cache each detected food to `FoodItem` with `source: "photo_scan"` so it appears in the Branded Food "Recent Foods" list for instant re-logging

* [x] **Camera icon on meal plan "+" menu** — When user taps "+" on a meal slot, add a camera icon option alongside "Add Recipe" and "Log Food":
  * ✅ "Snap a Photo" → opens camera directly (skip the Quick Actions detour)
  * ✅ After scan → same "Log This Meal" confirmation sheet, but pre-selects the meal slot the user tapped "+" on
  * ✅ This makes the flow: tap "+" on lunch → snap photo → confirm → logged. Under 10 seconds.

* [x] **Camera shortcut on home screen** — Add a persistent camera icon/button on the home screen (near the search bar or as a floating action) for quick access:
  * ✅ Not a replacement for the Quick Actions menu — an additional shortcut for the most common use case
  * ✅ Tapping opens camera directly → scan → "Log This Meal" flow
  * ✅ Subtle and non-intrusive — small camera icon in header, not a giant FAB

* [x] **Portion adjustment on results** — After AI estimates "1 serving of pasta (~350 cal)", let the user adjust:
  * ✅ Serving stepper on each detected food item: ½×, 1×, 1.5×, 2×
  * ✅ Macros recalculate live as user adjusts (frontend-only math)
  * (deferred) "That looks like more than 1 serving" nudge — lower priority UX polish

* [x] **Multi-food meal support** — The AI often detects multiple items in one photo (e.g., "grilled chicken, rice, and salad"). Each item should be individually editable:
  * ✅ Show each food as a separate card with its own macros and serving adjuster
  * ✅ User can remove items they didn't actually eat ("I skipped the rice")
  * ✅ Total meal macros update live as items are adjusted or removed
  * ✅ "Add an item" button for things the AI missed (opens the branded food text search)

* [x] **Test:** Enhanced GPT-4V prompt returns protein/carbs/fat/fiber (not just calories); "Log This Meal" creates Meal entry with full macros; photo-scanned foods cache to FoodItem table; portion adjustment at 2× doubles all macro values; removing a food item from multi-food result updates total macros; camera shortcut on meal plan "+" opens camera directly; logged meal appears in correct meal slot and date; home screen camera shortcut opens camera without going through Quick Actions

---

#### **10N: "You Might Also Like" — Recipe Discovery** 🔀 *(Recipe Detail)*

*Forward momentum, never a dead end. When a user finishes reading a recipe, show them where to go next — related recipes by cuisine, macros, or meal type.*

* [x] **Related recipes carousel** — Recipe detail (`modal.tsx`): add a "You might also like" horizontal carousel at the bottom of the scroll content, showing 4–6 related recipes (same cuisine, similar macros, or same meal type)
* [x] **Backend: `GET /api/recipes/:id/related`** — return recipes with matching cuisine/tags, excluding the current recipe. Use cuisine adjacency to broaden results (if viewing a Thai recipe, also surface Lao and Burmese)
* [x] **Tapping a related recipe** navigates to its detail (push onto stack, not replace)
* [x] **Test:** Related recipes section renders with at least 1 recipe; tapping navigates to new detail screen; section hidden gracefully if no related recipes found; doesn't duplicate the current recipe

---

#### **10O: Implementation Order**

| Phase | Focus | Est. Hours | Dependencies |
|-------|-------|-----------|--------------|
| **Phase 1** | 10A: Recipe creation & editing (FAB, AI-assisted, fork/edit) | 8h | Group 9 Phase 3 (screen polish) |
| **Phase 2** | 10B: Collection browsing, smart collections, pagination, suggestions | 10h | Phase 1 |
| **Phase 3** | 10C: "Find Me a Meal" (MealRequestModal, backend search, results) | 8h | Group 11 Phase 1 (cuisine families) |
| **Phase 4** | 10D: Craving search + 10E: Ingredient substitution engine | 10h | Phase 1 |
| **Phase 5** | 10F: Taste feedback + 10N: Related recipes discovery | 5h | Phase 4 |
| **Phase 6** | 10G: Macro flexibility & cheat meal budgeting (weekly view, 3-path flow) | 6h | Phase 4 (reuses craving search) |
| **Phase 7** | 10H: Pantry match + leftover transformer | 4h | Phase 1 |
| **Phase 8** | 10I: Skill progression + 10J: Variety enforcer + 10K: Serving scaler | 5h | Phase 5 |
| **Phase 9** | 10L: Branded food tracking (FoodItem model, search API, LogFoodSheet) | 5h | Phase 1 |
| **Phase 10** | 10M: Snap to Log (enhanced macros, camera shortcuts, portion adjust) | 5h | Phase 9 (shares FoodItem model) |
| **Phase 11** | 10R: Food Intel (tip library, 5 surface points, matching engine) | 4h | Phase 5 (reuses cooking mode + home feed) |
| **Phase 12** | 10S: Kitchen IQ (card library, browse screen, progressive unlocks) | 6h | Phase 8 (reuses cooking stats from 10I) |
| **TOTAL** | | **~66h** | |

---

#### **10P: Tests (combined)**

**`frontend/__tests__/components/cookbook/RecipeCreation.test.tsx`**
- [x] FAB renders on cookbook screen and opens recipe form on tap
- [x] AI-assisted creation returns structured recipe from free-text
- [x] Saving a created recipe adds it to cookbook and current collection
- [x] Edit button shows for `isUserCreated` recipes, "Save My Version" for system recipes
- [x] Forking a system recipe creates a new user-owned copy

**`frontend/__tests__/components/cookbook/CollectionBrowsing.test.tsx`**
- [x] Collections view renders as 2-column grid with cover images
- [x] Pinned collections appear before unpinned
- [x] Collection search matches collection names and contained recipe titles
- [x] Section grouping collapses/expands correctly
- [x] Infinite scroll triggers next page load at threshold
- [x] Collection stats bar shows correct aggregated values

**`backend/tests/modules/smartCollections.test.ts`**
- [x] Smart collection "High Protein" returns only recipes with protein ≥ 30g
- [x] Smart collection "Quick & Easy" returns only recipes with cookTime ≤ 15 and difficulty "easy"
- [x] Smart collection "Recently Cooked" returns only recipes with lastCooked within 30 days
- [x] Smart collection "Uncooked" returns only recipes with cookCount 0 and savedDate > 7 days
- [x] Smart collection counts update after saving a new matching recipe
- [x] Suggested collections endpoint returns relevant matches for a given recipe

**`backend/tests/modules/recipeCreation.test.ts`**
- [x] `POST /api/recipes/generate-from-description` returns valid recipe from "oat protein pancakes with chia seeds"
- [x] `POST /api/recipes/:id/fork` creates user-owned copy with `isUserCreated: true`
- [x] Forked recipe preserves original ingredients, instructions, and macros
- [x] Forked recipe has a new ID distinct from original

**`frontend/__tests__/components/meal-plan/MealRequestModal.test.tsx`**
- [x] Modal opens from empty meal slot "Find Me a Meal" button
- [x] Cuisine family chip expands to show specific subcuisines ✅ implemented in MealRequestModal
- [x] Multi-select cuisines works (Latin American + Mediterranean) ✅ implemented in MealRequestModal
- [x] Smart preset "High Protein" sets protein ≥ 35g and leaves other fields as "any"
- [x] Calorie range slider constrains min ≤ max
- [x] Pre-populates remaining calories when opened from a day with existing meals
- [x] Request history shows last 5 searches and re-runs on tap

**`frontend/__tests__/components/meal-plan/MealRequestResults.test.tsx`**
- [x] Results render with correct macro constraint badges (green for met, gray for "any")
- [x] "Add to Plan" adds recipe to the correct meal slot
- [x] "Save to Cookbook" saves without adding to plan ✅ implemented in MealRequestResults
- [x] "Generate more" re-runs with same constraints
- ~~Single-option request auto-adds to slot~~ removed — auto-adding without confirmation is bad UX

**`backend/tests/modules/mealPlanFindRecipes.test.ts`**
- [x] `POST /api/meal-plan/find-recipes` with `{ calories: { max: 400 }, protein: { min: 30 } }` returns only matching recipes
- [x] `cuisineFamilies: ["Latin American"]` expands to all Latin American subcuisines
- [x] Request for 3 options with only 1 DB match returns 1 DB result + 2 AI-generated
- [x] Fat max constraint `{ fat: { max: 8 } }` excludes recipes with fat > 8g
- [x] Fiber min constraint `{ fiber: { min: 5 } }` excludes recipes with fiber < 5g
- [x] Empty cuisine filter returns recipes from any cuisine
- [x] Dietary restrictions from user profile are applied automatically
- [x] Response includes `matchBreakdown` with boolean for each constraint
- [x] `matchScore` is higher for recipes matching all constraints vs partial matches

**`backend/tests/modules/cravingSearch.test.ts`**
- [x] "something cheesy" returns recipes containing cheese ingredients
- [x] "spicy noodles" returns noodle recipes from spicy cuisines
- [x] Craving search respects user's dietary restrictions (vegan → no dairy for "cheesy")
- [x] Empty craving text returns 400 error

**`backend/tests/modules/ingredientSwaps.test.ts`**
- [x] "chicken breast" returns ≥3 alternatives with macro deltas
- [x] Swaps include both healthier and more flavorful options
- [x] Vegan user doesn't see meat-based swaps
- [x] Swap for "white rice" includes cauliflower rice with correct calorie reduction

**`backend/tests/modules/flavorBoost.test.ts`**
- [x] Flavor boost for a bland chicken recipe returns ≥3 suggestions
- [x] Each suggestion adds ≤50 calories
- [x] Suggestions include specific quantities ("1 tbsp gochujang")

**`backend/tests/modules/pantryMatch.test.ts`**
- [x] User with [chicken, rice, soy sauce, garlic] matches stir-fry recipes at ≥70%
- [x] "Just need 1-2 items" filter returns only recipes missing ≤2 ingredients
- [x] Leftover transformer with [rice, chicken] returns ≥3 different recipe ideas

**`backend/tests/modules/weeklyBudget.test.ts`**
- [x] Monday 300 cal under → Tuesday target increases by ~150 cal
- [x] Weekly budget bar shows correct remaining across days
- [x] "Go for it" option adjusts remaining meals to compensate for craving's macros ✅ cravingBudgetService
- [x] "Healthier version" of pizza returns recipe with ≤50% of original calories ✅ cravingBudgetService
- [x] "Healthier version" includes side-by-side macro comparison (original vs healthified) ✅ cravingBudgetService
- [x] "Similar but lighter" returns ≥3 recipes within daily remaining calorie budget ✅ cravingBudgetService
- [x] Healthified craving recipe can be saved to cookbook via standard save endpoint ✅ uses existing POST /api/recipes/save

**`backend/tests/modules/varietyScoring.test.ts`** _(actual file: `varietyScore.test.ts`)_
- [x] Meal plan with same protein 5 days scores variety < 40
- [x] Meal plan with 5 different proteins and 4 cuisines scores variety > 70
- [x] "Boring week" regeneration only replaces repetitive meals

**`frontend/__tests__/components/ServingScaler.test.tsx`** _(actual file: `__tests__/hooks/useServingScaler.test.ts`)_
- [x] 2× pill doubles all macros and ingredient quantities
- [x] "Hit my macros" with 450 cal target on a 350 cal/serving recipe returns ~1.3 servings
- [x] Custom serving input accepts decimal values (1.5 servings)

**`backend/tests/modules/brandedFood.test.ts`**
- [x] Search for "Chipotle burrito bowl" returns results with calories/protein/carbs/fat
- [x] Search checks local FoodItem cache before calling external APIs
- [x] First external lookup caches result to FoodItem table
- [x] Duplicate external lookup uses cached FoodItem (no second API call)
- [x] Recent foods endpoint returns user's last 10 logged items in chronological order
- [x] Frequent foods endpoint returns top 10 by usage count
- [x] Logging a branded food creates Meal with correct macros and foodItemId
- [x] Serving size multiplier (2×) doubles all macro values
- [x] User-submitted food item saved with source "user" and appears in future searches
- [x] Search with empty query returns 400 error

**`backend/tests/modules/snapToLog.test.ts`**
- [x] Enhanced food recognition returns protein, carbs, fat, fiber (not just calories)
- [x] "Log This Meal" creates Meal with customName, full macros, and source "photo_scan"
- [x] Photo-scanned food items cached to FoodItem with source "photo_scan"
- [x] Cached photo-scan items appear in branded food search results ✅ verified — searchFood queries FoodItem by name without source filter
- [x] Multi-food recognition returns individual macro breakdowns per item
- [x] Removing a food item from multi-food result excludes it from total macro sum

**`frontend/__tests__/app/scanner-snapToLog.test.tsx`** _(actual: tests live in scanner-snapToLog.test.tsx since snap-to-log is built into scanner.tsx)_
- [x] Scan results display full macros (calories, protein, carbs, fat) per food item ✅
- [x] Portion stepper at 2× doubles all displayed macros ✅
- [x] Removing a detected food item updates total meal macros ✅
- [x] "Add an item" opens branded food text search ✅
- [x] Meal slot picker defaults to today's next empty slot ✅
- [x] Confirm logs meal and navigates back to meal plan ✅
- [x] Camera shortcut on meal plan "+" opens camera directly ✅

**`frontend/__tests__/components/LogFoodSheet.test.tsx`** _(actual: `__tests__/components/meal-plan/LogFoodSheet.test.tsx`)_
- [x] Search input triggers search after 300ms debounce
- [x] Recent foods section renders on initial open
- [x] Tapping a search result shows serving size confirmation
- [x] Logging a food calls POST /api/food/log with correct payload
- [x] One-tap re-log from recents skips search step

**`backend/tests/modules/relatedRecipes.test.ts`** _(actual: `src/modules/recipe/__tests__/relatedRecipes.test.ts`)_
- [x] Related recipes for a Thai recipe include other Thai + adjacent cuisine (Lao, Burmese) recipes
- [x] Current recipe is excluded from related results
- [x] Returns empty array gracefully when no related recipes found
- [x] Results limited to 6 recipes max

##### 10P Implementation — COMPLETE ✅

**MealRequestModal — Cuisine UI** ✅
- [x] Cuisine family chips in MealRequestModal (Latin American, Asian, European, etc.)
- [x] Tapping a family chip expands inline to show specific subcuisines
- [x] Multi-select: user can pick multiple families/subcuisines; payload sent as `cuisineFamilies[]`

**MealRequestResults — Save to Cookbook** ✅
- [x] "Save to Cookbook" button on each result card (beside "Add to Plan")
- [x] Calls `recipeApi.saveRecipe()` without adding to meal slot

~~Single-option auto-add~~ — removed; auto-adding without user confirmation is bad UX.

**Craving + Weekly Budget Integration** ✅
- [x] `cravingBudgetService.ts` — takes a craving + remaining daily budget, returns 3 paths
- [x] "Go for it" path: recalculates remaining macros after absorbing the craving
- [x] "Healthier version" path: AI generates recipe with ≤50% original calories + side-by-side comparison
- [x] "Similar but lighter" path: queries DB for recipes matching craving keywords within budget
- [x] Healthified recipe saves to cookbook via standard `POST /api/recipes/save`
- [x] API endpoint: `POST /api/recipes/craving-budget`

**SnapToLogSheet** ✅ _(built into scanner.tsx — not a separate component)_
- [x] Camera result → macro review → log flow in scanner.tsx
- [x] All 7 test cases passing in `scanner-snapToLog.test.tsx`

**Cross-service integration** ✅
- [x] Photo-scanned FoodItems appear in branded food text search (verified + tested)

---

#### **10Q: Shopping List Intelligence — Recipe-Driven Lists & Usability** 🛒 *(Shopping List)*

> **Why.** Users already save recipes in the cookbook, but rebuilding a shopping list ingredient-by-ingredient is the biggest drop-off in the cooking funnel. The `generateFromRecipes` / `generateFromMealPlan` endpoints already exist — this group wires them to a first-class UX and adds merge/pantry/budget smarts on top. Goal: zero-typing path from "I want to cook these 3 recipes" to "here's an aisle-sorted, pantry-subtracted, cost-estimated list."

**Scope — Recipe → List core flow**
- [x] **"Build from Recipes" entry point** — new FAB action on shopping list screen + empty-state CTA. Opens `BuildFromRecipesSheet` bottom sheet.
  - **Test:** `frontend/__tests__/components/shopping/BuildFromRecipesSheet.test.tsx` — FAB opens sheet; empty state shows "Build from Recipes" chip; sheet dismisses on backdrop tap.
- [x] **Cookbook picker with multi-select** — paginated grid inside sheet, thumbnail + title + cook time, recently cooked row at top (last 5), search bar.
  - **Test:** same file — multi-select toggles, recent row renders last 5 cooked recipes, search filters by title/cuisine.
- [x] **Per-recipe servings stepper** — each selected recipe shows a `1×/2×/custom` stepper that scales ingredient quantities before generation.
  - **Test:** `frontend/__tests__/hooks/useRecipeScaling.test.ts` — 2× doubles all numeric ingredient quantities; fractional (1.5×) handles mixed numbers; non-numeric ("to taste") passes through unchanged.
- [x] **Smart ingredient merge with unit normalization** — extend the existing `aggregateQuantities()` in `backend/src/utils/ingredientQuantityParser.ts` to merge duplicate ingredient names across recipes. Build a new `normalizeUnit(amount: number, unit: string): { amount, canonicalUnit }` helper (same file or a sibling `unitConversion.ts`) with the conversion table: `{ tsp→ml ×4.93, tbsp→ml ×14.79, cup→ml ×236.59, oz→g ×28.35, lb→g ×453.59 }`. Convert dissimilar units to a canonical unit per dimension (volume → ml, mass → g, count stays as-is) before summing, then convert back to the most-common-unit-among-inputs for display. Round display: ml/g to nearest 5; tbsp/tsp to nearest 0.25; cup to nearest 0.125; whole-count items (eggs, lemons) to integer.
  - **Test:** `backend/tests/modules/shoppingListMerge.test.ts` — `2 tbsp + 1/4 cup olive oil → 6 tbsp olive oil`; `200g + 1 lb chicken → 654g chicken` (canonical g); preserves distinct ingredients (`butter` ≠ `peanut butter`); rounding follows the rules above; mixed-dimension inputs (e.g. `1 cup` + `100g`) keep both lines instead of merging.
- [x] **Pantry subtraction toggle** — "I already have these" toggle in the sheet. Server reads `prisma.pantryItem.findMany({ where: { userId } })` for the requesting user, builds a `Set<string>` of normalized pantry names, and filters out matching ingredients before creating the list. **Normalization rule:** lowercase, trim, strip the modifier tokens `["fresh", "dried", "ground", "whole", "extra-virgin", "extra virgin", "raw", "cooked", "organic", "unsalted", "salted", "low-sodium"]`, collapse whitespace. So `"Extra-Virgin Olive Oil"` and `"olive oil"` both normalize to `"olive oil"` and match.
  - **Test:** `backend/tests/modules/shoppingListPantrySubtraction.test.ts` — items in pantry omitted from generated list; toggle off returns full list; `"extra-virgin olive oil"` in pantry matches `"olive oil"` in recipe (and vice versa) per the normalization rule above; `"butter"` in pantry does NOT match `"peanut butter"` in recipe (substring match must be on full normalized name, not partial).
- [x] **Budget preview before confirmation** — sheet shows estimated total. Backend builds the price map by querying `prisma.purchaseHistory.findMany({ where: { userId, createdAt: { gte: ninetyDaysAgo } } })` and computing the median `priceCents` per normalized ingredient name (median over mean to dampen outliers). Items without price history fall back to the AISLE-level median across the same 90-day window; aisles with zero purchase history fall back to a static `DEFAULT_AISLE_PRICE_CENTS` map (Produce: 250, Meat: 800, Dairy: 400, Pantry: 350, Frozen: 500, Other: 300). Estimated lines render with a `~` prefix in the UI; user-history-backed lines render without.
  - **Test:** `frontend/__tests__/components/shopping/BuildFromRecipesSheet.test.tsx` — preview reflects checked items only; updates live as servings change; `~` prefix appears only on items without user purchase history within 90 days; total updates within one frame of a stepper change.
- [x] **Duplicate-list protection** — before creating, query existing user shopping lists with `createdAt >= now() - 7d` and compute Jaccard similarity over their `sourceRecipeIds` arrays vs. the incoming `recipeIds`. If `|A ∩ B| / |A ∪ B| >= 0.8`, return `{ duplicateOf: <listId>, similarity: <number> }` from the generate endpoint instead of creating; UI flips primary CTA to "Merge into existing list" and shows the existing list's name. Exact-match (`similarity === 1`) shows "Open existing list" instead.
  - **Test:** `backend/tests/modules/shoppingListDuplicateDetection.test.ts` — identical `recipeIds` set within 7d returns `similarity: 1, duplicateOf: <id>`; 4-of-5 overlap returns `similarity: 0.8` flagged; 3-of-5 overlap (`0.6`) returns no duplicate; same-recipes list created 8 days ago returns no duplicate; merge into existing preserves purchased state of existing items.

**Scope — cross-surface shortcuts**
- [x] **"Add to shopping list" long-press action** on recipe cards in cookbook, home, and recipe detail → skips the sheet, generates directly with default servings.
  - **Test:** `frontend/__tests__/components/recipe/RecipeCardLongPress.test.tsx` — long-press surfaces action sheet; tapping "Add to shopping list" calls `generateFromRecipes` with correct recipeId; toast confirms success.
- [x] **"Shop for this week" chip on empty state** — single-tap path calling `generateFromMealPlan` for the current week.
  - **Test:** `frontend/__tests__/app/shopping-list.emptystate.test.tsx` — chip renders when no current list; tap calls `generateFromMealPlan` with current week range; navigates into generated list.
- [x] **Voice-add with recipe resolution** — "Add everything for Thai basil chicken" matches a cookbook recipe via fuzzy title search before falling back to literal add. Use `fuse.js` (already in package.json — verify with `grep fuse backend/package.json`; install if absent) with `{ keys: ['title'], threshold: 0.3, includeScore: true }` over the user's saved recipes. Map `fuse` score → confidence as `1 - score`; if confidence `>= 0.7`, invoke `generateFromRecipes({ recipeIds: [match.id] })`; otherwise fall back to literal `addItem({ name: utterance })`.
  - **Test:** `backend/tests/modules/voiceRecipeResolver.test.ts` — exact title match resolves with confidence ≥ 0.95; one-typo match (`"thai bazil chicken"` → `"Thai Basil Chicken"`) resolves ≥ 0.7; "buy chicken" falls below 0.7 and routes to literal add; empty cookbook returns literal add path; confidence is always in `[0, 1]`.

**Scope — general usability polish**
- [x] **Recipe source pills on list items** — each item generated from a recipe carries a `sourceRecipeIds: string[]` field. Render a small emoji pill (📖 with the count when ≥2) inline-right of the item name. Tap opens a `RecipeAttributionSheet` (new `frontend/components/shopping/RecipeAttributionSheet.tsx`) with each contributing recipe as a tappable row → navigates to recipe detail. Hide the pill entirely when `sourceRecipeIds` is empty or absent (manually added items).
  - **Test:** `frontend/__tests__/components/shopping/ShoppingListItem.sourcePills.test.tsx` ✅ + `frontend/__tests__/components/shopping/RecipeAttributionSheet.test.tsx` ✅ — renders pill with count `📖 ×2` when `sourceRecipeIds.length === 2`; renders `📖` (no count) for `length === 1`; tap opens sheet; sheet rows navigate to recipe detail; pill hidden when array is empty/absent.
- [x] **"Missing for \<recipe\>" banner** — when the user deletes an item from a recipe-sourced list, a peach-tinted banner appears on the source recipe's card (cookbook + recipe detail) listing the missing ingredient. Backend tracks via a new `MissingIngredient` table: `{ id, userId, recipeId, ingredientName, deletedAt, dismissed: boolean }`. Banner auto-clears on (a) ingredient re-added to any active list, (b) recipe cooked from cooking mode, or (c) explicit dismiss. Banner shows max 3 missing items inline, then "+N more"; tap opens a sheet listing all.
  - **Test:** `frontend/__tests__/components/recipe/MissingIngredientBanner.test.tsx` ✅ — banner renders when ≥1 `MissingIngredient` row exists for the recipe + user; renders the first 3 names + "+N more"; tap opens full-list sheet; dismiss calls onDismiss; banner hidden when no ingredients.
- [x] **Aisle-optimized reorder on generation** — generated items auto-sort into `AISLE_ORDER` (already exported from `frontend/hooks/useShoppingList.ts` along with `categorizeItem`, `DEFAULT_AISLE_ORDER`, `AISLE_EMOJI`). Apply `categorizeItem(item.name)` server-side during generation so the response already carries `category`; client sorts by `AISLE_ORDER[category] ?? DEFAULT_AISLE_ORDER` before first render. Items whose category resolves to `null` go to `"Other"`.
  - **Test:** `frontend/__tests__/hooks/useShoppingList.generation.test.ts` ✅ + `backend/tests/utils/aisleCategorizer.test.ts` ✅ — new generated list renders items grouped and ordered by `AISLE_ORDER`; uncategorized items appear in the `"Other"` section last; sort is stable for items in the same aisle (alphabetical by name).
- [x] **Imperial ↔ metric toggle** on the list view header; conversion is non-destructive (display-only — never mutates `prisma.shoppingListItem`). Convert via the same `normalizeUnit` table from the merge task: tsp/tbsp/cup/oz/lb ↔ ml/g. Persist user preference to `AsyncStorage` key `shoppingList.unitSystem` ('imperial' | 'metric'). Items in non-convertible units (e.g. "1 bunch", "2 cans") render unchanged.
  - **Test:** `frontend/__tests__/components/shopping/UnitToggle.test.tsx` ✅ + `frontend/__tests__/utils/unitConversion.test.ts` ✅ — toggle flips `2 cups → 473ml` and back; persists choice across remount via mocked `AsyncStorage`; non-convertible units render unchanged in both modes; underlying API payload unchanged after toggle.
- [x] **Share list deep link** — `POST /api/shopping-lists/:id/share` returns `{ shareUrl, token, expiresAt }` where `token` is a 32-char URL-safe random ID stored in a new `ShoppingListShare` table: `{ id, listId, token, createdBy, expiresAt (default now + 7d), usedBy: string[], maxUses: number = 10 }`. The shareable URL is `https://sazonchef.app/import/shopping-list/:token` (universal link). `GET /api/shopping-lists/import/:token` validates the token (not expired, `usedBy.length < maxUses`), copies the source list's items into a new active list owned by the target user, appends `targetUserId` to `usedBy`, and returns the new list. Tokens cannot be re-used by the same user (idempotent — returns the existing copy).
  - **Test:** `backend/tests/modules/shoppingListShare.test.ts` ✅ — share endpoint returns valid token + 7-day `expiresAt`; import creates new list for target user with all items copied (un-purchased); expired token returns 410 Gone; 11th unique user import returns 403 (max uses); same user re-importing returns the same previously-imported list ID (idempotent); token unusable after `expiresAt`.

#### **10Q Tests (consolidated)**

- [x] `frontend/__tests__/components/shopping/BuildFromRecipesSheet.test.tsx` — entry point, picker, servings stepper UX, budget preview
- [x] `frontend/__tests__/hooks/useRecipeScaling.test.ts` — scaling math
- [x] `backend/tests/modules/shoppingListMerge.test.ts` — ingredient dedupe + unit normalization
- [x] `backend/tests/modules/shoppingListPantrySubtraction.test.ts` — pantry exclusion
- [x] `backend/tests/modules/shoppingListDuplicateDetection.test.ts` — 7-day duplicate guard
- [x] `frontend/__tests__/components/recipe/RecipeCardLongPress.test.tsx` — long-press shortcut
- [x] `frontend/__tests__/app/shopping-list.emptystate.test.tsx` — "Shop for this week" chip
- [x] `backend/tests/modules/voiceRecipeResolver.test.ts` — fuzzy voice recipe match
- [x] `frontend/__tests__/components/shopping/ShoppingListItem.sourcePills.test.tsx` + `RecipeAttributionSheet.test.tsx` — recipe source pills ✅
- [x] `frontend/__tests__/components/recipe/MissingIngredientBanner.test.tsx` — missing-ingredient feedback loop ✅
- [x] `frontend/__tests__/hooks/useShoppingList.generation.test.ts` + `backend/tests/utils/aisleCategorizer.test.ts` — aisle-optimized ordering ✅
- [x] `frontend/__tests__/components/shopping/UnitToggle.test.tsx` + `frontend/__tests__/utils/unitConversion.test.ts` — imperial/metric toggle ✅
- [x] `backend/tests/modules/shoppingListShare.test.ts` — share/import deep link ✅

> **Dependencies:** reuses existing `generateFromRecipes` and `generateFromMealPlan` endpoints; pantry subtraction depends on Group 10H pantry match. Share deep link should land after Group 13 deep-linking setup.

**Scope — List Management (first-principles cleanup)**

> **Framing.** A shopping list exists for one window: between "I decided to cook X" and "I'm done at the store." Outside that window it should disappear on its own. Today, lists pile up because (1) finished lists look identical to active ones, (2) the UI treats lists as a plural collection to curate, (3) user-typed names create duplicates, (4) dedupe is manual, (5) archival requires a tap. Fix all five by making *the active list* a singleton and everything else an auto-managed archive.

- [x] **Singleton active list model** — exactly one list is "active" at any time; all others are archived. Switching active list auto-archives the previous one (with 5s undo toast). Shopping list screen opens directly to the active list, never a picker.
  - **Test:** `backend/tests/modules/shoppingListActiveState.test.ts` — only one list has `isActive: true` at a time; setting a new active list flips the previous; restoring from undo reverses the swap; default active list auto-created on user signup. ✅
  - **Test:** `frontend/__tests__/app/shopping-list.activeList.test.tsx` — screen opens to active list on mount; no list picker shown by default; picker accessed via explicit header button. ✅
- [x] **Auto-archive on completion** — when all items in the active list are purchased, a "Done!" celebration fires, purchase history is captured, and the list auto-archives after a 10s grace window. A fresh empty list becomes active.
  - **Test:** `frontend/__tests__/hooks/useShoppingList.autoArchive.test.ts` — all-items-checked triggers celebration + archive after 10s; grace window cancellable by unchecking any item; new empty list created as replacement active; purchase history records all purchased items. ✅
- [x] **"I'm done shopping" explicit button** — header action during in-store mode forces terminal state regardless of checked count. Unchecked items roll over into a new active list labeled "Unfinished from \<date\>". 
  - **Test:** `frontend/__tests__/components/shopping/InStoreDoneButton.test.tsx` — button visible only in in-store mode; tap archives current list; unchecked items become new active list with correct name; confirms via sheet before destructive move. ✅
- [x] **Stale auto-archive** — any non-active list untouched for 14 days auto-archives on next app open; a batched toast shows "Archived N old lists — tap to view".
  - **Test:** `backend/tests/modules/shoppingListStaleArchive.test.ts` — lists with `updatedAt` older than 14d auto-archive; active list never auto-archived regardless of age; toast payload lists archived IDs; archival is idempotent on repeated opens. ✅
- [x] **Auto-naming from contents** — no name prompt on creation. New helper `deriveListName(input: { sourceRecipeIds?, weekRange?, items? })` in `backend/src/utils/shoppingListAutoName.ts` (NEW):
  - **Recipe-sourced** (`sourceRecipeIds.length > 0`): fetch the first recipe's `title`. If `length === 1`, return that title (capped at 30 chars with `…`). If `length >= 2`, return `"${firstTitle} + ${length - 1} more"`.
  - **Meal-plan-sourced** (`weekRange` present): return `"This week"` if range matches Monday-Sunday of the current week (user's local TZ); otherwise `"Week of ${MMM d}"` using the start date.
  - **Manual** (only `items` present): apply `categorizeItem(name)` from `aisleCategorizer.ts` (already exists from prior 10Q work) per item; pick the top 2 aisles by count. Return `"${aisle1} + ${aisle2} run"`. Single aisle → `"${aisle} run"`. Empty → `"Shopping List"`.
  - Persist `autoNamedFrom: Json?` column: `{ source: "recipe" | "meal_plan" | "manual", payload }`. User rename via `PATCH /api/shopping-lists/:id { name }` clears `autoNamedFrom` (signals override). Periodic re-derive skips records where `autoNamedFrom IS NULL AND name != null`.
  - **Test:** `backend/tests/utils/shoppingListAutoName.test.ts` — single recipe → recipe title (≤30 chars); 3 recipes → `"X + 2 more"`; current-week meal-plan range → `"This week"`; past-week range → `"Week of MMM d"`; 5 produce + 3 dairy items → `"Produce + Dairy run"`; single-aisle → `"Produce run"`; empty → `"Shopping List"`; rename clears `autoNamedFrom`; re-derive skips renamed. ✅
- [x] **Duplicate detection at creation** — if a new list overlaps ≥70% by `normalizeIngredientName(item.name)` (already exists from prior 10Q work in `backend/src/utils/ingredientNormalizer.ts`) with an existing active OR recently-archived (≤7d) list owned by the same user, the default CTA flips to "Merge into existing"; "Create new anyway" becomes secondary. Overlap rule: `|A ∩ B| / max(|A|, |B|) >= 0.70`. Endpoint signature: `POST /api/shopping-lists` returns `{ duplicateOf?: listId, overlap?: number, suggestedAction: "merge" | "create" }` instead of immediately creating when overlap detected.
  - **Test:** `backend/tests/modules/shoppingListDuplicateCreation.test.ts` — 7-of-10 normalized name overlap → `overlap: 0.7, suggestedAction: "merge"`; 6-of-10 → `suggestedAction: "create"` and creation proceeds; comparison ignores modifier tokens (`"butter"` matches `"unsalted butter"`); merge preserves `purchasedAt` state on existing items; "create anyway" param `{ allowDuplicate: true }` bypasses; only checks active + ≤7d-archived lists (not older). ✅
- [x] **Compact archive view** — a single "Archive" pill at the bottom of the (rarely-used) list picker opens a searchable, one-line-per-list history: name, date, item count, total spent. No nested screens.
  - **Test:** `frontend/__tests__/components/shopping/ArchiveView.test.tsx` — renders one row per archived list with summary stats; search filters by name/date; empty state shows Sazon `sleepy` mascot; lists older than 90 days collapse into "Older" bucket. ✅
- [x] **Restore via long-press** — long-press any archived list row → becomes active, prior active list auto-archives.
  - **Test:** same file — long-press restores list to active; prior active goes to archive; undo toast appears; haptic feedback fires. ✅
- [x] **Silent cleanup of orphans** — on app open, delete any list with 0 items and `updatedAt` >7d. Runs once per session, no user notification.
  - **Test:** `backend/tests/modules/shoppingListOrphanCleanup.test.ts` — empty lists older than 7d deleted; empty lists younger than 7d preserved; non-empty stale lists preserved; active list never deleted. ✅
- [x] **"Start fresh" single action** — header menu option that clears all items from the active list in one tap with a 5s undo banner. Replaces manual item-by-item deletion.
  - **Test:** `frontend/__tests__/components/shopping/StartFreshAction.test.tsx` — clears all items on tap; undo banner restores items within 5s window; after window items are permanently removed; confirms via sheet only if list has >10 items. ✅
- [x] **Merge suggestion banner** — when active list shares ≥70% items with a list archived in the last 48h, show a dismissible banner: "This looks similar to '\<name\>' — merge?" Never re-nags after dismiss.
  - **Test:** `frontend/__tests__/components/shopping/MergeSuggestionBanner.test.tsx` — banner renders on 70%+ overlap with recent archive; tap merges items; dismiss hides permanently for that list pair; does not render for <70% overlap. ✅
- [x] **Archive tiering & lightweight storage** — `tier: "active" | "archived" | "older"` enum on `ShoppingList`. Nightly cron (or on-app-open scan if no scheduler) flips lists from `archived` → `older` when `archivedAt < now - 90d`. On the same flip, run a service `tierArchivedList(listId)` that:
  1. Computes summary stats and writes them to a new column `summaryStats: Json` on the list: `{ itemCount: number, totalSpentCents: number, dominantAisle: string, archivedAt: ISO8601 }`. `totalSpentCents` is the sum of `purchasedPriceCents` across all items in the list (not the budget estimate).
  2. Hard-deletes all `ShoppingListItem` rows belonging to the list (via `prisma.shoppingListItem.deleteMany({ where: { shoppingListId: listId } })`). The list row itself remains.
  3. Sets `tier: "older"`.
  - `prisma.purchaseHistory` is NEVER touched — it's the source of truth for individual purchase records.
  - The `older` tier is terminal — no API path un-tiers a list back to `archived`. Compact archive view (above) reads `summaryStats` for `older` lists, full item lists for `archived`.
  - **Test:** `backend/tests/modules/shoppingListArchiveTiering.test.ts` — list with `archivedAt = now - 91d` flips to `older`; items deleted from `shoppingListItem`; `summaryStats` populated with correct itemCount + totalSpentCents + dominantAisle; `purchaseHistory` row count unchanged before/after; tiering is idempotent (re-running on an `older` list is a no-op); no API path returns an `older` list to `archived`; lists with `archivedAt > now - 90d` left alone. ✅

#### **10Q-ListMgmt Tests (consolidated)**

- [x] `backend/tests/modules/shoppingListActiveState.test.ts` — singleton active list invariant ✅
- [x] `frontend/__tests__/app/shopping-list.activeList.test.tsx` — screen opens to active list ✅
- [x] `frontend/__tests__/hooks/useShoppingList.autoArchive.test.ts` — auto-archive on completion ✅
- [x] `frontend/__tests__/components/shopping/InStoreDoneButton.test.tsx` — explicit terminal state ✅
- [x] `backend/tests/modules/shoppingListStaleArchive.test.ts` — 14-day stale auto-archive ✅
- [x] `backend/tests/utils/shoppingListAutoName.test.ts` — content-derived naming ✅
- [x] `backend/tests/modules/shoppingListDuplicateCreation.test.ts` — 70% dedupe at creation ✅
- [x] `frontend/__tests__/components/shopping/ArchiveView.test.tsx` — compact archive + search ✅
- [x] `backend/tests/modules/shoppingListOrphanCleanup.test.ts` — silent orphan GC ✅
- [x] `frontend/__tests__/components/shopping/StartFreshAction.test.tsx` — one-tap clear with undo ✅
- [x] `frontend/__tests__/components/shopping/MergeSuggestionBanner.test.tsx` — in-list merge nudge ✅
- [x] `backend/tests/modules/shoppingListArchiveTiering.test.ts` — 90-day collapse to summary ✅

> **Data model note.** Adds `isActive: Boolean`, `archivedAt: DateTime?`, `autoNamedFrom: Json?`, and `tier: "active" | "archived" | "older"` to the `ShoppingList` Prisma model. Singleton invariant enforced by a partial unique index on `(userId) WHERE isActive = true`. Confirm schema diff before running `npx prisma db push`.

---

#### **10R: Food Intel — Contextual Tips & "Did You Know?" Snippets** 💡 *(Throughout App)* ✅ SHIPPED

> **Philosophy:** Users don't read nutrition textbooks — but they'll absorb a 15-word tip that appears *right when it's relevant*. "Pair turmeric with black pepper — increases curcumin absorption by 2,000%" hits different when you're looking at a turmeric recipe. Food Intel turns every screen into a quiet learning surface. No dedicated section to visit, no homework — just smart context that makes users feel like insiders.

**Tip Content Database**

- [x] **`foodIntelTips.ts` — curated tip library** — A flat array of `FoodIntelTip` objects, each with: `id`, `category` (superfood | nutrient | technique | myth_bust | pairing), `trigger` (ingredient name, nutrient keyword, or context tag), `title` (short hook, ≤8 words), `body` (the tip, ≤30 words), `source?` (optional citation), `tags` (ingredient/nutrient keywords for matching), **`personalizationKeys` (cuisine[], nutrient[], skillTier[], goalPhase[]) — the user-state dimensions this tip should weight against**. ✅ 80 tips across all 5 categories shipped at `frontend/lib/foodIntelTips.ts`.
  > **N=1 sharpening:** A static 80-tip array is the canonical "fixed editorial" antipattern. Every tip must declare which user signals (cuisine affinity, tracked-macro deficit, repeat ingredient, skill tier, goal phase) make it relevant — and the matcher (next bullet) ranks by that, not by random rotation. No two users should see the same tip cycle.
  * **Superfood usage** (~20 tips): Turmeric + black pepper synergy, ginger anti-inflammatory properties, apple cider vinegar blood sugar benefits, fermented foods and gut health, dark leafy greens iron content, chia seed omega-3s, cinnamon blood sugar regulation, garlic allicin activation (crush and wait 10 min), matcha vs coffee antioxidants, hemp seeds complete protein
  * **Mineral & vitamin intel** (~20 tips): Magnesium-rich foods (pumpkin seeds, dark chocolate, spinach), iron absorption boosters (vitamin C pairing) and blockers (calcium, tannins), zinc from shellfish/legumes, potassium beyond bananas (sweet potato, white beans), B12 for plant-based eaters, vitamin D + K2 synergy, selenium from Brazil nuts (2/day = 100% DV), omega-3 sources beyond salmon (sardines, walnuts, flax)
  * **Macro goal tips** (~20 tips): Protein timing doesn't matter as much as daily total, fiber keeps you full longer than fat, leucine threshold for muscle synthesis (~2.5g per meal), casein before bed (Greek yogurt, cottage cheese), carb timing around workouts, fat doesn't make you fat — excess calories do, 30g protein per meal benchmark, complete vs incomplete proteins (and why it doesn't matter daily)
  * **Technique tips** (~10 tips): Soaking beans reduces antinutrients, blanching preserves nutrients vs boiling, roasting garlic mellows flavor + keeps benefits, sprouting grains increases bioavailability, marinating with acid (lime/vinegar) + how long is too long, cold-brew vs hot tea antioxidant differences
  * **Myth busters** (~10 tips): "Egg yolks are bad" is outdated — they're nutrient-dense, celery juice isn't magic — but celery is genuinely good, "detox" foods don't detox — your liver does — but they support liver function, brown rice isn't always better than white (context matters), raw isn't always healthier than cooked (tomatoes release more lycopene when cooked)
  * [x] **Test:** `frontend/__tests__/lib/foodIntelTips.test.ts` — ✅ 11/11 green: ≥80 tips, non-empty titles/bodies, no dupe IDs, ≥8 per category, all triggers lowercase trimmed, all `personalizationKeys` declared.

- [x] **Tip matching engine** — `matchFoodIntelTips(context: TipContext, userState: UserState): FoodIntelTip[]` — ✅ shipped at `frontend/lib/foodIntelMatcher.ts`. Ranks by personalizationKeys × novelty × engagement, dedup via AsyncStorage 7-day window, fallback to top-affinity-cuisine (never random). Engagement signals (`expanded`/`dismissed`/`ignored`) feed back into ranker.
  > **N=1 sharpening:** Tag `seenTipIds` with engagement signal (`expanded` vs `dismissed` vs `ignored`) and feed it back into ranking — dismissed tips drop in score, expanded tips boost their `personalizationKeys` for future matches. This is the write-side of the loop.
  * [x] **Test:** `frontend/__tests__/lib/foodIntelMatcher.test.ts` — ✅ 13/13 green: turmeric/ingredient match, max-2 cap, dismissed dedup, fallback to cuisine-affinity (NOT random), nutrient-gap boost, skillTier hard filter, expanded engagement boost, deterministic ranker, per-user namespacing.

**Surface Points (where tips appear)**

- [x] **Recipe detail — ingredient intel** — When viewing a recipe, scan the ingredient list for tip triggers, **then pick the tip whose ingredient is *new* to this user (never appeared in their cook history) OR addresses their current top tracked nutrient gap**. Show a collapsible `FoodIntelCard` (pastel mint tint, 💡 icon, title + body) below the ingredient list. Max 1 tip per recipe view. Tapping expands the full body; collapsed shows just the title as a teaser line. ✅ `frontend/components/recipe/FoodIntelCard.tsx`; wired into `app/modal.tsx` below `VisualIngredientList`. Records `expanded` engagement on first expand.
  > **N=1 sharpening:** A day-1 user and a year-1 user opening the same recipe must see different tips — pick by ingredient-novelty + nutrient-gap relevance, not by static keyword match.
  * 📍 Frontend: `components/recipe/FoodIntelCard.tsx` — renders in `modal.tsx` below ingredients section, only when a match is found
  * [x] **Test:** `frontend/__tests__/components/recipe/FoodIntelCard.test.tsx` — ✅ 7/7 green: renders when matched, hidden when no match, collapsed by default, expands on tap, shows correct content, a11y label, records engagement on first expand.

- [x] **Cooking mode — step-adjacent tips** — During cooking, if a step mentions a tip trigger ingredient (e.g., "add turmeric and black pepper"), show a brief inline tip below the step text, **weighted by user's skill tier (10I) and ingredient novelty — beginner gets foundational tip, confident cook gets advanced pairing/sourcing intel**. Shares the collapsible pattern from 10I technique tips but with a distinct 💡 icon and mint tint (vs technique tips' blue tint). Max 1 Food Intel tip per cooking session (don't overwhelm mid-cook). ✅ `frontend/components/cooking/FoodIntelCookingTip.tsx`; wired into `app/cooking.tsx` below the `TechniqueTip` map. `sessionId = recipeId::startTime`. Multi-word triggers (e.g., "olive oil") match via substring scan over step text.
  > **N=1 sharpening:** Read `skillTier` + `ingredientFirstSeenAt` for this user; never serve the same tip twice across sessions. Write tap/expand event back to ranking.
  * 📍 Frontend: integrate into `cooking.tsx` step renderer alongside existing `TechniqueTip` — use `matchFoodIntelTips({ ingredients: stepIngredients, screenType: 'cooking' })`
  * [x] **Test:** `frontend/__tests__/components/cooking/FoodIntelCookingTip.test.tsx` — ✅ 6/6 green: renders on trigger match, max 1 per session, distinct 💡 mint vs technique tip orange, hidden when no match, a11y label, records engagement on expand.

- [x] **Home feed — "Did You Know?" card** — A rotating `DidYouKnowCard` in the home feed section list (positioned after the hero, before Quick Meals). Shows one tip per session **drawn from this user's cuisine-adjacency cluster + last 7 days of cooked ingredients + current top nutrient gap — NOT random**. Dismissable (swipe or X) — dismissed tips don't reappear for 30 days **and the dismiss event drops the tip's score in the per-user ranker**. Subtle animation: fade-in on mount. ✅ `frontend/components/home/DidYouKnowCard.tsx`; wired into `EditorialHomeLayout.tsx` between `PantryPlateHeroCard` and `EditorialMacroWidgets`. Reanimated `FadeIn`. Lavender tint, distinct from sister cards.
  > **N=1 sharpening:** "Random unseen tip" is the failure mode. Pull from user's affinity graph + recent cooks; write tap/dismiss as engagement signal that retrains tip ranking. Year-1 user sees tips from cuisines they've explored; day-1 user sees tips tied to their onboarding cuisines + adjacents.
  * 📍 Frontend: `components/home/DidYouKnowCard.tsx` — inserted into home feed section order in `EditorialHomeLayout.tsx`
  * [x] **Test:** `frontend/__tests__/components/home/DidYouKnowCard.test.tsx` — ✅ 10/10 green: renders matched tip, eyebrow, hidden when no match, a11y, dismiss removes + records `dismissed`, dismiss persists across re-render, rotates per fresh mount, tap records `expanded`, fade-in renders, matcher called with `home` screen + user state.

- [x] **Shopping list — purchase intel** — When the user checks off an item that matches a tip trigger (e.g., checking off "spinach"), show a brief toast-style tip at the bottom: "Iron tip: squeeze lemon on your spinach — vitamin C boosts absorption 3×". **Tier the tip by purchase count for that item — 1st purchase: basics, 5th: technique, 10th+: cuisine pairing or origin story.** Uses `Haptics.impactAsync(Light)` on appear. Auto-dismisses after 5s. Max 1 per shopping session. ✅ `frontend/components/shopping/FoodIntelToast.tsx`; wired into `app/(tabs)/shopping-list.tsx` via `handleTogglePurchasedWithIntel` wrapper. Real `purchaseCount` looked up from `state.purchaseHistory[]`.
  > **N=1 sharpening:** Read `purchaseHistory[itemId].count` to escalate depth; same item, deeper tip each time. The 10th time a user buys spinach, they don't need the iron+lemon basic again.
  * 📍 Frontend: `components/shopping/FoodIntelToast.tsx` — triggered from item toggle handler in shopping list
  * [x] **Test:** `frontend/__tests__/components/shopping/FoodIntelToast.test.tsx` — ✅ 12/12 green: appears on check-off, auto-dismiss 5s with `dismissed` engagement, max 1 per session, light haptic on appear, hidden for non-match, 3 tier-by-count cases (basics/technique/pairing), fallback when preferred tier empty, null itemName, a11y, tap-to-dismiss with `expanded`.

- [x] **Meal plan — daily nutrition nudge** — On the daily macro summary, if a specific nutrient is low across the day's meals, surface a contextual tip: "Low on magnesium today? Add a handful of pumpkin seeds (~150 cal, 37% DV magnesium) to any meal." Requires basic nutrient gap detection against the day's logged macros. **The food suggestion in the nudge must be one the user has cooked before OR has in pantry — fall back to suggesting a recipe from their cookbook that's high in the deficient nutrient before suggesting a generic ingredient.** ✅ `frontend/components/meal-plan/NutrientNudge.tsx`; wired into `app/(tabs)/meal-plan.tsx` directly below `DailyMacrosSummary`. Pantry → cookbook → generic suggestion order. `recordNudgeAction` writes to AsyncStorage on tap to close the loop.
  > **N=1 sharpening:** Write which nudges the user *acted on* (tapped suggested food / cooked the suggested recipe) so future nudges prefer foods this user actually eats. Pure read-only nudges don't close the loop.
  * 📍 Frontend: `components/meal-plan/NutrientNudge.tsx` — renders below `DailyMacrosSummary` when a gap is detected
  * 📍 Gap detection: simple threshold checks on fiber (<15g), protein (<80% of target), iron (heuristic from ingredients — not tracked in macros, so ingredient-keyword-based)
  * [x] **Test:** `frontend/__tests__/components/meal-plan/NutrientNudge.test.tsx` — ✅ 9/9 green: fiber nudge <15g, protein nudge <80% target, hidden when all adequate, max 1 per day, actionable text includes food suggestion, pantry-first/cookbook/generic fallback chain, dismiss persists for the day.

#### 10R Tests (consolidated) — ✅ 68/68 green

- [x] `frontend/__tests__/lib/foodIntelTips.test.ts` — tip library integrity (11/11)
- [x] `frontend/__tests__/lib/foodIntelMatcher.test.ts` — matching, dedup, fallback (13/13)
- [x] `frontend/__tests__/components/recipe/FoodIntelCard.test.tsx` — recipe detail surface (7/7)
- [x] `frontend/__tests__/components/cooking/FoodIntelCookingTip.test.tsx` — cooking mode surface (6/6)
- [x] `frontend/__tests__/components/home/DidYouKnowCard.test.tsx` — home feed card (10/10)
- [x] `frontend/__tests__/components/shopping/FoodIntelToast.test.tsx` — shopping list toast (12/12)
- [x] `frontend/__tests__/components/meal-plan/NutrientNudge.test.tsx` — meal plan nudge (9/9)

#### 10R Implementation — COMPLETE ✅

- Foundation: 80 curated tips with N=1 personalizationKeys (cuisine × nutrient × skillTier × goalPhase) at `frontend/lib/foodIntelTips.ts`. Matching engine at `frontend/lib/foodIntelMatcher.ts` ranks by personalization keys × novelty × engagement, with AsyncStorage-backed engagement signals (expanded / dismissed / ignored) feeding back into per-user ranking. Fallback when no contextual match: top-affinity-cuisine tips, never random.
- Shared user-state hook `frontend/hooks/useFoodIntelUserState.ts` assembles `UserState` from `useAuth`, `useSkillTier`, `useCookingJourney` with safe defaults for upstream signals not yet wired (`topAffinityIngredients`, `rolling7dNutrientGaps`, `goalPhase`).
- 5 surface points wired: Recipe modal (FoodIntelCard, mint), Cooking mode (FoodIntelCookingTip alongside TechniqueTip, sage/mint distinct), Home feed (DidYouKnowCard, lavender, fade-in), Shopping list (FoodIntelToast tier-by-purchase-count, sage), Meal plan (NutrientNudge below DailyMacrosSummary, pantry → cookbook → generic suggestion chain).
- All 7 surfaces TDD'd. Zero TS errors introduced. 68/68 tests green.
- Reviewer fixes folded in pre-merge: stable user-state memoization (`exploredCuisines` ref-stable so consumers don't re-effect every render), safe `JSON.parse` with type-guard in matcher, `HapticTouchableOpacity` over raw `Pressable` in toast (banned-pattern compliance), `borderRadius: 20` on cooking tip (was 16), auto-dismiss records `'ignored'` not `'dismissed'` so quiet timeouts don't permanently suppress tips, typed API narrowing in NutrientNudge (`unknown` + guards instead of `any`).

##### 10R-Phase2 — Personalization deepening ✅ SHIPPED

> All five matcher dimensions now wired. Surfaces rank by full N=1 signal stack (cuisine affinity × nutrient gap × ingredient affinity × goal phase × novelty + engagement feedback). The "~40% depth" warning is no longer applicable.

- [x] **Wire `topAffinityIngredients`** — ✅ Backend `affinitySnapshotService.computeAffinitySnapshot()` derives top 30 ingredients by frequency × rating from CookingLog (last 90d) + SavedRecipe.rating ≥ 4 boosted 3×, with disliked recipes filtered. Plumbed through `GET /api/user/affinity/snapshot`.
- [x] **Wire `rolling7dNutrientGaps`** — ✅ Same service computes 7-day rolling totals from CookingLog × Recipe macros, compares to MacroGoals. Marks `protein` / `fiber` gap when daily average < 80% of target. Marks `iron` heuristically when no iron-rich keyword (spinach/kale/beef/lentils/beans/liver/sardines/tofu/chickpeas/oysters) appears in 7d ingredients.
- [x] **Wire `goalPhase`** — ✅ `mapFitnessGoalToPhase(fitnessGoal, activeMealPlanMode)` reads `UserPhysicalProfile.fitnessGoal` and maps `lose_weight → cut`, `maintain → maintain`, `gain_muscle/gain_weight → bulk`. Active `MealPlan.planningMode` overrides the long-term goal.
- [x] **Pass user's recently-cooked ingredients to `DidYouKnowCard`** — ✅ Matcher now called with `ingredients: userState.last7DaysIngredients ?? []`. Primary scoring path (trigger + ingredient + nutrient + novelty) fires whenever cook history exists; cuisine-affinity-only fallback still kicks in for new users.
- [x] **Per-surface engagement → matcher** — Confirmed via inspection: matcher reads `loadSeenTipIds(userId)` on every match, scoreTip applies `+25` for `expanded` / `-200` for `dismissed`. AsyncStorage round-trip is per-call, not in-memory, so backgrounding doesn't lose state. Real-device test deferred until next manual QA pass.
- [x] **Test:** `frontend/__tests__/hooks/useFoodIntelUserState.test.tsx` — ✅ 4/4: defaults preserved before snapshot resolves, populates all four fields when API returns data, defaults preserved on API error, no re-fetch on re-render.
- [x] **Test:** `backend/__tests__/modules/affinity/` — ✅ 24/24: 18 service unit tests + 6 controller integration tests. Covers 90-day cutoff, rating boost, dislike suppression, name normalization, fiber/protein/iron gap detection, fitness goal mapping, meal plan override, 500-row query cap, 500 fallback.

> **Effort logged:** ~2.5h. Ships as a single backend service + endpoint, with a single frontend hook update. Both 10R Food Intel and 10S Kitchen IQ now operate at full N=1 depth.

---

#### **10S: Kitchen IQ — Food Knowledge Hub** 🧠 *(Profile + Home Screen)* ✅ SHIPPED

> **Philosophy:** You've been eating 3× a day your entire life and nobody ever explained *why* certain foods matter. Kitchen IQ is the "things I wish someone told me at 18" feature — not a textbook, not a lecture, but short, visual, opinionated deep dives into nutrients, ingredients, and how food affects your body. The tone is a smart friend at dinner, not a nutritionist's office wall. Content unlocks progressively as users cook more and explore more cuisines — learning earned through doing, not assigned.

**Content Architecture**

- [x] **`KitchenIQCard` model** — Each knowledge card is a self-contained learning unit:
  ```
  {
    id: string
    type: 'nutrient' | 'ingredient' | 'concept' | 'cuisine_health'
    title: string                    // "Your Body on Magnesium"
    subtitle: string                 // "The mineral 68% of people are low on"
    heroEmoji: string                // "🧲" (magnesium), "🔥" (iron), "🧬" (protein)
    sections: [
      { heading: string, body: string, visual?: 'icon_list' | 'comparison' | 'scale' }
    ]
    topFoods: { name: string, amount: string, dvPercent: number }[]   // "Pumpkin seeds — 1oz — 37% DV"
    recipes: string[]               // recipe IDs that feature this nutrient/ingredient heavily
    tags: string[]                  // for search + matching
    unlockCondition?: {             // progressive unlock
      type: 'cook_count' | 'cuisine_count' | 'ingredient_used' | 'none'
      threshold?: number
      value?: string
    }
  }
  ```
  * 📍 Frontend-only data — no backend model needed. Ship as `frontend/lib/kitchenIQ/cards.ts`. Backend endpoint `GET /api/user/kitchen-iq/progress` returns unlock state based on cooking history.

- [x] **Seed 30+ Kitchen IQ cards at launch** — ✅ 32 cards shipped at `frontend/lib/kitchenIQ/cards.ts` (12 nutrient + 10 ingredient + 5 concept + 5 cuisine_health). Every card declares `personalizationKeys: { cuisine[], nutrient[], ingredient[], skillTier[] }` so the browse screen ranks by user state, not alpha. Organized by type:

  **Nutrient deep dives** (~12 cards):
  - "Your Body on Magnesium" — what it does (muscle recovery, sleep, 300+ enzyme reactions), deficiency signs (cramps, poor sleep, anxiety), top foods (pumpkin seeds, dark chocolate, spinach, almonds, black beans), daily target, recipes rich in it
  - "Your Body on Iron" — two types (heme vs non-heme), absorption boosters (vitamin C) and blockers (calcium, coffee/tea with meals), why it matters (energy, oxygen transport, immune), top foods (red meat, lentils, spinach + lemon, dark chocolate), special note for women/plant-based eaters
  - "Your Body on Zinc" — immune function, wound healing, taste/smell, top foods (oysters, beef, pumpkin seeds, chickpeas, cashews), why athletes need more
  - "Your Body on Omega-3s" — EPA vs DHA vs ALA, brain health, inflammation, top foods (salmon, sardines, walnuts, flax, chia, hemp), supplement vs food debate
  - "Your Body on Fiber" — soluble vs insoluble, gut microbiome, satiety, blood sugar, top foods (lentils, chia, avocado, oats, beans), the 30g target most people miss
  - "Your Body on Potassium" — not just bananas (sweet potato, white beans, spinach, avocado all have more), blood pressure, muscle function, sodium balance
  - "Your Body on B12" — energy, nerve function, why plant-based eaters must supplement, top foods (clams, liver, nutritional yeast, fortified foods)
  - "Your Body on Vitamin D" — the sunshine vitamin most people are low on, bone health, immune function, mood, food sources (fatty fish, egg yolks, fortified), why supplementation is often necessary
  - "Your Body on Protein" — how much you actually need (0.7–1g per lb for active people), complete vs incomplete (and why daily totals matter more than per-meal), leucine threshold, timing myths debunked, best sources by protein-per-calorie ratio
  - "Your Body on Creatine" — not just for gym bros — cognitive function, found naturally in red meat and fish, one of the most studied supplements, vegetarians respond more because baseline is lower
  - "Your Body on Collagen" — skin, joints, gut lining, bone broth as source, whether supplements work (the evidence is mixed but promising), vitamin C needed for synthesis
  - "Your Body on Electrolytes" — sodium isn't the enemy (especially for active people), potassium, magnesium — the trio, why you feel terrible on low-carb diets (electrolyte flush), homemade electrolyte drink recipe

  **Ingredient spotlights** (~10 cards):
  - "Turmeric: The Golden Anti-Inflammatory" — curcumin, black pepper synergy, how to use (golden milk, curries, scrambles, smoothies), dosage that matters, cuisine traditions (Indian, Persian, Okinawan, Burmese)
  - "Ginger: Nature's Digestive Aid" — gingerol, anti-nausea, anti-inflammatory, fresh vs dried vs powdered, how to use (stir-fry, tea, marinades, dressings), cuisines that rely on it
  - "Apple Cider Vinegar: What It Actually Does" — blood sugar modulation (real evidence), digestion, what it doesn't do (weight loss miracle — no), how to use (dressings, marinades, 1 tbsp before starchy meals), the "mother" explained
  - "Fermented Foods: Your Gut's Best Friends" — kimchi, sauerkraut, miso, kefir, yogurt, injera, curtido, pikliz — probiotic diversity, gut-brain axis, how different cultures ferment, why diversity of fermented foods > one type daily
  - "Dark Leafy Greens: The Most Underrated Superfood" — spinach, kale, collards, ugu, moringa, chard — iron, calcium, folate, fiber, how to make them taste good (not just smoothies), Nigerian/Southern/Ethiopian traditions
  - "Legumes: The World's Most Perfect Food" — protein + fiber + minerals, every cuisine has them (black beans, lentils, chickpeas, black-eyed peas, fava beans), soaking/sprouting, the gas problem and how to minimize it, Blue Zone staple
  - "Seeds: Tiny Nutrition Powerhouses" — chia (omega-3, fiber), flax (lignans), hemp (complete protein), pumpkin (magnesium, zinc), sesame (calcium), sunflower (vitamin E) — how to incorporate without thinking about it
  - "Garlic: The 10-Minute Rule" — crush and wait 10 minutes before cooking to activate allicin, cardiovascular benefits, immune support, raw vs cooked, how much matters
  - "Cinnamon: Blood Sugar's Best Friend" — Ceylon vs Cassia (why it matters), insulin sensitivity, how to add to coffee/oatmeal/smoothies, dosage, which type to buy
  - "Bone Broth & Collagen-Rich Foods" — amino acids (glycine, proline), gut lining support, joint health, how to make it vs buy it, slow cooker method, which cultures have broth traditions (pho, ramen, consommé, bulalo)

  **Concepts** (~5 cards):
  - "The Protein-Per-Calorie Ratio" — ranking foods by how much protein you get per calorie, why chicken breast wins but isn't the only option, cottage cheese/Greek yogurt/egg whites as unsung heroes, how to evaluate any food
  - "Why Meal Timing Matters Less Than You Think" — intermittent fasting, meal frequency myths, what actually matters (daily totals, protein distribution), when timing DOES matter (pre/post workout, protein before bed)
  - "The Volume Eating Playbook" — eating more food for fewer calories, high-volume low-calorie foods (vegetables, air-popped popcorn, egg whites, watermelon), how to build satisfying plates, why fiber and water content matter more than portion size
  - "Reading Nutrition Labels Like a Pro" — serving size tricks, what "% Daily Value" actually means, the ingredients-list order rule, added sugars vs natural sugars, what to ignore (cholesterol for most people), red flags
  - "The Anti-Inflammatory Diet (Without the BS)" — what chronic inflammation actually is, foods that help (omega-3, turmeric, berries, leafy greens, olive oil), foods that hurt (refined sugar, processed oils, excessive alcohol), why "anti-inflammatory" has become a marketing buzzword but the core science is real

  **Cuisine health stories** (~5 cards):
  - "Why Okinawans Live to 100" — Blue Zone diet, sweet potato staple, tofu, bitter melon, hara hachi bu (eat until 80% full), turmeric in everything, social eating
  - "The Mediterranean Diet: Why It Actually Works" — olive oil, seafood, legumes, red wine (in moderation), why it's the most studied diet with the most consistent results, it's not a diet — it's how people actually eat
  - "Ethiopian Cuisine: The Hidden Health Powerhouse" — teff (iron, calcium, protein, gluten-free), lentil-based stews, injera fermentation, communal eating, naturally plant-forward
  - "Korean Fermentation Culture" — kimchi at every meal, doenjang, gochujang, jeotgal — probiotic diversity unmatched by any other cuisine, gut microbiome research, the fermentation-longevity connection
  - "Latin American Superfoods You Already Know" — quinoa (Bolivian/Peruvian), chia (Mexican/Guatemalan), black beans (everywhere), plantains (resistant starch), sofrito (tomato + onion + pepper + garlic = antioxidant base), aguacate (avocado is from Mexico)

  * **Test:** `frontend/__tests__/lib/kitchenIQ/cards.test.ts` — ≥30 cards in library; every card has non-empty title + subtitle + ≥1 section + ≥3 topFoods; every type has ≥4 cards; no duplicate IDs; all recipe references are valid IDs (or empty array)

**Frontend Experience**

- [x] **Kitchen IQ tab in Profile** — ✅ `frontend/components/profile/KitchenIQSection.tsx`; wired into `app/(tabs)/profile.tsx` directly below `CookingJourneyCard`. Hidden when `unlockedCount === 0` (first-time users see it after their first unlock). Tapping navigates to `/kitchen-iq`.
  * 📍 Frontend: `components/profile/KitchenIQSection.tsx` — compact card showing unlocked count + 3 preview thumbnails of recent unlocks
  * **Test:** `frontend/__tests__/components/profile/KitchenIQSection.test.tsx` — renders unlock count; shows preview cards; tapping navigates to browse screen; hidden when 0 cards unlocked (first-time users see it after their first cook)

- [x] **Kitchen IQ browse screen** — ✅ `app/kitchen-iq.tsx` + `lib/kitchenIQ/ranker.ts`. 4 collapsible sections (Nutrients/Ingredients/Concepts/Cuisine Stories). N=1 ranker scores by `nutrient gap (60) + cuisine cook count × 30 (cap 5) + ingredient affinity (20) + skillTier match (10)`. Unlocked cards always rank above locked. Locked cards show greyed silhouette with count-cited unlock hint ("3 more cooks · you've done 2"). Tapping a locked card is a no-op.
  > **N=1 sharpening:** Generic alphabetical grid is the failure mode. Same content, but ordering bends to the user's cooking signal — and lock hints reference real progress, not a static threshold.
  * 📍 4 section headers (collapsible): Nutrients 🧬, Ingredients 🌿, Concepts 📐, Cuisine Stories 🌍
  * 📍 Locked card hint: "Cook 5 recipes" / "Try 3 cuisines" / "Use turmeric in a recipe" — specific, achievable, tied to actual cooking behavior
  * **Test:** `frontend/__tests__/app/kitchen-iq.test.tsx` — renders sections with correct headers; unlocked cards are tappable; locked cards show hint text; tapping locked card does NOT navigate; section collapse/expand works; progress bar reflects unlock ratio

- [x] **Kitchen IQ detail sheet** — ✅ `components/kitchen-iq/KitchenIQDetailSheet.tsx`. Hero (emoji + Fraunces title + subtitle), section cards with `icon_list/comparison/scale` icons, top-foods horizontal scroll with %DV bars, recipes carousel (parent-supplied order — cookbook-first ranking is delegated to caller). Recipe taps write to `kitchen_iq_recipe_interest::{userId}` for the closed-loop signal. Reanimated slide-up + backdrop fade; light + dark themed; `HapticTouchableOpacity` throughout (incl. backdrop). Bottom sheet (85% height) with:
  * Hero: large emoji + title + subtitle
  * Sections: rendered as styled cards (each `section` in the card data), with optional visual types (icon list for "top foods", comparison for "vs" content, scale for "how much do you need")
  * "Top Foods" horizontal scroll: each food as a mini pill showing name + amount + %DV bar
  * "Recipes with this" carousel: **prioritize recipes from the user's cookbook + cuisine-affinity matches first; database fallbacks second**. Tapping a recipe navigates to recipe detail and writes a `nutrient_interest_tap` signal that boosts that nutrient's affinity for future ranking.
  * Share button: generates a shareable card image (deferred — text share first)
  * **Test:** `frontend/__tests__/components/kitchen-iq/KitchenIQDetailSheet.test.tsx` — renders hero + sections; top foods show DV percentages; recipe carousel links navigate; hidden when not visible; close button works; a11y labels on all interactive elements

- [x] **Progressive unlock system** — ✅ `frontend/hooks/useKitchenIQProgress.ts`. Fetches `/api/user/kitchen-iq/progress`, exposes `{ totalCards, unlockedCount, unlockedIds, newUnlocks, isUnlocked, refresh, acknowledgeNewUnlock }`. Celebrations dedup'd via AsyncStorage `kitchen_iq_celebrated_v1`. Cancel-on-unmount signal added; `Set`-backed `isUnlocked` for O(1) lookup.
  * Fetches user's cooking stats (reuses `GET /api/user/cooking-stats` from 10I)
  * Evaluates each card's `unlockCondition` against the stats:
    - `cook_count >= 5` → unlocks first batch (basics: protein, fiber, magnesium)
    - `cook_count >= 15` → unlocks intermediate (iron, omega-3, zinc, turmeric, ginger)
    - `cuisine_count >= 5` → unlocks cuisine stories
    - `ingredient_used: "turmeric"` → unlocks turmeric spotlight (detected from cooking history)
    - `none` → always unlocked (2-3 "starter" cards available immediately: protein, volume eating, reading labels)
  * Persists unlock state in AsyncStorage (source of truth is cooking stats, but cache avoids re-computation)
  * New unlock → subtle celebration: toast with confetti particle + "New Kitchen IQ card unlocked: [title]" — fires once per card
  * **Test:** `frontend/__tests__/hooks/useKitchenIQProgress.test.ts` — starter cards unlocked with 0 cooks; cook_count threshold unlocks correct cards; cuisine_count threshold unlocks cuisine stories; ingredient_used checks cooking log; new unlock fires celebration; already-seen unlock doesn't re-fire

- [x] **Home feed integration** — ✅ `components/home/KitchenIQPromoCard.tsx`; wired into `EditorialHomeLayout.tsx` directly below `DidYouKnowCard`. 48h freshness gate: timestamps persisted at first observation in AsyncStorage `kitchen_iq_unlocked_at_v1`. Tap → navigates to `/kitchen-iq?card={id}` and acknowledges. Dismissable. Reanimated FadeIn.
  * **Test:** `frontend/__tests__/components/home/KitchenIQPromoCard.test.tsx` — renders when new unlock within 48h; hidden when no recent unlocks; tapping navigates to detail; dismiss hides card; shows correct card title

- [x] **Backend: `GET /api/user/kitchen-iq/progress`** — ✅ `backend/src/modules/kitchenIQ/`. Pure service `kitchenIQProgressService.ts` (cook_count + cuisine_count + ingredient_used + none thresholds). Controller fetches `cookingLog`, `userPreferences.lastCheckedUnlocks`, `recipeIngredient` (capped at 2000 rows for unbounded-history safety), upserts the new full `unlockedIds` to `lastCheckedUnlocks`. Manifest at `kitchenIQManifest.ts` mirrors frontend card IDs. Drift guard test at `frontend/__tests__/lib/kitchenIQ/manifestParity.test.ts` reads the backend manifest source directly and asserts ID set equality. Returns `{ totalCards, unlockedCount, unlockedIds, newUnlocks }`.
  * 📍 No new Prisma model — uses existing `UserPreferences.lastCheckedUnlocks: String?` (JSON array of previously unlocked IDs). Avoids a separate table for what's essentially a derived + cached value.
  * **Test:** `backend/tests/modules/kitchenIQProgress.test.ts` — returns starter cards for new user; returns additional cards after 5 cooks; `newUnlocks` contains only cards not in `lastCheckedUnlocks`; updates `lastCheckedUnlocks` on read; empty cooking history returns only `none`-condition cards

#### 10S Tests (consolidated) — ✅ 81/81 green

- [x] `frontend/__tests__/lib/kitchenIQ/cards.test.ts` — card library integrity, ≥30 cards, ≥4 per type, no dupes, normalized `personalizationKeys` (13/13)
- [x] `frontend/__tests__/lib/kitchenIQ/ranker.test.ts` — pure N=1 ranker (6/6)
- [x] `frontend/__tests__/lib/kitchenIQ/manifestParity.test.ts` — drift guard between frontend cards and backend manifest (1/1)
- [x] `frontend/__tests__/components/profile/KitchenIQSection.test.tsx` (7/7)
- [x] `frontend/__tests__/app/kitchen-iq.test.tsx` — browse screen + ranking + locked-tap no-op + collapse (7/7)
- [x] `frontend/__tests__/components/kitchen-iq/KitchenIQDetailSheet.test.tsx` — hero, sections, top foods bars, recipes, close (13/13)
- [x] `frontend/__tests__/hooks/useKitchenIQProgress.test.ts` — fetch, isUnlocked, newUnlocks, acknowledge, refresh, error fallback (6/6)
- [x] `frontend/__tests__/components/home/KitchenIQPromoCard.test.tsx` — 48h freshness, dismiss, navigate (8/8)
- [x] `backend/__tests__/modules/kitchenIQ/kitchenIQProgressService.test.ts` (13/13)
- [x] `backend/__tests__/modules/kitchenIQ/kitchenIQController.test.ts` — 7 cases incl. malformed lastCheckedUnlocks + 500 fallback (7/7)

#### 10S Implementation — COMPLETE ✅

- Foundation: 32 curated cards with N=1 personalizationKeys (cuisine × nutrient × ingredient × skillTier) at `frontend/lib/kitchenIQ/cards.ts`. Pure N=1 ranker at `frontend/lib/kitchenIQ/ranker.ts` (nutrient gap × cuisine cook count × ingredient affinity × skill tier; unlocked always > locked). Backend mirror manifest + progress service in `backend/src/modules/kitchenIQ/`.
- Backend endpoint `GET /api/user/kitchen-iq/progress` shipped. Computes unlocks from cooking stats + cooked-recipe ingredients, persists full unlocked set to `UserPreferences.lastCheckedUnlocks` (new column), returns `newUnlocks` diff. Bounded the cooked-ingredient query at `take: 2000` for power-user safety.
- Shared user-state hook reused from 10R (`useFoodIntelUserState`) — `topAffinityIngredients` and `rolling7dNutrientGaps` continue to be 10R-Phase2 stubs.
- 4 surface points wired: Profile (KitchenIQSection, lavender, hidden until first unlock), Browse screen (`/kitchen-iq` with 4 sections, count-cited locked hints, N=1 ranker, slide-in detail sheet), Detail sheet (hero + sections + top-foods %DV bars + recipes carousel; closed-loop interest write), Home feed (KitchenIQPromoCard, peach, 48h freshness gate).
- Reviewer fixes folded in pre-merge: dark-mode parity in detail sheet (`makeStyles(isDark)` pattern), `#FFFFFF` → `#FAF7F4` in profile section + browse tiles (banned-pattern compliance), Pressable backdrop → HapticTouchableOpacity, safe `JSON.parse` with type guard in detail sheet, query cap on `recipeIngredient.findMany`, Set-backed `isUnlocked` + cancel-on-unmount in hook, semantic `'unavailable'` error token instead of leaking raw `Error.message`, manifest/card ID parity drift-guard test.

---

### **Group 10V: V2 Editorial Design Revamp** 🎨✨

> **Why.** The app works and has strong feature coverage, but the visual language is still functional-utilitarian. The v2 design handoff (`design_handoff_sazon_chef/`) introduces an **editorial aesthetic** — serif display type (Fraunces), circular plate-on-pastel photography, layered depth with overlapping elements, pastel widget cards, and black pill CTAs. This is the "App Store editorial" pass that makes Sazon look like a premium product, not a dev project.
>
> **Design DNA (5 pillars):**
> 1. **Editorial serif display** — screen titles use Fraunces at 38–46px with italic accent words; body/UI stays Plus Jakarta Sans
> 2. **Circular plate photography** — food photos masked to circles, offset to overflow cards, deep tinted shadows
> 3. **Pastel widget cards** — cream scaffold, cards use the pastel palette (peach, sage, lavender, sky), tinted title colors
> 4. **Layered depth** — stat strips overlap heroes (`marginTop: -28`), photos overflow card bounds, decorative soft circles
> 5. **Black pill CTAs** — primary actions are solid black pills (`#111827`, height 52, `borderRadius: 9999`); orange gradient reserved for Save chip + Surprise FAB only
>
> **Reference files:** `design_handoff_sazon_chef/screens/`, `design_handoff_sazon_chef/primitives/`, `design_handoff_sazon_chef/colors_and_type.css`, `REDESIGN_PHILOSOPHY.md`

---

#### **10V-A: Typography Foundation — Fraunces + Plus Jakarta Sans** 🔤

> Load editorial fonts and create the dual-font type system. This is the foundation — every subsequent section depends on it.

- [x] **Install `@expo-google-fonts/fraunces` + `@expo-google-fonts/plus-jakarta-sans`** via `npx expo install`
  - Load weights: Fraunces 300/400/500/600/700/800 (regular + italic); Plus Jakarta Sans 400/500/600/700/800
  - **Test:** `frontend/__tests__/foundations/typography.test.ts` — font families load without error; all weight variants resolve; fallback to system font when loading
- [x] **Update `frontend/constants/Typography.ts`** — add editorial presets alongside existing ones
  - `display` — Fraunces 46px / weight 400 / letterSpacing -1.5 / lineHeight 0.98
  - `displayAccent` — Fraunces 46px / weight 700 / italic
  - `sectionTitle` — Fraunces 26px / weight 400 / letterSpacing -0.8
  - `sectionAccent` — Fraunces 26px / weight 600 / italic
  - `heroTitle` — Fraunces 22px / weight 400 + italic 600 accent
  - `statNumber` — Fraunces 22px / weight 600 / letterSpacing -0.5
  - `recipeDetailTitle` — Fraunces 38px / weight 400 / letterSpacing -1.2
  - `eyebrow` — Plus Jakarta Sans 10–11px / weight 800 / letterSpacing 1.0–1.5 / uppercase
  - `body` — Plus Jakarta Sans 13–14px / weight 500–600
  - Keep all existing presets (h1–h4, body, label, caption, stat) for backwards compat
  - **Test:** `frontend/__tests__/foundations/typography.test.ts` — each preset has correct fontFamily, fontSize, fontWeight, letterSpacing; display uses Fraunces; body uses Plus Jakarta Sans
- [x] **Create `useEditorialText` hook** — returns styled Text components (`DisplayText`, `SectionText`, `EyebrowText`) that apply the correct font family + weight
  - **Test:** `frontend/__tests__/hooks/useEditorialText.test.tsx` — DisplayText renders with Fraunces family; SectionText handles italic accent word via children; EyebrowText is uppercase

#### **10V-B: Design Token Updates** 🎨

> Extend existing token files with v2 values. Additive — nothing removed.

- [x] **Update `Colors.ts`** — add editorial-specific tokens
  - `fg.muted_cream: '#C9BFB5'` — inactive category rail labels on cream bg
  - Pastel title colors: `pastelTitle.peach: '#8a4a00'`, `pastelTitle.sage: '#2E5931'`, `pastelTitle.lavender: '#6a2677'`, `pastelTitle.sky: '#0f4a7a'`, `pastelTitle.golden: '#8a6200'`, `pastelTitle.blush: '#9a1f5b'`
  - `blackCTA: '#111827'` — primary CTA background (v2 editorial)
  - **Test:** `frontend/__tests__/foundations/colors.test.ts` — all new tokens exist; pastelTitle colors have sufficient contrast against their pastel bg (WCAG AA)
- [x] **Update `Shadows.ts`** — add editorial shadow presets
  - `platePhoto` — `{ shadowOffset: {x:0,y:14}, shadowRadius:32, shadowColor:'rgba(30,60,110,0.28)' }` with secondary layer
  - `cardRaised` — `{ shadowOffset: {x:0,y:10}, shadowRadius:28, shadowColor:'rgba(0,0,0,0.08)' }`
  - `fab` — `{ shadowOffset: {x:0,y:10}, shadowRadius:24, shadowColor:'rgba(232,77,61,0.45)' }`
  - `blackCTA` — `{ shadowOffset: {x:0,y:8}, shadowRadius:20, shadowColor:'rgba(17,24,39,0.3)' }`
  - **Test:** `frontend/__tests__/foundations/shadows.test.ts` — all presets have valid shadowOffset/shadowRadius/shadowColor values; Android elevation integers are correct
- [x] **Update `Spacing.ts`** — bump screen horizontal padding
  - `screenPadding: 20` (v1 was 16; v2 editorial uses 20 for breathing room)
  - Add `BorderRadius.hero: 28`, `BorderRadius.heroCurve: 36`
  - **Test:** `frontend/__tests__/foundations/spacing.test.ts` — `screenPadding` is 20; `BorderRadius.hero` is 28; `BorderRadius.heroCurve` is 36

#### **10V-C: Editorial Primitives** 🧱

> New reusable components from the design handoff. Build these before touching screens.

- [x] **`EditorialCard` component** (`frontend/components/ui/EditorialCard.tsx`)
  - Pastel background card with 104px centered circular food photo, serif title with tinted color, meta strip (time · cal · match%), heart save button
  - Props: `recipe`, `bg` (pastel hex), `titleColor`, `saved`, `onToggleSave`, `onPress`
  - `borderRadius: 22`, `boxShadow: card`, no borders
  - **Test:** `frontend/__tests__/components/ui/EditorialCard.test.tsx` — renders circular photo with `borderRadius: 9999`; title uses Fraunces font; meta strip shows time/cal/match; heart toggles saved state; press handler fires; a11y label present
- [x] **`PlateHeroCard` component** (`frontend/components/ui/PlateHeroCard.tsx`)
  - Pastel gradient background (default sky `#E3F2FD → #DCE8F3`), 200px circular food photo offset `right: -36px` with deep shadow, save chip (gradient orange), editorial title block (serif + eyebrow + meta), `overflow: 'visible'` on container
  - Props: `recipe`, `gradientColors`, `onPress`, `saved`, `onToggleSave`
  - **Test:** `frontend/__tests__/components/ui/PlateHeroCard.test.tsx` — photo renders at 200px circle; photo overflows card boundary; gradient background renders; save chip uses gradient not flat color; title uses serif font; press navigates
- [x] **`VerticalCategoryRail` component** (`frontend/components/ui/VerticalCategoryRail.tsx`)
  - Vertical text labels (`transform: rotate(-90deg)`), uppercase, letter-spaced; active = black `#111827` with orange dot prefix, inactive = warm gray `#C9BFB5`
  - Props: `categories: string[]`, `active: string`, `onSelect: (cat: string) => void`
  - **Test:** `frontend/__tests__/components/ui/VerticalCategoryRail.test.tsx` — renders all categories vertically; active category shows orange dot indicator; inactive categories use muted color; tap fires onSelect; a11y roles correct
- [x] **`StatStrip` component** (`frontend/components/ui/StatStrip.tsx`)
  - White card with 4 stats in a row (serif Fraunces numbers, uppercase JKS labels), vertical dividers (`#F0EAE2`), overlapping hero via `marginTop: -28`, raised shadow
  - Props: `stats: { value: string, label: string }[]`
  - **Test:** `frontend/__tests__/components/ui/StatStrip.test.tsx` — renders 4 stat columns; numbers use Fraunces; labels are uppercase; card has negative margin; dividers render between stats
- [x] **`BlackPillCTA` component** (`frontend/components/ui/BlackPillCTA.tsx`)
  - Solid `#111827` background, height 52, `borderRadius: 9999`, white text (Plus Jakarta Sans 14px/800), deep shadow, spring press scale 0.96, optional left icon
  - Props: `label`, `icon?`, `onPress`, `disabled?`
  - Replaces gradient CTA on recipe detail and other primary actions per v2 design
  - **Test:** `frontend/__tests__/components/ui/BlackPillCTA.test.tsx` — renders with black background; text is white; press triggers spring animation; disabled state reduces opacity; icon renders when provided
- [x] **`StickyBottomBar` component** (`frontend/components/ui/StickyBottomBar.tsx`)
  - Absolute positioned at bottom, gradient fade overlay (`transparent → #FAF7F4`), flex row for action buttons
  - Props: `children` (buttons), `fadeColor?` (defaults to surface cream)
  - **Test:** `frontend/__tests__/components/ui/StickyBottomBar.test.tsx` — positions absolute at bottom; gradient fade renders; children render inside; safe area bottom padding applied
- [x] **`IngredientRow` component** (`frontend/components/ui/IngredientRow.tsx`)
  - 42px tinted rounded square icon (ingredient image/emoji), name (14px/600), bold quantity (14px/800), tap to toggle checked state (opacity 0.45 + line-through + grayscale icon)
  - Props: `ingredient: { name, qty, icon }`, `checked`, `onToggle`
  - Divider line `#F0EAE2` between rows (last row no divider)
  - **Test:** `frontend/__tests__/components/ui/IngredientRow.test.tsx` — renders icon + name + qty; checked state dims opacity and adds line-through; icon grayscales when checked; tap fires onToggle
- [x] **`ServingStepper` component** (`frontend/components/ui/ServingStepper.tsx`)
  - White card with border `#F0EAE2`, serving count in orange (13px/700), circular − / + buttons, min 1 / no max
  - Props: `servings`, `onChangeServings`
  - **Test:** `frontend/__tests__/components/ui/ServingStepper.test.tsx` — shows serving count; minus at 1 is disabled or stays at 1; plus increments; display updates correctly
- [x] **`UnitSegmentedControl` component** (`frontend/components/ui/UnitSegmentedControl.tsx`)
  - Pill-shaped container on `#F5F0EB`, two options (Metric / US), active = black pill background + white text, inactive = transparent + gray text
  - Props: `value: 'Metric' | 'US'`, `onChange`
  - **Test:** `frontend/__tests__/components/ui/UnitSegmentedControl.test.tsx` — active option has black bg; inactive has transparent bg; tap switches; spring animation on toggle

#### **10V-D: Home Screen — Editorial Revamp** 🏠

> Rebuild the home screen to match the v2 editorial design. Reference: `design_handoff_sazon_chef/screens/Home.jsx` + `preview_v2_home.png`

- [x] **Top bar redesign** — Mascot (36px) + "GOOD EVENING / Hi, [Name]" eyebrow stack + search + notifications `IconButton`s (white bg, circular)
  - Time-aware greeting: morning/afternoon/evening
  - [x] **Test:** `frontend/__tests__/app/home.editorial.test.tsx` — greeting reflects time of day; mascot renders at correct size; search and notification buttons render; user name displays
- [x] **Editorial display headline** — Fraunces 46px, "Tonight's *picks*." with italic accent on "picks" + orange period
  - Subtitle: 13px muted copy ("Crafted around what's in your pantry and today's macro budget.")
  - [x] **Test:** same file — headline renders with serif font; "picks" word is italic; orange period character renders; subtitle has max-width constraint
- [x] **Hero row: plate-on-pastel + vertical category rail** — `VerticalCategoryRail` (78px) on left + `PlateHeroCard` on right wired in `EditorialHomeLayout`. Rail filters hero by meal type via `recipePool` prop on the home screen (matches `mealType` against active category, falls back to `recipeOfTheDay`).
  - [x] **Test:** `home.editorial.test.tsx` covers PlateHeroCard + VerticalCategoryRail render, category change, photo overflow, shadow.
- [x] **Macro widget row** — 3 pastel `WidgetCard`s in asymmetric grid (1.2fr / 1fr / 1fr): Today's kcal (peach), Protein (sage), Streak (lavender)
  - Each card: decorative accent circle (top-right, 35% opacity), icon in white circle, eyebrow label, Fraunces stat number, optional trend line
  - [x] **Test:** same file — 3 widget cards render; each has correct pastel background; stat numbers use serif font; decorative circles render
- [x] **Quick picks section** — editorial H2 ("Quick *picks*") + "SEE ALL →" orange uppercase link, 2×2 `EditorialCard` grid
  - Each card uses rotating pastel backgrounds (peach, sage, lavender, sky)
  - [x] **Test:** same file — section title uses serif with italic accent; 4 cards render in 2×2 grid; each card has different pastel bg; "See all" link is orange uppercase
- [x] **Surprise FAB** — 58px gradient-brand circle (bottom-right), sparkles icon, deep orange shadow
  - [x] **Test:** same file — FAB renders at bottom-right; tap opens random recipe; gradient background applies; shadow renders

#### **10V-E: Recipe Detail — Editorial Revamp** 📋

> Rebuild recipe detail to match v2. Reference: `design_handoff_sazon_chef/screens/RecipeDetail.jsx`

- [x] **Peach hero block** — `LinearGradient` 160deg `#FFF3E0 → #FFE5C8`, `borderBottomLeftRadius: 36` / `borderBottomRightRadius: 36`, soft decorative circles (rgba amber/orange at low opacity)
  - Back / share / save `IconButton`s with frosted white bg (`rgba(255,255,255,0.8)`)
  - [x] **Test:** `frontend/__tests__/app/recipeDetail.editorial.test.tsx` — hero block renders with gradient; bottom corners are rounded at 36px; back button navigates; share and save buttons render
- [x] **Editorial title block** — eyebrow ("Asian · 92% match" with orange dot prefix), Fraunces 38px title with italic accent word, subtitle ("with jasmine rice & scallions")
  - [x] **Test:** same file — eyebrow shows cuisine + match%; title uses serif at 38px; italic accent renders correctly
- [x] **Circular plate photo** — 240px, offset `right: -50`, deep amber shadow, white border (6px), positioned absolute overlapping from hero
  - Uses `expo-image` with blur-up placeholder
  - [x] **Test:** same file — photo renders at 240px circle; photo overflows to the right; plate shadow has amber tint
- [x] **Stat strip overlay** — `StatStrip` with 4 stats (kcal, protein, min, serve), overlaps hero with `marginTop: -28`, white bg, raised shadow
  - [x] **Test (partial):** same file — stat strip tested in 10V-C unit tests (StatStrip.test.tsx); screen-level composition deferred
- [x] **Chef's note** — editorial pull-quote in Fraunces italic 17px, "CHEF'S NOTE" eyebrow
  - [x] **Test:** same file — chef's note renders with italic serif; eyebrow is uppercase
- [x] **Ingredients section** — section title (Fraunces 26px) + `UnitSegmentedControl` (Metric/US), `ServingStepper`, `IngredientRow` list with iconographic images
  - Ingredient icons: 42px tinted rounded squares with food icons (emoji first pass, illustrated later)
  - [x] **Test:** same file — section title is serif; unit toggle switches display; serving stepper renders; ingredient rows show icons + names + quantities
- [x] **Sticky black CTA bar** — `StickyBottomBar` with calendar `IconButton` + `BlackPillCTA` "▶ Start cooking"
  - Gradient fade from transparent to `#FAF7F4`
  - [x] **Test:** same file — CTA bar sticks at bottom; black pill renders with white text; calendar button renders and fires handler

#### **10V-F: Meal Plan — Editorial Refresh** 📅

> Apply v2 DNA to meal plan screen. Reference: `design_handoff_sazon_chef/screens/MealPlan.jsx` + `design_handoff_sazon_chef/handoff-2/meal_plan.png`

- [x] **Eyebrow + editorial title** — "APRIL · WEEK 16" eyebrow (uppercase, muted, month + week number auto-derived from current date), "This **week**." display title (serif 30px, "week" in bold italic, orange period)
  - Subtitle: "Four meals a day, balanced around your macro budget. Swap or auto-plan at any time." (14px muted)
  - [x] **Test:** `frontend/__tests__/app/mealPlan.editorial.test.tsx` — eyebrow shows current month + week number; title uses serif font; "week" word is italic; subtitle renders
- [x] **Week strip** — 7 day columns (3-letter day abbreviation + date number), active day = solid black circle bg (`#111827`) with white text + orange dot underneath, inactive = transparent bg + muted text
  - [x] **Test:** same file — 7 day pills render; active day has black circle bg + orange dot indicator; tapping changes active day
- [x] **Macro budget section** — "WEDDAY · MACRO BUDGET" eyebrow (uppercase, auto-updates with selected day) + "79% on track" orange badge (right-aligned, reflects actual macro adherence %)
  - [x] **Test:** same file — eyebrow reflects selected day name; on-track % badge renders with correct value
- [x] **Macro summary card** — white card (radius 20), `CalorieRing` (SVG, **golden** ring `#FFB74D` on cream track, "1,420 OF 1,800" center) + 4 `MacroBar`s (PROTEIN=sage, CARBS=golden, FAT=lavender, FIBER=green) with progress bars and value/goal text (e.g., "98/120g")
  - [x] **Test:** same file — calorie ring renders; center shows consumed/goal; 4 macro bars render; value/goal text shows units
- [x] **"Today's *plan*" section** — serif section title with italic "plan" + "AUTO-PLAN" orange uppercase link (right-aligned, triggers auto-plan flow)
  - [x] **Test:** same file — section title uses serif with italic accent; "AUTO-PLAN" link renders in orange uppercase; tap triggers auto-plan
- [x] **Meal slot cards** — white cards (radius 18), time stamp left-aligned (e.g., "7:30 AM" in muted 11px), italic serif meal type label ("*Breakfast*" / "*Lunch*" / "*Dinner*" / "*Snack*"), recipe title (bold 14px), macro meta strip ("420 · 22g protein · 20 min"), **circular plate photo** right-aligned (offset, same PlateHeroCard pattern); empty slot shows "Tap to add a recipe" in muted text
  - [x] **Test:** same file — filled slots show time + italic meal label + title + macros; empty slots show placeholder text; tap fires handler

#### **10V-G: Cookbook — Editorial Refresh** 📚

> Apply v2 DNA to cookbook screen. Reference: `design_handoff_sazon_chef/screens/Cookbook.jsx` + `design_handoff_sazon_chef/handoff-2/cookbook.png`

- [x] **Eyebrow + editorial title** — "YOUR" eyebrow (uppercase, muted), "Cookbook." display title (serif bold 30px with orange period)
  - Subtitle: "[N] recipes saved across [M] collections." (14px muted, dynamically computed)
  - [x] **Test:** `frontend/__tests__/app/cookbook.editorial.test.tsx` — "YOUR" eyebrow renders uppercase; title uses serif font with period; subtitle shows correct recipe count and collection count
- [x] **Collection chips with counts** — scrollable horizontal row, each chip shows count + label (e.g., "3 ALL", "4 Weeknight", "6 Meal prep"); active chip = black pill bg (`#111827`) + white text + orange underline bar, inactive = white bg + warm gray border + muted text, font 12px/700
  - [x] **Test:** same file — collection chips render with counts; active chip has black bg; inactive has white bg; tap changes active collection
- [x] **"MOST COOKED" hero section** — "MOST COOKED" eyebrow (uppercase, muted), `PlateHeroCard` variant with pastel pink bg (`#FCE4EC`), large circular plate photo offset right with deep shadow, "MADE [N] TIMES" orange badge (uppercase, top-left), editorial serif title with italic accent word (e.g., "Honey-garlic shrimp *with jasmine rice*")
  - Only shows if user has cooked recipes; highlights the recipe with the highest cook count
  - [x] **Test:** same file — "MOST COOKED" eyebrow renders; hero card shows pastel pink bg; "MADE N TIMES" badge shows correct count; serif title renders with italic accent
- [x] **"Recently saved" section** — serif section title "Recently *saved*" (italic accent) + "SORT" orange uppercase link (right-aligned), horizontal scrolling row of circular pastel recipe cards (cream/sage/peach backgrounds, ~120px circle photos with subtle ring border, recipe name below)
  - [x] **Test:** same file — section title uses serif with italic accent; "SORT" link renders in orange uppercase; recipe cards render; tap fires handler
- [x] **Empty state** — `AnimatedEmptyState` wired in `cookbook.tsx` with `CookbookEmptyStates.noSavedRecipes` config (`useMascot: true`, `mascotSize: 'large'`, curious expression, peach pastel tint, "Your cookbook awaits" title + help copy + Explore Recipes CTA). Variants for empty collection, no collections, no liked, no disliked, no search results.
  - [x] **Test:** covered by `AnimatedEmptyState.test.tsx` and existing cookbook screen tests.

#### **10V-H: Shopping List — Editorial Refresh** 🛒

> Apply v2 DNA to shopping list. Reference: `design_handoff_sazon_chef/screens/Shopping.jsx`

- [x] **Screen header** — "Shopping list" title + "[N] items left · [M] already in pantry" subtitle
  - [x] **Test:** `frontend/__tests__/app/shopping.editorial.test.tsx` — title renders; items-left count is correct; pantry count shows
- [x] **Progress strip** — white card with gradient cart icon (44px circle, orange→red), "Progress" label + fraction + gradient progress bar
  - [x] **Test:** same file — progress bar width reflects checked/total ratio; count shows done/total
- [x] **Category sections** — category header (26px tinted icon square + uppercase bold name + item count), white card group (radius 18) with item rows
  - Icons: produce=leaf/sage, protein=flame/red, pantry=tray/peach, dairy=water/sky
  - [x] **Test:** same file — categories render with correct name uppercase; items grouped by category; correct item counts per section
- [x] **Item rows** — custom checkbox (22px circle, orange when checked + checkmark, gray border when unchecked), label + "In pantry" badge (green, uppercase, checkmark-circle icon), quantity
  - Checked state: label dimmed + strikethrough
  - [x] **Test:** same file — unchecked items show gray circle; checked shows orange fill + checkmark; "In pantry" badge shows for pantry items; tap fires toggle
- [x] **Dividers** — `#F5F0EB` between items within a category section (not after last item)
  - [x] **Test:** same file — dividers render between items but not after the last item

#### **10V-I: Onboarding — Pastel Gradient Flow** 🌈

> Apply v2 DNA to onboarding. Reference: `design_handoff_sazon_chef/screens/Onboarding.jsx`

- [x] **3-step flow with pastel gradients** — step 0 peach (`#FFE3CC → #FFF3E0 → #FFFFFF`), step 1 sage (`#C8E6C9 → #E8F5E9 → #FFFFFF`), step 2 lavender (`#E1BEE7 → #F3E5F5 → #FFFFFF`) wired via per-step `THEME` config in `onboarding.tsx`; jewel-tone dark variants per step.
  - [x] **Test:** `onboarding.editorial.test.tsx` covers step-content rendering across the 3 steps.
- [x] **Progress dots** — animated width (active = 24px orange, inactive = 8px muted), spring transition on step change
  - [x] **Test:** same file — correct number of dots; active dot is wider + orange; inactive is narrow + muted
- [x] **Mascot hero** — `Sazon` mascot (140px) inside pastel circle ring + jewel gradient plate (dark mode); per-step variant/motion/fx via `STEP_SAZON` map; spring entrance via MotiView.
  - [x] **Test:** covered indirectly by `onboarding.editorial.test.tsx` step assertions and `onboarding.test.tsx`.
- [x] **Step content** — orange eyebrow ("Welcome" / "Step 1 of 3" / "Step 2 of 3"), bold title (34px step 0, 30px others), muted description, `whiteSpace: 'pre-line'` for line breaks
  - [x] **Test:** same file — eyebrow text updates per step; title size is 34 on welcome; description renders
- [x] **Option chips** — step 1: 3-column grid of emoji + label chips (dietary restrictions), multi-select; step 2: 2-column grid (goals), single-select
  - Selected state: subtle orange gradient bg + orange border; unselected: frosted white + light border
  - [x] **Test:** same file — selected chip has orange border; unselected has default border; tap fires toggle; 2-column layout works
- [x] **CTAs** — Black editorial pill (`HapticTouchableOpacity` styled identical to `BlackPillCTA`) full-width with dynamic label ("Get started" → "Continue" → "Finish setup"); ghost "Back" pill rendered below the primary on steps 1-2 (testID `onboarding-back`); top-right "Skip" available on every step.
  - [x] **Test:** `onboarding.editorial.test.tsx` covers CTA label transitions; `onboarding.test.tsx` covers Skip and full flow.

#### **10V-J: Shared Primitives — FrostedHeader + TabBar + RecipeCard** 🧩

> Upgrade shared chrome components to match v2 DNA.

- [x] **`FrostedHeader` upgrade** — sticky top, `rgba(255,255,255,0.82)` + `blur(16px) saturate(180%)` via `expo-blur`, mascot (36px xsmall) + "Sazon Chef" brand text (22px/800), action `IconButton` on `#F5F0EB`
  - Uses `BlurView` on iOS, semi-transparent solid on Android (existing pattern)
  - **Test:** `frontend/__tests__/components/ui/FrostedHeader.test.tsx` — renders mascot + brand text; action button renders; sticky positioning applies; a11y label present
- [x] **`ScreenHeader` upgrade** — title (30px/800) + optional subtitle (14px muted) + optional right element (e.g., view toggle), padding `14px 16px 8px`
  - **Test:** `frontend/__tests__/components/ui/ScreenHeader.test.tsx` — title renders at 30px bold; subtitle renders when provided; right element slot works
- [x] **`TabBar` upgrade** — floating pill bar (`left: 12, right: 12, bottom: 22`), frosted glass bg, `borderRadius: 28`, 5 tabs (home/cookbook/mealplan/shopping/profile)
  - Active tab: filled icon + orange color + 800 weight label; inactive: outline icon + gray `#9CA3AF` + 600 weight
  - **Test:** `frontend/__tests__/components/ui/TabBar.test.tsx` — 5 tabs render; active tab has orange color + filled icon; inactive has gray + outline icon; frosted bg renders; floating positioning correct
- [x] **`RecipeCard` variants** — update existing component with v2 visual treatment
  - `featured`: match-color top bar (green ≥80%, orange ≥60%, red <60%), full-bleed image with gradient overlay, match% badge, heart button, title on image, meta strip with difficulty + time + cal + protein
  - `grid`: match-color top bar, 108px photo, title (13px/800) + meta (10px), heart button
  - `list`: match-color left bar (4px), 96px thumbnail, title + meta + tags + difficulty badge, heart button
  - **Test:** `frontend/__tests__/components/ui/RecipeCard.test.tsx` — featured variant has gradient image overlay; grid variant has correct photo height; list variant shows left color bar; match color is green/orange/red per threshold; heart toggles saved state

#### **10V-K: Macro Widgets — CalorieRing + MacroBar** 📊

> SVG-based nutrition visualization components.

- [x] **`CalorieRing` component** (`frontend/components/ui/CalorieRing.tsx`)
  - SVG circle ring (peach `#FFB74D` on `#FFF3E0` track), consumed/goal center display (bold number + "of [goal]" label), rotated -90deg for top start
  - Props: `consumed`, `goal`, `size` (default 140)
  - Uses `react-native-svg` (already installed or install)
  - **Test:** `frontend/__tests__/components/ui/CalorieRing.test.tsx` — ring renders at correct size; stroke dashoffset reflects consumed/goal ratio; center shows consumed number; "of [goal]" label renders; ring is capped at 100%
- [x] **`MacroBar` component** (`frontend/components/ui/MacroBar.tsx`)
  - Horizontal progress bar: label (10px uppercase, 62px width), bar (cream track `#F5F0EB`, colored fill), value/goal text (11px/700)
  - Props: `label`, `value`, `goal`, `unit` (default 'g'), `color`
  - Color presets: protein=`#81C784`, carbs=`#FFD54F`, fat=`#CE93D8`, fiber=`#059669`
  - **Test:** `frontend/__tests__/components/ui/MacroBar.test.tsx` — bar width reflects value/goal %; label is uppercase; value/goal text shows units; bar is capped at 100%

---

#### **10V-L: Implementation Order**

| Phase | Focus | Est. Hours | Dependencies |
|-------|-------|-----------|--------------|
| **Phase 1** | 10V-A: Typography foundation (fonts + presets) | 4h | None — start here |
| **Phase 2** | 10V-B: Token updates (colors, shadows, spacing) | 2h | Phase 1 |
| **Phase 3** | 10V-C: Editorial primitives (8 new components) | 10h | Phase 2 |
| **Phase 4** | 10V-K: Macro widgets (CalorieRing + MacroBar) | 3h | Phase 2 |
| **Phase 5** | 10V-J: Shared chrome (FrostedHeader, TabBar, RecipeCard, ScreenHeader) | 5h | Phase 3 |
| **Phase 6** | 10V-D: Home screen editorial revamp | 8h | Phase 3, 4, 5 |
| **Phase 7** | 10V-E: Recipe detail editorial revamp | 6h | Phase 3, 4, 5 |
| **Phase 8** | 10V-F + 10V-G: Meal plan + cookbook refresh | 8h | Phase 4, 5 |
| **Phase 9** | 10V-H: Shopping list refresh | 3h | Phase 5 |
| **Phase 10** | 10V-I: Onboarding pastel flow | 3h | Phase 1, 2 |
| **TOTAL** | | **~52h** | |

---

#### 10V Tests (consolidated)

**Foundation tests**
- [x] `frontend/__tests__/foundations/typography.test.ts` — font loading, editorial presets, dual-font system
- [x] `frontend/__tests__/foundations/colors.test.ts` — pastel title contrast, new token existence
- [x] `frontend/__tests__/foundations/shadows.test.ts` — editorial shadow presets valid

**Primitive component tests**
- [x] `frontend/__tests__/components/ui/EditorialCard.test.tsx` — circular photo, serif title, pastel bg, save toggle
- [x] `frontend/__tests__/components/ui/PlateHeroCard.test.tsx` — plate overflow, gradient bg, deep shadow
- [x] `frontend/__tests__/components/ui/VerticalCategoryRail.test.tsx` — vertical text, active indicator, selection
- [x] `frontend/__tests__/components/ui/StatStrip.test.tsx` — 4-stat layout, serif numbers, negative margin overlap
- [x] `frontend/__tests__/components/ui/BlackPillCTA.test.tsx` — black bg, white text, spring press, disabled state
- [x] `frontend/__tests__/components/ui/StickyBottomBar.test.tsx` — absolute position, fade gradient, safe area
- [x] `frontend/__tests__/components/ui/IngredientRow.test.tsx` — icon + name + qty, checked state, toggle
- [x] `frontend/__tests__/components/ui/ServingStepper.test.tsx` — increment/decrement, min 1 guard
- [x] `frontend/__tests__/components/ui/UnitSegmentedControl.test.tsx` — black pill active, toggle behavior
- [x] `frontend/__tests__/components/ui/CalorieRing.test.tsx` — SVG ring, consumed/goal ratio, center label
- [x] `frontend/__tests__/components/ui/MacroBar.test.tsx` — progress width, label, value/goal, color

**Screen-level tests**
- [x] `frontend/__tests__/app/home.editorial.test.tsx` — greeting, editorial headline, hero plate card, category rail, widget row, picks grid, FAB (20 tests)
- [x] `frontend/__tests__/app/recipeDetail.editorial.test.tsx` — peach hero, serif title, plate photo, stat strip, ingredients, sticky CTA
- [x] `frontend/__tests__/app/mealPlan.editorial.test.tsx` — eyebrow + week number, italic "week", week strip + orange dot, macro budget on-track badge, golden calorie ring, macro bars, AUTO-PLAN link, meal slot cards
- [x] `frontend/__tests__/app/cookbook.editorial.test.tsx` — "YOUR" eyebrow, serif title with orange period, recipe/collection counts, collection chips + orange underline, "MOST COOKED" hero, "Recently saved" horizontal scroll + SORT link
- [x] `frontend/__tests__/app/shopping.editorial.test.tsx` — progress strip, category sections, item checkboxes, pantry badges
- [x] `frontend/__tests__/app/onboarding.editorial.test.tsx` — 3 pastel steps, progress dots, option chips, multi/single select

**Shared chrome tests**
- [x] `frontend/__tests__/components/ui/FrostedHeader.test.tsx` — mascot, brand text, frosted blur, action button
- [x] `frontend/__tests__/components/ui/ScreenHeader.test.tsx` — title size, subtitle, right slot
- [x] `frontend/__tests__/components/ui/TabBar.test.tsx` — 5 tabs, orange active, floating pill, frosted bg
- [x] `frontend/__tests__/components/ui/RecipeCard.test.tsx` — featured/grid/list variants, match color, save toggle

---

#### **10W: Weekly Cost Section — Real Estimates & Simpler Surface** 💰

> **Why:** the Weekly Cost card on Meal Plan currently flat-lines every meal at ~$7 (the default fallback when ingredient pricing is missing), so the section communicates nothing about actual budget impact and dilutes trust in the rest of the meal plan. The interface also stacks too many sub-cards (over-budget alert, under-budget chip, recommendations list, "Best Store" panel, top-10 per-meal bars) before the user has any reason to care, burying the lone insight that matters: *what does this week roughly cost me, and is that within range?*

**Goals**
- Replace the $7 default with per-ingredient estimates so cost actually varies by recipe.
- Cut the surface area of the card to a single glanceable summary; demote everything else behind a "Details" disclosure.
- Make the Optimize CTA only appear when it can do something meaningful (real overage, not fallback noise).

**Per-ingredient cost estimation**
- [x] Audit `recipe.cost`/`mealCosts` source — found legacy flat fallback in `costCalculator.ts:140` (difficulty=easy → $7, medium → $15, hard → $25). Replaced with `FALLBACK_REASONS` enum (`priced`/`category`/`unknown`) so callers can distinguish estimates from fallbacks.
- [x] Built per-ingredient price table — ~300 entries across proteins, produce, dairy, grains, beans, nuts, oils, condiments, spices, baking, frozen, snacks, broths, beverages in `backend/src/services/costEstimationService.ts`. Unmatched names fall through to 8 category tiers, never flat $7.
- [x] Unit-aware multiplier — `costForIngredient({name, quantity, unit})` returns `{cost, source}`. `toGrams()` handles cup/tbsp/tsp/oz/g/kg/lb/ml/l/each with per-ingredient density overrides (flour 0.53, oil 0.92, sugar 0.85). `1 cup flour ≈ 125g`, `1 tbsp olive oil ≈ 14g` verified by test.
- [x] Cache `recipe.estimatedCostPerServing` on the row — reused existing schema fields (`estimatedCost`, `estimatedCostPerServing`, `costSource` already present on Recipe; no migration needed). Lazy-persist on first read in `costTrackingController.getRecipeCost`. In-memory cache keyed by `recipeId::servings::ingredientHash` invalidates when ingredients change.
- [x] `COST_DISCLAIMER = 'Sazon estimates · prices vary by store'` exported from `costEstimationService.ts`; surfaced on the `GET /api/cost-tracking/recipes/:id/cost` payload alongside the new `costSource` field.
- [x] **Test:** `backend/__tests__/services/costEstimationService.spec.ts` (30 tests) + `backend/__tests__/modules/costTracking/costTrackingController.spec.ts` (2 tests) — all green; `costEstimationService.ts` line coverage 89.5%; full backend suite 1328/1328 pass.

**Simplified weekly cost card**
- [x] Single hero line: total weekly spend (large, bold) + "$X / day" eyebrow next to it. Drop the "Per Day" mini-stat block. ✅ Fraunces 38px hero with body-semibold "$X / day" eyebrow; "Per Day" mini-stat removed.
- [x] One status pill: green "On budget · $Y left" or amber "Over by $Z" — never both, never neither. Hide entirely when no budget is set. ✅ Mutually-exclusive pill, suppressed when `maxWeeklyBudget == null`.
- [x] Move the budget progress bar inline under the hero line (1 row, not its own section). ✅ 8px inline bar between hero and "See breakdown" row, no header/legend.
- [x] Collapse "Per-Meal Costs" + "Best Store" + "Recommendations" behind a single "See breakdown" link that pushes a full-screen sheet — keep the data, hide the noise. ✅ `BottomSheet` (90% snap, sheet radius 28) preserves all three panels.
- [x] Optimize CTA: only render when `costAnalysis.budgetExceeded > 0` AND we're confident in the estimate (i.e., not from fallback). Otherwise hide. ✅ Gated on `confidentEstimate` (fallback ratio ≤ 40%) using `BrandButton` variant `brand`. Removed duplicate Optimize from `EditorialSectionHeader` rightSlot.
- [x] **Test:** `frontend/__tests__/components/meal-plan/CostAnalysisSection.test.tsx` — when no budget set, no status pill renders; when over budget, only the amber pill renders + Optimize visible; when under, only green pill + no Optimize; "See breakdown" sheet preserves all per-meal/store/recommendation data. ✅ 8 cases passing.

**Honesty signals**
- [x] If >40% of meals in the week are missing real prices (still on fallback), the card should say "Cost estimates incomplete — add pantry items or import recipes with prices for better accuracy" instead of showing a confidently-wrong total. ✅ Banner with curious Sazon mascot + Pastel.peach tint replaces the dollar hero entirely above the 0.4 threshold.
- [x] **Test:** `frontend/__tests__/components/meal-plan/CostAnalysisSection.test.tsx` — when fallback-ratio > 40%, the incomplete-estimate banner appears in place of the dollar total. ✅ Covered by "fallback ratio > 40%" test case.

---

#### **10X: Build-a-Plate — Mix & Match Meal Composer** 🍽️🧩 ⭐ **FLAGSHIP / CORE DIFFERENTIATOR** *(Home Screen + Pantry)*

> ## 🚨 STRATEGIC NOTE — THIS IS THE MOAT
>
> **Build-a-Plate is the most important single feature in the entire roadmap.** Every other feature in Sazon — scoring, pantry, taste feedback, cuisine adjacency, meal plan, shopping list — was built as if "the recipe" is the unit of cooking. It isn't. Real cooking is *composition*: a protein, a base, veg, a sauce, riffed on nightly. **No competitor has this.** Mealime, Yummly, AllRecipes, Plate Jammer, Whisk — they all start from "pick a recipe." Even apps with a "build a bowl" feature do it as a static template, with no pantry awareness, no macro fit, no taste learning, no leftover continuity, no cuisine coherence engine. Sazon already has all four of those systems in production — the composer is the only feature that *uses them all at once.* That's what makes it a moat: a generic competitor can ship a slot picker in two weeks, but they can't ship the intelligence underneath without rebuilding 18 months of our infrastructure.
>
> **Re-positioning:** Sazon is no longer "an AI recipe app." Sazon is "the meal composer with AI brains underneath." The recipe database becomes *inventory* for the composer. The meal plan becomes a sequence of composed plates. Scoring, taste feedback, and cuisine adjacency teach the composer *which components* the user loves — much higher signal than per-recipe ratings. The pantry stops being a passive list and becomes the *engine* that drives nightly suggestions.
>
> **Strategic implications**
> - **App store positioning:** the screenshot, the App Store hero video, and the home-screen "first run" experience should all lead with Build-a-Plate. Not the recipe feed.
> - **Onboarding:** new users should compose a plate before they ever scroll a recipe. It's the fastest path to "I get it."
> - **Pricing:** Build-a-Plate is a premium-tier feature (free tier gets 3 plates/week). The composer + saved-plate library is the strongest paywall lever we have because it scales linearly with engagement.
> - **Retention:** users return for "tonight's plate" the way Duolingo users return for streaks. The daily seed is the retention hook.
> - **Marketing copy:** "Your pantry is the menu." / "Stop picking recipes. Start composing meals." / "What if your kitchen wrote your dinner?"
> - **Roadmap reordering:** before launch, 10X must be feature-complete + polished. Every other Group 10 feature is supporting cast.
>
> **How to apply:** treat 10X as a P0 launch blocker. Group 11 (recipe DB) feeds 10X with components. Group 10F (taste rating) extends to slot-level affinity. Group 10G (macro flexibility) becomes the auto-fit input. Group 10H ("what can I make right now") collapses into 10X's pantry-only mode. Group 10I (skill progression) gates the slot count. Group 10R (food intel) drives the swap-chip tooltips. Build everything *as if* 10X is the surface they all serve.

> **Why (origin story):** real cooking rarely starts from a single recipe — it starts from "I have salmon, do I want it with rice or farro? What veg goes with it? What sauce should I make?" Today Sazon only suggests fully-formed recipes. Power users (the people who already cook regularly) want a composer: pick a protein, pick a base, pick veg(s), pick a sauce — see the macros, the pantry coverage, and a one-screen plate preview update live. This unlocks the long tail of "I just want dinner tonight" without forcing them into the meal-plan flow, and turns the pantry from a passive list into the *engine* that drives suggestions ("you already have bell peppers, spinach, lemon, greek yogurt — here's a complete plate using only what's in your kitchen").

**Goals**
- Let the user assemble a single meal from interchangeable component slots (Protein, Base/Grain, Vegetables, Sauce, optional Garnish) with curated options per slot.
- Sort and highlight options by pantry coverage so "what's already in your kitchen" wins over "you need to shop for this."
- Live macro + cost recalculation as the user swaps components; live shopping-list delta for anything missing.
- Save composed plates to cookbook as a user-created recipe (slot metadata preserved for re-edit) and/or push to today's meal plan.
- Surface curated permutations ("People who picked salmon + farro also tried…") to help users explore variations without analysis paralysis.

**Component data model (backend)**
- [x] **`MealComponent` table** — Prisma model with `id`, `slot`, `name`, `description`, `defaultPortionGrams`, `caloriesPerPortion`, `proteinG`, `carbsG`, `fatG`, `fiberG`, `estimatedCostPerPortion`, `cuisineTags`, `dietaryTags`, `cookMethodHint`, `pantryIngredientNames`, `imageUrl`, `isUserCreated`, `userId?`. ✅ Schema pushed via `npx prisma db push`; 125-row seed in `backend/prisma/seedMealComponents.ts` (`npm run seed:meal-components`, idempotent upsert on stable slug ids). Counts: 25 proteins / 15 bases / 50 vegetables (incl. combos) / 25 sauces / 10 garnishes.
- [x] **`ComposedPlate` table** — `id`, `userId`, `name?`, `componentIds` (JSON), `totalCalories/Protein/Carbs/Fat`, `totalCost`, `pantryCoveragePercent`, `recipeId?`, `createdAt`. ✅ Auto-generates `Salmon + Brown Rice + …` name when none provided; `saveAsRecipe: true` creates a `Recipe` (source `user-composed`, isUserCreated true, ingredients = union of pantryIngredientNames, instructions auto-stitched per `cookMethodHint`) and inserts a `SavedRecipe` row.
- [x] **`GET /api/meal-components?slot=&dietary=&cuisine=&q=`** — ✅ Wired in `backend/src/app.ts`. Zod-validated query, case-insensitive tag/text matching, attaches `pantryCoveragePercent` per component. Auth-gated.
- [x] **`POST /api/meal-components/permutations`** — ✅ Phase 2 complete. Cartesian product across `slotsToFill`, cuisine coherence filter (`cuisineCoherence.ts` clash table), dietary restriction filter from user record, scoring (pantryWeight × coverage + 0.4 × coherence + macroWeight × macroFit), sorted desc, clamped 1–20. Also wires `GET /api/meal-components/plate-from-pantry` → `getPlateFromPantry()`. 19 coherence tests + 10 service tests (permutations + pantry) + 9 controller tests all green. `cuisineCoherence.ts` 100% coverage; `mealComponentService.ts` 91.66% stmts; controller 98.27%.
- [x] **`POST /api/composed-plates`** — ✅ Returns `{ plate, recipe? }`; zod-validated body; 401 on unauth, 400 on empty/invalid components or missing referenced componentId, 201 on success.
- [x] **Test:** ✅ `backend/__tests__/services/mealComponentService.test.ts` (20 cases: pantry coverage incl. 66.7%, list filter combinations, totals math, saveAsRecipe creates Recipe + cookbook entry, name auto-generation, seed integrity 125 / 25-15-50-25-10). `backend/__tests__/modules/mealComponent/mealComponentController.test.ts` (11 cases: 401 unauth, zod 400s, plate persistence, optional recipe creation, 500 fallback). New service+controller files at 92-95% line coverage. Permutations / kimchi+chimichurri coherence test deferred to Phase 2.

**Build-a-Plate screen (frontend)**
- [x] **New route `/build-a-plate`** — full-screen composer with 5 stacked slot rows (Protein, Base, Vegetables, Sauce, Garnish optional). Each row shows the currently-selected component as an editorial pastel card (image + name + portion + macro chips) or an empty "+ Pick a [slot]" CTA. Tapping a row opens a horizontal pastel-tinted picker sheet showing all options for that slot, sorted by pantry coverage descending (pantry items get a green sage tag "✓ In your pantry"), with chips for dietary/cuisine filters at the top.
- [x] **Live plate preview** — sticky bottom panel ("the plate") shows a circular composed visualization (concentric rings: protein in center, base ring, veg ring, sauce drizzle indicator) plus a row of macro pills (cal · pro · carb · fat) that animate (`withSpring`) on every swap. Pantry coverage % shows as a sage progress ring on the right.
- [x] **"Roll the dice" button** — tap to randomize unlocked slots. Long-press locks/unlocks the current slot (locked slots get an orange pin icon and survive the next roll). Haptic medium impact + spring animation on each component swap.
- [x] **Permutation explorer** — ✅ `PermutationCarousel` renders below PlatePreview when composer has ≥1 filled slot. Shows up to 6 alternative plates (4 slot circles + macro line + pantry % badge). Tapping a card calls `composer.applyPermutation()` which swaps all unlocked slots in one motion. Carousel hides when API returns empty. `mealComponentApi.permutations()` added to `frontend/lib/api.ts`.
- [x] **Save & cook actions** — bottom action bar with three pills: `Save to Cookbook` (BrandButton sage variant) → posts to `composed-plates` with `saveAsRecipe: true`, redirects to recipe detail; `Cook Now` (BrandButton brand variant) → adds to today's meal plan as a custom meal AND opens cooking mode; `Add Missing to List` (BrandButton golden variant, only visible when pantry coverage < 100%) → pushes the missing ingredients onto the active shopping list.
- [x] **Pantry-only mode toggle** — chip at top of the screen ("Cook with what I have"). When enabled, all slot pickers filter to components with ≥80% pantry coverage. If a slot has no qualifying option, the chip surfaces a "1 missing ingredient" hint instead of going empty.
- [x] **Test:** `frontend/__tests__/app/build-a-plate.test.tsx` — initial render shows 4 empty slot CTAs (Garnish optional and collapsed) ✅; tapping a slot opens the picker ✅; selecting a component updates the live macro pills via spring animation ✅; Roll-the-dice swaps unlocked slots only (covered in `useBuildAPlate.test.ts`) ✅; locked slot shows pin icon ✅; pantry-only mode hides components with <80% coverage ✅; Save calls `composedPlateApi.save` with the right payload ✅. `frontend/__tests__/components/build-a-plate/PlatePreview.test.tsx` — concentric ring layout renders ✅; macro pills update on prop change ✅; pantry coverage ring fills proportionally ✅. Hook unit tests in `frontend/__tests__/hooks/useBuildAPlate.test.ts` cover roll-unlocked / lock-toggle / totals math.

**Pantry integration**
- [x] **"Build a plate from your pantry" CTA** — on `pantry.tsx`, above the "Recipes you can make right now" list, add a colorful editorial card ("WHAT YOU HAVE IS ENOUGH" eyebrow + "Build a *plate*." serif title + sage CTA) that deep-links to `/build-a-plate?pantryOnly=true`. The composer opens with pantry-only mode pre-enabled and the highest-pantry-coverage protein pre-selected.
- [x] **Component-aware pantry suggestions** — ✅ `getPlateFromPantry({ userId })` in `mealComponentService.ts` filters all four slots (protein/base/vegetable/sauce) to ≥80% pantry coverage, runs cartesian product, excludes clashing combos, scores 0.6×pantry + 0.4×coherence, returns the best deterministic candidate (sorted by id for tie-breaking) or `null`. Exposed via `GET /api/meal-components/plate-from-pantry`. `mealComponentApi.plateFromPantry()` added to `frontend/lib/api.ts`. `useTonightsPlate` hook caches result 30 min (AsyncStorage key `tonights_plate_cache`). `PantryPlateHeroCard` renders between hero + macro widgets in `EditorialHomeLayout` when plate is non-null.
- [x] **Test:** `frontend/__tests__/app/pantry.test.tsx` — pantry CTA renders when pantry has ≥4 items spanning multiple slots ✅; deep-links to `/build-a-plate?pantryOnly=true` ✅; "complete-plate detected" home card renders when `getPlateFromPantry()` returns a coherent permutation ✅ (`PantryPlateHeroCard.test.tsx` — title, subtitle, slot icons, macro line, nav params, AsyncStorage write, a11y label all green). `useTonightsPlate.test.ts` — mount call, cache hydration, stale cache re-fetch, refetch bypass, null plate, error state all green.

**Permutation playfulness**
- [x] **"What if?" quick swaps** — ✅ `SwapStrip` component renders below each selected slot. Horizontal strip of top-3 alternatives sorted by pantry coverage desc. Tap → `onSwap(componentId)` + light haptic + spring scale. Long-press → `MacroDeltaTooltip` overlay with cal/protein delta (e.g. "Farro → Brown Rice: +12 cal, –2g protein"), auto-dismisses 3s or on tap.
- [x] **Daily seed** — ✅ `useDailyPlateSeed` hook: stable within a calendar day (keyed by YYYY-MM-DD in AsyncStorage `daily_plate_seed`). Fetches via permutations endpoint once per day. Avoids yesterday's protein (persists last protein id under `daily_plate_seed_yesterday_protein`). Reroll = re-fetch + medium haptic. `?seed=beginner` triggers beginner permutation fill + one-time tutorial overlay (dismissed with `beginner_tutorial_seen` flag). `PermutationCarousel` renders below PlatePreview when ≥1 slot is filled; hides when API returns empty.
- [x] **Test:** ✅ `frontend/__tests__/components/build-a-plate/SwapStrip.test.tsx` — strip shows top 3 alternatives ranked by pantry coverage; long-press surfaces the macro delta tooltip with correct cal/protein delta; tap triggers `onSwap(componentId)` with haptic; empty alternatives renders nothing. `frontend/__tests__/components/build-a-plate/PermutationCarousel.test.tsx` — renders nothing on empty API; renders N cards; tap card calls onApply; passes correct body to API. `frontend/__tests__/hooks/useDailyPlateSeed.test.ts` — seed stable within a day (no re-fetch on remount); fetches fresh when stale; reroll fetches once; avoids yesterday's protein; isStale correct. `frontend/__tests__/app/build-a-plate.test.tsx` — seed=beginner fills slots + shows tutorial overlay once; overlay dismisses on tap + sets AsyncStorage flag; flag prevents re-show.

**Saved plate management**
- [x] **"My Plates" section in cookbook** — composed plates appear under a `composed` Smart Collection alongside other recipes; tapping a saved plate opens a hybrid view that's part recipe (instructions stitched together by cookMethodHint per slot) and part composer (an "Edit composition" button re-opens `/build-a-plate?plateId=X` with all slots pre-filled and locked-as-edited). ✅ Backend: `composed` Smart Collection definition + `buildUserScopedFilter('composed', userId)` filters `source: 'user-composed'` recipes already tagged by `saveComposedPlate`. Hybrid recipe/composer view UI deferred (frontend).
- [x] **Re-roll a saved plate** — from the saved plate's recipe detail, a small "Vary this plate" button generates 3 variations (swap one slot at a time) so users can quickly riff on a hit ("loved the salmon + farro + carrots + yogurt sauce — what if I try chicken instead?"). ✅ Backend: `composedPlateVariationService.generatePlateVariations` (IDOR-guarded, count clamped [1, 5], skips slots with no alternatives, recomputes totals) + `GET /api/composed-plates/:id/variations`. Frontend "Vary this plate" button deferred.
- [x] **Test:** `backend/__tests__/services/composedPlateVariationService.test.ts` — 8 tests: variations differ by exactly 1 slot, ≥3 of 4 components retained, swappedSlot/From/To metadata, totals recomputation, IDOR, count clamp, no-alternatives skip. `backend/tests/services/smartCollectionsService.test.ts` — 3 new tests for the `composed` Smart Collection (filter, definition, suggestion exclusion). `backend/__tests__/modules/mealComponent/mealComponentController.test.ts` — 6 controller tests for the variations endpoint.

**Onboarding integration (P0 — wire in Phase 1, not later)**
- [x] **"Build your first plate" onboarding step** — add a single composer-introduction step to the onboarding flow that opens the composer pre-seeded with a beginner plate suggestion (pantry-only OFF for first run; one tap of "Roll the dice" populates all slots). One successful compose = the user understands the entire product. If we ship 10X Phase 1 without touching onboarding, retrofitting it later costs ~3× more in onboarding A/B churn. New users should *compose a plate before they ever scroll a recipe*.
- [x] **Skip vs. Compose CTA** — primary BrandButton sage variant "Build my first plate" + secondary ghost "Skip for now". Skipping does NOT block onboarding completion but logs a `skipped_first_plate` event so we can measure conversion.
- [x] **Test (partial):** `frontend/__tests__/app/onboarding.test.tsx` — "Build your first plate" step renders after profile setup, before home ✅; tapping primary CTA opens composer with beginner seed pre-filled ✅; tapping skip emits `skipped_first_plate` analytics event and advances to home ✅; completing a compose marks `firstPlateComposedAt` on the user record (deferred — composer callback owned by another agent). `backend/__tests__/services/userService.test.ts` — `firstPlateComposedAt` persists; analytics event fires once per user (deferred — backend agent scope).

---

### **10X — Value Expansion: Beyond the MVP**

> The MVP above ships the slot picker. The features below are what turn the composer from "a cool tool" into "the reason people pay." Each one compounds: leftover continuity multiplies the value of last night's plate, slot-level affinity multiplies the value of every taste rating, parallel cook timing multiplies the value of every recipe in the database. **Implementation order is in 10X-Order at the bottom of this section.**

**Leftover continuity (the "Tuesday → Wednesday" pattern)**
- [x] **Leftover-aware composer** — when the user marks a meal "cooked" with portions remaining, the leftover components (cooked salmon, leftover farro, half the roasted veg) flow into a `leftoverInventory` table with TTLs (proteins: 3 days, grains: 5 days, raw veg: 5 days, cooked veg: 3 days, sauces: 7 days). Next time the composer opens, those slots highlight in a "From last night" sage-tinted strip at the top of each picker, ranked above pantry items. Cooking from a plate that uses ≥1 leftover component decrements the leftover quantity automatically. ✅ Backend: `LeftoverInventory` Prisma model + `leftoverInventoryService` (TTL map, addLeftoversFromPlate, getActiveLeftovers, decrementLeftover, consumeLeftoversForPlate) + `GET /api/leftover-inventory` + `POST /api/composed-plates/:id/mark-cooked`. Frontend strip deferred.
- [x] **"Stretch last night" home card** — if `leftoverInventory` contains ≥2 components from yesterday's plate, surface a hero card on the home screen: "Stretch last night's plate." Tapping opens the composer with leftover slots pre-locked and only the missing slots unfilled (e.g. swap last night's hot grain bowl into today's cold grain salad with a new sauce). Targets food-waste reduction as a marketable health/sustainability angle. ✅ `StretchHomeCard` + `useLeftoverInventory` shipped; renders only when ≥2 leftovers and not dismissed today (per-day AsyncStorage flag); CTA opens `/build-a-plate?leftoverMode=true`.
- [x] **Test:** `backend/__tests__/services/leftoverInventoryService.test.ts` — marking a plate cooked with leftovers persists the right components with correct TTLs; expired leftovers are filtered out of suggestions; cooking from a leftover-containing plate decrements quantity correctly. `frontend/__tests__/components/build-a-plate/LeftoverStrip.test.tsx` — strip renders only when `leftoverInventory.length > 0`; renders sage tint with "From last night" eyebrow; tapping a leftover component locks the slot. (frontend strip deferred)

**Technique variants (same component, different cook method)**
- [x] **`MealComponentVariant` table** — one component (e.g. "carrots") has multiple variants: `roasted_carrots`, `steamed_carrots`, `raw_carrot_ribbons`, `pickled_carrots`. Each variant carries its own `cookTimeMinutes`, `caloriePerPortion` delta (roasting in oil adds calories), `equipmentNeeded` (oven / stovetop / none), `flavor_profile` (sweet/charred/crunchy/tangy), and `compatibility_score` per protein/sauce pair (charred carrots + chimichurri = 0.9, raw ribbons + chimichurri = 0.5). ✅ Backend: `MealComponentVariant` Prisma model + `mealComponentVariantService` (`listVariantsForComponent`, `getCompatibleVariants` with multi-slot averaging + alpha tiebreak, `computeVariantMacros` with negative-delta clamp). 13 service tests green. Frontend variant chip row deferred — tracked at line 3010.
- [x] **Variant chip in the picker** — selecting a component shows a row of method chips ("Roasted • Steamed • Raw • Pickled") with the most-compatible-with-locked-slots variant pre-selected. Picking a less-compatible variant surfaces a soft "Sazon hint": "Most people pair raw carrots with creamy sauces — yogurt sauce works." ✅ `VariantChips` component shipped + mounted in `SlotPicker` for chef tier. Backend `:id/variants` endpoint pending.
- **Test:** `backend/__tests__/services/componentVariantService.test.ts` — variant compatibility scoring correctly ranks roasted+chimichurri above raw+chimichurri; variant macros differ from base (roasted has +olive oil calories); variant cookTime drives the parallel-cook timer. `frontend/__tests__/components/build-a-plate/VariantChips.test.tsx` — chips render in compatibility order; pre-selects highest-scored variant; tapping a low-compat variant shows the hint banner.

**Parallel cook orchestration (one-screen kitchen timer)**
- [x] **Cook timeline solver** — `cookTimelineService.ts` + `POST /api/composed-plates/:id/timeline`. Longest-task-first scheduling; equipment-conflict detection (oven:1, stovetop_burner:2 defaults); `slipMinutes` re-pace; 98.3% coverage. ✅
- [x] **"Cook this plate" timeline UI** — when user taps `Cook Now`, instead of dropping into recipe-style instructions, the cooking screen shows a horizontal Gantt-style timeline that ticks down. Each component has its own row that lights up when active; haptic ping at every event boundary. Users see the *whole plate at once*, not "step 1 of 12." ✅
- [x] **Re-pace mid-cook** — if the user is running 5 min behind schedule, a "Slip everything 5 min" button shifts the entire timeline forward; the salmon event recalculates so the plate still finishes in sync. ✅
- [x] **Test:** `backend/__tests__/services/cookTimelineService.test.ts` — 13 cases: farro-first scheduling, ±2 min finish window, equipment-conflict detection, slip shifting, zero-time plate events, empty input, single-task. Controller: 401/404/200/500. All green. ✅ `frontend/__tests__/app/cook-timeline.test.tsx` — 6 cases: fetch on mount, row-per-component, 404 graceful empty, Sazon copy, slip call, Done→back. `frontend/__tests__/components/cook-timeline/GanttTimeline.test.tsx` — 8 cases. `frontend/__tests__/hooks/useCookTimelineTicker.test.ts` — 7 cases. `frontend/__tests__/app/build-a-plate.test.tsx` — Cook Now fork: plate.id→/cook-timeline, fallback→/cooking. All 38 frontend tests green. ✅

**Slot-level taste affinity (component-grain learning loop)**
- [x] **`SlotAffinity` table** — `{userId, componentId, slot, score, sampleCount}`. Updated on every plate save (+0.1), every plate cooked (+0.2), every plate rated 4★+ (+0.3), every plate rated 1–2★ (–0.4), every "swap away" mid-composition (–0.05). After 10+ samples per slot, the composer's default sort is no longer "pantry coverage descending" but "affinity × pantry coverage." `PairAffinity` table co-located. Both models in Prisma schema; `npx prisma db push` applied. ✅
- [x] **Pair affinity** — `PairAffinity {userId, componentIdA, componentIdB, score}` learns which combinations the user loves (yogurt sauce + white fish, chimichurri + steak). Drives permutation ranking (0.1× normalized pair bonus above 10-sample threshold). `GET /api/meal-components/affinity?slot=X` exposes favorites for frontend picker chip. ✅
- [x] **Visible affinity hints** — on the picker, components the user has rated 4★+ recently get a small "❤️ Your favorite" chip; components they swiped away repeatedly get demoted but never hidden (Sazon doesn't make decisions for the user). ✅
- [x] **Test:** `backend/__tests__/services/slotAffinityService.test.ts` — 23 cases: affinity score updates per event type (save/cook/rate/swap_away); pair affinity for every unordered pair; sampleCount < 3 excluded from favorites; score clamped to [-2, +2]. `backend/__tests__/services/mealComponentService.test.ts` (extended) — 3 affinity cases: below-threshold unchanged, above-threshold favorite ranks first, pair affinity boosts co-loved pairs. `backend/__tests__/modules/recipe/recipeAffinityWiring.test.ts` — 7 cases: plate_cooked fires for user-composed cook; plate_rated fires for 5★/1★; skips for non-composed / 3★ / DB errors. All 1451 tests green. ✅ `frontend/__tests__/hooks/useFavoriteComponents.test.ts` — 6 cases: affinity fetched once on mount, favoriteIds/scoresById populated, error returns empty, loading flag, cache hit skips re-fetch, different slot fetches fresh. `frontend/__tests__/components/build-a-plate/SlotPicker.test.tsx` — 6 cases: favorite chip renders/hides correctly, affinity sort (favorites bubble within ties, name tiebreak, pantry coverage still primary). `frontend/__tests__/hooks/useBuildAPlate.test.ts` (extended) — 3 cases: onSwapAway fires on replace, not on first pick, not on clear. `frontend/__tests__/app/build-a-plate.test.tsx` (extended) — 2 cases: swapAway API called with prev id on replace, not called on first pick. ✅

**Macro auto-fit (composer as nutrition coach)**
- [x] **"Fit my macros" button** — given the user's macro goals minus what they've already eaten today, the composer auto-selects portion multipliers and component swaps to land within ±10% of remaining calories AND ≥85% of remaining protein. Visual feedback: macro pills shift from neutral grey → green as the plate fits the gap; pill turns amber if no swap can hit the gap (e.g. user has 200 cal left but needs 50g more protein — physically impossible). ✅ Backend solver (`macroAutoFitService.ts`) + `POST /api/composed-plates/auto-fit` shipped. Frontend UI (pill colors, portion stepper) deferred to Phase 5 frontend agent.
- [x] **Portion multiplier slider** — every selected component has a discreet "×0.5 / ×1 / ×1.5 / ×2" portion stepper. Macros recompute live. Lets users scale up the protein without rebuilding the plate. ✅ `PortionStepper` shipped + integrated; `useBuildAPlate.computeTotals` honors per-slot multipliers.
- [x] **Test:** `backend/__tests__/services/macroAutoFitService.test.ts` — given remaining macros (500 cal, 35g protein) + locked salmon, fit picks portion + base + sauce that lands within ±10%; impossible targets return `{achievable: false, gap: {...}}`. ✅ 11 service tests + 6 controller tests (401/400/200/400-IDOR/500) all green. 97.7% statement coverage on new file. `frontend/__tests__/components/build-a-plate/MacroFitButton.test.tsx` — pill colors transition correctly on macro fit; portion stepper updates total calories live. (deferred — frontend agent)

**Family mode (multiple plates, one cook session)**
- [x] **Multi-plate composer** — toggle "Cook for the family" → composer expands to N plate columns (default 2, max 6), each with independent slot selections. Components shared across plates (e.g. roasted carrots in 3 plates) only need to be cooked once; the cook-timeline solver merges shared steps into a single event with multi-plate portion math. ✅ Backend: `familyMealService.mergeSharedCookSteps` + `buildFamilyMeal` + `POST /api/composed-plates/family`. Frontend N-column UI deferred.
- [ ] **Shared base, divergent plates** — common pattern: kid plate (pasta + chicken + plain veg + butter), adult plate (farro + salmon + roasted veg + yogurt sauce). The composer surfaces this as a one-tap "Diverge from a shared base" template. Saves as one `ComposedFamilyMeal` row referencing N plates. **Reads `householdRoster` (per-member ages, dietary flags, pickiness, prior plate ratings); writes per-member `SlotAffinity` keyed by `householdMemberId` so the kid plate adapts to *this* kid's accepted components, not a generic kid template.**
  > **N=1 sharpening:** "Kid plate" as a static template is the antipattern. Each household member is their own N=1 — a picky 6-year-old and a teenager who eats anything need different defaults. Schema add: `HouseholdMember` model + `SlotAffinity.householdMemberId` foreign key.
- [x] **Test:** `backend/__tests__/services/familyMealService.test.ts` — shared component is cooked once, portioned across plates; cook timeline merges shared events; total calorie calc is per-plate, not summed. `frontend/__tests__/app/build-a-plate-family.test.tsx` — N-column layout renders; toggling shared base auto-fills the base slot in all plates. (frontend deferred)

**Voice composition (talk to your kitchen)**
- [x] **`POST /api/build-a-plate/from-utterance`** — accepts a free-text utterance ("salmon, something Mediterranean, roast some veg, yogurty sauce, no garlic") and returns a pre-composed plate via slot inference: protein → salmon, cuisine filter → Mediterranean, vegetable cookMethodHint → roast, sauce flavor → creamy/yogurt-based, dietary exclude → garlic. Reuses the existing voice transcription pipeline from Group 1. ✅ Shipped as `POST /api/composed-plates/from-utterance` (`utteranceComposerService.composePlateFromUtterance`).
- [x] **"Compose by voice" home shortcut** — long-press the home tab to start a voice utterance; on stop, the composer opens pre-filled with the inferred slots. Pairs naturally with 10X's locked-slot UX so users can refine after. ✅ `VoiceComposerModal` mounted in `(tabs)/_layout.tsx`; long-press on home tab triggers medium haptic + opens modal; `useVoiceInput` hook auto-starts STT (with text-input fallback for Expo Go); on submit calls `composeFromUtterance` and routes to `/build-a-plate?plateId=…`.
- [x] **Test:** `backend/__tests__/services/utteranceComposerService.test.ts` — utterance "chicken, brown rice, roasted broccoli, peanut sauce" infers all 4 slots correctly; "something Mediterranean with chicken" infers cuisine filter + protein + leaves 2 slots open; ambiguous utterances ("just dinner") return an empty plate without crashing.

**Social — saved plates as the share unit**
- [x] **Public plate links** — every saved plate gets a shareable deep link `sazon.app/plate/<slug>`. Tapping the link in another user's app opens the composer pre-filled with the shared plate's components, but their pantry adjusts substitutions ("They used farro — you have brown rice, swap?") and their dietary profile filters incompatible components. ✅ Backend: `PlateShare` + `PlateSave` Prisma models, `plateShareService` (createShareLink, getPlateBySlug, adaptComponentsToUser, savePlateForUser), `POST /api/composed-plates/:id/share`, `GET /api/shared-plates/:slug`, `POST /api/composed-plates/:id/save`. Frontend deep-link routing deferred.
- [ ] **"Cook a friend's plate" feed** — opt-in social section on the home screen showing recent plates from people the user follows. Each plate card is a one-tap path into the composer. **Rank cards by *this* user's pantry coverage of the friend's plate + dietary compatibility + slot-affinity overlap + skill-tier match — NOT chronological.** Card copy surfaces the personalized angle: "Marcus made this — and you have 5/6 ingredients" or "Priya cooked this last night — fits your protein gap."
  > **N=1 sharpening:** A chronological friend feed is a generic social timeline; rank by personalization signal so the same friend's plate is surfaced to one user as "perfect for tonight" and to another as "you're missing 4 ingredients." Write `friend_plate_cooked` event back into taste model so cooking from the feed boosts that friend's similarity weight. — Sazon picks the most-saved community plate each week and surfaces it as an editorial card on the home screen, anonymized but tagged by region/cuisine. ✅ Backend: `getPlateOfTheWeek()` (rolling 7d window, groupBy plateId DESC) + `GET /api/composed-plates/of-the-week`. Editorial card UI deferred.
- [x] **Test:** `backend/__tests__/services/plateShareService.test.ts` — share link generates a stable slug; opening a link in another account adapts components to their pantry/dietary; plate-of-the-week query returns top-saved plate from the past 7 days. (frontend deep-link tests deferred)

**Micronutrient & dietary gap-filling**
- [x] **Daily gap detector** — backend service tracks rolling 7-day intake of fiber, omega-3, vitamin D, iron, magnesium (start with these 5; expand later). When the composer opens, slots get a soft "boost" on components that fill the user's biggest gap of the day. UI: a sage badge on the relevant component ("⚡ +8g fiber" on lentils when fiber is low this week). ✅ Backend: `nutrientGapService` (computeNutrientGap, rankComponentsForGap, TARGET_DAILY_NUTRIENTS). UI badge deferred.
- [x] **"Eat the rainbow" hint** — if the user has cooked ≥4 plates without any green vegetables this week, the composer's vegetable picker surfaces a gentle nudge ("You haven't had greens this week — spinach + broccoli are in your pantry"). No moralizing; one-line copy, dismissible. ✅ `RainbowHint` shipped — guards on `shouldShowRainbowHint(greenVegCount, totalPlates)` predicate, AsyncStorage 7-day dismissal, mounts only above the Vegetable picker.
- [x] **Test:** `backend/__tests__/services/nutrientGapService.test.ts` — given 7 days of meal history with low fiber, fiber-rich components surface in the boost list; gap detection ignores days >7 ago. (frontend tests deferred)

**Skill-tier progression (composer grows with the user)**
- [x] **Beginner / Cook / Chef tiers** — gated by 10I cooking skill progression. Beginner sees 3 slots (Protein, Base, Veg) with the simplest 30 components per slot. Cook tier unlocks the Sauce slot + 60 more components. Chef tier unlocks the Garnish slot + technique variants + portion multipliers + parallel cook timeline. Tier auto-promotes after N plates cooked. ✅ Backend: `skillTierService` (computeSkillTier, visibleSlotsForTier, filterComponentsByTier, thresholds: cook=5, chef=20) + `GET /api/meal-components/skill-tier`.
- [x] **"Try this technique" weekly challenge** — each week the composer surfaces one new technique (caramelizing onions, deglazing a pan, blooming spices). Cooking a plate that uses the technique unlocks an XP boost in the skill ladder. Reuses 10I's progression UI. ✅ `TechniqueChallengeBanner` shipped at top of composer; per-week dismissal via `technique-banner-dismissed-{ISO-week}` AsyncStorage key. XP boost wiring still backend-side TBD.
- **Test:** `backend/__tests__/services/skillTierService.test.ts` — tier auto-promotes after threshold met; sauce slot is hidden in beginner tier; chef tier unlocks variant chips. `frontend/__tests__/app/build-a-plate-skill.test.tsx` — beginner UI hides sauce slot; chef UI shows technique chip; weekly challenge banner renders once per week.

**Cost-aware optimization**
- [x] **"Hit my budget" composer mode** — given today's remaining grocery budget (from 10W) the composer auto-prefers cheaper variants per slot (frozen veg over fresh, chicken thigh over salmon, dried beans over pre-cooked). User can toggle off. Cost pill on the plate shows estimated cost vs. remaining budget. ✅ Backend: `budgetAwareComposerService.rankByBudgetFit` + `totalCostForComponents`. UI toggle deferred.
- [x] **"Most-of-pantry" tiebreaker** — when two permutations have equal coherence + affinity scores, the one that uses MORE pantry items wins. Drives food-waste reduction without the user having to think about it. ✅ Backend: `budgetAwareComposerService.pantryTiebreaker` (epsilon-based score equality + pantry count DESC).
- [x] **Test:** `backend/__tests__/services/budgetAwareComposerService.test.ts` — given a $5 remaining budget, composer picks cheaper variants and total cost stays under; toggling off reverts to default ranking; pantry tiebreaker fires on equal-score permutations.

**Restaurant export — "Build your own" template**
- [x] **Export plate as menu template** — saved plates can be exported as a PDF "build-your-own" menu (Sazon-branded), suitable for sharing as a printable family meal-plan or a casual dinner-party menu. Each slot becomes a column ("Pick a protein… Pick a base… Pick a sauce…") with the user's saved variants as the options. Ties into Group 12 marketing — power users sharing PDFs is organic growth. ✅ Frontend `PlateMenuExportButton` (expo-print + expo-sharing); backend service still deferred — composed-plate JSON drives the PDF directly.
- **Test:** `backend/__tests__/services/plateMenuExportService.test.ts` — export produces valid PDF with user's components in column layout; respects user's branding settings; redacts private fields. *(deferred)*

---

#### **10X-Deferred — Frontend & UX punch list** ⏸️

> Backend for 10X Phases 1–9 is shipped. The items below are the frontend/UX surfaces the user-facing app needs to expose those backends. Pick up in a dedicated frontend session — none block backend work.

**Phase 1+2 (composer enhancements)**
- [x] **"My Plates" cookbook section** — backend smart-collection filter shipped. ✅ UI: `SmartCollectionCard` now ships an editorial sage tint when `id === 'composed'`; `app/recipe/[id].tsx` renders the hybrid recipe/composer view with "BUILT FROM" chips + Edit composition button → `/build-a-plate?plateId=X`. *(2916)*
- [x] **"Vary this plate" button** — backend `GET /api/composed-plates/:id/variations` shipped. ✅ UI: lavender BrandButton on saved user-composed recipe detail opens `PlateVariationsSheet` (bottom sheet) showing 3 swap cards; tap a variation routes to `/build-a-plate?plateId=…`. *(2917)*

**Phase 5 (Macro auto-fit) — backend ✅, frontend ✅**
- [x] **"Fit my macros" pill** — green when fit, amber when impossible (calls `POST /api/composed-plates/auto-fit`). ✅ `MacroFitButton` mounted in composer header (idle → loading → fit/impossible state machine); `useBuildAPlate.applyAutoFit` applies portions + components in one motion with success haptic.
- [x] **Portion multiplier stepper** — discreet ×0.5/×1/×1.5/×2 per component with live macro recompute. *(2955)* ✅ `PortionStepper` rendered under each selected slot row; `computeTotals` multiplies macros + cost by per-slot multiplier and re-renders the spring-animated PlatePreview.

**Phase 6 (Leftover continuity) — backend ✅, frontend ✅ (partial)**
- [x] **"From last night" sage strip** in each picker, ranked above pantry items (calls `GET /api/leftover-inventory`). ✅ `LeftoverStrip` shipped + mounted in `SlotPicker`; tap auto-locks the slot. Composer pre-fetches leftovers per slot on mount.
- [x] **"Stretch last night's plate" home card** when ≥2 components from yesterday survive. Tap → composer with leftover slots pre-locked. *(2933)* ✅ `StretchHomeCard` mounted in home screen below `EditorialHomeLayout`; per-day dismiss flag (AsyncStorage `stretch-card-dismissed-YYYY-MM-DD`); CTA → `/build-a-plate?leftoverMode=true`.
- [x] **`MealComponentVariant` table + variant chip row** ("Roasted • Steamed • Raw • Pickled") with compatibility-ranked default. *(2937, 2938)* ✅ `VariantChips` shipped — auto-sorted by compat, pre-selects highest, soft Sazon hint banner for low-compat picks; mounted in `SlotPicker` for chef tier. Backend `:id/variants` endpoint pending.

**Phase 7 (Family + voice) — backend ✅, frontend ⏸**
- [ ] **Multi-plate column UI** — "Cook for the family" toggle expands composer to N plate columns (default 2, max 6); `POST /api/composed-plates/family`.
- [ ] **"Diverge from a shared base" template** — kid-vs-adult plate one-tap. *(2960)*
- [x] **Long-press home tab → voice composer** — pipes utterance into `POST /api/composed-plates/from-utterance`. *(2965)* ✅ `VoiceComposerModal` mounted in `(tabs)/_layout.tsx`; long-press on home tab triggers medium haptic + opens modal; uses existing `useVoiceInput` hook with text-input fallback (Expo Go); on submit calls `composedPlateApi.composeFromUtterance(text)` and routes to `/build-a-plate?plateId=…`.

**Phase 8 (Social) — backend ✅, frontend ✅ (partial)**
- [x] **Deep link routing** for `sazon.app/plate/<slug>` → opens composer pre-filled via `GET /api/shared-plates/:slug`. ✅ `frontend/app/plate/[slug].tsx` routes via Expo Router; success → `router.replace('/build-a-plate?plateId=…&from=shared')`; 404 → confused-Sazon empty state with "Build your own" CTA. `sharedPlatesApi.fetchBySlug` added to `lib/api.ts`. 5 tests green.
- [x] **Substitution banner** when shared component isn't in user's pantry. ✅ `SubstitutionBanner` shipped — sage banner with "Show original" link, mounts when composer opens with `?plateId=X&subsCount>0`.
- [ ] **"Cook a friend's plate" feed** — opt-in social section on home (requires social graph; gated until user-following ships). *(2970)*
- [x] **Plate-of-the-week editorial card** on home (calls `GET /api/composed-plates/of-the-week`). ✅ `PlateOfWeekCard` mounted in home screen below the Stretch card; full-bleed plate image hero + Fraunces title + macro line + sage CTA "Build this plate" → `/build-a-plate?plateId=…`. Gracefully renders nothing on null / 404.

**Phase 9 (Nutrient gap, skill tier, cost, PDF) — backend ✅, frontend ✅ (partial)**
- [x] **Skill-tier gating in composer UI** — beginner hides sauce slot; chef shows technique chips (calls `GET /api/meal-components/skill-tier`). ✅ `useSkillTier` hook gates `requiredSlotsForTier` (beginner collapses sauce row) and surfaces `isVariantChipsVisible` to the picker for chef tier.
- [x] **Sage nutrient badge** on components that fill the user's top gap ("⚡ +8g fiber"). ✅ `NutrientBadge` shipped, fetched once via `nutrientGapApi.fetchTopGap()` and rendered per-card in the picker; renders nothing when no gap.
- [x] **"Eat the rainbow" hint** when ≥4 plates this week have no green vegetables. *(2976)* ✅ `RainbowHint` shipped with `shouldShowRainbowHint` predicate; persists dismissal to AsyncStorage with 7-day expiry; mounts only above the Vegetable picker.
- [x] **"Hit my budget" toggle** + cost pill on plate (uses `budgetAwareComposerService` ranking). ✅ `BudgetToggle` pill in header + `CostPill` on plate totals row; toggle re-sorts picker components ascending by `estimatedCostPerPortion` client-side as a fallback while backend `byBudget=true` flag lands.
- [x] **"Try this technique" weekly challenge banner** in composer. *(2981)* ✅ `TechniqueChallengeBanner` editorial card mounted at top of composer; per-week dismissal via `technique-banner-dismissed-{ISO-week}` AsyncStorage key.
- [x] **PDF menu export** — react-native-pdf or expo-print. *(2990)* ✅ `frontend/components/recipe/PlateMenuExportButton.tsx` — golden `BrandButton` rendered on saved-plate detail when `source === 'user-composed'`. Builds Sazon-branded HTML (one column per slot + macro footer), pipes through `expo-print.printToFileAsync`, then `Sharing.shareAsync` opens the native share sheet. Chef-kiss Sazon toast on success. 6 tests green. *(host wiring on `recipe/[id].tsx` left to home/cookbook agent.)*

**AI prompt integration (cross-phase)**
- [x] **Wire `getHealthPromptAddendum(cuisine)` into `aiRecipeService.ts`** so generation respects the Phase-3 health tier. Touches existing service — bundle with Group 11 Phase 5 work. ✅ `buildRecipePrompt` now appends the cuisine's tier addendum when `cuisineOverride` is set. 4 prompt tests green.
- [x] **Wire adjacency into `aiRecipeService.ts` prompt builder** so "user likes Thai" triggers "also consider Burmese/Lao/Vietnamese" in the prompt. ✅ `buildRecipePrompt` now injects "Also consider influences from {top-3 adjacent}." for the override cuisine. 2 prompt tests green.

---

#### **10X-Order: Implementation Phasing for Build-a-Plate**

> Treat each phase as a hard gate — do not start phase N+1 until phase N is shipping behind a feature flag and tested.

1. **Phase 1 — MVP composer (P0 launch blocker):** component data model, picker UI, live macro recompute, save-to-cookbook, pantry coverage sort, "Cook with what I have" toggle.
2. **Phase 2 — Permutations + pantry intel (P0 launch blocker):** permutations endpoint, "what if?" swap chips, daily seed, pantry-deep-link from `/pantry`, "Tonight's plate is in your pantry" home card.
3. **Phase 3 — Cook orchestration:** parallel cook timeline solver, Gantt timeline UI, re-pace mid-cook.
4. **Phase 4 — Learning loop:** slot affinity, pair affinity, favorites chips on picker.
5. **Phase 5 — Macro auto-fit + portion multipliers.**
6. **Phase 6 — Leftover continuity:** leftover inventory, "Stretch last night" card, technique variants.
7. **Phase 7 — Family mode + voice composition.**
8. **Phase 8 — Social plate sharing + plate-of-the-week.**
9. **Phase 9 — Nutrient gap-filling + skill tiers + cost optimization + PDF export.**

Phases 1–2 ship for launch. Phases 3–9 form the post-launch "depth" releases that drive retention and premium upgrades.

---

### **Group 10Y: Sazon Coach — Conversational AI Nutrition & Cooking Companion** 🗣️🧠 ⭐ **VITAL — PREMIUM ANCHOR FEATURE** *(Home Screen + Chat Tab + Recipe Detail)* 🔴 NOT STARTED — high-value premium feature, separate dedicated session

> **Status:** No code shipped yet. This is the single most valuable post-MVP feature for paid conversion (per the rationale below). Estimated 6-phase build per `10Y-F`. Treat as its own multi-week initiative — do NOT try to bundle into another group.

> **Why this is vital.** The dirty secret of weight-loss apps is that the *real* unlock isn't another macro ring or another recipe — it's having a smart, patient, opinionated conversation partner that knows your body, your kitchen, and your taste, and helps you make the next decision in real time. Founder lived experience: lost weight not by following a meal plan, but by *talking* with Claude every day — "what should I make with the salmon and broccoli I have? what's a 400-cal high-protein dessert? why am I always hungry by 4pm? swap the rice for something lower-glycemic." The current Sazon UI is transactional (pick a recipe, log a meal). The user's actual mental model is conversational. Sazon Coach closes that gap.
>
> **Strategic role.** This is the **premium anchor feature** — the single best reason to upgrade past the free tier. Free users get Sonnet 4.6 with a tight daily message cap and no memory across sessions. Pro users get Opus 4.7 with extended thinking, unlimited daily messages, persistent memory of goals/preferences/cooking history, photo attachments (snap a fridge → get plate suggestions), and proactive weekly check-ins. Pricing model in Group 7 is already wired — this feature gives that paywall something *real* to gate.
>
> **Positioning.** Not "a chatbot." Sazon Coach is a *coach* — opinionated, warm, texts-like-a-friend (per REDESIGN_PHILOSOPHY copy rules). It owns context the user has already given Sazon (macros, allergies, pantry, cooking history, taste ratings, weight goals if shared) and uses it to make every reply feel personal. No setup screens, no "configure your assistant" — it just knows.
>
> **Why now (not later).** The conversational interface is what makes every other Sazon feature *legible*. A user who can say "I have 30 minutes and chicken thighs, give me three options ranked by macros" is a user who will retain. A user staring at a recipe grid is a user evaluating churn. Group 10Y unlocks the value of every other Group 10 feature by giving users a fluent way to access them.
>
> **Reference (claude-api skill):** all backend integrations MUST follow `skills/claude-api/SKILL.md` — prompt caching is mandatory (system prompt + user profile cache for ≥5 min), use streaming responses, attach extended thinking only on Pro tier, and migrate model IDs in one place.

#### **10Y-A: Coach Backend Foundation** 🛠️ *(Backend)* ✅ SHIPPED

- [x] **`POST /api/coach/message`** — accepts `{conversationId, message, attachments?}`, streams the assistant reply via Server-Sent Events. Uses `@anthropic-ai/sdk`. Model selection by tier: free → `claude-sonnet-4-6`, Pro → `claude-opus-4-7`. Extended thinking budget: free → off, Pro → 16k tokens. System prompt + user profile JSON cached via `cache_control: { type: "ephemeral" }` to keep cost low across turns. **Profile JSON MUST include (at minimum): `pantry[]`, `leftoverInventory[]`, `slotAffinity[]` (top 30), `pairAffinity[]` (top 20), `today.remainingMacros`, `last7Cooks[]` (recipe + rating), `dietaryProfile`, `allergens[]`, `cuisineAffinity[]`, `skillTier`, `goalPhase`, `currentMealPlanDay`. Enumerate exact fields in `coachPromptService.buildProfileSnapshot()` and snapshot-test the byte stability for cache hits.**
  > **N=1 sharpening:** A vague "user profile JSON" makes Coach generic. Pin the exact field list so every Coach call reads the full personalization stack — pantry tells it what to suggest, leftovers tell it what to bridge, affinity tells it what taste to honor, today.remainingMacros tells it what gap to fill. This is THE bullet that determines whether Coach feels like Sazon.
- [x] **`POST /api/coach/conversations`** + **`GET /api/coach/conversations`** + **`GET /api/coach/conversations/:id`** — CRUD for conversation threads. Each conversation has `userId`, `title` (auto-generated from first message **using a templating step that injects the user's known context — cuisine affinity, current goal phase, top deficient nutrient — so titles read like "Chicken-thigh ideas for cut week" not "Recipe ideas"**), `tier` (recorded at creation), `createdAt`, `lastMessageAt`. Free tier: max 3 active conversations, ephemeral after 7 days. Pro tier: unlimited, persisted indefinitely.
  > **N=1 sharpening:** Auto-titles default to generic; the thread list becomes a wall of "Recipe ideas / Recipe ideas / Recipe ideas." Inject user state into the title generator so the list feels personal at a glance.
- [x] **`CoachMessage` Prisma model** — `{id, conversationId, role: "user" | "assistant", content (text), attachments (Json[]), thinkingTokens (Int?), modelUsed (String), promptTokens, completionTokens, cacheReadTokens, cacheWriteTokens, createdAt}`. Token columns drive billing analytics + tier enforcement.
- [x] **System prompt builder** (`backend/src/services/coachPromptService.ts`) — assembles a structured system prompt: Sazon Coach persona + REDESIGN_PHILOSOPHY copy rules + user profile snapshot (macros, dietary restrictions, allergies, taste preferences, recent cooked recipes, pantry, weight goal if set, current meal plan day). Output is deterministic given the same profile so the cache hits.
- [x] **Tool use bridge (read-only shipped)** — Coach can call internal tools mid-conversation: `search_cookbook(query)`, `get_pantry()`, `get_today_remaining_macros()`, `find_recipes(filters)`, `compose_plate(slots)` (calls 10X composer), `log_meal(recipeId, portion)`. Tool results are appended to the conversation; the assistant reasons over them and replies. Tools are tier-gated — free users can read-only; Pro users get write tools (log_meal, compose_plate). **Tool *implementations* must internally apply the personalization stack: `find_recipes` runs through 70/30 scoring + slot affinity + adjacency before returning; `search_cookbook` boosts recently-cooked + 4★+ rated; `compose_plate` defaults to leftover-aware + budget-aware; results carry per-item personalization signals (`pantryCoverage`, `macroFit`, `affinityScore`) so the assistant can reason over them.**
  > **N=1 sharpening:** Tools that return raw matches make Coach a generic search wrapper. Tools that return personalized rankings make Coach the only product that knows *this* kitchen. The personalization stack already exists — wire it in, don't bypass it.
- [x] **Daily message cap (free tier)** — middleware enforces `≤10 messages/day` for free users; on cap hit, return a 402 with paywall payload (CTA copy: "You're on a roll — Pro Coach has no limits."). Pro users have no cap.
- [x] **Test (partial — tool-use bridge tests deferred to Phase 3):** `backend/__tests__/services/coachService.test.ts` ✅ 8/8 — model selection, thinking budget, ephemeral cache_control. `backend/__tests__/services/coachPromptService.test.ts` ✅ 11/11 — byte-stable serialization, profile snapshot, system prompt. `backend/__tests__/routes/coach.test.ts` ✅ 8/8 — POST /api/coach/message SSE streaming, 402 daily cap at message 11, premium uncapped at 50, ownership 404. Tool-use bridge dispatch tests written in Phase 3.

#### **10Y-B: Coach Chat UI** 💬 *(Frontend — new tab + entry points)* ✅ SHIPPED (core)

- [x] **New `/(tabs)/coach.tsx` screen** — full-screen chat thread list + active conversation view. Empty state uses `AnimatedEmptyState` with `chef-kiss` mascot + CTA "Tell me what you're hungry for." Active thread is editorial: serif Fraunces for the assistant name, Plus Jakarta Sans for body, message bubbles in pastel tints (user → blush, assistant → sage), no flat white. Tab bar gets a fifth icon — chat bubble.
- [x] **Streaming message renderer (partial — markdown lists/bold + Read more pill ✅; ingredient pantry-state badges deferred to Phase 3 with tool-use bridge)** — assistant tokens stream in with a soft typing dot; on completion, animate a subtle scale+fade. Markdown supported (lists, bold, code blocks for ingredient lines). Long replies collapse with a "Read more" pill at 8 lines. **Ingredient mentions in assistant output (regex-detected against `IngredientCatalog` + `pantry`) auto-link to the user's pantry status — green "have" badge, amber "need" badge, sage "leftover" badge — inline in the prose.**
  > **N=1 sharpening:** Generic markdown rendering treats every user the same. Inline pantry-state badges turn every Coach reply into a personalized actionable read.
- [x] **Inline tool-call cards** ✅ — recipe carousel + pantry/macros compact summary; pantryCoverage chip, macroFit pill, affinityScore badge per card. — when the assistant calls `find_recipes` or `compose_plate`, the tool result renders as a horizontal card carousel inline in the chat (recipe cards, plate cards). Tapping a recipe card navigates to recipe detail; tapping a plate card opens the composer pre-filled. **Each card carries user-specific overlays from the personalization stack: pantry coverage % chip, macro-fit-vs-today's-remaining pill (green/amber), "you cooked this 3 weeks ago" timestamp, "fits your fiber gap" badge — same data the composer already surfaces.**
  > **N=1 sharpening:** Plain recipe cards in chat = same product as any other recipe app. Personalized overlays = the user instantly sees why *this* recipe was picked for *them right now*.
- [x] **Photo attachment (Pro only)** ✅ — paperclip icon in the composer opens a camera/photo picker. On free tier, paperclip shows a paywall sheet ("Snap your fridge → get plate ideas. Pro Coach unlocks photos."). On Pro, attached image is sent as a `vision` content block; assistant can identify ingredients, estimate macros, suggest recipes. **Identified ingredients auto-suggest pantry adds via a confirm-sheet ("Add cilantro, lime, jalapeño to pantry?") — accepted items write into `Pantry` and feed all downstream personalization (composer ranking, leftover detection, Coach context).**
  > **N=1 sharpening:** Vision that only reads is half the loop. Writing identified items back to pantry means a fridge photo permanently sharpens every future recommendation, not just this conversation.
- [x] **Quick-start chips (N=1 ✅)** — chips derived from `/api/coach/context` (expiring leftovers, remaining macros, top adjacent cuisine) via `useCoachContext` + `chipsFromCoachContext` pure helper. Generic fallback when no signals. — empty state shows 4 chips **generated from the user's current state, not hardcoded**. Examples: "Use the salmon expiring Friday" (reads `pantry.expiringSoon`), "You're 320 cal under — dessert?" (reads `today.remainingMacros`), "Bridge yesterday's chicken into tonight" (reads `leftoverInventory`), "Try a Burmese plate" (reads `cuisineAdjacency` from cooked cuisines). Fall back to 1 generic chip ("What should I cook tonight?") only when no signal is available. Tapping inserts the prompt and sends.
  > **N=1 sharpening:** 4 hardcoded prompts make every user's empty state identical — the worst possible first impression for an N=1 product. Compute chips from user state on every mount; never serve the same 4 to two different users.
- [ ] **Entry points** *(deferred — tab is reachable; home/recipe-detail/meal-plan deep links land in a follow-up pass)* — (1) home screen "Ask Sazon" CTA card above the recipe grid **with copy that cites a specific user signal** ("You've got chicken thighs + 45min — ask the Coach" / "320 cal left for dessert — Coach has ideas"); (2) recipe detail "Ask the Coach about this recipe" pill (deep-links into a new conversation seeded with the recipe context **+ user's pantry coverage of it + macro fit**); (3) meal plan "Why this plan?" link → opens a Coach thread that explains the day's macro logic **using the user's actual goal phase + recent ratings + leftover state to justify the picks**.
  > **N=1 sharpening:** A static "Ask Sazon" card is wallpaper. A card that names a specific signal is irresistible — and it proves to the user that Sazon is reading their state, every time they open the home screen.
- [x] **Test (partial — Phase 2 scope):** `frontend/__tests__/app/coach.test.tsx` ✅, `MessageBubble.test.tsx` ✅, `QuickStartChips.test.tsx` ✅, `useCoachStream.test.ts` ✅ → 16/16 green. `ToolCallCard.test.tsx` lands in Phase 3, `PhotoAttachment.test.tsx` in Phase 5.

#### **10Y-C: Memory & Personalization (Pro-only)** 🧠 *(Backend + Frontend)* ✅ SHIPPED

- [x] **`CoachMemory` Prisma model** — `{id, userId, kind: "preference" | "goal" | "constraint" | "milestone", content (text), confidence (Float), sourceConversationId, sourceMessageId, createdAt, updatedAt}`. Compact, structured facts the coach has learned about the user ("prefers high-protein desserts", "lactose-sensitive", "lost 4 lb in April", "doesn't eat after 8pm").
- [x] **Memory extractor (token-similarity dedupe; real embeddings TODO)** — after every assistant reply on Pro tier, an async job runs a small Sonnet 4.6 extraction call against the last N turns to extract net-new memories. Deduplicated against existing memories by semantic similarity (embedding-based). Free tier: extractor disabled.
- [x] **Memory injection into system prompt** — Pro-tier system prompt includes the user's top-K memories (default 20) sorted by recency × confidence. Cached alongside the profile snapshot.
- [x] **`/profile/coach-memory` settings screen** — Pro users can view, edit, or delete individual memories. Reinforces trust ("Sazon remembers, but you're in control"). Free users see a paywall card explaining the feature.
- [x] **Weekly check-in (Pro-only, opt-in)** *(structured-signal write-back to goalPhase / adjacency / fiber addendum is partial — extractor lays the groundwork; full deterministic loop is a Phase 7 follow-up)* — every Sunday morning, a scheduled job sends a push notification: "Hey — quick check-in?" Tapping opens a coach thread pre-seeded with a personalized weekly summary (calories vs goal, cuisine variety, new recipes tried, weight trajectory if logged) and a single open question ("What worked this week? What didn't?"). Replies feed the memory extractor **AND write back to the structured personalization stack: declared cuisine variety target → adjusts adjacency exploration weight, satiety pattern → adjusts protein/fiber prompt addendum, goal adjustment → updates `goalPhase` + macro targets**.
  > **N=1 sharpening:** Memory extraction alone is fuzzy. Declare which structured signals the check-in writes (cuisine variety target, satiety pattern, goal adjustment) so the loop closes deterministically — not just into Coach memory, but into the same store every other surface reads.
- [x] **Test:** `coachMemoryService.test.ts` ✅ + `coach.memory.test.ts` ✅ 8/8 (CRUD + cross-user 404) + `coachWeeklyCheckin.test.ts` ✅ 9/9 (idempotency, opt-in gate, error isolation) + `userPreferences.test.ts` ✅ 4/4 (Pro-gate on opt-in). Frontend: `coach-memory.test.tsx` ✅ 4/4, `CoachMemoryHeaderPill.test.tsx` ✅ 4/4, `CoachMemoryCard.test.tsx` ✅ 2/2, `useCoachMemoryCount.test.ts` ✅ 3/3.

#### **10Y-D: Paywall & Tier Enforcement** 💳 *(Backend + Frontend)* ✅ SHIPPED

- [x] **Tier-aware client** (`frontend/lib/coachClient.ts`) — single source of truth for "what does this user's coach look like?" Reads `subscriptionStore.tier`; exposes `canAttachPhotos`, `dailyMessageCap`, `hasMemory`, `hasWeeklyCheckin`, `modelLabel` ("Sonnet" / "Opus"). Drives every gate in the UI.
- [x] **Paywall sheet (Coach-specific)** — when a free user hits the daily cap or taps a Pro-only entry point (photos, memory, weekly check-in), surface the existing `BrandButton` paywall sheet but with Coach-specific copy: header "Unlock the real Sazon Coach", three benefit lines (Opus + extended thinking, unlimited messages, persistent memory + photos + weekly check-ins), single `brand` CTA. Reuses the Group 7 Stripe/RevenueCat purchase flow — no new payment code.
- [x] **Server-side tier verification on every coach call** — never trust the client. Each `/api/coach/message` call re-reads `subscription.tier` from the DB and selects the model + features accordingly. Downgrade-mid-conversation handled gracefully: on tier change, future messages use the new tier's settings; past Opus messages stay in the transcript.
- [x] **Usage analytics (events emitted; transport TODO to PostHog/Segment)** — emit events `coach_message_sent`, `coach_cap_hit`, `coach_paywall_view`, `coach_paywall_convert`, `coach_pro_message_sent` with model + tier + token counts. Drives the Group 8 revenue dashboard's "which feature converts best" metric.
- [x] **Test:** `coach.tier.test.ts` ✅ 7/7 (403 attachments, mid-convo downgrade → Sonnet, analytics emission); `coachServiceTier.test.ts` ✅ 7/7; `coachClient.test.ts` ✅ 3/3; `CoachPaywallSheet.test.tsx` ✅ 10/10; `useCoachStream.test.ts` extended +1 (PRO_FEATURE attachments path).

#### **10Y-E: Safety, Trust & Cost Controls** 🛡️ *(Backend)*

- [x] **Health-claim guardrails** — system prompt now contains a named `<constitution>` block ABOVE the persona; deterministic deflection runs server-side via `coachSafetyService.shouldDeflectMedicalClaim()` and short-circuits `POST /api/coach/message` with a stable refusal text streamed as SSE.
- [x] **Allergy guard** — `find_recipes` and `search_cookbook` now filter their result sets through `bannedIngredients` and surface a `filteredForAllergens` count to the model. Phase 7 write-tool guard remains.
- [x] **Prompt-injection defense** — `coachSafetyService.sanitizeUserContent()` tags `<suspicious>` patterns in user messages; `tagToolResult()` wraps long tool-result strings in `<tool_data>`. Constitution explicitly names `<user_profile>`, `<learned_memories>`, `<attachment>`, `<tool_result>` as DATA-only.
- [x] **Cost ceiling per user** — `coachCostCeilingService` reads UTC-day token usage via `prisma.coachMessage.aggregate({_sum})`; over-budget Pro users get downgraded to Sonnet for the rest of the day and a one-time `event: cost_notice` SSE frame.
- [x] **Conversation export** — `GET /api/coach/conversations/:id/export` returns Markdown for Pro users (403 PRO_FEATURE for free, 404 cross-user). Frontend `ConversationExport` button hands the markdown to `Share.share`.
- [x] **Test:** `backend/__tests__/services/coachSafety.test.ts` — corpus 30/30 trigger, 0/10 false positives, sanitization tags injection patterns, constitution survives intact, full-prompt byte stability. `backend/__tests__/services/coachCostCeiling.test.ts` — UTC midnight bound, 95% no notice, 105% input/output downgrade. `backend/__tests__/services/coachTools.test.ts` (Phase 8 block) — find_recipes + search_cookbook drop allergen-violating recipes. `backend/__tests__/routes/coach.export.test.ts` — Pro 200 / Free 403 / cross-user 404. `frontend/__tests__/components/coach/CostNotice.test.tsx`, `ConversationExport.test.tsx`, `useCoachStream.test.ts` — UI handles cost_notice + export tap.

#### **10Y-F: Implementation Order**

> Treat each phase as a hard gate — do not start phase N+1 until phase N is shipping behind a feature flag and tested.

1. **Phase 1 — Backend foundation (10Y-A):** SDK integration, model routing, system prompt builder, conversation CRUD, daily cap.
2. **Phase 2 — Chat UI shell (10Y-B core):** new tab, streaming renderer, message bubbles, quick-start chips. Free tier only, text-only.
3. **Phase 3 — Tool-use bridge (10Y-A continued + 10Y-B tool cards):** read-only tools (`search_cookbook`, `get_pantry`, `get_today_remaining_macros`, `find_recipes`); inline tool-call cards in chat.
4. **Phase 4 — Paywall + tier enforcement (10Y-D):** tier-aware client, Coach paywall sheet, server-side tier verification, usage analytics. Opus + extended thinking lights up for Pro.
5. **Phase 5 — Photo attachments (Pro):** vision content blocks, paperclip UI, attachment paywall on free tier.
6. **Phase 6 — Memory & personalization (10Y-C):** memory model, extractor job, memory settings screen, weekly check-in.
7. **Phase 7 — Write tools (Pro):** `compose_plate` (calls 10X), `log_meal`. Coach can act, not just advise. ✅ SHIPPED — allergen guard pre-persistence, free tier sees `PRO_FEATURE` in tool_result + auto paywall once per conversation.
8. **Phase 8 — Safety hardening (10Y-E):** ✅ SHIPPED — constitution-block deflection, allergen-filtered read tools, prompt-injection sanitization, Pro cost ceiling, Markdown conversation export.

Phases 1–4 ship for launch as the premium anchor. Phases 5–8 are the post-launch retention engine.

#### **10Y Dependencies**

- **Group 7 (Stripe Integration):** required — paywall + tier enforcement reuse existing subscription state. Do not build new payment code.
- **Group 10X (Build-a-Plate):** Phase 7 write-tools depend on the composer endpoint. Coach without 10X is still useful; Coach + 10X is the moat.
- **Group 11 (Recipe DB):** Coach quality scales linearly with recipe-database breadth. Ship 10Y-A through 10Y-D before Group 11 is fully expanded; revisit Coach quality after Group 11 lands.
- **`skills/claude-api/SKILL.md`:** all SDK code MUST follow this skill — prompt caching, streaming, model migration patterns.

---

### **Group 11: Increased Usability Pre-Launch** 🍽️🔥 **CRITICAL PATH**

> **Why this is the most important group in the entire app.**
>
> The recipe database IS the product. Every other feature — meal plans, shopping lists, AI recommendations, scoring — is only as good as what it recommends. A user who opens the app and sees 5 generic "chicken stir-fry" recipes will churn in 48 hours. A user who discovers their grandmother's Salvadorean pupusas next to a Nigerian suya they've never heard of will tell 3 friends.
>
> The usability of Sazon lives and dies with two things: **(1) the variety of delicious recipes** and **(2) the ability to make them healthy or healthier**. Everything else flows downstream. Pre-launch, we need a product people will actually use from day 1 — not a demo with test data. This group is the LIFEBLOOD of growth and retention.

---

#### **Phase 1: Cuisine Adjacency Engine** 🧭 *(CRITICAL — do first, everything else depends on it)* ✅ SHIPPED

✅ Backend: `backend/src/utils/cuisineAdjacency.ts` (typed adjacency graph + auto-bidirectional + family lookup) + scoring integration in `scoring.ts` via `calculateAdjacencyBoost`. 14 families, ~100+ cuisines covered. 17 adjacency tests + 4 scoring tests. AI prompt addendum integration in `aiRecipeService.ts` deferred (touches existing AI service — separate PR).


*The growth hack hiding in plain sight. When someone likes a Persian recipe, the engine should surface Afghan and Iraqi dishes. When someone loves Soul Food collard greens, they might discover Nigerian egusi soup (also leafy-green based) or Ghanaian red red (also bean-based). That's the "recipes they've never thought of" moment that makes users tell their friends.*

* [ ] **Add `CUISINE_ADJACENCY` map** — Create `backend/src/utils/cuisineAdjacency.ts` with a bidirectional adjacency graph mapping every cuisine to its related cuisines. Relationships are typed: `subcuisine` (Persian → Middle Eastern), `sibling` (Nigerian ↔ Ghanaian), `diaspora` (Soul Food ↔ West African), `technique` (Burmese ↔ Chinese/Yunnan).
  * 📍 This is a static map, not ML — hand-curated for culinary accuracy
  * 📍 Export: `getAdjacentCuisines(cuisine: string): { cuisine: string; relationship: string; weight: number }[]`
  * 📍 Export: `getCuisineFamily(cuisine: string): string` — returns the parent family (e.g., "Latin American" for "Puerto Rican")

* [ ] **Add `CUISINE_FAMILIES` constant** — Group all cuisines into families for UI browse, recommendation context, and MealRequestModal cuisine picker (10C dependency):

  > **10C dependency:** Once `CUISINE_FAMILIES` is defined, wire it into `MealRequestModal` — replace the flat cuisines text input with expandable family chips (e.g. "Latin American" expands to Puerto Rican, Mexican, Peruvian, etc.) with multi-select. Each family chip is a collapsible row; tapping a family selects/deselects all its cuisines; tapping individual sub-chips fine-tunes the selection.
  > 📍 Frontend: `frontend/constants/CuisineFamilies.ts` — export `CUISINE_FAMILIES: Record<string, string[]>`
  > 📍 Wire into `MealRequestModal` Step 2 (Cuisine) below the "Any Cuisine" toggle

* [ ] **Add `CUISINE_FAMILIES` constant data** — Group all cuisines into families for UI browse and recommendation context:

  | Family | Cuisines |
  |--------|----------|
  | **Latin American** | Mexican, Puerto Rican, Cuban, Dominican, Salvadorean, Honduran, Guatemalan, Nicaraguan, Costa Rican, Venezuelan, Colombian, Peruvian, Brazilian, Argentinian, Chilean, Ecuadorean, Uruguayan, Bolivian, Paraguayan, Haitian, Panamanian, Guyanese, Belizean, Surinamese |
  | **African** | Nigerian, Ghanaian, Senegalese, Cameroonian, Ivorian, Ethiopian, Eritrean, Somali, Kenyan, Tanzanian, Ugandan, Congolese, Mozambican, South African, Malagasy, Sudanese, North African, Tunisian, Algerian |
  | **Middle Eastern & Persian** | Lebanese, Turkish, Persian, Iraqi, Kurdish, Palestinian, Yemeni, Syrian, Jordanian, Saudi, Emirati, Omani, Afghan, Egyptian, Moroccan |
  | **East & Southeast Asian** | Chinese, Japanese, Korean, Taiwanese, Okinawan, Thai, Vietnamese, Burmese, Lao, Cambodian, Filipino, Indonesian, Malaysian, Singaporean, Mongolian |
  | **South Asian** | Indian, Pakistani, Bangladeshi, Sri Lankan, Nepali, Tibetan, Bhutanese |
  | **European — Western** | Italian, French, Spanish, Basque, Portuguese, Dutch, Belgian, Swiss, British, Scottish, Irish, Icelandic |
  | **European — Nordic** | Swedish, Danish, Norwegian, Finnish |
  | **European — Central & Eastern** | German, Austrian, Polish, Czech, Hungarian, Romanian, Bulgarian, Albanian, Croatian, Serbian, Lithuanian |
  | **European — Mediterranean** | Greek, Cypriot, Maltese |
  | **Central Asian & Caucasus** | Uzbek, Georgian, Armenian, Azerbaijani, Kazakh, Afghan |
  | **American & Canadian** | American, Canadian, Southern, Soul Food, Cajun/Creole, Tex-Mex, New England, Hawaiian, Californian |
  | **Caribbean** | Jamaican, Trinidadian, Cuban, Puerto Rican, Haitian, Dominican, Barbadian, Guyanese, Belizean |
  | **Pacific & Oceanian** | Hawaiian, Australian, New Zealand/Maori, Fijian, Polynesian |
  | **Mediterranean** *(cross-family)* | Mediterranean, Greek, Lebanese, Turkish, Moroccan, Italian, Spanish, Cypriot, Maltese, Basque |
  | **Fusion & Modern** | Fusion Asian, Californian, Modern Australian, Surinamese |

* [ ] **Integrate adjacency into scoring** — In `scoring.ts`, when calculating cuisine match, add a weighted bonus for adjacent cuisines (not just exact match). If user likes Thai (30% boost for exact match), Burmese gets 20%, Lao gets 18%, Vietnamese gets 15%. Weight by adjacency `weight` field.
  * 📍 Modify `calculateRecipeScore()` → taste match section
  * 📍 Adjacent cuisines should never score higher than exact match — use `adjacencyWeight * 0.6` of the exact-match boost

* [ ] **Integrate adjacency into AI recipe generation** — When generating recipes, use adjacency to add variety. If a user's liked cuisines are [Thai, Indian], the AI prompt should mention "also consider: Burmese, Lao, Sri Lankan, Nepali" to broaden recommendations naturally.
  * 📍 Modify `aiRecipeService.ts` prompt builder

---

#### **Phase 1 Tests** ✅ SHIPPED

**`backend/__tests__/utils/cuisineAdjacency.test.ts`** (17 tests, all green)
- [x] Every authored cuisine has at least 1 adjacency entry (covered by bidirectional invariant)
- [x] Adjacency relationships are bidirectional (if Nigerian → Ghanaian, then Ghanaian → Nigerian) — auto-bidirectionalized at module load + invariant test verifies for every authored edge
- [x] `getCuisineFamily()` returns a valid family for every defined cuisine
- [x] Adjacent cuisines have weights in (0, 1]

**`backend/__tests__/utils/scoring.adjacency.test.ts`** (4 tests, all green)
- [x] User who likes Thai gets a non-zero boost for Burmese recipes
- [x] Adjacent cuisine boost is always less than exact-match boost
- [x] Cuisines with no adjacency data still score normally (graceful fallback)
- [x] Multiple adjacency matches stack (user likes Thai AND Indian → Burmese boosted from the strongest)

---

#### **Phase 2: Expanded Global Cuisine Seed** 🌍 *(CRITICAL — the recipe pool IS the product)* 🟡 SEED CONFIG SHIPPED

✅ Seed config data: `backend/src/config/globalCuisinesSeedConfig.ts` defines 130+ specific cuisines with per-cuisine recipe-count targets and `healthAngle` strings. Run `npm run seed:ai -- --config global` to fire the actual AI generation pipeline (multi-day op). 15 config-validation tests verify cuisine count, recipe-count floor, no catch-alls, no duplicates.


*The current seed has ~40 cuisines but uses overly broad buckets ("West African", "Latin American", "Caribbean"). Nobody searches for "West African food" — they search for Jollof rice, suya, waakye. Specificity = emotional connection = retention. Break every broad category into specific national/regional cuisines.*

##### **New Latin American Cuisines** (break "Latin American" catch-all into 12 specific cuisines)

* [ ] **Puerto Rican** (40 recipes) — Mofongo, arroz con gandules, pernil, tostones, pasteles, alcapurrias. *Health angle: plantain-based, bean-heavy protein, sofrito as flavor base.*
* [ ] **Cuban** (35 recipes) — Ropa vieja, Cuban sandwich (lightened), picadillo, black beans & rice, vaca frita. *Health angle: lean braised proteins, citrus marinades (mojo), bean-forward.*
* [ ] **Dominican** (30 recipes) — Mangú, sancocho, La Bandera, moro de habichuelas. *Health angle: plantain + bean combos, high fiber.*
* [ ] **Salvadorean** (30 recipes) — Pupusas, curtido, yuca frita, sopa de pata, nuegados. *Health angle: fermented curtido (gut health), corn-based, bean-filled pupusas.*
* [ ] **Honduran** (25 recipes) — Baleadas, sopa de caracol, plátanos fritos, tajadas. *Health angle: bean-heavy, seafood-rich coast, plantain-based.*
* [ ] **Guatemalan** (25 recipes) — Pepián, kak'ik, rellenitos, tamales colorados. *Health angle: ancient Mayan ingredients, turkey-based proteins, pepitas.*
* [ ] **Venezuelan** (30 recipes) — Arepas, pabellón criollo, cachapas, tequeños, hallacas. *Health angle: corn-based arepas, grillable proteins, black bean heavy.*
* [ ] **Chilean** (25 recipes) — Pastel de choclo, empanadas de pino, cazuela, curanto. *Health angle: seafood-rich, corn-based, light stews.*
* [ ] **Ecuadorean** (25 recipes) — Ceviche de camarón, llapingachos, encebollado, locro. *Health angle: seafood-forward, potato-based, lime-cured proteins.*
* [ ] **Uruguayan** (20 recipes) — Chivito, milanesa, asado, torta frita. *Health angle: lean cuts, chimichurri (herb-based condiment).*
* [ ] **Haitian** (25 recipes) — Griot, diri ak djon djon, pikliz, soup joumou. *Health angle: citrus-marinated proteins, fermented pikliz (gut health), squash soups.*
* [ ] **Panamanian** (20 recipes) — Sancocho, arroz con pollo, ceviche, carimañola. *Health angle: protein-rich soups, seafood, plantain.*
* [ ] **Nicaraguan** (20 recipes) — Gallo pinto, nacatamal, vigorón, indio viejo. *Health angle: rice + bean protein combo (gallo pinto), banana leaf-wrapped, plantain-based.*
* [ ] **Costa Rican** (20 recipes) — Casado, gallo pinto, olla de carne, chifrijo. *Health angle: "casado" (married plate) = balanced macro plate by design — rice, beans, protein, salad, plantain.*
* [ ] **Bolivian** (20 recipes) — Salteñas, silpancho, pique macho, sopa de maní. *Health angle: peanut soups, quinoa (native grain), high-altitude sustenance dishes.*
* [ ] **Paraguayan** (15 recipes) — Sopa paraguaya, chipa, bori bori, mbejú. *Health angle: corn + cheese protein combos, cassava-based, hearty soups.*
* [ ] **Guyanese** (20 recipes) — Pepperpot, cook-up rice, roti, metemgee. *Health angle: one-pot coconut stews, Indian-Caribbean fusion, bean-heavy.*
* [ ] **Belizean** (15 recipes) — Stew chicken, rice & beans, fry jacks, garnache, tamales. *Health angle: coconut rice & beans (complete protein), stewed lean proteins, cassava-based. Adjacent: Guatemalan, Caribbean, Mexican.*
* [ ] **Surinamese** (15 recipes) — Roti, pom, bakabana, moksi-alesi, saoto soup. *Health angle: one of the world's most unique fusion cuisines (Indian-Indonesian-African-Dutch), turmeric-rich soups, plantain fritters. Adjacent: Guyanese, Indonesian, Indian.*

##### **New African Cuisines** (break "West/East African" into specific nations)

* [ ] **Nigerian** (45 recipes) — Jollof rice, egusi soup, suya, moi moi, pepper soup, pounded yam & ogbono. *Health angle: bean-based proteins (moi moi), leafy greens (ugu/spinach), tomato-rich stews, grilled lean suya.*
* [ ] **Ghanaian** (35 recipes) — Waakye, banku & tilapia, kelewele, red red, groundnut soup, fufu & light soup. *Health angle: black-eyed peas, fermented corn, grilled fish-based proteins.*
* [ ] **Senegalese** (30 recipes) — Thieboudienne, yassa poulet, mafé, ceebu jën. *Health angle: fish-based national dish, peanut protein sauces, tomato-onion bases.*
* [ ] **Cameroonian** (25 recipes) — Ndolé, eru soup, achu soup, soya (grilled meat). *Health angle: leafy green-heavy stews, nut-based sauces.*
* [ ] **Somali** (25 recipes) — Bariis iskukaris, suqaar, canjeero, sambusa, muufo. *Health angle: lean meats, banana + rice combos, flatbread tradition.*
* [ ] **Eritrean** (25 recipes) — Zigni, shiro, kitcha fit-fit, tsebhi birsen. *Health angle: lentil/chickpea-based (shiro), fermented injera, spice-rich stews.*
* [ ] **Kenyan** (25 recipes) — Nyama choma, githeri, mukimo, chapati, sukuma wiki. *Health angle: bean + corn combos (githeri), grilled lean meats, collard greens (sukuma).*
* [ ] **Tanzanian** (20 recipes) — Pilau, ugali, mishkaki, ndizi kaanga. *Health angle: spiced rice, grilled protein skewers, plantain dishes.*
* [ ] **North African** (30 recipes) — Shakshuka, merguez, harira, b'stilla, chakchouka. *Health angle: egg-based protein (shakshuka), legume soups (harira), spice-rich.*
* [ ] **Ugandan** (20 recipes) — Rolex (chapati egg wrap), luwombo, matoke, posho & beans. *Health angle: banana-based staples (matoke), steamed-in-banana-leaf technique, bean-forward.*
* [ ] **Congolese** (20 recipes) — Moambe chicken, fufu, saka-saka, liboke (fish in leaves). *Health angle: palm nut sauces, cassava greens (saka-saka), banana leaf-steamed fish.*
* [ ] **Mozambican** (20 recipes) — Peri-peri chicken, matapa, xima, camarão grelhado. *Health angle: peri-peri (capsaicin = metabolism), cassava leaf stews (matapa), grilled seafood. Adjacent: Portuguese, South African.*
* [ ] **Malagasy** (15 recipes) — Romazava, ravitoto, vary amin'anana, lasary. *Health angle: leafy green stews (romazava), pork with cassava leaves, rice-based with greens at every meal.*
* [ ] **Ivorian** (20 recipes) — Attiéké, alloco, kédjenou, garba. *Health angle: cassava couscous (attiéké = low-calorie starch), slow-cooked sealed chicken (kédjenou — no added fat).*
* [ ] **Sudanese** (15 recipes) — Ful medames, kisra, mullah, asida. *Health angle: fava bean-based breakfast (ful), sorghum flatbread, slow-cooked stews.*
* [ ] **Tunisian** (25 recipes) — Brik, couscous, lablabi, ojja, harissa-spiced dishes. *Health angle: chickpea-based (lablabi), egg-forward, harissa capsaicin, olive oil-rich.*
* [ ] **Algerian** (20 recipes) — Couscous royale, chakhchoukha, rechta, mhadjeb. *Health angle: semolina-based, vegetable-rich stews, lamb with dried fruits.*

##### **New Middle Eastern & Persian Cuisines**

* [ ] **Persian** (45 recipes) — Tahdig, ghormeh sabzi, joojeh kabab, ash reshteh, zereshk polo, fesenjan. *Health angle: herb-heavy stews (sabzi = herbs), saffron, yogurt-marinated proteins, pomegranate antioxidants.*
* [ ] **Afghan** (30 recipes) — Kabuli pulao, mantu, bolani, ashak, chapli kebab. *Health angle: rice + lamb, yogurt sauces, leek-filled dumplings, raisin/carrot garnishes.*
* [ ] **Iraqi** (25 recipes) — Masgouf (grilled fish), dolma, kubbeh, tashreeb. *Health angle: grilled fish tradition, stuffed vegetables, legume-based.*
* [ ] **Kurdish** (20 recipes) — Kubba, tepsi baytinijan, biryani kurdi, dolma. *Health angle: eggplant-heavy, tomato-based, grilled meats.*
* [ ] **Yemeni** (20 recipes) — Mandi, saltah, fahsa, zurbian, jachnun. *Health angle: slow-cooked lean proteins, fenugreek (superfood), spice-rich.*
* [ ] **Palestinian** (25 recipes) — Musakhan, maqluba, knafeh, makdous, fattoush. *Health angle: sumac chicken (antioxidant), upside-down rice, olive oil-forward.*
* [ ] **Syrian** (30 recipes) — Kibbeh, fattoush, muhammara, shish barak, kabab halabi. *Health angle: bulgur-based (kibbeh), walnut-pepper spreads (muhammara), yogurt-sauced dumplings. Adjacent: Lebanese, Turkish.*
* [ ] **Jordanian** (20 recipes) — Mansaf, maqluba, zarb, jameed-based dishes. *Health angle: fermented yogurt (jameed), slow-roasted meats, pine nut garnishes.*
* [ ] **Saudi** (20 recipes) — Kabsa, jareesh, saleeg, matazeez. *Health angle: spiced rice with lean proteins (kabsa), crushed wheat porridge (jareesh = whole grain), slow-cooked.*
* [ ] **Emirati** (15 recipes) — Machboos, luqaimat, harees, balaleet. *Health angle: slow-cooked wheat porridge (harees), spiced rice, date-based desserts.*
* [ ] **Omani** (15 recipes) — Shuwa (pit-roasted lamb), halwa, mashuai, mishkak. *Health angle: pit-roasted meats (shuwa = no added fat, 24-hour slow cook), grilled fish, date-based.*

##### **New Caucasus Cuisines**

* [ ] **Armenian** (25 recipes) — Lahmajun, khorovats (BBQ), manti, dolma, gata, harissa (porridge). *Health angle: grilled meats (khorovats), stuffed grape leaves, wheat porridge (harissa = whole grain). Significant global diaspora — high discovery potential. Adjacent: Turkish, Georgian, Persian.*
* [ ] **Azerbaijani** (20 recipes) — Plov (pilaf), dolma, kebab, piti, qutab. *Health angle: herb-stuffed flatbreads (qutab), slow-cooked lamb soup (piti), pomegranate-forward. Adjacent: Persian, Turkish, Georgian.*

##### **New Central Asian Cuisines**

* [ ] **Kazakh** (15 recipes) — Beshbarmak, kurt (dried cheese), kazy, baursak, shubat. *Health angle: fermented mare's milk tradition, dried dairy preservation, hand-pulled noodles with lean boiled meat.*

##### **New Southeast Asian Cuisines**

* [ ] **Burmese** (30 recipes) — Mohinga, tea leaf salad (lahpet thoke), shan noodles, oh no khao swè. *Health angle: fermented tea leaves (gut health), turmeric-rich, fish-based broths. Adjacent: Thai, Chinese (Yunnan).*
* [ ] **Lao** (25 recipes) — Laab, khao piak sen, tam mak hoong, or lam. *Health angle: fresh herbs, lean proteins (laab), lime-forward, sticky rice portions. Adjacent: Thai (Isan), Vietnamese.*
* [ ] **Cambodian** (25 recipes) — Amok, lok lak, num banh chok, samlor korko. *Health angle: coconut-steamed fish (amok), herb-heavy curry noodles, prahok fermented fish.*
* [ ] **Taiwanese** (30 recipes) — Beef noodle soup, gua bao, lu rou fan, bubble tea (healthy), dan bing. *Health angle: braised proteins, pickled vegetables, tea-based drinks. Adjacent: Chinese, Japanese.*
* [ ] **Okinawan** (20 recipes) — Goya champuru, Okinawan soba, rafute, purple sweet potato. *Health angle: BLUE ZONE CUISINE — tofu, bitter melon, sweet potato, seaweed, turmeric. One of the healthiest cuisines on earth.*
* [ ] **Mongolian** (20 recipes) — Buuz, khuushuur, tsuivan, boortsog, airag-based dishes. *Health angle: steamed dumplings (buuz), hand-pulled noodles, hearty meat-and-vegetable stews for extreme climates.*

##### **New South Asian Cuisines**

* [ ] **Bangladeshi** (25 recipes) — Hilsa fish curry, biryani, pitha, bhuna khichuri. *Health angle: fish-based protein (hilsa), mustard-rich preparations, lentil porridges.*
* [ ] **Nepali** (25 recipes) — Dal bhat, momo, sel roti, thukpa, gundruk. *Health angle: daily lentil nutrition (dal bhat), steamed dumplings (momo), fermented greens (gundruk).*
* [ ] **Tibetan** (20 recipes) — Thukpa, momo, tsampa, butter tea (adapted). *Health angle: barley-based nutrition (tsampa), steamed dumplings, high-altitude sustenance food.*
* [ ] **Bhutanese** (15 recipes) — Ema datshi (chili cheese), phaksha paa, jasha maru, red rice dishes. *Health angle: chili-forward (capsaicin = metabolism), Bhutanese red rice (whole grain, nutty), cheese-based proteins. Adjacent: Nepali, Tibetan, Indian.*

##### **New American Regional Cuisines** (specificity drives nostalgia = retention)

* [ ] **Soul Food** (40 recipes) — Collard greens, black-eyed peas, catfish, cornbread, candied yams, mac & cheese (lightened). *Health angle: leafy greens, legumes, can be lightened significantly — air-fried catfish, cauliflower mac. Adjacent: Southern, Caribbean, West African (diaspora connection).*
* [ ] **Southern** (35 recipes) — Shrimp & grits, air-fried chicken, biscuits, pimento cheese, peach cobbler. *Health angle: comfort food made healthier — air fryer, Greek yogurt swaps, whole grain grits.*
* [ ] **Cajun/Creole** (35 recipes) — Gumbo, jambalaya, crawfish étouffée, red beans & rice, po'boys. *Health angle: bean-based (red beans & rice), seafood-heavy, roux lightened with less butter.*
* [ ] **Tex-Mex** (30 recipes) — Fajitas, queso (lightened), breakfast tacos, enchiladas, chili. *Health angle: high-protein fajitas, bean-heavy, easily lightened with Greek yogurt for sour cream.*
* [ ] **New England** (25 recipes) — Clam chowder (lightened), lobster roll, brown bread, fish cakes, baked beans. *Health angle: seafood-forward, can lighten chowders with cauliflower base.*

##### **New European Cuisines**

* [ ] **Portuguese** (30 recipes) — Bacalhau (salt cod), caldo verde, pastéis de nata, cataplana, francesinha. *Health angle: cod-based protein, kale soups (caldo verde), seafood stews. Adjacent: Spanish, Brazilian.*
* [ ] **British** (25 recipes) — Shepherd's pie (lightened), fish & chips (air-fried), full English (macro-friendly), bangers & mash. *Health angle: easily adapted lean — sweet potato topping, air-fried fish, turkey sausages.*
* [ ] **Irish** (25 recipes) — Colcannon, Irish stew, soda bread, boxty, coddle. *Health angle: root vegetables, lean lamb, cabbage/kale-heavy, potato-based comfort.*
* [ ] **Balkan** (25 recipes) — Ćevapi, burek, shopska salad, ajvar, sarma. *Health angle: grilled meats (ćevapi), fresh salads, roasted pepper spreads (ajvar). Adjacent: Turkish, Greek.*
* [ ] **Swiss** (20 recipes) — Rösti, raclette, bircher muesli, zürcher geschnetzeltes. *Health angle: oat-based breakfast (bircher muesli — invented here), dairy-rich proteins.*
* [ ] **Romanian** (25 recipes) — Sarmale, mămăligă, ciorbă, mici, cozonac. *Health angle: fermented cabbage rolls (sarmale = probiotics), cornmeal polenta (mămăligă), sour soups (ciorbă = gut health). Adjacent: Hungarian, Balkan.*
* [ ] **Croatian** (20 recipes) — Peka, crni rižot, štrukli, brudet, soparnik. *Health angle: Mediterranean-meets-Central European — seafood stews (brudet), under-the-bell slow cooking (peka), chard pies. Adjacent: Italian, Balkan.*
* [ ] **Bulgarian** (20 recipes) — Shopska salad, banitsa, kavarma, tarator, lyutenitsa. *Health angle: cold yogurt soup (tarator = probiotics), fresh vegetable salads, roasted pepper spreads (lyutenitsa). Adjacent: Greek, Turkish.*
* [ ] **Albanian** (15 recipes) — Tavë kosi, byrek, fërgesë, qofte. *Health angle: yogurt-baked lamb (tavë kosi), filo-based pies with greens, pepper-and-cheese bakes.*
* [ ] **Dutch** (20 recipes) — Stamppot, bitterballen, erwtensoep, stroopwafel, haring. *Health angle: mashed root vegetable dishes (stamppot), split pea soup (erwtensoep = fiber bomb), raw herring (omega-3).*
* [ ] **Belgian** (20 recipes) — Moules-frites, carbonnade flamande, waterzooi, waffles, stoofvlees. *Health angle: mussel-based protein (moules), beer-braised stews, chicken-and-cream stews (waterzooi). Adjacent: French, Dutch.*
* [ ] **Austrian** (20 recipes) — Wiener schnitzel, kaiserschmarrn, tafelspitz, apfelstrudel, käsespätzle. *Health angle: boiled beef tradition (tafelspitz = lean), herb-forward sauces, can air-fry schnitzel. Adjacent: German, Hungarian.*
* [ ] **Finnish** (15 recipes) — Karjalanpiirakka, kalakukko, lohikeitto, mustikkapiirakka. *Health angle: rye-based pastries (whole grain), salmon soup (lohikeitto = omega-3), berry-heavy desserts (antioxidants). Adjacent: Scandinavian, Russian.*
* [ ] **Maltese** (15 recipes) — Pastizzi, rabbit stew (stuffat tal-fenek), ftira, aljotta, bigilla. *Health angle: broad bean dip (bigilla = plant protein), fish soup (aljotta), Mediterranean seafood. Adjacent: Italian, North African.*
* [ ] **Cypriot** (15 recipes) — Halloumi dishes, sheftalia, koupepia, kolokasi, kleftiko. *Health angle: grilled halloumi protein, stuffed vine leaves, slow-cooked lamb, taro root (kolokasi). Adjacent: Greek, Turkish, Lebanese.*
* [ ] **Scottish** (20 recipes) — Cullen skink, haggis (lightened), Scotch broth, cranachan, Scotch eggs. *Health angle: smoked fish soups (cullen skink = omega-3), oat-based (cranachan, porridge tradition), barley broths. Adjacent: British, Irish.*
* [ ] **Icelandic** (15 recipes) — Plokkfiskur, hangikjöt, skyr dishes, harðfiskur, lamb soup. *Health angle: skyr (high-protein fermented dairy), dried fish (harðfiskur = pure protein), grass-fed lamb, geothermal-cooked. Adjacent: Scandinavian, Norwegian.*
* [ ] **Lithuanian** (15 recipes) — Cepelinai, šaltibarščiai (cold beet soup), kibinai, kugelis, skilandis. *Health angle: cold beet soup (šaltibarščiai = antioxidants + probiotics from kefir base), potato-based, rye bread tradition. Adjacent: Polish, Russian.*
* [ ] **Serbian** (20 recipes) — Pljeskavica, ćevapi, kajmak, ajvar, sarma, gibanica. *Health angle: grilled meat tradition, roasted pepper spreads (ajvar), fermented cabbage rolls. Adjacent: Croatian, Balkan, Hungarian.*
* [ ] **Basque** (20 recipes) — Pintxos, txuleta (bone-in steak), bacalao al pil-pil, marmitako, txistorra. *Health angle: seafood-heavy (marmitako = tuna stew), olive oil-forward, quality-over-quantity protein tradition, cider culture. Adjacent: Spanish, French.*
* [ ] **Swedish** (20 recipes) — Köttbullar, smörgåsbord, gravlax, janssons frestelse, kanelbullar. *Health angle: cured salmon (gravlax = omega-3), rye crispbread, lingonberry antioxidants. Break from "Scandinavian" catch-all.*
* [ ] **Danish** (20 recipes) — Smørrebrød, frikadeller, stegt flæsk, æbleskiver, rugbrød. *Health angle: open-faced sandwiches (smørrebrød = portion-controlled), rye bread (rugbrød = whole grain + fiber), pickled vegetables. Break from "Scandinavian" catch-all.*
* [ ] **Norwegian** (15 recipes) — Fårikål, rakfisk, brunost, kjøttkaker, multekrem. *Health angle: lamb + cabbage stew (fårikål = lean), fermented fish tradition, cloudberry antioxidants. Break from "Scandinavian" catch-all.*

##### **New American & Canadian Cuisines**

* [ ] **Canadian** (25 recipes) — Poutine (lightened), tourtière, butter tarts, Nanaimo bars, Montreal smoked meat, bannock. *Health angle: can lighten poutine with gravy reduction, meat pie tradition, Indigenous bannock bread. Adjacent: American, French.*

##### **New Pacific & Oceanian Cuisines**

* [ ] **New Zealand/Maori** (20 recipes) — Hangi (earth oven), pavlova, whitebait fritters, rewena bread, boil-up. *Health angle: earth-oven slow cooking (hangi = no added fat), seafood-forward, kumara (sweet potato). Adjacent: Australian, Polynesian.*
* [ ] **Fijian** (15 recipes) — Kokoda (Fijian ceviche), lovo (earth oven), palusami, cassava dishes, rourou. *Health angle: raw fish in coconut (kokoda), taro leaves (rourou = iron + calcium), earth-oven technique. Adjacent: Polynesian.*
* [ ] **Polynesian** (15 recipes) — Poi, kalua pig (lightened), laulau, poisson cru, oka i'a. *Health angle: taro-based (poi = prebiotic fiber), raw fish salads, coconut-based, breadfruit.*

##### **Common Search Staples** *(seed these first — users expect them on day one)*

> These are the recipes users will type before anything else. If "pizza" returns 0 results, the app feels broken regardless of how deep the global cuisine library is. These must exist in the database at launch.

* [ ] **American Comfort Classics** (40 recipes) — Pizza (pepperoni, margherita, BBQ chicken, veggie), hamburger/cheeseburger, hot dog, grilled cheese, mac & cheese, fried chicken, chicken tenders, BLT, club sandwich, Reuben, sloppy joe, meatloaf, pot roast, beef stew, clam chowder, corn chowder, mashed potatoes, coleslaw, potato salad. *Macro angle: high-protein lean versions — turkey burger, cauliflower pizza crust, baked "fried" chicken.*
* [ ] **Mexican-American Staples** (25 recipes) — Tacos (beef, chicken, fish, shrimp), burritos, quesadillas, nachos, enchiladas, fajitas, chili con carne, guacamole + chips, salsa, taco bowl. *Macro angle: lean protein swaps, lettuce wraps, high-fiber bean variations.*
* [ ] **Italian-American Staples** (25 recipes) — Spaghetti & meatballs, fettuccine alfredo, lasagna, chicken parmesan, pasta primavera, Caesar salad, caprese, bruschetta, chicken piccata, shrimp scampi. *Macro angle: zucchini noodles, whole wheat pasta, Greek yogurt alfredo.*
* [ ] **Asian-American Staples** (20 recipes) — Fried rice, lo mein, orange chicken, General Tso's chicken, sesame noodles, egg rolls, spring rolls, hot and sour soup, wonton soup, teriyaki bowl, sushi bowl. *Macro angle: cauliflower fried rice, lean protein stir-fry, brown rice bowls.*
* [ ] **Fast Food Makeovers** (20 recipes) — Protein-forward versions of what people actually crave: chipotle-style burrito bowl, Chick-fil-A-style chicken sandwich, In-N-Out-style smash burger, Subway-style loaded sub, Shake Shack-style smash burger, Wendy's-style chili, McDonald's-style egg muffin. *Macro angle: these ARE the macro angle — same taste, 30-40% fewer calories.*
* [ ] **Breakfast Classics** (20 recipes) — Pancakes, waffles, French toast, scrambled eggs, omelette, eggs benedict, avocado toast, granola, smoothie bowl, acai bowl, bagel + lox, breakfast burrito, breakfast sandwich, overnight oats, yogurt parfait.

**Test:** `backend/tests/seeds/searchStaples.test.ts`
- [ ] `GET /api/recipes?search=pizza` returns ≥5 results
- [ ] `GET /api/recipes?search=hamburger` returns ≥3 results
- [ ] `GET /api/recipes?search=taco` returns ≥5 results
- [ ] `GET /api/recipes?search=pasta` returns ≥5 results
- [ ] `GET /api/recipes?search=chicken` returns ≥10 results
- [ ] `GET /api/recipes?search=salad` returns ≥5 results
- [ ] Every staple category has ≥1 recipe under 500 calories per serving
- [ ] Every staple category has ≥1 recipe with ≥25g protein per serving

---

##### **Expanded Existing Cuisines** (fill gaps in current seed)

* [ ] **Caribbean** — Break into **Jamaican** (jerk chicken, ackee & saltfish, rice & peas), **Trinidadian** (doubles, roti, pelau), **Barbadian** (cou-cou & flying fish, macaroni pie). Each 25 recipes.
* [ ] **Reduce "Latin American" catch-all** — Migrate existing generic "Latin American" recipes into specific national cuisines above. Remove the catch-all category.
* [ ] **Reduce "West African" / "East African" catch-alls** — Migrate into Nigeria, Ghana, Senegal, Kenya, Tanzania above.
* [ ] **Break "Scandinavian" catch-all** — Migrate existing Scandinavian recipes into Swedish, Danish, Norwegian above. Remove the catch-all.
* [ ] **Break "Balkan" catch-all** — Migrate existing Balkan recipes into Serbian, Croatian, Albanian above. Remove the catch-all.

---

#### **Phase 2 Recipe Count Summary**

| Cuisine Family | Specific Cuisines | Recipes Per | New Total |
|---|---|---|---|
| Latin American (new specific) | 20 | 15-40 each | ~475 |
| African (new specific) | 18 | 15-45 each | ~435 |
| Middle Eastern/Persian/Gulf (new) | 11 | 15-45 each | ~265 |
| Caucasus & Central Asian (new) | 4 | 15-25 each | ~75 |
| East & Southeast Asian (new) | 6 | 20-30 each | ~150 |
| South Asian (new) | 4 | 15-25 each | ~85 |
| American & Canadian (new) | 6 | 25-40 each | ~190 |
| European (new) | 25 | 15-30 each | ~465 |
| Caribbean (expanded) | 3 | 25 each | ~75 |
| Pacific & Oceanian (new) | 3 | 15-20 each | ~50 |
| **New recipes subtotal** | **~100 new cuisines** | | **~2,265** |
| Existing cuisines (~47, minus 6 catch-alls) | ~41 kept | kept | ~1,850 |
| **Grand total (Phase 2)** | **~141 cuisines** | | **~4,100+** |
| + Phase 4 snacks/desserts | +635 | | **~4,735+** |

*Catch-alls removed: "Latin American", "West African", "East African", "Caribbean" (generic), "Scandinavian", "Balkan" — all migrated into specific national cuisines above.*

---

#### **Phase 2 Tests**

**`backend/tests/seeds/cuisineCoverage.test.ts`**
- [ ] Seed config defines ≥135 distinct cuisines
- [ ] Every cuisine has recipes across ≥3 meal types (breakfast, lunch, dinner)
- [ ] No cuisine has fewer than 15 recipes
- [ ] Every cuisine has a non-empty description for AI context
- [ ] No broad catch-all categories remain ("Latin American", "West African", "East African")
- [ ] Every continent has ≥10 cuisine representations

**`backend/tests/seeds/dietaryCoverage.test.ts`**
- [ ] Every dietary restriction (vegan, vegetarian, gluten-free, dairy-free, keto, paleo) returns ≥25 recipes
- [ ] Naturally healthy cuisines (Okinawan, Ethiopian, Vietnamese, Peruvian) have ≥30% recipes flagged as healthy

---

#### **Phase 3: Health-Forward Recipe Positioning** 💚 *(CRITICAL — the second pillar)* ✅ SHIPPED (tier system)

✅ `backend/src/utils/cuisineHealthTier.ts` — 4-tier classification (`naturally_healthy`, `easily_adapted`, `hidden_superfoods`, `protein_forward`) + `TIER_PROMPT_ADDENDUM` strings consumed by seed config's `buildPromptContext`. 10 tier tests verify exclusivity + lookup correctness. Per-cuisine `healthAngle` lives in seed config (Phase 2). Superfood detection expansion (plantain, fenugreek, teff, bitter melon, etc.) deferred — touches existing `superfoodDetection.ts`.


*Every cuisine has a health story. This is Sazon's differentiator — not just "here's jollof rice" but "here's jollof rice at 420 calories with 35g protein using cauliflower rice." The AI generation prompts need to encode this.*

* [ ] **Health tier system for AI prompts** — Classify every cuisine into a health generation strategy. **The tier addendum is the *base* prompt; the AI service must layer per-user conditioning on top — drop "lighter version" suggestions for users whose `cookHistory` shows they don't lighten dishes; surface superfood callouts only when the user has prior `superfoodAffinity` for that ingredient OR a tracked deficiency the superfood addresses; weight protein-forward language by `goalPhase === 'cut' | 'build'`.** Tier table:
  > **N=1 sharpening:** A cuisine-static tier addendum produces identical Nigerian recipe text for a day-1 user and a year-1 user. The tier is the floor; the user-state layer is what makes generation N=1.

  | Tier | Strategy | Cuisines | AI Prompt Addendum |
  |------|----------|----------|-------------------|
  | **Naturally Healthy** | Generate as-is, highlight inherent health benefits | Ethiopian, Eritrean, Okinawan, Vietnamese, Peruvian, Mediterranean, Japanese, Korean, Greek, Lebanese, Finnish, Fijian, Polynesian, Costa Rican, New Zealand/Maori | "This cuisine is naturally healthy — emphasize its inherent nutritional strengths (fermentation, lean proteins, vegetables, seafood)" |
  | **Easily Adapted** | Generate both traditional + lightened version | Soul Food, Cajun, Southern, British, American, Canadian, Mexican, Tex-Mex, German, Dutch, Belgian, Austrian, Hungarian, Polish, Russian, Czech | "Create a lighter version that preserves authentic flavor — air-fry instead of deep-fry, Greek yogurt for sour cream, cauliflower rice option" |
  | **Hidden Superfoods** | Highlight the superfood ingredients users don't realize are there | Nigerian (moi moi = black-eyed peas), Burmese (fermented tea = gut health), Persian (herb stews), Senegalese (peanut protein), Ghanaian (fermented corn), Romanian (fermented cabbage), Bulgarian (yogurt culture), Malagasy (daily greens), Ivorian (cassava couscous), Sudanese (fava beans), Tunisian (chickpeas + harissa) | "Highlight the superfood angle — this cuisine contains [X] which is rich in [Y]" |
  | **Protein-Forward** | Emphasize the macro-friendly nature | Argentinian, Korean BBQ, Somali, Brazilian, Turkish, Saudi, Mongolian, Uruguayan, South African, Croatian, Kenyan, Mozambican | "This cuisine is naturally high-protein — emphasize lean cuts, grilling technique, protein per serving" |

* [ ] **Per-cuisine health notes in seed config** — Add a `healthAngle` field to each `CuisineTarget` so the AI generation prompt includes cuisine-specific health guidance:
  ```typescript
  { name: 'Okinawan', healthAngle: 'Blue Zone longevity cuisine — tofu, bitter melon, sweet potato, seaweed, turmeric. One of the healthiest diets on earth.' }
  ```

* [ ] **Healthy swap suggestions** — For "Easily Adapted" cuisines, generate recipes with an optional `healthierSwap` field in instructions (e.g., "Swap flour tortilla for corn to save 60 calories and add fiber"). This doesn't change the recipe — it gives the user agency. **Only surface a swap when it aligns with the user's actual state: fiber swap iff under daily fiber goal, protein swap iff under protein gap, calorie swap iff over remaining calorie budget. A user who's already hitting fiber doesn't need the corn-tortilla nudge.**
  > **N=1 sharpening:** Static "swap flour for corn" strings shown to every user dilute trust. Swaps must read `today.remainingMacros` + `dietaryProfile` + `goalPhase` and only surface when they actually solve a problem this user has.

* [ ] **Superfood detection expansion** — Update `superfoodDetection.ts` to recognize superfoods common in newly added cuisines. **Detection is global (corpus work), but *surfacing* must be user-weighted: badge prominence ranks by user's `preferredSuperfoods[]` (declared in onboarding or learned from cookHistory) + current rolling-7d nutrient gaps. A user low on iron sees moringa + teff badges prominent; a user low on omega-3 sees flax + sardine badges prominent; a user with no gaps sees subtle badges only.** New superfoods to detect:
  > **N=1 sharpening:** Corpus expansion is fine; surfacing without user weighting turns badges into noise. Read deficiency/preference; rank prominence; write tap → reinforce affinity.
  - **Plantains** (resistant starch, potassium) — Latin American, Caribbean, African
  - **Cassava/yuca** (resistant starch, vitamin C) — African, Latin American
  - **Miso** (probiotics) — Japanese, Okinawan (already detected)
  - **Fenugreek** (blood sugar regulation) — Yemeni, Indian, Ethiopian
  - **Bitter melon/goya** (blood sugar, antioxidants) — Okinawan, Filipino, Indian
  - **Teff** (iron, calcium, protein) — Ethiopian, Eritrean
  - **Moringa** (protein, vitamins) — West African, South Asian
  - **Tamarind** (antioxidants, magnesium) — Thai, Indian, Mexican
  - **Sumac** (antioxidants) — Palestinian, Lebanese, Turkish
  - **Fermented foods** — Expand detection: injera, curtido, pikliz, kimchi (already), sauerkraut (already), miso (already)

---

#### **Phase 3 Tests**

**`backend/tests/utils/superfoodDetection.expanded.test.ts`**
- [ ] Plantain detected in Nigerian jollof rice ingredient list
- [ ] Fenugreek detected in Yemeni saltah ingredient list
- [ ] Teff detected in Ethiopian injera ingredient list
- [ ] Bitter melon detected in Okinawan goya champuru ingredient list
- [ ] All new superfoods have correct category assignments

**`backend/tests/services/aiRecipeService.healthTier.test.ts`**
- [ ] "Naturally Healthy" cuisines include health benefit language in AI prompt
- [ ] "Easily Adapted" cuisines include lighter-version guidance in AI prompt
- [ ] Health tier assignment exists for every cuisine in the seed config

---

#### **Phase 4: Global Snacks & Macro-Friendly Desserts** 🍨🔥 *(CRITICAL — the viral category)* 🟡 SEED CONFIG SHIPPED

✅ Seed config data: `backend/src/config/globalSnacksSeedConfig.ts` defines 15 snack/dessert categories totaling ~635 recipes (Protein Ice Cream, Macro-Friendly Cookies, High-Protein Smoothies, Lightened Global Desserts, etc.). Run `npm run seed:ai -- --config snacks`. Tests verify category count + recipe targets.


> **Why this is a show-stopping feature.**
>
> Snacks and desserts are the highest-craving, highest-guilt category in food. People search for them daily. If Sazon can serve a 300-calorie baklava with 25g protein, a macro-friendly tres leches, or a Ninja Creami-style protein ice cream inspired by Thai mango sticky rice — that's the kind of thing people screenshot and send to 5 friends. Every cuisine on earth has desserts and snacks; most of them have never been given the macro-friendly treatment. This is Sazon's viral wedge.
>
> The existing seed has 50 "Protein Desserts" and 40 "Low-Cal Desserts" — all generic, all Western. The world has thousands of dessert traditions. A user in the app should be able to discover that Persian faloodeh can be made with 180 calories, that Ethiopian ambasha can be a high-protein snack, that Filipino bibingka works beautifully with protein powder. **This is where global cuisine diversity meets the fitness community, and that intersection is where virality lives.**

##### **Macro-Friendly Dessert Engine** — Core Functional Categories

* [ ] **Protein Ice Cream & Frozen Treats** (60 recipes) — The Ninja Creami / blender ice cream category. Greek yogurt + protein powder + milk + monkfruit/stevia + pudding mix or xanthan gum base, with global flavor variations:
  - Base template: Greek yogurt, protein powder, milk, monkfruit sweetener, instant pudding/xanthan gum for texture
  - Variations by cuisine: Thai mango sticky rice ice cream, Persian saffron rosewater ice cream, Mexican churro ice cream, Japanese matcha ice cream, Filipino ube ice cream, Italian tiramisu ice cream, Turkish baklava ice cream, Indian kulfi-style, Brazilian açaí protein sorbet, Lebanese ashta ice cream
  - *Macro target: 200-350 cal, 25-40g protein per serving*
  - 📍 AI instruction: "Create a Ninja Creami-style protein ice cream inspired by [cuisine] dessert flavors. Base: Greek yogurt + protein powder + milk + monkfruit sweetener + xanthan gum or instant pudding for creamy texture. Must taste indulgent. Include mix-in suggestions (cookie crumbles, fruit, nuts)."

* [ ] **Protein Baked Goods** (80 recipes) — Pancakes, donuts, muffins, breads with macro-friendly profiles:
  - **Protein pancakes/waffles**: Oat flour + protein powder + chia seeds + egg whites base. Variations: Japanese soufflé pancakes (protein), Swedish pancakes, Dutch poffertjes, Ethiopian injera-style protein flatbread, Korean hotteok (protein-filled), Salvadorean pupusa-style sweet protein cakes
  - **Protein donuts/muffins**: Greek yogurt + protein powder + oat flour base. Variations: Churro protein donuts, French cruller protein donuts, Italian zeppole protein donuts, Indian gulab jamun-style protein bites
  - **Protein breads**: Banana bread, pumpkin bread, zucchini bread — all with protein powder + Greek yogurt swaps. Variations: Hawaiian banana bread, Irish soda bread (protein), Haitian pain patate (sweet potato protein bread)
  - *Macro target: 150-350 cal, 20-35g protein per serving*

* [ ] **Protein Bowls & Parfaits** (50 recipes) — Overnight oats, chia puddings, yogurt bowls with global toppings:
  - Swiss bircher muesli (protein version), Japanese matcha overnight oats, Mexican horchata overnight oats, Middle Eastern date + tahini parfait, Brazilian açaí protein bowl, Indian lassi-inspired protein bowl, Colombian avena (oat drink → bowl), Burmese tea leaf protein bowl
  - *Macro target: 250-400 cal, 25-40g protein per serving*

* [ ] **Protein Bars & Energy Bites** (40 recipes) — No-bake and baked bars with global flavor profiles:
  - Persian pistachio rosewater protein bars, Japanese black sesame protein bites, Mexican mazapán-style protein bites, Moroccan date + almond protein balls, Thai peanut coconut energy bites, Indian ladoo-style protein balls, Filipino polvorón-style protein bites, Ghanaian peanut (nkate cake) protein bars
  - *Macro target: 150-250 cal, 15-25g protein per serving*

##### **Global Desserts Made Macro-Friendly** — By Cuisine

*Every country has sweet traditions. Here's how to make them macro-friendly without destroying what makes them special.*

* [ ] **Latin American Macro Desserts** (50 recipes):
  - Tres leches (protein milk soak + monkfruit), churros (air-fried + protein chocolate dip), flan (egg-based = already protein-rich, sub sugar), alfajores (oat flour + protein), arroz con leche (protein rice pudding), dulce de leche protein mousse, Brazilian brigadeiros (protein powder + cocoa), Peruvian picarones (sweet potato protein donuts), Argentinian facturas (lightened), Colombian natilla (protein custard)

* [ ] **Middle Eastern & Persian Macro Desserts** (40 recipes):
  - Baklava (reduced butter, nut-heavy = healthy fats, monkfruit syrup), basbousa (semolina cake — sub with protein + oat flour), kunafa/knafeh (ricotta-based = protein-rich, lighten syrup), Persian faloodeh (rosewater sorbet — already low-cal, add protein), halva (tahini-based = healthy fats, reduce sugar), ma'amoul (date-filled — dates are natural sweetener), qatayef (stuffed protein pancakes), Turkish delight protein bites, maamoul protein cookies

* [ ] **Asian Macro Desserts** (50 recipes):
  - Japanese mochi (rice flour = naturally GF, protein filling), matcha protein cheesecake, Korean bingsu (shaved ice — already low-cal, add protein toppings), Vietnamese chè (tapioca + coconut — reduce coconut cream, add protein), Thai mango sticky rice (protein rice pudding version), Filipino halo-halo (protein ice cream base), Indonesian klepon (pandan protein bites), Chinese egg tarts (egg = protein, lighten crust), Taiwanese bubble tea protein smoothie, Indian gulab jamun (milk-based = protein, reduce sugar/oil), kheer protein rice pudding, rasgulla (cottage cheese = already protein-rich)

* [ ] **African Macro Desserts** (30 recipes):
  - Ethiopian ambasha (honey bread → protein flatbread), Moroccan chebakia (sesame + almond — already nut-protein, reduce honey), South African malva pudding (protein version), Nigerian chin chin (air-fried protein version), Ghanaian bofrot (protein donuts), Senegalese thiakry (millet + yogurt — already protein-rich), Kenyan mandazi (protein version), Egyptian basbousa (protein semolina cake)

* [ ] **European Macro Desserts** (40 recipes):
  - French crêpes (protein batter), Italian cannoli (ricotta = protein, oat shell), Greek loukoumades (protein donuts + honey), Portuguese pastéis de nata (egg custard = protein, lighten crust), Austrian kaiserschmarrn (protein pancake), Swedish kanelbullar (protein cinnamon rolls), Dutch stroopwafel (protein waffle version), British sticky toffee pudding (date-based = natural sweetener, add protein), Irish scones (protein oat version), Romanian papanași (cottage cheese donuts = already high-protein)

* [ ] **Caribbean & Pacific Macro Desserts** (20 recipes):
  - Jamaican rum cake (protein version), Trinidadian coconut sweet bread (protein flour), Hawaiian haupia (coconut pudding — protein version), Fijian vakalolo (cassava + coconut — protein adaptation), Polynesian poi-based protein pudding

##### **Global Snacks Made Macro-Friendly**

*Snacks are what people eat 2-3x daily between meals. If every snack is 200 cal with 20g protein, that's 40-60g extra protein per day without effort.*

* [ ] **Savory Protein Snacks from Around the World** (60 recipes):
  - **Latin American**: Protein empanadas (air-fried, chicken/bean filled), protein arepas (mini, cheese-stuffed), tostones with protein guacamole
  - **Middle Eastern**: Protein falafel bites (air-fried, chickpea + protein powder), baked protein kibbeh, protein hummus cups, labneh protein dip
  - **Asian**: Protein gyoza/dumplings (steamed, high-protein filling), edamame + seasoning variations, protein spring rolls (baked), Korean protein kimbap bites, Japanese onigiri (protein rice balls)
  - **African**: Protein moi moi (steamed bean pudding — already high-protein), suya protein skewers, baked protein samosas
  - **European**: Protein blini (Russian protein pancakes), Spanish tortilla bites (egg = protein), protein-stuffed peppers (Greek style), Scottish protein oatcakes
  - **American**: Protein jerky variations, macro-friendly trail mix by cuisine, protein-loaded deviled eggs, buffalo cauliflower protein bites
  - *Macro target: 150-250 cal, 15-25g protein per serving*

* [ ] **Sweet Protein Snacks** (40 recipes):
  - Protein date balls (Middle Eastern), protein mochi bites (Japanese), protein churro bites (Mexican), protein poffertjes (Dutch mini pancakes), protein loukoumades (Greek honey puffs), protein ladoo (Indian), protein bofrot (Ghanaian), protein banana spring rolls (Filipino turon-style), protein zeppole (Italian), protein gulab jamun bites (Indian)
  - *Macro target: 100-200 cal, 12-20g protein per serving*

##### **Appliance-Specific Macro Treats**

*People who buy a Ninja Creami, air fryer, or waffle maker want recipes specifically for that appliance. This is a search magnet.*

* [ ] **Ninja Creami / Ice Cream Maker Recipes** (30 recipes) — Dedicated protein ice cream recipes with specific machine instructions:
  - Base formulas: Creami (freeze 24h → process → re-spin), traditional ice cream maker (churn 20min)
  - Global flavors: Ube (Filipino), pistachio rosewater (Persian), dulce de leche (Argentinian), taro (Polynesian), pandan coconut (Indonesian), chai masala (Indian), black sesame (Japanese), mango lassi (Indian), horchata (Mexican), Turkish coffee, matcha (Japanese), baklava (Turkish), churro (Mexican), malted milk (American)
  - *Every recipe: full Creami-compatible instructions + macros*

* [ ] **Air Fryer Macro Treats** (25 recipes) — The air fryer is the macro dieter's best friend:
  - Air-fried protein donuts (global flavors), air-fried churros, air-fried zeppole, air-fried beignets, air-fried empanadas, air-fried samosas, air-fried spring rolls, air-fried falafel, air-fried plantain chips
  - *Every recipe: 30-50% fewer calories than traditional fried version*

* [ ] **Protein Waffle/Pancake Maker Recipes** (20 recipes) — Mini waffle maker = portion-controlled protein treats:
  - Protein chaffle base (cheese + egg + protein), protein waffle variations by cuisine, protein pancake minis

---

#### **Phase 4 Recipe Count Summary**

| Category | Recipes | Avg Protein | Avg Calories |
|---|---|---|---|
| Protein Ice Cream & Frozen | 60 | 30g | 275 cal |
| Protein Baked Goods | 80 | 25g | 250 cal |
| Protein Bowls & Parfaits | 50 | 30g | 325 cal |
| Protein Bars & Energy Bites | 40 | 20g | 200 cal |
| Global Desserts (macro-friendly) | 230 | 22g | 280 cal |
| Global Savory Snacks | 60 | 20g | 200 cal |
| Sweet Protein Snacks | 40 | 16g | 175 cal |
| Appliance-Specific | 75 | 25g | 250 cal |
| **Total Phase 4** | **~635** | | |

*This brings the grand total recipe pool to ~4,700+ recipes across 141 cuisines and functional categories.*

---

#### **Phase 4 Tests**

**`backend/tests/seeds/snackDessertCoverage.test.ts`**
- [ ] ≥500 recipes with mealType "snack" or "dessert" exist in seed config
- [ ] ≥100 snack/dessert recipes have protein ≥20g per serving
- [ ] ≥15 distinct cuisines represented in the dessert category
- [ ] Every cuisine family (Latin American, African, Asian, European, Middle Eastern) has ≥20 macro-friendly desserts
- [ ] Protein ice cream category has ≥10 distinct cuisine flavor profiles
- [ ] Air fryer recipes exist for ≥5 traditional fried snacks/desserts

**`backend/tests/seeds/macroValidation.test.ts`**
- [ ] All "Protein Desserts" recipes have ≥20g protein per serving
- [ ] All "Protein Baked Goods" recipes have ≥15g protein per serving
- [ ] All "Low-Cal Desserts" recipes have ≤200 calories per serving
- [ ] No protein dessert has more calories than its traditional counterpart (when paired)

---

#### **Phase 5: Content Quality & First-Run Experience** ✨ 🔴 NOT STARTED — depends on Phase 2/4 AI seed runs landing first

*Everything above creates the data. This phase ensures it's polished enough for a real user on day 1.*

##### Content Quality Pass

* [ ] **Recipe photo audit** — Ensure every seeded recipe has a high-quality Unsplash photo URL. Remove or replace broken/placeholder images. Use cuisine-specific search terms for photo matching.
* [ ] **Nutritional data completeness** — Verify macros (calories, protein, carbs, fat, fiber) are present on all recipes. Fill gaps via Spoonacular nutrition API or AI estimation.
* [ ] **Instruction clarity** — Review AI-generated recipe instructions for coherence, step ordering, and missing details. Ensure culturally authentic terminology (e.g., "sofrito" not "sauce base" for Puerto Rican recipes).
* [ ] **Meal type balance** — Ensure every cuisine has meaningful breakfast + lunch + dinner + snack representation. Current data skews heavily toward dinner.
* [ ] **Quick recipes gap fill** — Add recipes under 15 minutes for every cuisine (currently underrepresented). Users with `weekdayCookTime` set low need options across ALL cuisines, not just American/Italian.

##### First-Run Experience

* [ ] **Pre-populated home feed → "New to you" personalized adjacency feed** — Replace the static "Staff Picks" / "Explore Global Flavors" concept with a **"New to you" section ranked by adjacency distance from the user's cooked + saved cuisines**. Cold start (day 1): seed from onboarding cuisines → top adjacencies (e.g., picked Thai → show Burmese, Lao, Vietnamese first). Warm start: rank by lowest-explored adjacent family weighted by user's affinity vector. Read: `cookHistory.cuisines`, `liked.cuisines`, `cuisineAdjacency`. Write: impression + tap signals back into adjacency graph weights.
  > **N=1 sharpening:** "Staff Picks" is the canonical fixed-editorial antipattern — same 8 dishes for every user is everything Sazon isn't. "New to you" delivers the same exploration goal but *as a personalized ranking dressed in editorial copy*, which is the only acceptable form of editorial in an N=1 product.
* [ ] **Onboarding-to-feed connection** — Verify that onboarding preferences (cuisine, dietary, skill level) immediately affect the first home feed load. If a user selects "Nigerian" in onboarding, they should see jollof rice and suya within their first 5 recipes. Adjacency should kick in: selecting Nigerian should also surface Ghanaian and Senegalese dishes.
* [ ] **Cuisine browse view** — Add a "Browse by Region" section to the home feed or explore tab. Uses `CUISINE_FAMILIES` constant to group cuisines visually (map or grid). Tapping "African" shows Nigerian, Ghanaian, Ethiopian, etc. as sub-options. **Order families by the user's affinity vector — most-cooked family first, unexplored-but-adjacent family second, never-touched family last. Badge "New for you" on adjacent-but-uncooked families. Within each family, sort cuisines the same way.** Write: family-tap and cuisine-tap as exploration signals into adjacency weights.
  > **N=1 sharpening:** A static map/grid is the same browse view for everyone. Reorder by affinity so the year-1 user sees their loved families top + unexplored adjacents flagged "New for you," while a day-1 user sees their onboarding picks top + adjacency suggestions next.
* [ ] **Empty state polish** — Review all empty states (cookbook, meal plan, shopping list) to ensure they guide users toward the next action with **examples pulled from the user's top-3 affinity cuisines + 1 adjacency wildcard — NOT a hardcoded sampler**. Day-1 user (no cooks): pull from onboarding cuisine picks. Year-1 user: pull from top-affinity + a fresh adjacent suggestion they haven't tried.
  > **N=1 sharpening:** A static "cuisine-diverse sampler" is the laziest possible empty state. Pull from `cuisineAffinity` so even empty states feel built for one.

---

#### **Phase 5 Tests**

**`backend/tests/seeds/contentQuality.test.ts`**
- [ ] All seeded recipes have complete nutritional data (calories, protein, carbs, fat all > 0)
- [ ] All seeded recipes have non-empty description and ≥3 instructions
- [ ] Every cuisine has at least 2 recipes with cookTime ≤ 15 minutes
- [ ] Every cuisine has at least 1 breakfast, 1 lunch, and 1 dinner recipe

**`backend/tests/modules/homeFeed.firstRun.test.ts`** *(Phase 5)*
- [ ] Home feed returns ≥10 recipes for a brand-new user with no preferences
- [ ] Home feed for a user who selected "Nigerian" in onboarding contains Nigerian recipes in top 10
- [ ] Home feed for a user who selected "Nigerian" also contains adjacent cuisines (Ghanaian, Senegalese) in top 20
- [ ] Cuisine browse endpoint returns all cuisine families with their subcuisines

---

#### **The Macro-Friendly Dessert Thesis — Why This Goes Viral**

*The fitness community (Reddit r/fitness, r/volumeeating, TikTok gym influencers) is obsessed with macro-friendly desserts but the recipes are always the same 10 Western treats. Nobody has done this globally. The user who discovers they can make Persian saffron rosewater protein ice cream in their Ninja Creami, or air-fried Nigerian chin chin with 20g protein, or a protein version of Japanese mochi — that user becomes an evangelist. This category alone could drive organic shares and growth more than any other feature in the app.*

**The base formulas that work (proven):**
| Base | Key Ingredients | Why It Works |
|------|----------------|-------------|
| **Protein ice cream** | Greek yogurt + protein powder + milk + monkfruit + instant pudding/xanthan gum | Creami/blender texture, endless flavor possibilities, ~300 cal / 30g protein |
| **Protein baked goods** | Oat flour + protein powder + chia seeds + egg whites + Greek yogurt | Structure from oats, moisture from yogurt, protein from powder+eggs |
| **Protein donuts** | Greek yogurt + milk + protein powder + oat flour | Baked not fried, ~200 cal / 20g protein per donut |
| **Energy bites** | Dates + nut butter + protein powder + oats | No-bake, portable, naturally sweetened, endless cuisine-specific mix-ins |

*Apply these proven base formulas to the dessert traditions of 141 cuisines = thousands of unique recipes that nobody else has.*

---

#### **The Health Story by Cuisine — Quick Reference**

*For AI prompt engineering and content positioning. Every cuisine has a health angle — this is what makes Sazon different from a generic recipe app.*

| Cuisine | Naturally Healthy Dishes | Superfood Ingredients | Lightened Adaptation |
|---------|-------------------------|----------------------|---------------------|
| **Nigerian** | Moi moi (steamed bean pudding), pepper soup | Black-eyed peas, spinach/ugu, tomatoes | Jollof with cauliflower rice |
| **Ghanaian** | Red red (bean stew), banku & tilapia | Black-eyed peas, fermented corn, tilapia | Already bean + fish forward |
| **Senegalese** | Thieboudienne, yassa poulet | Fish, peanuts, tomatoes, onions | Already fish-based national dish |
| **Ethiopian** | Misir wot (lentil stew), shiro | Teff (injera), lentils, berbere spices | Already healthy — highlight it |
| **Eritrean** | Shiro, tsebhi birsen | Chickpeas, lentils, fermented injera | Already legume-based |
| **Tunisian** | Lablabi (chickpea soup), ojja | Chickpeas, harissa (capsaicin), olive oil | Already Mediterranean-healthy |
| **Okinawan** | Goya champuru, sweet potato dishes | Bitter melon, tofu, seaweed, turmeric | Blue Zone — already optimized |
| **Persian** | Ghormeh sabzi, ash reshteh | Fenugreek, pomegranate, herbs, saffron | Already herb-heavy and light |
| **Syrian** | Kibbeh, fattoush, muhammara | Bulgur (whole grain), walnuts, pomegranate | Already grain + nut based |
| **Palestinian** | Musakhan, fattoush | Sumac (antioxidant), olive oil, za'atar | Already olive oil-forward |
| **Puerto Rican** | Habichuelas guisadas, sofrito-based stews | Beans, plantains, cilantro, tomatoes | Baked tostones, lean pernil |
| **Cuban** | Black beans & rice, vaca frita | Black beans, citrus marinades (mojo) | Citrus-marinated lean proteins |
| **Costa Rican** | Casado (balanced plate), gallo pinto | Rice + beans (complete protein), plantains | Casado = balanced macros by design |
| **Bolivian** | Quinoa dishes, sopa de maní | Quinoa (native superfood), peanuts | Quinoa originated here — lean into it |
| **Vietnamese** | Pho, goi cuon (fresh rolls) | Herbs (Thai basil, mint, cilantro), lime, fish sauce | Already among the lightest cuisines |
| **Burmese** | Tea leaf salad, mohinga | Fermented tea (probiotics), turmeric, fish | Already light and fermented |
| **Korean** | Bibimbap, kimchi jjigae | Kimchi (probiotics), gochugaru, sesame, tofu | Already fermented + vegetable-heavy |
| **Japanese** | Miso soup, grilled fish, natto | Miso, seaweed, fermented soy, green tea | Already one of the healthiest on earth |
| **Peruvian** | Ceviche, quinoa dishes | Quinoa, aji peppers, lime, supergrains | Already one of the healthiest Latin cuisines |
| **Soul Food** | Black-eyed peas, collard greens | Leafy greens, legumes, sweet potato | Air-fried catfish, smoked turkey greens |
| **Cajun/Creole** | Red beans & rice, seafood gumbo | Beans, okra, seafood, holy trinity | Lighten roux, lean into seafood |
| **Romanian** | Ciorbă (sour soups), sarmale | Fermented cabbage (probiotics), lovage | Already probiotic-rich |
| **Bulgarian** | Tarator (cold yogurt soup), shopska | Yogurt (probiotics), cucumber, tomatoes | Already yogurt-culture capital |
| **Finnish** | Lohikeitto (salmon soup), rye bread | Salmon (omega-3), rye (whole grain), berries | Already Nordic-clean |
| **Fijian** | Kokoda (raw fish in coconut), rourou | Taro leaves (iron), coconut, fresh fish | Already raw + earth-oven based |
| **New Zealand/Maori** | Hangi, seafood | Kumara (sweet potato), seafood, earth-oven | No added fat in hangi cooking |
| **Mongolian** | Buuz (steamed dumplings), tsuivan | Steamed technique, lean mutton, root veg | Steaming = low-fat cooking method |

---

### **Group 12: Pre-Launch Growth Strategy** 🚀

*The work you do before anyone can download the app determines whether anyone ever does. This group is about building audience, content, and anticipation so that launch day has momentum — not crickets. Every task here compounds: a TikTok posted today still drives installs 6 months from now.*

---

#### **Content Marketing Engine** 📱

*The #1 growth channel for food apps is short-form video. Start producing before the app is live so there's a library of content ready on launch day.*

**TikTok / Instagram Reels / YouTube Shorts:**
- [ ] **Create accounts** — @sazonchef on TikTok, Instagram, YouTube. Consistent branding: habanero mascot as profile pic, "AI Meal Planner · Healthy Food That Doesn't Suck" as bio
- [ ] **Content pillar 1: "Did You Know?"** — 15–30s videos showing surprising healthy versions of global dishes. "Did you know you can make Nigerian chin chin with 20g protein?" Hook → recipe clip → "App link in bio"
- [ ] **Content pillar 2: "Macro-Friendly World Tour"** — 30–60s series exploring one cuisine per video. Show the dish, flash the macros, show Sazon generating it. "Episode 12: Persian saffron rosewater protein ice cream — 280 cal, 30g protein"
- [ ] **Content pillar 3: "What I Eat in a Day"** — Use Sazon's meal plan to plan a full day, cook it, show the macros. Relatable, aspirational, demonstrates the product
- [ ] **Content pillar 4: "AI Cooked This"** — Screen-record Sazon generating a meal plan or recipe, then show the real cooked result. Satisfying AI → reality pipeline
- [ ] **Batch 10 videos before launch** — Film and edit 10 videos across all pillars. Schedule 3/week starting 2 weeks before launch. Don't wait for the app to be live to start posting
- [ ] **Hashtag strategy** — Primary: #mealprep #macros #highprotein #healthyrecipes #mealplan. Secondary: cuisine-specific tags (#nigerianfood #persianfood #koreanfood). Niche: #proteinicecream #ninjacreami #airfryer

**Blog / SEO (sazonchef.com):**
- [ ] **Landing page** — Simple page: hero with app screenshots, "Join the waitlist" email capture, value props (AI meal planning, 141 cuisines, macro tracking), App Store/Play Store badges (grayed until live)
- [ ] **3 launch blog posts** — SEO-targeted articles published before launch:
  1. "The Best High-Protein Desserts from Around the World" (targets: protein dessert, healthy dessert, macro-friendly treats)
  2. "How to Meal Plan for the Week in 5 Minutes with AI" (targets: meal planning app, weekly meal planner, AI meal plan)
  3. "141 Cuisines, One App: Why Your Meal Plan Shouldn't Be Boring" (targets: global recipes, world cuisine app, diverse meal planning)
- [ ] **Each post ends with** — waitlist CTA pre-launch, App Store link post-launch

---

#### **Community Seeding** 🌱

*Find where your users already hang out. Add value first, promote second.*

**Reddit:**
- [ ] **Identify 10 target subreddits** — r/mealprep, r/EatCheapAndHealthy, r/fitmeals, r/volumeeating, r/1500isplenty, r/macros, r/healthyfood, r/cookingforbeginners, r/ninjacreami, r/airfryer
- [ ] **Contribute genuinely for 2+ weeks** — Answer questions, share recipes (not the app), build karma. Reddit bans obvious promotion
- [ ] **Soft launch posts** — "I built an app that..." format. Share the story, not the product. Show what makes it different (141 cuisines, macro-friendly global desserts, AI meal planning). Link only if asked or if sub rules allow
- [ ] **r/sideproject + r/indiehackers launch post** — These subs welcome app launches. Post with builder story + demo video

**Discord & Facebook Groups:**
- [ ] **Join 5 fitness/cooking Discord servers** — Look for meal prep, macro counting, healthy cooking communities
- [ ] **Join 5 Facebook groups** — Meal prep groups, Ninja Creami groups, air fryer groups, high-protein recipe groups
- [ ] **Same strategy as Reddit** — Add value first, soft mention when relevant. "I've been working on something for this exact problem" only after establishing presence

**Fitness Influencer Outreach:**
- [ ] **Identify 20 micro-influencers** (5K–50K followers) — Fitness/macro/meal prep content creators on TikTok and Instagram. Micro-influencers have higher engagement rates and are more accessible than macro-influencers
- [ ] **Outreach template** — Offer free Premium lifetime access in exchange for an honest review/video. No script, no requirements. Authentic > polished
- [ ] **Target 3–5 confirmed partnerships** before launch day. Even one 50K-follower creator posting a genuine review can drive hundreds of installs

---

#### **Waitlist & Email List** 📧

*An email list is the only audience you truly own. Build it before launch so Day 1 has a base.*

- [ ] **Waitlist landing page** — Email capture with incentive: "Join the waitlist → get 30 days free Premium at launch" (extended from standard 7-day trial). **Capture top cuisine + macro goal + dietary restriction in the same form (3 quick selects, optional but high-conversion). Persist to `WaitlistSignup` row + on launch, pre-seed the user's `taste_profile` so day-1 home feed is already personalized — no cold start.**
  > **N=1 sharpening:** A bare email capture costs nothing AND collects nothing. Three taps at signup gives every launch-day user a personalized first impression. Day 1 must not look like day 0.
- [ ] **Waitlist signup in social bios** — Every TikTok, Instagram, YouTube bio links to the waitlist page
- [ ] **Waitlist drip sequence** (3 emails, automated, **branched on signup-form cuisine + goal**):
  1. **Immediately:** "You're in! Here's what Sazon Chef is building" — problem statement + 3 screenshots **with hero screenshot tinted by their goal (cut/maintain/build palette)**
  2. **1 week later:** "[Their cuisine], reimagined for [their goal]" — surprising recipe example **filtered to their stated cuisine and macro goal** (Nigerian + cut → 420-cal jollof; Italian + build → high-protein cacio e pepe)
  3. **Launch day:** "We're live — and here's [their cuisine]'s starter plate" — direct App Store + Play Store links + promo code + 1 pre-personalized recipe card matching their signup answers
  > **N=1 sharpening:** An identical 3-email sequence to 500 signups is the marketing-funnel version of "Staff Picks." Branch on the signup form so each user feels Sazon was built for them before they install. Track open + click by branch — the data feeds segment-specific in-app onboarding too.
- [ ] **Goal: 500 emails before launch** — This gives Day 1 a burst of installs, which signals the algorithm to boost visibility

---

#### **Product Hunt Launch** 🏆

*Product Hunt is a one-shot. Prepare thoroughly — you can't redo it.*

- [ ] **Create maker profile** — Complete profile with bio, avatar, social links. Follow other makers. Engage with other products for 2+ weeks before your launch
- [ ] **Prepare launch assets:**
  - Tagline (60 chars): "AI meal planner with 141 world cuisines & macro tracking"
  - Description (260 chars): First paragraph hook + key differentiators
  - 5 gallery images: hero screenshot, meal plan screen, recipe detail, cooking mode, macro stats
  - Maker comment: personal story of why you built it
  - 30s demo video (optional but high-impact)
- [ ] **Schedule for Tuesday or Wednesday** — Highest traffic days on PH. Launch at 12:01 AM PT
- [ ] **Rally support** — Email waitlist + post on socials asking for upvotes on launch morning. Don't be spammy — ask for genuine feedback
- [ ] **Respond to every comment** within 2 hours on launch day

---

#### **App Store Pre-Order / Pre-Registration**

*Both stores support pre-launch visibility. Use it.*

- [ ] **iOS: Pre-Order** — Submit the app to App Store Connect before it's fully ready. Set a release date. Users can pre-order → auto-downloads on launch day. Pre-orders count toward Day 1 rankings
- [ ] **Android: Pre-Registration** — Similar concept in Play Console. Users tap "Pre-register" → notified on launch. Free visibility
- [ ] **Drive pre-orders from all channels** — Waitlist emails, social posts, Reddit all point to the pre-order/pre-register links once available

---

#### **Beta Testing Program** 🧪

*Real user feedback before public launch catches deal-breakers. Also creates your first evangelists.*

- [ ] **TestFlight (iOS) + Internal Testing (Android)** — Set up beta tracks in both stores
- [ ] **Recruit 20–30 beta testers** from:
  - Waitlist (offer "early access" as a perk)
  - Reddit communities (r/betatesting, niche fitness/cooking subs)
  - Friends/family who actually cook and track macros
- [ ] **Structured feedback form** — Google Form or Typeform. Ask: (1) What confused you? (2) What did you try to do but couldn't? (3) Would you pay for this? (4) What's missing?
- [ ] **2-week beta window** — Give enough time for testers to generate a meal plan, shop, cook, and come back
- [ ] **Fix top 3 issues** before public launch — Don't try to fix everything; fix the deal-breakers
- [ ] **Convert beta testers to reviewers** — Ask testers who gave positive feedback to leave an App Store review on launch day. Early 5-star reviews compound

---

#### **Launch Day Playbook** 📋

*Launch day is choreographed, not improvised. Have a checklist ready.*

- [ ] **T-minus 1 week:** Final beta feedback incorporated, App Store screenshots finalized, all social content scheduled, waitlist drip "launch day" email queued
- [ ] **T-minus 1 day:** Submit builds for review (if not already approved), test all deep links and store links, stage Product Hunt launch, draft launch tweets/posts
- [ ] **Launch morning:**
  1. Product Hunt goes live (12:01 AM PT)
  2. Waitlist email fires ("We're live!")
  3. Social media posts go out (TikTok, Instagram, Twitter/X, Reddit)
  4. Engage with every Product Hunt comment
  5. Monitor crash reports (Sentry) and backend health
- [ ] **Launch week:**
  - Post 1 new content piece per day across platforms
  - Reply to every App Store / Play Store review
  - Share any early wins (download count, positive reviews) on social
  - Send "Day 3" email to waitlist: **"Users like you cooked this" — filter the showcased recipes to overlap each recipient's stated cuisine + goal from the signup form. Same email shell, different recipe + subject line per segment.**
    > **N=1 sharpening:** "Here's what our first users are cooking" generic-blasted is forgettable; cohort-filtered is "this app gets me." Reuses the signup-form data already captured.

---

#### **Referral Seed: Friends & Family Wave**

*Before the referral program (ROADMAP 3.5), seed installs manually.*

- [ ] **Personal outreach to 50 people** — Friends, family, gym buddies, coworkers who cook. Direct message with a personal ask: "I built this, would mean a lot if you tried it and left a review"
- [ ] **Give each person a specific, *individualized* ask** — Tailor the ask to each contact's known interest. Gym buddy → "Generate a cut-week meal plan and tell me if the macros look right." Coworker who cooks → "Import one of your favorite recipes and see if Sazon's nutrition match is close." Parent → "Build a kid-friendly plate using the family mode." A specific *and* personalized ask gets higher activation than a generic "check it out."
  > **N=1 sharpening:** Even seed-stage outreach is N=1. The same logic that drives the product applies to how it gets distributed — match the ask to the receiver.
- [ ] **Target: 50 installs + 20 reviews in Week 1** from this channel alone

---

#### **Analytics for Growth (Pre-PostHog)**

*PostHog goes in Day 1 (ROADMAP 3.5). But set up basic attribution tracking before launch so you know which channels work.*

- [ ] **UTM parameters on all links** — Every link from social, email, Reddit, Product Hunt gets UTM tags. `?utm_source=tiktok&utm_medium=bio&utm_campaign=launch`
- [ ] **App Store Connect + Play Console analytics** — Both provide basic install source data for free. Check daily in Week 1
- [ ] **Track: installs by source, Day 1 retention, first action** — These three numbers tell you where to double down

---

#### **Implementation Order**

**Phase 1 (4–6 weeks before launch):** Create social accounts, landing page + waitlist, start content production, begin Reddit/community engagement
**Phase 2 (2–4 weeks before launch):** Publish 3 blog posts, start posting TikTok/Reels (3/week), begin influencer outreach, recruit beta testers
**Phase 3 (1–2 weeks before launch):** Beta testing window, set up pre-orders/pre-registration, prepare Product Hunt assets, schedule launch emails
**Phase 4 (Launch week):** Execute launch day playbook, monitor + engage across all channels, measure attribution

---

#### **Verification & Metrics**

*Group 12 is growth/ops work — no unit tests, but every item needs a measurable success criterion. Verify these before calling the group complete.*

**Content Marketing Engine**
- [ ] 10 short-form videos filmed + edited + scheduled before launch; posting cadence ≥3/week verified in social schedulers
- [ ] Landing page live at sazonchef.com with functional waitlist form (submit → confirmation email received in test inbox)
- [ ] 3 blog posts published and indexed by Google (site:sazonchef.com search returns them within 7 days)

**Community Seeding**
- [ ] 10 target subreddits identified with account karma ≥50 before any soft-launch post
- [ ] 3–5 confirmed influencer partnerships documented (name, follower count, agreed deliverable, free Premium code issued)

**Waitlist & Email List**
- [ ] Waitlist drip sequence (3 emails) fires correctly end-to-end via test signup; each email renders on mobile + desktop clients
- [ ] Waitlist reaches 500 emails before launch day (tracked in email provider dashboard)

**Product Hunt Launch**
- [ ] All launch assets reviewed by 2+ people before submission; tagline ≤60 chars, description ≤260 chars, 5 gallery images at correct resolution
- [ ] Launch scheduled for Tuesday or Wednesday, 12:01 AM PT; calendar reminder set

**App Store Pre-Order / Pre-Registration**
- [ ] Pre-order listing live on both iOS + Android stores before public launch date
- [ ] Pre-order links tested from waitlist emails + social bios (tap → store opens correctly on both platforms)

**Beta Testing Program**
- [ ] 20–30 beta testers enrolled across TestFlight + Play Internal Testing; ≥60% complete at least one meal plan generation
- [ ] Structured feedback form returns from ≥50% of testers; top 3 issues identified and closed before public launch
- [ ] All TestFlight/Internal crashes triaged via Sentry — zero unresolved P0/P1 crashes at launch

**Launch Day Playbook**
- [ ] Dry-run launch checklist executed T-minus 3 days; all deep links + store links verified on fresh iOS + Android devices
- [ ] Sentry + backend health dashboards open and monitored hourly on launch day; alert thresholds configured

**Referral Seed & Analytics**
- [ ] UTM parameters present on every pre-launch link; verified in App Store Connect + Play Console source attribution data
- [ ] Day 1 install source report generated; installs-by-source, D1 retention, and first-action numbers captured per channel

---

### **Group 13: App Store Launch** 📱

*Launching is not a feature — it's a gate. Everything in this group is non-negotiable for submission approval. This group also absorbs the remaining external service setups from Group 3 — infrastructure that requires account creation rather than code. Do it once, do it right, don't over-engineer it.*

---

#### **Infrastructure Finalization** 🏗️ *(moved from Group 3 — account setups)*

* [ ] **Sentry Frontend** — Install `@sentry/react-native`, wrap `_layout.tsx`. Backend already done. Add `SENTRY_DSN` to GitHub Secrets + production env.

* [ ] **Redis via Upstash** — Create Upstash account, add `UPSTASH_REDIS_URL` to env. The `ioredis` client + cache middleware already stubbed; this just turns it on.
  * Cache targets: home feed (5 min TTL), recipe search results (2 min TTL), subscription status (10 min TTL)

* [ ] **DDoS Protection** — Set up Cloudflare free tier in front of the API server. Point DNS through Cloudflare. Enable bot detection on auth endpoints. *(DNS change only — no code)*

* [ ] **Uptime Monitoring** — Create BetterUptime or UptimeRobot account (free tier), point at `GET /api/health`. Set up Slack/email alerts on downtime. *(external service setup only)*

* [ ] **Staging Environment** — Mirror of production on the same host. Deploy `main` to staging automatically on push; production on tag. *(needs hosting account)*

* [ ] **Database Backup** — Daily SQLite → S3/Cloudflare R2 via cron. 7-day retention. Test restore before launch. *(needs cloud storage account)*

* [ ] **Image Performance** — Verify `expo-image` with `contentFit="cover"` and `cachePolicy="memory-disk"` is consistent across all recipe/item image surfaces. Extend Cloudinary to recipe images if not already done.

* [ ] **Branch protection on `main`** — In GitHub repo settings → Branches → add a protection rule for `main`: (a) require pull request before merging (even solo — surfaces CI signal), (b) require status checks to pass, (c) disallow force pushes. Solo project today, but TestFlight builds will be triggered from `main` during App Review; one bad force-push could break a build mid-review. *(GitHub UI only — no code change.)*
  * **Verification:** `gh api repos/AAlcazar5/sazon-chef/branches/main/protection` returns the rule with `required_pull_request_reviews` and `allow_force_pushes: false`.

---

#### **Backend Hardening — Pre-Launch Security & Code-Quality Audit** 🛡️ *(launch blocker)*

> Surfaced by the 10Q quality-review pass (security + code + typescript reviewers, 2026-05-01). All items are **pre-existing project-wide concerns**, not 10Q regressions, but they must be resolved before any public submission. Tackle as a single auth-hardening / observability session — they share concerns and tests.

* [ ] **C1: Apply `authenticateToken` middleware to every authenticated route module**
  Every route file that mounts under `/api/*` and requires a logged-in user must call `router.use(authenticateToken)` at the top — current state of `shoppingListRoutes.ts`, `shoppingListShareRoutes.ts`, `pantryRoutes.ts`, `recipeRoutes.ts` (and likely others) is that auth is missing. Combined with C2 below, unauthenticated requests silently route through `getUserId` which falls back to `'temp-user-id'`, merging all anonymous traffic into one shared account.
  Audit by grepping `grep -L "authenticateToken" backend/src/modules/**/*Routes.ts` (no auth = no match) and adding `router.use(authenticateToken)` to each file that handles user-owned data.
  - **Test:** `backend/tests/middleware/authMiddleware.coverage.test.ts` — assert every route module that creates user-owned resources has `authenticateToken` as the first registered middleware. Test by invoking each registered route without a JWT and asserting 401. Reference list: `shoppingList`, `shoppingListShare`, `pantry`, `recipe`, `mealPlan`, `cookbook`, `purchaseHistory`, `voiceAdd`, `share/import`, `subscription`, `user`, `profile`.

* [ ] **C2: Remove the `JWT_SECRET` fallback string and fail at startup if env is missing**
  `backend/src/modules/auth/authMiddleware.ts:7` currently reads `process.env.JWT_SECRET || 'your-secret-key-change-in-production'`. If the env var is unset in production (deployment misconfig, container missing the secret, etc.), the app silently falls back to a publicly-known string and any attacker who reads the source code can forge tokens for any `userId`.
  Replace with: assert at module load time that `process.env.JWT_SECRET` is a non-empty string of ≥32 chars; throw on startup if missing. Also remove the `getUserId` `'temp-user-id'` fallback — make it throw `Error('Unauthorized')` when `req.user?.id` is absent.
  - **Test:** `backend/tests/modules/auth/jwtSecret.test.ts` — assert the module throws on import when `JWT_SECRET` env is unset OR shorter than 32 chars; assert `getUserId` throws when `req.user` is undefined; assert no fallback string appears anywhere via `grep -r "your-secret-key" backend/src` returning empty.

* [ ] **H2: `deleteItem` (and similar item-mutation handlers) must verify item-belongs-to-list**
  `backend/src/modules/shoppingList/shoppingListController.ts` `deleteItem` confirms the parent list is owned by `userId` but then calls `prisma.shoppingListItem.delete({ where: { id: itemId } })` without confirming the item is in that list. An attacker can supply a `listId` they own and an `itemId` from a different user's list. Compare to the correct pattern in `updateItem` which uses `where: { id: itemId, shoppingListId: listId }`.
  Fix: replace `prisma.shoppingListItem.delete` with `deleteMany({ where: { id: itemId, shoppingListId: listId } })` and 404 on `count === 0`. Audit the entire controller for the same antipattern (likely affects `togglePurchased`, `bulkUpdateItems`, and similar handlers).
  - **Test:** `backend/tests/modules/shoppingList/itemOwnership.test.ts` — for every item-mutating endpoint: (a) confirm 404 when itemId belongs to a different list owned by the same user, (b) confirm 404 when itemId belongs to another user entirely, (c) confirm 200/204 on the happy path. Parameterize across all endpoints to prevent regression.

* [ ] **H5: Rate limiter must default to production behavior, not permissive**
  `backend/src/middleware/rateLimiter.ts:7` currently disables rate limiting when `!process.env.NODE_ENV` is truthy (i.e., when `NODE_ENV` is unset). Any deployment that forgets to set `NODE_ENV=production` runs with rate limiting completely off, silently. Also no per-endpoint stricter limit on token-guess-able routes (`GET /import/:token` for share links, login attempts).
  Fix: invert the check — only disable rate limiting when `NODE_ENV === 'development'` (explicit opt-out). Add tighter per-endpoint limits: 10 req/15min/IP on `GET /shopping-lists/import/:token`, 5 req/15min/IP on auth endpoints (login/register).
  - **Test:** `backend/tests/middleware/rateLimiter.test.ts` — assert rate limiter is ACTIVE when `NODE_ENV` is unset or `'production'`; only inactive when `'development'`. Assert per-endpoint stricter limits applied to `/shopping-lists/import/:token` and `/auth/*`. Use `supertest` with rapid-fire requests to trigger the limit.

* [ ] **Split `shoppingListController.ts` (1953 lines, 2.4× over 800-line project max)**
  The controller has accumulated `generateFromRecipes`, `generateFromMealPlan`, `getBudgetPreview`, `getMergeSuggestion`, `dismissMergeSuggestion`, `markListDone`, `clearItems`, `bulkAddItems`, `voiceAdd`, plus the original CRUD handlers and a duplicated ingredient-name-extraction helper (lines ~658–700 vs ~1191–1215). Extract:
  - `shoppingListGenerationController.ts` — `generateFromRecipes`, `generateFromMealPlan`, `getBudgetPreview`, `voiceAdd` (these all share the ingredient-aggregation flow)
  - `shoppingListMergeController.ts` — `getMergeSuggestion`, `dismissMergeSuggestion`, `markListDone`, `clearItems`, `bulkAddItems` (could fold into existing `shoppingListLifecycleController.ts` instead)
  - `backend/src/utils/ingredientNameExtractor.ts` — extract the deduplicated regex-based ingredient-name parser used in both `generateFromRecipes` and `generateFromMealPlan`
  - Original `shoppingListController.ts` keeps only CRUD: `getShoppingLists`, `getShoppingList`, `createShoppingList`, `updateShoppingList`, `deleteShoppingList`, `addItem`, `updateItem`, `deleteItem`, `togglePurchased`.
  - **Test:** No new tests required — refactor must be a pure move with all existing tests still green. Verify by `npm test` before/after; coverage delta should be net-positive (smaller files → easier coverage analysis).

* [ ] **Replace 40+ `console.log`/`console.error` calls with a structured logger**
  `shoppingListController.ts` alone has 40 `console.log`/`console.error` statements; CLAUDE.md and project rules prohibit this in production code. Many include raw `userId` (PII) in plaintext. Pino is already a candidate project dependency (verify via `grep pino backend/package.json`); if not, install `pino` + `pino-pretty` for dev.
  Pattern: replace `console.log('[SHOPPING_LIST] ...', userId)` with `logger.info({ userId }, 'shopping_list.action')`. Suppress `info` logs in production by default; gate `debug` behind `LOG_LEVEL=debug` env. Audit all backend modules — not just shopping-list — for the same pattern.
  - **Test:** `backend/tests/utils/logger.test.ts` — assert logger correctly routes by level; assert `LOG_LEVEL=info` suppresses `debug`; assert structured fields (`userId`, `requestId`) appear in JSON output. Code-review check: `grep -rn "console\.\(log\|error\|warn\|debug\|info\)" backend/src --include="*.ts" | grep -v test` should return empty.

> **Implementation order (in one focused session):**
> 1. **C2 first** — establish that `JWT_SECRET` and `getUserId` fail closed before adding the middleware (otherwise tests for the middleware can't reliably distinguish "no token" from "token decoded as temp-user-id").
> 2. **C1** — add `authenticateToken` everywhere it's missing. Run the project test suite; expect a wave of test failures from tests that were silently relying on the temp-user-id fallback. Fix each test by setting up a proper auth context in the test setup.
> 3. **H2 + H5** — small, surgical fixes that can be done together.
> 4. **Logger migration** — high churn but mechanical. Do as a single sweep using `grep -l 'console\.' backend/src --include="*.ts" | xargs <fix>`.
> 5. **Controller split** — last, because it's pure refactor and the test suite must be green throughout.

---

---

#### **The Critical Insight: RevenueCat Replaces Three Separate Implementations**

Before writing a line of code, integrate [RevenueCat](https://revenuecat.com). It handles:
- **StoreKit** (iOS in-app purchases) — no manual StoreKit implementation
- **Google Play Billing** (Android in-app purchases) — no manual GP Billing implementation
- **Receipt validation** — no backend receipt verification code
- **Cross-platform subscription status** — one `GET /api/subscriptions/status`-equivalent SDK call
- **Webhooks to your backend** — single RevenueCat webhook, not separate Apple + Google server notifications

The Stripe integration in Group 7 handles web payments and backend subscription state. RevenueCat bridges mobile store billing into that same state via its webhook → your backend sync. The two coexist: Stripe for web, RevenueCat for iOS/Android.

📍 `npx expo install react-native-purchases` + configure with RevenueCat project API keys (iOS + Android)
📍 RevenueCat webhook → `POST /api/webhooks/revenuecat` → upserts same `subscriptionStatus` + `subscriptionTier` fields as Stripe webhooks

---

#### **iOS Submission Checklist**

*Every item here is required. Skip one and Apple rejects the build.*

* [ ] **App Store Connect** — Create app listing, configure name/description/keywords (100 char limit), set age rating (4+), set pricing (free with in-app purchases)
* [ ] **App icon** — 1024×1024 PNG, no alpha channel, no rounded corners (Apple adds them). Use the Sazon habanero mascot.
* [ ] **Screenshots** — Required sizes: 6.7" (iPhone 16 Pro Max) and 6.1" (iPhone 16). Minimum 3, maximum 10. Show the actual app — no marketing mockup frames that hide UI. Skip iPad for v1 (requires separate iPad-optimized layout).
* [ ] **Store description** — Lead with the hook in the first 255 chars (shown before "more"). Keywords naturally in description; don't keyword-stuff.
* [ ] **In-App Purchase products** — Configure Premium Monthly + Premium Annual in App Store Connect. RevenueCat links these to the same `premium` entitlement.
* [ ] **StoreKit sandbox testing** — Verify purchase → restore → cancel flow on a real device in sandbox mode before submission.
* [ ] **Compliance flags** — Check: uses encryption (yes, HTTPS — answer "yes, exempt"), contains ads (no), made for kids (no).
* [ ] **Build & upload** — `eas build --platform ios --profile production` → upload IPA via EAS Submit or Transporter → submit for review.

---

#### **Android Submission Checklist**

*Play Store is more lenient on timing but equally strict on policy.*

* [ ] **Play Console** — Create app, configure store listing, set content rating (complete questionnaire — food/recipe app is Everyone), set pricing
* [ ] **App icon** — 512×512 PNG (32-bit with alpha OK for Play)
* [ ] **Feature graphic** — 1024×500 PNG, shown at top of store listing. Use Sazon mascot + tagline.
* [ ] **Screenshots** — Phone screenshots required (minimum 2, recommend 5–8). Tablet optional for v1.
* [ ] **Data Safety section** — Complete in Play Console: declare data collected (email, dietary prefs, usage data), data shared (Spoonacular for recipe lookups), data encrypted in transit (yes), data deletion option (yes — account deletion in Profile).
* [ ] **Google Play Billing** — Configure subscriptions in Play Console (same Premium Monthly + Annual). RevenueCat links to `premium` entitlement.
* [ ] **Release tracks** — Internal → Closed Testing (5–10 testers) → Production. Don't skip internal/closed; catches build issues before public rollout.
* [ ] **Build & upload** — `eas build --platform android --profile production` → upload AAB → submit for review.

---

#### **Ko-fi / Buy Me a Coffee Setup** ☕

*The CoffeeBanner component and profile "Support Sazon" row are already implemented (Group 7). Before launch, wire in the real URL.*

* [ ] **Create Ko-fi account** — Go to [ko-fi.com](https://ko-fi.com), sign up, set display name to "Sazon Chef", add the habanero mascot as your profile image, write a short "what this supports" blurb.
* [ ] **Set suggested amounts** — Ko-fi lets you set a default donation amount. $3–$5 is the sweet spot for apps.
* [ ] **Get your page URL** — It will be `https://ko-fi.com/<your-handle>`. Copy it.
* [ ] **Replace placeholder URL** — Update `COFFEE_URL` in two places:
  * `frontend/components/premium/CoffeeBanner.tsx` (line ~9)
  * `frontend/app/(tabs)/profile.tsx` (line ~27)
* [ ] **Test the link** — Confirm `Linking.openURL()` opens the correct Ko-fi page on both iOS and Android before submitting.

---

#### **Legal & Compliance** *(Non-negotiable — both stores require these)*

* [ ] **Privacy Policy** — Hosted at a public URL (e.g., `sazonchef.com/privacy`). Must cover: data collected, how it's used, third parties (Spoonacular, OpenAI/Anthropic/Google, RevenueCat, Resend), user rights (deletion, access), contact email. Use a privacy policy generator (Termly, iubenda) as the starting point, then customize for our actual data flows.
  * 📍 Required by both stores; Apple will reject without a valid URL in App Store Connect.

* [ ] **Terms of Service** — Hosted at `sazonchef.com/terms`. Must include: subscription terms (cancellation, refunds per platform policy), content ownership (user-generated recipes), acceptable use, health disclaimer.

* [ ] **Health disclaimer** — "Sazon Chef is not a medical application. Nutritional information is provided for informational purposes only and should not be construed as medical advice. Consult a healthcare professional before making significant dietary changes." — **surface contextually inline (first AI-generated recipe view + first macro-goal change + first time the user sets a weight target), not as a static legal screen the user dismisses without reading**. Always linked from Profile + included in ToS.
  > **N=1 sharpening:** A static disclaimer screen is the same to every user; an inline contextual disclosure at the *moment* it's relevant respects the user's actual journey. Same compliance, better UX.

* [ ] **In-app links** — Privacy Policy and Terms of Service must be tappable in the app (Profile screen or Settings). Both stores validate this.

* [ ] **Delete Account** — Apple guideline 5.1.1 mandates a way for users to delete their account and all associated data within the app. The backend endpoint is defined in Group 5. Confirm the button is reachable from Profile without needing support, and that the data purge is complete before submitting for review.

---

#### **App Store Optimization: One Thing That Actually Matters at Launch**

*ASO is a long game. At launch, there's one lever worth pulling immediately: the review prompt.*

* [ ] **Review prompt** — Use `expo-store-review` (`StoreReview.requestReview()`). Fire it at the single best moment: after a user successfully completes a shopping trip in in-store mode (the "chef-kiss" success state). This is the highest-satisfaction moment in the app. Never prompt before value is delivered; never prompt more than once per 30 days. **Vary the in-app pre-prompt copy by cooking history depth: ≤5 cooks → "Loving Sazon? A quick rating helps a lot." 6–30 cooks → "You've cooked 12 plates this month — would you tell others?" 30+ cooks → "You're a Sazon power user — your review carries weight."**
  > **N=1 sharpening:** Same prompt to a day-1 user and a 100-cook user wastes the strongest social-proof signal Sazon has. Personalize the *ask*, not just the *moment*.
  * 📍 `frontend/components/shopping/ShoppingListComplete.tsx` → `StoreReview.requestReview()` after "all done" state

* [ ] **Keywords** — Research and fill the 100-character keyword field in App Store Connect (Play Store uses full description). Primary: "meal planner", "recipe organizer", "grocery list". Secondary: "AI recipes", "cooking assistant", "nutrition tracker". Use AppFollow or Sensor Tower free tier for gap analysis.

---

#### **Implementation Order**

**Phase 1 (1 week — legal + accounts):** Privacy policy + ToS published, App Store Connect + Play Console accounts created, RevenueCat project configured, IAP products created in both stores
**Phase 2 (3 days — assets):** App icon finalized, screenshots captured on real devices (6.7" iPhone + Android phone), feature graphic, store descriptions written
**Phase 3 (3 days — builds):** EAS production build configuration, iOS IPA + Android AAB built and uploaded, sandbox/internal testing
**Phase 4 (1 day — submit):** Submit iOS for review (3–5 day wait), submit Android for review (1–3 day wait), monitor for rejection reasons

---

#### **Tests to write alongside implementation**

**`backend/tests/webhooks/revenuecatWebhook.test.ts`**
- [ ] Rejects webhook missing RevenueCat authorization header (401)
- [ ] `INITIAL_PURCHASE` event → sets `subscriptionStatus: 'active'`, `subscriptionTier: 'premium'`
- [ ] `RENEWAL` event → extends `currentPeriodEnd` to new billing period
- [ ] `CANCELLATION` event → sets `subscriptionStatus: 'cancelled'`
- [ ] `EXPIRATION` event → downgrades user to `subscriptionTier: 'free'`, `subscriptionStatus: 'free'`
- [ ] `TRIAL_STARTED` event → sets `subscriptionStatus: 'trial'` + populates `trialEndsAt`
- [ ] `TRIAL_CONVERTED` event → sets `subscriptionStatus: 'active'`
- [ ] `BILLING_ISSUE` event → sets `subscriptionStatus: 'past_due'`
- [ ] Duplicate event (same `event_id`) handled idempotently — no double-update
- [ ] Stripe and RevenueCat webhooks produce identical final DB state for equivalent events (parity test)

**`frontend/__tests__/components/StoreReviewPrompt.test.ts`**
- [ ] `StoreReview.requestReview()` is called when shopping trip reaches the "all done" success state
- [ ] `StoreReview.requestReview()` is NOT called before the all-done state (e.g., on partial completion)
- [ ] `StoreReview.requestReview()` is NOT called twice within 30 days (prompt cooldown respected)

---

#### **E2E tests for the 3 revenue-critical flows** *(use `e2e-runner` agent)*

> App Review manually tests these 3 flows. Any failure here = automatic rejection. The `e2e-runner` agent has never been used on Sazon — must be added to CI before submission. Run via `/e2e` skill or invoke `e2e-runner` agent directly.

**`e2e/cold-start-onboarding.spec.ts` — New user → first recipe**
- [ ] Fresh install → registration → physical profile → preferences → macro goals → onboarding "Build your first plate" → home shows generated recipe
- [ ] Skipping onboarding still lands on a usable home screen (no empty state crashes)
- [ ] First recipe generation completes within 8s on a 4G-emulated network
- [ ] No console errors or unhandled promise rejections during the full flow

**`e2e/free-to-paywall-purchase.spec.ts` — Free user → paywall → premium unlocked**
- [ ] Free user hits Build-a-Plate daily limit → paywall sheet opens
- [ ] Tapping "Premium Monthly" → Stripe checkout (web) OR StoreKit sandbox (iOS native) OR Play Billing sandbox (Android native)
- [ ] Successful purchase → app polls subscription status → premium features unlock within 5s
- [ ] Restore Purchases button restores a previously purchased premium account
- [ ] Cancellation in store settings → app reflects `subscriptionStatus: 'cancelled'` within 1 polling interval

**`e2e/cooking-celebration.spec.ts` — Saved recipe → cooking → celebration**
- [ ] User opens cookbook → taps a saved recipe → "Cook Now" → cooking mode opens
- [ ] Step through each instruction → final step shows chef-kiss celebration with Lottie animation
- [ ] Cooking complete persists to meal history (verify via `GET /api/meal-history`)
- [ ] Taste rating prompt appears post-celebration; submitting a 5★ rating updates affinity score

**Cross-cutting requirements**
- [ ] All 3 specs run on iOS simulator AND Android emulator (matrix in CI)
- [ ] Artifacts (screenshots + traces + videos) uploaded on failure to GitHub Actions artifacts
- [ ] CI gate: PR cannot merge to `main` if any of these 3 specs is red (combine with branch protection above)

---

#### **Onboarding integration cross-link**

The "Build your first plate" onboarding step is specced in **Group 10 Build-a-Plate MVP → Onboarding integration**. It must ship in 10X Phase 1 — wiring it after launch costs ~3× more in onboarding A/B churn. The cold-start E2E above depends on it.

---

### **Group 14: User Testing & Optimization** 🔬 🔴 NOT SPECCED — needs scoping under N=1 lens

> **Status:** Listed in the Overview at 11h but the section was never written. Before scoping individual bullets, frame the entire group around the N=1 north star — generic A/B testing of "button color" or "copy variants" is not what this group should be.
>
> **N=1 framing for the group.** "User Testing & Optimization" in an N=1 product means measuring whether the personalization loop is actually closing for *each user*, not aggregate funnel metrics. The group's scope should be:
>
> 1. **Per-user signal-coverage dashboard** — for every active user, how many personalization signals have they generated (cooks, ratings, swaps, voice utterances, leftover decisions, photo uploads)? Surface users who are stuck at "low signal" — they're getting a generic experience and will churn. Trigger interventions (Coach nudge, onboarding revisit, low-friction signal-collection prompts).
> 2. **Cohort-level adaptation health** — measure the distance between two users' home feeds at day 7, day 30, day 90. If the distance isn't increasing over time, personalization is broken and every user is converging on the same content.
> 3. **Recommendation feedback loop instrumentation** — for every recommendation surface (home, composer, Coach, smart collections), log impression → tap → cook → rate. Compute per-surface "signal yield" (how often does a recommendation generate a downstream signal). Surfaces with low yield are noise.
> 4. **A/B testing framework restricted to *adaptation algorithms*, not UI** — run experiments on ranking weights, adjacency formulas, prompt-injection variants — never on whether to show a feature or what color a button is. UI experiments fragment the experience; algorithm experiments sharpen it.
> 5. **Churn root-cause via signal trace** — when a user churns, replay their last 14 days of personalization signals and identify the moment Sazon failed to adapt (a 1★ rating that didn't down-rank a cuisine; a swap-away that didn't update affinity; a leftover that wasn't surfaced). Use this to fix the adaptation engine, not the funnel.
>
> **Bullets to spec next session.** Each must include a `**Test:**` line per the project rule:
> - [ ] Per-user signal-coverage telemetry pipeline (PostHog event schema + dashboard query)
> - [ ] Cohort distance metric + weekly report (home-feed Jaccard distance across user pairs at d7/d30/d90)
> - [ ] Per-surface signal-yield instrumentation (impression → action → downstream signal)
> - [ ] Algorithmic A/B testing framework (variant key in scoring/ranking calls, not in UI components)
> - [ ] Churn-trace replay tool (admin-only, redacted PII, recent 14d signal log)
>
> Until specced, treat Group 14 as a placeholder. Do NOT bundle generic A/B tooling here without the N=1 framing — it would actively work against the north star.

---

## 📋 Deferred Tracker (consolidated)

> Single source of truth for everything intentionally parked. Each entry points to its detailed spec section above. Re-evaluate quarterly.

### 🔴 Not Started — full feature backlog

| Section | What | Why parked |
|---------|------|------------|
| **10R Food Intel** | 80+ contextual tip library + 6 surface points (recipe detail, cooking, home, shopping, meal plan) | Post-launch backlog — non-blocking for MVP |
| **10S Kitchen IQ** | 30+ unlockable knowledge cards + browse screen + progressive unlock | Post-launch backlog — non-blocking for MVP |
| **10Y Sazon Coach** (5 sub-phases A–E) | Premium chat tab w/ Claude API + memory + photo attach + tier gating + safety | Vital premium-anchor feature — needs its own dedicated multi-week build (separate from Group 10 cleanup) |
| **G11 Phase 5** | Content-quality gates + first-run cold-start tests | Depends on Phase 2/4 AI seed runs landing first |
| **G12** (entire group) | Pre-launch growth strategy: TikTok, Reddit, Product Hunt, beta, waitlist, influencers | Marketing/ops sequence — fires in launch window |
| **G13** (mostly) | App Store launch checklist, RevenueCat webhook tests, Store-review prompt, 3 E2E specs in CI | Fires when build is launch-ready |

### ⏸️ Deferred with explicit unblock condition

| Section | What | Unblock signal |
|---------|------|----------------|
| **9I Shared Element Transitions** | Recipe-card → detail hero morph | Reanimated v4 adds `sharedTransitionTag` typing, OR Expo Router ships first-class shared-element support |
| **10X Phase 5–9 frontend** | All composer UX surfaces (Fit pill, leftover strip, family columns, deep-link routing, skill-tier gating, nutrient badge, budget toggle, technique challenge, PDF export) | See `10X-Deferred — Frontend & UX punch list` above. Pick up in dedicated frontend session |
| **G11 P2/P4 AI seed runs** | Generate ~4,735 recipes via `npm run seed:ai` against `globalCuisinesSeedConfig` + `globalSnacksSeedConfig` | Multi-day Anthropic API run; ready when ops budget approved |
| **G11 P3 superfood detection expansion** | Add plantain, fenugreek, teff, bitter melon, moringa, etc. to `superfoodDetection.ts` | Bundle with Phase 5 content quality work |
| **G11 P1/P3 AI prompt addendum integration** | Wire `getHealthPromptAddendum` + adjacency hints into `aiRecipeService.ts` prompt builder | Touches existing AI service — bundle with Phase 5 |
| **10X PDF menu export** | Frontend PDF generation of saved plate as "build-your-own" template | Frontend `expo-print` / `react-native-pdf` work — bundle with Phase 9 frontend |

### 🟢 Stragglers (small leftovers in shipped sections)

_None — the 10X "My Plates" Smart Collection + "Vary this plate" variations service shipped this session (8 service + 3 smart-collection + 6 controller = 17 new tests; full suite 1,617 green). The 10Q-ListMgmt audit was a false positive (every item already `[x]` — earlier scan window bled into 10R)._




