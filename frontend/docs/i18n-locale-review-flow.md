# i18n locale-file review flow

ROADMAP 4.0 i18n-OPS7.3 — the two-stage review gate for locale-file PRs.

## Why two stages

Pre-i18n-OPS7.3 the rule was *"native review before commit."* Solo-dev
reality made that impossible — native speakers aren't on call for every
locale, and even a `fr` or `it` bundle change would block indefinitely
waiting for one.

The bigger risk isn't a committed draft sitting in the repo. It's a draft
**reaching the user picker** without native review. Drafts in the repo are
useful: they unblock the parity tests (`frontend/__tests__/quality/
i18nCorrectness.test.ts`), give future reviewers concrete copy to debate,
and cost nothing while inactive. The hard gate is **user exposure**.

So the flow is two stages, with the second stage offering a "draft-only"
escape hatch that keeps the bundle in the repo but invisible to users.

---

## Stage 1 — AI back-translation sanity pass (before commit)

**Who:** anyone landing the PR.
**When:** before opening the PR.
**Why:** catches the gross errors machine translation makes:

- **Domain ambiguity** — `plate` translated as `Placa` (license plate) vs
  `Prato` (dinner plate), `serve` as `servir` (formal) vs `atender`
  (waiter), etc.
- **Broken interpolation** — `{{var}}` placeholders garbled or removed.
- **Untranslated brand jargon** — "Build a plate", "Sazon", "Pantry IQ"
  left as-is when they should be brand terms in any language.
- **Register inconsistency** — mixing `tu` (informal) and `vous` (formal)
  in the same locale, or mixing `vos` (Argentine) and `tú` (Mexican) in
  `es`.

**Procedure:**

1. Open the new/changed strings in a chat with Claude or GPT-4o.
2. Prompt: *"Translate these strings back to English. Treat brand terms
   (Sazon, Build a plate, Pantry IQ) as proper nouns. Preserve `{{var}}`
   placeholders exactly."*
3. Diff the back-translation against `en.json`.
4. Fix what the diff surfaces. Voice/idiom subtleties stay deferred.
5. Paste the back-translation + your notes in the PR description under
   the "i18n locale-file review gate" section.

---

## Stage 2 — User-exposure decision (locked gate)

**Who:** PR author chooses one of two paths.
**When:** at PR open.

### Path A — Native review complete

A native speaker has signed off. The locale is safe to expose to users —
add it to the picker, store metadata, push targeting.

**For locales the dev speaks** (e.g., `es` with effort, `pt` with help),
self-review counts. Note that explicitly in the PR.

**For locales the dev doesn't speak** (`fr`, `it`, `de`, `ja`, etc.),
options:

- One-shot editorial review on Fiverr / ProZ / Upwork (~$50–100 per
  144-key bundle at standard editorial rates).
- Native-speaker friend / contact who reads + edits.
- ProZ Pro Bono / community translation networks (slower; better for
  cultural-context queries than full bundle review).

Whoever signs off, note **name + relationship + reviewer locale** in the
PR description.

### Path B — Draft only (NOT exposed to users)

If no native reviewer is lined up, the locale CAN still land — but as a
draft, not as a user-facing locale.

**Mark the locale file header** with this annotation:

```json
{
  "_meta": {
    "status": "draft",
    "note": "Translated by [DeepL / Claude / etc.]. NOT exposed to users — pending native review."
  },
  "first.actual.key": "Bonjour"
}
```

**Suppression touchpoints** (the locale must NOT appear in any of these
until Path A is taken):

- `frontend/lib/i18n.ts` — locale picker / fallback chain
- `frontend/app/edit-preferences.tsx` (and any other locale picker
  surface) — UI options
- `frontend/app-store-metadata/<locale>/` — store listing (don't ship
  metadata for an unreviewed locale)
- Push notification locale targeting (`backend/src/services/
  notifications/localeRouter.ts` or equivalent)

Parity tests (`__tests__/quality/i18nCorrectness.test.ts`) still pick
the draft up — that's intentional. The drafts unblock structural tests
while the user-exposure gate stays closed.

---

## What the PR template enforces

Every locale-file PR that flips ≥1 key from missing → translated must
check ONE of:

- Stage 1 done + Stage 2 Path A complete (reviewer noted), OR
- Stage 1 done + Stage 2 Path B noted (draft annotation in locale file)

The PR template has the checkboxes inline. No automated CI gate enforces
this — process check at code review.

---

## Reversal trigger

If translation tooling improves to the point that LLM-back-translation +
glossary checking reliably catches every category of error currently
caught only by native review, this gate can simplify back to a single
LLM-pass-then-commit flow. Until then, two stages.

The MT-quality landscape for low-resource food vocabulary (huitlacoche,
fesenjan, etc.) is what currently keeps Stage 2 a hard gate.
