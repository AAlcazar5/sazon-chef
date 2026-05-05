#!/usr/bin/env node
// scripts/refactor-baseline.js
// ROADMAP 4.0 R13 — Refactor baseline snapshot.
//
// Walks the frontend + backend codebases and collects the audit numbers that
// drive the Tier R backlog (TS errors, banned-pattern counts, oversized files,
// failing-test count, console.* count, `any` count). Writes the result to
// `.context/refactor-baseline.json` so we can detect drift over time.
//
// Run manually: `node scripts/refactor-baseline.js`
// (CI: schedule via cron / GitHub Actions; the script never throws.)

'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(REPO_ROOT, 'frontend');
const BACKEND = path.join(REPO_ROOT, 'backend');
const OUT_DIR = path.join(REPO_ROOT, '.context');
const OUT_FILE = path.join(OUT_DIR, 'refactor-baseline.json');

function safeRun(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], ...opts }).toString();
  } catch (err) {
    // Many of these greps return non-zero on zero matches; fall through with stdout.
    if (err.stdout) return err.stdout.toString();
    return '';
  }
}

function countMatches(stdout) {
  if (!stdout || !stdout.trim()) return 0;
  return stdout.trim().split('\n').length;
}

function countLargeFiles(rootDir, threshold = 800) {
  if (!fs.existsSync(rootDir)) return 0;
  const list = safeRun(
    `find ${rootDir} \\( -name node_modules -o -name coverage -o -name "coverage-*" -o -name dist -o -name build \\) -prune -o -type f \\( -name "*.ts" -o -name "*.tsx" \\) -print`,
  )
    .split('\n')
    .filter(Boolean);
  let count = 0;
  for (const file of list) {
    const lines = safeRun(`wc -l < "${file}"`).trim();
    if (Number(lines) > threshold) count += 1;
  }
  return count;
}

function tsErrorCount(rootDir) {
  if (!fs.existsSync(rootDir)) return 0;
  const out = safeRun('npx tsc --noEmit 2>&1', { cwd: rootDir });
  const lines = out.split('\n').filter((l) => /error TS\d+/.test(l));
  return lines.length;
}

function jestFailCount(rootDir) {
  if (!fs.existsSync(rootDir)) return 0;
  const out = safeRun('npx jest --silent --no-coverage 2>&1 || true', { cwd: rootDir });
  const m = out.match(/Tests:\s+(\d+) failed/);
  return m ? Number(m[1]) : 0;
}

function grepCount(args) {
  return countMatches(safeRun(`grep -rE ${args}`));
}

function buildSnapshot() {
  return {
    generatedAt: new Date().toISOString(),
    frontend: {
      tsErrorsAll: tsErrorCount(FRONTEND),
      tsErrorsNonTest: countMatches(
        safeRun('npx tsc --noEmit 2>&1 || true', { cwd: FRONTEND })
          .split('\n')
          .filter((l) => /error TS\d+/.test(l) && !l.includes('__tests__/'))
          .join('\n'),
      ),
      bannedPatterns: {
        borderGray: grepCount(
          `"border border-gray" ${FRONTEND} --include="*.tsx" 2>/dev/null`,
        ),
        borderRadius8: grepCount(
          `"borderRadius: 8" ${FRONTEND} --include="*.tsx" 2>/dev/null`,
        ),
        activityIndicator: grepCount(
          `"<ActivityIndicator" ${FRONTEND} --include="*.tsx" 2>/dev/null`,
        ),
        rawAnimated: grepCount(
          `"Animated[,}]" ${FRONTEND}/components ${FRONTEND}/app --include="*.tsx" 2>/dev/null | grep "from 'react-native'"`,
        ),
      },
      largeFiles: countLargeFiles(FRONTEND),
      anyUsage: grepCount(
        `"as any|: any\\\\b" ${FRONTEND} --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "__tests__"`,
      ),
    },
    backend: {
      tsErrors: tsErrorCount(BACKEND),
      consoleCalls: grepCount(
        `"console\\\\.(log|warn|error|info|debug)" ${BACKEND}/src --include="*.ts" 2>/dev/null`,
      ),
      largeFiles: countLargeFiles(path.join(BACKEND, 'src')),
    },
  };
}

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  const snapshot = buildSnapshot();
  fs.writeFileSync(OUT_FILE, JSON.stringify(snapshot, null, 2) + '\n');
  // eslint-disable-next-line no-console
  console.log(`refactor-baseline written to ${OUT_FILE}`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(snapshot, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { buildSnapshot };
