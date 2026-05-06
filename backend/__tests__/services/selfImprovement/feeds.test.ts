// backend/__tests__/services/selfImprovement/feeds.test.ts
// Tier M1 — three free observation feeds. Each parser produces schema-valid
// markdown from fixture inputs; recipe-gap audit math is correct against a
// mock prisma; RSS fetcher handles 404/timeout gracefully; cost-cap stays
// at zero (no LLM by default).

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  fetchAppFollowReleases,
  renderReleasesMarkdown,
  runCompetitorReleasesFeed,
  ReleaseNote,
} from '../../../src/services/selfImprovement/feeds/competitorReleasesFeed';
import {
  buildCuisineRows,
  renderRecipeGapMarkdown,
  runRecipeGapAuditFeed,
} from '../../../src/services/selfImprovement/feeds/recipeGapAuditFeed';
import {
  parseRss,
  pullRss,
  renderTrendsMarkdown,
  runFoodMediaTrendsFeed,
} from '../../../src/services/selfImprovement/feeds/foodMediaTrendsFeed';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sazon-feeds-'));
}

const FIXED = new Date('2026-05-06T12:00:00Z');

describe('M1 — Competitor releases feed', () => {
  beforeEach(() => {
    delete process.env.APPFOLLOW_API_KEY;
  });

  it('fetchAppFollowReleases returns empty when no API key', async () => {
    const fakeFetch = jest.fn();
    const out = await fetchAppFollowReleases(['app1'], fakeFetch as any);
    expect(out).toEqual([]);
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it('fetchAppFollowReleases parses AppFollow response shape', async () => {
    process.env.APPFOLLOW_API_KEY = 'test';
    const fakeFetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        list: [
          {
            version: '4.2.1',
            published_at: '2026-05-04T10:00:00Z',
            release_notes: 'Added meal plan templates.',
          },
        ],
      }),
    }));
    const out = await fetchAppFollowReleases(['nyt-cooking'], fakeFetch as any);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      app: 'nyt-cooking',
      version: '4.2.1',
      notes: 'Added meal plan templates.',
    });
  });

  it('fetchAppFollowReleases handles 4xx without throwing', async () => {
    process.env.APPFOLLOW_API_KEY = 'test';
    const fakeFetch = jest.fn(async () => ({ ok: false, status: 404 }));
    const out = await fetchAppFollowReleases(['x'], fakeFetch as any);
    expect(out).toEqual([]);
  });

  it('renderReleasesMarkdown emits required frontmatter', () => {
    const md = renderReleasesMarkdown(
      [
        {
          app: 'yummly',
          version: '8.0',
          publishedAt: '2026-05-01T00:00:00Z',
          notes: 'redesign',
        } as ReleaseNote,
      ],
      FIXED,
    );
    expect(md).toMatch(/^---\nfeed: competitor-releases/);
    expect(md).toMatch(/date: 2026-05-06/);
    expect(md).toMatch(/## yummly/);
  });

  it('runCompetitorReleasesFeed writes a file and returns ok status when releases present', async () => {
    process.env.APPFOLLOW_API_KEY = 'test';
    const dir = tmpDir();
    const fakeFetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        list: [{ version: '1.0', published_at: '2026-05-04', release_notes: 'x' }],
      }),
    }));
    const result = await runCompetitorReleasesFeed(['app'], {
      fetchFn: fakeFetch as any,
      now: () => FIXED,
      outputRoot: dir,
    });
    expect(result.status).toBe('ok');
    expect(result.itemCount).toBe(1);
    expect(result.tokenCost).toBe(0);
    expect(fs.existsSync(result.outputPath!)).toBe(true);
  });

  it('runCompetitorReleasesFeed returns skipped when unconfigured', async () => {
    const dir = tmpDir();
    const result = await runCompetitorReleasesFeed(['app'], {
      fetchFn: jest.fn() as any,
      now: () => FIXED,
      outputRoot: dir,
    });
    expect(result.status).toBe('skipped');
    expect(result.itemCount).toBe(0);
  });
});

