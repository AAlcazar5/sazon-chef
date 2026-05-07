// ROADMAP 4.0 N9.1 — Cap test: every C12 notification template is enumerated
// in the frontend deep-link surface map.
//
// New templates fail this test until they register a target surface in
// frontend/lib/notificationDeepLink.ts. This is the contract that prevents
// notifications from firing without a confirming in-app surface.

import * as fs from 'fs';
import * as path from 'path';

const C12_SOURCE = path.resolve(
  __dirname,
  '../../src/services/adaptiveNotificationService.ts',
);
const FRONTEND_MAP = path.resolve(
  __dirname,
  '../../../frontend/lib/notificationDeepLink.ts',
);

function readFile(p: string): string {
  return fs.readFileSync(p, 'utf-8');
}

/**
 * Extract the NotificationTemplate union from C12 source. The union is
 * declared as `export type NotificationTemplate = | 'a' | 'b' | ...;`.
 */
function extractC12Templates(): string[] {
  const src = readFile(C12_SOURCE);
  // Match the union body
  const m = src.match(
    /export\s+type\s+NotificationTemplate\s*=([\s\S]*?);/,
  );
  if (!m) throw new Error('cap test: NotificationTemplate union not found');
  const body = m[1];
  const tokens = body.match(/'([^']+)'/g) ?? [];
  return tokens.map((t) => t.slice(1, -1));
}

/**
 * Extract the keys of SURFACE_MAP from the frontend file.
 */
function extractFrontendMappedKeys(): string[] {
  const src = readFile(FRONTEND_MAP);
  const m = src.match(
    /SURFACE_MAP\s*:\s*Record<NotificationTemplate,\s*DeepLinkTarget>\s*=\s*{([\s\S]*?)\n};/,
  );
  if (!m) throw new Error('cap test: SURFACE_MAP literal not found');
  const body = m[1];
  // Match keys like `'expiring-pantry':` (single-quoted) at the start of a body line
  const keys = [...body.matchAll(/^\s*'([^']+)'\s*:/gm)];
  return keys.map((k) => k[1]);
}

describe('N9.1 — every C12 template maps to an in-app surface', () => {
  it('frontend SURFACE_MAP exists', () => {
    expect(fs.existsSync(FRONTEND_MAP)).toBe(true);
  });

  it('every C12 NotificationTemplate is enumerated in the frontend SURFACE_MAP', () => {
    const c12 = extractC12Templates();
    const mapped = new Set(extractFrontendMappedKeys());
    expect(c12.length).toBeGreaterThan(0);
    const missing = c12.filter((t) => !mapped.has(t));
    if (missing.length > 0) {
      throw new Error(
        `N9.1: these C12 templates have no in-app surface mapping — add them to ` +
          `frontend/lib/notificationDeepLink.ts SURFACE_MAP:\n` +
          missing.map((m) => `  - ${m}`).join('\n'),
      );
    }
  });

  it('frontend map covers at least the 4 shipped C12 templates', () => {
    const mapped = new Set(extractFrontendMappedKeys());
    expect(mapped.has('expiring-pantry')).toBe(true);
    expect(mapped.has('no-plan-tonight')).toBe(true);
    expect(mapped.has('fiber-gap')).toBe(true);
    expect(mapped.has('low-variety')).toBe(true);
  });

  it('frontend map also covers planned templates (forward-compat)', () => {
    const mapped = new Set(extractFrontendMappedKeys());
    expect(mapped.has('running-low')).toBe(true);
    expect(mapped.has('week-recap')).toBe(true);
    expect(mapped.has('near-miss-discovery')).toBe(true);
    expect(mapped.has('pantry-iq-weekly')).toBe(true);
    expect(mapped.has('nutrient-gap')).toBe(true);
  });
});
