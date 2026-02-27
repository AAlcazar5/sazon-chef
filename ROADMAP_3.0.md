# 🚀 **Sazon Chef - Roadmap 3.0: Growth, Monetization & Scale + Advanced Features**

*This roadmap covers two areas: (1) Advanced feature enhancements moved from [ROADMAP_2.0](ROADMAP_2.0.md), and (2) analytics, ML optimization, monetization, and scale preparation. Groups are ordered by feasibility — quick wins first, user-testing-dependent features last.*

---

## **Overview**

| Section | Focus Area | Priority Items |
|---------|------------|----------------|
| **Phase 1 — Polish & Quick Wins** | | |
| Group 1 | Smart Input ✅ | Voice input, barcode scanner, NLP parsing — cross-app |
| Group 2 | Shopping Intelligence | Nutrition awareness, smart suggestions, shared lists, budget |
| Group 3 | Cookbook & Cooking | Recipe import (URL/photo), cooking mode, smart collections, export |
| Group 4 | Smart Home Feed | Fridge mode, weather-aware, auto-personalized sections, accessibility |
| Group 5 | Smart Search | Semantic/voice/photo search, fuzzy matching, rich results |
| **Phase 2 — Core Infrastructure** | | |
| Group 6 | Infrastructure & Scaling | Database optimization, caching, CDN, monitoring |
| Group 7 | Meal Plan Advanced | AI generation, calendar sync, family planning, analytics |
| Group 8 | Profile Advanced | Health integrations, family profiles, security, GDPR |
| **Phase 3 — Growth & New Capabilities** | | |
| Group 9 | Growth & Marketing Features | Referrals, social sharing, viral loops |
| Group 10 | AI Nutrition Assistant | Chat interface, gap analysis, smart recommendations |
| Group 11 | Visual Capture Features | Nutrition by Photo, Video to Recipe import |
| **Phase 4 — Monetization** | | |
| Group 12 | Stripe Integration & Subscriptions | Payment processing, subscription tiers, paywalls |
| Group 13 | Revenue Optimization | Conversion funnels, pricing experiments, retention |
| **Phase 5 — Launch Prep** | | |
| Group 14 | App Store Launch Preparation | iOS/Android submission, ASO, compliance |
| **Phase 6 — Data & ML (requires live user data)** | | |
| Group 15 | Advanced Analytics Platform | User behavior tracking, funnel analysis, dashboards |
| Group 16 | Algorithm Optimization & ML | Performance analytics, A/B testing, ML recommendations |
| **Appendix** | | |
| Cut Features | Features Removed for Simplicity | Social, gamification, power-user config, analytics views, third-party integrations, content curation, advanced recipe mgmt |

---

*Phase 1 builds on the complete 2.0 refactoring (Shopping List, Cookbook, Home, Profile, Quick Actions, Search — all shipped). Features below are NET NEW only. Already-complete 2.0 features (Buy Again, In-Store UX, Offline, Ratings, Notes, Collections, Macro Filters, Mood-Based Recs, Search History/Autocomplete, etc.) are not repeated here.*

*Philosophy: The user sees simplicity. We handle complexity behind the scenes — auto-learning, smart defaults, AI-powered input. No configuration screens, no manual sorting, no power-user syntax.*

---

### **Group 1: Smart Input** 🎤 ✅ COMPLETE

*One cross-cutting capability: make it effortless to get things INTO the app. Voice, camera, and natural language — available everywhere.*

#### Voice Input ✅
* ✅ **Cross-App Voice** — Single voice engine powering: "Add chicken to shopping list", "Find me a quick pasta recipe", "Log 400 calories for lunch"
  * 📍 `expo-speech-recognition` + `useVoiceInput` hook + `voiceIntentParser.ts` → routes to shopping list, search, meal log
  * 📍 Voice UI: `VoiceMicButton`, `VoiceOverlay` (pulsing rings + mascot), `VoiceResultCard` (intent confirmation)
  * 📍 Graceful fallback when native module unavailable (Expo Go) — mic button hidden, no crash
* ✅ **Continuous Listening Mode** — Hold mic button for multiple items: "chicken breast, rice, broccoli, done"

#### Barcode Scanner ✅
* ✅ **Scan to Add** — Scan any product barcode → "Add to Shopping List" button adds to first list (or creates new one)
* ✅ **Scan to Search** — Scan ingredient → "Find Recipes" button navigates to home with search param
  * 📍 `expo-camera` barcode mode + Open Food Facts REST API (free, no key)

#### Smart Text Input ✅
* ✅ **NLP Parsing** — Type "milk, eggs, and a dozen oranges" → creates 3 separate items with correct quantities
  * 📍 `shoppingItemParser.ts` — pure TS utility with compound-item allowlist, quantity extraction, unit tests
  * 📍 Integrated into `AddItemModal` with multi-item hint + `addMultipleItems` in `useShoppingList`
* ✅ **Natural Language Search** — Type "quick chicken dinner under 30 minutes" → backend extracts filters (time, cuisine, dietary, difficulty, calories, protein, mood)
  * 📍 Backend: `intentParser.ts` (regex-first, two-pass extraction with explicit-over-implicit override) + `POST /api/search/natural`
  * 📍 Frontend: `searchApi.naturalLanguageSearch()` in `api.ts`

---

### **Group 2: Shopping Intelligence** 🛒

*The shopping list already works well (2.0). Now make it smarter — it should know what you need before you do.*

#### Nutrition Awareness
* **Cart Nutrition Summary** — Collapsible bar showing macro totals for the entire list. Sazon nudge: "Your cart is low on Vitamin C — add some oranges?"
  * 📍 Backend: `GET /api/shopping-lists/:id/nutrition-summary` (aggregate Spoonacular nutrition data per item)
* **Dietary Auto-Flag** — Items conflicting with user's dietary profile get a subtle warning badge. Tap → see why + suggested alternative. No blocking — just inform.

#### Smart Suggestions
* **"You usually buy..."** — Auto-suggest quantities based on household size + purchase history (e.g., always buys 2 gallons of milk)
* **Substitution Suggestions** — Item unavailable? Auto-suggest dietary-compatible alternatives based on the recipe context
* **Recipe Context** — Each item shows which recipe(s) need it. "Skip this? 2 recipes affected."

#### Shared Lists
* **Invite Link** — Tap share → generate link → anyone with link can view or edit. Real-time sync via WebSocket.
  * 📍 Database: `ShoppingListShare { id, listId, sharedWithUserId, permission, inviteCode }`
  * 📍 Backend: WebSocket room per list for real-time item updates

#### Budget
* **Simple Budget** — Set a weekly grocery budget. Running total shown inline. Yellow at 80%, red at 100%. That's it.
  * 📍 Database: `GroceryBudget { id, userId, weeklyLimit, createdAt }`

---

### **Group 3: Cookbook & Cooking** 📚

*Cookbook 2.0 shipped collections, notes, ratings, history, and offline. Now: get recipes in faster, cook them hands-free.*

#### Recipe Import
* **Import from URL** — Paste any recipe URL → AI extracts title, ingredients, instructions, photo. Supports all major recipe sites.
  * 📍 Backend: `POST /api/recipes/import-url` → scrape + AI cleanup (Claude Haiku for extraction)
* **Import from Photo** — Snap a photo of a recipe (book, magazine, handwritten) → OCR + AI structures it into a proper recipe
  * 📍 Backend: `POST /api/recipes/import-photo` → OCR (Tesseract or Cloud Vision) + AI cleanup

#### Smart Collections
* **Built-In Smart Collections** — Auto-generated, always up to date:
  * "Quick & Easy" (< 30 min), "High Protein" (> 30g), "Recently Saved", "Not Cooked Yet", "Top Rated", "Seasonal Picks"
  * No rules engine — we pick the right filters. User just sees organized collections that update themselves.

#### Cooking Mode 👨‍🍳
* **Hands-Free Cooking** — Full-screen step-by-step view. Large text, keep-awake, swipe or voice "Next step"
* **Smart Timers** — Auto-detected from recipe text ("bake for 25 minutes" → timer button appears). Multiple concurrent timers with notifications.
* **Ingredient Checklist** — Check off ingredients as you prep. Serving scaler adjusts quantities in real time.

#### Batch Operations
* **Multi-Select** — Long-press → select multiple → bulk move to collection, delete, or export as PDF
* **Export & Share** — Export single recipe or full collection as a beautiful PDF. Share recipe as an image card (Instagram/Pinterest-ready).

#### Auto-Discovery
* **Duplicate Detection** — Auto-warn when saving a recipe that looks similar to one already in cookbook. Option to merge.
* **"You Might Like"** — Based on your saved recipes, surface recommendations. Runs silently — no config needed.
* **Gap Analysis** — Periodic Sazon insight: "You have lots of dinner recipes but almost no breakfasts. Want me to suggest some?"

---

### **Group 4: Smart Home Feed** 🏠

*Home 2.0 shipped Recipe of the Day, macro filters, mood-based recs, and time-aware defaults. Now: make the feed adapt to your life.*

#### Contextual Discovery
* **"What's in Your Fridge?"** — Tap the fridge icon → add ingredients you have (text or barcode scan) → see recipes you can make now, sorted by fewest missing ingredients
  * 📍 Backend: `POST /api/recipes/by-ingredients` → Spoonacular findByIngredients + our scoring overlay
* **Weather-Aware** — Automatic, zero setup. Hot day → light salads and smoothies bubble up. Cold day → soups and stews. Rainy → baking ideas.
  * 📍 Backend: Weather API (OpenWeatherMap free tier) → adjust scoring weights silently
* **Leftover Mode** — "What can I make with last night's chicken?" Connect to meal plan history → suggest recipes using those ingredients.

#### Auto-Personalized Sections
* **"Because You Liked X"** — Explain WHY a recipe is recommended: "Because you loved Thai Basil Chicken"
* **Trending This Week** — Recipes popular across Sazon users. Social proof without a social network.
* **Seasonal Picks** — Auto-rotate based on month. Pumpkin in fall, berries in summer, hearty stews in winter.
* **"Cook Again?"** — Recipes you've made before and rated highly. One tap to add to this week's meal plan.
* **Auto-Learn Ordering** — Sections silently reorder based on which ones you tap most. No "Customize Home" screen needed.
* **Sazon Score Badges** — Recipe cards show `✨ High Value` or `🔥 Indulgent` badges driven by the user's active lens (see Group 16). No number — just a signal. The home feed feed can also be sorted by Sazon Score for a "most bang for your meal" view.
  * 📍 Frontend: add `sazonScore` + `sazonBadge` fields to recipe card component; badge renders conditionally in top-right corner

#### Ingredient Spotlight
* **Weekly Ingredient** — Rotating spotlight on one ingredient: nutrition facts, storage tips, 3 recipe suggestions using it. Educational without being heavy.

#### Accessibility ♿
* **Screen Reader** — Full VoiceOver (iOS) and TalkBack (Android) support. Meaningful labels, logical tab order.
* **Visual** — Respect Dynamic Type, support reduced motion, high-contrast mode, color-blind-friendly palette.
* **Motor** — Minimum 44pt touch targets everywhere, disable swipe gestures option, one-handed mode.

---

### **Group 5: Smart Search** 🔍

*Search 2.0 shipped history, autocomplete, instant search, and scope selector. Now: understand what users MEAN, not just what they type.*

#### AI-Powered Understanding
* **Semantic Search** — "Comfort food" → hearty stews and mac & cheese. "Date night" → impressive but not too hard. "Kid-friendly" → mild, fun shapes. No special syntax.
  * 📍 Backend: Embed recipes + queries with lightweight embedding model → cosine similarity ranking
