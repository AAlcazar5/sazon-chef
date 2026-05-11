// U7: Transaction boundary audit.
//
// Audit on 2026-05-11 found 8 explicit `prisma.$transaction` callsites vs
// 233 mutation callsites (3.4%). Multi-step writes that must succeed
// together — set-active + un-active-others; rotate-refresh + insert-new;
// share-token redemption + ownership transfer — would leave half-succeeded
// state in the DB if a later step throws.
//
// This is a REGISTRY test, not a coverage sweep: list the handlers that
// MUST be atomic, and assert each one still contains `prisma.$transaction(`
// after refactors. New atomic-required handlers get added here as the team
// writes them. The registry is the contract — silent removal of a wrap
// breaks the build.

import { readFileSync, existsSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');

interface AtomicHandler {
  /** Path relative to backend/ */
  file: string;
  /** Function name (used to locate the body for the assertion). */
  fn: string;
  /** Why this MUST be atomic (documentation for future readers). */
  why: string;
}

const REGISTRY: AtomicHandler[] = [
  {
    file: 'src/modules/user/userPresetController.ts',
    fn: 'applyPreset',
    why: 'apply preset wipes-then-rewrites macro goals + onboarding flags; partial state would leave user mid-migration',
  },
  {
    file: 'src/modules/mealPlan/mealPlanTemplateController.ts',
    fn: 'createTemplate',
    why: 'snapshot template + meals must commit together or template is empty/broken',
  },
  {
    file: 'src/modules/shoppingListShare/shoppingListShareController.ts',
    fn: 'importShare',
    why: 'token redemption + recipient list creation + items copy must all succeed (or zero of them)',
  },
  {
    file: 'src/services/shoppingListLifecycleService.ts',
    fn: 'setActiveList',
    why: 'set-active flips one list ON and others OFF — partial state breaks the single-active invariant',
  },
  {
    file: 'src/services/shoppingListLifecycleService.ts',
    fn: 'getActiveList',
    why: 'find-or-create active list — duplicate-create race becomes possible without transaction',
  },
  {
    file: 'src/services/shoppingListArchiveTiering.ts',
    fn: 'tierArchivedList',
    why: 'tier migration writes both status fields and audit log; partial state mis-classifies the list',
  },
  {
    file: 'src/services/refreshTokenService.ts',
    fn: 'rotateRefreshToken',
    why: 'rotate = revoke-old + insert-new in one shot; partial state lets a revoked token still pass validation',
  },
  {
    file: 'src/services/coachTools.ts',
    fn: 'runAddToShoppingList',
    why: 'bulk-add of N shopping items must commit together — partial inserts leave the list with half a meal',
  },
];

/**
 * Skip a balanced delimited section starting at position `start` (which must
 * point at the opening char). Returns the index right after the closing
 * delimiter. Used to step over `(...)` parameter lists that may contain
 * inline type literals like `meta?: { foo: string }`.
 */
function skipBalanced(src: string, start: number, open: string, close: string): number {
  let depth = 1;
  let i = start + 1;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === open) depth++;
    else if (ch === close) depth--;
    else if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === q) break;
        i++;
      }
    }
    i++;
  }
  return i;
}

/**
 * Extract a function body by name. Handles:
 *   - `export async function fn(...) { ... }`
 *   - `export const fn = async (...) => { ... }`
 *   - `async fn(...) { ... }` (object method shorthand)
 *   - `fn: async (...) => { ... }` (object property)
 * The hard part is finding the *body* `{`, not a type-literal `{` that
 * may appear inside the parameter list (e.g. `meta?: { ... }`). We do this
 * by locating the parameter `(`, balance-scanning to its `)`, then
 * advancing to the first `{` after that.
 */
function extractFunctionBody(src: string, fn: string): string | null {
  // Match the function name in any of the supported forms. We deliberately
  // stop AT the name (not after the param `(`) so we can locate the
  // parameter list with balanced-paren scanning below.
  const nameRe = new RegExp(
    String.raw`(?:(?:export\s+)?(?:async\s+)?function\s+${fn}\b|` +
      String.raw`export\s+const\s+${fn}\b|` +
      String.raw`\basync\s+${fn}\b|` +
      String.raw`\b${fn}\s*:\s*async\b)`,
  );
  const m = src.match(nameRe);
  if (!m || m.index === undefined) return null;
  // Find the parameter list `(` after the name.
  const parenIdx = src.indexOf('(', m.index + m[0].length);
  if (parenIdx === -1) return null;
  const afterParens = skipBalanced(src, parenIdx, '(', ')');
  // Find the body `{`. Skip any return-type annotation (`: Promise<{...}> {`)
  // by tracking balanced `<>` / `{}` / `[]` / `()` inside the type expr —
  // the body `{` is the first `{` reached at top depth.
  const openIdx = findBodyOpen(src, afterParens);
  if (openIdx === -1) return null;
  const endIdx = skipBalanced(src, openIdx, '{', '}');
  return src.slice(openIdx + 1, endIdx - 1);
}

/**
 * From a position immediately after the `)` of a parameter list, find the
 * function body's `{`. If a return-type annotation `: <type-expr>` is
 * present, walk over it tracking nested delimiters.
 */
function findBodyOpen(src: string, start: number): number {
  let i = start;
  // Skip whitespace
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== ':') {
    // No return-type annotation; next `{` is the body.
    return src.indexOf('{', i);
  }
  i++; // skip ':'
  let angle = 0;
  let brace = 0;
  let paren = 0;
  let bracket = 0;
  while (i < src.length) {
    const ch = src[i];
    // Skip strings to avoid spurious delimiter counts.
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === q) break;
        i++;
      }
      i++;
      continue;
    }
    if (ch === '<') angle++;
    else if (ch === '>') {
      // `=>` arrow is not a closing angle.
      if (src[i - 1] !== '=' && angle > 0) angle--;
    }
    else if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === '{') {
      if (angle === 0 && paren === 0 && bracket === 0 && brace === 0) {
        return i; // body `{`
      }
      brace++;
    }
    else if (ch === '}') brace--;
    i++;
  }
  return -1;
}

describe('U7: transaction boundary registry', () => {
  it('every registry handler contains prisma.$transaction(', () => {
    const offenders: string[] = [];
    for (const entry of REGISTRY) {
      const abs = path.join(ROOT, entry.file);
      if (!existsSync(abs)) {
        offenders.push(`${entry.file}::${entry.fn} — file missing (registry stale)`);
        continue;
      }
      const src = readFileSync(abs, 'utf8');
      const body = extractFunctionBody(src, entry.fn);
      if (!body) {
        offenders.push(`${entry.file}::${entry.fn} — function not found (registry stale)`);
        continue;
      }
      if (!/prisma\.\$transaction\s*\(/.test(body)) {
        offenders.push(`${entry.file}::${entry.fn} — missing prisma.$transaction (${entry.why})`);
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'Handlers in the must-be-atomic registry without a $transaction:\n  ' +
          offenders.join('\n  ') +
          '\nEither restore the transaction or remove the entry from REGISTRY (only if the atomicity requirement no longer applies).',
      );
    }
    expect(offenders.length).toBe(0);
  });

  it('registry is non-empty and each entry has a why', () => {
    expect(REGISTRY.length).toBeGreaterThan(0);
    for (const entry of REGISTRY) {
      expect(entry.why.length).toBeGreaterThan(20);
    }
  });
});
