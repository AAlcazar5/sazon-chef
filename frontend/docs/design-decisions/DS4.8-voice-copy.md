# DS4.8 — Voice copy: banned vs. preferred per component

> **Decision:** Every component spec carries a 2-row banned / preferred
> example pair. Sazon is the brand-as-friend, never the brand-as-judge.

## Voice principles (from CLAUDE.md persona)

- Lifestyle / discovery voice, not optimization / coach voice.
- Texting a friend, not training a recruit.
- Curiosity, not verdict.
- Past-the-spreadsheet eater, not macro-cult.

Banned vocabulary: "cut" / "bulk" / "maintain", "you're under/over",
"macro-friendly", "Failed", "Error:", "Invalid". Preferred: "How would
you describe how you want to eat?", "Today's plate hit X micros", "Real-
ingredient version".

## Component voice pairs

### `BrandButton` (CTA)

| | Banned | Preferred |
|---|---|---|
| Save | `"SAVE"` (shouty) | `"Save to Kitchen"` |
| Start cooking | `"BEGIN COOKING"` | `"Let's go"` / `"Start cooking"` |
| Apply | `"APPLY FILTERS"` | `"Show me"` |

### `Toast`

| variant | Banned | Preferred |
|---|---|---|
| success | `"Save successful"` | `"Saved to your kitchen."` |
| info | `"Notification: New recipe"` | `"There's a new one for you."` |
| warning | `"Warning: Offline mode"` | `"You're offline — caching this for later."` |
| error | `"Failed to save"` | `"Hmm — that didn't go through. Try once more."` |

### Error / empty state mascot copy

| state | Banned | Preferred |
|---|---|---|
| `error` | `"An error occurred."` | `"Hmm — that didn't go through."` |
| `search-empty` | `"No results found."` | `"Hmm — let me think about that one."` |
| `no-notifications` | `"You have 0 notifications."` | `"All quiet on the kitchen front."` |
| `loading` | `"Loading…"` | `"Sazon's pulling this together for you…"` |

### Modal title

| | Banned | Preferred |
|---|---|---|
| Onboarding step | `"Step 2 of 4: Dietary Preferences"` | `"How would you describe how you want to eat?"` |
| Paywall | `"Unlock Premium"` | `"Sazon picks dinner. Membership lets you plan the week, build your library, and chat with Sazon anytime."` |
| Are-you-sure | `"Confirm deletion"` | `"Drop this from your kitchen?"` |

### Banner

| | Banned | Preferred |
|---|---|---|
| Onboarding nudge | `"Action required: Complete profile"` | `"Tell Sazon a bit more — better picks ahead."` |
| Network warning | `"Offline mode active"` | `"You're offline — these are your cached picks."` |

### Empty state CTA labels

| | Banned | Preferred |
|---|---|---|
| Saved tab | `"Browse Recipes"` | `"Find your first recipe"` |
| Plan tab | `"Generate Plan"` | `"Build my week"` |
| Kitchen → Stories | `"Check back later"` | `"Make some news — start cooking"` |

## Test enforcement

`frontend/__tests__/quality/bannedVocabUniformity.test.ts` already runs
the banned-vocab corpus against backend-generated copy. The frontend
mirror at `frontend/__tests__/__fixtures__/bannedVocabularyCorpus.ts`
covers user-facing strings.

`frontend/scripts/banned-patterns.ts` (DS0.3 + DS1.5) enforces the
*structural* side of voice — no Error: / Failed: in user-facing copy
files, no Sad mascot expressions.

## Source of truth

Vocabulary: `__fixtures__/bannedVocabularyCorpus.ts`.
Persona: `plans/product.md#persona` voice section.
Mascot rules: `constants/MascotForState.ts` (DS4.7).
