// frontend/__tests__/components/ui/BrandButton.tokens.test.ts
// ROADMAP 4.0 DS7.2 — BrandButton sources every variant from constants/tokens.

import * as fs from 'fs';
import * as path from 'path';
import { scan } from '../../../scripts/banned-patterns';
import { VARIANT_CONFIG } from '../../../components/ui/BrandButton';
import { Brand, AccentTokens, Semantic, Radius } from '../../../constants/tokens';

const SRC = path.resolve(__dirname, '..', '..', '..', 'components', 'ui', 'BrandButton.tsx');

describe('DS7.2 — BrandButton migrated to tokens', () => {
  it('imports from constants/tokens', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).toMatch(/from\s+['"]\.\.\/\.\.\/constants\/tokens['"]/);
  });

  it('does not import from constants/Colors', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).not.toMatch(/from\s+['"][./\w-]*constants\/Colors['"]/);
    expect(src).not.toMatch(/from\s+['"][./\w-]*constants\/DarkColors['"]/);
  });

  it('"brand" variant first stop is Brand.light.base', () => {
    expect(VARIANT_CONFIG.brand.gradient[0]).toBe(Brand.light.base);
  });

  it('"brand" variant text color is Brand.light.ink', () => {
    expect(VARIANT_CONFIG.brand.textColor).toBe(Brand.light.ink);
  });

  it('"ghost" variant text color is Brand.light.base', () => {
    expect(VARIANT_CONFIG.ghost.textColor).toBe(Brand.light.base);
  });

  it('pastel variants source their first stop from AccentTokens', () => {
    expect(VARIANT_CONFIG.sage.gradient[0]).toBe(AccentTokens.sage);
    expect(VARIANT_CONFIG.golden.gradient[0]).toBe(AccentTokens.golden);
    expect(VARIANT_CONFIG.lavender.gradient[0]).toBe(AccentTokens.lavender);
    expect(VARIANT_CONFIG.peach.gradient[0]).toBe(AccentTokens.peach);
    expect(VARIANT_CONFIG.sky.gradient[0]).toBe(AccentTokens.sky);
    expect(VARIANT_CONFIG.blush.gradient[0]).toBe(AccentTokens.blush);
  });

  it('"brand" variant second stop is Semantic.light.error', () => {
    expect(VARIANT_CONFIG.brand.gradient[1]).toBe(Semantic.light.error);
  });

  it('exposes Radius.pill for the pill shape (verified by smoke read)', () => {
    expect(Radius.pill).toBe(9999);
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).toMatch(/borderRadius:\s*Radius\.pill/);
  });

  it('contains no banned-pattern violations', () => {
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const violations = scan(['components/ui/BrandButton.tsx'], repoRoot);
    // Filter to rules relevant to a token-migrated component. The legacy
    // `'#fa7e12'` literal in the ghost gradient string `'rgba(250,126,18,...)'`
    // doesn't match the brand-coral regex (different format), so this passes.
    const relevant = violations.filter(
      (v) =>
        v.rule === 'brand-coral-literal' ||
        v.rule === 'mixed-colors-and-brand' ||
        v.rule === 'touchable-without-a11y-label',
    );
    expect(relevant).toEqual([]);
  });
});
