// ROADMAP 4.0 TB0.3 — Catalog alignment CLI.
//
// Reads:
//   - data/recommender/recipeEmbeddings.json   (TB0.2 output)
//   - data/recommender/food_com_interactions.json  (TB0.1 output, recipes side)
// Writes Recipe.embedding for every active row in the Sazon catalog.

import * as fs from 'fs';
import * as path from 'path';
import { alignCatalog } from '../../src/services/recommender/catalogAlignment';
import { makeOpenAIEmbed } from '../../src/services/recommender/openaiEmbed';

async function main() {
  const dataDir =
    process.env.RECOMMENDER_DIR ?? path.join(__dirname, '../../data/recommender');
  const embeddingsPath = path.join(dataDir, 'recipeEmbeddings.json');
  const interactionsPath = path.join(dataDir, 'food_com_interactions.json');

  if (!fs.existsSync(embeddingsPath)) {
    throw new Error(
      `alignCatalog: missing ${embeddingsPath}. Run TB0.2 first.`,
    );
  }
  if (!fs.existsSync(interactionsPath)) {
    throw new Error(
      `alignCatalog: missing ${interactionsPath}. Run TB0.1 first.`,
    );
  }

  const foodComEmbeddings = JSON.parse(
    fs.readFileSync(embeddingsPath, 'utf8'),
  ) as Record<string, number[]>;
  const snapshot = JSON.parse(
    fs.readFileSync(interactionsPath, 'utf8'),
  ) as { recipes: Array<{ id: number; name: string; ingredients: string[] }> };

  const openaiEmbed = makeOpenAIEmbed();
  const result = await alignCatalog({
    foodComEmbeddings,
    foodComRecipes: snapshot.recipes,
    openaiEmbed,
    skipExisting: process.env.RECOMMENDER_FORCE !== '1',
  });

  // eslint-disable-next-line no-console
  console.log(
    `[alignCatalog] matched=${result.matched} fallback=${result.fallback} unmatched=${result.unmatched} skipped=${result.skipped}`,
  );
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[alignCatalog] failed:', err);
    process.exit(1);
  });
}
