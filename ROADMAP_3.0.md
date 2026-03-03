# 🚀 **Sazon Chef - Roadmap 3.0: Growth, Monetization & Scale + Advanced Features**

*This roadmap covers two areas: (1) Advanced feature enhancements moved from [ROADMAP_2.0](ROADMAP_2.0.md), and (2) analytics, ML optimization, monetization, and scale preparation.*

---

## **Overview**

| Group | Focus Area | Est. Hours |
|-------|------------|-----------|
| **Group 1** | Smart Input | ✅ 0h |
| **Group 2** | Cookbook & Cooking | ✅ 0h |
| **Group 3** | Infrastructure & Scaling | ✅ codeable done · 🔄 infra pending |
| **Group 4** | Meal Plan Advanced | ✅ 0h |
| **Group 5** | Profile Advanced | ✅ 0h |
| **Group 6** | Growth & Marketing | ✅ 0h |
| **Group 7** | Stripe Integration & Subscriptions | 19h |
| **Group 8** | Revenue Optimization | 3h |
| **Group 9** | App Store Launch | 15h |
| **Group 10** | Analytics | 3h |
| **Group 11** | Algorithm Optimization | 8h |
| **TOTAL** | | **~98h** |

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

### **Group 3: Infrastructure & Scaling** 🏗️ ✅ CODEABLE PARTS COMPLETE

*Infrastructure should be invisible. Users never think about it — but they feel it when it breaks. Rule: instrument first, optimize when numbers demand it. Don't pre-optimize for scale you don't have yet.*

#### Security (Non-Negotiable) 🔒
* ✅ **Rate Limiting** — Per-user and per-endpoint limits; tier-based (free vs Premium). Prevent abuse and runaway AI costs.
  * 📍 Backend: `express-rate-limit` middleware, tiered by subscription status
* ✅ **Input Validation & Sanitization** — All user inputs validated server-side. SQL injection and XSS prevention via Prisma parameterized queries + helmet.js security headers.
  * 📍 Backend: `helmet` + `zod` schema validation on all routes — `zodValidate()` middleware factory + schemas in `src/middleware/`
* ✅ **CORS Configuration** — Lock down to known app origins only. No wildcard in production.
  * 📍 Regex-based allowlist: `FRONTEND_URL` env var + `exp://`, `exps://`, localhost for Expo Go/EAS
* 🔄 **DDoS Protection** — Cloudflare free tier in front of the API server. Bot detection on auth endpoints. *(infra — set up Cloudflare DNS)*

#### Caching (High Impact, Low Effort) ⚡
* 🔄 **Redis via Upstash** — Serverless Redis (zero infra to manage). Cache recipe feeds, recommendation results, and subscription status checks. TTL-based invalidation — no event bus complexity.
  * 📍 Backend: `ioredis` client + cache middleware wrapping expensive endpoints
  * Cache targets: home feed (5 min TTL), recipe search results (2 min TTL), user subscription status (10 min TTL)
  * *(needs Upstash account + `UPSTASH_REDIS_URL` env var — stub in `.env.example`)*
* 🔄 **Image Performance** — Cloudinary already integrated for item photos. Extend to recipe images: auto WebP conversion, responsive sizes, lazy load on scroll.
  * 📍 Frontend: `expo-image` with `contentFit="cover"` and `cachePolicy="memory-disk"` (already used — just ensure consistency across app)

#### Monitoring (Know Before Users Do) 👀
* ✅ **Error Tracking** — Sentry backend (`@sentry/node`) wired up. Gated on `SENTRY_DSN` env var — safe to deploy without it.
  * 📍 `@sentry/node` done; `@sentry/react-native` (frontend) — pending
* ✅ **Health Check Endpoint** — `GET /api/health` returns DB status, cache status, and response time. Used by uptime monitor.
  * 📍 Backend: done — also keeps simple liveness probe at `GET /health`
* 🔄 **Uptime Monitoring** — BetterUptime or UptimeRobot (free tier) pings `/api/health` every 60s. Alerts via Slack/email on downtime. *(external service setup)*

#### Deployment & CI/CD 🚀
* ✅ **GitHub Actions Pipeline** — On push to `main`: run tests + tsc. On PR: run tests only.
  * 📍 `.github/workflows/ci.yml` — backend + frontend jobs
* 🔄 **Staging Environment** — Mirror of production. All PRs deployed to staging first. *(infra — needs hosting account)*
* ✅ **Secrets Management** — `.env.example` documents all required vars. Add secrets to GitHub Secrets + production host env.

#### Database (Optimize What You Have) 🗄️
* ✅ **Indexes on Hot Queries** — Added indexes for page-load queries: recipe by userId, meal plan by userId+startDate+isActive, shopping list by userId+isActive.
  * 📍 Prisma schema updated + `npx prisma db push` applied
* 🔄 **Backup** — Automated daily database backups to cloud storage. Retention: 7 days. Test restore quarterly.
  * 📍 Simple cron job dumping SQLite → S3/Cloudflare R2 *(needs cloud storage account)*

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

### **Group 7: Stripe Integration & Subscription Paywall** 💳

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

#### **Implementation Phases**

**Phase 1 (Core plumbing — 1 week):** Stripe SDK + customer creation + schema + webhook handler + checkout/portal redirect
**Phase 2 (Frontend — 1 week):** Paywall screen + `useSubscription` hook + `PremiumGate` + trial countdown banner
**Phase 3 (Gating — 3 days):** `requirePremium` middleware + rate limiting + in-app paywall triggers
**Phase 4 (Emails — 2 days):** Trial warning + payment failed + cancellation confirmation templates

---

### **Group 8: Revenue Optimization** 💵

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

### **Group 9: App Store Launch Preparation** 📱

*Launching is not a feature — it's a gate. Everything in this group is non-negotiable for submission approval. Nothing in this group makes the product better for users; it makes the product visible to them. Do it once, do it right, don't over-engineer it.*

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

