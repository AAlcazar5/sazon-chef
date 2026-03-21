# 🚀 **Sazon Chef - Roadmap 3.0: Growth, Monetization & Scale + Advanced Features**

*This roadmap covers two areas: (1) Advanced feature enhancements moved from [ROADMAP_2.0](ROADMAP_2.0.md), and (2) analytics, ML optimization, monetization, and scale preparation.*

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
| **Group 10** | User Empowerment — "Healthy Food That Doesn't Suck" | 56h |
| **Group 11** | Recipe Database & Recommendation Engine (CRITICAL) | 45h |
| **Group 12** | App Store Launch | 20h |
| **Group 13** | User Acquisition & Growth Hacking | 10h |
| **Group 14** | User Testing & Optimization | 11h |
| **TOTAL** | | **~204h** |

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

#### **9B: Tab Bar & Navigation** 🧭
*The nav frame should be invisible until needed — glass, not chrome.*

##### Frosted Glass Tab Bar
- [ ] BlurView (iOS, intensity 40/60 dark/light) with semi-transparent tint overlay; solid semi-transparent on Android
- [ ] Use `tabBarBackground` API (NOT custom `tabBar` prop — causes render issues on non-home screens)
- [ ] Tab bar `position: 'absolute'` — content scrolls underneath
- [ ] Add `ComponentSpacing.tabBar.scrollPaddingBottom` to all tab screens
- [ ] ⚠️ Cannot use `href` and `tabBarButton` together (Expo Router constraint) — use `tabBarButton: () => null` alone to hide tabs

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

#### **9F: Copy & Language Audit** ✍️
*Every string the user reads should sound like a text from a friend, not an error log.*

- [ ] Error messages: replace any remaining "Error", "Failed", "Invalid" with Sazon personality ("Hmm, something went sideways", "That didn't quite work — try again?")
- [ ] Empty states: audit all screens — ensure every empty state uses `AnimatedEmptyState` with mascot + friendly CTA (not just "No items")
- [ ] Loading states: replace any `ActivityIndicator` with Sazon `thinking` expression + sequential status copy ("Finding your perfect match...", "Almost ready...")
- [ ] Notification settings: "Do Not Disturb" (not `quietHoursStart/End`), "Weekend mode" (not `weekendsOff`)
- [ ] Macro goals: "Daily protein target" (not "protein grams"), "How much you want to eat" (not "caloric intake")
- [ ] Shopping list progress: "Almost done! 3 items left" (not "75%"), "All done! Time to cook!" (not "100%")
- [ ] **Test:** Grep for banned terms (`quietHoursStart`, `prefer_avoid`, `strict`, `Error:`, `Failed to`, `Invalid`, `caloric intake`, `protein grams`) in user-facing strings — zero matches; every empty state renders `AnimatedEmptyState` with mascot; no screen uses raw `ActivityIndicator`

---

#### **9G: Lottie Mascot Animations** 🌶️
*Replace static PNG expressions with animated Lottie JSON for the app's emotional moments.*

**Mascot Cleanup (do this first, before commissioning animations):**
- The mascot used in the app header is the canonical Sazon design — all Lottie animations should be based on this version
- [ ] Audit all `SazonMascot` / `AnimatedSazon` usages across the app and identify which are using older, off-brand mascot assets
- [ ] Replace any remnant mascot images that don't match the header mascot with the correct asset
- [ ] Delete stale mascot image files from `assets/` once no longer referenced
- After cleanup, the single canonical PNG becomes the design reference for the animator

**Lottie Integration:**
- [ ] Commission or source animated Lottie files per expression: `excited`, `thinking`, `chef-kiss`, `confused`, `waving`, `sleeping`, `celebrating`
- [ ] `npx expo install lottie-react-native`
- [ ] Replace `SazonMascot` image source with `LottieView`; fall back to PNG if asset missing
- [ ] Wire Lottie mascot into all peak moments (cooking complete, shopping done, plan generated, paywall conversion)
- [ ] **Test:** Add `jest.mock('lottie-react-native', ...)` to `jest.setup.js`; verify mascot renders without crash; verify Lottie plays on peak moments

---

#### **9H: Modal → Bottom Sheet Migration** 📋
*Center modals feel like web popups. Bottom sheets feel native.*

- [ ] Install `@gorhom/bottom-sheet` (evaluate against `react-native-true-sheet` first — pick one)
- [x] Convert FilterModal (home screen) → bottom sheet
- [x] Convert CollectionPickerModal (cookbook/recipe detail) → bottom sheet
- [ ] Convert AddItemModal (shopping list) → bottom sheet
- [ ] Convert MergeListsModal (shopping list) → bottom sheet
- [ ] Convert any recipe action menus → bottom sheet
- [ ] Keep confirmation dialogs (delete, cancel) as centered alerts (platform convention)
- [ ] Bottom sheet styling: `borderRadius: 28` top corners, frosted glass handle, `Shadows.XL`
- [ ] **Test:** All converted modals open from bottom with spring animation; dismiss on swipe down; handle visible; each migrated bottom sheet preserves the same functionality as its original center modal (filters apply, items add, collections select); swipe-to-dismiss does not lose unsaved state

---

#### **9I: Advanced Delight** ✨
*These items elevate the app from "polished" to "premium." Tackle after 9A–9H.*

##### Shared Element Transitions
*Recipe card → recipe detail hero image morph.*
- [ ] Requires React Navigation Shared Element or Reanimated Layout Animations
- [ ] Tag card image with `sharedTransitionTag={recipeId}` and match in `modal.tsx` hero
- [ ] **Test:** Tapping a recipe card triggers shared element transition to detail hero image; back navigation reverses the transition; no flash of white/empty during morph
- **When to start:** After Lottie is done (reduces parallel animation complexity)

##### Dynamic Island / Live Activity (iOS 16+)
*Cooking timer visible in the Dynamic Island and Lock Screen.*
- [ ] Requires a native Swift extension (`ActivityKit` / `WidgetKit`)
- Backend: no changes needed — timer state stays local

##### Drag-to-Reorder Meal Plan Slots
*`DraggableMealCard` long-press activates full drag-to-reorder within a day.*
- Infrastructure exists: `isDragging`, `onDragStart`, `onDragEnd` props in `DraggableMealCard`
- [ ] Add `onReorder: (fromIndex: number, toIndex: number) => void` prop
- [ ] Use Reanimated `useAnimatedReaction` + `GestureDetector` for smooth drag
- [ ] **Test:** Long-press activates drag mode; drop calls `onReorder` with correct indices; list reorders correctly

##### Search Bar Cleanup
*Search bars are inconsistent across screens — audit and unify before launch.*
- [ ] Audit every search bar in the app (Home, Cookbook, Shopping List, etc.) for visual and behavioural consistency
- [ ] Standardise styling: same height, border radius, placeholder text style, icon placement, and focus state across all screens
- [ ] Ensure keyboard behaviour is consistent (returnKeyType, autoCorrect, autoCapitalize settings match across all instances)
- [ ] Extract a shared `SearchBar` component if one doesn't already exist, and replace one-off implementations
- [ ] **Test:** Verify search bar renders correctly and behaves consistently on both iOS and Android

##### Dark Mode Depth Pass
*Dark mode should use elevated surfaces, not just inverted grays.*
- [ ] Verify all cards use proper iOS dark elevation stack: base `#1C1C1E`, raised `#2C2C2E`, overlay `#3A3A3C`
- [ ] Orange accent becomes electric on near-black — verify CTA buttons and highlights glow
- [ ] Glassmorphism on key cards: `BlurView` + semi-transparent bg + subtle inner border for depth
- [ ] **Test:** Every screen in dark mode — cards visually separate from background; no "flat gray" syndrome

##### Data Visualization
*Numbers should be beautiful, not just readable.*
- [ ] Profile stats: animated counting numbers (0 → actual over 800ms, ease-out)
- [ ] Meal plan progress: animated ring/arc (SVG or Skia)
- [ ] Shopping list progress: animated progress bar with spring physics
- [ ] Macro display (recipe detail, meal plan): consider small donut/ring charts instead of plain text pills
- [ ] **Test:** All data visualizations animate on mount; animated counting numbers land on the exact correct value (not off-by-one); progress rings reflect actual data; VoiceOver reads current values correctly

---

---

#### **9-Inspo: Soft Gradient & Frosted Aesthetic** 🧊
*Patterns extracted from Airbnb redesign, ORIX Food Land, ice cream/salad/delivery apps, and dark recipe apps. These are the visual signatures that make an app feel premium and "soft" — not covered by existing Group 9 sections.*

##### Soft Gradient Screen Backgrounds
*Every inspo screen uses a subtle tinted gradient background — never flat white. This is the single biggest difference between "clean" and "premium."*
- [ ] Create a `ScreenGradient` wrapper component: `LinearGradient` with brand-tinted top → neutral bottom. Light mode: warm peach-white (`rgba(250,126,18,0.04)` → `#F2F2F7`). Dark mode: deep navy-black (`#1A1A2E` → `#0F0F0F`)
- [ ] Apply `ScreenGradient` as the base background on all tab screens (home, cookbook, meal plan, shopping list, profile)
- [ ] Auth screens (login, register): stronger gradient — Sazon orange tint at top (`rgba(250,126,18,0.12)` → white), matching the Airbnb onboarding warmth
- [ ] Onboarding: full brand gradient background (like Airbnb splash — coral/orange wash behind content)
- [ ] Paywall: dark gradient background (near-black → deep orange tint) — premium feel like the dark recipe app
- [ ] **Test:** `ScreenGradient` renders on both iOS and Android without performance issues; gradient is visible but subtle (not overwhelming); dark mode uses dark gradient variant; no white flash on screen transitions

##### Frosted Glass Cards
*Cards that look like frosted glass on a tinted background — the ORIX and hot dog detail screen effect.*
- [ ] Create a `FrostedCard` component: `BlurView` (expo-blur, intensity ~20) + semi-transparent white bg (`rgba(255,255,255,0.7)`) + `Shadows.MD` + `borderRadius: 20`. On dark mode: semi-transparent dark (`rgba(28,28,30,0.7)`)
- [ ] Apply `FrostedCard` to: recipe detail hero info section, profile stats card, meal plan day cards, shopping list category headers (in-store mode), scanner result cards
- [ ] Recipe detail: product/food hero section sits inside a frosted card (like ORIX hot dog detail — tinted card with food centered)
- [ ] **Test:** `FrostedCard` renders `BlurView` on iOS; Android fallback uses semi-transparent bg without blur; cards are visually distinct from screen gradient background; no performance degradation with multiple frosted cards on screen

