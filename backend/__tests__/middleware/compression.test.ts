// P1: response compression middleware tests.
//
// Verifies:
//   - gzip is applied when client accepts it and payload exceeds threshold
//   - small payloads below threshold are not compressed
//   - clients that don't request gzip get an uncompressed response
//   - app.ts wires compression() before route mounting

import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
import compression from 'compression';

function makeAppWithLargeJson() {
  const app = express();
  app.use(compression({ threshold: 1024 }));
  // Build a payload comfortably above threshold (~10KB).
  const payload = {
    items: Array.from({ length: 200 }, (_, i) => ({
      id: i,
      name: `recipe-${i}`,
      description: 'a longish description that ensures the body exceeds the gzip threshold',
    })),
  };
  app.get('/big', (_req, res) => {
    res.json(payload);
  });
  app.get('/tiny', (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('P1: response compression middleware', () => {
  it('compresses JSON responses larger than the threshold when client accepts gzip', async () => {
    const app = makeAppWithLargeJson();
    const res = await request(app).get('/big').set('Accept-Encoding', 'gzip');
    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
  });

  it('does not compress responses below the threshold', async () => {
    const app = makeAppWithLargeJson();
    const res = await request(app).get('/tiny').set('Accept-Encoding', 'gzip');
    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBeUndefined();
  });

  it('does not compress when client does not request gzip', async () => {
    const app = makeAppWithLargeJson();
    const res = await request(app).get('/big').set('Accept-Encoding', 'identity');
    expect(res.status).toBe(200);
    expect(res.headers['content-encoding']).toBeUndefined();
  });

  it('app.ts wires compression() before route mounting', () => {
    const appSrc = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'app.ts'),
      'utf8'
    );
    expect(appSrc).toMatch(/import\s+compression\s+from\s+['"]compression['"]/);
    const compressionUse = appSrc.indexOf('app.use(compression(');
    const firstApiMount = appSrc.indexOf("app.use('/api");
    expect(compressionUse).toBeGreaterThan(-1);
    expect(firstApiMount).toBeGreaterThan(-1);
    expect(compressionUse).toBeLessThan(firstApiMount);
  });
});
