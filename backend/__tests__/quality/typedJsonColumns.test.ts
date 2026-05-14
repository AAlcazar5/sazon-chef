// ROADMAP 4.0 Tier U / M5 — ratchet: every JSON-stringified Prisma column
// must flow through the typed accessors in `src/utils/jsonColumns.ts`. New
// direct `JSON.parse(<row>.<col>)` or `<col>: JSON.stringify(...)` callsites
// on a known column name are rejected.
//
// Why: this is the only enforcement that the M5 migration doesn't silently
// regress. SQLite can't enforce the column type, so the contract lives here.

import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

import { JSON_COLUMN_SCHEMAS } from '../../src/utils/jsonColumns';

const SRC = path.resolve(__dirname, '../../src');
const HELPER_FILE = path.resolve(SRC, 'utils/jsonColumns.ts');

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry);
    const s = statSync(abs);
    if (s.isDirectory()) {
      out.push(...listSourceFiles(abs));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      out.push(abs);
    }
  }
  return out;
}

const ALL_COLUMNS = Object.keys(JSON_COLUMN_SCHEMAS);
const ALL_FILES = listSourceFiles(SRC).filter((f) => f !== HELPER_FILE);

// `data` is exempted from the strict ratchet because the column name is
// generic enough to collide with logger payloads (`logger.info({ data: ... })`)
// and other unrelated object literals. The webhook handlers themselves DO
// migrate to `serializeJsonColumnSafe('data', ...)` — that's hand-verified
// at the two known write-sites (stripe + revenuecat webhooks).
const RATCHET_EXEMPT = new Set(['data']);
const RATCHET_COLUMNS = ALL_COLUMNS.filter((c) => !RATCHET_EXEMPT.has(c));

describe('M5 — typed JSON-column ratchet', () => {
  it('the schema registry covers exactly the 24 migrated columns', () => {
    // 25 columns in schema.prisma map to 24 unique names — `data` appears
    // on both StripeWebhookEvent and RevenueCatWebhookEvent.
    expect(ALL_COLUMNS).toHaveLength(24);
  });

  describe('no direct JSON.parse on a migrated column', () => {
    // The helper itself is the only allowed callsite of JSON.parse on these
    // payloads. Any product code that does `JSON.parse(x.<col>)` must
    // migrate to `parseJsonColumn('<col>', x.<col>)`.
    for (const col of RATCHET_COLUMNS) {
      it(`column \`${col}\` has no direct JSON.parse callsite`, () => {
        const offenders: string[] = [];
        // Match `JSON.parse(<anything>.<col>` — the prefix before .col is a
        // row variable reference; we don't constrain it to keep the rule
        // simple. Hand-rolled false positives (a local variable literally
        // named the same as a column) are vanishingly rare in this code base.
        const pattern = new RegExp(`JSON\\.parse\\([^)]*\\.${col}\\b`);
        for (const file of ALL_FILES) {
          const src = readFileSync(file, 'utf8');
          if (pattern.test(src)) {
            offenders.push(path.relative(SRC, file));
          }
        }
        expect(offenders).toEqual([]);
      });
    }
  });

  describe('no direct JSON.stringify writing to a migrated column', () => {
    // Writes to `<col>: JSON.stringify(...)` must migrate to
    // `<col>: serializeJsonColumnSafe('<col>', ...)` (or the strict variant).
    for (const col of RATCHET_COLUMNS) {
      it(`column \`${col}\` has no direct JSON.stringify write callsite`, () => {
        const offenders: string[] = [];
        // Match `<col>: JSON.stringify(` — column-keyed object literal
        // assignment. Whitespace is permissive.
        const pattern = new RegExp(`\\b${col}\\s*:\\s*JSON\\.stringify\\(`);
        for (const file of ALL_FILES) {
          const src = readFileSync(file, 'utf8');
          if (pattern.test(src)) {
            offenders.push(path.relative(SRC, file));
          }
        }
        expect(offenders).toEqual([]);
      });
    }
  });
});
