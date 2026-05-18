// frontend/scripts/banned-patterns.ts
//
// ROADMAP 4.0 DS0.3 — banned-pattern scanner.
//
// Programmatic API (`scan`) returns a list of violations with file + line + rule.
// CLI entry-point exits non-zero if any violations are found.
//
// Rules enforced:
//   1. brand-coral-literal      — `#fa7e12` (or `#FA7E12`) outside the token files.
//   2. card-radius-8            — `borderRadius: 8` (or `rounded-lg`) on JSX with
//                                 className containing "card", or in a file whose name
//                                 ends in `Card.tsx`.
//   3. touchable-without-press  — `<TouchableOpacity>` / `<Pressable>` without
//                                 `pressedScale` AND not wrapped in HapticTouchable*.
//   4. mixed-colors-and-brand   — same file imports BOTH `from '../constants/Colors'`
//                                 (any depth) AND `from '../constants/tokens'` (any depth).
//
// Allowlist for rule 1: constants/colorTokens.cjs, constants/Colors.ts,
//                       constants/DarkColors.ts (if present), constants/tokens.ts.

import * as fs from 'fs';
import * as path from 'path';

export interface Violation {
  file: string;
  line: number;
  rule:
    | 'brand-coral-literal'
    | 'card-radius-8'
    | 'touchable-without-press'
    | 'mixed-colors-and-brand'
    | 'touchable-without-a11y-label';
  excerpt: string;
}