* **Fuzzy Matching** — Typos handled automatically. "chiken parmasan" → Chicken Parmesan. "Did you mean...?" only when ambiguous.
* **Personalized Ranking** — Results silently boosted by your preferences, dietary profile, and past behavior. Two users searching "pasta" see different top results.

#### Voice & Photo Search
* **Voice Search** — Microphone button in search bar. Speak naturally → transcribed → searched. Uses same engine as Group 1.
* **Photo Search** — Take a photo of a dish (at a restaurant, in a magazine) → find similar recipes. Powered by Spoonacular visual similarity.
  * 📍 Backend: `POST /api/search/by-photo` → image analysis → keyword extraction → recipe matching

#### Better Results
* **Faceted Counts** — "Found 42 results: 18 dinner, 12 lunch, 7 snack, 5 breakfast" — tap to filter instantly
* **Rich Previews** — Search dropdown shows image + cook time + match % + macro highlights. Decide before tapping.
* **Saved Searches** — Star a search to save the query + filters. Quick access from search screen. Max 10, auto-managed.
* **Smart No Results** — Never a dead end. Show: similar searches, relax one filter, or "Generate a recipe for this?"
* **Sort by Sazon Score** — Added to sort options alongside Relevance, Cook Time, Rating. Surfaces the highest flavor-per-calorie results first for the user's active lens. Powered by Group 16 scoring system.
  * 📍 Frontend: add `sazonScore` sort option to search results sort picker; backend already returns `sazonScore` in recipe response

---

### **Group 6: Infrastructure & Scaling** 🏗️

*Infrastructure should be invisible. Users never think about it — but they feel it when it breaks. Rule: instrument first, optimize when numbers demand it. Don't pre-optimize for scale you don't have yet.*

#### Security (Non-Negotiable) 🔒
* **Rate Limiting** — Per-user and per-endpoint limits; tier-based (free vs Premium). Prevent abuse and runaway AI costs.
  * 📍 Backend: `express-rate-limit` middleware, tiered by subscription status
* **Input Validation & Sanitization** — All user inputs validated server-side. SQL injection and XSS prevention via Prisma parameterized queries + helmet.js security headers.
  * 📍 Backend: `helmet` + `zod` schema validation on all routes
* **CORS Configuration** — Lock down to known app origins only. No wildcard in production.
* **DDoS Protection** — Cloudflare free tier in front of the API server. Bot detection on auth endpoints.

#### Caching (High Impact, Low Effort) ⚡
* **Redis via Upstash** — Serverless Redis (zero infra to manage). Cache recipe feeds, recommendation results, and subscription status checks. TTL-based invalidation — no event bus complexity.
  * 📍 Backend: `ioredis` client + cache middleware wrapping expensive endpoints
  * Cache targets: home feed (5 min TTL), recipe search results (2 min TTL), user subscription status (10 min TTL)
* **Image Performance** — Cloudinary already integrated for item photos. Extend to recipe images: auto WebP conversion, responsive sizes, lazy load on scroll.
  * 📍 Frontend: `expo-image` with `contentFit="cover"` and `cachePolicy="memory-disk"` (already used — just ensure consistency across app)

#### Monitoring (Know Before Users Do) 👀
* **Error Tracking** — Sentry for both backend (Node) and frontend (Expo/React Native). Alert on new error types and spike in error rate. Zero config after install.
  * 📍 `@sentry/node` + `@sentry/react-native`
* **Health Check Endpoint** — `GET /api/health` returns DB status, cache status, and response time. Used by uptime monitor.
  * 📍 Backend: Single endpoint, plain JSON, no auth required
* **Uptime Monitoring** — BetterUptime or UptimeRobot (free tier) pings `/api/health` every 60s. Alerts via Slack/email on downtime.

#### Deployment & CI/CD 🚀
* **GitHub Actions Pipeline** — On push to `main`: run tests → build → deploy to production. On PR: run tests only. No manual deploys.
  * 📍 `.github/workflows/deploy.yml`
* **Staging Environment** — Mirror of production. All PRs deployed to staging first. Test Stripe webhooks, push notifications, and AI integrations against real services.
* **Secrets Management** — All env vars in GitHub Secrets and production host env. Never in code. `.env.example` documents required vars.

#### Database (Optimize What You Have) 🗄️
* **Indexes on Hot Queries** — Add indexes for the queries that run on every page load: recipe lookups by userId, meal plan by userId+weekStart, shopping list by userId.
  * 📍 Prisma schema: `@@index([userId])` on all user-scoped models
* **Backup** — Automated daily database backups to cloud storage. Retention: 7 days. Test restore quarterly.
  * 📍 Simple cron job dumping SQLite → S3/Cloudflare R2

---

### **Group 7: Meal Plan Advanced** 📅

*The meal plan screen exists. Templates, swaps, recurring meals, and AI generation stubs are already built (2.0). Now make it genuinely intelligent — the user picks a goal and the app does the week for them.*

#### AI-Powered Plan Generation 🤖

*This is the central feature of the meal planning experience. A user should never have to stare at a blank week and manually fill in 21 slots. They set a goal, tap Generate, and get a complete, personalized week.*

* **"Plan My Week" button** — Single tap generates a full 7-day plan. Behind the scenes: pulls user's macro goals + dietary restrictions + cooking skill level + time availability + pantry contents → sends a structured prompt to Claude → returns a full week of meals matched to saved recipes in the user's cookbook + Spoonacular fallbacks for gaps.
  * 📍 Backend: Complete TODO in `mealPlanController.ts:249` — this function stub already exists, just needs the AI call and meal-slot population logic
  * 📍 Prompt strategy: structured JSON output (`{ monday: { breakfast: recipeId, lunch: recipeId, dinner: recipeId }, ... }`), Claude Haiku for speed/cost, with fallback to Sonnet on complex dietary combos
  * 📍 Variety enforcement: no repeated recipes in same week, balance across cuisine types
* **Goal-Based Modes** — Simple selector: Cut / Maintain / Build. No macro math required from the user. Selecting a mode silently adjusts macro targets in all generated plans and suggestions.
  * 📍 Database: `planningMode` field on `MealPlan` (`cut | maintain | build`)
* **Regenerate Single Day** — Tap any day header → "Regenerate this day" → replaces just that day's meals without touching the rest of the week. For when Monday's plan is great but Thursday looks wrong.
* **"Surprised Me" Indicator** — When AI places a recipe the user has never cooked, it gets a subtle ✨ badge. Encourages trying new things without forcing it.

#### Ingredient Intelligence 🧠

*The highest-value thing a meal planner can do invisibly: make sure every ingredient you buy gets used. Waste nothing.*

* **Leftover Tracking** — Any recipe tagged as "makes leftovers" automatically suggests those leftovers as a meal the next day. No manual entry — the plan does it for you. User can dismiss or keep.
  * 📍 Database: `makesLeftovers: boolean` on recipes + `leftoverSourceMealId` on meal slots
* **Ingredient Overlap Optimization** — When generating a plan, the AI scores candidate recipes partly on shared ingredients with other meals that week. "These 4 dinners all use chicken and spinach — buy once, use across the week." Displayed as a shopping list insight: "Your plan is ingredient-efficient this week 🎯"
* **Batch Cooking Suggestions** — Identify 2-3 recipes in the week that can be prepped together (same protein, same base). Surface as: "Sunday prep: cook once for 3 meals this week." Tap to see which meals + what to prep.

#### Smart Suggestions (Always On) ✨
* **Pantry-First** — If a pantry item is about to expire, the AI biases toward recipes that use it. User just sees "good timing" — they don't know why.
* **Time-Aware Slots** — Short on time Wednesday? (User sets daily cooking time in Profile, Group 8) → AI auto-fills Wednesday with recipes under that time limit. No decisions required.
* **"Based on Last Week"** — If user completed > 50% of last week's plan, AI models what worked and leans into similar meals. Low completion → suggests simpler, faster recipes next week.

#### Flexible Scheduling ⏰
* **Meal Time + Cook Reminder** — Set a meal time (e.g., dinner at 7pm). App calculates start time from recipe cook time and sends a notification: "Start dinner now to eat at 7." Simple, practical, zero calendar permissions required.
  * 📍 Frontend: time picker on meal slot → calculate `mealTime - cookTime` → schedule local push notification
* **Flexible Slots** — Skip a meal (intermittent fasting support), combine lunch + dinner (brunch), or mark a day as "eating out." These slots show as neutral/empty, don't affect macro totals for that day, and don't generate shopping list items.

#### Week View Polish 🗓️
* **Compact Week Overview** — Full 7-day strip at the top of the screen showing macro balance per day as a simple colored bar (green = on target, yellow = off, red = way off). Tap any day to jump to it.
* **Better Empty State** — First time opening meal plan: Sazon mascot with "Let me plan your week — takes 10 seconds." One tap → Goal Mode selector → Generate. No blank grid, no intimidation.

---

### **Group 8: Profile Advanced** 👤

*Profile is the app's nervous system — it powers every recommendation, every filter, every suggestion. The more the profile knows about the user, the less they have to think. But profile setup should feel like a conversation, not a form.*

#### Dietary Preferences — The Safety Layer 🛡️

*This is the most under-appreciated feature set in the app. A user with a peanut allergy or celiac disease needs to trust that Sazon never surfaces unsafe recipes. This isn't a nice-to-have — it's the foundation every other feature is built on.*

* **Severity Levels** — For each dietary restriction, two modes: **Strict** (never show, never suggest, flag in shopping list) vs **Prefer to avoid** (can be surfaced with a "contains X" warning). This single distinction prevents the app from being either over-restrictive or dangerous.
  * 📍 Database: `DietaryRestriction { type, severity: 'strict' | 'prefer_avoid' }` on User
* **Life-Threatening Allergy Flag** — Separate checkbox for anaphylactic allergens. When flagged, the app adds a persistent warning banner on any recipe that might contain a cross-contamination risk, even if the allergen isn't a listed ingredient.
* **Propagation** — Dietary settings flow silently everywhere: recipe scoring, home feed, AI-generated meal plans, shopping list compliance checks (Group 2), AI nutrition chat (Group 10). Set it once, protected everywhere.

#### Cooking Context — Powers the Whole App 🍳

*These three preferences have a disproportionate impact on recommendation quality. They let the app filter 90% of irrelevant recipes before the user ever sees them.*

* **Cooking Skill Level** — Beginner / Home Cook / Confident / Chef. Affects recipe difficulty scoring, which results rank highest, and how the AI phrases instructions ("dice the onion" vs "brunoise the shallot"). Not a badge — just a filter that works silently.
  * 📍 `skillLevel` on User → passed into scoring weight for `difficulty` field
* **Kitchen Equipment** — Checklist of appliances: stovetop, oven, microwave, air fryer, instant pot, stand mixer, blender, grill. Recipes requiring equipment the user doesn't have get deprioritized — not hidden entirely, but ranked lower and badged with "Needs: Air Fryer." One-time setup during onboarding.
  * 📍 Database: `UserEquipment { userId, equipment: string[] }` — stored as JSON array
  * 📍 Scoring: recipes with unowned required equipment get -20% score penalty
* **Daily Cooking Time** — Per-day time budget: "Weekdays: 20 min max. Weekends: no limit." This feeds directly into meal plan generation (Group 7) — weekday slots auto-filter to quick recipes. No decisions required in the moment.
  * 📍 Database: `cookingTimePrefs: { weekday: number, weekend: number }` on User profile
  * 📍 Used in: meal plan AI prompt, home feed sorting, search result ranking

