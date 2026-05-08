# IG1 — Ingredient Embeddings Runbook

ROADMAP 4.0 Tier IG, sub-tier IG1. Run this when you're ready to enable
semantic ingredient matching across the app.

## Why this matters

Without IG1, three surfaces fall back to less-personal logic:

- **IG7 semantic pantry match** — currently a binary "have this ingredient
  name / don't" check. With embeddings, "thyme" softly matches a pantry that
  has "rosemary" at 0.7 weight (same Mediterranean-herb cluster).
- **IG6.2 swap learning loop, embedding source** — currently stubbed
  (returns `[]`). With embeddings, the cold-start swap suggestion ladder
  fires its third tier instead of dropping straight to the static dict.
- **IG10 Pantry IQ cuisine lean classifier** — currently uses literal
  cuisine name from CookingLog. Embeddings let us classify ingredients into
  cuisine clusters even when the user logs them generically.

The script exists; you run it once, then re-run as the catalog grows.
**The launch run already shipped using the local provider** — 1,267 rows
persisted to `IngredientEmbedding` (see ROADMAP_4.0 IG1.1). Re-run only
when the catalog grows past the existing rows or you want to swap models.

## Providers

The script supports two embedding backends. **Local is the default and
shipped path; OpenAI is a fallback option.**

| Provider                                      | `--provider` | Cost                                | Quality bar                                  | Setup                              |
|-----------------------------------------------|-------------|-------------------------------------|----------------------------------------------|------------------------------------|
| **Local (Hugging Face transformers.js)** ✅   | `local`     | $0 (one-time ~80MB model download)  | Good; `Xenova/all-MiniLM-L6-v2` 384-d native | `npm i @huggingface/transformers` (already installed) |
| OpenAI *(fallback)*                           | `openai`    | ~$0.0025 / 5,000 names              | Strong; 1536-d → 384-d random projection     | `OPENAI_API_KEY` in `backend/.env` |

The IG1.1 launch run used `--provider local`. Cosine magnitudes are
tighter on bare ingredient names than OpenAI's, but the cluster
rank-order is still correct (see Validate section below). The OpenAI
path stays in the script for future re-runs if the local model's quality
bar ever proves insufficient on a specific ingredient cluster.

## Cost estimate (OpenAI fallback only)

The local provider is $0. If you opt into the OpenAI fallback, costs
for ~5,000 canonical ingredient names + USDA descriptions:

| Item                       | Value                                         |
|----------------------------|-----------------------------------------------|
| Model                      | `text-embedding-3-small` (1536-dim, projected to 384) |
| Avg tokens per ingredient  | ~25 (name + description)                      |
| Total tokens               | ~125,000                                      |
| Cost @ $0.02 per 1M tokens | **~$0.0025** (~half a US penny)               |

Cost will scale linearly as the catalog grows. The script is idempotent —
re-runs only embed names that aren't already in `IngredientEmbedding`, so
incremental costs are bounded.

## Candidate sources

The script reads canonical names from one of two sources, picked via
`--source` (default `auto`):

| `--source`            | Reads from                          | When to use                                  |
|-----------------------|-------------------------------------|----------------------------------------------|
| `fdc`                 | `IngredientFDCMapping`              | Once the FDC mapping is populated (lazy fill via nutrient lookups) |
| `recipe_ingredients`  | distinct names from `RecipeIngredient` (after quantity/unit strip) | Fresh DB / before FDC populates |
| `auto` (default)      | FDC if non-empty; else recipe_ingredients | Pretty much always              |

## Prerequisites

1. **`--provider local` needs internet** for the one-time model download
   (cached after first run). The OpenAI fallback needs `OPENAI_API_KEY`
   in `backend/.env`.
2. **Prisma client up-to-date** for `IngredientEmbedding` (already pushed
   via `npx prisma db push` when IG0.3 shipped):
   ```bash
   cd backend && npx prisma generate
   ```
