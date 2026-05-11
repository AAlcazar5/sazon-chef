// U22: TODO / FIXME marker ratchet.
//
// 18 markers across backend/src + frontend/* at the 2026-05-11 audit.
// Each one is triaged in docs/todo-triage-2026-05.md (deferred / resolve
// / archive). The ratchet pins the current count for *backend* source so
// new TODOs can't sneak in without a paired roadmap entry or a docs
// update. Frontend has its own ratchet in frontend/__tests__/quality/.

import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

// Pinned floor. Only ever decrease. Each new TODO requires either a
// roadmap entry or an explicit allowlist update.
const RATCHET_MAX_BACKEND_TODOS = 11;

const MARKER_RE = /\b(?:TODO|FIXME|HACK|XXX)\b/g;

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry);
    const s = statSync(abs);
    if (s.isDirectory()) {
      if (entry === '__tests__' || entry === '__mocks__') continue;
      out.push(...listFiles(abs));
    } else if (s.isFile() && abs.endsWith('.ts') && !abs.endsWith('.d.ts')) {
      out.push(abs);
    }
  }
  return out;
}

describe('U22: TODO marker ratchet (backend)', () => {
  it(`backend TODO / FIXME / HACK / XXX markers ≤ ${RATCHET_MAX_BACKEND_TODOS}`, () => {
    let total = 0;
    const perFile: Array<{ file: string; n: number }> = [];
    for (const f of listFiles(SRC)) {
      const src = readFileSync(f, 'utf8');
      const matches = src.match(MARKER_RE);
      const n = matches ? matches.length : 0;
      if (n > 0) {
        total += n;
        perFile.push({ file: path.relative(ROOT, f), n });
      }
    }
    if (total > RATCHET_MAX_BACKEND_TODOS) {
      const top = perFile.sort((a, b) => b.n - a.n).slice(0, 10);
      throw new Error(
        `TODO ratchet broken: ${total} > ${RATCHET_MAX_BACKEND_TODOS}\nTop offenders:\n` +
          top.map((t) => `  ${t.n}  ${t.file}`).join('\n') +
          '\nFile a roadmap entry for the new TODO + bump the floor in this file, or resolve it before merge.',
      );
    }
    expect(total).toBeLessThanOrEqual(RATCHET_MAX_BACKEND_TODOS);
  });

  it('the triage doc exists', () => {
    const doc = path.join(ROOT, 'docs', 'todo-triage-2026-05.md');
    expect(() => readFileSync(doc, 'utf8')).not.toThrow();
  });
});
