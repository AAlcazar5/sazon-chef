// frontend/__tests__/scripts/buildTokens.test.ts
// ROADMAP 4.0 DS0.4 — buildTokens script.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { build } = require('../../scripts/buildTokens.cjs');

const FIXTURE_SOURCE = `
module.exports = {
  Brand: {
    light: { base: '#fa7e12', deep: '#d67a0c' },
    dark: { base: '#FF9559' },
  },
  Canvas: {
    light: '#FFFFFF',
    dark: '#0A0A0A',
  },
};
`.trim();

function writeFixture(): { sourcePath: string; outPath: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-tokens-'));
  const sourcePath = path.join(dir, 'tokens.cjs');
  const outPath = path.join(dir, 'docs', 'TOKENS.md');
  fs.writeFileSync(sourcePath, FIXTURE_SOURCE, 'utf-8');
  return {
    sourcePath,
    outPath,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

describe('DS0.4 — buildTokens script', () => {
  it('writes a TOKENS.md table containing every token', () => {
    const f = writeFixture();
    try {
      const r = build({ source: f.sourcePath, out: f.outPath });
      expect(r.wrote).toBe(true);
      const md = fs.readFileSync(f.outPath, 'utf-8');
      expect(md).toContain('| `light.base` | `#fa7e12` |');
      expect(md).toContain('| `light.deep` | `#d67a0c` |');
      expect(md).toContain('| `dark.base` | `#FF9559` |');
      expect(md).toContain('| `light` | `#FFFFFF` |');
      expect(md).toContain('| `dark` | `#0A0A0A` |');
      expect(md).toContain('## Brand');
      expect(md).toContain('## Canvas');
    } finally {
      f.cleanup();
    }
  });

  it('is idempotent — second run does not modify the file', () => {
    const f = writeFixture();
    try {
      const a = build({ source: f.sourcePath, out: f.outPath });
      const firstMtime = fs.statSync(f.outPath).mtimeMs;
      // Force a tick so any spurious write would change mtime.
      const b = build({ source: f.sourcePath, out: f.outPath });
      const secondMtime = fs.statSync(f.outPath).mtimeMs;
      expect(a.wrote).toBe(true);
      expect(b.wrote).toBe(false);
      expect(secondMtime).toBe(firstMtime);
    } finally {
      f.cleanup();
    }
  });

  it('--check throws when TOKENS.md is stale', () => {
    const f = writeFixture();
    try {
      // Write a stale doc first.
      fs.mkdirSync(path.dirname(f.outPath), { recursive: true });
      fs.writeFileSync(f.outPath, '# stale', 'utf-8');
      expect(() => build({ source: f.sourcePath, out: f.outPath, check: true })).toThrow(/stale/i);
    } finally {
      f.cleanup();
    }
  });

  it('--check passes when TOKENS.md is fresh', () => {
    const f = writeFixture();
    try {
      build({ source: f.sourcePath, out: f.outPath });
      expect(() => build({ source: f.sourcePath, out: f.outPath, check: true })).not.toThrow();
    } finally {
      f.cleanup();
    }
  });

  it('output is byte-identical between runs (idempotency contract)', () => {
    const f = writeFixture();
    try {
      const a = build({ source: f.sourcePath, out: f.outPath });
      const md1 = fs.readFileSync(f.outPath, 'utf-8');
      // Re-run.
      build({ source: f.sourcePath, out: f.outPath });
      const md2 = fs.readFileSync(f.outPath, 'utf-8');
      expect(md1).toBe(md2);
      expect(a.markdown).toBe(md1);
    } finally {
      f.cleanup();
    }
  });
});
