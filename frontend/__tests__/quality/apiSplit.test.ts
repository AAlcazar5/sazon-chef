// Tier P P9 — `lib/api.ts` was 3,218 lines and 145 exports in one file. The
// split lives at `lib/api/<domain>.ts`; `lib/api.ts` is now a barrel that
// re-exports everything for back-compat with the 200+ existing import sites.
//
// This test locks in the contract: barrel ≤50 lines, each domain ≤600,
// every domain imports `apiClient` only from `./core` (no cross-domain
// imports). If we add a new domain or move things between domains, this
// guards the invariants.

import * as fs from 'fs';
import * as path from 'path';

const FRONTEND_ROOT = path.resolve(__dirname, '..', '..');
const BARREL = path.join(FRONTEND_ROOT, 'lib', 'api.ts');
const DOMAIN_DIR = path.join(FRONTEND_ROOT, 'lib', 'api');

const readLines = (p: string): string[] => fs.readFileSync(p, 'utf8').split('\n');

const listDomainFiles = (): string[] =>
  fs
    .readdirSync(DOMAIN_DIR)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => path.join(DOMAIN_DIR, f));

describe('P9: lib/api.ts split', () => {
  it('lib/api.ts is a re-export-only barrel ≤50 lines', () => {
    const lines = readLines(BARREL);
    expect(lines.length).toBeLessThanOrEqual(50);

    const codeLines = lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*'));

    // Every code line must be an `export *` (or `export type *`) re-export.
    for (const line of codeLines) {
      expect(line).toMatch(/^export (\*|type \*) from ['"]\.\/api\/[a-zA-Z]+['"];?$/);
    }
  });

  it('every lib/api/<domain>.ts is ≤600 lines', () => {
    const files = listDomainFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const lines = readLines(f).length;
      expect({ file: path.basename(f), lines }).toEqual({
        file: path.basename(f),
        lines: expect.any(Number),
      });
      expect(lines).toBeLessThanOrEqual(600);
    }
  });

  it('domain files only import from ./core — no cross-domain imports', () => {
    const files = listDomainFiles().filter((f) => path.basename(f) !== 'core.ts');

    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      // Capture every relative import in the file.
      const importRe = /(?:import|export)\s+(?:type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = importRe.exec(text)) !== null) {
        const spec = m[1];
        if (!spec.startsWith('.')) continue; // npm package, fine
        // Allow ./core, allow grandparent (../../types) — disallow sibling domain (./recipe etc).
        const isCore = spec === './core';
        const isParentOrAbove = spec.startsWith('../');
        const isSiblingDomain = /^\.\/[a-zA-Z]+$/.test(spec) && spec !== './core';
        if (isSiblingDomain) {
          throw new Error(
            `Cross-domain import in ${path.basename(f)}: '${spec}' — domain files must only import from './core'.`,
          );
        }
        // Other relative imports (e.g. import('../../types') for ShoppingList types) are OK.
        expect(isCore || isParentOrAbove).toBe(true);
      }
    }
  });

  it('every domain file imports apiClient (or api) from ./core', () => {
    const files = listDomainFiles().filter((f) => path.basename(f) !== 'core.ts');
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      const importsCore = /from\s+['"]\.\/core['"]/.test(text);
      expect({ file: path.basename(f), importsCore }).toEqual({
        file: path.basename(f),
        importsCore: true,
      });
    }
  });
});
