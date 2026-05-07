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

The training run is **OpenAI-API-cost-bound, not engineering-bound** — the
script exists; you run it once, then re-run as the catalog grows.

## Cost estimate

For ~5,000 canonical ingredient names + USDA descriptions:

| Item                       | Value                                         |
|----------------------------|-----------------------------------------------|
| Model                      | `text-embedding-3-small` (1536-dim, projected to 384) |
| Avg tokens per ingredient  | ~25 (name + description)                      |
| Total tokens               | ~125,000                                      |
| Cost @ $0.02 per 1M tokens | **~$0.0025** (~half a US penny)               |

Cost will scale linearly as the catalog grows. The script is idempotent —
re-runs only embed names that aren't already in `IngredientEmbedding`, so
incremental costs are bounded.

## Prerequisites

1. **`OPENAI_API_KEY` set** in `backend/.env`:
   ```bash
   echo "OPENAI_API_KEY=sk-..." >> backend/.env
   ```
2. **Prisma client up-to-date** for `IngredientEmbedding` (already pushed
   via `npx prisma db push` when IG0.3 shipped):
   ```bash
   cd backend && npx prisma generate
   ```
3. **`IngredientFDCMapping` table populated.** This is the canonical-name
   anchor with USDA descriptions. Confirm with:
   ```bash
   sqlite3 backend/prisma/dev.db "SELECT COUNT(*) FROM ingredient_fdc_mapping;"
   ```
   Should return ≥ several hundred rows. If empty, see `backend/prisma/seed`
   scripts (out of scope for this runbook).

## Run it

```bash
cd backend
npx ts-node scripts/recommender/trainIngredientEmbeddings.ts \
    --batch-size 100 \
    --max-names 5000
```

Flags:
- `--batch-size N` — names per OpenAI request (default 100; max 2048 per the
  API). Higher = fewer round trips, more memory.
- `--max-names N` — cap total names processed (default ∞; useful for a dry
  run with `--max-names 50` to verify the pipeline before committing the
  full cost).
- `--dry-run` — print what would be embedded without calling OpenAI or
  writing to the DB.
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

Expected output (cosine in [-1, 1], higher = more similar):

```
rosemary → cosine 0.71
oregano  → cosine 0.68
sage     → cosine 0.65
cinnamon → cosine 0.42  (still in "spice" cluster but distant)
flour    → cosine 0.18  (totally different category)
```

If the herb-cluster cosines are < 0.6, something's wrong with the
projection or the descriptions. Re-run with `--dry-run` first to inspect
the input strings.

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
