# Home-Screen Widget — "Tonight's Plate"

P2 retention surface. Reduces friction-to-cook to 1 tap from the home
screen. Shipped in two halves: the **data layer** (this folder is the
docs anchor; code lives in the usual places) is complete; the **native
widget targets** are the follow-up.

---

## What's wired today (data layer — shipped)

| Layer | Path |
|---|---|
| Backend endpoint | `backend/src/modules/today/widgetController.ts` (`GET /api/today/widget`) |
| Backend route | `backend/src/modules/today/todayRoutes.ts` |
| Frontend API helper | `frontend/lib/api/today.ts` → `todayApi.widget()` |
| Frontend sync hook | `frontend/hooks/useWidgetSync.ts` (mounted in `app/_layout.tsx`) |
| Cache key | `@sazon/widget/tonights_plate` in AsyncStorage |

The sync hook fetches on app open + on every foreground transition and
writes the payload to `AsyncStorage`. This is the **placeholder bridge**.

### Payload shape

```ts
interface WidgetPayload {
  recipeId: string | null;
  title: string | null;
  imageUrl: string | null;
  cookTime: number | null;
  cuisine: string | null;
  eyebrow: string;            // "TONIGHT'S PLATE" | "PICK UP WHERE YOU LEFT OFF" | "WHILE YOU PLAN"
  deepLink: string | null;    // sazon://recipe/{id}
}
```

### Selection priority (backend)

1. Today's `dinner` slot from an active meal plan.
2. User's most-recently-viewed recipe.
3. `null` recipeId — widget renders a quiet "Open Sazon" prompt.

---

## What's left (native side — follow-up)

### iOS — WidgetKit

1. **Expo dev build** — `npx expo prebuild --platform ios` then add a new
   target: `Sazon Widget Extension` (iOS 14+).
2. **App Group** — create `group.com.sazon.shared` and add it to both
   the main app's `Sazon.entitlements` and the widget extension's
   entitlements file.
3. **Replace the AsyncStorage write** in `useWidgetSync.ts` with a call
   to a native module that writes to `UserDefaults(suiteName: "group.com.sazon.shared")`.
   The expo plugin `expo-shared-defaults` (or a thin custom module wrapping
   `NSUserDefaults`) is the standard pattern. Key: `tonights_plate`.
4. **Widget Swift code** — Timeline provider reads from the same shared
   defaults every 30 minutes. Render `title`, `cuisine`, `cookTime`, and
   the `imageUrl` via `AsyncImage` (iOS 15+) or a static placeholder.
5. **Tap target** — set the widget's `.widgetURL(URL(string: payload.deepLink))`.
   The app already handles `sazon://recipe/{id}` in
   `app/_layout.tsx` (`isRecognizedDeepLink`).
6. **Privacy manifest** — add `NSUserDefaultsAccessAPI` reason
   (already covered by `PrivacyInfo.xcprivacy` if shipped; check
   `frontend/app.json` per the ROADMAP Tier G entry).

### Android — Glance / AppWidget

Android home-screen widgets are lower-priority for Sazon's persona
(iOS-first), but the same pattern applies: bridge via
`SharedPreferences` from JS, Glance composables read the cached
payload.

### Tests for the native side

- **Snapshot test** of the timeline-provider's `Entry` for each
  selection-priority outcome (meal plan / recent / quiet).
- **End-to-end manual test** matrix: airplane mode (stale cache must
  render), fresh install (quiet state), active meal plan (TONIGHT'S
  PLATE label).
- **App Group container probe** in CI: build the widget target, verify
  the entitlement string matches the main app's.

---

## Why this is the highest-leverage retention surface left

- One-tap-to-cook from the home screen — bypasses launcher friction.
- Always-visible reminder of what the user planned, without a push.
- Universal-link to cooking mode means the widget doubles as the "open
  Sazon" anchor for users who've otherwise stopped opening the app.

The data layer above is enough to validate the *content* of the widget
(payload shape, selection priority, error fallback). The native target
is wiring, not new logic — pick it up when there's a dev build cycle to
spend on iOS submission anyway (Tier F in the launch roadmap).
