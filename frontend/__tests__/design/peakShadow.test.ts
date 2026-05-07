// frontend/__tests__/design/peakShadow.test.ts
// ROADMAP 4.0 DS2.3 — peak shadow depth locked at 6px.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const colorTokens = require('../../constants/colorTokens.cjs');

describe('DS2.3 — Peak shadow depth', () => {
  it('PeakShadow.depth is locked at 6px (Duolingo-spirited joy peak)', () => {
    expect(colorTokens.PeakShadow.depth).toBe(6);
  });

  it('PeakShadow.pressTranslate matches depth (button drops fully on press)', () => {
    expect(colorTokens.PeakShadow.pressTranslate).toBe(colorTokens.PeakShadow.depth);
  });

  it('PeakShadow colors are unchanged (DS2.3 decision was about depth, not hue)', () => {
    expect(colorTokens.PeakShadow.lightColor).toBe('#d67a0c');
    expect(colorTokens.PeakShadow.darkColor).toBe('#E07A40');
  });
});
