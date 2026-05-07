#!/usr/bin/env node
// frontend/scripts/buildTokens.cjs
//
// ROADMAP 4.0 DS0.4 — extract token values into a Markdown reference doc.
// Idempotent: byte-identical output on a second run if no token changed.
//
// Usage:
//   node scripts/buildTokens.cjs                  # writes docs/TOKENS.md
//   node scripts/buildTokens.cjs --out PATH       # custom output
//   node scripts/buildTokens.cjs --check          # exit 1 if doc is stale
//
// Programmatic API: build({ source?, out?, check? }) -> { markdown, outPath, wrote }

const fs = require('fs');
const path = require('path');

function flattenColors(obj, prefix = '') {
  const rows = [];
  if (typeof obj === 'string') {
    rows.push([prefix, obj]);
    return rows;
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    rows.push([prefix, String(obj)]);
    return rows;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const next = prefix ? `${prefix}.${k}` : k;
      rows.push(...flattenColors(v, next));
    }
  }
  return rows;
}

function renderTable(rows) {
  const out = [];
  out.push('| Token | Value |');
  out.push('|-------|-------|');
  for (const [k, v] of rows) {
    out.push(`| \`${k}\` | \`${v}\` |`);
  }
  return out.join('\n');
}

function build(options = {}) {
  const repoRoot = path.resolve(__dirname, '..');
  const sourcePath = options.source || path.join(repoRoot, 'constants', 'colorTokens.cjs');
  const outPath = options.out || path.join(repoRoot, 'docs', 'TOKENS.md');

  delete require.cache[require.resolve(sourcePath)];
  const tokens = require(sourcePath);

  const sections = [];
  for (const [namespace, value] of Object.entries(tokens)) {
    sections.push({ title: namespace, rows: flattenColors(value) });
  }

  const md = [];
  md.push('# Sazon design tokens');
  md.push('');
  md.push('> Auto-generated from `constants/colorTokens.cjs` by `scripts/buildTokens.cjs`. Do not edit by hand.');
  md.push('> See `frontend/design.md` for philosophy + rationale.');
  md.push('');
  for (const { title, rows } of sections) {
    md.push(`## ${title}`);
    md.push('');
    md.push(renderTable(rows));
    md.push('');
  }
  const markdown = md.join('\n');

  let wrote = false;
  if (options.check) {
    const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf-8') : '';
    if (existing !== markdown) {
      throw new Error('TOKENS.md is stale — re-run `npm run build:tokens`');
    }
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf-8') : '';
    if (existing !== markdown) {
      fs.writeFileSync(outPath, markdown, 'utf-8');
      wrote = true;
    }
  }

  return { markdown, outPath, wrote };
}

module.exports = { build };

if (require.main === module) {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--out' && args[i + 1]) {
      opts.out = args[i + 1];
      i += 1;
    } else if (args[i] === '--check') {
      opts.check = true;
    } else if (args[i] === '--source' && args[i + 1]) {
      opts.source = args[i + 1];
      i += 1;
    }
  }
  try {
    const r = build(opts);
    if (opts.check) {
      process.stdout.write('TOKENS.md up to date\n');
    } else {
      process.stdout.write(`${r.wrote ? 'wrote' : 'no-op'} ${r.outPath}\n`);
    }
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
}
