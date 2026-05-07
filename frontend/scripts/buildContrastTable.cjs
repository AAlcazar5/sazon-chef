#!/usr/bin/env node
// frontend/scripts/buildContrastTable.cjs
//
// ROADMAP 4.0 DS1.1 — auto-generate the WCAG AA contrast pairing table.
// Runs the Ink × Surface matrix in light + dark and emits a Markdown
// reference at frontend/docs/CONTRAST.md. Idempotent.
//
// Usage:
//   node scripts/buildContrastTable.cjs              # writes docs/CONTRAST.md
//   node scripts/buildContrastTable.cjs --check      # exit 1 if doc is stale

const fs = require('fs');
const path = require('path');

const tokens = require('../constants/colorTokens.cjs');

// ─── WCAG contrast helpers ──────────────────────────────────────────────
function parseColor(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  // Hex (#RGB / #RRGGBB)
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    const expand = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    if (expand.length !== 6) return null;
    const r = parseInt(expand.slice(0, 2), 16);
    const g = parseInt(expand.slice(2, 4), 16);
    const b = parseInt(expand.slice(4, 6), 16);
    return { r, g, b, a: 1 };
  }
  // rgba(R,G,B,A) / rgb(R,G,B)
  const m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)$/);
  if (m) {
    return {
      r: parseInt(m[1], 10),
      g: parseInt(m[2], 10),
      b: parseInt(m[3], 10),
      a: m[4] ? parseFloat(m[4]) : 1,
    };
  }
  return null;
}

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

// Composite a foreground (possibly with alpha) over an opaque background.
function compose(fg, bg) {
  if (fg.a >= 1) return fg;
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

function contrastRatio(fgInput, bgInput) {
  const fg0 = parseColor(fgInput);
  const bg0 = parseColor(bgInput);
  if (!fg0 || !bg0) return null;
  // bg must be opaque for our matrix; if not, treat as opaque (drop alpha).
  const bg = { ...bg0, a: 1 };
  const fg = compose(fg0, bg);
  const lFg = relativeLuminance(fg);
  const lBg = relativeLuminance(bg);
  const [lo, hi] = lFg < lBg ? [lFg, lBg] : [lBg, lFg];
  return (hi + 0.05) / (lo + 0.05);
}

// AA = 4.5 body / 3.0 large.
function classify(ratio) {
  if (ratio == null) return { label: 'n/a', body: false, large: false };
  if (ratio >= 7) return { label: 'AAA', body: true, large: true };
  if (ratio >= 4.5) return { label: 'AA', body: true, large: true };
  if (ratio >= 3) return { label: 'AA-large', body: false, large: true };
  return { label: 'fail', body: false, large: false };
}

// ─── Build matrix ───────────────────────────────────────────────────────
function buildMatrix() {
  const matrix = { light: [], dark: [] };

  for (const theme of ['light', 'dark']) {
    const inkBranch = tokens.Ink[theme];
    const surfaces = {
      canvas: tokens.Canvas[theme === 'light' ? 'light' : 'dark'],
      'canvas-warm': tokens.Canvas[theme === 'light' ? 'warmLight' : 'warmDark'],
      surface: tokens.Surface[theme].base,
      'surface-tint': tokens.Surface[theme].tint,
      'pastel-sage': tokens.PastelTokens[theme].sage,
      'pastel-golden': tokens.PastelTokens[theme].golden,
      'pastel-lavender': tokens.PastelTokens[theme].lavender,
      'pastel-peach': tokens.PastelTokens[theme].peach,
      'pastel-sky': tokens.PastelTokens[theme].sky,
      'pastel-blush': tokens.PastelTokens[theme].blush,
    };

    for (const inkKey of Object.keys(inkBranch)) {
      for (const surfKey of Object.keys(surfaces)) {
        const fg = inkBranch[inkKey];
        const bg = surfaces[surfKey];
        const ratio = contrastRatio(fg, bg);
        const cls = classify(ratio);
        matrix[theme].push({
          theme,
          ink: inkKey,
          surface: surfKey,
          fg,
          bg,
          ratio: ratio == null ? null : Math.round(ratio * 100) / 100,
          ...cls,
        });
      }
    }
  }

  return matrix;
}

function renderMarkdown(matrix) {
  const out = [];
  out.push('# Sazon contrast pairing table (DS1.1)');
  out.push('');
  out.push('> Auto-generated from `constants/colorTokens.cjs` by `scripts/buildContrastTable.cjs`. Do not edit by hand.');
  out.push('> WCAG AA: ≥ 4.5:1 for body text, ≥ 3:1 for large text. AAA: ≥ 7:1.');
  out.push('');

  for (const theme of ['light', 'dark']) {
    out.push(`## ${theme[0].toUpperCase()}${theme.slice(1)} mode`);
    out.push('');
    out.push('| Ink | Surface | Ratio | Class | AA body | AA large |');
    out.push('|-----|---------|------:|-------|:-:|:-:|');
    for (const row of matrix[theme]) {
      out.push(
        `| \`${row.ink}\` | \`${row.surface}\` | ${row.ratio?.toFixed(2) ?? 'n/a'} | ${row.label} | ${row.body ? '✅' : '❌'} | ${row.large ? '✅' : '❌'} |`,
      );
    }
    out.push('');
  }

  return out.join('\n');
}

function build(opts = {}) {
  const repoRoot = path.resolve(__dirname, '..');
  const outPath = opts.out || path.join(repoRoot, 'docs', 'CONTRAST.md');
  const matrix = buildMatrix();
  const md = renderMarkdown(matrix);
  let wrote = false;
  if (opts.check) {
    const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf-8') : '';
    if (existing !== md) throw new Error('CONTRAST.md is stale — re-run `npm run build:contrast`');
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf-8') : '';
    if (existing !== md) {
      fs.writeFileSync(outPath, md, 'utf-8');
      wrote = true;
    }
  }
  return { matrix, markdown: md, outPath, wrote };
}

module.exports = { build, contrastRatio, classify, parseColor, compose };

if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--out' && args[i + 1]) {
      opts.out = args[i + 1];
      i += 1;
    } else if (args[i] === '--check') {
      opts.check = true;
    }
  }
  try {
    const r = build(opts);
    if (opts.check) process.stdout.write('CONTRAST.md up to date\n');
    else process.stdout.write(`${r.wrote ? 'wrote' : 'no-op'} ${r.outPath}\n`);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
}
