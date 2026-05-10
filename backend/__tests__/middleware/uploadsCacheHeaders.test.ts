// P7: /uploads static-asset cache headers.
//
// Verifies:
//   - GET /uploads/<file> returns long-lived Cache-Control with immutable
//   - ETag header is present (for If-None-Match revalidation)
//   - app.ts wires express.static for /uploads with the cache options
//
// User-uploaded images live under content-addressable paths (Cloudinary IDs
// + multer-generated filenames) so immutable caching is safe — the URL
// changes when the content changes.

import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';

function makeAppWithStaticUploads(uploadsDir: string) {
  const app = express();
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      maxAge: '7d',
      etag: true,
      lastModified: true,
      immutable: true,
    }),
  );
  return app;
}

describe('P7: /uploads cache headers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sazon-uploads-test-'));
  const fixtureName = 'fixture.png';
  const fixturePath = path.join(tmpDir, fixtureName);

  beforeAll(() => {
    // Tiny PNG-ish payload — just enough to be served.
    fs.writeFileSync(fixturePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]));
  });

  afterAll(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('serves /uploads/<file> with long-lived immutable Cache-Control', async () => {
    const app = makeAppWithStaticUploads(tmpDir);
    const res = await request(app).get(`/uploads/${fixtureName}`);
    expect(res.status).toBe(200);
    const cc = res.headers['cache-control'] ?? '';
    expect(cc).toMatch(/max-age=604800/);
    expect(cc).toMatch(/immutable/);
  });

  it('serves /uploads/<file> with an ETag header for revalidation', async () => {
    const app = makeAppWithStaticUploads(tmpDir);
    const res = await request(app).get(`/uploads/${fixtureName}`);
    expect(res.status).toBe(200);
    expect(res.headers['etag']).toBeTruthy();
  });

  it('app.ts wires express.static for /uploads with cache options', () => {
    const appSrc = fs.readFileSync(
      path.join(__dirname, '..', '..', 'src', 'app.ts'),
      'utf8'
    );
    const uploadsLine = appSrc.match(/app\.use\(\s*['"]\/uploads['"][\s\S]*?\)\);/);
    expect(uploadsLine).not.toBeNull();
    const block = uploadsLine![0];
    expect(block).toMatch(/maxAge\s*:/);
    expect(block).toMatch(/immutable\s*:\s*true/);
    expect(block).toMatch(/etag\s*:\s*true/);
  });
});