#### Health Sync (One-Way, Zero Friction) ⚖️
* **Weight from Apple Health / Google Fit** — Read-only sync of body weight. On opening the profile, Sazon silently checks for a new weight reading. No prompts, no manual entry. The number just updates.
  * 📍 iOS: `react-native-health` HealthKit read permission for `HKQuantityTypeIdentifierBodyMass`
  * 📍 Android: Google Fit `body.weight` read scope
  * 📍 No write-back — Sazon doesn't push nutrition data back to Health apps (too complex, out of scope)
* **Macro Adjustment for Activity** — If Health sync shows > 10,000 steps today, Sazon quietly adds ~200 cal to today's macro target. One sentence in the meal log: "Active day — targets adjusted." Nothing more.

#### Smart Notifications 🔔
* **Contextual, Not Noisy** — Notifications fire when genuinely useful, not on a schedule. Examples: "You haven't planned next week yet — want me to generate one?" (Thursday evening). "Chicken thighs expire tomorrow — here are 3 recipes." "Shopping day: your list is ready."
  * 📍 Backend: rule-based notification triggers, not a scheduler loop
* **Granular Controls** — Per-category toggles (meal reminders, shopping reminders, Sazon insights, weekly summaries) + quiet hours + weekend-off option. All in one clean screen.
* **No Streak Notifications** — Deliberately not added. Pressure to maintain a streak is anxiety-inducing. Sazon celebrates, never guilts.

#### Security 🔐
* **Two-Factor Auth (TOTP)** — Google Authenticator / Authy. Setup in Profile > Security. Recovery codes generated on enrollment.
  * 📍 Backend: `speakeasy` for TOTP generation + validation
* **Active Sessions** — See devices + last active + location (IP-based). "Log out everywhere" button. Simple table, no complex session management UI.
* **Biometric Lock** — Face ID / Touch ID to open the app. Optional. Uses `expo-local-authentication`.

#### Privacy & Data 📋
* **GDPR / Data Export** — "Download my data" → async job → email with ZIP containing all user data as JSON + human-readable PDF. Required by law for EU users.
  * 📍 Backend: `POST /api/user/export-data` → queue job → send email with download link
* **Delete Account** — Hard delete. 30-day grace period. All data purged from DB and backups after grace period. No dark patterns.
* **Local-Only Mode** — Toggle to disable all cloud sync. Recipes, meal plans, and shopping lists stored device-only. For privacy-sensitive users. Clearly labeled as "no backup if you lose your phone."

#### AI Nutrition Insights Preview 🤖
* **Weekly Eating Summary** — Every Sunday, a one-paragraph Sazon insight: "This week you hit your protein goal 5/7 days. Your weakest day was Wednesday — dinner was under 800 calories. Here's a quick fix for next week." Generated by Claude Haiku on the backend, pushed as a notification.
  * 📍 This is a lightweight preview of the full AI Nutrition Assistant (Group 10). Same backend infrastructure, smaller scope.
  * 📍 Backend: cron job Sunday 8pm → pull user's week of meal log → Claude Haiku prompt → push notification + in-app card

---

### **Group 9: Growth & Marketing** 📈

*Growth doesn't come from growth features — it comes from an app people love enough to tell others about. These features reduce the friction between "I love this" and "I told someone about it." Keep the surface area small: one referral mechanism, one share action, notifications that earn their place, emails that are actually useful.*

#### Referral Program 🤝
*Simple and complete: unique link → share → both parties get 1 free Premium month. That's the entire feature.*

* **Unique invite link** per user — copy to clipboard or share via native share sheet (iOS/Android OS share dialog handles the rest: iMessage, WhatsApp, Instagram, anywhere)
  * 📍 Database: `Referral { id, referrerId, refereeId, code, status, convertedAt, rewardAppliedAt }`
  * 📍 Backend: `GET /api/referral/link` → returns or creates invite code; `POST /api/referral/redeem` → called on new user signup with code
* **Rewards** — Referrer gets 1 free Premium month when referee completes 7 days. Referee gets 14-day trial extension. Applied automatically, no redemption UI needed.
* **Referral count in Profile** — "You've referred 3 friends" displayed under account settings. Simple, no full dashboard.

#### Recipe Sharing 📲
*Every shared recipe is a potential install. The share button should be everywhere, the result should look great, and new users clicking the link should land somewhere that converts.*

* **Share as image card** — "Share Recipe" button on any recipe → generates a beautiful branded card (recipe photo + title + key macros + Sazon logo). Powered by the same export built in Group 3.
  * 📍 Frontend: `expo-sharing` + `react-native-view-shot` to capture the recipe card as an image
* **Deep link** — Every recipe has a shareable URL: `sazon.app/r/:recipeId`. For existing users: opens recipe in app. For new users: shows a web preview with OG tags (recipe photo, title, description) → App Store install link.
  * 📍 Backend: `GET /r/:id` → serve HTML with OG meta tags for social unfurls (no login required)
  * 📍 Frontend: `expo-linking` handles deep link → navigates to recipe on open

#### Push Notifications 📬
*Push notifications are the primary re-engagement mechanism — but only if they're worth opening. The rule: fire on condition, not on schedule. Every notification should feel like a useful tip from a friend, not a reminder from an app trying to keep metrics up.*

* **Infrastructure** — Expo Push Notifications + Firebase Cloud Messaging (FCM) for delivery. Device token registered silently on first login.
  * 📍 Backend: `POST /api/notifications/register-token` → upsert `PushToken { userId, token, platform, updatedAt }`
  * 📍 Backend: `notificationService.ts` — single service that all triggers call

* **Useful triggers (condition-based, not scheduled):**

  | Trigger | Condition | Message |
  |---------|-----------|---------|
  | Plan reminder | Thursday evening, no plan for next week | "Want me to plan next week? Takes 10 seconds." |
  | Expiry alert | Item in shopping list marked with expiry in < 2 days | "Chicken thighs expire soon — here are 3 quick recipes." |
  | List ready | Meal plan generation creates a shopping list | "Your shopping list is ready — 12 items." |
  | Trial ending | 3 days before trial expiration | "Your free trial ends in 3 days — keep access to [feature]." |
  | Weekly digest | Sunday morning, if user was active that week | "Your week at a glance — tap to see your nutrition summary." |

* **Granular opt-out** — Per-type toggle in Profile > Notifications (already in Group 8). Quiet hours respected. No notification fires during 10pm–8am.

#### Email 📧
*Transactional emails are non-negotiable before launch. Lifecycle emails are the highest-ROI marketing channel that requires zero ongoing effort once set up.*

* **Transactional (must ship before launch):**
  * Password reset, email verification, payment receipt, subscription change/cancellation
  * 📍 Backend: Resend (simpler API than SendGrid, better deliverability, generous free tier)
  * 📍 Templates: React Email — component-based, version-controlled, easy to update

* **Lifecycle (set up once, run forever):**
  * **Day 0 — Welcome** — One email. What Sazon does, one screenshot, one CTA: "Plan your first week →"
  * **Day 3 — Feature nudge** — If no meal plan created: "Here's how to get a week planned in 10 seconds." If plan exists: "Have you tried asking Sazon for recipe ideas?"
  * **Day 7 — Weekly digest** — 3 personalized recipe suggestions based on their profile. Opt-out link prominent.
  * **Day 14 (inactive only)** — Re-engagement: "You haven't been back in a while. Here's what's new." One email, then silence — no guilt loop.
  * 📍 Backend: send triggers on user events (signup, plan creation) + cron for weekly digest

---

### **Group 10: AI Nutrition Assistant** 🤖💬

*An AI-powered assistant for chatting about meal history, nutrition insights, and personalized recommendations.*

#### AI Provider Strategy & Costs 💰

**Primary Model: Claude Haiku 4.5** ($1/$5 per MTok input/output)
* Best cost-quality ratio for food/nutrition domain
* Use prompt caching (90% savings on system prompt — cache hits at $0.10/MTok)
* Streaming responses for real-time mobile UX
* Estimated cost: ~$3/month per 1,000 active users (5 conversations/user/day)

**Complex Requests: Claude Sonnet 4.6** ($3/$15 per MTok)
* Route ~20% of requests: meal plan generation, detailed "what if" analysis, recipe creation
* Model routing logic in backend based on query classification

**Fallback: Gemini 2.5 Flash** ($0.30/$2.50 per MTok)
* Auto-fallback if Anthropic API is unavailable
* Leverage existing multi-provider orchestration in `aiProviders/`

**Cost Optimization:**
1. **Prompt caching** — Cache system prompt + user preferences (1,500 tokens); cache hits at 0.1x cost
2. **Conversation summarization** — Keep last 5 turns full, summarize older turns into a single context message
3. **Model routing** — Classify queries: simple Q&A → Haiku, complex generation → Sonnet
4. **Pre-compute locally** — Nutrition calculations, macro totals, history lookups done server-side before calling AI
5. **Rate limiting** — 20 messages/user/day (free tier), 50/day (premium)
6. **Batch API** — Use for non-real-time tasks (weekly digest, proactive insights) at 50% discount

**Monthly cost projections (Haiku + cached, 80% cache hit rate):**

| Active Users | Est. Cost | Per-User Cost |
|-------------|-----------|---------------|
| 100 | ~$0.30 | $0.003 |
| 1,000 | ~$3 | $0.003 |
| 10,000 | ~$30 | $0.003 |
| 100,000 | ~$300 | $0.003 |

**API Rate Limits (Anthropic Tier 1 → Tier 4):**
* Haiku: 50 → 4,000 RPM; 50K → 4M input tokens/min
* Tier advancement: automatic based on spend ($0 → $500 → $1K → $5K thresholds)

---

#### Core Chat Interface 💬 — Priority: HIGH
* 🔄 **AI Chat Screen** — Conversational UI with Sazon mascot, typing indicators, accessible via FAB/profile
  * 📍 Frontend: New `/chat` screen with `react-native-gifted-chat` or custom chat UI
  * 📍 Chat bubble design: Sazon mascot avatar for AI, user avatar for user
  * 📍 Streaming text display with typing indicator animation
* 🔄 **Natural Language** — "How can I add more fiber?", "What am I eating too much of?", "Show protein this week"
* 🔄 **Contextual Responses** — AI analyzes actual meal history, references specific meals
  * 📍 Backend: Pre-fetch user's meal history + macros, inject into prompt context
* 🔄 **Quick Action Chips** — "Analyze my week", "Find gaps", "Suggest recipes", "What should I eat?"
  * 📍 Frontend: Tappable suggestion chips above keyboard
* 🔄 **Structured Responses** — AI returns JSON for rich cards (recipe cards, macro charts, meal plan blocks)
  * 📍 Frontend: Parse AI tool calls into native UI components

**System Prompt Architecture:**
```
[CACHED — 1,500 tokens, 5-min TTL]
- Role: Sazon, a friendly nutrition coach and recipe expert
- Personality: Encouraging, knowledgeable, uses food emoji sparingly
- Constraints: Not medical advice, accurate nutrition data only
- Available tools: searchRecipes, getNutritionData, getMealHistory, suggestMealPlan
- Output: Concise mobile-friendly responses (max 200 words unless asked for detail)

[DYNAMIC — per request]
- User preferences: dietary restrictions, fitness goals, macro targets
- Today's meals so far (pre-computed server-side)
- Remaining macros for the day
- Last 5 conversation turns
```

#### Nutritional Gap Analysis 📊 — Priority: HIGH
* 🔄 **"What Am I Missing?"** — Detect deficient nutrients, compare to daily values
  * 📍 Backend: `GET /api/nutrition/gaps` — compute from meal history, no AI needed
* 🔄 **Macro Trends** — Visual charts over time, identify patterns
  * 📍 Frontend: Line/bar charts using `react-native-chart-kit` or `victory-native`
* 🔄 **Ingredient Frequency** — Most-eaten ingredients, over-reliance detection
  * 📍 Backend: Aggregate from `MealHistory` + `RecipeIngredient` joins
