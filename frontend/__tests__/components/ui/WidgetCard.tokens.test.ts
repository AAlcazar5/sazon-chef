// frontend/__tests__/components/ui/WidgetCard.tokens.test.ts
// ROADMAP 4.0 DS7.4 — WidgetCard migrated to constants/tokens.

import * as fs from 'fs';
import * as path from 'path';
import { scan } from '../../../scripts/banned-patterns';

const SRC = path.resolve(__dirname, '..', '..', '..', 'components', 'ui', 'WidgetCard.tsx');

describe('DS7.4 — WidgetCard migrated to tokens', () => {
  it('imports from constants/tokens', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).toMatch(/from\s+['"]\.\.\/\.\.\/constants\/tokens['"]/);
  });

  it('does not import from constants/Colors / DarkColors', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).not.toMatch(/from\s+['"][./\w-]*constants\/Colors['"]/);
  });

  it('does not import the FontSize legacy module for inline values', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).not.toMatch(/import\s*\{[^}]*FontSize/);
  });

  it('uses Type.stat for the stat number (tabular-nums per DS5.4)', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).toMatch(/Type\.stat\.fontFamily/);
    expect(src).toMatch(/Type\.stat\.fontVariant/);
  });

  it('uses Radius.card for the container shape', () => {
    const src = fs.readFileSync(SRC, 'utf-8');
    expect(src).toMatch(/borderRadius:\s*Radius\.card/);
  });

  it('contains no banned-pattern violations', () => {
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const violations = scan(['components/ui/WidgetCard.tsx'], repoRoot);
    expect(violations).toEqual([]);
  });
});
