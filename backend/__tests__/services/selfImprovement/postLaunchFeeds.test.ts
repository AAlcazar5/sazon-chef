// Tier M4 — post-launch feed tests.
//   Feed 4 — review scanner (AppFollow → cluster → markdown)
//   Feed 8 — coach query patterns (Coach → meta-only aggregation)
//
// Every test uses fixtures + injected stubs. No live API or DB.

import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  runReviewScannerFeed,
  fetchAppFollowReviews,
  heuristicCluster,
  renderReviewsMarkdown,
  type RawReview,
  type ClusteredReview,
} from '../../../src/services/selfImprovement/feeds/reviewScannerFeed';

import {
  runCoachPatternsFeed,
  heuristicIntent,
  hasAttachedRecipe,
  buildMeta,
  renderCoachPatternsMarkdown,
  type RawCoachQuery,
  type CoachIntent,
} from '../../../src/services/selfImprovement/feeds/coachPatternsFeed';

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'self-improvement-m4-'));
  delete process.env.APPFOLLOW_API_KEY;
  delete process.env.SELF_IMPROVEMENT_ENGINE_ENABLED;
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feed 4 — review scanner
// ─────────────────────────────────────────────────────────────────────────────

describe('M4 / Feed 4 — review scanner', () => {
  describe('fetchAppFollowReviews', () => {
    it('returns [] when APPFOLLOW_API_KEY is unset', async () => {
      const fakeFetch = jest.fn();
      const out = await fetchAppFollowReviews(['app1'], fakeFetch as any);
      expect(out).toEqual([]);
      expect(fakeFetch).not.toHaveBeenCalled();
    });

    it('returns [] on apps=[]', async () => {
      process.env.APPFOLLOW_API_KEY = 'k';
      const fakeFetch = jest.fn();
      const out = await fetchAppFollowReviews([], fakeFetch as any);
      expect(out).toEqual([]);
      expect(fakeFetch).not.toHaveBeenCalled();
    });

    it('skips an app on a 4xx response, continues with the next', async () => {
      process.env.APPFOLLOW_API_KEY = 'k';
      const fakeFetch = jest.fn(async (url: string) => {
        if (url.includes('app1')) {
          return { ok: false, status: 403, json: async () => ({}) } as any;
        }
        return {
          ok: true,
          json: async () => ({
            list: [
              {
                review_id: 'r1',
                store: 'ios',
                rating: 5,
                title: 'Love it',
                content: 'Great app',
                author: 'alice',
                updated: '2026-05-01T12:00:00Z',
              },
            ],
          }),
        } as any;
      });
      const out = await fetchAppFollowReviews(['app1', 'app2'], fakeFetch as any);
      expect(out.length).toBe(1);
      expect(out[0].reviewId).toBe('r1');
    });

    it('truncates body at 4000 chars and clamps title at 200', async () => {
      process.env.APPFOLLOW_API_KEY = 'k';
      const longBody = 'a'.repeat(5000);
      const longTitle = 'b'.repeat(500);
      const fakeFetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          list: [
            {
              review_id: 'r1',
              store: 'ios',
              rating: 4,
              title: longTitle,
              content: longBody,
              author: 'a',
              updated: '2026-05-01',
            },
          ],
        }),
      })) as any;
      const out = await fetchAppFollowReviews(['app1'], fakeFetch);
      expect(out[0].title.length).toBe(200);
      expect(out[0].body.length).toBe(4000);
    });
  });

  describe('heuristicCluster — clustering tags correctly assigned to fixture reviews', () => {
    const make = (over: Partial<RawReview>): RawReview => ({
      app: 'app',
      store: 'ios',
      reviewId: 'r',
      rating: 3,
      title: '',
      body: '',
      author: '',
      publishedAt: '',
      ...over,
    });

    it('low rating + crash language → bug', () => {
      expect(heuristicCluster(make({ rating: 1, body: 'It crashes every time' }))).toBe('bug');
    });

    it('high rating + love language → praise', () => {
      expect(heuristicCluster(make({ rating: 5, body: 'I love this app, it is amazing' }))).toBe(
        'praise',
      );
    });

    it('low/mid rating + macro-cult language → persona_complaint', () => {
      expect(heuristicCluster(make({ rating: 2, body: 'No macro tracking? Useless for cut.' }))).toBe(
        'persona_complaint',
      );
    });

    it('any rating + feature-request language → feature_request', () => {
      expect(
        heuristicCluster(make({ rating: 4, body: 'Please add a meal planner feature' })),
      ).toBe('feature_request');
    });

    it('rating 3 + neutral body → unclassified', () => {
      expect(heuristicCluster(make({ rating: 3, body: 'It is fine' }))).toBe('unclassified');
    });
  });

  describe('runReviewScannerFeed (end-to-end with fixtures)', () => {
    it('writes the daily markdown file with cluster counts when reviews exist', async () => {
      process.env.APPFOLLOW_API_KEY = 'k';
      const fakeFetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          list: [
            {
              review_id: 'r1',
              store: 'ios',
              rating: 5,
              title: 'Love it',
              content: 'Amazing app, beautiful design',
              author: 'a',
              updated: '2026-05-01',
            },
            {
              review_id: 'r2',
              store: 'android',
              rating: 1,
              title: 'Crash',
              content: 'Crashes on launch every time',
              author: 'b',
              updated: '2026-05-01',
            },
          ],
        }),
      })) as any;

      const result = await runReviewScannerFeed(['app1'], {
        fetchFn: fakeFetch,
        now: () => new Date('2026-05-10T00:00:00Z'),
        outputRoot: tmpRoot,
      });

      expect(result.status).toBe('ok');
      expect(result.itemCount).toBe(2);
      expect(result.outputPath).toBe(path.join(tmpRoot, 'reviews', '2026-05-10.md'));
      const md = fs.readFileSync(result.outputPath as string, 'utf-8');
      expect(md).toMatch(/feed: reviews/);
      expect(md).toMatch(/\*\*praise\*\*: 1/);
      expect(md).toMatch(/\*\*bug\*\*: 1/);
    });

    it('writes a "no reviews" stub on empty AppFollow response, status=skipped', async () => {
      process.env.APPFOLLOW_API_KEY = 'k';
      const fakeFetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ list: [] }),
      })) as any;

      const result = await runReviewScannerFeed(['app1'], {
        fetchFn: fakeFetch,
        now: () => new Date('2026-05-10T00:00:00Z'),
        outputRoot: tmpRoot,
      });

      expect(result.status).toBe('skipped');
      expect(result.itemCount).toBe(0);
      const md = fs.readFileSync(result.outputPath as string, 'utf-8');
      expect(md).toMatch(/_No reviews/);
    });

    it('renderReviewsMarkdown matches Feed 4 schema (frontmatter + cluster sections)', () => {
      const reviews: ClusteredReview[] = [
        {
          app: 'app1',
          store: 'ios',
          reviewId: 'r',
          rating: 5,
          title: 'love',
          body: 'amazing',
          author: 'a',
          publishedAt: '2026-05-01',
          cluster: 'praise',
        },
      ];
      const md = renderReviewsMarkdown(reviews, new Date('2026-05-10T00:00:00Z'));
      expect(md).toMatch(/^---\nfeed: reviews\ndate: 2026-05-10\nitem_count: 1\n---/);
      expect(md).toMatch(/## praise/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feed 8 — coach query patterns
// ─────────────────────────────────────────────────────────────────────────────

describe('M4 / Feed 8 — coach query patterns', () => {
  describe('heuristicIntent', () => {
    it.each<[string, CoachIntent]>([
      ['can i swap chicken for tofu?', 'ingredient_swap'],
      ['how much protein in this?', 'macro_question'],
      ['plan my week', 'meal_plan_help'],
      ['how do i braise short ribs', 'cooking_technique'],
      ['what should i cook tonight', 'recipe_idea'],
      ['hi', 'small_talk'],
      ['xyzqq', 'unclassified'],
    ])('classifies %p as %s', (body, expected) => {
      expect(heuristicIntent(body)).toBe(expected);
    });
  });

  describe('hasAttachedRecipe', () => {
    it('detects type=recipe attachments', () => {
      expect(hasAttachedRecipe('[{"type":"recipe","id":"abc"}]')).toBe(true);
    });
    it('detects recipeId-keyed attachments', () => {
      expect(hasAttachedRecipe('[{"recipeId":"abc"}]')).toBe(true);
    });
    it('returns false on photo-only attachments', () => {
      expect(hasAttachedRecipe('[{"type":"photo","url":"x"}]')).toBe(false);
    });
    it('returns false on undefined / non-JSON / non-array', () => {
      expect(hasAttachedRecipe(undefined)).toBe(false);
      expect(hasAttachedRecipe('not-json')).toBe(false);
      expect(hasAttachedRecipe('{}')).toBe(false);
    });
  });

  describe('buildMeta — body NEVER survives', () => {
    it('output has only charCount/hasAttachedRecipe/intent/hour fields', () => {
      const meta = buildMeta(
        {
          body: 'I want to lose weight',
          attachments: '[]',
          createdAt: new Date('2026-05-10T14:30:00Z'),
        },
        'macro_question',
      );
      expect(meta).toEqual({
        charCount: 21,
        hasAttachedRecipe: false,
        intent: 'macro_question',
        hour: 14,
      });
      // No body string present anywhere:
      expect((meta as any).body).toBeUndefined();
      expect(JSON.stringify(meta)).not.toMatch(/lose weight/);
    });
  });

  describe('renderCoachPatternsMarkdown — body NEVER appears in output', () => {
    it('output for fixture with body "I want to lose weight" produces NO body string', () => {
      // Per spec: body "I want to lose weight" must produce output with no
      // body string. Intent classification is incidental — the privacy
      // guardrail is the contract here. (This body falls through to
      // `unclassified` since it has no macro/recipe/cooking-technique tokens.)
      const queries: RawCoachQuery[] = [
        {
          body: 'I want to lose weight',
          attachments: '[]',
          createdAt: new Date('2026-05-10T08:00:00Z'),
        },
      ];
      const intents: CoachIntent[] = [heuristicIntent(queries[0].body)];
      const meta = queries.map((q, i) => buildMeta(q, intents[i]));
      const md = renderCoachPatternsMarkdown(meta, new Date('2026-05-10'), 7);
      // Privacy guardrail — body must NOT survive into the output.
      expect(md).not.toMatch(/lose weight/i);
      expect(md).not.toMatch(/i want/i);
      // Some intent label must appear (any of the cluster labels).
      expect(md).toMatch(/(recipe_idea|macro_question|ingredient_swap|meal_plan_help|cooking_technique|small_talk|unclassified)/);
      expect(md).toMatch(/privacy: meta-only/);
    });

    it('renders intent histogram + length distribution + recipe rate + time-of-day', () => {
      const queries: RawCoachQuery[] = [
        { body: 'swap rice for cauli', attachments: '[]', createdAt: new Date('2026-05-10T08:00:00Z') },
        { body: 'how much protein', attachments: '[]', createdAt: new Date('2026-05-10T13:00:00Z') },
        { body: 'a'.repeat(300), attachments: '[{"type":"recipe","id":"x"}]', createdAt: new Date('2026-05-10T22:00:00Z') },
      ];
      const intents = queries.map((q) => heuristicIntent(q.body));
      const meta = queries.map((q, i) => buildMeta(q, intents[i]));
      const md = renderCoachPatternsMarkdown(meta, new Date('2026-05-10'), 7);
      expect(md).toMatch(/## Intent histogram/);
      expect(md).toMatch(/## Length distribution/);
      expect(md).toMatch(/## Recipe attachments/);
      expect(md).toMatch(/## Time of day/);
      expect(md).toMatch(/1 of 3 queries \(33%\) had a recipe attached/);
    });

    it('renders the no-traffic stub when empty', () => {
      const md = renderCoachPatternsMarkdown([], new Date('2026-05-10'), 7);
      expect(md).toMatch(/_No queries in window/);
    });
  });

  describe('runCoachPatternsFeed (end-to-end with fixtures)', () => {
    it('writes a markdown file with meta-only output; body string is NOT in the file', async () => {
      const queries: RawCoachQuery[] = [
        { body: 'I want to cut 10 pounds — what should I eat?', attachments: '[]', createdAt: new Date('2026-05-09T08:00:00Z') },
        { body: 'swap chicken for tofu in this', attachments: '[{"type":"recipe","id":"r1"}]', createdAt: new Date('2026-05-10T12:00:00Z') },
      ];

      const result = await runCoachPatternsFeed({
        fetchQueries: async () => queries,
        now: () => new Date('2026-05-10T00:00:00Z'),
        outputRoot: tmpRoot,
      });

      expect(result.status).toBe('ok');
      expect(result.itemCount).toBe(2);
      const md = fs.readFileSync(result.outputPath as string, 'utf-8');
      // Privacy guardrail — fixture body strings MUST NOT appear in output.
      expect(md).not.toMatch(/cut 10 pounds/);
      expect(md).not.toMatch(/chicken for tofu/);
      // Meta should be present.
      expect(md).toMatch(/feed: coach-patterns/);
      expect(md).toMatch(/privacy: meta-only/);
      expect(md).toMatch(/ingredient_swap/);
    });

    it('respects the kill switch — SELF_IMPROVEMENT_ENGINE_ENABLED=false short-circuits before any DB read', async () => {
      process.env.SELF_IMPROVEMENT_ENGINE_ENABLED = 'false';
      const fetchQueries = jest.fn();

      const result = await runCoachPatternsFeed({
        fetchQueries: fetchQueries as any,
        outputRoot: tmpRoot,
      });

      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('kill-switch');
      expect(fetchQueries).not.toHaveBeenCalled();
    });

    it('writes a "no traffic" stub when fetchQueries returns []', async () => {
      const result = await runCoachPatternsFeed({
        fetchQueries: async () => [],
        now: () => new Date('2026-05-10T00:00:00Z'),
        outputRoot: tmpRoot,
      });
      expect(result.status).toBe('skipped');
      expect(result.itemCount).toBe(0);
      const md = fs.readFileSync(result.outputPath as string, 'utf-8');
      expect(md).toMatch(/_No queries in window/);
    });

    it('falls back to unclassified on cluster error rather than corrupting histogram', async () => {
      const queries: RawCoachQuery[] = [
        { body: 'something', attachments: '[]', createdAt: new Date('2026-05-10T08:00:00Z') },
      ];
      const result = await runCoachPatternsFeed({
        fetchQueries: async () => queries,
        clusterFn: async () => {
          throw new Error('LLM unavailable');
        },
        now: () => new Date('2026-05-10T00:00:00Z'),
        outputRoot: tmpRoot,
      });
      expect(result.status).toBe('ok');
      const md = fs.readFileSync(result.outputPath as string, 'utf-8');
      expect(md).toMatch(/unclassified/);
    });
  });
});
