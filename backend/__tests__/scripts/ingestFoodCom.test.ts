// ROADMAP 4.0 TB0.1 — Food.com ingestion test.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ingestFoodCom,
  IngestResult,
} from '../../scripts/recommender/ingestFoodCom';

describe('ingestFoodCom', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'foodcom-'));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  function writeCsv(file: string, rows: string[]) {
    fs.writeFileSync(path.join(tmp, file), rows.join('\n'));
  }

  it('drops interactions with rating <3 and recipes with <5 ratings', async () => {
    writeCsv('RAW_recipes.csv', [
      'name,id,minutes,nutrition,n_steps,description,ingredients,n_ingredients',
      '"Pasta",1,30,"[]",3,"desc","[\'pasta\',\'tomato\']",2',
      '"Soup",2,40,"[]",4,"desc","[\'broth\']",1',
      '"Cake",3,60,"[]",5,"desc","[\'flour\']",1',
    ]);
    writeCsv('RAW_interactions.csv', [
      'user_id,recipe_id,date,rating,review',
      '10,1,2022-01-01,5,"yum"',
      '11,1,2022-01-02,4,"good"',
      '12,1,2022-01-03,5,"great"',
      '13,1,2022-01-04,3,"ok"',
      '14,1,2022-01-05,5,"nice"',
      '20,2,2022-01-01,5,"few"',
      '21,2,2022-01-02,1,"bad"', // <3 dropped
      '30,3,2022-01-01,2,"meh"', // <3 dropped
      '31,3,2022-01-02,5,"y"',
    ]);

    const result: IngestResult = await ingestFoodCom({
      inputDir: tmp,
      outputDir: tmp,
    });

    // recipe 1 has 5 rated≥3 → kept; recipe 2 has 1 → dropped; recipe 3 has 1 → dropped
    expect(result.recipesKept).toBe(1);
    expect(result.interactionsKept).toBe(5);
    expect(result.interactionsDropped).toBeGreaterThan(0);

    const out = JSON.parse(
      fs.readFileSync(path.join(tmp, 'food_com_interactions.json'), 'utf8'),
    );
    expect(Array.isArray(out.interactions)).toBe(true);
    expect(out.interactions).toHaveLength(5);
    expect(out.recipes).toHaveLength(1);
    expect(out.recipes[0].id).toBe(1);
  });

  it('is idempotent on re-run (same output, no error)', async () => {
    writeCsv('RAW_recipes.csv', [
      'name,id,minutes,nutrition,n_steps,description,ingredients,n_ingredients',
      '"Pasta",1,30,"[]",3,"d","[\'pasta\']",1',
    ]);
    writeCsv('RAW_interactions.csv', [
      'user_id,recipe_id,date,rating,review',
      ...Array.from({ length: 6 }, (_, i) => `${i},1,2022-01-0${i + 1},5,"x"`),
    ]);

    const r1 = await ingestFoodCom({ inputDir: tmp, outputDir: tmp });
    const buf1 = fs.readFileSync(path.join(tmp, 'food_com_interactions.json'));

    const r2 = await ingestFoodCom({ inputDir: tmp, outputDir: tmp });
    const buf2 = fs.readFileSync(path.join(tmp, 'food_com_interactions.json'));

    expect(r1).toEqual(r2);
    expect(buf1.equals(buf2)).toBe(true);
  });

  it('throws cleanly on missing input', async () => {
    await expect(
      ingestFoodCom({ inputDir: tmp, outputDir: tmp }),
    ).rejects.toThrow(/RAW_recipes/);
  });
});