* 🔄 **Dietary Balance Score** — Weekly/monthly rating (variety, nutrients, macros)
  * 📍 Backend: Computed score, cached per user per day

#### Smart Recommendations 🍽️ — Priority: HIGH
* 🔄 **Gap-Filling Recipes** — "5 recipes to hit your iron goals"
  * 📍 Backend: Filter recipes by nutrient content, rank by gap-filling potential
* 🔄 **"More Like This"** — Similar to past favorites from history
  * 📍 Backend: Use existing scoring system with taste profile
* 🔄 **Complement Suggestions** — "What to eat for dinner to balance today?"
  * 📍 Backend: Calculate remaining macros, find best-fit recipes
* 🔄 **Avoid Repetition** — Detect patterns, suggest new recipes in preferred cuisines

#### Health Goals 🎯 — Priority: MEDIUM
* 🔄 **Goal Progress** — "Am I on track for weight loss?", meal-goal correlation
* 🔄 **"What If" Scenarios** — Simulate dietary changes, project impact (route to Sonnet)
* 🔄 **Plans from Chat** — "Create a high-protein plan", one-tap apply to meal plan (route to Sonnet)

#### Meal History 🔍 — Priority: MEDIUM
* 🔄 **Search Past Meals** — "When did I last eat salmon?", "What did I eat Tuesday?" — natural language queries against meal log, returned as inline results in chat.
  * 📍 Backend: Full-text search on `MealHistory`, return as tool call result (no separate history screen needed — the chat IS the interface)
* 🔄 **Recipe Recall** — "That chicken recipe with lemon sauce I made last month?" → returns matching recipe from saved + cooked history

#### Proactive Insights 💡 — Priority: LOW
* 🔄 **Daily Summary** — End-of-day notification with nutrition recap
  * 📍 Backend: Scheduled job, use **Batch API** (50% discount) for AI summaries
* 🔄 **Weekly Digest** — AI report: trends, wins, improvements, next-week recs
  * 📍 Backend: Weekly cron, Batch API, push notification with summary
* 🔄 **Smart Alerts** — "Red meat 5 days in a row", "Great protein streak!"
  * 📍 Backend: Rule-based (no AI needed), pattern detection on meal history
* 🔄 **Seasonal** — "Winter → more Vitamin D", seasonal ingredient tips

#### Voice & Privacy — Priority: LOW
* 🔄 **Voice Chat** — Speak questions hands-free while cooking. Uses same voice engine as Group 1 (Smart Input) — no separate STT infrastructure needed.
  * 📍 Frontend: mic button in `ChatInput.tsx` → `expo-av` recording → same transcription pipeline as Group 1
* 🔄 **Data Transparency** — "What data do you know about me?" → tool call returns a plain-English summary of the user's stored preferences, history, and goals. Trust-building, simple to implement.
* 🔄 **Conversation History** — Conversations saved and listable. Auto-delete after 30 days (privacy default). User can manually delete any conversation.

#### Technical Implementation

**Database Models:**
```prisma
model ChatConversation {
  id        String   @id @default(uuid())
  userId    String
  title     String?  // Auto-generated from first message
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages  ChatMessage[]
  user      User     @relation(fields: [userId], references: [id])
  @@index([userId, updatedAt])
  @@map("chat_conversations")
}

model ChatMessage {
  id             String   @id @default(uuid())
  conversationId String
  role           String   // 'user' | 'assistant'
  content        String   // Text content
  toolCalls      String?  // JSON: structured data (recipe cards, charts)
  tokenCount     Int?     // Track usage
  model          String?  // 'haiku-4.5' | 'sonnet-4.6' | 'gemini-flash'
  createdAt      DateTime @default(now())
  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  @@index([conversationId, createdAt])
  @@map("chat_messages")
}
```

**API Endpoints:**
* `POST /api/chat/message` — Send message, receive streamed response (SSE)
* `GET /api/chat/conversations` — List user's conversations (paginated)
* `GET /api/chat/conversations/:id` — Get conversation with messages
* `DELETE /api/chat/conversations/:id` — Delete conversation
* `GET /api/nutrition/gaps` — Pre-computed nutrition gaps (no AI)
* `GET /api/nutrition/trends` — Macro trends over time (no AI)

**Backend Service Architecture:**
```
chatService.ts
├── classifyQuery(message)        → 'simple' | 'complex' (determines model)
├── buildContext(userId)           → user prefs, today's meals, remaining macros
├── buildSystemPrompt(context)     → cached system prompt + dynamic context
├── summarizeHistory(messages)     → compress old turns to save tokens
├── streamResponse(prompt, model)  → SSE stream to frontend
└── parseToolCalls(response)       → extract recipe cards, charts, actions

chatController.ts
├── POST /message   → classifyQuery → buildContext → streamResponse
├── GET /history    → paginated conversation list
└── DELETE /:id     → soft delete conversation
```

**Frontend Components:**
```
frontend/app/chat.tsx              — Main chat screen
frontend/components/chat/
├── ChatBubble.tsx                 — Message bubble (user/assistant variants)
├── ChatInput.tsx                  — Text input + voice button + send
├── QuickActionChips.tsx           — Suggestion chips ("Analyze my week", etc.)
├── RecipeCardMessage.tsx          — Rich recipe card rendered from tool call
├── MacroChartMessage.tsx          — Inline chart rendered from tool call
├── TypingIndicator.tsx            — Sazon mascot thinking animation
└── ConversationList.tsx           — Past conversations screen
frontend/hooks/
└── useChat.ts                     — WebSocket/SSE connection, message state, streaming
```

**Implementation Phases:**

**Phase 1 (MVP — 1-2 weeks):** Core chat with Haiku, text-only, 5-turn history, quick action chips, basic streaming
**Phase 2 (Rich responses — 1 week):** Tool calls for recipe cards and macro charts, model routing (Haiku/Sonnet)
**Phase 3 (Nutrition analysis — 1 week):** Gap analysis endpoint, trends endpoint, proactive daily summary
**Phase 4 (Polish — 1 week):** Conversation history, prompt caching, Gemini fallback, voice input
**Phase 5 (Visual input — see Group 11):** Photo-in-chat for "What's in this dish?" macro estimates (Nutrition by Photo integration)

---

### **Group 11: Visual Capture Features** 📸

*The best interface is no interface — let the camera do the data entry.*

*Leverage Spoonacular's visual API capabilities to capture nutrition and recipes through photos and videos. The user points and taps; Sazon handles extraction, estimation, and logging. No form-filling, no manual search.*

---

#### **Nutrition by Photo** 🍽️

*Send a photo of any dish to get macro nutrition estimates powered by Spoonacular's visual analysis.*

##### Core Flow
* **"Log Meal by Photo"** quick action — camera icon opens directly to photo capture or library picker
* Photo submitted to Spoonacular analyze endpoint → returns estimated calories, protein, fat, carbs + recognized dish name
* Results shown as a nutrition summary card with Sazon "chef-kiss" mascot state on success
* User can adjust portion size slider post-estimate (0.5x – 3x) to scale macros proportionally
* Tap "Log This" → saves to meal log with source `photo` tag; "Try Again" re-opens camera

##### UI Details
* **Confidence Indicator** — Low/Medium/High confidence badge alongside estimated macros
  * Low: "These are rough estimates based on what I can see — adjust as needed"
  * High: recognized dish with high confidence, fewer caveats
* **Portion Awareness** — Brief onboarding tip on first use: "Place your plate in good lighting for best accuracy"
* **Edit Before Logging** — Editable macro fields before confirming log, in case estimates are off

##### Meal Log Integration
* Logged photo meals appear in meal log with a 📸 badge
* Photo thumbnail shown alongside the log entry
* Daily nutrition totals include photo-logged meals seamlessly

##### AI Chat Integration (see Group 10 Phase 5)
* In the nutrition chat, attach a photo to a message: "What are the macros in this?" → inline nutrition card response
* Chat maintains context: "Make it lighter" → suggests recipe alternatives

##### Backend
* 📍 `POST /api/nutrition/analyze-photo` — accepts image URL or base64, calls Spoonacular, returns macro estimate
* 📍 `MealLogPhoto` model: `{ id, userId, mealLogId, photoUrl, estimatedCalories, estimatedProtein, estimatedFat, estimatedCarbs, confidence, portionMultiplier, createdAt }`
* Rate limiting: Spoonacular visual analysis is expensive — limit to 10/day on free tier, unlimited on Premium

##### Edge Cases
* Blurry / unrecognized photo → friendly error with Sazon "thinking" mascot: "I can see something delicious but I'm not sure what it is! Try a clearer shot."
* Multiple items on plate → returns aggregate estimate, not per-item breakdown (note this to users)
* Drinks / beverages in frame → handled but less accurate; prompt user to log separately

---

#### **Video to Recipe** 🎬

*Extract a full recipe from a cooking video on TikTok, YouTube, Instagram, Facebook Reels, or Pinterest using Spoonacular's `extractFromVideo` parameter.*

##### Core Flow
1. **Share Sheet Trigger** — User shares a video URL from TikTok/YouTube/Instagram/Reels/Pinterest to Sazon via the OS share sheet
2. Sazon receives the URL and begins async extraction job (`extractFromVideo: true`)
3. **Processing UX (~30s)** — Sazon shows the "thinking" mascot animation with progress steps:
   * "Fetching video..." → "Analyzing ingredients..." → "Extracting instructions..." → "Finishing up..."
4. On success → recipe card preview shown for review before saving to Cookbook
5. User can edit name, ingredients, and instructions before confirming save
6. Recipe saved with `source: 'video'` and a **"From Video" badge** in Cookbook

##### Supported Platforms
* TikTok, YouTube (incl. Shorts), Instagram Reels, Facebook Reels, Pinterest videos
* Unsupported URL → clear error: "This link type isn't supported yet. Try TikTok, YouTube, or Instagram."

##### In-App Entry Points
* **Quick Actions** — "Import from Video" action in the expanded Quick Actions library
* **Cookbook header** — "+" menu includes "Import from Video" option
* **Share sheet** — Primary entry point via iOS/Android OS share extension

##### Premium Gating
* Video to Recipe is a **Premium-only feature** (expensive Spoonacular quota)
* Free users see a teaser: "Import recipes from TikTok & YouTube videos — available with Sazon Premium"
* Premium users get a generous monthly quota (e.g., 20 extractions/month), shown in profile

##### Cookbook Integration
* **"From Video" badge** — Subtle badge on recipe cards imported via video
* **Source attribution** — Original video URL stored and shown: "Source: TikTok · @creator_name"
* Tap source link → opens original video in browser for reference while cooking
* Imported recipes fully editable, just like any saved recipe

##### Technical Notes
* **Async job pattern** — Video extraction takes ~30s; use a background job (polling or WebSocket push)
* **Push notification** — "Your recipe is ready! 🎉" notification when extraction completes if user navigated away
* 📍 `POST /api/recipes/extract-from-video` — accepts `{ videoUrl }`, queues Spoonacular call, returns `jobId`
* 📍 `GET /api/recipes/extract-from-video/:jobId` — returns job status + result when complete
* 📍 `RecipeImportJob` model: `{ id, userId, videoUrl, status (pending/processing/complete/failed), recipeId, createdAt }`
* `extractFromVideo: true` passed as parameter to Spoonacular extract endpoint
* **Quota tracking** — Track per-user monthly extraction count; enforce Premium limit

##### Edge Cases
* Video with no spoken/visible recipe → "I watched the whole video but couldn't find a clear recipe. It might be a vlog or product review."
* Private/expired video link → "This video isn't publicly accessible. Make sure the link is set to public."
* Very long video (>30 min) → warn before extraction: "This is a long video — extraction may take a bit longer."
* Duplicate detection → "This looks like a recipe you've already saved. Save anyway?"

