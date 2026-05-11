# TODO / FIXME triage — 2026-05-11

Tier U Group D U22. Audit surfaced 18 TODO/FIXME markers in source files
outside tests. Each is triaged below: **deferred** (legitimate post-launch
work, tracked on roadmap), **archive** (no longer relevant — comment
should go away in a routine cleanup), or **resolve** (small enough to
clean up in the same change).

## Deferred — tracked on roadmap

These are real future work, not stale comments. The comment can stay
because it points to a known follow-up.

| File / line | Marker | Maps to |
|---|---|---|
| `frontend/lib/coachAnalytics.ts:14` | wire to PostHog/Segment | Post-launch growth tooling (Group 12 era) |
| `backend/src/services/coachMemoryService.ts:8` | token-cosine → real embeddings | Coach memory v2 (post-launch) |
| `backend/src/services/coachMemoryService.ts:10,258` | `setImmediate` → real queue | Coach memory v2 (post-launch) |
| `backend/src/modules/coach/coachRoutes.ts:125` | base64 → S3/Supabase blob | Coach attachments v2 |
| `backend/src/services/shoppingAppIntegrationService.ts:224` | per-app integration | Group 10Q follow-up |
| `backend/src/modules/dailySuggestions/dailySuggestionsController.ts:97` | ingredient tracking | Pantry-aware suggestions (Group 10R) |
| `backend/src/utils/optimizedScoring.ts:81` | substring match over-flags | Tier-H H2 security follow-up |

## Resolve — ship the fix in the next touch

Small enough to deal with when the file is next edited. Not blocking,
but the comment will rot if left.

| File / line | Marker | Fix |
|---|---|---|
| `frontend/hooks/useMealPlanActions.ts:799` | Navigate to recipe alternatives | Currently a no-op; either implement or drop the comment + button |
| `frontend/hooks/useMealPlanActions.ts:819` | Load specific day's meal plan | Same as above |
| `frontend/hooks/useMealPlanActions.ts:840` | Add recipe to specific meal | Same |
| `backend/src/modules/recipe/recipeController.ts:1791` | Re-enable when weight_goals table is created | The table now exists — remove the TODO + enable the path |
| `backend/src/modules/recipe/recipeController.ts:1819` | Override range if weight goal is active | Same |
| `backend/src/utils/runtimeImageVariation.ts:22` | Re-enable after confirming images load | Confirm + remove, or document why it stayed off |

## Archive — comment can go away

None this pass — every marker still has signal.

## Ratchet

Going forward, **new TODO markers must have an associated roadmap entry
or a "resolve by" target**. The `__tests__/quality/todoMarkerRatchet.test.ts`
test pins the current count and fails if it grows without an explicit
allowlist update.
