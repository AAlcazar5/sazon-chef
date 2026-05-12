# Background-task evaluation — decision

**Status:** decided — **NO** to on-device background fetch for v1.0.
**Owner:** Alex (full-stack)
**Date:** 2026-05-11
**Roadmap:** plans/plan-archives/ROADMAP_4.0.md → Tier U → U12

---

## What U12 asked

Zero `expo-task-manager` / `BackgroundFetch` registrations exist in the
app. Every proactive notification (pantry expiry, cooking reminders,
weekly recap, low-variety nudge, near-miss discovery) currently relies on
either (a) the server cron + push pipeline, or (b) the user opening the
app. If the server is down OR push delivery fails OR the user has
notifications off, those signals go silent.

Should we add on-device background fetch as a redundancy layer?

## Decision: NO

We will NOT register `expo-task-manager` background fetch for v1.0. The
existing server cron + push pipeline (Tier C12, N9) is the canonical
delivery channel; v1.0 will harden it instead of building a parallel
on-device pipeline.

## Why

1. **iOS battery scrutiny is real.** Apple opportunistically throttles
   background fetch tasks based on user behavior — for an app the user
   opens 1–2× per day, BackgroundFetch may fire less often than a
   reliable server push. The energy cost (review-rejection risk: "uses
   excessive background activity") is non-trivial.
2. **The signals are already user-tied.** Pantry expiry, fiber gaps,
   cuisine variety — all need user state that lives on the server. A
   background task on-device would just re-query the same data and fire
   the same notification. The work is duplicated, not redistributed.
3. **The failure modes are addressable without it.** "Server is down" is
   a Tier-L M1 problem (uptime monitoring + alerts), not a notification
   resilience problem. "Push delivery failed" is solved by an app-open
   catch-up sweep (cheap to ship — already partly done in C12.5).
4. **Cost > benefit for v1.0.** Each background-fetch handler is a real
   maintenance burden: must be tested under iOS background-execution
   simulator, must handle cold-start race conditions with the JS
   bundle, must respect the OS budget. For ≤5 use cases, the engineering
   investment isn't justified.

## What we WILL do instead

1. **Improve push-delivery monitoring** (covered separately under
   Tier-Q M4 SLO + Tier-L alerts).
2. **App-open catch-up sweep** — when the app opens, query the server
   for any notification-eligible state that should have fired but didn't
   (e.g., pantry items expiring today/tomorrow), and render a Sazon
   nudge inline on Today. This catches the "notifications disabled" and
   "device offline" cases without requiring a background task.
   - Partial coverage exists today (C12.5 pantry expiry strip on Today).
   - Gaps: fiber-gap nudges, variety nudges, near-miss discovery.
   - Tracked under Tier-N9.x (future sprint).
3. **Re-evaluate post-launch** with real signal: if telemetry shows >5%
   of `notificationsEnabled=false` users miss material nudges that affect
   retention, revisit this decision. Otherwise, the server pipeline is
   the long-term answer.

## Reversal criteria

We would revisit this decision if any of the following become true:
- Apple deprecates remote push for non-critical notifications (very
  unlikely).
- Server push delivery rate drops below 95% sustained for two weeks.
- A specific high-value nudge requires sub-minute latency that the
  server cron (5-minute granularity) can't deliver.
- A new use case emerges that genuinely requires on-device computation
  (e.g., on-device ML inference for a personalization signal).

If any of these trigger, we'd scope a single proof-of-concept
(`expo-task-manager` for pantry-expiry only) behind a feature flag,
ship to internal testers, measure battery + delivery rate, then decide
whether to expand.

## Open questions tracked elsewhere

None for now. The "app-open catch-up sweep" expansion is the natural
follow-up and lives in the N9 backlog.