---

**Implementation Order:**

**Phase 1 (Nutrition by Photo — 1 week):** Backend endpoint + analyze photo flow + meal log integration + confidence UI
**Phase 2 (Chat integration — 1 day):** Wire photo attachment into AI chat (Group 10 Phase 5)
**Phase 3 (Video to Recipe MVP — 1.5 weeks):** Share sheet handler + async job + processing UX + Cookbook save
**Phase 4 (Premium gating + polish — 3 days):** Quota limits, Premium paywall, "From Video" badge, source attribution, push notification

---

### **Group 12: Stripe Integration & Subscription Paywall** 💳

*Payments are infrastructure, not a feature — get them right once, keep them invisible forever. The user should never have to think about billing. Ship Free + Premium only; a Pro tier is a second product that distracts from making the first one great.*

---

#### **Two Tiers Only**

| | Free | Premium ($9.99/mo · $79.99/yr) |
|---|---|---|
| Recipes | 20 saved | Unlimited |
| Meal plans | Current week | Any horizon |
| Shopping lists | 1 | Unlimited |
| AI chat (Group 10) | 10 messages/day | Unlimited |
| Nutrition by Photo (Group 11) | 3/day | 10/day |
| Video to Recipe (Group 11) | — | 20/month |
| AI Meal Plan Generation (Group 7) | — | ✓ |

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

#### **Transactional Emails** (via Resend — already in Group 8)

* Welcome to Premium + receipt confirmation
* Trial ending: 3 days out + 1 day out
* Payment failed: with direct link to update card (Stripe Portal URL)
* Subscription cancelled: confirmation + "Resume anytime" CTA

---

#### **Feature Gating: API Middleware**

* 🔄 `requirePremium` middleware — checks `subscriptionStatus` on auth token, returns `402` with `{ error: "PREMIUM_REQUIRED", upgradeUrl: "/paywall" }` for gated endpoints
* 🔄 Rate limiting by tier — free tier AI chat capped at 10 messages/day via Redis counter (same Upstash instance from Group 6)
* 🔄 Grace period — `past_due` users retain Premium access for 7 days before downgrade, giving payment retries time to succeed

---

#### **Implementation Phases**

**Phase 1 (Core plumbing — 1 week):** Stripe SDK + customer creation + schema + webhook handler + checkout/portal redirect
**Phase 2 (Frontend — 1 week):** Paywall screen + `useSubscription` hook + `PremiumGate` + trial countdown banner
**Phase 3 (Gating — 3 days):** `requirePremium` middleware + rate limiting + in-app paywall triggers
**Phase 4 (Emails — 2 days):** Trial warning + payment failed + cancellation confirmation templates

---

### **Group 13: Revenue Optimization** 💵

*Optimization before you have data is just guessing. Ship Group 12, get 50 paying users, then optimize what's actually broken. Group 13 is three fundamentals — everything else is premature.*

---

#### **1. Smart Paywall Triggers**

*The best paywall appears exactly when the user feels the limitation — not before, not after.*

The four moments that convert (already listed in Group 12 frontend section) are:
1. Hitting the recipe save limit
2. Trial expiry
3. Tapping AI Meal Plan Generation
4. Tapping Video to Recipe

**One additional trigger:** After the user's first successful AI chat response, show a subtle inline message (not a modal): *"Enjoying AI chat? You have X messages left today on the free plan."* This communicates scarcity without interrupting.

**What not to do:** Time-based triggers ("you've been using Sazon for 7 days!"), random session triggers, or showing the paywall during onboarding. Paywalls at the wrong moment create resentment, not conversion.

---

#### **2. Cancellation Off-Ramp**

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

#### **3. Payment Failure Recovery (Dunning)**

*Stripe Billing's built-in dunning handles 80% of this automatically — don't rebuild it.*

* Enable **Smart Retries** in Stripe Billing dashboard — Stripe ML picks optimal retry timing (typically recovers ~30% of failed payments automatically)
* Configure retry schedule: +1 day → +3 days → +7 days → downgrade
* Set 7-day grace period (already in Group 12 middleware)
* Transactional email on first failure: "Your payment didn't go through — update your card in one tap" (Stripe Portal link, already in Group 12 emails)

**That's it.** No custom dunning service, no churn prediction ML model, no re-engagement campaigns. Stripe's automation handles it; the email handles the rest. Build custom dunning logic only if Smart Retries + emails fail to recover >15% of churned revenue at scale.

---

#### **Implementation**

All Group 13 work is frontend-only (cancellation flow) + Stripe dashboard config (dunning) + one API endpoint (`/api/subscriptions/cancel`). Estimated: **3 days total.**
### **Group 14: App Store Launch Preparation** 📱

*Launching is not a feature — it's a gate. Everything in this group is non-negotiable for submission approval. Nothing in this group makes the product better for users; it makes the product visible to them. Do it once, do it right, don't over-engineer it.*

---

#### **The Critical Insight: RevenueCat Replaces Three Separate Implementations**

