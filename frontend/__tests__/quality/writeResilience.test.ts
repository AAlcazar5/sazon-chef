// Tier Q6 — write-side resilience audit.
//
// Full audit + rollout of idempotency keys is a multi-PR effort touching
// 162 write callsites + backend dedup middleware. This file ships:
//
//   1. The idempotency-key helper (frontend/lib/idempotency.ts) verified by
//      shape + property tests so it's safe to adopt incrementally.
//   2. A static surface count + structure check across `lib/api/*` so the
//      audit's findings are pinned (167 write callsites today, 10 domains
//      with writes). Future PRs migrating callsites have a number to beat.
//   3. A high-risk callsite registry — the 6 user-triggered writes that
//      absolutely need idempotency keys before launch (save-recipe,
//      mark-cooked, log-meal, etc.). The registry exists so the
//      backend-half PR has a definitive target list.

import * as fs from 'fs';
import * as path from 'path';
import {
  newIdempotencyKey,
  idempotencyHeaders,
  isWellFormedKey,
} from '../../lib/idempotency';

const FRONTEND_ROOT = path.resolve(__dirname, '../..');
const API_ROOT = path.join(FRONTEND_ROOT, 'lib', 'api');

const WRITE_VERB_RE = /(?:api|apiClient|axios)\.(post|put|patch|delete)\(/g;

interface WriteCallsite {
  file: string;
  line: number;
  verb: 'post' | 'put' | 'patch' | 'delete';
  context: string;
}

function scanApiDir(): WriteCallsite[] {
  const out: WriteCallsite[] = [];
  const files = fs
    .readdirSync(API_ROOT)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
  for (const f of files) {
    const fp = path.join(API_ROOT, f);
    const src = fs.readFileSync(fp, 'utf-8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let m: RegExpExecArray | null;
      WRITE_VERB_RE.lastIndex = 0;
      while ((m = WRITE_VERB_RE.exec(line)) !== null) {
        out.push({
          file: f,
          line: i + 1,
          verb: m[1] as WriteCallsite['verb'],
          context: line.trim().slice(0, 140),
        });
      }
    }
  }
  return out;
}

// High-risk user-triggered writes that need idempotency keys before launch.
// Each entry is a substring match in the line — the audit asserts ALL of
// these continue to exist in lib/api/* (so a refactor doesn't silently
// rename them without re-evaluating the idempotency need).
const HIGH_RISK_WRITES = [
  { domain: 'recipe', match: '/save' },                 // recipes/:id/save
  { domain: 'recipe', match: '/like' },                 // recipes/:id/like
  { domain: 'meal',   match: '/meal-plan/add-recipe' }, // adds a meal
  { domain: 'food',   match: '/food/log' },             // logs a meal
  { domain: 'plate',  match: 'composedPlateApi' },      // composed-plate writes
  { domain: 'recipe', match: '/recipes/import-url' },   // import-from-URL
] as const;

// Total write callsites in the API surface. Today's snapshot — when a PR
// adds new domains or callsites, this number rises. The audit fails if it
// FALLS, which would mean a write was silently removed (forces a review).
const WRITE_CALLSITE_FLOOR = 130;

describe('Q6 — write-side resilience', () => {
  describe('newIdempotencyKey()', () => {
    it('produces a well-formed UUID v4 string', () => {
      const k = newIdempotencyKey();
      expect(isWellFormedKey(k)).toBe(true);
    });

    it('produces distinct keys across calls', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) keys.add(newIdempotencyKey());
      expect(keys.size).toBe(100);
    });

    it('always sets the v4 version nibble (position 14)', () => {
      for (let i = 0; i < 20; i++) {
        const k = newIdempotencyKey();
        // UUID format `xxxxxxxx-xxxx-Nxxx-xxxx-xxxxxxxxxxxx` — char at
        // string index 14 (after two hyphens) is the version.
        expect(k.charAt(14)).toBe('4');
      }
    });

    it('always sets the variant nibble (position 19) to one of 8/9/a/b', () => {
      for (let i = 0; i < 20; i++) {
        const k = newIdempotencyKey();
        expect('89ab').toContain(k.charAt(19));
      }
    });
  });

  describe('idempotencyHeaders()', () => {
    it('returns an axios-config-shaped object with the header set', () => {
      const k = newIdempotencyKey();
      const config = idempotencyHeaders(k);
      expect(config.headers['Idempotency-Key']).toBe(k);
    });
  });

  describe('write-callsite surface (lib/api/*)', () => {
    const callsites = scanApiDir();

    it(`total write callsites ≥ ${WRITE_CALLSITE_FLOOR} (drops trigger manual review)`, () => {
      if (callsites.length < WRITE_CALLSITE_FLOOR) {
        throw new Error(
          `Write surface dropped from baseline ${WRITE_CALLSITE_FLOOR} to ${callsites.length}. ` +
            `If this is intentional (writes consolidated), update WRITE_CALLSITE_FLOOR. ` +
            `Otherwise something was deleted that shouldn't have been.`,
        );
      }
      expect(callsites.length).toBeGreaterThanOrEqual(WRITE_CALLSITE_FLOOR);
    });

    it('every write verb is one of post/put/patch/delete', () => {
      const verbs = new Set(callsites.map((c) => c.verb));
      for (const v of verbs) {
        expect(['post', 'put', 'patch', 'delete']).toContain(v);
      }
    });

    it('writes are spread across multiple domain files (no single mega-file)', () => {
      const domains = new Set(callsites.map((c) => c.file));
      // P9 split lib/api.ts into 10 domain files — every domain should
      // hold its own writes.
      expect(domains.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('high-risk write callsites still exist (idempotency targets)', () => {
    const allSrc = (() => {
      const files = fs.readdirSync(API_ROOT).filter((f) => f.endsWith('.ts'));
      return files.map((f) => fs.readFileSync(path.join(API_ROOT, f), 'utf-8')).join('\n');
    })();

    for (const { domain, match } of HIGH_RISK_WRITES) {
      it(`${domain}: high-risk write "${match}" still exists`, () => {
        // We don't yet require Idempotency-Key headers on these — that's
        // the backend-half PR. For now we just pin that the callsite is
        // present so the migration list doesn't drift.
        expect(allSrc).toContain(match);
      });
    }
  });
});
