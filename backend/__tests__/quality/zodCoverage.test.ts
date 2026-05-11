// U10: Zod input validation coverage ratchet.
//
// Audit on 2026-05-11: 44 zod schemas across 443 backend files, but only 5
// `*Controller.ts` mutation handlers (out of 22) parse `req.body` against
// a typed schema before writing to Prisma. Routes accepting arbitrary JSON
// bodies without shape validation = attack surface + crash surface.
//
// Rule (ratchet): every `*Controller.ts` that BOTH
//   - references `req.body`, AND
//   - calls `prisma.<model>.{create|update|upsert|delete}`
// SHOULD import `zod` and use a schema. Existing offenders are pinned at
// `RATCHET_MAX_UNVALIDATED`. New mutations MUST validate — they cannot
// raise the floor.

import { readdirSync, statSync, readFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC_MODULES = path.join(ROOT, 'src', 'modules');

// Pin the floor at the 2026-05-11 audit value. New body+mutation controllers
// MUST import zod; this number ONLY EVER DECREASES.
const RATCHET_MAX_UNVALIDATED = 21;

const BODY_RE = /\breq\.body\b/;
const MUTATION_RE = /\bprisma\.\w+\.(?:create|update|upsert|delete|createMany|updateMany|deleteMany)\b/;
const ZOD_IMPORT_RE = /from\s+['"]zod['"]/;

function listControllers(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry);
    const s = statSync(abs);
    if (s.isDirectory()) {
      if (entry === '__tests__' || entry === '__mocks__') continue;
      out.push(...listControllers(abs));
    } else if (s.isFile() && abs.endsWith('Controller.ts')) {
      out.push(abs);
    }
  }
  return out;
}

interface ControllerAudit {
  file: string;
  hasBody: boolean;
  hasMutation: boolean;
  hasZod: boolean;
}

function auditAll(): ControllerAudit[] {
  return listControllers(SRC_MODULES).map((f) => {
    const src = readFileSync(f, 'utf8');
    return {
      file: f,
      hasBody: BODY_RE.test(src),
      hasMutation: MUTATION_RE.test(src),
      hasZod: ZOD_IMPORT_RE.test(src),
    };
  });
}

describe('U10: zod input validation coverage', () => {
  const audits = auditAll();
  const bodyMutationControllers = audits.filter((a) => a.hasBody && a.hasMutation);
  const unvalidated = bodyMutationControllers.filter((a) => !a.hasZod);

  it(`unvalidated body+mutation controllers ≤ ${RATCHET_MAX_UNVALIDATED} (ratchet floor)`, () => {
    if (unvalidated.length > RATCHET_MAX_UNVALIDATED) {
      const msg = unvalidated
        .map((a) => '  ' + path.relative(ROOT, a.file))
        .join('\n');
      throw new Error(
        `Ratchet broken: ${unvalidated.length} > ${RATCHET_MAX_UNVALIDATED} body+mutation controllers without zod.\n` +
          msg +
          "\nAdd `import { z } from 'zod';` + `const schema = z.object({...});` + `schema.parse(req.body)` before any prisma write.",
      );
    }
    expect(unvalidated.length).toBeLessThanOrEqual(RATCHET_MAX_UNVALIDATED);
  });

  it('manifest sanity — at least 20 body+mutation controllers exist (so the ratchet has something to bite on)', () => {
    expect(bodyMutationControllers.length).toBeGreaterThanOrEqual(20);
  });
});
