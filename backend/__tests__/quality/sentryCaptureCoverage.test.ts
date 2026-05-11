// U9: Sentry capture coverage ratchet.
//
// Audit on 2026-05-11 found only `backend/src/app.ts` references Sentry —
// init was correct (Tier-L M1) but specific failure paths (AI provider
// fallback, webhook signature mismatch, Stripe processing errors,
// coach tool errors) were caught + logger.warn'd without surfacing to
// Sentry. Post-launch error triage would require log archaeology.
//
// Separate from Tier-Q M4 (gated SLO transactions): those are perf timings;
// this is error capture for the catch-and-continue pattern.
//
// Rule: every `catch (e) { ... }` block under
// `src/services/aiProviders|src/services/stripeService.ts|
// src/modules/{stripe,revenuecat}/*webhook*|src/modules/coach` must either:
//   1. re-throw the error (contains `throw `), or
//   2. capture it (`captureException(` or `Sentry.captureException(`), or
//   3. mark the binding as intentional with an underscore prefix
//      (`catch (_e)` / `catch (_eN)`), signaling a control-flow fallthrough
//      such as a multi-strategy parser, or
//   4. be a loop fallthrough (`continue` somewhere in the body).
//
// Naming a catch binding with a leading underscore is the explicit opt-out
// — it documents intent and lets the ratchet pass without polluting Sentry
// with non-errors.

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

const SCOPES: string[] = [
  path.join(SRC, 'services', 'aiProviders'),
  path.join(SRC, 'services', 'stripeService.ts'),
  path.join(SRC, 'modules', 'stripe', 'stripeWebhookHandler.ts'),
  path.join(SRC, 'modules', 'revenuecat', 'revenuecatWebhookHandler.ts'),
  path.join(SRC, 'modules', 'coach'),
];

function listFiles(scope: string): string[] {
  if (!existsSync(scope)) return [];
  const st = statSync(scope);
  if (st.isFile()) return [scope];
  const out: string[] = [];
  for (const entry of readdirSync(scope)) {
    const abs = path.join(scope, entry);
    const s = statSync(abs);
    if (s.isDirectory()) {
      // Skip __tests__ subdirs
      if (entry === '__tests__' || entry === '__mocks__') continue;
      out.push(...listFiles(abs));
    } else if (s.isFile() && abs.endsWith('.ts') && !abs.endsWith('.d.ts')) {
      out.push(abs);
    }
  }
  return out;
}

/**
 * Extract every catch block + its body from a source file.
 * Uses brace-counting from `catch (...) {` to find the matching `}`.
 * Returns an array of `{ binding, body }` records.
 */
function extractCatches(src: string): Array<{ binding: string; body: string }> {
  const out: Array<{ binding: string; body: string }> = [];
  const re = /\bcatch\s*\(\s*([^)]*?)\s*\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const binding = m[1].trim();
    const openIdx = m.index + m[0].length - 1; // index of the `{`
    // Scan forward for balanced braces.
    let depth = 1;
    let i = openIdx + 1;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      // Skip string literals to avoid counting braces inside them.
      else if (ch === '"' || ch === "'" || ch === '`') {
        const quote = ch;
        i++;
        while (i < src.length) {
          if (src[i] === '\\') { i += 2; continue; }
          if (src[i] === quote) { break; }
          i++;
        }
      }
      i++;
    }
    out.push({ binding, body: src.slice(openIdx + 1, i - 1) });
  }
  return out;
}

function isAcceptable(binding: string, body: string): boolean {
  // Acceptable opt-out: catch param starts with underscore (intentional ignore)
  // — applies to `catch (_)`, `catch (_e)`, `catch (_e1)`, etc., AND to
  // bare `catch {}` (no binding declared), which is also an explicit ignore.
  if (binding === '' || binding === '_' || /^_/.test(binding) || /^_[A-Za-z0-9]+$/.test(binding.replace(/:.*$/, ''))) {
    return true;
  }
  if (/\bthrow\b/.test(body)) return true;
  if (/\bcaptureException\s*\(/.test(body)) return true;
  if (/\bSentry\.captureException\s*\(/.test(body)) return true;
  if (/\bcontinue\b/.test(body)) return true;
  return false;
}

describe('U9: Sentry captureException coverage', () => {
  it('every catch block in scope either throws, captures via Sentry, or is marked intentional', () => {
    const offenders: string[] = [];
    for (const scope of SCOPES) {
      for (const f of listFiles(scope)) {
        const src = readFileSync(f, 'utf8');
        const blocks = extractCatches(src);
        for (const { binding, body } of blocks) {
          if (!isAcceptable(binding, body)) {
            const preview = body.replace(/\s+/g, ' ').trim().slice(0, 80);
            offenders.push(
              `${path.relative(ROOT, f)}  catch (${binding}) { ${preview}... }`,
            );
          }
        }
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'Catch blocks that silently swallow errors:\n  ' +
          offenders.join('\n  ') +
          '\nEither rethrow, call captureException(err, { tag }), or rename the binding with a leading underscore (intentional ignore).',
      );
    }
    expect(offenders.length).toBe(0);
  });
});