##### Circular Food Thumbnails
*Across all food inspo apps — circular images for categories, ingredients, and small previews.*
- [ ] Category navigation chips (home, cookbook): replace text-only chips with **circular food emoji/icon + label** below (like the food delivery apps). Horizontally scrollable
- [ ] Ingredient display (recipe detail): show ingredients as circular thumbnail + label (like the dark recipe app's "Pork, Noodle, Corn, Eggs" row) instead of plain text list
- [ ] Meal plan day view: recipe thumbnails as small circles (40px) next to meal names
- [ ] Shopping list items: optional small circular product image next to item name (where available)
- [ ] **Test:** Circular thumbnails render as perfect circles (not ovals) on both platforms; images use `borderRadius: width/2`; placeholder shown when image unavailable; category chips show icon + label

##### Bold Typography Weight Contrast
*Every inspo screen has a dramatic gap between headline weight and body weight — much bigger than what we currently have.*
- [ ] Screen hero text (home greeting, profile name, paywall headline, onboarding titles): `FontWeight.extrabold` (800) + `FontSize.hero` (40px) — like "Ice cream Lover? Order & Eat." and "Hungry? Order & Eat."
- [ ] Mixed-weight headlines: first line bold, second line regular weight (like "My / Cart List", "Hungry? / Order & Eat.") — creates visual interest with two weights in one heading
- [ ] Metadata text (timestamps, counts, secondary info): `FontWeight.regular` (400) + `FontSize.xs` + `opacity: 0.5` — should nearly disappear visually
- [ ] Price/number emphasis: key numbers (macro values, recipe counts, costs) in `FontWeight.bold` while surrounding text stays regular
- [ ] **Test:** Heading-to-body weight ratio is at least 400 weight units apart (e.g., 800 vs 400); hero text renders at ≥36px on all screens; metadata text uses reduced opacity

##### Dark Mode Food Photography Treatment
*The dark recipe app screenshots prove food looks dramatically better on dark backgrounds.*
- [ ] Recipe cards in dark mode: use near-black card backgrounds (`#1C1C1E`) — food photos pop against dark
- [ ] Star ratings: render in **gold/amber** (`#FFB800`) on dark mode (high contrast, like the dark recipe app)
- [ ] Cook time badges: small translucent pill overlaid on recipe image (like "15 min" badge in the dark recipe app)
- [ ] Consider an optional "Dark Feed" toggle that uses dark card backgrounds even in light mode for the home feed — food photography just looks better this way
- [ ] **Test:** Food images have higher perceived contrast on dark backgrounds; star ratings use gold color in dark mode; cook time badges are legible over both light and dark food images

##### Macro/Nutrition Visual Display
*Inspired by the salad detail and dark recipe app — macros as visual elements, not clinical text.*
- [ ] Recipe detail macros: display as **small circular icons** with label below (Salt, Fat, Energy, Protein pattern from salad app) — icon + colored dot + value + label
- [ ] Ingredient thumbnails row: horizontal scroll of circular ingredient images with labels (like dark recipe app's ingredient circles)
- [ ] Consider color-coding macro values: protein = blue/teal, carbs = amber/orange, fat = purple, calories = red — consistent color language throughout
- [ ] **Test:** Macro circles render with correct icons and values; color coding is consistent across recipe detail, meal plan, and shopping list; colors meet WCAG contrast ratio on both light and dark backgrounds

##### CTA Placement & Styling
*Every inspo app puts the primary CTA at the absolute bottom, full-width, unmissable.*
- [ ] All primary CTAs: fixed to bottom of screen (not scrolled away), full-width with generous horizontal padding (20px each side), pill shape (`borderRadius: 100`), minimum height 56px
- [ ] CTA includes contextual info where relevant: "Add to Cart - $11.88" (like pizza detail), "Checkout - $26.43" (like green delivery cart) — our "Start Cooking" could show cook time, "Add to Meal Plan" could show the day
- [ ] Secondary CTAs: outlined style (border + transparent bg) beside primary (like "Add to Cart" + "Buy Now" side-by-side from ORIX)
- [ ] **Test:** Primary CTA is visible without scrolling on all screens where it exists; CTA includes contextual data where specified; minimum tap target 56px height

##### Colored Category Cards
*KOJO, Hi Chriz, and multiple food apps use distinct colored backgrounds per food category — green for salads, orange for mains, purple for desserts — not uniform neutral chips.*
- [ ] Define a `CATEGORY_COLORS` map: each cuisine/meal category gets a unique soft pastel background + darker text color pair (e.g., Italian → warm terracotta, Breakfast → soft yellow, Desserts → lavender, Salads → mint)
- [ ] Home screen category chips: render as rounded rectangles with category-specific background color + white/dark text + optional small icon or emoji
- [ ] Cookbook filter chips: same colored treatment — active category uses solid color, inactive uses 15% opacity tint of that color
- [ ] **Test:** Each category renders its unique color; colors meet WCAG contrast on both light/dark mode; no two adjacent categories share the same color

##### Ingredient Emoji Icons
*Multiple recipe apps (dark recipe app, Hi Chriz, burger app) display emoji next to each ingredient — 🧅 Onion, 🥑 Avocado — making lists scannable and friendly.*
- [ ] Create an `INGREDIENT_EMOJI` map: common ingredients → emoji (tomato → 🍅, onion → 🧅, chicken → 🍗, avocado → 🥑, egg → 🥚, rice → 🍚, cheese → 🧀, pepper → 🌶️, lemon → 🍋, carrot → 🥕, etc. ~40 items)
- [ ] Recipe detail ingredient list: prefix each ingredient row with its matched emoji (or a generic 🥄 fallback)
- [ ] Shopping list items: show emoji beside item name for visual scanning
- [ ] Cooking mode ingredient checklist: emoji + ingredient text for each row
- [ ] **Test:** Known ingredients render correct emoji; unknown ingredients use fallback; emoji renders correctly on both iOS and Android; no duplicate emojis in the map

##### Collection Photo Collage Grid
*Recipe collection/cookbook views in multiple apps show a 2x2 photo collage from contained recipes + a recipe count badge ("39+ Recipes") — much more visually appealing than a single cover image.*
- [ ] Cookbook collections list: render each collection as a **2x2 photo grid** (top-left large, three smaller) using the first 4 recipe images in that collection
- [ ] Recipe count badge: small pill overlay at bottom-right of the collage showing "12 Recipes" count
- [ ] Empty collection: show a placeholder pattern with the Sazon mascot + "Add your first recipe" prompt
- [ ] **Test:** Collage renders correctly with 0, 1, 2, 3, and 4+ recipe images; recipe count is accurate; images scale proportionally; placeholder shown for empty collections

##### Recipe Detail Hero Bottom Sheet
*Multiple apps (KOJO, orange recipe app, burger app) show the recipe photo as a full-bleed hero taking ~40% of the screen, with detail content sliding up over it as a bottom sheet with a visible drag handle.*
- [ ] Recipe detail (`modal.tsx`): hero image fills the top ~40% of the screen edge-to-edge (no padding, no rounded corners at top)
- [ ] Content section starts overlapping the hero image with a rounded top (`borderTopLeftRadius: 24, borderTopRightRadius: 24`) + white/dark background — creates the "sheet over photo" effect
- [ ] Small drag handle indicator (40px × 4px, centered, `borderRadius: 2`, gray) at the top of the content section
- [ ] Parallax scroll: hero image scales down slightly as user scrolls content up (use `Animated.event` on scroll offset)
- [ ] **Test:** Hero image fills full width with no gaps; content section overlaps hero by ~20px; drag handle is centered; parallax scroll animates smoothly; back button is visible over hero image (use semi-transparent dark backdrop)

##### Cooking Steps Vertical Timeline
*Several recipe apps (orange AI recipe app, green Hi Chriz) use a vertical dotted or solid line connecting numbered step circles — a visual progression indicator that's much clearer than plain numbered text.*
- [ ] Recipe detail steps section: render each step with a numbered circle (Sazon orange bg, white number) connected by a vertical dotted line to the next step
- [ ] Active step (in cooking mode): filled circle with pulse animation; completed steps: checkmark in circle; upcoming steps: outline only
- [ ] Line segment between steps: 2px dotted line in `Colors.border` (light) or `rgba(255,255,255,0.2)` (dark)
- [ ] **Test:** Timeline renders correctly with 1, 5, and 10+ steps; completed/active/upcoming states display distinct visuals; dotted line connects all steps without gaps; scrolling long step lists works smoothly

##### AI Scanner Floating Labels
*The orange recipe app shows ingredient identification with floating glassmorphic labels overlaid on the camera view — "Tomato ✓", "Basil ✓" appearing near detected items.*
- [ ] Scanner result overlay: when barcode/image is scanned, show identified items as **frosted pill labels** floating near the camera preview (using `BlurView` + semi-transparent bg, like a glassmorphic chip)
- [ ] Each label: ingredient name + small checkmark icon, positioned with absolute layout, subtle fade-in animation (opacity 0→1 over 300ms with spring)
- [ ] Labels auto-dismiss after 2s or when user taps "Add All"
- [ ] **Test:** Labels render over camera preview without blocking important content; fade-in animation plays; labels are legible on both light and dark camera backgrounds; auto-dismiss timer works

##### Celebration Social Share
*Multiple apps show a completion/celebration screen with a beautiful food photo background and social share buttons — turning accomplishments into shareable moments.*
- [ ] Cooking complete celebration: add a "Share My Creation" button below the confetti/mascot moment
- [ ] Share generates a branded card image: recipe photo + recipe name + "Cooked with Sazon Chef" watermark + cook time badge
- [ ] Use `react-native-share` or Expo's `shareAsync` to open native share sheet
- [ ] Optional: "Add a photo of your dish" camera prompt before sharing — user can snap their actual result
- [ ] **Test:** Share button opens native share sheet; generated share image includes recipe name and branding; share works on both iOS and Android; photo capture prompt is skippable

##### 2×2 Macro Grid with Accent Colors
*The orange recipe app and salad apps show macros in a compact 2×2 grid where the numeric values are large and accent-colored (orange/teal numbers, gray labels) — scannable at a glance.*
- [ ] Recipe detail macro section: display as a **2×2 grid** (Calories top-left, Protein top-right, Carbs bottom-left, Fat bottom-right) instead of a horizontal row
- [ ] Each cell: large accent-colored number (`FontWeight.bold`, `FontSize.xl`) + small gray label below (`FontSize.xs`, `opacity: 0.6`). Colors: Calories = `#FF6B35` (orange), Protein = `#00BFA5` (teal), Carbs = `#FFB300` (amber), Fat = `#7C4DFF` (purple)
- [ ] Grid background: subtle `FrostedCard` or light surface fill to group the 4 values visually
- [ ] Meal plan daily totals: same 2×2 layout for consistency
- [ ] **Test:** Grid renders all 4 macros with correct accent colors; numbers are legible on both light and dark mode; colors match the defined palette; layout doesn't break with large numbers (e.g., 2500 calories)

---

#### **9-Blind Spots: Final Audit Gaps** 🔍
*Patterns that appear across 3+ inspo screenshots AND were flagged by a full screen-by-screen audit of the current app — but aren't covered by any existing Group 9 section.*

##### Animated Splash Screen
*The first thing a user sees. Airbnb and ORIX both have a gradient splash with a logo animation — not a static image. This is a brand moment (P4, P8).*
- [ ] Create a custom splash/launch screen: brand gradient background (warm orange → peach, matching `ScreenGradient`) + Sazon logo/mascot fades in with spring scale (0.8 → 1.0) + subtle shimmer
- [ ] Splash transitions to auth/home with a cross-fade (not a hard cut)
- [ ] Use `expo-splash-screen` `preventAutoHideAsync` + manual `hideAsync` to control timing
- [ ] **Test:** Splash renders on both iOS and Android without white flash; animation plays for 1.5–2s; transition to next screen is smooth; dark mode uses dark gradient variant

##### Cook Time Badge on Recipe Card Image
*Almost every inspo app overlays a small translucent time pill ("⏱ 15 min") directly ON the food photo. Currently recipe cards show time as text below the image — this wastes vertical space and separates metadata from the hero image (P1 violation).*
- [ ] `RecipeCard` component: add a translucent time badge positioned absolute at bottom-left of the image area — semi-transparent dark bg (`rgba(0,0,0,0.6)`) + white text + `borderRadius: 100` pill + clock icon
- [ ] Optional difficulty badge: bottom-right of image ("Easy" in green pill, "Medium" in amber, "Hard" in red)
- [ ] Recipe detail hero: same time + difficulty badges overlaid on hero image
- [ ] **Test:** Badge is legible over both light and dark food photos; badge doesn't overlap heart/save button; renders correctly at different card sizes

##### Custom Pull-to-Refresh with Mascot
*Every premium app has a branded pull-to-refresh. The default iOS rubber band is a missed brand moment (P8: express personality in the gaps).*
- [ ] Create a `SazonRefreshControl` wrapper component: Sazon mascot peeks down as user pulls, transitions to `thinking` expression during refresh, snaps to `chef-kiss` on data return
- [ ] Apply to all scrollable tab screens (home, cookbook, meal plan, shopping list)
- [ ] Fall back to standard `RefreshControl` if `reduceMotion` is enabled
- [ ] **Test:** Custom refresh renders mascot on pull; mascot expression changes during refresh cycle; data reloads on release; `reduceMotion` shows standard refresh control

##### Tab Badge Counts
*Ice cream app cart badge, green delivery app notification count — tabs should communicate pending state (P3: silence is broken UX).*
- [ ] Shopping list tab: show count badge (number of unchecked items) when items exist
- [ ] Meal plan tab: show indicator dot when today has uncooked meals
- [ ] Badge styling: small orange circle (16px) with white number, positioned top-right of tab icon
- [ ] Badge animates in with spring scale when count changes
- [ ] **Test:** Badge shows correct count; updates in real-time when items are checked off; badge hidden when count is 0; animation plays on count change

##### Skeleton Loader Standardization
*Agent audit flagged inconsistent loading states — some screens use skeletons, some use `ActivityIndicator`, some use mascot. Philosophy bans `ActivityIndicator` outright (P3).*
- [ ] Audit every screen for loading state: replace ALL `ActivityIndicator` instances with screen-specific skeleton loaders or `LoadingState` with mascot expression
- [ ] Create skeleton templates for: recipe card (image placeholder + text lines), settings row (icon + text line), meal plan day (3 meal slots), shopping list category (header + 4 items)
- [ ] Ensure skeleton shimmer animation uses Reanimated (UI thread), not `Animated`
- [ ] **Test:** Zero `ActivityIndicator` imports exist in the codebase (grep test); every screen that fetches data shows either a skeleton or mascot loading state; shimmer animation runs at 60fps

##### Auth → App Visual Continuity
*Agent audit found login/register use gradient backgrounds and Moti animations, but main app screens are flat white — feels like two different apps (P8 violation).*
- [ ] Ensure `ScreenGradient` (from 9-Inspo) is applied to auth screens with the SAME gradient formula as tab screens — auth should use a slightly stronger tint, not a completely different color scheme
- [ ] Onboarding gradient should transition smoothly from auth gradient → app gradient (same color family, decreasing intensity)
- [ ] First-run home screen should carry a subtle gradient remnant from onboarding (warm peach tint slightly stronger than normal, fading over first 3 sessions via AsyncStorage counter)
- [ ] **Test:** Visual continuity — screenshot auth → onboarding → home in sequence; gradient family is consistent (same hue, varying intensity); no jarring color jump between screens

##### Semantic Color Tokens
*Agent audit found random greens, reds, oranges for status states with no defined hierarchy. Users can't quickly identify action types.*
- [ ] Add to `Colors.ts`: `success` (green — `#10B981` light / `#34D399` dark), `warning` (amber — `#F59E0B` / `#FBBF24`), `error` (red — `#EF4444` / `#F87171`), `info` (blue — `#3B82F6` / `#60A5FA`)
- [ ] Audit all status-colored elements and replace hardcoded hex values with semantic tokens
- [ ] Dietary severity: `error` for allergies (strict), `warning` for preferences (prefer_avoid) — replace current red/yellow with semantic tokens
- [ ] Shopping list "can't find": use `warning` color; "purchased": use `success` color
- [ ] **Test:** Semantic color tokens exist in Colors.ts for success/warning/error/info; each has light and dark mode variants; no hardcoded red/green/yellow hex values remain for status indicators

##### Swipe Affordance Hints
*Shopping list swipe-to-delete and cookbook long-press are invisible. Users won't discover them (P8: familiar patterns need discoverability).*
- [ ] First-time hint: on first shopping list visit, show a subtle animated hint — ghost swipe a sample item 40px left then spring back, once only (AsyncStorage `hasSeenSwipeHint`)
- [ ] First cookbook long-press: show a tooltip ("Hold to select multiple") on first visit, dismisses on tap
- [ ] Swipe affordance: items show a faint directional arrow or colored edge on the leading side (red for delete, green for complete) visible at rest — disappears after user has swiped 3+ times
- [ ] **Test:** Hint animation plays only on first visit; AsyncStorage flag persists; hint doesn't replay after dismissal; affordance edge colors match semantic tokens

##### Animated Counting Numbers on Stats
*MacroFactor reference in REDESIGN_PHILOSOPHY calls this out. Profile stats (meals cooked, streak, recipes saved) and macro totals should count up from 0 on mount — not appear static.*
- [ ] Create a `CountingNumber` component: animates from 0 → target value over 800ms using `withTiming` (easeOut) on mount
- [ ] Apply to: profile stats row (meals cooked, streak, recipes saved), recipe detail macro values, meal plan daily totals, Sazon Score
- [ ] Stagger: if multiple counting numbers are on screen, stagger their start by 100ms each (left to right)
- [ ] **Test:** Numbers animate from 0 to correct value; animation duration is ~800ms; stagger delay is visible between adjacent numbers; `reduceMotion` shows final value instantly

##### Modal Backdrop Standardization
*Agent audit found inconsistent backdrop opacities (`rgba(0,0,0,0.55)` vs `rgba(0,0,0,0.85)`) across different modals.*
- [ ] Define modal backdrop tokens in `Colors.ts`: `backdrop.light` = `rgba(0,0,0,0.4)` (standard modals), `backdrop.heavy` = `rgba(0,0,0,0.7)` (celebration overlays, paywall)
- [ ] Audit all modal/overlay components — standardize to use backdrop tokens instead of hardcoded values
- [ ] All modal backdrops: fade in over 200ms (not instant)
- [ ] **Test:** All modals use one of the two defined backdrop opacities; no hardcoded rgba backdrop values remain; fade-in animation plays

##### Premium Upsell Banner Visual Upgrade
*Current CoffeeBanner is text-heavy. The chicken/bakery app shows "Unlock Unlimited Recipes" as a rich dark rounded card with illustration — visually compelling, not nagging.*
- [ ] Redesign `CoffeeBanner`: dark gradient background (`#1A1A2E` → brand navy) + Sazon mascot illustration on the right side + bold white headline ("Unlock the full menu") + subtle shimmer on CTA button
- [ ] `borderRadius: 20` + `Shadows.LG` — should feel like a premium card, not an ad banner
- [ ] Home screen premium upsell: similar dark card treatment in the recipe feed (between carousels, not above content) — only for free-tier users
- [ ] **Test:** Banner renders with dark gradient on both light and dark mode; mascot illustration is visible; CTA is tappable; banner only shows for free-tier users; 7-day cooldown logic still works

##### Trending/Ranking Badges on Recipe Cards
*Dark recipe app shows "Top Trending #1" badge overlaid on cards. Von Restorff Effect (P4) — the best content should visually pop and look different from everything else.*
- [ ] Top-rated recipe cards: add a small gradient badge at top-left of the card image ("🔥 Top Pick" or "⭐ #1 This Week") with orange gradient bg + white text
- [ ] Recipe of the Day card on home: larger badge treatment ("Recipe of the Day" banner) with distinct visual presence
- [ ] Badge only appears on recipes meeting a threshold (e.g., Sazon Score > 85 or top 5% for that user)
- [ ] **Test:** Badge renders only on qualifying recipes; badge doesn't overlap other card elements (heart, time); gradient renders correctly; badge hidden on recipes below threshold

---

#### **9K: Pastel Color System & Gradient Foundation** 🎨
*The inspo folder's loudest signal: pastel-tinted surfaces everywhere. Every card, every stat, every category gets a subtle color identity. This is the single biggest gap between our current flat white UI and the warm, alive aesthetic in the inspo. Must be built as tokens FIRST so every screen-level task can consume them.*

##### Pastel Accent Token System
*Each macro, category, and state gets its own pastel. Light tints for backgrounds, vivid versions for progress rings and chart accents. See REDESIGN_PHILOSOPHY.md Color Palette for full spec.*
- [ ] Add to `Colors.ts` — **light pastel tints** (card/widget backgrounds):
  - `pastel.sage` → `#E8F5E9` (protein, healthy, vegetables, success)
  - `pastel.golden` → `#FFF8E1` (carbs, breakfast, streaks, star ratings)
  - `pastel.lavender` → `#F3E5F5` (fat/lipids, activity, premium badges)
  - `pastel.peach` → `#FFF3E0` (calories, meal plan, warm prompts)
  - `pastel.sky` → `#E3F2FD` (hydration, cooking time, info states)
  - `pastel.blush` → `#FCE4EC` (desserts, treats, cheat meal tags)
  - `pastel.orange` → `#FFF0E5` (Sazon brand tint for warm card backgrounds)
  - `pastel.red` → `#FFF0EE` (error state backgrounds, severity badges)
- [ ] Add to `Colors.ts` — **vivid accents** (rings, charts, active indicators):
  - `accent.sage` → `#81C784`, `accent.golden` → `#FFD54F`, `accent.lavender` → `#CE93D8`
  - `accent.peach` → `#FFB74D`, `accent.sky` → `#64B5F6`, `accent.blush` → `#F06292`
- [ ] Add to `Colors.ts` — **dark mode pastel adaptation** (rgba overlays at 12% opacity on `#1C1C1E`):
  - `pastelDark.sage` → `rgba(129, 199, 132, 0.12)`, `pastelDark.golden` → `rgba(255, 213, 79, 0.12)`
  - `pastelDark.lavender` → `rgba(206, 147, 216, 0.12)`, `pastelDark.peach` → `rgba(255, 183, 77, 0.12)`
  - `pastelDark.sky` → `rgba(100, 181, 246, 0.12)`, `pastelDark.blush` → `rgba(240, 98, 146, 0.12)`
- [ ] Create **macro-to-color mapping** constant: `MACRO_COLORS = { protein: { bg: pastel.sage, accent: accent.sage }, carbs: { bg: pastel.golden, accent: accent.golden }, fat: { bg: pastel.lavender, accent: accent.lavender }, calories: { bg: pastel.peach, accent: accent.peach } }`
- [ ] **Test:** All pastel tokens exist in Colors.ts with both light and dark variants; `MACRO_COLORS` maps all 4 macros correctly; dark mode pastels render as subtle tints (not blown-out light colors) on dark card surfaces

##### Gradient Presets
*Gradients are everywhere in the inspo — backgrounds, CTAs, overlays, onboarding. Centralise them so every screen pulls from the same source.*
- [ ] Create `frontend/constants/Gradients.ts` with named presets:
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
- [ ] Update `ScreenGradient` component (from 9-Inspo) to consume `Gradients.ts` presets instead of hardcoded values
- [ ] Update existing `GradientButton` to accept a `gradient` prop that defaults to `Gradients.primaryCTA`
- [ ] **Test:** All gradient presets export correctly; `ScreenGradient` renders different presets per screen; `GradientButton` accepts custom gradient arrays; gradients render on both iOS and Android without banding artifacts

##### Brand Button System 🔘
*The "Surprise Me!" FAB nails the feel we want everywhere: gradient pill, bold white text, spring press, colored shadow glow. We need this exact shape as a reusable primitive — a `BrandButton` component — with a **primary brand variant** (orange→red) plus **pastel accent variants** derived from the 9K pastel/accent tokens. Every CTA, chip, and action button in the app should be an instance of this one component.*

**Reference:** `SurpriseMeFAB.tsx` (gradient pill + spring bounce + shadow glow), `GradientButton.tsx` (current generic version — no spring animation, no shadow, no variants), `HomeHeader.tsx` Filters button (spring press + icon rotation + badge)

**Primary brand button (base):**
- [ ] Create `frontend/components/ui/BrandButton.tsx` — extends the gradient pill shape:
  - Full-width `borderRadius: 100` pill, `LinearGradient` background, white bold text, optional left icon
  - Reanimated spring press: scale 0.95 on press-in, bounce back 1.0 on press-out (matches SurpriseMeFAB feel)
  - Colored shadow glow: `shadowColor` matches the gradient's dominant hue (e.g., `#EF4444` for fire variant)
  - Idle pulse option: subtle 1.0→1.02 breathing animation for hero CTAs (like Surprise Me), off by default
  - Loading state: `ActivityIndicator` replaces label with spring fade
  - Disabled state: 55% opacity, spring ignored
  - Default gradient: brand orange→red (`['#fa7e12', '#EF4444']`)

**Pastel accent variants:**
- [ ] Add `variant` prop with named presets that map to 9K pastel/accent tokens:
  - `'brand'` (default): orange→red gradient, red shadow — primary CTAs (Save, Apply, Start Cooking)
  - `'sage'`: sage green gradient (`['#81C784', '#66BB6A']`), green shadow — success actions (Add to Meal Plan, Complete)
  - `'golden'`: amber gradient (`['#FFD54F', '#FFC107']`), amber shadow, dark text — highlight actions (Streak, Rate)
  - `'lavender'`: purple gradient (`['#CE93D8', '#AB47BC']`), purple shadow — premium actions (Upgrade, Meal Prep)
  - `'peach'`: warm peach gradient (`['#FFB74D', '#FF9800']`), orange shadow — warm prompts (Discover, Explore)
  - `'sky'`: blue gradient (`['#64B5F6', '#42A5F5']`), blue shadow — info actions (Share, Add to List)
  - `'blush'`: pink gradient (`['#F06292', '#EC407A']`), pink shadow — fun actions (Surprise Me, Cheat Meal)
  - `'ghost'`: transparent→5% opacity fill, no shadow, tinted text — secondary/cancel actions
- [ ] Each variant auto-derives: gradient colors, shadow color, text color (white for all except `golden` which uses dark text, `ghost` uses tinted text)
- [ ] Dark mode: same gradients but shadow opacity reduced to 20%, gradient saturation slightly boosted

**Compact chip variant:**
- [ ] Add `size` prop: `'large'` (default, 17px text, py-14, px-24) and `'compact'` (14px text, py-8, px-14)
  - Compact matches the HomeHeader Filters button and quick filter chip dimensions
  - Used for: filter chips, quick actions, inline CTAs
  - Large matches SurpriseMeFAB / Start Cooking dimensions
  - Used for: hero CTAs, bottom sheet apply buttons, onboarding next buttons

**Migration — replace existing buttons:**
- [ ] Migrate `GradientButton.tsx` → thin wrapper around `BrandButton` (backward compat, maps `GradientPresets` to variants)
- [ ] Migrate `SurpriseMeFAB.tsx` → uses `BrandButton` variant `'blush'` or `'brand'` with `idlePulse` enabled
- [ ] Migrate HomeHeader Filters button → uses `BrandButton` size `'compact'` variant `'ghost'` (inactive) / `'brand'` (active)
- [ ] Migrate FilterModal Apply button → uses `BrandButton` variant `'brand'` with filter count in label
- [ ] Audit all `HapticTouchableOpacity` + `LinearGradient` combos across the app and migrate to `BrandButton`

**Test:**
- [ ] All 8 variants render correct gradient + shadow color
- [ ] Spring press animation fires on press-in/press-out
- [ ] Idle pulse only active when `idlePulse` prop is true
- [ ] Compact size renders smaller dimensions than large
- [ ] Dark mode shadow opacity is reduced
- [ ] Loading state shows spinner, disabled state blocks press
- [ ] Backward compat: `GradientButton` still works after migration
- [ ] Accessibility: all variants have correct role, label, and disabled state

##### Category Color Map
*Each food category gets a unique pastel tint — making chips, cards, and filters scannable at a glance. Seen in KOJO, Copper Spoon, and multiple recipe apps.*
- [ ] Create `frontend/constants/CategoryColors.ts`:
  - `CATEGORY_COLORS` map: `{ breakfast: { bg: '#FFF8E1', text: '#F57F17', emoji: '🥞' }, lunch: { bg: '#E8F5E9', text: '#2E7D32', emoji: '🥗' }, dinner: { bg: '#FFF3E0', text: '#E65100', emoji: '🍝' }, dessert: { bg: '#FCE4EC', text: '#C2185B', emoji: '🍰' }, snack: { bg: '#F3E5F5', text: '#7B1FA2', emoji: '🥨' }, healthy: { bg: '#E8F5E9', text: '#2E7D32', emoji: '💪' }, quick: { bg: '#E3F2FD', text: '#1565C0', emoji: '⚡' }, budget: { bg: '#FFF8E1', text: '#F57F17', emoji: '💰' } }`
  - `CUISINE_COLORS` map: `{ italian: { bg: '#FFF3E0', emoji: '🍝' }, mexican: { bg: '#FFF0E5', emoji: '🌮' }, korean: { bg: '#FCE4EC', emoji: '🥘' }, thai: { bg: '#E8F5E9', emoji: '🍜' }, indian: { bg: '#FFF8E1', emoji: '🍛' }, american: { bg: '#FFF3E0', emoji: '🍔' }, japanese: { bg: '#E3F2FD', emoji: '🍱' }, chinese: { bg: '#FFF0EE', emoji: '🥟' }, mediterranean: { bg: '#E8F5E9', emoji: '🫒' }, french: { bg: '#F3E5F5', emoji: '🥐' } }`
- [ ] Apply to home screen quick filter chips: render with category-specific `bg` color + `emoji` prefix + `text` color
- [ ] Apply to cookbook filter chips: active = solid category color, inactive = 15% opacity tint
- [ ] Apply to onboarding cuisine selection chips: icon + label + pastel background
- [ ] Apply to meal plan meal type indicators (breakfast/lunch/dinner labels on cards)
- [ ] **Test:** Each category renders its unique color; no two adjacent categories share the same color in chip rows; colors meet WCAG contrast on both light and dark; emoji renders correctly on both platforms

---

#### **9L: Widget Cards & Colorful Analytics** 📊
*The inspo folder — Apple Health widgets, Duolingo streaks, MacroFactor rings, Copper Spoon dashboards — demands that data be shown as beautiful, colorful visual moments. Not plain text. This is the biggest transformation for the meal plan, profile, and cooking completion screens.*

##### WidgetCard Component
*A reusable pastel-tinted stat card used across macro display, profile stats, cooking stats, shopping progress. The foundational building block for colorful analytics.*
- [ ] Create `frontend/components/ui/WidgetCard.tsx`:
  - Props: `tint` (pastel bg color), `icon` (emoji or Lucide icon), `statValue` (string/number), `statUnit` (optional — "g", "kcal", "days"), `label` (descriptive text), `trend` (optional — `{ value: string, direction: 'up' | 'down' }`)
  - Layout: `borderRadius: 20`, no border, `Shadows.SM`, pastel `tint` background, `icon` top-left, `statValue` in `FontSize.stat` (28px) / `FontWeight.extrabold`, `statUnit` next to value in `FontSize.caption` at 50% opacity, `label` below in `FontSize.label`, optional `trend` arrow in sage (up) or blush (down)
  - Dark mode: use pastelDark tint from Colors.ts instead of light pastel
  - Support `onPress` for tappable widgets (e.g., tap protein card → see protein breakdown)
- [ ] Create `frontend/components/ui/WidgetGrid.tsx` — a 2×2 grid layout wrapper (`flexWrap: 'wrap'`, `gap: 12`) that renders 4 `WidgetCard` children
- [ ] **Test:** WidgetCard renders with correct tint, stat, label, and trend on both platforms; WidgetGrid renders 4 cards in a 2×2 layout; dark mode uses dark pastel tints; `onPress` fires when provided

##### Macro Widget Grid (Meal Plan Screen)
*Replace the current plain-text macro summary with a colorful 2×2 grid of pastel-tinted widget cards — the single most visual upgrade for the meal plan screen. Inspired by Apple Health goal cards and the widgets-goals inspo image.*
- [ ] Add `MacroWidgetGrid` to the top of the meal plan screen (above day selector):
  - Protein card: sage green tint, 🥩 icon, bold gram value, "Protein" label, weekly trend arrow
  - Carbs card: golden yellow tint, 🌾 icon, bold gram value, "Carbs" label, weekly trend
  - Fat card: soft lavender tint, 🥑 icon, bold gram value, "Fat" label, weekly trend
  - Calories card: warm peach tint, 🔥 icon, bold kcal value, "Calories" label, daily goal % ring
- [ ] Each card uses `CountingNumber` (from 9-Blind Spots) to animate from 0 → value on mount
- [ ] Tapping a macro card could expand to show a weekly sparkline (progressive disclosure)
- [ ] Daily totals below the grid update as user selects different days
- [ ] **Test:** Grid renders above day selector; values match actual meal plan data; counting animation plays on mount; dark mode uses dark pastel tints; tapping cards is responsive

##### Progress Ring Component
*A reusable circular progress indicator used for daily calorie goal, shopping progress, cooking streak, Sazon Score. Inspired by Apple Fitness rings.*
- [ ] Create `frontend/components/ui/ProgressRing.tsx`:
  - Props: `progress` (0–1), `size` (diameter), `strokeWidth`, `color` (gradient array or solid), `bgColor` (track color), `children` (center content — icon, number, mascot)
  - Implement with `react-native-svg` `Circle` + `strokeDasharray`/`strokeDashoffset`
  - Animated: ring fills from 0 → progress value on mount using Reanimated `withTiming`
  - Support gradient stroke via `LinearGradient` + `Defs` in SVG
- [ ] Create `frontend/components/ui/ConcentricRings.tsx` — Apple Fitness-style nested rings:
  - Outer ring: calories (peach vivid gradient)
  - Middle ring: protein (sage vivid gradient)
  - Inner ring: cooking streak (Sazon orange gradient)
  - Center: Sazon mascot expression or day number
- [ ] **Test:** Ring animates from 0 to correct progress; gradient renders; nested rings don't overlap; `reduceMotion` shows final state instantly; ring handles 0%, 50%, 100%, and >100% values

##### Meal Plan Screen — Colorful Analytics Integration
*Apply the widget cards, progress rings, and pastel tints to the meal plan screen specifically. This screen becomes the analytics dashboard of the app.*
- [ ] **Daily calorie ring** — large ProgressRing (120px) showing today's calories vs goal, centered above the macro widget grid. Sazon mascot expression in center (happy if on track, thinking if behind, chef-kiss if exceeded)
- [ ] **Day cards with alternating pastel tints** — each day of the week gets a subtle pastel tint so the week feels colorful: Mon = peach, Tue = sage, Wed = sky, Thu = golden, Fri = lavender, Sat = blush, Sun = orange
- [ ] **Meal type indicators** — breakfast/lunch/dinner/snack labels on meal cards rendered as small pastel pills with matching CategoryColors
- [ ] **Weekly nutrition trend** — below the day view, a small horizontal stacked bar chart showing macro distribution per day (protein = sage, carbs = golden, fat = lavender). Use `react-native-gifted-charts` or custom SVG
- [ ] **Empty day state** — Sazon `waving` expression on a warm peach pastel background card + "Tap + to fill this slot" in friendly copy
- [ ] **Meal plan generation loading** — Sazon `thinking` on a peach gradient background + sequential status messages ("Building your perfect week...", "Balancing your macros...", "Almost ready...")
- [ ] **Test:** Calorie ring shows correct daily total; day tints alternate correctly; meal type pills use CategoryColors; weekly trend chart renders with correct macro data; empty state shows mascot on pastel bg; generation loading shows mascot + messages

##### Profile Screen — Stat Widget Grid & Streak Calendar
*Transform the profile stats from static text into a colorful widget dashboard. The streak calendar is the Duolingo move that makes users addicted to consistency.*
- [ ] **Stat widget grid** (2×2 or 1×3 row) at top of profile:
  - Cooking streak: golden yellow tint, 🔥 flame icon, bold day count, "Day Streak" label, animated flame pulse
  - Recipes cooked: sage green tint, 👨‍🍳 icon, bold count, "Recipes Cooked" label
  - Sazon Score: warm peach tint, ⭐ icon, bold score with ProgressRing behind it
  - Recipes saved: sky blue tint, 📚 icon, bold count, "In Cookbook" label
- [ ] **Streak calendar heat map** (Duolingo-style) below stats:
  - 7-column calendar grid showing last 4 weeks
  - Each day: small circle — sage green dot = cooked that day, faint gray = no activity, Sazon orange = today
  - Current streak number prominent: "🔥 12 day streak" with CountingNumber animation
  - Streak milestones (7, 14, 30 days): golden border on day circles for milestone days
- [ ] **Weekly progress comparison** — "This Week vs Last Week" mini comparison cards:
  - Meals cooked this week (sage) vs last week
  - Avg calories (peach) with trend arrow
  - New recipes tried (sky) count
- [ ] **Test:** Widget grid renders with correct data and pastel tints; streak calendar shows correct days; today is highlighted; streak count matches actual consecutive cooking days; heat map handles months with different day counts; CountingNumber animates on mount

##### Cooking Complete — Colorful Stat Cards
*The cooking completion celebration (9C) should include colorful stat cards, not just confetti. Each cooking stat gets its own pastel-tinted mini widget.*
- [ ] After confetti + Sazon chef-kiss, slide up a row of stat cards:
  - Cook time: sky blue tint, ⏱ icon, bold time value ("32 min")
  - Steps completed: sage green tint, ✅ icon, bold count ("8/8 steps")
  - Streak update: golden yellow tint, 🔥 icon, bold streak count ("+1 → 12 days!")
  - Difficulty: lavender tint, 📊 icon, difficulty badge ("Easy" / "Medium" / "Hard")
- [ ] Stat cards stagger in from bottom (100ms delay per card, Moti translateY)
- [ ] Each stat value uses CountingNumber animation
- [ ] **Test:** All 4 stat cards render with correct values; stagger animation plays; CountingNumber animates; stats match actual cooking session data

##### Shopping List — Progress Ring & Aisle Tints
*The shopping list needs a visual progress indicator and color-coded aisle sections.*
- [ ] **Progress ring at top** — ProgressRing (80px) showing % items purchased. Ring color transitions from Sazon orange → sage green as progress increases. Center shows remaining count in bold
- [ ] **Aisle section headers with pastel tints** — each aisle category gets a subtle pastel background tint + emoji:
  - Produce → sage green tint + 🥬
  - Dairy → sky blue tint + 🥛
  - Meat → blush pink tint + 🥩
  - Bakery → golden yellow tint + 🍞
  - Pantry → warm peach tint + 🥫
  - Frozen → sky blue tint + 🧊
  - Snacks → lavender tint + 🍿
  - Can't Find → warm peach tint + 🤷
- [ ] **Section completion** — when all items in an aisle are checked, header flashes sage green briefly + aisle collapses with spring animation
- [ ] **Test:** Progress ring updates in real-time as items are checked; aisle headers render with correct pastel tints and emoji; section completion flash plays; ring reaches 100% when all items done

---

#### **9M: Ingredient & Category Visual Identity** 🥑
*The inspo folder's most striking pattern: ingredient lists with beautiful illustrated icons, not plain text. Every recipe app that looks premium has this. Combined with the category icon system, this transforms text-heavy screens into visual feasts.*

##### Ingredient Icon Map (Comprehensive)
*The beautiful-ingredient-icons inspo images show photorealistic icons next to every ingredient. We start with emoji (free, instant) and upgrade to illustrations later.*
- [ ] Create `frontend/constants/IngredientIcons.ts` with `INGREDIENT_EMOJI` map (~100 items):
  - **Proteins:** chicken → 🍗, beef → 🥩, pork → 🥓, fish → 🐟, shrimp → 🦐, egg → 🥚, tofu → 🫘, turkey → 🦃, salmon → 🐟, tuna → 🐟, lamb → 🥩, bacon → 🥓, sausage → 🌭
  - **Vegetables:** tomato → 🍅, onion → 🧅, garlic → 🧄, pepper → 🌶️, carrot → 🥕, broccoli → 🥦, corn → 🌽, potato → 🥔, mushroom → 🍄, lettuce → 🥬, spinach → 🥬, cucumber → 🥒, avocado → 🥑, celery → 🥬, zucchini → 🥒, eggplant → 🍆, peas → 🫛, sweet potato → 🍠, cabbage → 🥬, cauliflower → 🥦, green onion → 🧅, ginger → 🫚, jalapeño → 🌶️, bell pepper → 🫑
  - **Fruits:** lemon → 🍋, lime → 🍈, apple → 🍎, banana → 🍌, orange → 🍊, strawberry → 🍓, blueberry → 🫐, mango → 🥭, pineapple → 🍍, coconut → 🥥, grape → 🍇, watermelon → 🍉, peach → 🍑, pear → 🍐, cherry → 🍒, kiwi → 🥝
  - **Dairy:** milk → 🥛, cheese → 🧀, butter → 🧈, yogurt → 🥛, cream → 🥛, cream cheese → 🧀, sour cream → 🥛, mozzarella → 🧀, parmesan → 🧀
  - **Grains:** rice → 🍚, pasta → 🍝, bread → 🍞, flour → 🌾, oats → 🌾, tortilla → 🫓, noodles → 🍜, quinoa → 🌾, couscous → 🌾, cornstarch → 🌾
  - **Pantry:** olive oil → 🫒, soy sauce → 🥫, honey → 🍯, sugar → 🍬, salt → 🧂, vinegar → 🫙, peanut butter → 🥜, chocolate → 🍫, vanilla → 🌿, cinnamon → 🌿, cumin → 🌿, paprika → 🌶️, oregano → 🌿, basil → 🌿, thyme → 🌿, rosemary → 🌿, bay leaf → 🍃, chili flakes → 🌶️, nutmeg → 🌰, curry powder → 🍛
  - **Nuts/Seeds:** almond → 🌰, walnut → 🌰, peanut → 🥜, cashew → 🌰, sesame → 🌰, sunflower seeds → 🌻, chia seeds → 🌱, flaxseed → 🌱
  - **Liquids:** water → 💧, broth → 🥣, stock → 🥣, wine → 🍷, beer → 🍺, coconut milk → 🥥, juice → 🧃
  - **Fallback categories:** vegetable → 🥬, fruit → 🍎, meat → 🥩, seafood → 🦐, spice → 🌿, grain → 🌾, dairy → 🥛, nut → 🥜, liquid → 💧, other → 🥄
- [ ] Create `getIngredientEmoji(name: string): string` function — fuzzy match ingredient name against map keys (lowercase, remove plurals, strip modifiers like "fresh", "diced", "chopped"), return emoji or fallback
- [ ] **Test:** Known ingredients return correct emoji; fuzzy matching handles "diced tomatoes" → 🍅, "fresh basil leaves" → 🌿, "chicken breast" → 🍗; unknown ingredients return 🥄 fallback; no crashes on empty/null input

##### Recipe Detail — Visual Ingredient List
*Transform the ingredient list from plain text bullets into a visually rich display with emoji icons, bold amounts, and grouped sections. Inspired by the beautiful-ingredient-icons inspo images.*
- [ ] Each ingredient row: `[emoji icon] [ingredient name]` left-aligned + `[bold amount]` right-aligned (e.g., 🧅 Green onion ............. **10g**)
  - Emoji from `getIngredientEmoji()`
  - Name in `Body` typography (15px/400)
  - Amount in `Body Bold` typography (15px/600)
  - Row height: 48px minimum with `paddingVertical: 8`
- [ ] Group ingredients by section when recipe provides them ("The sauce", "The chicken", etc.) — section headers in `Heading 3` (17px/600)
- [ ] Metric/US toggle pill at the top of ingredients section (like the inspo — rounded segmented control with `borderRadius: 100`)
- [ ] Serving adjuster (– 1 serving +) with rounded square buttons
- [ ] **Test:** All ingredients show correct emoji; amounts are right-aligned and bold; sections group correctly; metric/US toggle switches values; serving adjuster recalculates amounts

##### Recipe Detail — Macro Pills Row with Pastel Tints
*Replace the current plain macro pills with pastel-tinted pills, each macro its own color. Inspired by the 2×2 macro grid and nutrition circles in inspo.*
- [ ] Macro pills row below the recipe metadata strip:
  - Protein pill: sage green bg (`pastel.sage`), sage vivid text, "32g protein"
  - Carbs pill: golden bg (`pastel.golden`), golden vivid text, "45g carbs"
  - Fat pill: lavender bg (`pastel.lavender`), lavender vivid text, "18g fat"
  - Calories pill: peach bg (`pastel.peach`), peach vivid text, "480 kcal"
  - Optional fiber pill: sky bg, "8g fiber"
- [ ] Pills are `borderRadius: 100` (pill shape), horizontal scroll if needed
- [ ] Each pill: pastel tint bg + vivid accent text + bold number + regular unit
- [ ] **Test:** All macro pills render with correct pastel tints; colors match MACRO_COLORS mapping; pills scroll horizontally on small screens; values are accurate

##### Cooking Mode — Ingredient Checklist with Icons
*The cooking mode ingredient checklist should show emoji icons next to each ingredient for quick visual scanning while hands are busy.*
- [ ] `IngredientChecklist.tsx`: prefix each row with emoji from `getIngredientEmoji()`
- [ ] Checked items: emoji stays, text gets strikethrough + reduced opacity, spring scale animation
- [ ] Group by recipe section if applicable
- [ ] **Test:** Emoji renders next to each ingredient; check/uncheck animates; all ingredients from recipe appear

##### Shopping List — Ingredient Icons
*Shopping list items should also show ingredient emoji for visual scanning, especially in in-store mode where users are moving fast.*
- [ ] `ShoppingListItem.tsx`: add emoji prefix from `getIngredientEmoji()` before item name
- [ ] In-store mode: emoji is especially prominent (slightly larger) for fast scanning
- [ ] **Test:** Emoji renders on shopping list items; emoji matches ingredient; items without a match show fallback emoji

##### Home Screen — Category Chips with Icons & Pastel Tints
*Replace text-only filter chips with icon + label chips on pastel backgrounds. The most visible application of CategoryColors.*
- [ ] Quick filter chips: render as `[emoji] [label]` on `CATEGORY_COLORS[category].bg` background with `CATEGORY_COLORS[category].text` text color
- [ ] Active chip: full pastel color bg + white text (or dark text depending on contrast). Inactive: 15% opacity tint of that pastel
- [ ] Spring scale on selection (`0.95 → 1.0`)
- [ ] Horizontally scrollable row with `showsHorizontalScrollIndicator: false`
- [ ] **Test:** Each chip shows correct emoji + color; active/inactive states are visually distinct; spring animation plays on tap; horizontal scroll works without jank

##### Cookbook Screen — Collection Photo Collage with Count Badge
*Multiple inspo apps show recipe collections as a 2×2 photo grid with a count badge — much richer than a single cover image.*
- [ ] Each collection card: 2×2 photo grid using first 4 recipe images in collection
  - Top-left image: larger (60% width), top-right: smaller (40% width)
  - Bottom-left + bottom-right: equal split
  - All images: `borderRadius: 12`, `overflow: hidden`
- [ ] Recipe count badge: small orange pill at bottom-right overlay ("12 Recipes")
- [ ] Collection name below the grid in `Heading 3`
- [ ] Empty collection: Sazon `waving` mascot placeholder + "Add your first recipe"
- [ ] **Test:** Collage renders correctly with 0, 1, 2, 3, and 4+ recipe images; placeholder shows for missing images; count badge is accurate; `borderRadius` clips correctly

---

#### **9N: Onboarding, Auth & Error States — Pastel Personality** 🌸
*The inspo folder shows onboarding with full-screen pastel gradient backgrounds, mascot reactions per screen, and warm, inviting color stories. Error and empty states get pastel backgrounds + mascot expressions instead of flat white + gray text.*

##### Onboarding — Pastel Gradient Backgrounds Per Step
*Each onboarding screen gets its own pastel gradient from `Gradients.ts`. Sazon mascot reacts differently per screen. Seen in the pastel-sample-gradient inspo images.*
- [ ] Screen 1 (Welcome/Name): `Gradients.onboarding1` (peach → cream) background. Sazon `waving` expression. Large hero text: "What's your name?" in `FontSize.hero` / `FontWeight.extrabold`
- [ ] Screen 2 (Restrictions): `Gradients.onboarding2` (sage → cream) background. Sazon `thinking` expression. Restriction options as icon + label chips with pastel tints (red pastel for allergies, yellow for preferences). Max 5 shown + "More" disclosure
- [ ] Screen 3 (Goal): `Gradients.onboarding3` (lavender → cream) background. Sazon `excited` expression. Three large goal cards: "Eat Healthy" (sage tint), "Save Time" (sky tint), "Explore Cuisines" (peach tint) — each with an icon and short description
- [ ] Transition between screens: spring slide (scale 0.95 → 1.0 + opacity) with gradient crossfade
- [ ] Progress indicator at top: 3-dot pagination with orange active dot
- [ ] **Test:** Each screen renders its unique gradient; mascot expression changes per screen; transitions are smooth; progress dots update; user can complete onboarding in exactly 3 taps

##### Auth Screens — Brand Gradient + Mascot
*Login and register should feel warm and branded, not like a utility gate.*
- [ ] Background: `Gradients.authBg` (warm orange tint → cream) — subtle but distinctly warmer than the main app
- [ ] Sazon mascot bounces in on warm pastel background card at top
- [ ] Form inputs grouped in a `FrostedCard` with subtle shadow — not floating individually
- [ ] Social login buttons (Google, Apple): on white card with `Shadows.SM`, `borderRadius: 14`
- [ ] Error: Sazon `confused` expression replaces the form header + pastel red tint on error card
- [ ] Success: brief Sazon `excited` flash (300ms) before navigation
- [ ] **Test:** Gradient renders; mascot bounces in; form fields are grouped; error shows mascot + pastel tint; visual continuity from auth → onboarding → home (same color family)

##### Error States — Pastel Backgrounds + Mascot
*Every error state should feel like a moment of personality, not a system failure.*
- [ ] API error: Sazon `confused` on lavender pastel background card + witty message ("Hmm, something went sideways — let me try again")
- [ ] No results: Sazon `thinking` on peach pastel background card + "Let me think of something else..." + re-generate CTA
- [ ] Network offline: Sazon with umbrella expression on sky blue pastel background + "We'll be back when you're connected"
- [ ] Timeout: Sazon `sleeping` on golden pastel background + "That took too long — want to try again?"
- [ ] Apply to all `AnimatedEmptyState` instances — ensure every empty state has a pastel tint bg, not flat white
- [ ] **Test:** Each error type renders correct mascot expression + pastel tint; error messages are friendly (no "Error:", "Failed to", "Invalid"); all empty states have pastel backgrounds

##### Paywall Screen — Dark + Gradient + Colorful Feature Icons
*The paywall is the most important business moment. Dark backgrounds with colorful accents create a premium feel.*
- [ ] Background: `Gradients.paywallBg` (dark → orange glow)
- [ ] Feature list items: each feature gets a small pastel-tinted icon badge (sage for unlimited recipes, golden for AI meal plans, lavender for analytics, peach for priority support)
- [ ] Feature icons are small colored circles with white Lucide icons inside
- [ ] Price section: gradient pill with price, spring entrance
- [ ] CTA: `Gradients.premiumCTA` (orange → pink) + idle shimmer every 3s
- [ ] Post-conversion: golden confetti + "Welcome to Premium!" on golden pastel background + Sazon `celebrating`
- [ ] **Test:** Dark gradient renders; feature icons have distinct pastel tints; CTA shimmers; conversion celebration plays

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

---

#### **10-Pre: Home Screen Section Consolidation** 🏠

*The home feed currently has three sections that overlap heavily: "Today's Recommendation", "Recipe of the Day", and "Perfect Match for You". They all surface algorithmically recommended recipes and the distinction is unclear to users. Consolidate before building new home screen features.*

* [x] **Remove "Perfect Match for You" section** — its purpose is already covered by "Today's Recommendation" and "Recipe of the Day". Removing it reduces scroll depth, cognitive load, and redundant API calls.
* [x] **Remove "Your Favorites" section** — redundant with the Cookbook screen's Liked view. Eliminates scroll clutter on home.
* [x] **Reorder sections:** Quick Meals now renders above "For You" (priority 3 vs 100), directly below the hero.
* [x] **Merge "Recipe of the Day" + "Today's Recommendation"** into a single parallax hero with match %, full macros (cal/protein/carbs/fat), and "Surprise Me" button. Removed `FeaturedRecipeCarousel`.
* [ ] Review remaining sections for overlap and ensure each has a clear, distinct purpose
* [ ] **"Macro Optimized" section** — New home feed section surfacing recipes with the best macro profiles (high protein-to-calorie ratio, balanced macros matching user goals, etc.). Could potentially replace "High in Superfoods" or merge with it — "Superfoods" is too vague and `healthGrade` doesn't communicate macro value. A merged section like "Nutrition Powerhouse" or "Macro Optimized" would be clearer and more actionable for users tracking macros.
* [ ] **Test:** Home screen loads with no duplicate recommendation sections; scroll depth reduced; no orphaned API calls for removed sections; Quick Meals appears before For You

---

#### **10A: Cookbook — Recipe Creation & Editing** 🍳

> **Philosophy:** The cookbook is the user's space. They should feel like they *own* it — not just browse what the algorithm gives them. Creating, editing, and organizing recipes should be as natural as writing a note. The existing `recipe-form.tsx` and backend CRUD exist but aren't wired into the cookbook flow.

**Recipe Creation (inline from cookbook)**
- [ ] **"Create Recipe" FAB** — Persistent floating action button in bottom-right corner of cookbook screen. Tap → opens `recipe-form.tsx` in a modal stack (not a tab navigation). After save → recipe auto-added to cookbook + current collection (if viewing one).
  * 📍 Modify `cookbook.tsx` to add FAB with `+` icon + spring entrance animation
  * 📍 On save callback: auto-save recipe to cookbook, navigate back with the new recipe visible at top
- [ ] **Quick-add recipe shortcut** — "Add from scratch" in the CookbookHeader action menu (alongside import from URL). Opens the same form but faster path — name + ingredients + optional macros. Instructions and photo can be added later.
- [ ] **AI-assisted creation** — When creating a recipe, offer "Describe what you made and let Sazon fill in the details" option. User types "oat protein pancakes with chia seeds and protein powder" → AI generates full recipe with estimated macros, proper ingredients list, and step-by-step instructions.
  * 📍 Backend: new endpoint `POST /api/recipes/generate-from-description` — takes free-text description → Claude generates structured recipe → returns for user review before saving
  * 📍 Frontend: text input at top of recipe form with "Let Sazon help" CTA. User can edit everything AI generates before saving.
- [ ] **Test:** FAB visible on cookbook screen; tapping opens recipe form; saving returns to cookbook with new recipe at top; AI-assisted creation returns a valid recipe structure from free-text input

**Recipe Editing (in-place from cookbook)**
- [ ] **Edit button on recipe detail** — When viewing a user-created recipe (`isUserCreated: true`), show an "Edit" button in the header. Tap → opens `recipe-form.tsx` pre-populated with all fields. System recipes (database/AI-generated) show "Save My Version" instead → duplicates recipe as user-owned copy with edits.
  * 📍 Frontend: conditional button in `modal.tsx` based on `recipe.isUserCreated`
  * 📍 Backend: `POST /api/recipes/:id/fork` — duplicates a system recipe as a user-created variant with edits applied
- [ ] **Inline editing in cookbook** — Swipe right on a recipe card → quick-edit drawer slides out with: rename, change cuisine tag, add/edit notes, change collections. No need to open the full form for small tweaks.
- [ ] **Edit macros/nutrition** — Allow manual macro override on any user-created recipe. Some recipes (imported, AI-generated) have estimated macros that the user may want to correct based on their actual ingredients/portions.
- [ ] **Test:** Edit button shows for user-created recipes; "Save My Version" shows for system recipes; forked recipe is a new record with `isUserCreated: true` and `source: 'user-created'`; swipe-edit drawer allows rename and collection change without opening full form

**Recipe Notes (personal annotations on any recipe)**
- [ ] **Notes field on recipe detail** — A "My Notes" section visible on any saved recipe's detail screen (both user-created and system recipes). Tap to expand an editable text area where the user can add free-form notes: substitutions they've made, tips for next time, who loved it, serving suggestions, etc. Notes are user-specific — other users don't see them.
  * 📍 Database: new `RecipeNote` model — `id`, `userId`, `recipeId`, `content` (text), `createdAt`, `updatedAt`. One note per user per recipe (upsert pattern).
  * 📍 Backend: `GET /api/recipes/:id/notes` — returns the user's note for this recipe (or null). `PUT /api/recipes/:id/notes` — creates or updates the note (upsert). `DELETE /api/recipes/:id/notes` — removes the note.
  * 📍 Frontend: new `RecipeNotes` component in `frontend/components/recipe/RecipeNotes.tsx`. Collapsed by default showing first line preview + "My Notes" label. Tap to expand with full text + edit button. Uses `HapticTouchableOpacity` for edit/save actions.
  * 📍 Auto-save: debounced save (500ms) while typing so the user never loses work. Show subtle "Saved" indicator after sync.
- [ ] **Notes indicator on recipe cards** — Recipe cards in the cookbook show a small 📝 badge when the user has notes attached. Quick visual scan to know which recipes have personal annotations.
  * 📍 Frontend: modify recipe card component to check for `hasNotes` flag (returned from saved recipes endpoint) and render badge
- [ ] **Quick-add note from cooking screen** — While in cooking mode (`cooking.tsx`), add a "Add Note" floating button. Common use case: user is mid-cook and wants to jot down "used 2 scoops instead of 1" or "needs more salt". Note is saved to the recipe automatically.
  * 📍 Frontend: FAB in cooking screen → opens a compact text input overlay (not a full modal — stays on cooking screen). Appends to existing note with timestamp separator if note already exists.
- [ ] **Test:** Note saves and persists across sessions; upsert creates new note or updates existing; note preview shows on recipe detail; 📝 badge appears on cards with notes; cooking screen note appends with timestamp; deleting a note removes the badge; notes are user-scoped (not visible to other users)

---

#### **10B: Cookbook — Collection Browsing & Smart Collections** 📚

> **Philosophy:** A power user will have 30-50+ collections: "Weeknight Quick", "Meal Prep Sunday", "Rainy Day Comfort", "Summer Grilling", "High Protein Snacks", "Impressive Date Night", "Kid-Friendly", "Seasonal Fall", "When I'm Feeling Lazy", etc. The current flat list of collections doesn't scale. Users need to *sift*, *search*, *group*, and *visually scan* their collections the way they browse folders on a phone.

**Collection-First View Mode**
- [ ] **Add a third view mode: "Collections"** — Alongside the current Saved/Liked/Disliked tabs, add a "Collections" view that shows the user's collections as the primary browsable unit (not individual recipes).
  * 📍 Collection cards: large card with cover image (from first recipe or user-selected), collection name, recipe count, emoji/icon. 2-column grid layout.
  * 📍 Pinned collections stick to top with a subtle "Pinned" badge.
  * 📍 Tapping a collection → expands into a full recipe list within that collection (with its own sorting/filtering). Back button returns to collection grid.
- [ ] **Collection search** — Search bar at top of Collections view. Searches collection names AND recipe titles within collections. Typing "chicken" shows both collections named "Chicken" and collections containing chicken recipes.
- [ ] **Collection grouping with sections** — Auto-group collections by type using tags/categories. Default sections: "Pinned", "Meal Type" (breakfast, lunch, dinner, snack), "Cuisine" (Italian, Mexican, etc.), "Mood & Occasion" (comfort food, date night, etc.), "Other". User can drag collections between sections.
  * 📍 Database: add optional `category` field to `Collection` model — one of: `pinned`, `meal_type`, `cuisine`, `mood`, `dietary`, `seasonal`, `custom`
  * 📍 Frontend: `SectionList` with collapsible section headers
- [ ] **Test:** Collections view renders as 2-column grid; pinned collections appear first; search filters collections by name and by contained recipe titles; section grouping displays correctly with collapsible headers

**Smart Collections (Auto-Populated)**
- [ ] **System-generated smart collections** — Collections that auto-populate based on rules, not manual adds. User sees them alongside their custom collections but with a "Smart" badge. They update dynamically as the user saves/likes recipes.

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

- [ ] **Weather-aware collection** — Uses device location to get current weather. Surfaces appropriate recipes: cold/rainy → soups, stews, comfort food; hot/sunny → salads, cold dishes, grilled items; cool → warm bowls, baked goods.
  * 📍 Frontend: `expo-location` for coordinates → weather API (OpenWeather free tier) → map conditions to recipe filters
  * 📍 This is one smart collection that changes daily: "Perfect for Today's Weather" with weather icon
- [ ] **Time-of-day collection** — "Right Now" smart collection that filters by current meal period (breakfast 6-11am, lunch 11am-3pm, dinner 5-9pm, snack otherwise) + cook time that fits remaining time before next meal.
- [ ] **Test:** Smart collections return correct recipe counts; "High Protein" only includes recipes with ≥30g protein; "Quick & Easy" only includes recipes ≤15min; smart collections update when new recipes are saved; weather collection changes based on weather input; time-of-day collection changes by hour

**Collection Pagination & Infinite Scroll**
- [ ] **Infinite scroll within collections** — Replace current page-based pagination inside a collection with infinite scroll. Load 20 recipes → scroll near bottom → auto-load next 20 → subtle loading spinner at bottom. Keep "X recipes" count in the collection header.
  * 📍 Use `FlatList` `onEndReached` with `onEndReachedThreshold={0.3}`
  * 📍 Backend: existing pagination already supports `page` + `limit` params — just need to increment `page` on each fetch
- [ ] **Collection carousel preview** — In the Collections grid view, each collection card shows a mini 3-image preview strip (first 3 recipe images) below the cover image. Gives users a visual hint of what's inside without tapping.
- [ ] **Swipe between collections** — When inside a collection, swipe left/right to move to the next/previous collection (like swiping between photo albums). Pinned collections are the first in order, then alphabetical.
  * 📍 Use `PagerView` or horizontal `FlatList` with snap for collection-level paging
- [ ] **Collection stats bar** — When viewing a collection, show a compact stats bar: total recipes, avg cook time, avg calories, avg protein, most common cuisine. Helps users understand the character of each collection at a glance.
- [ ] **Test:** Infinite scroll loads next page when scrolling near bottom; no duplicate recipes on page boundary; collection carousel preview shows 3 images; swipe between collections navigates correctly; stats bar shows accurate aggregates

**Collection Quick-Create Suggestions**
- [ ] **Suggested collections on first use** — When a user has saved 10+ recipes but created 0 collections, show a one-time prompt: "Organize your cookbook? Sazon can create starter collections for you." → Auto-generates collections based on the user's saved recipes: groups by cuisine, meal type, and a "Quick & Easy" smart collection. User can accept, edit, or dismiss.
- [ ] **"Add to Collection" improvements** — When saving a recipe, the collection picker should show:
  1. Recently used collections (top, for fast repeat adds)
  2. AI-suggested collections based on the recipe's attributes ("This looks like a 'Meal Prep' recipe — add it?")
  3. "Create New Collection" always at bottom
  * 📍 Backend: `GET /api/recipes/:id/suggested-collections` — returns top 3 collection matches by cuisine, meal type, or keyword overlap with existing collection recipes
- [ ] **Test:** Suggestion prompt appears after 10 saved + 0 collections; auto-generated collections match recipe attributes; collection picker shows recently used first; AI-suggested collections are relevant (not random)

---

#### **10C: Meal Plan — "Find Me a Meal"** 🎯

> **Philosophy:** The current generation flow is all-or-nothing — "Plan My Week" generates everything using your global macro goals. But real life isn't that clean. Sometimes you need one specific meal: "I have 400 calories left today, I want something Latin American with at least 30g protein and low fat." The user should be able to make targeted requests with specific constraints and get back options to choose from — not just accept whatever the AI generates.

**The Request Flow**

* [ ] **"Find Me a Meal" button** — New action available in two places:
  1. **Empty meal slot** — Tap the `+` on any empty hour → alongside "Add from Cookbook" and "Quick Log", add "Find Me a Meal" option
  2. **Quick Actions Bar** — New button alongside "Generate Full Day" and "Generate Remaining"
  * 📍 Tapping opens the `MealRequestModal` (new component)

* [ ] **`MealRequestModal` — The constraint builder** — A clean, step-by-step bottom sheet where the user specifies exactly what they want:

  **Step 1: How many options?**
  - Pill selector: 1 / 3 / 5 options (default: 3)
  - "1" = auto-add to slot, "3"/"5" = show options to pick from

  **Step 2: Cuisine (optional)**
  - "Any cuisine" toggle (default on)
  - When toggled off → show cuisine family chips (Latin American, Asian, African, European, Middle Eastern, etc.)
  - Tapping a family expands to specific cuisines (Latin American → Puerto Rican, Mexican, Peruvian, etc.)
  - Multi-select allowed: "Latin American OR Mediterranean"
  - Uses `CUISINE_FAMILIES` constant from Group 11 Phase 1

  **Step 3: Macro targets (the core)**
  - Each macro has a **range slider** or quick-set buttons:

  | Macro | Input Style | Default | Example |
  |-------|------------|---------|---------|
  | **Calories** | Range slider (100–1200) | "Any" | "350–450 cal" |
  | **Protein** | Min slider (0–80g) | "Any" | "At least 30g" |
  | **Fat** | Max slider (0–60g) | "Any" | "Under 8g" |
  | **Carbs** | Range or "Any" | "Any" | "Any amount" |
  | **Fiber** | Min slider (0–25g) | "Any" | "At least 5g" |

  - **Smart presets** at top for fast selection:
    - "High Protein" → protein ≥ 35g, any cal
    - "Low Cal" → calories ≤ 400, any macros
    - "Low Fat" → fat ≤ 10g, any cal
    - "Balanced" → 400-600 cal, 25-35g protein, 15-25g fat
    - "Post-Workout" → 300-500 cal, protein ≥ 35g, carbs ≥ 40g, fat ≤ 15g
    - "Light Snack" → calories ≤ 250, protein ≥ 10g

  **Step 4: Additional filters (optional, collapsed by default)**
  - Meal type: breakfast / lunch / dinner / snack / dessert / any
  - Max cook time: slider (5–120 min)
  - Difficulty: easy / medium / hard / any
  - Dietary: auto-populated from user profile (but overridable per request)

  * 📍 Component: `frontend/components/meal-plan/MealRequestModal.tsx`
  * 📍 Design: bottom sheet with spring animation, each step is a collapsible section (not separate screens — user can see/adjust all constraints at once)

* [ ] **Backend: `POST /api/meal-plan/find-recipes`** — The targeted search + generation endpoint:

  ```typescript
  // Request
  {
    count: 3,                           // How many options to return
    cuisines?: string[],                // ["Puerto Rican", "Mexican"] or empty for any
    cuisineFamilies?: string[],         // ["Latin American"] — expands to all subcuisines
    calories?: { min?: number, max?: number },  // { min: 350, max: 450 }
    protein?: { min?: number },                 // { min: 30 }
    fat?: { max?: number },                     // { max: 8 }
    carbs?: { min?: number, max?: number },     // null = any
    fiber?: { min?: number },                   // { min: 5 }
    mealType?: string,                  // "dinner" or null for any
    maxCookTime?: number,               // 30 (minutes)
    difficulty?: string,                // "easy" or null for any
    dietaryRestrictions?: string[],     // auto from profile, overridable
  }

  // Response
  {
    options: [
      {
        recipe: Recipe,              // Full recipe object
        matchScore: number,          // How well it matches constraints (0-100)
        matchBreakdown: {
          caloriesInRange: boolean,
          proteinMet: boolean,
          fatMet: boolean,
          carbsMet: boolean,
          fiberMet: boolean,
          cuisineMatch: boolean,
        }
      }
    ],
    totalMatches: number,            // How many recipes in DB matched
    generatedCount: number,          // How many were AI-generated (if DB had < count)
  }
  ```

  * 📍 **Search strategy (two-tier):**
    1. **Database-first** — Query saved + system recipes matching ALL constraints. Score by match quality. Return up to `count` results.
    2. **AI-generation fallback** — If database returns fewer than `count` matches, generate remaining via `aiRecipeService` with the macro constraints baked into the prompt. This ensures the user always gets the requested number of options.
  * 📍 Cuisine family expansion: if `cuisineFamilies: ["Latin American"]`, expand to all subcuisines in that family using `CUISINE_FAMILIES` constant
  * 📍 Adjacency boost: results from adjacent cuisines score slightly lower but still appear if exact-match cuisine pool is thin

* [ ] **Results view: `MealRequestResults` component** — Shows the returned options as swipeable cards:
  - Each card: recipe image, title, cuisine badge, macro pills (green = meets constraint, gray = "any"), cook time, difficulty
  - Macro pills highlight which constraints are met: "✓ 32g protein" (green), "✓ 410 cal" (green), "✓ 6g fat" (green)
  - **Tap card** → expand to full recipe detail (inline, not navigation)
  - **"Add to Plan" button** on each card → adds to the selected meal slot → closes modal with celebration
  - **"Save to Cookbook" button** → saves recipe without adding to plan
  - **"None of these — generate more" link** at bottom → re-runs AI generation with same constraints for fresh options
  - If only 1 option was requested and it matches, auto-add to slot with brief confirmation toast

* [ ] **Remaining calories integration** — When "Find Me a Meal" is opened from an existing meal plan day, pre-populate the calorie field with remaining calories for that day:
  - Example: daily target 2000 cal, already planned 1600 → default calorie range = "350–450" (centered on remaining)
  - Pre-populate protein with remaining protein gap too
  - Show context: "You have ~400 calories and 35g protein remaining today"
  * 📍 Calculate from `useNutritionTracking` hook's daily totals vs user macro goals

* [ ] **Request history** — Save the last 5 request configurations so users can re-run them quickly:
  - "Your recent searches" section at top of MealRequestModal
  - Tap to re-run with same constraints
  - Stored in AsyncStorage (client-side only, no backend)

---

#### **10D: "I'm Craving..." Search** 🍕 *(Home Screen)*

*The anti-meal-prep-boredom feature. The user doesn't always know a cuisine or recipe name — they know a FEELING. "Something cheesy", "warm and comforting", "crunchy and spicy", "sweet but not heavy." Match cravings to healthy recipes.*

* [ ] **Craving-based search mode** — On the home screen search bar, add a toggle: "Search" (current) vs "I'm Craving..." mode. In craving mode, the user types natural language and the AI maps it to recipes.
  * 📍 Backend: `POST /api/recipes/craving-search` — takes free-text craving → Claude maps it to flavor profiles + texture + temperature preferences → queries recipe database with expanded search (title, description, ingredients, cuisine) → returns ranked results
  * 📍 Examples that should work:
    - "something cheesy and warm" → mac & cheese (lightened), quesadillas, khachapuri, grilled cheese, cheese fondue
    - "cold and refreshing" → ceviche, gazpacho, poke bowl, Vietnamese fresh rolls, watermelon feta salad
    - "spicy noodles" → dan dan noodles, pad kee mao, Korean ramyeon, Burmese shan noodles
    - "comfort food but healthy" → lightened shepherd's pie, chicken soup, congee, dal, Ethiopian lentil stew
    - "something sweet after dinner" → protein ice cream, Greek yogurt parfait, dark chocolate mousse, mochi
  * 📍 Craving search should respect user's dietary restrictions automatically

* [ ] **Craving chips** — Below the search bar, show scrollable craving chips for common moods: "Comfort Food", "Something Light", "Spicy", "Sweet Tooth", "Crunchy", "Warm & Cozy", "Fresh & Cold", "Cheesy", "Carb Fix", "Snacky". Tapping a chip runs the craving search.

* [ ] **Test:** Craving search for "something cheesy" returns recipes containing cheese; respects dietary restrictions (vegan user doesn't get dairy-based results); craving chips trigger search with correct query

---

#### **10E: Ingredient Substitution Engine** 🔄 *(Recipe Detail)*

*"I don't have Greek yogurt" or "chicken breast is boring." Let users swap ingredients with macro-aware alternatives that preserve flavor.*

* [ ] **"Swap Ingredient" button on recipe detail** — Each ingredient in the ingredient list gets a subtle swap icon. Tapping it shows 3-5 alternatives with macro impact:

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

* [ ] **"Make It Healthier" one-tap** — Already exists as "Healthify" for D/F rated recipes. Expand this: show on ALL recipes (not just low-rated ones) as a persistent "Lighter Version" toggle at the top of the ingredient list. Toggle on → all substitutions applied at once, macro summary updates live.
  * 📍 Backend: `POST /api/recipes/:id/healthify` already exists — extend to accept custom swap preferences (e.g., "I prefer oat flour over almond flour")

* [ ] **"Make It Exciting" button** — The opposite of healthify. Take a bland-looking recipe and get AI suggestions for sauce/spice/topping additions that add flavor without blowing macros:
  - "Add 1 tbsp gochujang (+15 cal, +2g carbs) for a Korean kick"
  - "Finish with a squeeze of lime and fresh cilantro (+0 cal) for brightness"
  - "Top with everything bagel seasoning (+5 cal) for crunch"
  - "Drizzle 1 tsp chili crisp (+40 cal, +4g fat) for heat and texture"
  * 📍 Backend: `POST /api/recipes/:id/flavor-boost` — AI analyzes recipe's flavor profile and suggests 3-5 additions with macro costs. Prioritizes high-impact, low-calorie additions.
  * 📍 Frontend: expandable section on recipe detail below instructions: "Flavor Boosters" with each suggestion as a chip the user can tap to add to the recipe

* [ ] **Test:** Ingredient swap for "chicken breast" returns ≥3 alternatives with macro deltas; "Make It Healthier" reduces total calories by ≥10%; "Make It Exciting" suggestions each add ≤50 calories; swaps respect dietary restrictions (vegan user doesn't see meat swaps)

**AI-Assisted Substitutions & "Save My Version" Flow** *(cross-cuts 10A editing + 10E swaps)*

> **NOTE — Future feature with significant complexity.** The idea: when a user doesn't have an ingredient or wants to change something, they can ask Sazon (conversationally or via a swap button) for substitutions. Accepting a substitution creates a personal copy ("fork") of the recipe in their cookbook with the changes applied, preserving the original recipe untouched.

* [ ] **"I don't have this" per-ingredient action** — Alongside the existing swap icon, add an "I don't have this" option. Sazon suggests replacements based on what's commonly available + the user's pantry (if tracked). User picks a substitute → triggers the fork flow.

* [ ] **Conversational substitution request** — From the recipe detail screen, a "Ask Sazon" button opens a compact chat-like input: "I don't have coconut milk, what can I use?" or "Make this dairy-free" or "I only have an air fryer, not an oven." Sazon responds with specific substitutions + adjusted instructions where needed.
  * 📍 Backend: `POST /api/recipes/:id/ask-substitution` — sends recipe context + user question to AI, returns suggested edits as a structured diff (ingredient swaps + instruction changes)
  * 📍 Frontend: chat-style UI anchored to recipe detail, shows Sazon's suggestion with "Apply Changes" CTA

* [ ] **Fork-on-edit ("Save My Version")** — When the user accepts any substitution (from swap engine, "I don't have this", or conversational), the system creates a forked copy:
  * 📍 Reuses `POST /api/recipes/:id/fork` from 10A editing
  * 📍 Forked recipe gets `source: 'user-modified'`, `parentRecipeId` pointing to the original, and `isUserCreated: true`
  * 📍 The fork includes ALL accepted substitutions applied, with updated macros recalculated
  * 📍 Original recipe remains unchanged in the database and for other users

* **⚠️ Complexity notes:**
  - **Fork divergence:** If the original recipe is updated (e.g., corrected macros, better instructions), the user's fork won't get those updates. Need to decide: (a) forks are fully independent (simple, current plan), (b) forks track upstream changes and surface "Original recipe was updated — review changes?" (complex, deferred). Start with (a).
  - **Fork proliferation:** A user who substitutes often could end up with many near-duplicate recipes cluttering their cookbook. Mitigation: group forks visually under the parent recipe (show "Original" + "My Version" as a stacked card), and allow the user to "reset to original" to delete the fork.
  - **Macro recalculation accuracy:** Swapping one ingredient changes macros, but also affects the recipe holistically (e.g., swapping butter for applesauce in baking changes texture, moisture, cook time — not just fat grams). AI-generated substitutions need to flag when a swap affects technique, not just macros. The structured diff from the AI should include `instructionChanges` alongside `ingredientChanges`.
  - **Multi-swap compounding:** User swaps 3 ingredients in one session — each swap may interact (e.g., removing dairy + adding coconut milk + swapping flour changes the recipe substantially). Need to re-validate the full recipe after all swaps, not just each swap in isolation. Consider a "review all changes" step before forking.
  - **Pantry integration dependency:** "I don't have this" is most powerful when connected to a pantry/inventory system (knows what the user DOES have). Without it, suggestions are generic. Can launch with generic suggestions first, enhance later if pantry tracking is added.
  - **AI cost per request:** Conversational substitution hits the AI on every question. Rate-limit to prevent abuse, and cache common substitution Q&A pairs (e.g., "dairy-free swap for Greek yogurt" is asked constantly — cache the answer).

* [ ] **Test:** Accepting a substitution creates a forked recipe with `parentRecipeId` set; forked recipe has updated ingredients and recalculated macros; original recipe is unchanged after fork; conversational substitution returns structured diff with ingredient + instruction changes; multiple swaps in one session produce a single fork (not one per swap); fork appears in cookbook with visual link to original

---

#### **10F: Taste Rating & Flavor Feedback** ⭐ *(Cooking Complete → Home Feed)*

*The current feedback loop is: like/dislike + star rating. But "I liked it" doesn't tell the engine WHY. Was it the spice? The texture? The cuisine? Better taste feedback = dramatically better recommendations.*

* [ ] **Post-cook taste survey (2 taps, not a form)** — After marking a meal as cooked, show a quick 2-question overlay (not a modal wall):

  **Question 1: "How did it taste?"** — 5-point emoji scale: 😐 → 😊 → 🤤 (replaces star rating for cooked meals)

  **Question 2: "What stood out?"** — Quick-tap flavor tags (select 1-3):
  `Too bland` · `Perfect spice` · `Great texture` · `Too salty` · `Loved the sauce` · `Kid-approved` · `Would make again` · `Needs more protein` · `Too much effort` · `Great leftovers`

  * 📍 Backend: new fields on `Meal` or `RecipeFeedback`: `tasteRating` (1-5), `flavorTags` (string[] — stores selected tags)
  * 📍 These feed directly into behavioral scoring: if user tags "Too bland" on 3 recipes from the same cuisine, reduce that cuisine's score. If "Perfect spice" appears on Thai + Korean + Indian, boost spicy cuisines.
  * 📍 "Would make again" is the strongest positive signal — weight it 2x in scoring

* [ ] **Flavor profile on recipe cards** — Show subtle flavor icons on recipe cards in the home feed:
  🌶️ (spicy), 🧀 (cheesy/rich), 🥗 (light/fresh), 🍯 (sweet), 🔥 (smoky), ❄️ (cold/refreshing)
  * 📍 Auto-detected from ingredients + cuisine via a simple rules engine (not AI per-recipe)
  * 📍 Helps users browse by flavor at a glance — "I want something spicy, let me scan for 🌶️"

* [ ] **"Why this recipe?" transparency** — When tapping a recommended recipe from the home feed, show a one-line reason: "Because you loved Thai food last week" or "High protein + under 20 min" or "You haven't tried Peruvian yet — adventure time!" Makes the algorithm feel like a friend, not a black box.
  * 📍 Backend: add `recommendationReason: string` to recipe response when served from the home feed. Generate from the scoring breakdown (highest-weight factor → reason text).

* [ ] **Test:** Taste survey shows after cooking completion; flavor tags persist to RecipeFeedback; "Would make again" tag boosts recipe's behavioral score; flavor profile icons render on recipe cards; recommendation reason string is non-empty for home feed recipes

---

#### **10G: Macro Flexibility & "Cheat Meal" Budgeting** 📊 *(Meal Plan)*

*Real life isn't perfectly balanced every day. Had a light Monday? Eat richer on Tuesday. Want pizza tonight? Adjust lunch to compensate. The app should say YES to cravings and help you budget around them — not just say "that doesn't fit your macros."*

* [ ] **Weekly macro view (not just daily)** — The `WeeklyNutritionSummary` already shows weekly totals, but add a **weekly budget bar** that shows how much macro "runway" remains. If you're under on Monday, Tuesday's suggestions auto-adjust upward.
  * 📍 Backend: `GET /api/meal-plan/weekly-budget` — returns daily targets adjusted by previous days' actuals. Monday was 300 cal under → Tuesday target = daily + 150 (split deficit across remaining days, not all at once)
  * 📍 Frontend: "Weekly Budget" card on meal plan screen showing remaining weekly calories/protein as a progress bar with "X remaining across Y days"

* [ ] **"I want to eat [X] tonight" flow** — User declares a craving or specific meal (pizza, burger, pasta) and the app presents **three paths**, not just one:

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

* [ ] **Macro rollover display** — On each day in the meal plan, show a subtle indicator: "↑ 150 cal from yesterday" (surplus carried forward) or "↓ 200 cal to make up" (deficit to recover). Visual: green arrow for surplus (eat more today), orange for deficit (eat lighter).

* [ ] **Test:** Weekly budget adjusts Tuesday target when Monday was under; "I want pizza" flow shows all 3 options (go for it, healthier version, similar but lighter); healthier version has fewer calories than original estimate; "similar but lighter" results fit within daily remaining budget; daily macro rollover indicator shows correct surplus/deficit; weekly budget bar reflects actual consumption; healthified recipe can be saved to cookbook

---

#### **10H: "What Can I Make Right Now?"** 🧊 *(Home Screen + Shopping List)*

*Don't make me shop to cook. Show me what I can make with what I already have.*

* [ ] **Pantry-based recipe matching** — New section on home screen: "Cook with What You Have". User's pantry is inferred from:
  1. **Shopping list completion** — items checked off = items in pantry (auto-tracked)
  2. **Manual pantry** — simple add/remove list in profile (already partially exists via "Add to pantry" on shopping list)
  3. **Recipe completion** — if user cooked a recipe, leftover ingredients likely still available for 3-5 days
  * 📍 Backend: `GET /api/recipes/pantry-match` — takes user's pantry items → finds recipes where ≥70% of ingredients are already available → ranks by match percentage
  * 📍 Response includes: `matchPercentage` (85% = you have 6 of 7 ingredients), `missingIngredients` (["fresh basil"]), `canSubstitute` (true if missing items have common pantry swaps)
  * 📍 Frontend: "You can make 12 recipes right now" card → tap to see list sorted by match %

* [ ] **"Just need 1-2 more items"** filter — Within pantry match results, highlight recipes where you're only missing 1-2 cheap items. "You're one lime away from ceviche" is a powerful motivator.

* [ ] **Leftover transformer** — After cooking, prompt: "Have leftover [rice/chicken/vegetables]? Here are 5 recipes to use them up." Uses the cooked recipe's ingredients as a pantry signal.
  * 📍 Backend: `POST /api/recipes/leftover-ideas` — takes ingredient list → finds recipes that use those ingredients in a different way (different cuisine, different preparation)
  * 📍 Example: leftover rice → fried rice, rice pudding, stuffed peppers, congee, arancini

* [ ] **Test:** Pantry match returns recipes where ≥70% of ingredients are in user's pantry; "just need 1-2 items" filter works correctly; leftover transformer returns recipes using at least 2 of the provided ingredients; match percentage is accurate

---

#### **10I: Cooking Skill Progression & Confidence Building** 📈 *(Profile + Cooking Mode)*

*The skill level setting is static — "beginner" forever. Real users grow. The app should notice and celebrate growth without making beginners feel inadequate.*

* [ ] **Cooking stats dashboard** — New section in Profile: "Your Cooking Journey"
  - Recipes cooked this month / all time
  - Cuisines explored (with a mini world map or flag grid showing coverage)
  - Average difficulty of recipes cooked (trend line: are you leveling up?)
  - "New this month" — cuisines or techniques tried for the first time
  - Longest cooking streak (days in a row with at least 1 cooked meal)
  * 📍 All data already exists in `Meal.isCompleted` + `Recipe.cuisine` + `Recipe.difficulty` — just needs aggregation

* [ ] **Gentle skill-up nudges** — When the user has cooked 10+ "easy" recipes with good taste ratings, suggest: "You've been crushing easy recipes — ready for a medium challenge? Here are 3 that build on techniques you already know." Not a nag — a celebration of progress.
  * 📍 Backend: `GET /api/user/skill-progress` — analyzes cooking history, returns current effective skill level + suggestion if ready to level up
  * 📍 Auto-updates `cookingSkillLevel` in preferences if user accepts the nudge (beginner → home_cook → confident → chef)

* [ ] **"First time cooking [X]" badges** — When a user cooks a cuisine for the first time (first Ethiopian dish, first Persian dish), show a brief celebration: "You just cooked your first Ethiopian dish!" with the cuisine flag. Subtle, not gamified — just acknowledgment.
  * 📍 Track in `RecipeFeedback` or a new `CuisineExploration` table: `{ userId, cuisine, firstCookedAt }`

* [ ] **Technique tips in cooking mode** — When a cooking step mentions a technique the user hasn't done before (braising, tempering spices, making a roux), show a collapsible "What's this?" tip with a 1-sentence explanation + optional video link.
  * 📍 Curated technique glossary: ~50 common techniques with explanations. Pattern-match against instruction text.

* [ ] **Test:** Cooking stats show correct counts and cuisine coverage; skill-up nudge appears after 10+ easy recipes with taste rating ≥ 3; first-cuisine badge triggers on first cook of a new cuisine; technique tips show for recognized cooking terms

---

#### **10J: Meal Prep Variety Enforcer** 🎨 *(Meal Plan Generation)*

*If you're prepping 5 lunches for the week, they should NOT all be chicken + rice + broccoli. The AI should enforce variety across flavor profiles, textures, cuisines, and colors — because eating the same thing 5 days in a row is what makes people quit.*

* [ ] **Variety scoring in meal plan generation** — When generating multiple meals for the same meal type across a week, enforce:
  - **No repeated proteins** across consecutive days (chicken Mon → fish Tue → beef Wed → tofu Thu → chicken Fri is OK; chicken Mon-Wed is not)
  - **No repeated cuisines** on consecutive days
  - **Texture variety** — not all soft foods; mix grilled, roasted, raw, steamed
  - **Color variety** — not all brown food; ensure green, orange, white, red representation across the week
  - **Temperature variety** — not all hot meals; include cold salads, wraps, overnight oats
  * 📍 Add variety constraints to `generateMealPlan` AI prompt: "Ensure no protein source repeats on consecutive days. Vary textures (grilled, steamed, raw) and ensure visual color variety across the week."
  * 📍 Post-generation validation: score the week for variety and flag if too repetitive

* [ ] **"Boring week" detection** — After a meal plan is generated (or manually filled), if the variety score is low, show a subtle nudge: "Your lunches are looking a bit samey — want Sazon to mix it up?" → one tap regenerates just the repetitive meals.
  * 📍 Variety score: count unique proteins, cuisines, cooking methods. Score 0-100. Below 40 → show nudge.

* [ ] **Test:** Generated meal plan has no repeated protein on consecutive days; generated plan spans ≥3 different cuisines across the week; "boring week" detection triggers when variety score < 40; regeneration only replaces repetitive meals, not the whole plan

---

#### **10K: Serving Scaler with Live Macro Recalculation** 📐 *(Recipe Detail)*

*Users want to adjust portions instantly — "I need this to be 500 cal, not 700" or "make this for 4 people". The macros and ingredients should update in real time.*

* [ ] **Scaling pills on recipe detail** — Below the recipe title, show quick-tap pills: `½×` `1×` `2×` `4×` + "Custom" pill for exact serving count. Tapping instantly updates:
  - All ingredient quantities
  - All macro values (calories, protein, carbs, fat, fiber)
  - Estimated cost
  - Cook time hint ("May need 5 extra minutes for larger batch")
  * 📍 Frontend-only calculation (multiply by scale factor) — no backend call needed
  * 📍 "Custom" opens a small input: "How many servings?" or "Target calories:" (reverse-calculates serving size to hit a calorie target)

* [ ] **"Hit my macros" scaler** — Instead of choosing servings, user enters their remaining macro budget ("I have 450 cal and 35g protein left") → the app calculates the exact portion size to fit. Shows: "1.3 servings = 442 cal, 34g protein."
  * 📍 Frontend calculation: `targetCalories / perServingCalories = scaleFactor`
  * 📍 Integrates with meal plan "remaining calories" context

* [ ] **Test:** Scaling pills update ingredient quantities and macros correctly; 2× doubles all values; custom serving input accepts decimal values; "Hit my macros" scaler calculates correct portion to match target calories within 5%

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

* [ ] **`FoodItem` model** — New Prisma model for caching branded/restaurant food items:
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

* [ ] **Branded food search endpoint** — `GET /api/food/search?q=round+table+pizza`
  * 📍 Two-tier search: (1) local `FoodItem` cache first, (2) external API fallback
  * 📍 **Nutritionix Instant API** for restaurant items — covers 900k+ restaurant menu items (Chipotle, McDonald's, local chains). Requires API key (`NUTRITIONIX_APP_ID`, `NUTRITIONIX_API_KEY` — already used for barcode scanning)
  * 📍 **OpenFoodFacts text search** for packaged goods — free, no key required
  * 📍 Cache results to `FoodItem` on first lookup (avoids repeat API calls)
  * 📍 Response: `{ results: FoodItem[], source: "cache" | "nutritionix" | "openfoodfacts" }`

* [ ] **"Log Food" quick-add flow** — Streamlined alternative to QuickMealLogModal:
  1. User taps "+" on a meal slot in the meal plan → shows options: "Add Recipe" (existing), **"Log Food"** (new)
  2. "Log Food" opens a search sheet with: **search bar** + **Recent Foods** (last 10 logged) + **Frequent Foods** (top 10 by count)
  3. User searches → taps result → confirms serving size → logged to meal plan as a `Meal` with `foodItemId` + auto-filled macros
  4. One-tap re-log from recents: no search needed, just tap → done
  * 📍 Frontend: `LogFoodSheet.tsx` component (bottom sheet)
  * 📍 Backend: `GET /api/food/recent` (user's recent logged food items), `GET /api/food/frequent` (user's most-logged food items, sorted by frequency)
  * 📍 Backend: `POST /api/food/log` — creates `Meal` entry with `foodItemId`, updates usage count for frequency sorting

* [ ] **Serving size adjustment** — When logging a branded food, show a simple stepper: "How many servings?" (default 1, support decimals like 1.5 or 2). Macros recalculate live (same frontend-only pattern as serving scaler).

* [ ] **User-submitted food items** — If a branded food isn't found in search, allow manual entry (like current QuickMealLogModal) but save it to `FoodItem` with `source: "user"` so it's available for future re-logging. "You entered Round Table Gourmet Veggie Pizza — we'll remember this for next time."

* [ ] **Test:** Search for "Chipotle" returns restaurant items with macros; search checks local cache before external API; first external lookup caches to FoodItem; recent foods returns user's last 10 logged items in order; frequent foods returns top 10 by usage count; logging a branded food creates Meal with correct macros and foodItemId; serving size adjustment recalculates macros correctly; user-submitted food items appear in future searches

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

* [ ] **Enhanced GPT-4V prompt for full macros** — Update `foodRecognitionService.ts` prompt to request full macro breakdown per food item, not just calories:
  * 📍 Current response shape: `{ name, confidence, estimatedCalories, estimatedPortion }`
  * 📍 New response shape: `{ name, confidence, estimatedCalories, estimatedProtein, estimatedCarbs, estimatedFat, estimatedFiber, estimatedPortion, portionGrams }`
  * 📍 Update the GPT-4V system prompt: "For each food item, estimate calories, protein (g), carbs (g), fat (g), and fiber (g) per the visible portion. Include estimated portion size in grams."
  * 📍 Update `FoodRecognitionResult` interface and all consumers

* [ ] **"Log This Meal" button on scan results** — After photo recognition returns results, add a prominent "Log to Meal Plan" CTA alongside the existing "Add to Shopping List" and "Find Recipes" buttons.
  * 📍 On `scanner.tsx` results view: new orange "Log This Meal" button (most prominent position)
  * 📍 On `scanner-results.tsx`: same button added
  * 📍 Tapping opens a confirmation sheet: shows detected foods with full macros, total meal macros, serving adjustment (stepper: ½×, 1×, 1.5×, 2×), and meal slot picker (Breakfast / Lunch / Dinner / Snack + date selector defaulting to today's next empty slot)
  * 📍 Confirm → creates `Meal` entry with `customName` (AI meal description), full macros from recognition, and `source: "photo_scan"`
  * 📍 Also cache each detected food to `FoodItem` with `source: "photo_scan"` so it appears in the Branded Food "Recent Foods" list for instant re-logging

* [ ] **Camera icon on meal plan "+" menu** — When user taps "+" on a meal slot, add a camera icon option alongside "Add Recipe" and "Log Food":
  * 📍 "Snap a Photo" → opens camera directly (skip the Quick Actions detour)
  * 📍 After scan → same "Log This Meal" confirmation sheet, but pre-selects the meal slot the user tapped "+" on
  * 📍 This makes the flow: tap "+" on lunch → snap photo → confirm → logged. Under 10 seconds.

* [ ] **Camera shortcut on home screen** — Add a persistent camera icon/button on the home screen (near the search bar or as a floating action) for quick access:
  * 📍 Not a replacement for the Quick Actions menu — an additional shortcut for the most common use case
  * 📍 Tapping opens camera directly → scan → "Log This Meal" flow
  * 📍 Subtle and non-intrusive — small camera icon, not a giant FAB

* [ ] **Portion adjustment on results** — After AI estimates "1 serving of pasta (~350 cal)", let the user adjust:
  * 📍 Serving stepper on each detected food item: ½×, 1×, 1.5×, 2×, Custom
  * 📍 Macros recalculate live as user adjusts (frontend-only math)
  * 📍 "That looks like more than 1 serving" nudge — if the AI detects a large portion, proactively show: "This looks like a large serving — adjust if needed"

* [ ] **Multi-food meal support** — The AI often detects multiple items in one photo (e.g., "grilled chicken, rice, and salad"). Each item should be individually editable:
  * 📍 Show each food as a separate card with its own macros and serving adjuster
  * 📍 User can remove items they didn't actually eat ("I skipped the rice")
  * 📍 Total meal macros update live as items are adjusted or removed
  * 📍 "Add an item" button for things the AI missed (opens the branded food text search)

* [ ] **Test:** Enhanced GPT-4V prompt returns protein/carbs/fat/fiber (not just calories); "Log This Meal" creates Meal entry with full macros; photo-scanned foods cache to FoodItem table; portion adjustment at 2× doubles all macro values; removing a food item from multi-food result updates total macros; camera shortcut on meal plan "+" opens camera directly; logged meal appears in correct meal slot and date; home screen camera shortcut opens camera without going through Quick Actions

---

#### **10N: "You Might Also Like" — Recipe Discovery** 🔀 *(Recipe Detail)*

*Forward momentum, never a dead end. When a user finishes reading a recipe, show them where to go next — related recipes by cuisine, macros, or meal type.*

* [ ] **Related recipes carousel** — Recipe detail (`modal.tsx`): add a "You might also like" horizontal carousel at the bottom of the scroll content, showing 4–6 related recipes (same cuisine, similar macros, or same meal type)
* [ ] **Backend: `GET /api/recipes/:id/related`** — return recipes with matching cuisine/tags, excluding the current recipe. Use cuisine adjacency to broaden results (if viewing a Thai recipe, also surface Lao and Burmese)
* [ ] **Tapping a related recipe** navigates to its detail (push onto stack, not replace)
* [ ] **Test:** Related recipes section renders with at least 1 recipe; tapping navigates to new detail screen; section hidden gracefully if no related recipes found; doesn't duplicate the current recipe

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
| **TOTAL** | | **~56h** | |

---

#### **10P: Tests (combined)**

**`frontend/__tests__/components/cookbook/RecipeCreation.test.tsx`**
- [ ] FAB renders on cookbook screen and opens recipe form on tap
- [ ] AI-assisted creation returns structured recipe from free-text
- [ ] Saving a created recipe adds it to cookbook and current collection
- [ ] Edit button shows for `isUserCreated` recipes, "Save My Version" for system recipes
- [ ] Forking a system recipe creates a new user-owned copy

**`frontend/__tests__/components/cookbook/CollectionBrowsing.test.tsx`**
- [ ] Collections view renders as 2-column grid with cover images
- [ ] Pinned collections appear before unpinned
- [ ] Collection search matches collection names and contained recipe titles
- [ ] Section grouping collapses/expands correctly
- [ ] Infinite scroll triggers next page load at threshold
- [ ] Collection stats bar shows correct aggregated values

**`backend/tests/modules/smartCollections.test.ts`**
- [ ] Smart collection "High Protein" returns only recipes with protein ≥ 30g
- [ ] Smart collection "Quick & Easy" returns only recipes with cookTime ≤ 15 and difficulty "easy"
- [ ] Smart collection "Recently Cooked" returns only recipes with lastCooked within 30 days
- [ ] Smart collection "Uncooked" returns only recipes with cookCount 0 and savedDate > 7 days
- [ ] Smart collection counts update after saving a new matching recipe
- [ ] Suggested collections endpoint returns relevant matches for a given recipe

**`backend/tests/modules/recipeCreation.test.ts`**
- [ ] `POST /api/recipes/generate-from-description` returns valid recipe from "oat protein pancakes with chia seeds"
- [ ] `POST /api/recipes/:id/fork` creates user-owned copy with `isUserCreated: true`
- [ ] Forked recipe preserves original ingredients, instructions, and macros
- [ ] Forked recipe has a new ID distinct from original

**`frontend/__tests__/components/meal-plan/MealRequestModal.test.tsx`**
- [ ] Modal opens from empty meal slot "Find Me a Meal" button
- [ ] Cuisine family chip expands to show specific subcuisines
- [ ] Multi-select cuisines works (Latin American + Mediterranean)
- [ ] Smart preset "High Protein" sets protein ≥ 35g and leaves other fields as "any"
- [ ] Calorie range slider constrains min ≤ max
- [ ] Pre-populates remaining calories when opened from a day with existing meals
- [ ] Request history shows last 5 searches and re-runs on tap

**`frontend/__tests__/components/meal-plan/MealRequestResults.test.tsx`**
- [ ] Results render with correct macro constraint badges (green for met, gray for "any")
- [ ] "Add to Plan" adds recipe to the correct meal slot
- [ ] "Save to Cookbook" saves without adding to plan
- [ ] "Generate more" re-runs with same constraints
- [ ] Single-option request auto-adds to slot

**`backend/tests/modules/mealPlanFindRecipes.test.ts`**
- [ ] `POST /api/meal-plan/find-recipes` with `{ calories: { max: 400 }, protein: { min: 30 } }` returns only matching recipes
- [ ] `cuisineFamilies: ["Latin American"]` expands to all Latin American subcuisines
- [ ] Request for 3 options with only 1 DB match returns 1 DB result + 2 AI-generated
- [ ] Fat max constraint `{ fat: { max: 8 } }` excludes recipes with fat > 8g
- [ ] Fiber min constraint `{ fiber: { min: 5 } }` excludes recipes with fiber < 5g
- [ ] Empty cuisine filter returns recipes from any cuisine
- [ ] Dietary restrictions from user profile are applied automatically
- [ ] Response includes `matchBreakdown` with boolean for each constraint
- [ ] `matchScore` is higher for recipes matching all constraints vs partial matches

**`backend/tests/modules/cravingSearch.test.ts`**
- [ ] "something cheesy" returns recipes containing cheese ingredients
- [ ] "spicy noodles" returns noodle recipes from spicy cuisines
- [ ] Craving search respects user's dietary restrictions (vegan → no dairy for "cheesy")
- [ ] Empty craving text returns 400 error

**`backend/tests/modules/ingredientSwaps.test.ts`**
- [ ] "chicken breast" returns ≥3 alternatives with macro deltas
- [ ] Swaps include both healthier and more flavorful options
- [ ] Vegan user doesn't see meat-based swaps
- [ ] Swap for "white rice" includes cauliflower rice with correct calorie reduction

**`backend/tests/modules/flavorBoost.test.ts`**
- [ ] Flavor boost for a bland chicken recipe returns ≥3 suggestions
- [ ] Each suggestion adds ≤50 calories
- [ ] Suggestions include specific quantities ("1 tbsp gochujang")

**`backend/tests/modules/pantryMatch.test.ts`**
- [ ] User with [chicken, rice, soy sauce, garlic] matches stir-fry recipes at ≥70%
- [ ] "Just need 1-2 items" filter returns only recipes missing ≤2 ingredients
- [ ] Leftover transformer with [rice, chicken] returns ≥3 different recipe ideas

**`backend/tests/modules/weeklyBudget.test.ts`**
- [ ] Monday 300 cal under → Tuesday target increases by ~150 cal
- [ ] Weekly budget bar shows correct remaining across days
- [ ] "Go for it" option adjusts remaining meals to compensate for craving's macros
- [ ] "Healthier version" of pizza returns recipe with ≤50% of original calories
- [ ] "Healthier version" includes side-by-side macro comparison (original vs healthified)
- [ ] "Similar but lighter" returns ≥3 recipes within daily remaining calorie budget
- [ ] Healthified craving recipe can be saved to cookbook via standard save endpoint

**`backend/tests/modules/varietyScoring.test.ts`**
- [ ] Meal plan with same protein 5 days scores variety < 40
- [ ] Meal plan with 5 different proteins and 4 cuisines scores variety > 70
- [ ] "Boring week" regeneration only replaces repetitive meals

**`frontend/__tests__/components/ServingScaler.test.tsx`**
- [ ] 2× pill doubles all macros and ingredient quantities
- [ ] "Hit my macros" with 450 cal target on a 350 cal/serving recipe returns ~1.3 servings
- [ ] Custom serving input accepts decimal values (1.5 servings)

**`backend/tests/modules/brandedFood.test.ts`**
- [ ] Search for "Chipotle burrito bowl" returns results with calories/protein/carbs/fat
- [ ] Search checks local FoodItem cache before calling external APIs
- [ ] First external lookup caches result to FoodItem table
- [ ] Duplicate external lookup uses cached FoodItem (no second API call)
- [ ] Recent foods endpoint returns user's last 10 logged items in chronological order
- [ ] Frequent foods endpoint returns top 10 by usage count
- [ ] Logging a branded food creates Meal with correct macros and foodItemId
- [ ] Serving size multiplier (2×) doubles all macro values
- [ ] User-submitted food item saved with source "user" and appears in future searches
- [ ] Search with empty query returns 400 error

**`backend/tests/modules/snapToLog.test.ts`**
- [ ] Enhanced food recognition returns protein, carbs, fat, fiber (not just calories)
- [ ] "Log This Meal" creates Meal with customName, full macros, and source "photo_scan"
- [ ] Photo-scanned food items cached to FoodItem with source "photo_scan"
- [ ] Cached photo-scan items appear in branded food search results
- [ ] Multi-food recognition returns individual macro breakdowns per item
- [ ] Removing a food item from multi-food result excludes it from total macro sum

**`frontend/__tests__/components/SnapToLogSheet.test.tsx`**
- [ ] Scan results display full macros (calories, protein, carbs, fat) per food item
- [ ] Portion stepper at 2× doubles all displayed macros
- [ ] Removing a detected food item updates total meal macros
- [ ] "Add an item" opens branded food text search
- [ ] Meal slot picker defaults to today's next empty slot
- [ ] Confirm logs meal and navigates back to meal plan
- [ ] Camera shortcut on meal plan "+" opens camera directly (no Quick Actions detour)

**`frontend/__tests__/components/LogFoodSheet.test.tsx`**
- [ ] Search input triggers search after 300ms debounce
- [ ] Recent foods section renders on initial open
- [ ] Tapping a search result shows serving size confirmation
- [ ] Logging a food calls POST /api/food/log with correct payload
- [ ] One-tap re-log from recents skips search step

**`backend/tests/modules/relatedRecipes.test.ts`**
- [ ] Related recipes for a Thai recipe include other Thai + adjacent cuisine (Lao, Burmese) recipes
- [ ] Current recipe is excluded from related results
- [ ] Returns empty array gracefully when no related recipes found
- [ ] Results limited to 6 recipes max

---

### **Group 11: Increased Usability Pre-Launch** 🍽️🔥 **CRITICAL PATH**

> **Why this is the most important group in the entire app.**
>
> The recipe database IS the product. Every other feature — meal plans, shopping lists, AI recommendations, scoring — is only as good as what it recommends. A user who opens the app and sees 5 generic "chicken stir-fry" recipes will churn in 48 hours. A user who discovers their grandmother's Salvadorean pupusas next to a Nigerian suya they've never heard of will tell 3 friends.
>
> The usability of Sazon lives and dies with two things: **(1) the variety of delicious recipes** and **(2) the ability to make them healthy or healthier**. Everything else flows downstream. Pre-launch, we need a product people will actually use from day 1 — not a demo with test data. This group is the LIFEBLOOD of growth and retention.

---

#### **Phase 1: Cuisine Adjacency Engine** 🧭 *(CRITICAL — do first, everything else depends on it)*

*The growth hack hiding in plain sight. When someone likes a Persian recipe, the engine should surface Afghan and Iraqi dishes. When someone loves Soul Food collard greens, they might discover Nigerian egusi soup (also leafy-green based) or Ghanaian red red (also bean-based). That's the "recipes they've never thought of" moment that makes users tell their friends.*

* [ ] **Add `CUISINE_ADJACENCY` map** — Create `backend/src/utils/cuisineAdjacency.ts` with a bidirectional adjacency graph mapping every cuisine to its related cuisines. Relationships are typed: `subcuisine` (Persian → Middle Eastern), `sibling` (Nigerian ↔ Ghanaian), `diaspora` (Soul Food ↔ West African), `technique` (Burmese ↔ Chinese/Yunnan).
  * 📍 This is a static map, not ML — hand-curated for culinary accuracy
  * 📍 Export: `getAdjacentCuisines(cuisine: string): { cuisine: string; relationship: string; weight: number }[]`
  * 📍 Export: `getCuisineFamily(cuisine: string): string` — returns the parent family (e.g., "Latin American" for "Puerto Rican")

* [ ] **Add `CUISINE_FAMILIES` constant** — Group all cuisines into families for UI browse and recommendation context:

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

#### **Phase 1 Tests**

**`backend/tests/utils/cuisineAdjacency.test.ts`**
- [ ] Every cuisine in `GLOBAL_CUISINES` seed config has at least 1 adjacency entry
- [ ] Adjacency relationships are bidirectional (if Nigerian → Ghanaian, then Ghanaian → Nigerian)
- [ ] `getCuisineFamily()` returns a valid family for every defined cuisine
- [ ] Adjacent cuisines have weights between 0 and 1

**`backend/tests/utils/scoring.adjacency.test.ts`**
- [ ] User who likes Thai gets a non-zero boost for Burmese recipes
- [ ] Adjacent cuisine boost is always less than exact-match boost
- [ ] Cuisines with no adjacency data still score normally (graceful fallback)
- [ ] Multiple adjacency matches stack (user likes Thai AND Indian → Sri Lankan gets boosted from both)

---

#### **Phase 2: Expanded Global Cuisine Seed** 🌍 *(CRITICAL — the recipe pool IS the product)*

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

#### **Phase 3: Health-Forward Recipe Positioning** 💚 *(CRITICAL — the second pillar)*

*Every cuisine has a health story. This is Sazon's differentiator — not just "here's jollof rice" but "here's jollof rice at 420 calories with 35g protein using cauliflower rice." The AI generation prompts need to encode this.*

* [ ] **Health tier system for AI prompts** — Classify every cuisine into a health generation strategy:

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

* [ ] **Healthy swap suggestions** — For "Easily Adapted" cuisines, generate recipes with an optional `healthierSwap` field in instructions (e.g., "Swap flour tortilla for corn to save 60 calories and add fiber"). This doesn't change the recipe — it gives the user agency.

* [ ] **Superfood detection expansion** — Update `superfoodDetection.ts` to recognize superfoods common in newly added cuisines:
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

#### **Phase 4: Global Snacks & Macro-Friendly Desserts** 🍨🔥 *(CRITICAL — the viral category)*

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

#### **Phase 5: Content Quality & First-Run Experience** ✨

*Everything above creates the data. This phase ensures it's polished enough for a real user on day 1.*

##### Content Quality Pass

* [ ] **Recipe photo audit** — Ensure every seeded recipe has a high-quality Unsplash photo URL. Remove or replace broken/placeholder images. Use cuisine-specific search terms for photo matching.
* [ ] **Nutritional data completeness** — Verify macros (calories, protein, carbs, fat, fiber) are present on all recipes. Fill gaps via Spoonacular nutrition API or AI estimation.
* [ ] **Instruction clarity** — Review AI-generated recipe instructions for coherence, step ordering, and missing details. Ensure culturally authentic terminology (e.g., "sofrito" not "sauce base" for Puerto Rican recipes).
* [ ] **Meal type balance** — Ensure every cuisine has meaningful breakfast + lunch + dinner + snack representation. Current data skews heavily toward dinner.
* [ ] **Quick recipes gap fill** — Add recipes under 15 minutes for every cuisine (currently underrepresented). Users with `weekdayCookTime` set low need options across ALL cuisines, not just American/Italian.

##### First-Run Experience

* [ ] **Pre-populated home feed** — Ensure the home feed shows compelling recipes from diverse cuisines on first load before any preferences are learned. Curate a "Staff Picks" or "Explore Global Flavors" section featuring standout dishes from 8+ cuisine families.
* [ ] **Onboarding-to-feed connection** — Verify that onboarding preferences (cuisine, dietary, skill level) immediately affect the first home feed load. If a user selects "Nigerian" in onboarding, they should see jollof rice and suya within their first 5 recipes. Adjacency should kick in: selecting Nigerian should also surface Ghanaian and Senegalese dishes.
* [ ] **Cuisine browse view** — Add a "Browse by Region" section to the home feed or explore tab. Uses `CUISINE_FAMILIES` constant to group cuisines visually (map or grid). Tapping "African" shows Nigerian, Ghanaian, Ethiopian, etc. as sub-options.
* [ ] **Empty state polish** — Review all empty states (cookbook, meal plan, shopping list) to ensure they guide users toward the next action with cuisine-diverse examples.

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

- [ ] **Waitlist landing page** — Email capture with incentive: "Join the waitlist → get 30 days free Premium at launch" (extended from standard 7-day trial)
- [ ] **Waitlist signup in social bios** — Every TikTok, Instagram, YouTube bio links to the waitlist page
- [ ] **Waitlist drip sequence** (3 emails, automated):
  1. **Immediately:** "You're in! Here's what Sazon Chef is building" — problem statement + 3 screenshots
  2. **1 week later:** "141 cuisines, one meal plan" — showcase the global recipe database + one surprising recipe example
  3. **Launch day:** "We're live! Your 30-day free trial is waiting" — direct App Store + Play Store links + promo code
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
  - Send "Day 3" email to waitlist: "Here's what our first users are cooking"

---

#### **Referral Seed: Friends & Family Wave**

*Before the referral program (ROADMAP 3.5), seed installs manually.*

- [ ] **Personal outreach to 50 people** — Friends, family, gym buddies, coworkers who cook. Direct message with a personal ask: "I built this, would mean a lot if you tried it and left a review"
- [ ] **Give each person a specific ask** — "Try generating one meal plan" or "Import one recipe you like." A specific ask gets higher activation than "check it out"
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

* [ ] **Health disclaimer** — "Sazon Chef is not a medical application. Nutritional information is provided for informational purposes only and should not be construed as medical advice. Consult a healthcare professional before making significant dietary changes." — required inline in app (Profile or onboarding) and in ToS.

* [ ] **In-app links** — Privacy Policy and Terms of Service must be tappable in the app (Profile screen or Settings). Both stores validate this.

* [ ] **Delete Account** — Apple guideline 5.1.1 mandates a way for users to delete their account and all associated data within the app. The backend endpoint is defined in Group 5. Confirm the button is reachable from Profile without needing support, and that the data purge is complete before submitting for review.

---

#### **App Store Optimization: One Thing That Actually Matters at Launch**

*ASO is a long game. At launch, there's one lever worth pulling immediately: the review prompt.*

* [ ] **Review prompt** — Use `expo-store-review` (`StoreReview.requestReview()`). Fire it at the single best moment: after a user successfully completes a shopping trip in in-store mode (the "chef-kiss" success state). This is the highest-satisfaction moment in the app. Never prompt before value is delivered; never prompt more than once per 30 days.
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