* 🔄 **App Store Connect** — Create app listing, configure name/description/keywords (100 char limit), set age rating (4+), set pricing (free with in-app purchases)
* 🔄 **App icon** — 1024×1024 PNG, no alpha channel, no rounded corners (Apple adds them). Use the Sazon habanero mascot.
* 🔄 **Screenshots** — Required sizes: 6.7" (iPhone 16 Pro Max) and 6.1" (iPhone 16). Minimum 3, maximum 10. Show the actual app — no marketing mockup frames that hide UI. Skip iPad for v1 (requires separate iPad-optimized layout).
* 🔄 **Store description** — Lead with the hook in the first 255 chars (shown before "more"). Keywords naturally in description; don't keyword-stuff.
* 🔄 **In-App Purchase products** — Configure Premium Monthly + Premium Annual in App Store Connect. RevenueCat links these to the same `premium` entitlement.
* 🔄 **StoreKit sandbox testing** — Verify purchase → restore → cancel flow on a real device in sandbox mode before submission.
* 🔄 **Compliance flags** — Check: uses encryption (yes, HTTPS — answer "yes, exempt"), contains ads (no), made for kids (no).
* 🔄 **Build & upload** — `eas build --platform ios --profile production` → upload IPA via EAS Submit or Transporter → submit for review.

---

#### **Android Submission Checklist**

*Play Store is more lenient on timing but equally strict on policy.*

* 🔄 **Play Console** — Create app, configure store listing, set content rating (complete questionnaire — food/recipe app is Everyone), set pricing
* 🔄 **App icon** — 512×512 PNG (32-bit with alpha OK for Play)
* 🔄 **Feature graphic** — 1024×500 PNG, shown at top of store listing. Use Sazon mascot + tagline.
* 🔄 **Screenshots** — Phone screenshots required (minimum 2, recommend 5–8). Tablet optional for v1.
* 🔄 **Data Safety section** — Complete in Play Console: declare data collected (email, dietary prefs, usage data), data shared (Spoonacular for recipe lookups), data encrypted in transit (yes), data deletion option (yes — account deletion in Profile).
* 🔄 **Google Play Billing** — Configure subscriptions in Play Console (same Premium Monthly + Annual). RevenueCat links to `premium` entitlement.
* 🔄 **Release tracks** — Internal → Closed Testing (5–10 testers) → Production. Don't skip internal/closed; catches build issues before public rollout.
* 🔄 **Build & upload** — `eas build --platform android --profile production` → upload AAB → submit for review.

---

#### **Legal & Compliance** *(Non-negotiable — both stores require these)*

* 🔄 **Privacy Policy** — Hosted at a public URL (e.g., `sazonchef.com/privacy`). Must cover: data collected, how it's used, third parties (Spoonacular, OpenAI/Anthropic/Google, RevenueCat, Resend), user rights (deletion, access), contact email. Use a privacy policy generator (Termly, iubenda) as the starting point, then customize for our actual data flows.
  * 📍 Required by both stores; Apple will reject without a valid URL in App Store Connect.

* 🔄 **Terms of Service** — Hosted at `sazonchef.com/terms`. Must include: subscription terms (cancellation, refunds per platform policy), content ownership (user-generated recipes), acceptable use, health disclaimer.

* 🔄 **Health disclaimer** — "Sazon Chef is not a medical application. Nutritional information is provided for informational purposes only and should not be construed as medical advice. Consult a healthcare professional before making significant dietary changes." — required inline in app (Profile or onboarding) and in ToS.

* 🔄 **In-app links** — Privacy Policy and Terms of Service must be tappable in the app (Profile screen or Settings). Both stores validate this.

* 🔄 **Delete Account** — Apple guideline 5.1.1 mandates a way for users to delete their account and all associated data within the app. The backend endpoint is defined in Group 5. Confirm the button is reachable from Profile without needing support, and that the data purge is complete before submitting for review.

---

#### **App Store Optimization: One Thing That Actually Matters at Launch**

*ASO is a long game. At launch, there's one lever worth pulling immediately: the review prompt.*

* 🔄 **Review prompt** — Use `expo-store-review` (`StoreReview.requestReview()`). Fire it at the single best moment: after a user successfully completes a shopping trip in in-store mode (the "chef-kiss" success state). This is the highest-satisfaction moment in the app. Never prompt before value is delivered; never prompt more than once per 30 days.
  * 📍 `frontend/components/shopping/ShoppingListComplete.tsx` → `StoreReview.requestReview()` after "all done" state

* 🔄 **Keywords** — Research and fill the 100-character keyword field in App Store Connect (Play Store uses full description). Primary: "meal planner", "recipe organizer", "grocery list". Secondary: "AI recipes", "cooking assistant", "nutrition tracker". Use AppFollow or Sensor Tower free tier for gap analysis.

---

#### **Implementation Order**

