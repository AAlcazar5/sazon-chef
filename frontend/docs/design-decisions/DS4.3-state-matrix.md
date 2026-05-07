# DS4.3 — Empty / error / loading state matrix

> **Decision:** Three rows × N surfaces — every screen with a content
> region declares its empty / error / loading state in one place. Each
> cell maps to a mascot expression (DS4.7) + copy template + primary
> action.

## The matrix

| Surface              | Empty                                   | Error                                        | Loading                          |
|----------------------|-----------------------------------------|----------------------------------------------|----------------------------------|
| Today (hero feed)    | mascot=`sleepy` "Tap below to start" + "Start the day" CTA | mascot=`thinking` "Hmm — feed didn't load" + retry | mascot=`thinking` skeleton card grid |
| Week plan            | mascot=`curious` "No plan yet" + "Generate week" CTA | mascot=`thinking` "Couldn't pull the plan" + retry | skeleton 7-day grid             |
| Kitchen — Saved      | mascot=`curious` "Nothing saved yet" + "Browse" CTA | mascot=`thinking` "Something snagged" + retry | skeleton recipe-card list        |
| Kitchen — Collections | mascot=`idle` "No collections yet" + "Make one" CTA | mascot=`thinking` "Couldn't load" + retry | skeleton title rows              |
| Kitchen — Discover   | mascot=`curious` "Nothing matches" + "Widen filters" CTA | mascot=`thinking` "Couldn't search" + retry | skeleton card grid               |
| Kitchen — Journey    | mascot=`idle` "Your story starts here" + "Cook your first" CTA | mascot=`thinking` "Couldn't load journey" | skeleton timeline rail           |
| Kitchen — Stories    | mascot=`sleepy` "All quiet" + "Make some news" | mascot=`thinking` "Couldn't load stories" | skeleton card list               |
| Sazon (Coach)        | mascot=`idle` "Ask me anything" + suggested chips | mascot=`thinking` "Lost the thread — try again" + retry | mascot=`thinking` typing dots    |
| Notifications        | mascot=`sleepy` "All quiet on the kitchen front" | mascot=`thinking` "Couldn't pull notifications" | skeleton row list               |
| Pantry               | mascot=`curious` "Nothing in the pantry" + "Add ingredient" CTA | mascot=`thinking` "Pantry didn't load" | skeleton chip rows               |
| Shopping list        | mascot=`curious` "Empty list" + "Add from a recipe" CTA | mascot=`thinking` "Couldn't load list" + retry | skeleton checkbox rows           |

## Cell construction recipe

Every cell renders an `AnimatedEmptyState` (or its error/loading sibling)
that consumes:

- **Mascot** — from `MascotForState[state]` (DS4.7). Never sad/angry.
- **Copy** — one short sentence, lifestyle voice. No "Failed:", no "Error:".
- **Primary action** — single `BrandButton`, optional. Empty states almost
  always have one CTA; error states have a retry; loading states have none.
- **Background** — `Surface.{light,dark}.base` with optional pastel tint
  via `PastelTokens.{light,dark}.<accent>` for editorial empty states.

## Anti-patterns

- ActivityIndicator spinners — banned. Use `LoadingState` skeleton or
  the thinking mascot.
- Red error banners with "Error:" or "Failed:" prefixes — banned.
  Sazon-as-friend, never punitive (CLAUDE.md).
- Two CTAs on an empty state — pick the one most likely to onboard.

## Source of truth

Mascot pairings: `frontend/constants/MascotForState.ts` + DS4.7 doc.
Empty-state primitive: `components/ui/AnimatedEmptyState`.
This matrix: editorial / design-side reference. The matrix expands as
new screens land; current screens audit against it during DS7.
