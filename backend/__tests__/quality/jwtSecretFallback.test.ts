// U13: JWT_SECRET fallback ratchet.
//
// Pre-U13: three auth files contained
//   `process.env.JWT_SECRET || 'your-secret-key-change-in-production'`
// The fallback was dead in practice (authMiddleware's startup guard
// refused to boot without a 32+ char secret), but a single cleanup pass
// away from going live. U13 collapsed all 4 sites onto `utils/jwtConfig.ts`
// — the single source of truth. This ratchet bans the literal fallback
// and any equivalent pattern from creeping back in.

import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

// Patterns that must not appear in any source file outside utils/jwtConfig.ts.
const BANNED = [
  /['"]your-secret-key-change-in-production['"]/,
  /process\.env\.JWT_SECRET\s*\|\|/,
  /process\.env\.JWT_SECRET\s*\?\?/,
];

const ALLOWLIST = new Set<string>([
  path.join(SRC, 'utils', 'jwtConfig.ts'),
]);

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry);
    const s = statSync(abs);
    if (s.isDirectory()) {
      if (entry === '__tests__' || entry === '__mocks__' || entry === 'node_modules') continue;
      out.push(...listFiles(abs));
    } else if (s.isFile() && abs.endsWith('.ts')) {
      out.push(abs);
    }
  }
  return out;
}

describe('U13: JWT_SECRET fallback ratchet', () => {
  it('no source file outside utils/jwtConfig.ts contains a JWT_SECRET fallback', () => {
    const offenders: string[] = [];
    for (const f of listFiles(SRC)) {
      if (ALLOWLIST.has(f)) continue;
      const src = readFileSync(f, 'utf8');
      for (const re of BANNED) {
        if (re.test(src)) {
          offenders.push(`${path.relative(ROOT, f)}  matched ${re}`);
        }
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'JWT_SECRET fallback pattern leaked back in:\n  ' +
          offenders.join('\n  ') +
          '\nImport JWT_SECRET from @/utils/jwtConfig instead — that file holds the only allowed read of process.env.JWT_SECRET.',
      );
    }
    expect(offenders.length).toBe(0);
  });

  it('jwtConfig.ts throws when JWT_SECRET is unset or too short', () => {
    // Fresh require so the module-level guard runs against the mutated env.
    const originalEnv = process.env.JWT_SECRET;
    jest.isolateModules(() => {
      delete process.env.JWT_SECRET;
      expect(() => require('../../src/utils/jwtConfig')).toThrow(/JWT_SECRET env var is required/);
    });
    jest.isolateModules(() => {
      process.env.JWT_SECRET = 'tooshort';
      expect(() => require('../../src/utils/jwtConfig')).toThrow(/at least 32 characters/);
    });
    jest.isolateModules(() => {
      process.env.JWT_SECRET = 'a'.repeat(48);
      const mod = require('../../src/utils/jwtConfig');
      expect(mod.JWT_SECRET).toBe('a'.repeat(48));
    });
    process.env.JWT_SECRET = originalEnv;
  });
});
