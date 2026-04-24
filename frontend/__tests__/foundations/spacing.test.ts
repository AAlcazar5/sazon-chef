import { Spacing, ComponentSpacing, BorderRadius } from '../../constants/Spacing';

describe('Spacing Token Updates (10V-B)', () => {
  it('screenPadding is 20 (v2 editorial)', () => {
    expect(ComponentSpacing.screen.paddingHorizontal).toBe(20);
  });

  it('BorderRadius.hero is 28', () => {
    expect(BorderRadius.hero).toBe(28);
  });

  it('BorderRadius.heroCurve is 36', () => {
    expect(BorderRadius.heroCurve).toBe(36);
  });

  it('existing spacing values unchanged', () => {
    expect(Spacing.xs).toBe(4);
    expect(Spacing.sm).toBe(8);
    expect(Spacing.lg).toBe(16);
  });

  it('existing BorderRadius values unchanged', () => {
    expect(BorderRadius.card).toBe(20);
    expect(BorderRadius.sheet).toBe(28);
    expect(BorderRadius.full).toBe(9999);
  });
});
