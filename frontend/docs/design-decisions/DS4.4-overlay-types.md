# DS4.4 — Modal vs. bottom-sheet vs. action-sheet decision tree

> **Decision:** Three overlay primitives, one rule each. No new
> overlay types without a documented use case that the existing three
> can't serve.

## The decision tree

```
Is the user choosing between ≤ 4 short, mutually-exclusive options?
├── YES → Action sheet
│         (e.g., "Share / Save / Skip / Cancel" on a recipe card.)
│
└── NO → Does the surface need swipe-to-dismiss and a dragged-handle metaphor?
         (i.e., partial-height, content extends below the fold,
          user might peek + return without committing)
         ├── YES → Bottom sheet
         │         (e.g., filter sheet, recipe quick-view, long-press
         │          tab → Sazon context.)
         │
         └── NO → Modal
                  (e.g., onboarding step, paywall, multi-step form,
                   "are you sure?" with non-trivial copy.)
```

## Primitive specs

### Action sheet

- Native iOS-style: ≤ 4 buttons, vertical stack, last button is the
  cancel.
- Each button is one short verb.
- No content above the buttons (no images, no headlines).
- Implementation: `Alert.alert` on iOS, custom `<ActionSheet>` on
  Android (matches iOS visual to keep brand consistency per DS2.4).

### Bottom sheet

- Token-driven via `Motion.bottomSheet.drag` (DS6.2):
  - Rubber-band beyond fully-open.
  - Dismiss threshold: 30 % of travel.
  - Flick velocity override: > 1500 px/s.
  - Dismiss animation: 250 ms.
- Always rounds the top corners with `Radius.sheet` (28 px).
- Has a 4 px-wide × 36 px-long handle at top center.
- Backdrop: `Backdrop.light` / `Backdrop.lightDark`.
- Library: `@gorhom/bottom-sheet` (already a dep).

### Modal

- Token-driven via `Motion.modal.enter` / `.exit` (DS6.1).
- Rounded corners `Radius['2xl']` (24 px).
- Backdrop: `Backdrop.heavy` / `Backdrop.heavyDark` (more opaque than
  bottom-sheet because modal commits the screen).
- Dismissable via close button + tap-on-backdrop (configurable).
- Cannot be partial-height — modal is full-screen on phones, centered
  card on tablet/landscape.

## Anti-patterns

- **Modal-disguised-as-sheet** — full-screen overlay with no swipe-down
  affordance. Pick one, commit.
- **Long action sheets** (5+ items) — at that count, switch to a
  bottom-sheet with a scrollable list.
- **Modal stacking** — never present a modal from inside a modal. Use
  navigation push or a step indicator instead.
- **Auto-dismissing modals** — only Toasts auto-dismiss (DS4.1). Modals
  always require user input.

## Source of truth

Motion tokens: `Motion.modal`, `Motion.bottomSheet`.
Visual tokens: `Radius.sheet`, `Radius['2xl']`, `Backdrop.*`.
Library: `@gorhom/bottom-sheet`.

Decision tree applies retroactively — when migrating an existing
overlay (DS7), pick the matching primitive per this rule, then port.
