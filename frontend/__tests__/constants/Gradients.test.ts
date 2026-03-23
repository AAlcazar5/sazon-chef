// frontend/__tests__/constants/Gradients.test.ts
// Tests for centralized gradient presets

import {
  GradientPresets,
  primaryCTA,
  secondaryCTA,
  successCTA,
  premiumCTA,
  screenBgLight,
  screenBgDark,
  onboarding1,
  onboarding2,
  onboarding3,
  authBg,
  paywallBg,
  cardOverlay,
  heroWarm,
} from '../../constants/Gradients';

describe('Gradient Presets', () => {
  it('exports all named presets', () => {
    expect(Object.keys(GradientPresets)).toHaveLength(13);
  });

  it('each preset is a 2-element tuple', () => {
    Object.values(GradientPresets).forEach((preset) => {
      expect(preset).toHaveLength(2);
      expect(typeof preset[0]).toBe('string');
      expect(typeof preset[1]).toBe('string');
    });
  });

  it('CTA gradients use hex colors', () => {
    [primaryCTA, secondaryCTA, successCTA, premiumCTA].forEach((cta) => {
      expect(cta[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('primaryCTA is orange→red', () => {
    expect(primaryCTA[0]).toBe('#FF8B41');
    expect(primaryCTA[1]).toBe('#E84D3D');
  });

  it('successCTA is green', () => {
    expect(successCTA[0]).toBe('#66BB6A');
    expect(successCTA[1]).toBe('#43A047');
  });

  it('screen background gradients are valid', () => {
    expect(screenBgLight).toHaveLength(2);
    expect(screenBgDark).toHaveLength(2);
  });

  it('onboarding gradients exist for all 3 screens', () => {
    expect(onboarding1).toHaveLength(2);
    expect(onboarding2).toHaveLength(2);
    expect(onboarding3).toHaveLength(2);
  });

  it('overlay gradients include transparent', () => {
    expect(cardOverlay[0]).toBe('transparent');
    expect(heroWarm[0]).toBe('transparent');
  });

  it('individual exports match GradientPresets object', () => {
    expect(GradientPresets.primaryCTA).toBe(primaryCTA);
    expect(GradientPresets.screenBgLight).toBe(screenBgLight);
    expect(GradientPresets.authBg).toBe(authBg);
    expect(GradientPresets.paywallBg).toBe(paywallBg);
  });
});
