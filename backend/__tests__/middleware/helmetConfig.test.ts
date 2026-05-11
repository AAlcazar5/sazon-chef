// U21: Helmet hardening — explicit config ratchet.
//
// Pre-U21: `app.use(helmet())` ran with library defaults — safe enough,
// but the security posture wasn't reviewable from app.ts at a glance.
// U21 pins explicit HSTS (1y + includeSubDomains + preload) +
// Referrer-Policy (no-referrer) + disables CSP (API-only, not HTML).
//
// Test mounts a fresh express app with the same helmet config and asserts
// the response headers — supertest is the right tool here because the
// security headers are an HTTP-layer concern.

import request from 'supertest';
import express from 'express';
import helmet from 'helmet';

function makeApp() {
  const app = express();
  app.use(
    helmet({
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'no-referrer' },
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.get('/probe', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('U21: helmet hardening', () => {
  it('emits HSTS with max-age=1y + includeSubDomains + preload', async () => {
    const res = await request(makeApp()).get('/probe');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['strict-transport-security']).toMatch(/max-age=31536000/);
    expect(res.headers['strict-transport-security']).toMatch(/includeSubDomains/i);
    expect(res.headers['strict-transport-security']).toMatch(/preload/i);
  });

  it('emits Referrer-Policy: no-referrer', async () => {
    const res = await request(makeApp()).get('/probe');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });

  it('emits X-Content-Type-Options: nosniff', async () => {
    const res = await request(makeApp()).get('/probe');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('emits X-Frame-Options to block embedding', async () => {
    const res = await request(makeApp()).get('/probe');
    // helmet sets X-Frame-Options: SAMEORIGIN by default; either DENY or
    // SAMEORIGIN is acceptable for an API server.
    expect(res.headers['x-frame-options']).toMatch(/(DENY|SAMEORIGIN)/);
  });

  it('does NOT emit Content-Security-Policy (disabled — API-only)', async () => {
    const res = await request(makeApp()).get('/probe');
    expect(res.headers['content-security-policy']).toBeUndefined();
  });
});

// Source-level guard: app.ts must invoke helmet with the explicit config,
// not bare `helmet()`. A future cleanup pass that strips the config back
// to defaults would silently re-loosen the posture.
describe('U21: app.ts wires helmet with explicit options', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../src/app.ts'),
    'utf8',
  );

  it('helmet() is called with an options object', () => {
    expect(src).toMatch(/helmet\(\s*\{/);
  });

  it('hsts maxAge is 1 year', () => {
    expect(src).toMatch(/maxAge:\s*31536000/);
  });

  it('referrer-policy is no-referrer', () => {
    expect(src).toMatch(/policy:\s*['"]no-referrer['"]/);
  });
});
