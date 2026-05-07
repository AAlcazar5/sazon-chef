// frontend/__tests__/design/typography.test.ts
// ROADMAP 4.0 DS5.2 + DS5.4 — type system contracts.

import { Type } from '../../constants/tokens';

describe('DS5.2 — Fraunces / Plus Jakarta threshold', () => {
  it('display tokens (≥22px) use Fraunces', () => {
    const displays = ['display', 'displayLg', 'displayMd', 'headingLg', 'heading', 'headingSm'] as const;
    for (const k of displays) {
      const fontSize = Type[k].fontSize as number;
      expect({ key: k, fontSize, isFraunces: String(Type[k].fontFamily ?? '').startsWith('Fraunces') }).toMatchObject({
        isFraunces: true,
      });
      expect(fontSize).toBeGreaterThanOrEqual(22);
    }
  });

  it('body / UI tokens (<22px) use Plus Jakarta', () => {
    const bodies = ['body', 'bodySm', 'bodyLg', 'caption', 'label', 'title', 'subheading'] as const;
    for (const k of bodies) {
      const fontSize = Type[k].fontSize as number;
      expect({ key: k, fontSize, isPlusJakarta: String(Type[k].fontFamily ?? '').startsWith('PlusJakarta') }).toMatchObject({
        isPlusJakarta: true,
      });
      expect(fontSize).toBeLessThan(22);
    }
  });

  it('eyebrow exception — 11px Plus Jakarta extrabold uppercase', () => {
    expect(Type.eyebrow.fontSize).toBe(11);
    expect(String(Type.eyebrow.fontFamily ?? '')).toBe('PlusJakartaSans_800ExtraBold');
    expect(Type.eyebrow.textTransform).toBe('uppercase');
  });
});

describe('DS5.4 — Tabular figures on stat tokens', () => {
  it('Type.stat includes fontVariant tabular-nums', () => {
    expect(Type.stat.fontVariant).toEqual(expect.arrayContaining(['tabular-nums']));
  });
  it('Type.statDisplay includes fontVariant tabular-nums', () => {
    expect(Type.statDisplay.fontVariant).toEqual(expect.arrayContaining(['tabular-nums']));
  });
  it('Type.statHero includes fontVariant tabular-nums', () => {
    expect(Type.statHero.fontVariant).toEqual(expect.arrayContaining(['tabular-nums']));
  });
  it('Type.body does NOT include tabular-nums (proportional figures for prose)', () => {
    expect(Type.body.fontVariant).toBeUndefined();
  });
});
