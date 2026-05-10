// frontend/__tests__/quality/imageCachePolicy.test.ts
// ROADMAP 4.0 E2 — every `<Image>` from expo-image must declare `cachePolicy`.
// Without `cachePolicy`, expo-image defaults to memory-only caching and recipe
// photos refetch on every cold-start. Cap test guards against drift.

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = [
  path.join(REPO_ROOT, 'components'),
  path.join(REPO_ROOT, 'app'),
];

function listExpoImageFiles(): string[] {
  const cmd =
    `grep -rln "from 'expo-image'" ${SCAN_DIRS.join(' ')} ` +
    `--include="*.tsx" --include="*.ts" 2>/dev/null || true`;
  const out = execSync(cmd, { encoding: 'utf-8' }).trim();
  return out ? out.split('\n').filter(Boolean) : [];
}

interface Violation {
  file: string;
  line: number;
  snippet: string;
}

function findImageViolations(file: string): Violation[] {
  const src = readFileSync(file, 'utf-8');
  const lines = src.split('\n');
  const violations: Violation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Match opening JSX `<Image` (not Image. or ImageBackground or ImageProps).
    if (!/<Image(\s|>|\/)/.test(trimmed)) continue;

    // Walk forward until the JSX tag ends (`>` or `/>`).
    let block = lines[i];
    let j = i;
    const MAX_LOOKAHEAD = 20;
    while (j < lines.length - 1 && !/\/?>\s*$/.test(lines[j].trimEnd()) && j - i < MAX_LOOKAHEAD) {
      j += 1;
      block += '\n' + lines[j];
    }
    if (!/cachePolicy\s*=/.test(block)) {
      violations.push({ file, line: i + 1, snippet: lines[i].trim() });
    }
  }
  return violations;
}

describe('expo-image cachePolicy (E2)', () => {
  const files = listExpoImageFiles();

  it('finds at least one expo-image consumer', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('every <Image> from expo-image declares cachePolicy', () => {
    const allViolations: Violation[] = [];
    for (const file of files) {
      allViolations.push(...findImageViolations(file));
    }
    if (allViolations.length > 0) {
      const detail = allViolations
        .map(v => `  ${path.relative(REPO_ROOT, v.file)}:${v.line}  ${v.snippet}`)
        .join('\n');
      throw new Error(
        `${allViolations.length} <Image> usage(s) missing cachePolicy:\n${detail}`,
      );
    }
    expect(allViolations.length).toBe(0);
  });
});

// P2: no component file may import `Image` from `react-native`.
// expo-image has built-in disk caching, faster decode, and the cachePolicy
// guard above. react-native's bundled Image lacks all three.
describe('Image source — react-native banned (P2)', () => {
  it('no component file imports Image from react-native', () => {
    const cmd =
      `grep -rlE "from ['\\"]react-native['\\"]" ${SCAN_DIRS.join(' ')} ` +
      `--include="*.tsx" --include="*.ts" 2>/dev/null || true`;
    const candidates = execSync(cmd, { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);

    const violators: string[] = [];
    for (const file of candidates) {
      const src = readFileSync(file, 'utf-8');
      // Match `import { ..., Image, ... } from 'react-native'` (multi-line aware)
      // but exclude `ImageBackground`, `ImageProps`, `ImageSourcePropType`, etc.
      const importBlocks = src.match(
        /import\s*\{[^}]*\}\s*from\s*['"]react-native['"]/gs,
      );
      if (!importBlocks) continue;
      for (const block of importBlocks) {
        // Strip ImageX identifiers, then look for a bare `Image`.
        const stripped = block.replace(/Image[A-Za-z]+/g, '');
        if (/\bImage\b/.test(stripped)) {
          violators.push(path.relative(REPO_ROOT, file));
          break;
        }
      }
    }

    if (violators.length > 0) {
      throw new Error(
        `${violators.length} file(s) import Image from react-native; migrate to 'expo-image':\n` +
          violators.map(v => `  ${v}`).join('\n'),
      );
    }
    expect(violators.length).toBe(0);
  });
});