**Phase 1 (1 week — legal + accounts):** Privacy policy + ToS published, App Store Connect + Play Console accounts created, RevenueCat project configured, IAP products created in both stores
**Phase 2 (3 days — assets):** App icon finalized, screenshots captured on real devices (6.7" iPhone + Android phone), feature graphic, store descriptions written
**Phase 3 (3 days — builds):** EAS production build configuration, iOS IPA + Android AAB built and uploaded, sandbox/internal testing
**Phase 4 (1 day — submit):** Submit iOS for review (3–5 day wait), submit Android for review (1–3 day wait), monitor for rejection reasons

---

### **Group 10: Analytics** 📊

*Don't build what you can install. PostHog is open-source, has a generous free tier, and ships event tracking, funnels, cohorts, session recording, feature flags, and A/B experiments in a single SDK install. RevenueCat (Group 9) already covers revenue metrics. Sentry (Group 3) already covers crashes. There is no analytics infrastructure left to build.*

---

#### **Install PostHog. Done.**

```bash
npx expo install posthog-react-native
```

Wrap the app in `<PostHogProvider>` with the project API key. Auto-capture is on by default: screen views, taps, session duration, retention, funnels, device/OS properties.

📍 `frontend/app/_layout.tsx` — wrap root with `PostHogProvider`
📍 PostHog dashboard → create project, copy API key to `.env`

**What you get for free, immediately:**
* DAU / WAU / MAU, session length, retention curves (D1/D7/D30)
* Funnel analysis — onboarding drop-off, recipe discovery → cook completion
* Cohort analysis — compare users by signup week, goal mode, subscription tier
* Session recording (opt-in, anonymized) — watch where users hesitate or drop
* Feature flags — ship features to % of users without a code deploy
* A/B experiments — built-in, with automatic significance calculation
* User timelines — full event history per user (invaluable for support)

---

#### **Three Custom Events Worth Tracking**

PostHog auto-tracks taps and screens. The only events worth instrumenting manually are the ones that capture *outcome*, not just *interaction* — things PostHog can't infer from a tap:

| Event | When to fire | Why it matters |
|-------|-------------|----------------|
| `recipe_cooked` | User marks all steps complete in cooking mode | The ultimate engagement signal — differentiates browsing from actual cooking |
| `shopping_trip_complete` | All items checked off in in-store mode | Tracks the shopping loop close-rate; input for purchase history quality |
| `meal_plan_followed` | ≥4 of 7 planned dinners were cooked (detected from `recipe_cooked` events) | Measures whether AI meal plans are actually used, not just generated |

```ts
// Example
posthog.capture('recipe_cooked', {
  recipeId,
  cuisine,
  cookMinutes,
  fromMealPlan: !!mealPlanId,
  sazonScore,
})
```

---

#### **Revenue & Error Metrics — Already Covered**

* **Revenue** — RevenueCat dashboard: MRR, ARR, trial conversion, churn rate, LTV by cohort. No custom implementation needed.
* **Crashes & errors** — Sentry (Group 3): crash-free session rate, error rate by endpoint, p99 API latency. No custom implementation needed.
* **Subscription funnels** — PostHog + RevenueCat webhook events: track `subscription_started`, `trial_converted`, `subscription_cancelled` as PostHog events for funnel analysis alongside product behavior.

---

### **Group 11: Algorithm Optimization** 🧠

---

#### **Sazon Score — Flavor Density Scoring** ✨

*A recipe that's 7/10 flavor at 300 cal is a better use of a meal than 9/10 at 550 cal. The Sazon Score makes that judgment for the user, invisibly.*

**Core Formula (Calorie Lens — default):**
```
sazonScore = flavorScore / (calories / 400)
```
Where 400 cal is the reference baseline for a single meal. Under 400 = score boosted. Over 400 = score penalized. At exactly 400, the score equals raw flavor — intuitive and stable.

**Flavor Score — Hybrid Source (in priority order):**
1. User's own star rating: `userRating * 2` (normalize 1–5 → 2–10)
2. Community average: `communityAvg * 2` once sufficient votes exist
3. Spoonacular taste profile fallback (always available, no user data needed):
```ts
palatability = (
  savoriness * 0.35 + fattiness * 0.25 + sweetness * 0.20 +
  spiciness  * 0.10 - bitterness * 0.15 - sourness  * 0.05
) / 100 * 10  // → 0–10 scale
```

**Scoring System Integration:**
* Replace existing 30% taste score component in `optimizedScoring.ts` with `sazonScore`
  * Before: `finalScore = macroMatch * 0.70 + tasteScore * 0.30 + boosts`
  * After:  `finalScore = macroMatch * 0.60 + sazonScore * 0.25 + behavioralBoost + temporalBoost + superfoodBoost`
  * 📍 `backend/src/utils/optimizedScoring.ts` — update weight constants + add `computeSazonScore()` helper
  * 📍 `backend/src/utils/recipeOptimizationHelpers.ts` — add `getPalatabilityFromTasteProfile()` using Spoonacular taste fields
  * 📍 Spoonacular taste data: fetch and store on recipe ingest; `tasteProfile` JSON column on `Recipe` model

**User-Facing Display:**
* Two-tier badge on recipe cards (no number — just a contextual label):
  * `✨ High Value` — top 25% Sazon Score for the user's active lens
  * `🔥 Indulgent` — great flavor but calorie-dense (honest framing, not punishing)
  * No badge for middle tier — noise reduction
* Recipe detail page: one line — "Sazon Score 8.4 · Flavor 7/10 · 300 cal"

**User Lens Preference (one setting, Profile):**
* "Optimize recipes for: [Calories ✓ | Protein | Time | Budget | Nutrients]"
* Defaults to user's Goal Mode: Cut → Calories, Build → Protein, Maintain → Calories
* Only the calorie lens is implemented in this phase — the others are in the appendix
  * 📍 `User.sazonLens: 'calorie' | 'protein' | 'time' | 'budget' | 'nutrient'` — calorie is the only active one for now, others stored for forward compatibility

---

#### **Scoring System Consolidation** 🔧

*The scoring system works. Make it testable and maintainable before the Sazon Score lands on top of it.*

* 🔄 **Consolidate scoring entry point** — ensure all recommendation paths (home feed, search, meal plan generation) go through the same `computeFinalScore()` function. Currently there are divergent paths that apply different subsets of the boost system.
* 🔄 **Unit tests for core scoring** — `optimizedScoring.test.ts`: test macro match weights, behavioral boost thresholds, Sazon Score formula edge cases (0-cal recipe, missing taste profile, cold-start user).

---

#### **Implementation Order**

**Phase 1 (1 week):** Sazon Score formula + scoring consolidation + unit tests
**Phase 2 (3 days):** Badge display on recipe cards + user lens preference in Profile

---

## **Appendix: Cut Features — Revisit Later** 🗃️

*These features were removed during the Phase 1 lean-out under the principle "simplicity is the ultimate form of sophistication." They aren't bad ideas — they just require either a larger user base, more backend infrastructure, or a UI complexity budget we haven't earned yet. Revisit each when the condition listed under "When to Revisit" is met.*

*Rule for re-adding any feature: if the user has to read a tooltip to understand it, it's not ready yet.*

---

### **1. Social & Community** 👥

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Follow Users / Friends' Collections | Group 2 (Cookbook) | No user base yet — a social graph with 50 users is a ghost town |
| Share Collections (public links) | Group 2 (Cookbook) | Requires content moderation, public URL infrastructure, abuse handling |
| Collaboration (invite contributors, permissions) | Group 2 (Cookbook) | Permission levels + conflict resolution is a product in itself |
| Activity Feed (who cooked what, recipe recs from friends) | Home Feed | Requires social graph, notification infra, and enough DAUs to feel alive |
| "Share to Home" (friends push recipes to your feed) | Home Feed | Same as above — empty feeds kill engagement faster than no feed |
| Recipe Reviews & "I Made This" | Home Feed | UGC moderation overhead; better as a later trust-building feature |
| Share What I'm Cooking (Quick Action) | Group 1 (Quick Actions) | No destination to share to yet |

**Why these feel premature:** Social features live or die by network density. With a small early user base, an empty activity feed is worse than no feed at all. The app needs to be valuable solo first.

**How to revisit with simplicity in mind:** Don't build a social network. Instead, start with *one* passive social signal that requires zero effort from the user — e.g., "47 Sazon users saved this recipe this week." No following, no feeds, no profiles. If that drives engagement, layer in opt-in sharing next. Full social graph last.

---

### **2. Gamification** 🎮

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Cooking Streaks | Home Feed | Streaks punish users who miss a day — creates anxiety, not joy |
| Weekly Challenges ("Try 3 new cuisines") | Home Feed | Requires content curation team to keep challenges fresh and meaningful |
| Achievements & Badges | Home Feed | Badge inflation devalues the system quickly; needs careful calibration |
| Stats Dashboard (total cooked, consistency calendar) | Home Feed | Interesting but not decision-driving — users don't cook more because of a graph |

**Why these feel premature:** Gamification works when the core loop is already habit-forming. Adding streaks before the app is sticky creates churn (users quit when they break a streak). The cooking loop needs to be intrinsically rewarding first.

**How to revisit with simplicity in mind:** Start with *one* low-stakes signal — e.g., a subtle "🔥 12 recipes cooked" count on the profile. No streaks, no pressure. If users care about it (tap it, share it), build from there.

---

### **3. Power-User Input & Configuration** ⚙️

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Boolean Search Operators (AND, OR, NOT) | Smart Search | 0.1% of users use this; 99.9% are confused by it |
| Category Syntax Shortcuts (`cuisine:italian`, `time:<30`) | Smart Search | Developer UX, not user UX — NLP should handle this transparently |
| Visual Query Builder (drag-and-drop filters) | Smart Search | More complex than the problem it solves — existing filter chips work |
| Customizable Quick Actions (choose 6 from 15+ pool) | Group 1 (Quick Actions) | Configuration is a tax on the user — auto-learn what they use instead |
| FAB Position / Mini FAB / Radial Menu | Group 1 (Quick Actions) | Three different menus for one button is UX debt, not UX richness |
| Gesture Shortcuts (swipe to open camera, etc.) | Group 1 & Home Feed | Undiscoverable by default; adds cognitive load to learn |
| "Customize Home" screen | Home Feed | Manual curation is a fallback when personalization fails — fix the algo instead |
| Drag-to-Reorder Quick Actions | Group 1 (Quick Actions) | If the system auto-ranks correctly, nobody needs to reorder |

**Why these feel premature:** Configuration is what you add when you can't make a good default decision. Every config screen is an admission that the product doesn't know its user well enough yet.

---

### **4. Analytics & Data Views** 📊

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Price History & Trend Graphs | Shopping Intelligence | Requires consistent price data over time — noisy and misleading early on |
| Category Spending Breakdown | Shopping Intelligence | Interesting insight but not actionable without a budget feature maturity first |
| Cooking Stats / Consistency Calendar | Home Feed | Pretty but not decision-driving in early stages |
| Photo Feed (chronological cooking photos) | Group 2 (Cookbook) | Personal photo archive with no social layer is a gallery app |
| Search Analytics Dashboard | Smart Search | Internal tooling — belongs in Groups 10/11, not Phase 1 |

**Why these feel premature:** Data views need data. Trend graphs with 3 data points mislead. Category spending with $0 history is empty. These features compound in value over time — they're not Day 1 features.

---

### **5. Third-Party Integrations** 🔌

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Instacart / Walmart / Kroger OAuth Sync | Shopping Intelligence | Each integration is a full engineering project; APIs change constantly |
| Multi-Store Splitting & Price Comparison | Shopping Intelligence | Dependent on real-time inventory data — expensive and brittle |
| Store-Specific Lists | Shopping Intelligence | Niche feature requiring store layout data that varies by location |
| Receipt OCR / Scan to Extract Prices | Group 1 (Quick Actions) | OCR quality is inconsistent; bad results erode trust faster than no feature |
| Apple Health / Google Fit Full Sync | Group 5 (Profile) | Full sync scope is large; partial sync confuses users more than it helps |

**Why these feel premature:** Third-party integrations are adoption multipliers, not acquisition drivers. Build them when users are asking for them, not before.

---

### **6. Content Curation Features** 📚

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Cuisine Journey (guided starter → advanced) | Home Feed | Requires ongoing content curation and curriculum design — a staffing commitment |
| Technique Tutorials (skill-based progression) | Home Feed | Same — video/step-by-step tutorial content is expensive to produce and maintain |
| Dietary Deep Dives ("Keto starter pack", etc.) | Home Feed | Curated collections go stale; dietary trends shift; needs a curator |
| Ingredient Spotlight (full deep dive format) | Home Feed | Simplified to a weekly rotating card — full editorial format is a content play |

**Why these feel premature:** These are content products masquerading as features. They require writers, editors, and regular updates. A startup should not commit to a content calendar before product-market fit.

---

### **7. Advanced Recipe Management** ✏️

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Recipe Versioning (change history, restore) | Group 2 (Cookbook) | Git for recipes — impressive in demos, rarely used in practice |
| Substitution Tracking (record swaps, rate success) | Group 2 (Cookbook) | Logging overhead outweighs value for most users |
| Recipe Comparison (side-by-side view) | Group 2 (Cookbook) | Niche decision-support feature; most users just tap and try |
| Collection Backup / JSON Export | Group 2 (Cookbook) | Power-user escape hatch — useful but not urgent |

---

### **8. Infrastructure Over-Engineering** ⚙️

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Read Replicas | Group 3 | Premature — only needed when you have read-heavy traffic at scale |
| Blue-Green Deployments | Group 3 | Ops complexity without a dedicated DevOps person is a liability |
| Geographic CDN / Edge Caching | Group 3 | Meaningful only with a globally distributed user base |
| Data Archival & Retention Policies | Group 3 | No data volume problem yet — this is a future compliance concern |
| Feature Flag-Based Rollback | Group 3 | A `git revert` and redeploy is faster and simpler at this scale |
| Database Migration to PlanetScale/Neon | Group 3 | SQLite + Prisma handles current load; migrate when you hit actual limits |
| Cache Warming Strategies | Group 3 | Premature optimization — measure cache miss rates first |
| Status Page | Group 3 | Useful at scale; with a small user base, a tweet is faster |

---

### **9. Calendar Integration** 📆

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Google / Apple Calendar Sync | Group 4 (Meal Plan) | Calendar OAuth is complex; permissions feel invasive to users |
| Busy Day Detection via Calendar | Group 4 (Meal Plan) | Requires calendar read access — high privacy friction for marginal gain |
| Shopping Day Reminders via Calendar | Group 4 (Meal Plan) | Notification-based reminders achieve the same result with zero permissions |

---

### **10. Family & Household Features** 👨‍👩‍👧‍👦

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Household Member Profiles (per-person macros/restrictions) | Groups 4 & 5 | A full household profile system is a separate product layer |
| Per-Person Portion Scaling | Group 4 | Depends on household profiles existing first |
| "Everyone Can Eat This" Filter | Group 5 | Depends on household profiles + aggregate restriction logic |
| Kids' Profiles & Kid-Friendly Filtering | Group 4 | Niche early on; also requires content tagging for kid-appropriate recipes |
| Family Collaborative Meal Planning | Group 4 | Real-time collaborative editing with conflict resolution is complex |

---

### **11. Body Tracking & Fitness Wearables** 💪

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Body Measurements (waist, chest, hips, etc.) | Group 5 (Profile) | Fitness tracker territory — not a natural extension of a recipe app |
| Progress Photos with Timeline | Group 5 (Profile) | Privacy-sensitive, high storage cost, competes with dedicated apps |
| Weight Goal with Projected Completion Date | Group 5 (Profile) | Clinical feel; the projection math creates false precision |
| Fitbit / Garmin / Whoop Integration | Group 5 (Profile) | Each is a full engineering project; niche overlap with Sazon's core user |

---

### **12. Meal Plan Analytics & Optimization Views** 📊

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Variety Scoring (score the week on diversity) | Group 4 | Interesting metric, not action-driving |
| Micronutrient Tracking & Weekly Trends | Group 4 | Micronutrient data is noisy and anxiety-inducing without clinical context |
| Cost Per Calorie / Budget vs Actual Tracking | Group 4 | Overlaps with Shopping Intelligence budget feature — redundant |
| Completion Rate Trends & Streak Tracking | Group 4 | Streak tracking cut across the board (gamification appendix section 2) |
| "Cheat Meal" Planning & Auto-Adjustment | Group 4 | Over-medicalized language; creates a guilty/innocent framing around food |

---

### **13. Profile Vanity & Power-User Features** 🪞

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Data Dashboard (activity heatmap, usage stats) | Group 5 (Profile) | Vanity metrics — interesting to look at, not useful for decision-making |
| Import from MyFitnessPal / CSV | Group 5 (Profile) | High effort, low usage — most users won't migrate historical data |
| Seasonal Goals ("Summer cut", "Winter bulk") | Group 5 (Profile) | Thin wrapper over the existing goal system; not worth UI space |
| Personalized Tips (learn from dismissed tips) | Group 5 (Profile) | Tip engine that learns is a ML project in itself |
| Ingredient Discovery Toggle ("Try new ingredients" badge) | Group 5 (Profile) | The AI already surfaces new recipes naturally; the toggle adds UI for what's already happening |
| Account Linking / Multiple Auth Providers | Group 5 (Profile) | Edge case (< 1% of users); complex account-merge logic |
| Shopping Preferences (preferred stores, organic/brand) | Group 5 (Profile) | Useful but niche; hard to act on without real inventory data |

---

### **14. Sazon Score — Advanced Lenses & Full Personalization** ✨

*The calorie lens (Group 11) is the low-hanging fruit. These are the medium and hard extensions — each adds a new dimension of "worth it" that different user types care about. Same formula, different divisor. Revisit once the core calorie lens is shipped and validated.*

#### Medium Complexity

| Feature | Complexity | Why deferred |
|---------|-----------|--------------|
| **Additional Lenses** — Protein-first, Time-efficient, Budget-friendly, Nutrient-dense | Medium | Formulae are identical to calorie lens; deferred to validate the concept first |
| **Community Flavor Score** — Aggregate user ratings as middle-tier flavor source | Medium | Needs a minimum vote threshold logic + Bayesian smoothing to avoid noisy averages from 1–2 ratings |
| **Sazon Score on Recipe Detail Page** — Full breakdown card: "Score 8.4 · Flavor 7/10 · 300 cal · top 15% for your lens" | Medium | UI only — depends on core scoring being stable first |
| **Score Invalidation on Rating** — When user rates a recipe, their personal `sazonScore` for it updates immediately, cache busted | Medium | Cache invalidation logic across Redis + in-memory feed results |
| **Lens Auto-Switch with Goal Mode** — Switching Cut/Build/Maintain in meal plan (Group 4) silently updates the active Sazon lens | Medium | Requires event linkage between meal plan goal state and scoring preferences |

#### Hard Complexity

| Feature | Complexity | Why deferred |
|---------|-----------|--------------|
| **Cold-Start Accuracy Improvement** — Correction layer on accumulated user ratings | Hard | Requires enough rating data (thousands of pairs) to train a meaningful correction model |
| **Per-User Taste Profile Learning** — Build a personal flavor correction multiplier per taste dimension | Hard | Full personalization pipeline: collect rating → compare to model prediction → update per-user taste weights |
| **Sazon Score A/B Testing** — Run controlled experiments on badge impact vs. cook rate | Hard | Requires A/B testing infrastructure and sufficient user volume for statistical significance |
| **Cross-Meal Sazon Score** — Score a full day's eating plan, not just individual recipes | Hard | Requires modeling meal interactions — multi-meal optimization problem |

---

### **15. Phase 3 Cuts — Growth, AI Assistant & Visual Capture** 🚀

#### From Group 6 — Growth & Marketing

| Feature | Why Cut |
|---------|---------|
| **Tiered referral rewards** — Bronze/Silver/Gold levels | Reward tiers require tuning, edge-case handling (fraud, refunds, attribution windows), and a large enough user base |
| **QR code referral links** | Premature distribution channel; a digital referral link does the same job for the same audience |
| **Referral Program** — Unique invite links + 1-free-month rewards | No user base yet; referral economics need validation |
| **Recipe sharing as image card** — Branded card with macros + Sazon logo | Requires `react-native-view-shot` + Cloudinary pipeline; ship the product first |
| **Deep links** — `sazon.app/r/:recipeId` with OG tags for social unfurls | Requires public URL infrastructure and a web presence; redirect → App Store for now |
| **Lifecycle emails** (Day 3 feature nudge, Day 7 weekly digest, Day 14 re-engagement) | Content calendar + segmentation overhead; transactional email is enough for launch |
| **Viral loops / public collections** | No user base = empty walls |
| **ML-based notification timing** | Over-engineered for current scale; condition-based triggers outperform ML timing until volume is there |

#### From AI Nutrition Assistant (entire group)

*The full AI chat interface, nutritional gap analysis, smart recommendations, health goals, meal history search, proactive insights, and voice/privacy features — all deferred. Estimated 40–55h to implement properly. Revisit after Stripe + App Store launch, when there are paying users to justify the operational cost.*

**When to revisit:** When Premium MRR is stable and users are asking for nutritional guidance beyond what the meal plan + recipe scoring provides. The full spec exists in the original ROADMAP_3.0 draft — implementation can begin immediately when prioritized.

#### From Visual Capture Features (entire group)

*Nutrition by Photo and Video to Recipe — both deferred. Spoonacular visual analysis is expensive at scale; Nutrition by Photo is a Premium-only feature that requires a paying user base to justify the API quota. Video to Recipe is similarly Premium-only.*

**When to revisit:** After launch, when Premium subscribers are active and asking for faster data entry. Both features have complete specs — implementation can begin immediately when prioritized.

---

### **16. Phase 4 Cuts — Stripe & Revenue Optimization** 💳

#### From Group 7 — Stripe & Subscription

| Feature | Why Cut |
|---------|---------|
| **Pro Tier** ($19.99/mo — family sharing, API access, custom recipe DB, white-label) | A Pro tier is a separate product targeting a different buyer. Revisit when Premium has ≥500 paying users. |
| **Custom payment method management screens** | Stripe Customer Portal handles all of this. |
| **Invoice download & custom invoice emails** | Stripe sends payment receipts automatically. |
| **A/B pricing experiments framework** | Needs volume (~200+ conversions per variant for significance). Pick a price, ship it. |
| **Regional pricing** | Significant complexity (currency display, tax rules). Revisit after launch in primary market. |
| **Promotion code UI in paywall** | Stripe Checkout natively supports promo codes — no frontend code needed. |
| **Trial extension for engaged users** | Handle via Stripe dashboard one-off until it's a repeating pattern. |

#### From Group 8 — Revenue Optimization

| Feature | Why Cut |
|---------|---------|
| **Smart Paywall Triggers extra logic** | The four trigger moments in Group 7 are sufficient; an inline "X messages left" nudge can be added in the same PR as AI chat |
| **Churn prediction model** | Requires months of retention data and enough churned users to train on |
| **Paywall A/B testing framework** | Needs volume; default to best-practice paywall design and iterate manually |
| **Re-engagement campaigns** | Belongs after launch when there's a user base to segment |
| **Win-back automation** | Manual email covers it initially |
| **Loyalty program** | No paying user base to reward yet |
| **Annual plan upsell to monthly subscribers** | Valid tactic; add 30 days after launch once monthly cohort exists |

---

### **17. Phase 5 Cuts — App Store Launch** 📱

| Feature | Why Cut |
|---------|---------|
| **iPad screenshots** | iPad requires a tablet-optimized layout. Phone-first for v1. |
| **App preview videos** | Time-intensive; screenshots convert better for a cold launch |
| **Localization** | Translate after you have data showing where users come from |
| **ASO A/B testing** | Needs 200+ daily installs for statistical significance |
| **Manual StoreKit implementation** | RevenueCat replaces this entirely |
| **Manual Google Play Billing implementation** | Same as StoreKit — RevenueCat handles it |
| **Separate Apple + Google server notifications** | RevenueCat normalizes both into a single webhook |
| **Family sharing subscription sync** | No Pro tier, no family plan |
| **Tablet screenshots (Android)** | Phone-first for v1 |

---

### **18. Phase 6 Cuts — Analytics & Algorithm/ML** 📊🧠

#### From Group 10 — Custom Analytics Platform (original)

| Feature | Why Cut | Replace With |
|---------|---------|--------------|
| **Custom event queue + batch processing pipeline** | Weeks of infra engineering | PostHog SDK (buffers and batches automatically) |
| **Custom admin dashboards** | Months of frontend work | PostHog dashboards + RevenueCat for revenue |
| **Custom funnel builder** | Complex query engine + UI | PostHog funnels (built-in) |
| **Behavioral segmentation engine** | Rules engine + daily jobs | PostHog cohorts (built-in) |
| **Session recording + heatmaps** | Privacy-sensitive infra | PostHog session recording (built-in) |
| **Real-time dashboards** | WebSocket infra + chart polling | PostHog live view + Sentry real-time alerts |
| **Health metrics** | Separate monitoring stack | Sentry (already in Group 3) |

#### From Group 11 — ML Infrastructure

| Feature | Why Cut |
|---------|---------|
| **Collaborative filtering** | Requires a dense interaction matrix — sparse data performs worse than rule-based scoring |
| **Content-based embeddings** | Spoonacular's similarity endpoint already does this |
| **Deep learning models** | Not appropriate until collaborative filtering is validated |
| **Contextual bandits** | Online learning requires sustained high query volume to converge |
| **ML model serving infrastructure** | No models to serve |
| **Model monitoring** | No models to monitor |
| **Continuous learning pipeline** | No models to retrain |
| **Custom A/B testing framework** | PostHog feature flags + experiments handle this |

#### From Group 11 — Feedback & Research Tools

| Feature | Why Cut | Replace With |
|---------|---------|--------------|
| **NPS survey system** | A week of work for a 30-second setup | Delighted or Typeform — embed a link in transactional email |
| **In-app feature request tracker** | A product in itself | Canny (free tier) or a public Notion page |
| **In-app bug report modal** | Sentry already captures crashes + device context | Sentry user feedback widget for critical bugs |
| **User interview scheduling system** | Operational overhead | Calendly link in Profile > "Share Feedback" |

---

### **19. Phase 7 Cuts — MVP Trim** ✂️

*Features removed to bring total implementation hours under 100. All features below are fully specced and ready to implement — they were cut on priority grounds only, not because they're bad ideas. Revisit each when the condition listed is met.*

---

#### **Shopping Intelligence (entire group)**

| Feature | Why Cut | When to Revisit |
|---------|---------|-----------------|
| **Cart Nutrition Summary** — collapsible macro totals for shopping list | Valuable but requires Spoonacular nutrition lookups per item, which adds API cost and latency | After launch, when users are actively using shopping lists and asking "what am I buying?" |
| **Dietary Auto-Flag** — warn on items conflicting with dietary profile | Depends on real-time ingredient-to-restriction matching, which requires reliable ingredient parsing | After dietary propagation (Group 5) is live and trusted |
| **"You usually buy..."** — quantity suggestions from purchase history | Purchase history (shipped in 2.0) already records this data; the UI is the missing piece | When purchase history has ≥4 weeks of data per user |
| **Substitution Suggestions** — dietary-compatible alternatives | Requires recipe context linkage per shopping list item | After recipe-to-shopping-list relationship is more mature |
| **Recipe Context** — show which recipes need each item | High value, requires join between list items and recipe ingredients | When shopping list → meal plan integration is tighter |
| **Shared Lists** — invite link + real-time WebSocket sync | WebSocket infrastructure adds backend complexity before the core is validated | After launch, when households are a meaningful user segment |
| **Simple Budget** — weekly grocery budget with running total | Useful but non-critical for launch; no revenue impact | After shopping list usage data shows what users want |

---

#### **Group 2 — Cookbook & Cooking (partial cut)**

| Feature | Why Cut | When to Revisit |
|---------|---------|-----------------|
| **Import from Photo** — OCR + AI from recipe book/magazine photo | OCR quality is inconsistent; bad results erode trust | After URL import is validated and users request photo scanning |
| **Smart Collections** — auto-generated "Quick & Easy", "High Protein", etc. | Requires always-up-to-date query filters; adds read load | After cookbook usage patterns are clear from PostHog data |
| **Multi-Select + Bulk Operations** — long-press, bulk move/delete/export | Adds UI complexity for a feature most users won't discover | After cookbook has >20 recipes per typical user |
| **Export & Share as PDF / Image Card** — Instagram/Pinterest-ready | Requires PDF rendering library + Cloudinary pipeline | After recipe sharing is validated as a growth channel |
| **Duplicate Detection** — warn when saving similar recipe | Requires fuzzy matching on recipe title + ingredients | After cookbook has enough scale to make duplicates a real problem |
| **"You Might Like"** — recommendations from saved recipes | Overlaps with home feed personalization; redundant pre-launch | When home feed is live and recommendation signals are validated |
| **Gap Analysis** — "You have lots of dinner recipes but almost no breakfasts" | Requires meal-time categorization of all saved recipes | After cookbook size justifies the insight |

---

#### **Smart Home Feed (entire group)**

| Feature | Why Cut | When to Revisit |
|---------|---------|-----------------|
| **"What's in Your Fridge?"** — ingredient-based recipe discovery | High value, but Spoonacular `findByIngredients` call adds API cost and requires a fridge ingredient input UI | After launch; this is a natural Shopping Intelligence follow-on |
| **Weather-Aware Feed** — light salads on hot days, soups on cold | Zero setup for the user; just an OpenWeatherMap API call + scoring adjustment | 1-2 days to implement; cut only because home feed ranking isn't the priority pre-launch |
| **Leftover Mode** — "what can I make with last night's chicken?" | Requires connection between meal plan history and current date | After meal plan generation (Group 4) has been live for several weeks |
| **"Because You Liked X"** — explain WHY a recipe is recommended | Frontend label + backend attribution logic | After home feed personalization is established |
| **Trending This Week** — popular recipes across Sazon users | Requires aggregating engagement signals across users | After PostHog + recipe quality score data exists |
| **Seasonal Picks** — auto-rotate based on month | Simple date-based filter on recipe categories | Low effort; add when home feed section logic is built |
| **"Cook Again?"** — highly-rated past recipes | Requires meal history + rating join | After meal plan generation creates a usage pattern to build on |
| **Auto-Learn Section Ordering** — reorder sections based on tap behavior | Requires PostHog event-driven personalization | After home feed sections exist and engagement data is available |
| **Sazon Score Badges** — `✨ High Value` / `🔥 Indulgent` on home feed | Already in Group 11; add to home feed in the same PR | Part of Group 11 implementation |
| **Weekly Ingredient Spotlight** — rotating educational card | Content-light feature; low complexity | After home feed structure is stable |
| **Full Accessibility Pass** — VoiceOver, TalkBack, Dynamic Type, reduced motion | Important but not blocking for launch with a small user base | Before scaling; required for App Store featured consideration |

---

#### **Smart Search (entire group)**

| Feature | Why Cut | When to Revisit |
|---------|---------|-----------------|
| **Semantic Search** — embedding-based "comfort food", "date night" | Requires embedding model + vector similarity infrastructure | After search volume justifies the infra cost |
| **Fuzzy Matching** — typo tolerance | Can use Spoonacular's built-in fuzzy search for now | When search failure rate (PostHog) shows typos as a real drop-off cause |
| **Personalized Ranking** — boost results by past behavior | Overlaps with scoring system; incremental gain pre-launch | After behavioral data (Group 11 feedback loop) is collected |
| **Voice Search** — mic button in search bar | Same engine as Group 1; low effort to wire up | Can be added in the same session as any search screen work |
| **Photo Search** — find recipes from a dish photo | Spoonacular visual similarity API call + camera UI | After Visual Capture (Appendix) is live |
| **Faceted Counts** — "Found 42 results: 18 dinner, 12 lunch..." | Requires aggregation query on top of search results | After search is validated as a primary discovery channel |
| **Rich Previews in Dropdown** — image + cook time + macro highlights | Frontend polish; low complexity | When search dropdown UX is revisited |
| **Saved Searches** — star a search to save query + filters | Low complexity; PostHog will show if users repeat searches | After search usage patterns are clear |
| **Smart No Results** — similar searches, relax filters, "generate a recipe?" | High value; one of the best ways to prevent dead ends | When "generate a recipe" feature exists to link to |
| **Sort by Sazon Score** — in search results | Already in Group 11; add to search sort options in same PR | Part of Group 11 implementation |

---

#### **Group 4 — Meal Plan Advanced (partial cut)**

| Feature | Why Cut | When to Revisit |
|---------|---------|-----------------|
| **Leftover Tracking** — "makes leftovers" tag + next-day suggestion | Requires `makesLeftovers` recipe tag + `leftoverSourceMealId` on meal slots | After AI generation is live and used for several weeks |
| **Ingredient Overlap Optimization** — bias plan toward shared ingredients | Complex scoring pass during AI prompt construction | After "Plan My Week" is stable and ingredient waste is a user complaint |
| **Batch Cooking Suggestions** — "Sunday prep: cook once for 3 meals" | Requires recipe clustering by shared prep steps | After leftover tracking is live |
| **Pantry-First** — bias toward expiring pantry items | Requires a pantry tracking feature that doesn't exist yet | After a pantry/fridge feature is built |
| **Time-Aware Slots** — auto-fill Wednesday with quick recipes | Cooking time preferences (Group 5) already capture this; wiring to slot population is the remaining step | Can be added to meal plan AI prompt in the same session as Group 5 cooking time |
| **"Based on Last Week"** — model what worked, suggest similar | Requires meal plan completion tracking (PostHog `meal_plan_followed` event from Group 10) | After several weeks of meal plan completion data |
| **Meal Time Reminders** — "start dinner now to eat at 7" | Time picker on meal slot + local push notification scheduling | After meal plan generation is validated |
| **Flexible Slots** — skip meal, mark "eating out", fasting support | UI complexity for an edge case most users won't configure | After meal plan usage patterns are clear |
| **Compact Week Overview** — 7-day macro balance bar at top | Frontend polish; 1-2 days | After week view is stable and users are actively using the plan |

---

#### **Group 5 — Profile Advanced (partial cut)**

| Feature | Why Cut | When to Revisit |
|---------|---------|-----------------|
| **Kitchen Equipment Checklist** — appliances owned, scoring penalty for unowned equipment | High onboarding friction for marginal recommendation gain pre-launch | After dietary filtering is trusted; equipment is the next filter layer |
| **Weight from Apple Health / Google Fit** — read-only sync | `react-native-health` integration is non-trivial on both platforms | After launch; weight sync is a nice-to-have, not a safety feature |
| **Macro Adjustment for Activity** — +200 cal target on active days | Depends on Health sync | Same as Health sync |
| **Two-Factor Auth (TOTP)** — Google Authenticator / Authy | Low priority security feature for a consumer app at this stage | After user base is established and enterprise/health users are in the mix |
| **Active Sessions** — see devices + "log out everywhere" | Nice to have; not a launch blocker | After auth is stable and session management is a user concern |
| **Biometric Lock** — Face ID / Touch ID to open the app | `expo-local-authentication` integration; 1-2 days | When privacy is a top user concern (survey data from Group 11) |
| **GDPR / Data Export** — download all user data as ZIP | Required by law for EU users; not required for US-only launch | Before expanding to EU/UK market |
| **Local-Only Mode** — disable all cloud sync | Privacy feature for a niche segment | After privacy concerns surface in user feedback |
| **Weekly Eating Summary** — Sunday Claude Haiku insight via push | Lightweight preview of AI Nutrition Assistant; requires meal log data | After meal plan generation creates enough meal history to summarize |

---

#### **Group 6 — Growth & Marketing (partial cut)**

| Feature | Why Cut | When to Revisit |
|---------|---------|-----------------|
| **Referral Program** — unique invite link + 1-month Premium reward for both parties | No user base yet; referral programs need a base to activate | When MAU > 500 and organic growth plateaus |
| **Recipe sharing as image card** — branded card with macros + Sazon logo | `react-native-view-shot` + design work; ship product first | When recipe discovery is a validated acquisition channel |
| **Deep links** — `sazon.app/r/:recipeId` with OG tags for social unfurls | Requires a web presence and public URL infrastructure | Before any social sharing is enabled |
| **Lifecycle emails** — Day 3 feature nudge, Day 7 weekly digest, Day 14 re-engagement | Requires segmentation logic + content calendar; adds complexity before basics are validated | After first 100 signups; measure drop-off from welcome email first |

---

#### **AI Nutrition Assistant (entire group)**

*Full spec exists in the original ROADMAP_3.0 draft. 40–55h to implement. Includes: core chat interface, nutritional gap analysis, smart recommendations, health goals, meal history search, proactive insights, voice chat, conversation history.*

**When to revisit:** When Premium MRR is stable (>$500/mo) and paying users are actively asking for nutritional guidance. The chat interface is the highest-value feature for retention — it's the right next investment after the core monetization loop is working.

---

#### **Visual Capture Features (entire group)**

*Full spec exists in the original ROADMAP_3.0 draft. Includes: Nutrition by Photo (Spoonacular visual API) and Video to Recipe (share sheet + async extraction).*

**When to revisit:** After launch, when Premium subscribers are active. Both features are Premium-only (expensive API quota) — they need a paying user base to justify. Nutrition by Photo is 1 week; Video to Recipe is 2.5 weeks.

---

#### **Group 8 — Revenue Optimization (partial cut)**

| Feature | Why Cut | When to Revisit |
|---------|---------|-----------------|
| **Smart Paywall Triggers (extra inline nudge)** — "Enjoying AI chat? X messages left today" | Group 7 already defines the four high-intent trigger moments; an additional inline nudge can be added in the same PR as AI chat | When AI Nutrition Assistant ships |

---

#### **Group 11 — Algorithm Optimization (partial cut)**

| Feature | Why Cut | When to Revisit |
|---------|---------|-----------------|
| **Dislike Reason Bottom Sheet** — 4-option tap to explain a recipe hide | High signal, low effort (~2 days); cut only to stay under 100h | First sprint after launch; this should be prioritized early |
| **Recipe Performance Ranking** — `qualityScore` updated daily from cook completions, saves, likes, views | Requires PostHog `recipe_cooked` event (Group 10) to be live and collecting data | After 2-4 weeks of PostHog data; the daily cron job is straightforward |
| **Caching Layer for Recommendations** — per-user home feed cached 15 min in Redis | Overlaps with Group 3 Redis setup; add this in the same session as Group 3 | Part of Group 3 implementation — wire up home feed cache at the same time |
| **Configurable weights via env** — scoring constants in `.env` for tuning without deploy | Useful for A/B experiments; not needed until PostHog data justifies tuning | When experiment data (Group 10) suggests weight changes are worth testing |