Before writing a line of code, integrate [RevenueCat](https://revenuecat.com). It handles:
- **StoreKit** (iOS in-app purchases) — no manual StoreKit implementation
- **Google Play Billing** (Android in-app purchases) — no manual GP Billing implementation
- **Receipt validation** — no backend receipt verification code
- **Cross-platform subscription status** — one `GET /api/subscriptions/status`-equivalent SDK call
- **Webhooks to your backend** — single RevenueCat webhook, not separate Apple + Google server notifications

The Stripe integration in Group 12 handles web payments and backend subscription state. RevenueCat bridges mobile store billing into that same state via its webhook → your backend sync. The two coexist: Stripe for web, RevenueCat for iOS/Android.

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
### **Group 15: Analytics** 📊

*Don't build what you can install. PostHog is open-source, has a generous free tier, and ships everything in Group 15's original scope — event tracking, funnels, cohorts, session recording, feature flags, A/B experiments — in a single SDK install. RevenueCat (Group 14) already covers revenue metrics. Sentry (Group 6) already covers crashes. There is no analytics infrastructure left to build.*

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
* **Crashes & errors** — Sentry (Group 6): crash-free session rate, error rate by endpoint, p99 API latency. No custom implementation needed.
* **Subscription funnels** — PostHog + RevenueCat webhook events: track `subscription_started`, `trial_converted`, `subscription_cancelled` as PostHog events for funnel analysis alongside product behavior.

---

### **Group 16: Algorithm Optimization & Machine Learning** 🧠

*The existing rule-based scoring system is already good. The goal of this group is to make it smarter with real user signals — not to replace it with a black-box ML model that needs thousands of users to train on. Start with the highest-signal improvements; graduate to ML only when the data volume justifies it.*

---

#### **Sazon Score — Flavor Density Scoring** ✨

*A recipe that's 7/10 flavor at 300 cal is a better use of a meal than 9/10 at 550 cal. The Sazon Score makes that judgment for the user, invisibly. They just see which recipes are "worth it."*

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
* "Sort by: Sazon Score" added to search + home feed sort options (see Group 5)
* Recipe detail page: one line — "Sazon Score 8.4 · Flavor 7/10 · 300 cal"

**User Lens Preference (one setting, Profile):**
* "Optimize recipes for: [Calories ✓ | Protein | Time | Budget | Nutrients]"
* Defaults to user's Goal Mode: Cut → Calories, Build → Protein, Maintain → Calories
* Only the calorie lens is implemented in this phase — the others are in the appendix (see Sazon Score Advanced Lenses)
  * 📍 `User.sazonLens: 'calorie' | 'protein' | 'time' | 'budget' | 'nutrient'` — calorie is the only active one for now, others stored for forward compatibility

---

#### **Feedback Loop — Dislike Signal** 📝

*A thumbs-down without context is noise. A thumbs-down with one tap of context is a training signal.*

When a user dislikes or hides a recipe, show a bottom sheet with 4 options (single-tap, no typing):
* "Wrong cuisine for me"
* "Too many calories"
* "Ingredients I don't have"
* "Just not my taste"

That single tap feeds directly into the behavioral scoring boost: recipes with consistent "wrong cuisine" signals from this user get their cuisine-match weight reduced. "Too many calories" → tighten the macro window. "Just not my taste" → increases the weight of user ratings vs Spoonacular taste profile.

📍 `frontend/components/recipe/DislikeReasonSheet.tsx` — bottom sheet, 4 options
📍 `POST /api/recipes/:id/feedback` — stores reason, triggers async scoring adjustment
📍 `DislikeFeedback` model: `{ userId, recipeId, reason, createdAt }`

---

#### **Recipe Performance Ranking** 📈

*Surface recipes that users actually cook, not just save. Cook completions (from Group 15's `recipe_cooked` event) are the ground truth.*

Maintain a `qualityScore` per recipe, updated daily:
```ts
qualityScore = (
  cookCompletions * 3.0 +   // highest signal: they cooked it
  saves          * 1.5 +   // saved to cookbook
  likes          * 1.0 +   // liked
  views          * 0.1     // weak signal: just looked
) / max(daysSinceAdded, 7)  // recency-normalize, floor at 7 days
```

Recipes with rising `qualityScore` get a small boost in home feed ranking. Recipes with consistently low scores (many views, few saves/cooks) get deprioritized.

📍 `backend/src/jobs/updateRecipeQualityScores.ts` — daily cron, batch update
📍 `Recipe.qualityScore` column — indexed for sort
📍 `GET /api/recipes/trending` — returns top-quality-score recipes for home feed "Trending" section

---

#### **Scoring System Cleanup** 🔧

*The scoring system works. Make it testable and maintainable before the Sazon Score lands on top of it.*

* 🔄 **Unit tests for all scoring components** — `optimizedScoring.test.ts`: test macro match weights, behavioral boost thresholds, Sazon Score formula edge cases (0-cal recipe, missing taste profile, cold-start user). Target: 100% branch coverage on scoring logic.
* 🔄 **Consolidate scoring entry point** — ensure all recommendation paths (home feed, search, meal plan generation) go through the same `computeFinalScore()` function. Currently there are divergent paths that apply different subsets of the boost system.
* 🔄 **Configurable weights via env** — move scoring weight constants (`MACRO_WEIGHT`, `SAZON_WEIGHT`, boost multipliers) to `.env` / config table so they can be tuned without a deploy. Useful for the PostHog A/B experiments that test different weight combinations.

---

#### **Caching Layer for Recommendations** ⚡

*(Overlaps with Group 6 Upstash Redis — implement together)*

* Cache each user's home feed result for 15 minutes (TTL). Invalidate on: preference change, new recipe added to DB, explicit refresh pull-down.
* Cache recipe `qualityScore` rankings for 24 hours (updated by daily cron).
* Cache Spoonacular taste profile per recipe indefinitely (it doesn't change).

📍 All caching via Upstash Redis (Group 6) — no new infrastructure

---

#### **Implementation Order**

**Phase 1 (1 week):** PostHog install + 3 custom events + Sazon Score formula + scoring unit tests
**Phase 2 (3 days):** Dislike reason sheet + feedback endpoint + scoring adjustment
**Phase 3 (3 days):** Recipe quality score job + Trending section + caching layer

## **Appendix: Cut Features — Revisit Later** 🗃️

*These features were removed during the Phase 1 lean-out under the principle "simplicity is the ultimate form of sophistication." They aren't bad ideas — they just require either a larger user base, more backend infrastructure, or a UI complexity budget we haven't earned yet. Revisit each when the condition listed under "When to Revisit" is met.*

*Rule for re-adding any feature: if the user has to read a tooltip to understand it, it's not ready yet.*

---

### **1. Social & Community** 👥

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Follow Users / Friends' Collections | Group 3 (Cookbook) | No user base yet — a social graph with 50 users is a ghost town |
| Share Collections (public links) | Group 3 (Cookbook) | Requires content moderation, public URL infrastructure, abuse handling |
| Collaboration (invite contributors, permissions) | Group 3 (Cookbook) | Permission levels + conflict resolution is a product in itself |
| Activity Feed (who cooked what, recipe recs from friends) | Group 4 (Home) | Requires social graph, notification infra, and enough DAUs to feel alive |
| "Share to Home" (friends push recipes to your feed) | Group 4 (Home) | Same as above — empty feeds kill engagement faster than no feed |
| Recipe Reviews & "I Made This" | Group 4 (Home) | UGC moderation overhead; better as a later trust-building feature |
| Share What I'm Cooking (Quick Action) | Group 1 (Quick Actions) | No destination to share to yet |

**Why these feel premature:** Social features live or die by network density. With a small early user base, an empty activity feed is worse than no feed at all. The app needs to be valuable solo first.

**How to revisit with simplicity in mind:** Don't build a social network. Instead, start with *one* passive social signal that requires zero effort from the user — e.g., "47 Sazon users saved this recipe this week." No following, no feeds, no profiles. If that drives engagement, layer in opt-in sharing next. Full social graph last.

---

### **2. Gamification** 🎮

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Cooking Streaks | Group 4 (Home) | Streaks punish users who miss a day — creates anxiety, not joy |
| Weekly Challenges ("Try 3 new cuisines") | Group 4 (Home) | Requires content curation team to keep challenges fresh and meaningful |
| Achievements & Badges | Group 4 (Home) | Badge inflation devalues the system quickly; needs careful calibration |
| Stats Dashboard (total cooked, consistency calendar) | Group 4 (Home) | Interesting but not decision-driving — users don't cook more because of a graph |

**Why these feel premature:** Gamification works when the core loop is already habit-forming. Adding streaks before the app is sticky creates churn (users quit when they break a streak). The cooking loop needs to be intrinsically rewarding first.

**How to revisit with simplicity in mind:** Start with *one* low-stakes signal — e.g., a subtle "🔥 12 recipes cooked" count on the profile. No streaks, no pressure. If users care about it (tap it, share it), build from there. If they don't, the signal was vanity. Gamification earns its way in; it doesn't get bolted on.

---

### **3. Power-User Input & Configuration** ⚙️

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Boolean Search Operators (AND, OR, NOT) | Group 5 (Search) | 0.1% of users use this; 99.9% are confused by it |
| Category Syntax Shortcuts (`cuisine:italian`, `time:<30`) | Group 5 (Search) | Developer UX, not user UX — NLP should handle this transparently |
| Visual Query Builder (drag-and-drop filters) | Group 5 (Search) | More complex than the problem it solves — existing filter chips work |
| Customizable Quick Actions (choose 6 from 15+ pool) | Group 1 (Quick Actions) | Configuration is a tax on the user — auto-learn what they use instead |
| FAB Position / Mini FAB / Radial Menu | Group 1 (Quick Actions) | Three different menus for one button is UX debt, not UX richness |
| Gesture Shortcuts (swipe to open camera, etc.) | Groups 1 & 4 | Undiscoverable by default; adds cognitive load to learn |
| "Customize Home" screen | Group 4 (Home) | Manual curation is a fallback when personalization fails — fix the algo instead |
| Drag-to-Reorder Quick Actions | Group 1 (Quick Actions) | If the system auto-ranks correctly, nobody needs to reorder |

**Why these feel premature:** Configuration is what you add when you can't make a good default decision. Every config screen is an admission that the product doesn't know its user well enough yet.

**How to revisit with simplicity in mind:** If auto-learning fails for a specific user, surface a *single* correction mechanism — not a full config screen. E.g., "Not what you were looking for? Tell Sazon" → one-tap signal. The goal is to make the AI smarter, not to hand the wheel to the user.

---

### **4. Analytics & Data Views** 📊

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Price History & Trend Graphs | Group 2 (Shopping) | Requires consistent price data over time — noisy and misleading early on |
| Category Spending Breakdown | Group 2 (Shopping) | Interesting insight but not actionable without a budget feature maturity first |
| Cooking Stats / Consistency Calendar | Group 4 (Home) | Pretty but not decision-driving in early stages |
| Photo Feed (chronological cooking photos) | Group 3 (Cookbook) | Personal photo archive with no social layer is a gallery app |
| Search Analytics Dashboard | Group 5 (Search) | Internal tooling — belongs in Group 15/16, not Phase 1 |

**Why these feel premature:** Data views need data. Trend graphs with 3 data points mislead. Category spending with $0 history is empty. These features compound in value over time — they're not Day 1 features.

**How to revisit with simplicity in mind:** Add data passively in the background now (record prices, log cooking events, track searches) so the data exists when these views are built. When launching, show the insight without the chart first — "You've saved $23 this month vs. your average" is more useful than a graph. If users ask "how?", then add the graph.

---

### **5. Third-Party Integrations** 🔌

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Instacart / Walmart / Kroger OAuth Sync | Group 2 (Shopping) | Each integration is a full engineering project; APIs change constantly |
| Multi-Store Splitting & Price Comparison | Group 2 (Shopping) | Dependent on real-time inventory data — expensive and brittle |
| Store-Specific Lists | Group 2 (Shopping) | Niche feature requiring store layout data that varies by location |
| Receipt OCR / Scan to Extract Prices | Group 1 (Quick Actions) | OCR quality is inconsistent; bad results erode trust faster than no feature |
| Apple Health / Google Fit Full Sync | Group 8 (Profile) | Full sync scope is large; partial sync confuses users more than it helps |

**Why these feel premature:** Third-party integrations are adoption multipliers, not acquisition drivers. Build them when users are asking for them, not before.

**How to revisit with simplicity in mind:** Pick *one* integration that covers the most users with the least effort. Instacart has the largest footprint — start with an "Add to Instacart" button on the shopping list (deep link, no OAuth required). No sync, no bidirectional updates. One button. If users tap it, build deeper. If they don't, move on.

---

### **6. Content Curation Features** 📚

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Cuisine Journey (guided starter → advanced) | Group 4 (Home) | Requires ongoing content curation and curriculum design — a staffing commitment |
| Technique Tutorials (skill-based progression) | Group 4 (Home) | Same — video/step-by-step tutorial content is expensive to produce and maintain |
| Dietary Deep Dives ("Keto starter pack", etc.) | Group 4 (Home) | Curated collections go stale; dietary trends shift; needs a curator |
| Ingredient Spotlight (full deep dive format) | Group 4 (Home) | Simplified to a weekly rotating card — full editorial format is a content play |

**Why these feel premature:** These are content products masquerading as features. They require writers, editors, and regular updates. A startup should not commit to a content calendar before product-market fit.

**How to revisit with simplicity in mind:** Use AI to generate this content on demand rather than curating it manually. "Tell me about sumac" → Claude gives a one-paragraph ingredient spotlight with storage tips and 3 recipe ideas. No editorial team needed. If users love it, consider a curated "Editor's Pick" once a month — not a full curriculum.

---

### **7. Advanced Recipe Management** ✏️

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Recipe Versioning (change history, restore) | Group 3 (Cookbook) | Git for recipes — impressive in demos, rarely used in practice |
| Substitution Tracking (record swaps, rate success) | Group 3 (Cookbook) | Logging overhead outweighs value for most users |
| Recipe Comparison (side-by-side view) | Group 3 (Cookbook) | Niche decision-support feature; most users just tap and try |
| Collection Backup / JSON Export | Group 3 (Cookbook) | Power-user escape hatch — useful but not urgent |

**Why these feel premature:** These serve a "recipe power user" persona that likely represents < 5% of users. They also add UI surface area that the other 95% has to navigate past.

**How to revisit with simplicity in mind:** Recipe versioning can be invisible — auto-save a snapshot when a user edits a recipe (like Google Docs auto-history). No UI needed until someone wants to restore. Surface it as: "This recipe was edited 3 days ago — restore original?" only when relevant. The feature exists; the UI is hidden until needed.


---

## **Phase 2 Cut Features** 🗃️

*Cut during Phase 2 lean-out. Same rule applies: if you're adding it back, ask whether the user sees simplicity or complexity. If they see complexity, it's not ready.*

---

### **8. Infrastructure Over-Engineering** ⚙️

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Read Replicas | Group 6 | Premature — only needed when you have read-heavy traffic at scale |
| Blue-Green Deployments | Group 6 | Ops complexity without a dedicated DevOps person is a liability |
| Geographic CDN / Edge Caching | Group 6 | Meaningful only with a globally distributed user base |
| Data Archival & Retention Policies | Group 6 | No data volume problem yet — this is a future compliance concern |
| Feature Flag-Based Rollback | Group 6 | A `git revert` and redeploy is faster and simpler at this scale |
| Database Migration to PlanetScale/Neon | Group 6 | SQLite + Prisma handles current load; migrate when you hit actual limits |
| Cache Warming Strategies | Group 6 | Premature optimization — measure cache miss rates first |
| Status Page | Group 6 | Useful at scale; with a small user base, a tweet is faster |

**Why these feel premature:** Every infrastructure decision has a maintenance cost. Complexity that protects against a problem you don't have yet is just debt. Instrument first — Sentry + uptime monitoring will tell you what actually needs fixing.

**How to revisit with simplicity in mind:** Let the metrics lead. When Sentry shows a specific slow query, optimize that query. When uptime monitor shows a specific endpoint failing under load, add caching there. Reactive optimization beats speculative architecture every time at early stage. Graduate to managed DB, CDN, and read replicas when a real bottleneck appears — not before.

---

### **9. Calendar Integration** 📆

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Google / Apple Calendar Sync | Group 7 (Meal Plan) | Calendar OAuth is complex; permissions feel invasive to users |
| Busy Day Detection via Calendar | Group 7 (Meal Plan) | Requires calendar read access — high privacy friction for marginal gain |
| Shopping Day Reminders via Calendar | Group 7 (Meal Plan) | Notification-based reminders achieve the same result with zero permissions |

**Why these feel premature:** Requesting calendar access is a significant trust ask — it's the kind of permission that makes users wonder "why does a recipe app need my calendar?" The gain (auto-detecting busy days) doesn't justify the permission friction.

**How to revisit with simplicity in mind:** Achieve the same outcome without the permission. "What are your busy days?" → simple day-of-week toggle in Profile (no calendar needed). Sazon already knows cooking time preferences per day (Group 8) — that's enough to surface quick recipes on busy days. If users explicitly request calendar sync, add it as an opt-in power feature at that point.

---

### **10. Family & Household Features** 👨‍👩‍👧‍👦

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Household Member Profiles (per-person macros/restrictions) | Groups 7 & 8 | A full household profile system is a separate product layer |
| Per-Person Portion Scaling | Group 7 | Depends on household profiles existing first |
| "Everyone Can Eat This" Filter | Group 8 | Depends on household profiles + aggregate restriction logic |
| Kids' Profiles & Kid-Friendly Filtering | Group 7 | Niche early on; also requires content tagging for kid-appropriate recipes |
| Family Collaborative Meal Planning | Group 7 | Real-time collaborative editing with conflict resolution is complex |

**Why these feel premature:** Household features require a user to add and maintain profiles for every family member — that's onboarding overhead most users won't complete. And a half-implemented household feature (e.g., "Everyone can eat this" that misses one person's allergy) is worse than no feature at all.

**How to revisit with simplicity in mind:** Start with household *size*, not household *members*. Asking "How many people do you cook for?" at onboarding is one question, takes 2 seconds, and immediately improves portion suggestions. No profiles needed. When users actively request per-person dietary handling (measure this via support tickets and reviews), build household profiles properly — with a polished onboarding flow, not as a settings screen.

---

### **11. Body Tracking & Fitness Wearables** 💪

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Body Measurements (waist, chest, hips, etc.) | Group 8 | Fitness tracker territory — not a natural extension of a recipe app |
| Progress Photos with Timeline | Group 8 | Privacy-sensitive, high storage cost, competes with dedicated apps |
| Weight Goal with Projected Completion Date | Group 8 | Clinical feel; the projection math creates false precision |
| Fitbit / Garmin / Whoop Integration | Group 8 | Each is a full engineering project; niche overlap with Sazon's core user |

**Why these feel premature:** Sazon is a cooking and nutrition app. Body measurement tracking and progress photos put it in direct competition with MyFitnessPal and Cronometer — apps that have years of head start in that space. The risk: trying to do everything and being excellent at nothing.

**How to revisit with simplicity in mind:** The one-way weight sync from Apple Health / Google Fit (kept in Group 8) covers the most valuable part of this space — knowing the user's current weight to calculate accurate macro targets. That's enough. If users want body measurement tracking, let them use a dedicated app and import their weight into Sazon via Health sync. Don't build what Apple Health already built.

---

### **12. Meal Plan Analytics & Optimization Views** 📊

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Variety Scoring (score the week on diversity) | Group 7 | Interesting metric, not action-driving — users don't know what to do with a variety score |
| Micronutrient Tracking & Weekly Trends | Group 7 | Micronutrient data is noisy and anxiety-inducing without clinical context |
| Cost Per Calorie / Budget vs Actual Tracking | Group 7 | Overlaps with Group 2's budget feature — redundant, and cost-per-calorie is off-putting |
| Completion Rate Trends & Streak Tracking | Group 7 | Streak tracking cut across the board (gamification appendix section 2) |
| "Cheat Meal" Planning & Auto-Adjustment | Group 7 | Over-medicalized language; creates a guilty/innocent framing around food |

**Why these feel premature:** Data views need data — and enough of it to be meaningful. A variety score after 2 weeks of use is noise. Micronutrient trends require months of logging to surface patterns. These features also medicalise the experience in a way that conflicts with the core philosophy: Sazon should make cooking feel joyful, not like a spreadsheet.

**How to revisit with simplicity in mind:** Surface insights through the AI Nutrition Assistant (Group 10) instead of raw data views. "You've been eating the same 5 dinners for 3 weeks — want me to mix it up?" is more useful than a variety score. The insight is the same; the experience is completely different. Let the AI hold the complexity so the user sees a conversation, not a dashboard.

---

### **13. Profile Vanity & Power-User Features** 🪞

| Feature | Where Cut | Why Cut |
|---------|-----------|---------|
| Data Dashboard (activity heatmap, usage stats) | Group 8 | Vanity metrics — interesting to look at, not useful for decision-making |
| Import from MyFitnessPal / CSV | Group 8 | High effort, low usage — most users won't migrate historical data |
| Seasonal Goals ("Summer cut", "Winter bulk") | Group 8 | Thin wrapper over the existing goal system; not worth UI space |
| Personalized Tips (learn from dismissed tips) | Group 8 | Tip engine that learns is a ML project in itself |
| Ingredient Discovery Toggle ("Try new ingredients" badge) | Group 8 | The AI already surfaces new recipes naturally; the toggle adds UI for what's already happening |
| Account Linking / Multiple Auth Providers | Group 8 | Edge case (< 1% of users); complex account-merge logic |
| Shopping Preferences (preferred stores, organic/brand) | Group 8 | Useful but niche; hard to act on without real inventory data |

**Why these feel premature:** Profile settings have a cost — every option the user sees is a decision they have to make. Preferences that don't measurably improve recommendations aren't worth showing. These features add perceived thoroughness without adding real value.

**How to revisit with simplicity in mind:** Before adding a preference, ask: "Does this preference change anything the user actually sees?" If yes and the change is meaningful, add it. If it's cosmetic or the logic to act on it doesn't exist yet, skip it. The rule of thumb: preferences should have exactly one job in the app, and that job should be obvious.


---

### **14. Sazon Score — Advanced Lenses & Full Personalization** ✨

*The calorie lens (Group 16) is the low-hanging fruit. These are the medium and hard extensions — each adds a new dimension of "worth it" that different user types care about. Same formula, different divisor. Revisit once the core calorie lens is shipped and validated.*

#### Medium Complexity

| Feature | Complexity | Why deferred |
|---------|-----------|--------------|
| **Additional Lenses** — Protein-first, Time-efficient, Budget-friendly, Nutrient-dense | Medium | Formulae are identical to calorie lens; deferred to validate the concept first |
| **Community Flavor Score** — Aggregate user ratings as middle-tier flavor source | Medium | Needs a minimum vote threshold logic + Bayesian smoothing to avoid noisy averages from 1–2 ratings |
| **Sazon Score on Recipe Detail Page** — Full breakdown card: "Score 8.4 · Flavor 7/10 · 300 cal · top 15% for your lens" | Medium | UI only — depends on core scoring being stable first |
| **Score Invalidation on Rating** — When user rates a recipe, their personal `sazonScore` for it updates immediately, cache busted | Medium | Cache invalidation logic across Redis + in-memory feed results |
| **Lens Auto-Switch with Goal Mode** — Switching Cut/Build/Maintain in meal plan (Group 7) silently updates the active Sazon lens | Medium | Requires event linkage between meal plan goal state and scoring preferences |

**How to implement each lens** (once core calorie lens is live):

```ts
// Protein-first: reward high protein per flavor point
divisor = 1 / (proteinG / 30)   // 30g = reference protein for a meal
// → high-protein recipes score higher for same flavor

// Time-efficient: penalize long cook times
divisor = cookMinutes / 30       // 30 min = reference baseline
// → a 7/10 meal in 20 min beats a 9/10 meal in 60 min

// Budget-friendly: Spoonacular pricePerServing (in cents)
divisor = pricePerServing / 500  // $5.00 = reference baseline
// → note: Spoonacular price data is unreliable — validate before shipping

// Nutrient-dense: multiply flavor by a micronutrient completeness bonus
nutrientBonus = (vitaminCount + mineralCount) / totalNutrients  // 0–1
sazonScore = (flavorScore * (1 + nutrientBonus * 0.3)) / (calories / 400)
// → rewards nutritional completeness on top of flavor density
```

#### Hard Complexity

| Feature | Complexity | Why deferred |
|---------|-----------|--------------|
| **Cold-Start Accuracy Improvement** — For new users with no ratings, the Spoonacular taste profile is the only flavor signal. It systematically underscores complex dishes and overscores fatty/salty ones. Improve by training a correction layer on accumulated user ratings. | Hard | Requires enough rating data (thousands of pairs) to train a meaningful correction model |
| **Per-User Taste Profile Learning** — Over time, learn that this user consistently rates spicy/bitter dishes higher than the Spoonacular model predicts. Build a personal flavor correction multiplier per taste dimension. | Hard | Full personalization pipeline: collect rating → compare to model prediction → update per-user taste weights |
| **Sazon Score A/B Testing** — Run controlled experiments: does showing Sazon Score badges increase recipe cook rate? Does sorting by Sazon Score improve weekly plan completion? Measure causal impact, not just correlation. | Hard | Requires A/B testing infrastructure (Group 16 ML section) and sufficient user volume for statistical significance |
| **Cross-Meal Sazon Score** — Score a full day's eating plan, not just individual recipes. A day where every meal is "High Value" is better than one outlier high-flavor indulgence. Useful for meal plan generation (Group 7) — optimize the week, not just each slot. | Hard | Requires modeling meal interactions (e.g., a light lunch makes a moderate dinner "worth it") — multi-meal optimization problem |

**Why the calorie lens alone is worth shipping first:**
The other lenses are multiplicatively more useful — but only if users engage with the concept at all. Ship the calorie lens, watch whether users sort by it and whether it correlates with recipe completion. If the signal is there, the other lenses are fast follow-ons. If users ignore it, the concept needs rethinking before investing in the full system.

---

### **15. Phase 3 Cuts — Growth, AI Assistant & Visual Capture** 🚀

*Features removed during the Phase 3 lean-out (Groups 9–11). The Growth group skews toward social mechanics that require a user base to feel alive. The AI group had features that add backend surface area without proportional user value at this stage. Visual Capture was already lean; one prompt was removed for breaking the zero-friction flow.*

#### From Group 9 — Growth & Marketing

| Feature | Why Cut |
|---------|---------|
| **Tiered referral rewards** — Bronze/Silver/Gold levels, unlocks at 3/5/10 referrals | Reward tiers require tuning, edge-case handling (fraud, refunds, attribution windows), and a user base large enough that the tiers feel achievable |
| **QR code referral links** — Physical QR for restaurant/gym flyering | Premature distribution channel; a digital referral link does the same job for the same audience right now |
| **Viral loops / public collections** — Browse trending collections, community recipe walls, UGC discovery | No user base = empty walls. A UGC surface with 50 users actively damages first impressions |
| **Achievement sharing** — Share badges and milestones to Instagram/Twitter/Facebook | Achievements require a gamification system (cut in Appendix Section 2); can't share something that doesn't exist yet |
| **ML-based notification timing** — Per-user optimal send-time prediction, A/B frequency experiments | Over-engineered for current scale; condition-based triggers (low stock, dinner time, plan day) outperform ML timing until volume is there to train on |
| **Meal plan public sharing** — Share your week's meal plan as a public link or to social | Requires public URL infrastructure, moderation, and a reason for others to care — earned after social graph exists |

**How to revisit:** Growth mechanics layer in naturally. Start with the referral link (shipped). When referrals generate ≥100 sign-ups/month, add a simple reward (one free premium month). When premium has ≥1,000 users, evaluate whether tiers or community surfaces move the needle. Each layer earns the next.

---

#### From Group 10 — AI Nutrition Assistant

| Feature | Why Cut |
|---------|---------|
| **History Timeline** — Visual calendar showing chat activity over time; tap a day to revisit old conversations | Interesting, but zero decision value — users revisit conversations to get an answer, not to browse their chat history like a diary |
| **On-Device AI Processing** — Privacy mode using local models (Phi-3, Llama via `react-native-llm`) for no-server nutrition chat | Massive engineering overhead: model download size (~2–4 GB), device compatibility matrix, inference speed on older hardware. Privacy benefit exists but is premature — establish trust first, then offer it as a toggle |

**How to revisit:** Conversation history is fine to ship as a flat list (already planned). A *calendar view* adds chrome without function — revisit if user research shows people wanting to browse history chronologically. On-device processing is a strong privacy promise — evaluate when user surveys surface privacy as a top concern, or when a competitor makes it a differentiator.

---

#### From Group 11 — Visual Capture

| Feature | Why Cut |
|---------|---------|
| **Restaurant Mode prompt** — After photo analysis: "Is this from a restaurant?" prompt to attach a restaurant name | Breaks the zero-tap logging flow. If the user wants to note a restaurant, they can edit the log entry afterward. A proactive prompt adds friction to the 90% of cases where it's irrelevant |

**How to revisit:** If restaurant-tagged meals become a meaningful segment in user data (detectable from AI chat context, location data, or explicit user input), surface the association passively — don't ask, infer. E.g., "Looks like this might be from a restaurant — want to add a note?" *after* the meal is already logged, as a non-blocking nudge.

---

### **16. Phase 4 Cuts — Stripe & Revenue Optimization** 💳

*Features removed from Groups 12–13 during the Phase 4 lean-out. Group 12 had a Pro tier that's a second product, not a feature, and an overbuilt billing UI that Stripe's hosted tools already provide. Group 13 was almost entirely premature optimization — churn prediction, A/B paywall tests, re-engagement campaigns, and loyalty programs all require a paying user base to be meaningful.*

#### From Group 12 — Stripe & Subscription

| Feature | Why Cut |
|---------|---------|
| **Pro Tier** ($19.99/mo — family sharing, API access, custom recipe DB, white-label) | A Pro tier is a separate product targeting a different buyer. Shipping it before Premium is validated splits attention without proportional revenue upside. Revisit when Premium has ≥500 paying users. |
| **Custom payment method management screens** (add card, list cards, remove card, set default, 3DS) | Stripe Customer Portal handles all of this. Building custom card management screens means maintaining PCI-adjacent UI for no user benefit — Stripe's portal is polished and trusted. |
| **Invoice download & custom invoice emails** | Stripe sends payment receipts automatically. Invoice PDFs and custom invoice templates are accountant-level features most consumers never use. Stripe's dashboard covers any edge cases. |
| **A/B pricing experiments framework** | A/B testing prices requires volume (~200+ conversions per variant for significance). Pre-launch A/B testing produces noise, not signal. Pick a price, ship it, move on. |
| **Regional pricing** | Valid concept, significant complexity (currency display, tax rules, purchasing power parity). Revisit after launch in primary market. |
| **Promotion code UI in paywall** | Stripe Checkout natively supports promo codes — user just enters it in the hosted checkout page. No frontend code needed. |
| **Trial extension for engaged users** | Manual trial extension is an ops task, not a product feature. Handle via Stripe dashboard one-off until it's a repeating pattern worth automating. |

**How to revisit Pro tier:** When Premium MRR is stable and you see power users repeatedly asking for features beyond Premium scope (family sharing, API, bulk tools), that's the signal. Build the most-requested Pro feature first as a one-off premium add-on before committing to a full Pro tier.

---

#### From Group 13 — Revenue Optimization

| Feature | Why Cut |
|---------|---------|
| **Churn prediction model** (ML on declining usage signals) | Requires months of retention data and enough churned users to train on. A regression model trained on 50 cancellations is not predictive. |
| **Paywall A/B testing framework** | Same issue as pricing experiments — needs volume. Default to best-practice paywall design (single CTA, annual toggle, benefit statement) and iterate manually. |
| **Re-engagement campaigns** ("What's new" emails, push for dormant users) | Legitimate feature but belongs in Group 9 (Marketing), where condition-based push is already planned. Separate re-engagement "campaigns" imply a content calendar and a user base large enough to segment. |
| **Win-back automation** (post-cancellation discount offers, "we miss you" emails) | Automated win-back sequences require email tooling (Resend sequences, not transactional), suppression lists, and enough churned volume to justify the setup cost. A manual "reply to this email" approach covers it initially. |
| **Loyalty program** (rewards for long-term subscribers, anniversary gifts) | Loyalty programs that aren't tied to a referral or social mechanic are expensive and retention-neutral at small scale. The goal is to make the app so good they don't want to leave — not to bribe them to stay. |
| **Upsell to Pro** (Premium → Pro prompts, family plan promotion) | No Pro tier = no upsell. See above. |
| **Annual plan upsell to existing monthly subscribers** | Valid tactic. Easy to add: a single in-app message 30 days after a monthly subscription ("Save 33% — switch to annual"). Deferred because it requires a cohort of monthly subscribers to exist first. |

**How to revisit:** Track three metrics post-launch: trial-to-paid conversion rate, monthly churn rate, and 90-day retention. If conversion <10%, the paywall or product is the problem — optimize those first. If churn >5%/month, investigate the top cancellation survey reason (Group 13 already captures this) and fix that problem. Only after both are stable does optimizing with ML or campaigns make sense.

---

### **17. Phase 5 Cuts — App Store Launch** 📱

*Features removed during the Group 14 lean-out. Launch preparation is a checklist problem, not a feature problem — but that checklist had significant bloat. Everything cut here either requires infrastructure that doesn't exist yet (iPad layout), volume that doesn't exist yet (ASO A/B tests), or audiences that don't exist yet (localization).*

| Feature | Why Cut |
|---------|---------|
| **iPad screenshots** | iPad screenshots require a tablet-optimized layout (different navigation patterns, wider canvas). Sazon is phone-first. Submitting phone-only is fully allowed on both stores. Add iPad after a tablet layout is designed. |
| **App preview videos** (store listing) | Video production is time-intensive and has marginal impact on conversion for a cold launch with no brand recognition. Screenshots convert better when the UI is self-explanatory. Revisit for major updates when the brand has momentum. |
| **Localization** (store listing + screenshots) | Translate store listings only after you have data showing where users are coming from. Localizing for markets you haven't validated yet wastes effort and creates maintenance overhead on every update. |
| **ASO A/B testing** (screenshots, descriptions, icon variants) | Both the App Store and Play Console offer native A/B testing tools. They require enough daily installs (typically 200+/day) for results to reach statistical significance within a reasonable window. Run one great creative at launch; iterate once installs justify it. |
| **Manual StoreKit implementation** | RevenueCat replaces this entirely. Writing StoreKit directly creates a parallel billing stack to maintain alongside RevenueCat — pointless duplication. |
| **Manual Google Play Billing implementation** | Same as StoreKit — RevenueCat handles it. |
| **Separate Apple + Google server notifications** | RevenueCat normalizes both into a single webhook. Building separate handlers for Apple's `unified_receipt` format and Google's `DeveloperNotification` format doubles the surface area for bugs. |
| **Family sharing subscription sync** | No Pro tier, no family plan. Remove when the feature it depends on is removed. |
| **Tablet screenshots (Android)** | Same rationale as iPad — phone-first for v1. |

**How to revisit:** After launch, check your App Store Connect and Play Console analytics weekly. When organic installs plateau, that's the signal to invest in ASO. When you see installs from non-English locales reaching 10%+ of total, that's the signal to localize. When DAU supports A/B test volume, run one experiment at a time. Launch first; optimize on real data.

---

### **18. Phase 6 Cuts — Analytics & Algorithm/ML** 📊🧠

*The largest cuts in the entire roadmap. Group 15 was a full custom analytics platform duplicating what PostHog ships for free. Group 16 had three phases of ML infrastructure (collaborative filtering, neural nets, contextual bandits, model serving, monitoring, retraining pipelines) that require thousands of users and months of interaction data before they're meaningful. Also cut: several feedback collection tools that have better off-the-shelf equivalents.*

---

#### From Group 15 — Custom Analytics Platform

| Feature | Why Cut | Replace With |
|---------|---------|--------------|
| **Custom event queue + batch processing pipeline** | Weeks of infra engineering. Reliability, deduplication, and replay are solved problems. | PostHog SDK (buffers and batches automatically) |
| **Custom admin dashboards** (acquisition, engagement, retention, revenue) | Months of frontend work. | PostHog dashboards (built-in, configurable) + RevenueCat for revenue |
| **Custom funnel builder** | Complex query engine + UI. | PostHog funnels (built-in, drag-and-drop) |
| **Behavioral segmentation engine** (power users, at-risk, dormant) | Rules engine + daily jobs. | PostHog cohorts (built-in, event-condition based) |
| **Cohort analysis** (retention curves by signup date) | Complex SQL + visualization. | PostHog retention charts (built-in) |
| **Session recording + heatmaps** | Privacy-sensitive infra. | PostHog session recording (built-in, anonymizable) |
| **Real-time dashboards** (live activity, live error rates) | WebSocket infra + chart polling. | PostHog live view + Sentry real-time alerts |
| **Custom product analytics** (feature adoption, user journey mapping) | Separate data warehouse queries. | PostHog's "Paths" + feature flag exposure tracking |
| **Health metrics** (crash rates, API error rates, load times) | Separate monitoring stack. | Sentry (already in Group 6) |

**How to revisit:** PostHog covers 95% of analytics needs indefinitely. The 5% case for custom infrastructure is when you need to join analytics data with proprietary business data (e.g., Sazon Score × retention correlation), which requires exporting PostHog events to a data warehouse (BigQuery, Snowflake). Evaluate when the analytics questions you're asking outgrow what PostHog's built-in queries can answer — typically at thousands of DAU.

---

#### From Group 16 — ML Infrastructure

| Feature | Why Cut |
|---------|---------|
| **ML Phase 1: Data pipeline** (feature engineering, train/test splits, S3 export) | Can't train a meaningful model without interaction data. With <1,000 users, any model trained on this data will overfit to early-adopter behavior and generalize poorly. |
| **Collaborative filtering** (user-user similarity, item-item similarity, matrix factorization) | Requires a dense interaction matrix — thousands of users, each rating/saving/cooking dozens of recipes. With sparse data, collaborative filtering performs worse than the existing rule-based scoring. |
| **Content-based embeddings** (recipe vectors, TF-IDF ingredient matching, cosine similarity) | Spoonacular's similarity endpoint already does this. Building a custom embedding pipeline duplicates Spoonacular with more maintenance burden. |
| **Deep learning models** (neural collaborative filtering, attention mechanisms, multi-task learning) | Not appropriate until collaborative filtering is validated and data volume supports it. This is 6–12 months post-launch minimum. |
| **Contextual bandits** (Thompson sampling, UCB for real-time personalization) | Online learning algorithms require sustained high query volume to converge. Premature until DAU × recipe interactions per session is large enough for the exploration-exploitation tradeoff to matter. |
| **ML model serving infrastructure** (model versioning, real-time inference endpoint, batch prediction jobs) | No models to serve. |
| **Model monitoring** (drift detection, accuracy tracking, auto-alerts, rollback) | No models to monitor. |
| **Continuous learning pipeline** (weekly retraining, incremental learning, automated rollback) | No models to retrain. |
| **Custom A/B testing framework** (bucketing service, experiment config, statistical analysis engine) | PostHog feature flags + experiments handle this, including significance calculation. No custom infrastructure needed. |

**How to revisit ML:** The signal to start ML work is when the rule-based scoring starts producing obviously wrong recommendations *despite* having correct user preferences. This usually surfaces through dislike feedback patterns (Group 16's feedback loop) — if a user's dislike reasons are inconsistent with their stated preferences, the rule-based model has hit its ceiling. At that point, start with the simplest possible model: item-item similarity via Spoonacular, then add user rating history as a reranking layer. Build up incrementally rather than deploying a full ML stack at once.

---

#### From Group 16 — Feedback & Research Tools

| Feature | Why Cut | Replace With |
|---------|---------|--------------|
| **NPS survey system** (periodic prompts, follow-up questions, score tracking) | Building NPS infrastructure is a week of work for a survey that takes 30 seconds to set up externally. | Delighted or Typeform — embed a link in the transactional email sequence; no in-app code needed |
| **In-app feature request tracker** (upvoting, public roadmap integration, status updates) | A product in itself. Premature before you have enough users to make upvote counts meaningful. | Canny (free tier) or a public Notion page — link from Profile → "Share Feedback" |
| **In-app bug report modal** (screenshot capture, device info, reproduction steps) | Sentry already captures crashes + device context automatically. Manual bug reports are for UX issues, which are better collected via user interviews than a structured form. | Sentry user feedback widget (one-liner) for critical bugs; email for everything else |
| **User interview scheduling system** (in-app recruit, incentive tracking, consent management) | Operational overhead for a process that should be manual and relationship-driven at early stage. | Calendly link in the app's "About" or Profile screen — no backend needed |
| **Detailed feedback forms for power users** | Power users who want to give detailed feedback will find a way regardless. Adding a form creates a false sense that all feedback is equally weighted. | Reply-to email on transactional emails; direct outreach to high-engagement PostHog cohort |