describe('M1 — Recipe gap audit feed', () => {
  function mkPrisma(overrides: Partial<{
    recipes: any[];
    saved: any[];
    cooked: any[];
  }> = {}) {
    return {
      recipe: {
        findMany: jest.fn(async () => overrides.recipes ?? []),
      },
      savedRecipe: {
        findMany: jest.fn(async () => overrides.saved ?? []),
      },
      cookingLog: {
        findMany: jest.fn(async () => overrides.cooked ?? []),
      },
    };
  }

  it('buildCuisineRows aggregates counts + ratios correctly', async () => {
    const prisma = mkPrisma({
      recipes: [
        { id: 'r1', canonicalCuisine: 'italian', createdAt: new Date('2026-01-01T00:00:00Z') },
        { id: 'r2', canonicalCuisine: 'italian', createdAt: new Date('2026-04-01T00:00:00Z') },
        { id: 'r3', canonicalCuisine: 'persian', createdAt: new Date('2026-04-15T00:00:00Z') },
      ],
      saved: [
        { recipeId: 'r1', rating: 5 },
        { recipeId: 'r1', rating: 3 },
        { recipeId: 'r3', rating: null },
      ],
      cooked: [{ recipeId: 'r1' }, { recipeId: 'r1' }],
    });
    const rows = await buildCuisineRows(prisma, FIXED);
    const italian = rows.find((r) => r.cuisine === 'italian')!;
    expect(italian.recipeCount).toBe(2);
    expect(italian.saveCount).toBe(2);
    expect(italian.cookCount).toBe(2);
    expect(italian.avgRating).toBeCloseTo(4, 5);
    expect(italian.saveToCookRatio).toBeCloseTo(1, 5);
    const persian = rows.find((r) => r.cuisine === 'persian')!;
    expect(persian.recipeCount).toBe(1);
    expect(persian.avgRating).toBeNull();
  });

  it('buildCuisineRows folds null cuisine into "unknown"', async () => {
    const prisma = mkPrisma({
      recipes: [{ id: 'r1', canonicalCuisine: null, createdAt: new Date('2026-01-01') }],
    });
    const rows = await buildCuisineRows(prisma, FIXED);
    expect(rows.find((r) => r.cuisine === 'unknown')?.recipeCount).toBe(1);
  });

  it('renderRecipeGapMarkdown emits required schema and table', () => {
    const md = renderRecipeGapMarkdown(
      [
        {
          cuisine: 'persian',
          recipeCount: 8,
          avgRating: 4.5,
          ratingCount: 4,
          saveCount: 12,
          cookCount: 7,
          saveToCookRatio: 7 / 12,
          oldestAgeDays: 90,
        },
      ],
      FIXED,
    );
    expect(md).toMatch(/feed: recipe-gaps/);
    expect(md).toMatch(/\| Cuisine \| Recipes/);
    expect(md).toMatch(/persian/);
    expect(md).toMatch(/Thinnest cuisines/);
  });

  it('runRecipeGapAuditFeed writes a file and returns ok with zero token cost', async () => {
    const dir = tmpDir();
    const prisma = mkPrisma({
      recipes: [{ id: 'r1', canonicalCuisine: 'italian', createdAt: new Date('2026-01-01') }],
    });
    const result = await runRecipeGapAuditFeed(prisma, {
      now: () => FIXED,
      outputRoot: dir,
    });
    expect(result.status).toBe('ok');
    expect(result.tokenCost).toBe(0);
    expect(fs.existsSync(result.outputPath!)).toBe(true);
  });
});

describe('M1 — Food media trends feed', () => {
  it('parseRss extracts items from RSS 2.0 fixture', () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[Cottage cheese is having a moment]]></title>
          <link>https://example.com/a</link>
          <pubDate>Mon, 04 May 2026 09:00:00 GMT</pubDate>
        </item>
        <item>
          <title>Persian comfort foods</title>
          <link>https://example.com/b</link>
          <pubDate>Sun, 03 May 2026 12:00:00 GMT</pubDate>
        </item>
      </channel></rss>`;
    const items = parseRss(xml, 'TestSource');
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Cottage cheese is having a moment');
    expect(items[0].link).toBe('https://example.com/a');
    expect(items[1].source).toBe('TestSource');
  });

  it('parseRss handles Atom feeds', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Atom title</title>
        <link href="https://example.com/atom" />
        <published>2026-05-04T10:00:00Z</published>
      </entry>
    </feed>`;
    const items = parseRss(xml, 'AtomSource');
    expect(items).toHaveLength(1);
    expect(items[0].link).toBe('https://example.com/atom');
  });

  it('pullRss returns empty list on 404 without throwing', async () => {
    const fakeFetch = jest.fn(async () => ({ ok: false, status: 404 }));
    const items = await pullRss(
      { name: 'X', url: 'http://x' },
      fakeFetch as any,
      10,
    );
    expect(items).toEqual([]);
  });

  it('pullRss returns empty list on thrown error without propagating', async () => {
    const fakeFetch = jest.fn(async () => {
      throw new Error('timeout');
    });
    const items = await pullRss(
      { name: 'X', url: 'http://x' },
      fakeFetch as any,
      10,
    );
    expect(items).toEqual([]);
  });

  it('renderTrendsMarkdown emits required frontmatter', () => {
    const md = renderTrendsMarkdown(
      [{ source: 'BA', title: 'Title', link: 'http://x', pubDate: '' }],
      FIXED,
    );
    expect(md).toMatch(/feed: trends/);
    expect(md).toMatch(/## BA/);
  });

  it('runFoodMediaTrendsFeed writes file when sources return items', async () => {
    const dir = tmpDir();
    const fakeFetch = jest.fn(async () => ({
      ok: true,
      text: async () =>
        `<rss><channel><item><title>Hi</title><link>http://x</link></item></channel></rss>`,
    }));
    const result = await runFoodMediaTrendsFeed({
      fetchFn: fakeFetch as any,
      now: () => FIXED,
      outputRoot: dir,
      sources: [{ name: 'X', url: 'http://x' }],
    });
    expect(result.status).toBe('ok');
    expect(result.itemCount).toBe(1);
    expect(result.tokenCost).toBe(0);
  });

  it('runFoodMediaTrendsFeed cost stays under ceiling (no LLM by default)', async () => {
    const dir = tmpDir();
    const result = await runFoodMediaTrendsFeed({
      fetchFn: (async () => ({ ok: false, status: 500 })) as any,
      now: () => FIXED,
      outputRoot: dir,
      sources: [{ name: 'X', url: 'http://x' }],
    });
    expect(result.tokenCost).toBeLessThanOrEqual(0.5);
  });
});
