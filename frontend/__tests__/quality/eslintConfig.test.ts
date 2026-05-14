// ROADMAP 4.0 Tier U residue / M21 — ratchet on the ESLint flat-config.
//
// Pins the rule set so a future stub-revert can't silently reintroduce
// the empty config. Loads the config dynamically and asserts the rule
// posture against three sample sources (product, test, script).

import path from 'path';

const CONFIG_PATH = path.resolve(__dirname, '../../eslint.config.js');

interface FlatConfigBlock {
  files?: string[];
  ignores?: string[];
  rules?: Record<string, unknown>;
  languageOptions?: Record<string, unknown>;
}

describe('M21 — ESLint flat-config posture', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(CONFIG_PATH) as FlatConfigBlock[];

  it('exports a flat-config array', () => {
    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThanOrEqual(3);
  });

  it('declares a product-code block with the required ratchet rules', () => {
    const productBlock = config.find(
      (b): b is FlatConfigBlock & { rules: Record<string, unknown> } =>
        !!b.rules && !b.files && !!b.languageOptions,
    );
    expect(productBlock).toBeTruthy();

    const rules = productBlock!.rules;
    expect(rules['no-unused-vars']).toBeDefined();
    expect(rules['prefer-const']).toBe('error');
    expect(rules['no-var']).toBe('error');
    expect(rules['no-debugger']).toBe('error');
    expect(rules['no-console']).toBe('warn');
  });

  it('honours the underscore-prefix opt-out on no-unused-vars', () => {
    const productBlock = config.find(
      (b) => Array.isArray(b.rules?.['no-unused-vars']) && !b.files,
    );
    expect(productBlock).toBeTruthy();
    const rule = productBlock!.rules!['no-unused-vars'] as [string, Record<string, string>];
    expect(rule[0]).toBe('error');
    expect(rule[1].argsIgnorePattern).toBe('^_');
    expect(rule[1].varsIgnorePattern).toBe('^_');
    expect(rule[1].caughtErrorsIgnorePattern).toBe('^_');
  });

  it('loosens for __tests__/** and *.test.* / *.spec.* — no-console + no-unused-vars off', () => {
    const testBlock = config.find(
      (b) =>
        Array.isArray(b.files) &&
        b.files.some((f) => f.includes('__tests__') || f.includes('.test.')),
    );
    expect(testBlock).toBeTruthy();
    expect(testBlock!.rules!['no-console']).toBe('off');
    expect(testBlock!.rules!['no-unused-vars']).toBe('off');
  });

  it('loosens for scripts/** — no-console off', () => {
    const scriptBlock = config.find(
      (b) => Array.isArray(b.files) && b.files.some((f) => f.startsWith('scripts/')),
    );
    expect(scriptBlock).toBeTruthy();
    expect(scriptBlock!.rules!['no-console']).toBe('off');
  });

  it('ignores generated + native-platform directories', () => {
    const ignoresBlock = config.find((b) => Array.isArray(b.ignores));
    expect(ignoresBlock).toBeTruthy();
    const ignores = ignoresBlock!.ignores!;
    for (const dir of ['node_modules/**', '.expo/**', 'ios/**', 'android/**']) {
      expect(ignores).toContain(dir);
    }
  });
});
