// frontend/__tests__/components/home/HomeHeader.tokens.test.ts
// ROADMAP 4.0 DS7.3 — HomeHeader sources from constants/tokens (validates
// DS2.2 canvas-warm rule at the most-seen surface).

import * as fs from 'fs';
import * as path from 'path';
import { scan } from '../../../scripts/banned-patterns';

const SRC = path.resolve(__dirname, '..', '..', '..', 'components', 'home', 'HomeHeader.tsx');

describe('DS7.3 — HomeHeader migrated to tokens', () => {
  it('imports from constants/tokens', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).toMatch(/from\s+['"]\.\.\/\.\.\/constants\/tokens['"]/);
  });

  it('does not import from constants/Colors / DarkColors', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).not.toMatch(/from\s+['"][./\w-]*constants\/Colors['"]/);
    expect(src).not.toMatch(/from\s+['"][./\w-]*constants\/DarkColors['"]/);
  });

  it('does not import EditorialFontFamily (legacy)', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\*[^\n]*$/gm, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/EditorialFontFamily/);
  });

  it('uses Radius.pill for the pill shape', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).toMatch(/borderRadius:\s*Radius\.pill/);
  });

  it('contains no banned-pattern violations', () => {
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const violations = scan(['components/home/HomeHeader.tsx'], repoRoot);
    expect(violations).toEqual([]);
  });
});
