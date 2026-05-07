// frontend/__tests__/design/fontDecision.test.ts
// ROADMAP 4.0 DS2.4 — Plus Jakarta everywhere, no Platform.select font fallback.

import * as fs from 'fs';
import * as path from 'path';
import { FontFamily } from '../../constants/Typography';

describe('DS2.4 — Plus Jakarta everywhere', () => {
  it('FontFamily.regular maps to a Plus Jakarta family name', () => {
    expect(FontFamily.regular).toBe('PlusJakartaSans_400Regular');
  });

  it('all weight aliases resolve to Plus Jakarta variants', () => {
    expect(FontFamily.medium).toBe('PlusJakartaSans_500Medium');
    expect(FontFamily.semibold).toBe('PlusJakartaSans_600SemiBold');
    expect(FontFamily.bold).toBe('PlusJakartaSans_700Bold');
    expect(FontFamily.extrabold).toBe('PlusJakartaSans_800ExtraBold');
  });

  it('FontFamily.system is preserved as a deprecated alias to regular', () => {
    expect(FontFamily.system).toBe('PlusJakartaSans_400Regular');
  });

  it('Typography.ts no longer imports Platform from react-native', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', '..', 'constants', 'Typography.ts'), 'utf-8');
    // Strip block + line comments so the check measures only real code.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\*[^\n]*$/gm, '').replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/Platform\.select/);
    expect(code).not.toMatch(/from\s+['"]react-native['"][^\n]*Platform/);
  });
});