3. **At least one candidate source has rows.** Confirm with:
   ```bash
   sqlite3 backend/prisma/dev.db \
     "SELECT 'fdc', COUNT(*) FROM ingredient_fdc_mappings; \
      SELECT 'recipe_ingredients', COUNT(*) FROM recipe_ingredients;"
   ```
   At least one should return a non-zero count.

## Run it

Local (default — no API key needed):
```bash
cd backend
npx ts-node scripts/recommender/trainIngredientEmbeddings.ts \
    --provider local \
    --batch-size 64
```

OpenAI (fallback):
```bash
cd backend
npx ts-node scripts/recommender/trainIngredientEmbeddings.ts \
    --provider openai \
    --batch-size 100
```

Flags:
- `--provider {local|openai}` — pick the embedding backend (default `local`; OpenAI is a fallback).
- `--source {fdc|recipe_ingredients|auto}` — pick the canonical-name source
  (default `auto`).
- `--batch-size N` — names per call. OpenAI cap is 2048; local provider has
  no hard cap but 64–128 keeps memory steady.
- `--max-names N` — cap total names processed (default ∞; useful for a dry
  run with `--max-names 50` to verify the pipeline first).
- `--dry-run` — print what would be embedded without calling the provider
  or writing to the DB.
- `--force` — re-embed names that already have a row in `IngredientEmbedding`
  (default: skip).

The script logs progress every 100 names and writes a summary at the end:
how many were embedded, how many skipped (already had rows), how many
failed (API error / non-finite vector).

## Validate

After the run:

```bash
# 1. Row count grew
sqlite3 backend/prisma/dev.db \
  "SELECT COUNT(*) FROM ingredient_embeddings;"

# 2. Smoke-test that nearest-neighbors look sensible
cd backend && npx ts-node -e "
import { getEmbedding, getMany } from './src/services/recommender/ingredientEmbeddingStore';
import { cosineSimilarity } from './src/services/recommender/embeddingStore';
const probe = await getEmbedding('thyme');
const candidates = await getMany(['rosemary', 'oregano', 'sage', 'cinnamon', 'flour']);
for (const [name, row] of candidates) {
  if (!row) continue;
  console.log(name, '→ cosine', cosineSimilarity(probe!.embedding, row.embedding).toFixed(3));
}
"
```

Expected output depends on the provider — both are valid as long as the
*cluster rank-order* is correct (herb siblings outrank unrelated items):

```
# Xenova/all-MiniLM-L6-v2 (local — default, what shipped)
rosemary → cosine 0.30
oregano  → cosine 0.28
sage     → cosine 0.22
cinnamon → cosine 0.10
flour    → cosine -0.02

# OpenAI text-embedding-3-small + 384-d projection (fallback)
rosemary → cosine 0.71
oregano  → cosine 0.68
sage     → cosine 0.65
cinnamon → cosine 0.42
flour    → cosine 0.18
```

The smoke-test suite at `backend/__tests__/services/recommender/ingredientEmbeddings.smoke.test.ts`
codifies this — it asserts rank-order rather than absolute cosine so
both providers pass.

The IG7.1 default cosine threshold (0.8) is calibrated for OpenAI;
because the launch run used the local provider, IG7.1 callers should
pass a lower override (≈ 0.4–0.5), or leave the default and let the
binary fallback handle most of the matches.

## Roll forward to IG1.2

Once embeddings exist, IG1.2 (`ingredientAdjacencyService`) becomes the next
unblock — a thin in-memory cosine over the `IngredientEmbedding` rows. The
service ships with cold-start fallback to the static `ingredientSwapService`
dict, so it's safe to deploy before every name has an embedding.

## v2 — when to revisit

The v1 script uses **source 1 only** (USDA descriptions). The IG1.1 spec
also calls for:

- **Source 2: recipe-ingredient co-occurrence** — train when the curated
  catalog passes ~3,000 recipes (signal-to-noise floor)
- **Source 3: per-user co-purchase** — train when monthly active users
  exceed ~500 (k-anonymity ≥ 30 floor with multiple distinct co-purchase
  baskets per cluster)

Both are PyTorch two-tower jobs in the spirit of `trainItemEmbeddings.py`.
Add to this runbook when crossing those thresholds.
