// frontend/__tests__/scripts/bannedPatterns.test.ts
// ROADMAP 4.0 DS0.3 — fixture-based scanner test.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scan } from '../../scripts/banned-patterns';

function writeFixture(dir: string, files: Record<string, string>): void {
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body, 'utf-8');
  }
}

describe('DS0.3 — banned-patterns scanner', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'banned-fixture-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('flags brand-coral hex outside token files', () => {
    writeFixture(root, {
      'components/BadButton.tsx': `
import React from 'react';
export const BadButton = () => <View style={{ backgroundColor: '#fa7e12' }} />;
      `.trim(),
      'constants/Colors.ts': `export const Colors = { primary: '#fa7e12' };`,
      'constants/colorTokens.cjs': `module.exports = { Brand: { light: { base: '#fa7e12' } } };`,
    });

    const violations = scan(['components', 'constants'], root);
    const coralViolations = violations.filter((v) => v.rule === 'brand-coral-literal');
    expect(coralViolations).toHaveLength(1);
    expect(coralViolations[0].file).toBe('components/BadButton.tsx');
    expect(coralViolations[0].line).toBe(2);
  });

  it('flags borderRadius: 8 on card-className JSX', () => {
    writeFixture(root, {
      'components/Foo.tsx': `
const A = <View className="card foo" style={{ borderRadius: 8 }} />;
const B = <View className="not-a-card" style={{ borderRadius: 8 }} />;
      `.trim(),
    });

    const violations = scan(['components'], root);
    const radius = violations.filter((v) => v.rule === 'card-radius-8');
    expect(radius).toHaveLength(1);
    expect(radius[0].line).toBe(1);
  });

  it('flags borderRadius: 8 in any *Card.tsx file', () => {
    writeFixture(root, {
      'components/RecipeCard.tsx': `
const X = <View style={{ borderRadius: 8 }} />;
      `.trim(),
    });

    const violations = scan(['components'], root);
    expect(violations.some((v) => v.rule === 'card-radius-8' && v.file === 'components/RecipeCard.tsx')).toBe(true);
  });

  it('flags TouchableOpacity / Pressable without pressedScale', () => {
    writeFixture(root, {
      'components/Bad.tsx': `
import { TouchableOpacity, Pressable } from 'react-native';
const A = <TouchableOpacity accessibilityLabel="x" onPress={() => {}}>x</TouchableOpacity>;
const B = <Pressable pressedScale={0.97} accessibilityLabel="y" onPress={() => {}}>y</Pressable>;
const C = <TouchableOpacity pressedScale={0.97} accessibilityLabel="z">z</TouchableOpacity>;
      `.trim(),
    });

    const violations = scan(['components'], root);
    const press = violations.filter((v) => v.rule === 'touchable-without-press');
    expect(press).toHaveLength(1);
    expect(press[0].excerpt).toContain('TouchableOpacity accessibilityLabel');
  });

  it('DS1.5 — flags TouchableOpacity / Pressable without accessibilityLabel or accessibilityRole', () => {
    writeFixture(root, {
      'components/A11y.tsx': `
import { TouchableOpacity, Pressable } from 'react-native';
const NoLabel = <TouchableOpacity pressedScale={0.97} onPress={() => {}}>missing</TouchableOpacity>;
const WithLabel = <TouchableOpacity pressedScale={0.97} accessibilityLabel="ok" onPress={() => {}}>ok</TouchableOpacity>;
const WithRole = <TouchableOpacity pressedScale={0.97} accessibilityRole="button" onPress={() => {}}>ok</TouchableOpacity>;
const HapticNoLabel = <HapticTouchableOpacity pressedScale={0.97}>tap</HapticTouchableOpacity>;
      `.trim(),
    });

    const violations = scan(['components'], root);
    const a11y = violations.filter((v) => v.rule === 'touchable-without-a11y-label');
    expect(a11y).toHaveLength(2);
    expect(a11y[0].excerpt).toContain('TouchableOpacity pressedScale');
    expect(a11y[1].excerpt).toContain('HapticTouchableOpacity pressedScale');
  });

  it('flags files importing both Colors and tokens', () => {
    writeFixture(root, {
      'components/Mixed.tsx': `
import { Colors } from '../constants/Colors';
import { Brand } from '../constants/tokens';
export default Mixed;
      `.trim(),
      'components/CleanColors.tsx': `import { Colors } from '../constants/Colors';`,
      'components/CleanTokens.tsx': `import { Brand } from '../constants/tokens';`,
    });

    const violations = scan(['components'], root);
    const mixed = violations.filter((v) => v.rule === 'mixed-colors-and-brand');
    expect(mixed).toHaveLength(1);
    expect(mixed[0].file).toBe('components/Mixed.tsx');
  });

  it('returns an empty list when fixtures are clean', () => {
    writeFixture(root, {
      'components/Good.tsx': `
import { TouchableOpacity } from 'react-native';
const A = <TouchableOpacity pressedScale={0.97} accessibilityLabel="ok" onPress={() => {}}>ok</TouchableOpacity>;
      `.trim(),
    });

    const violations = scan(['components'], root);
    expect(violations).toEqual([]);
  });

  it('skips test files, fixtures, and node_modules', () => {
    writeFixture(root, {
      '__tests__/whatever.test.tsx': `const X = '#fa7e12';`,
      '__fixtures__/seed.ts': `const X = '#fa7e12';`,
      'node_modules/somelib/index.js': `const X = '#fa7e12';`,
    });
    const violations = scan(['__tests__', '__fixtures__', 'node_modules'], root);
    expect(violations).toEqual([]);
  });

  it('reports rule + file + line + excerpt for downstream CI formatting', () => {
    writeFixture(root, {
      'components/Boom.tsx': `<View style={{ backgroundColor: '#fa7e12' }} />`,
    });
    const [v] = scan(['components'], root);
    expect(v).toMatchObject({
      file: 'components/Boom.tsx',
      line: 1,
      rule: 'brand-coral-literal',
    });
    expect(typeof v.excerpt).toBe('string');
  });
});
