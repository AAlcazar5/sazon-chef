// frontend/__tests__/components/today/NutritionStrip.tokens.test.ts
// ROADMAP 4.0 DS7.1 — reference-implementation purity test.
// NutritionStrip is the "this is what the new system looks like" demo;
// it must not reach for legacy color/font modules.

import * as fs from 'fs';
import * as path from 'path';
import { scan } from '../../../scripts/banned-patterns';

const SRC = path.resolve(__dirname, '..', '..', '..', 'components', 'today', 'NutritionStrip.tsx');

describe('DS7.1 — NutritionStrip migrated to tokens', () => {
  it('does not import from constants/Colors', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).not.toMatch(/from\s+['"][./\w-]*constants\/Colors['"]/);
    expect(src).not.toMatch(/from\s+['"][./\w-]*constants\/DarkColors['"]/);
  });

  it('does not import EditorialFontFamily (legacy typography module)', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    // Strip comments before scanning so doc-comments don't trigger.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\*[^\n]*$/gm, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/EditorialFontFamily/);
  });

  it('imports from constants/tokens (the new source of truth)', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).toMatch(/from\s+['"]\.\.\/\.\.\/constants\/tokens['"]/);
  });

  it('contains no inline brand-coral hex literals', () => {
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const violations = scan(['components/today/NutritionStrip.tsx'], repoRoot);
    const offenders = violations.filter((v) => v.rule === 'brand-coral-literal');
    expect(offenders).toEqual([]);
  });

  it('does not mix Colors and tokens imports in the same file', () => {
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const violations = scan(['components/today/NutritionStrip.tsx'], repoRoot);
    const offenders = violations.filter((v) => v.rule === 'mixed-colors-and-brand');
    expect(offenders).toEqual([]);
  });

  it('every interactive surface has accessibilityLabel or accessibilityRole', () => {
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const violations = scan(['components/today/NutritionStrip.tsx'], repoRoot);
    const offenders = violations.filter((v) => v.rule === 'touchable-without-a11y-label');
    expect(offenders).toEqual([]);
  });
});