const TOKEN_FILE_RE = /constants\/(colorTokens\.cjs|Colors\.ts|DarkColors\.ts|tokens\.ts)$/;
const BRAND_CORAL_RE = /#fa7e12/i;
const RADIUS_8_RE = /borderRadius:\s*8(?!\d)/;
const ROUNDED_LG_RE = /\brounded-lg\b/;
const TOUCHABLE_OPEN_RE = /<(TouchableOpacity|Pressable|HapticTouchableOpacity)\b/;
const PRESSED_SCALE_RE = /pressedScale\s*[=:]/;
const A11Y_LABEL_RE = /accessibilityLabel\s*[=:]/;
const A11Y_ROLE_RE = /accessibilityRole\s*[=:]/;
const COLORS_IMPORT_RE = /from\s+['"][./\w-]*constants\/(Colors|DarkColors)['"]/;
const TOKENS_IMPORT_RE = /from\s+['"][./\w-]*constants\/tokens['"]/;
// W-D1 no-recipe-count law (D-7) — user-facing catalog counts / paginator
// denominators. High-signal only, to avoid FP on unrelated numeric copy.
export const CATALOG_COUNT_RE =
  /\bOF \d+ RECIPES\b|Found \d+ recipes?\b|\bof \d+ (?:recipes?|pages?)\b|\d+ recipes? (?:matching|found|available)\b/i;

const ALLOWED_DIRS_FOR_LITERAL = new Set([
  'constants/colorTokens.cjs',
  'constants/Colors.ts',
  'constants/DarkColors.ts',
  'constants/tokens.ts',
]);

function isTokenFile(relPath: string): boolean {
  return TOKEN_FILE_RE.test(relPath) || ALLOWED_DIRS_FOR_LITERAL.has(relPath);
}

function shouldScan(file: string): boolean {
  if (file.includes('node_modules')) return false;
  if (file.includes('__tests__')) return false;
  if (file.includes('__fixtures__')) return false;
  if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) return false;
  return /\.(ts|tsx|js|jsx)$/.test(file);
}

function* walk(dir: string): Generator<string> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

function classNameContainsCard(line: string): boolean {
  const m = line.match(/className\s*=\s*["'`]([^"'`]+)["'`]/);
  if (!m) return false;
  return m[1].split(/\s+/).some((tok) => tok === 'card');
}

function scanFile(file: string, repoRoot: string): Violation[] {
  const rel = path.relative(repoRoot, file);
  const violations: Violation[] = [];
  let content: string;
  try {
    content = fs.readFileSync(file, 'utf-8');
  } catch {
    return violations;
  }
  const lines = content.split('\n');
  const isCardFile = /Card\.tsx?$/.test(file);
  const tokenFile = isTokenFile(rel);

  // Rule 4 — mixed import sources (file-level)
  const hasColorsImport = COLORS_IMPORT_RE.test(content);
  const hasTokensImport = TOKENS_IMPORT_RE.test(content);
  if (hasColorsImport && hasTokensImport && !tokenFile) {
    // Report on the first Colors line for actionable feedback.
    const idx = lines.findIndex((l) => COLORS_IMPORT_RE.test(l));
    violations.push({
      file: rel,
      line: idx >= 0 ? idx + 1 : 1,
      rule: 'mixed-colors-and-brand',
      excerpt: idx >= 0 ? lines[idx].trim() : '',
    });
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // Rule 1 — brand-coral hex outside token files
    if (!tokenFile && BRAND_CORAL_RE.test(line)) {
      violations.push({
        file: rel,
        line: i + 1,
        rule: 'brand-coral-literal',
        excerpt: line.trim(),
      });
    }

    // Rule 1b — W-D1 no-recipe-count (D-7): user-facing catalog counts.
    if (CATALOG_COUNT_RE.test(line)) {
      violations.push({
        file: rel,
        line: i + 1,
        rule: 'recipe-count-user-copy',
        excerpt: line.trim(),
      });
    }

    // Rule 2 — radius 8 on card JSX
    const radiusHit = RADIUS_8_RE.test(line);
    const roundedLgHit = ROUNDED_LG_RE.test(line);
    if (radiusHit || roundedLgHit) {
      const lineLooksCard = classNameContainsCard(line) || isCardFile;
      if (lineLooksCard) {
        violations.push({
          file: rel,
          line: i + 1,
          rule: 'card-radius-8',
          excerpt: line.trim(),
        });
      }
    }

    // Rules 3 + 5 — touchable without pressedScale / a11y label
    if (TOUCHABLE_OPEN_RE.test(line)) {
      const window = lines.slice(i, Math.min(i + 8, lines.length)).join('\n');
      const close = window.indexOf('>');
      const inner = close >= 0 ? window.slice(0, close + 1) : window;
      if (!PRESSED_SCALE_RE.test(inner)) {
        violations.push({
          file: rel,
          line: i + 1,
          rule: 'touchable-without-press',
          excerpt: line.trim(),
        });
      }
      // DS1.5 — every interactive must carry accessibilityLabel OR accessibilityRole.
      if (!A11Y_LABEL_RE.test(inner) && !A11Y_ROLE_RE.test(inner)) {
        violations.push({
          file: rel,
          line: i + 1,
          rule: 'touchable-without-a11y-label',
          excerpt: line.trim(),
        });
      }
    }
  }

  return violations;
}

export function scan(roots: string[], repoRoot: string = process.cwd()): Violation[] {
  const out: Violation[] = [];
  for (const root of roots) {
    const abs = path.isAbsolute(root) ? root : path.join(repoRoot, root);
    for (const file of walk(abs)) {
      if (!shouldScan(file)) continue;
      out.push(...scanFile(file, repoRoot));
    }
  }
  return out;
}

// CLI entry-point — exits non-zero on violations.
if (require.main === module) {
  const roots = process.argv.slice(2);
  const targets = roots.length > 0 ? roots : ['app', 'components', 'hooks', 'lib'];
  const violations = scan(targets);
  if (violations.length === 0) {
    process.stdout.write('banned-patterns: clean\n');
    process.exit(0);
  }
  for (const v of violations) {
    process.stdout.write(`${v.file}:${v.line}\t[${v.rule}]\t${v.excerpt}\n`);
  }
  process.stdout.write(`\n${violations.length} violation(s)\n`);
  process.exit(1);
}
