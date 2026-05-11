// U8: Cache-Control on heavy read endpoints.
//
// Beyond `/uploads` (P7), zero `Cache-Control` headers ship on backend read
// routes — repeat app-opens re-hit the DB unconditionally. U8 adds a short
// private cache to the heaviest GET routes; this test pins both the
// middleware behavior and the wired routes so a refactor can't silently
// drop the header.

import request from 'supertest';
import express from 'express';
import {
  cacheControl,
  shortPrivateCache,
  mediumPrivateCache,
} from '../../src/middleware/cacheControl';

describe('U8: cacheControl middleware', () => {
  it('default options emit private + 60s max-age + 5min SWR', async () => {
    const app = express();
    app.get('/x', cacheControl(), (_req, res) => res.json({ ok: true }));
    const res = await request(app).get('/x');
    expect(res.headers['cache-control']).toBe(
      'private, max-age=60, stale-while-revalidate=300',
    );
  });

  it('shortPrivateCache convenience: 60s / 300s SWR / private', async () => {
    const app = express();
    app.get('/x', shortPrivateCache, (_req, res) => res.json({ ok: true }));
    const res = await request(app).get('/x');
    expect(res.headers['cache-control']).toBe(
      'private, max-age=60, stale-while-revalidate=300',
    );
  });

  it('mediumPrivateCache convenience: 5min / 30min SWR / private', async () => {
    const app = express();
    app.get('/x', mediumPrivateCache, (_req, res) => res.json({ ok: true }));
    const res = await request(app).get('/x');
    expect(res.headers['cache-control']).toBe(
      `private, max-age=${5 * 60}, stale-while-revalidate=${30 * 60}`,
    );
  });

  it('custom options override defaults', async () => {
    const app = express();
    app.get(
      '/x',
      cacheControl({ maxAge: 10, staleWhileRevalidate: 20, visibility: 'public' }),
      (_req, res) => res.json({ ok: true }),
    );
    const res = await request(app).get('/x');
    expect(res.headers['cache-control']).toBe(
      'public, max-age=10, stale-while-revalidate=20',
    );
  });
});

describe('U8: heavy read routes set Cache-Control', () => {
  // Source-text check rather than supertest: the heavy routes pull in
  // controllers with prisma dependencies — too much mock surface for a
  // header assertion. Static check: the route file mentions the cache
  // middleware on the right path.
  const { readFileSync } = require('fs');
  const path = require('path');
  const ROOT = path.resolve(__dirname, '../..');

  const CACHED_ROUTES: Array<{ file: string; route: string }> = [
    { file: 'src/modules/recipe/recipeRoutes.ts', route: 'home-feed' },
    { file: 'src/modules/recipe/recipeRoutes.ts', route: 'recipe-of-the-day' },
    { file: 'src/modules/today/todayRoutes.ts', route: 'activation' },
    { file: 'src/modules/today/todayRoutes.ts', route: 'coverage' },
    { file: 'src/modules/today/todayRoutes.ts', route: 'reverse-discovery' },
  ];

  it.each(CACHED_ROUTES)(
    'route /$route in $file uses a cacheControl middleware',
    ({ file, route }) => {
      const src = readFileSync(path.join(ROOT, file), 'utf8');
      // Find the router.get(...) line for this route and check it has a
      // *PrivateCache or cacheControl handler before the controller.
      const lineRe = new RegExp(
        String.raw`router\.get\(\s*['"]\/${route}['"]\s*,\s*([^,)]+)`,
      );
      const m = src.match(lineRe);
      expect(m).not.toBeNull();
      const handler = (m as RegExpMatchArray)[1].trim();
      expect(handler).toMatch(/PrivateCache|cacheControl/);
    },
  );
});
