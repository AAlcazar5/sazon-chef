// frontend/__tests__/design/contrastTable.test.ts
// ROADMAP 4.0 DS1.1 — verify the contrast pairing table is internally consistent
// (no AA-pass row that actually fails the WCAG calculation) and surfaces a
// minimum set of safe combos engineers can pick by default.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { build, contrastRatio, classify, parseColor, compose } = require('../../scripts/buildContrastTable.cjs');

describe('DS1.1 — Contrast pairing table', () => {
  describe('contrast helpers', () => {
    it('parses #RRGGBB hex correctly', () => {
      expect(parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(parseColor('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    });

    it('parses rgba() with alpha', () => {
      expect(parseColor('rgba(10,20,30,0.5)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    });

    it('contrastRatio returns 21 for black on white (WCAG max)', () => {
      const ratio = contrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('contrastRatio returns 1 for identical colors', () => {
      expect(contrastRatio('#888888', '#888888')).toBeCloseTo(1, 5);
    });

    it('classify maps ratios to AA / AAA correctly', () => {
      expect(classify(7).label).toBe('AAA');
      expect(classify(5).label).toBe('AA');
      expect(classify(3.5).label).toBe('AA-large');
      expect(classify(2).label).toBe('fail');
      expect(classify(2).body).toBe(false);
      expect(classify(4.6).body).toBe(true);
      expect(classify(3.1).large).toBe(true);
    });

    it('compose blends a translucent foreground over an opaque background', () => {
      const result = compose({ r: 255, g: 0, b: 0, a: 0.5 }, { r: 0, g: 0, b: 255, a: 1 });
      expect(result.r).toBeCloseTo(127.5, 1);
      expect(result.g).toBe(0);
      expect(result.b).toBeCloseTo(127.5, 1);
      expect(result.a).toBe(1);
    });
  });

  describe('matrix integrity', () => {
    const built = build({ check: false, out: '/tmp/sazon-contrast-test.md' });
    const matrix = built.matrix;

    it('builds rows for both themes', () => {
      expect(matrix.light.length).toBeGreaterThan(0);
      expect(matrix.dark.length).toBeGreaterThan(0);
    });

    it('every row labeled AA / AAA actually passes 4.5:1 contrast', () => {
      for (const theme of ['light', 'dark']) {
        for (const row of matrix[theme]) {
          if (row.label === 'AA' || row.label === 'AAA') {
            expect({ ...row, ok: row.ratio >= 4.5 }).toMatchObject({ ok: true });
          }
        }
      }
    });

    it('every row labeled AA-large actually passes 3:1', () => {
      for (const theme of ['light', 'dark']) {
        for (const row of matrix[theme]) {
          if (row.label === 'AA-large') {
            expect({ ...row, ok: row.ratio >= 3 }).toMatchObject({ ok: true });
          }
        }
      }
    });

    it('every row labeled fail is below 3:1', () => {
      for (const theme of ['light', 'dark']) {
        for (const row of matrix[theme]) {
          if (row.label === 'fail') {
            expect(row.ratio).toBeLessThan(3);
          }
        }
      }
    });

    it('Ink.primary on Canvas passes AA in both themes (the most-used pair)', () => {
      const lightPrimaryOnCanvas = matrix.light.find(
        (r: (typeof matrix.light)[number]) => r.ink === 'primary' && r.surface === 'canvas',
      );
      const darkPrimaryOnCanvas = matrix.dark.find(
        (r: (typeof matrix.dark)[number]) => r.ink === 'primary' && r.surface === 'canvas',
      );
      expect(lightPrimaryOnCanvas?.body).toBe(true);
      expect(darkPrimaryOnCanvas?.body).toBe(true);
    });
  });

  describe('idempotency', () => {
    it('--check mode throws when CONTRAST.md is stale', () => {
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      const out = path.join(os.tmpdir(), `sazon-stale-${Date.now()}.md`);
      fs.writeFileSync(out, '# stale', 'utf-8');
      expect(() => build({ check: true, out })).toThrow(/stale/i);
      fs.unlinkSync(out);
    });

    it('writes once, no-op on second run', () => {
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      const out = path.join(os.tmpdir(), `sazon-fresh-${Date.now()}.md`);
      const a = build({ out });
      const b = build({ out });
      expect(a.wrote).toBe(true);
      expect(b.wrote).toBe(false);
      fs.unlinkSync(out);
    });
  });
});
