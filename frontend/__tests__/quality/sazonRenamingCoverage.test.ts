// ROADMAP 4.0 IA2.0 — brand rename cap test.
//
// "Sazon Coach" / "Sazon coach" must not reappear in user-facing copy.
// The brand is "Sazon" (the friend), not "Sazon Coach" (the trainer vibe).
//
// Allowed exceptions:
//   - Brand-enforcement tests at backend/__tests__/services/coachPromptService.{voice,}.test.ts
//     that ASSERT "Sazon Coach" must NOT appear in system prompts. The literal
//     appears in `not.toMatch` / `not.toContain` calls — the literal is the
//     enforcement signal, not a brand violation.
//
// Type names (CoachLocale, CoachIntent, CoachMessage), route paths (/coach),
// env vars (COACH_MODELS), and DB columns (coachLocale, coach_messages) are
// stable identifiers and don't trigger this cap — the regex matches only the
// human-readable two-word phrase "Sazon Coach" / "Sazon coach".

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SCAN_ROOTS = [
  'app',
  'components',
  'lib',
  'hooks',
  'services',
  'i18n',
];

// Files allowed to contain the literal — they're the brand-enforcement guards.
const ALLOWLIST: ReadonlySet<string> = new Set([
  // (frontend has no current allowlisted files; backend guards live elsewhere)
]);

const BAD_PATTERN = /Sazon\s+[Cc]oach\b/g;

function listFiles(dir: string): string[] {
  const fullDir = path.join(PROJECT_ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (
        entry.isFile() &&
        (entry.name.endsWith('.ts') ||
          entry.name.endsWith('.tsx') ||
          entry.name.endsWith('.md') ||
          entry.name.endsWith('.json'))
      ) {
        out.push(path.relative(PROJECT_ROOT, p));
      }
    }
  };
  walk(fullDir);
  return out;
}

describe('IA2.0 — "Sazon Coach" rename coverage', () => {
  const files = SCAN_ROOTS.flatMap(listFiles).filter((rel) => !ALLOWLIST.has(rel));

  it('walks the relevant frontend roots', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no user-facing file contains the literal "Sazon Coach"', () => {
    const offenders: Array<{ file: string; lines: string[] }> = [];
    for (const rel of files) {
      const full = path.join(PROJECT_ROOT, rel);
      const src = fs.readFileSync(full, 'utf-8');
      const matches = src.match(BAD_PATTERN);
      if (matches && matches.length > 0) {
        // Capture the lines for a human-readable error
        const offendingLines: string[] = [];
        const lines = src.split('\n');
        lines.forEach((line, idx) => {
          if (BAD_PATTERN.test(line)) {
            offendingLines.push(`${rel}:${idx + 1}: ${line.trim()}`);
            BAD_PATTERN.lastIndex = 0; // reset between lines
          }
        });
        offenders.push({ file: rel, lines: offendingLines });
      }
    }
    if (offenders.length > 0) {
      const msg = offenders
        .flatMap((o) => o.lines)
        .join('\n');
      throw new Error(
        `IA2.0 cap: "Sazon Coach" / "Sazon coach" found in ${offenders.length} files:\n${msg}\n\n` +
          'The brand is "Sazon", not "Sazon Coach". Either rename the literal, or add the\n' +
          'file to the ALLOWLIST in __tests__/quality/sazonRenamingCoverage.test.ts (with\n' +
          'a rationale — typically only brand-enforcement guards qualify).',
      );
    }
    expect(offenders).toHaveLength(0);
  });
});
