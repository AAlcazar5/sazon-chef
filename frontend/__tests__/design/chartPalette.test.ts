// frontend/__tests__/design/chartPalette.test.ts
// ROADMAP 4.0 DS3.1 — chart palette must be perceptually distinguishable.
// Adjacent pairs > ΔE 12 in OkLab (approximated via a fast sRGB→Lab path).

import { Chart } from '../../constants/tokens';

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return [r, g, b];
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const [rl, gl, bl] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  return [
    rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375,
    rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175,
    rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041,
  ];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const refX = 0.95047;
  const refY = 1.0;
  const refZ = 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / refX);
  const fy = f(y / refY);
  const fz = f(z / refZ);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(a: string, b: string): number {
  const [ra, ga, ba] = hexToRgb(a);
  const [rb, gb, bb] = hexToRgb(b);
  const [xa, ya, za] = rgbToXyz(ra, ga, ba);
  const [xb, yb, zb] = rgbToXyz(rb, gb, bb);
  const [la, aa, baStar] = xyzToLab(xa, ya, za);
  const [lb, ab, bbStar] = xyzToLab(xb, yb, zb);
  return Math.sqrt((la - lb) ** 2 + (aa - ab) ** 2 + (baStar - bbStar) ** 2);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  const [lo, hi] = la < lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe('DS3.1 — Chart palette', () => {
  it('exposes 8 series colors per branch', () => {
    expect(Chart.light.series).toHaveLength(8);
    expect(Chart.dark.series).toHaveLength(8);
  });

  it('every adjacent pair in light series has ΔE > 12 (perceptually distinct)', () => {
    for (let i = 0; i < Chart.light.series.length - 1; i += 1) {
      const a = Chart.light.series[i];
      const b = Chart.light.series[i + 1];
      const d = deltaE(a, b);
      expect({ pair: `${a}-${b}`, deltaE: Math.round(d * 100) / 100, ok: d > 12 }).toMatchObject({ ok: true });
    }
  });

  it('every adjacent pair in dark series has ΔE > 12', () => {
    for (let i = 0; i < Chart.dark.series.length - 1; i += 1) {
      const a = Chart.dark.series[i];
      const b = Chart.dark.series[i + 1];
      const d = deltaE(a, b);
      expect({ pair: `${a}-${b}`, deltaE: Math.round(d * 100) / 100, ok: d > 12 }).toMatchObject({ ok: true });
    }
  });

  it('dark variants pass AA contrast on Surface.dark.base (#141414) for large text', () => {
    // AA large text = 3:1 minimum.
    for (const c of Chart.dark.series) {
      const ratio = contrast(c, '#141414');
      expect({ color: c, ratio: Math.round(ratio * 100) / 100, passes: ratio >= 3 }).toMatchObject({ passes: true });
    }
  });
});
