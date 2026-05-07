// frontend/__tests__/design/landingParity.test.ts
// ROADMAP 4.0 DS9.1 + DS9.2 — landing site shares the canonical color source.

import * as fs from 'fs';
import * as path from 'path';

const colorTokens = require('../../constants/colorTokens.cjs');

describe('DS9.1 — landing/tailwind.config.ts consumes the shared color source', () => {
  const configPath = path.resolve(__dirname, '..', '..', 'landing', 'tailwind.config.ts');

  it('imports from frontend/constants/colorTokens.cjs (single source of truth)', () => {
    const src = fs.readFileSync(configPath, 'utf-8');
    expect(src).toMatch(/require\(['"]\.\.\/constants\/colorTokens\.cjs['"]\)/);
  });

  it('does not hardcode the canonical brand-coral hex literal', () => {
    const src = fs.readFileSync(configPath, 'utf-8');
    // Strip comments before scanning so the doc-section above doesn't trigger.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\*[^\n]*$/gm, '')
      .replace(/\/\/[^\n]*/g, '');
    // Inline brand-coral hex banned outside the token files.
    expect(code).not.toMatch(/['"]#fa7e12['"]/i);
  });

  it('brand.500 in landing matches Brand.light.base from the app', () => {
    // This test loads the .ts config via tsx-style runtime (jest's babel
    // transform). If that path breaks, the test still surfaces a meaningful
    // signal — the contract is "landing brand-500 === colorTokens.Brand.light.base".
    // Direct lookup against the source map: the config file path uses
    // the canonical token; assert by string match in the config.
    const src = fs.readFileSync(configPath, 'utf-8');
    expect(src).toMatch(/'500':\s*base/);
    // And `base` is unambiguously assigned from the shared token.
    expect(src).toMatch(/const\s+base\s*=\s*t\.Brand\.light\.base/);
  });

  it('pastel namespace in landing maps to PastelTokens.light per key', () => {
    const src = fs.readFileSync(configPath, 'utf-8');
    for (const key of ['peach', 'sage', 'lavender', 'sky', 'blush', 'golden']) {
      expect(src).toMatch(new RegExp(`${key}:\\s*t\\.PastelTokens\\.light\\.${key}`));
    }
  });

  it('surface.cream in landing aliases Canvas.warmLight (DS2.2 — Today canvas)', () => {
    const src = fs.readFileSync(configPath, 'utf-8');
    expect(src).toMatch(/cream:\s*t\.Canvas\.warmLight/);
  });

  it('canonical pastel values are reachable from the colorTokens.cjs export', () => {
    // Smoke check: the source the landing config depends on actually exists.
    expect(colorTokens.PastelTokens.light.peach).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(colorTokens.PastelTokens.light.sage).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(colorTokens.Brand.light.base).toMatch(/^#[0-9A-Fa-f]{6}$/i);
    expect(colorTokens.Canvas.warmLight).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
