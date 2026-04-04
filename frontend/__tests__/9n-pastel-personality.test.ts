// frontend/__tests__/9n-pastel-personality.test.ts
// 9N: Verifies pastel personality contracts — gradients, error states, friendly copy.

import {
  onboarding1,
  onboarding2,
  onboarding3,
  authBg,
  paywallBg,
  premiumCTA,
} from '../constants/Gradients';
import { GenericEmptyStates } from '../constants/EmptyStates';
import { Pastel, PastelDark } from '../constants/Colors';

// Regexes for banned system-failure copy
const BANNED_COPY = /\b(Error:|Failed to|Invalid)\b/;

describe('9N — Pastel Personality', () => {
  describe('Onboarding gradients', () => {
    it('exposes 3 distinct onboarding gradients', () => {
      const gradients = [onboarding1, onboarding2, onboarding3];
      gradients.forEach((g) => {
        expect(g).toHaveLength(2);
        expect(g[0]).toMatch(/^#[0-9A-F]{6}$/i);
        expect(g[1]).toMatch(/^#[0-9A-F]{6}$/i);
      });
      // All 3 start colors distinct
      const starts = gradients.map((g) => g[0]);
      expect(new Set(starts).size).toBe(3);
    });

    it('onboarding1 is peach (welcome/name)', () => {
      expect(onboarding1[0]).toBe('#FFF0E5');
    });

    it('onboarding2 is sage (restrictions)', () => {
      expect(onboarding2[0]).toBe('#E8F5E9');
    });

    it('onboarding3 is lavender (goal)', () => {
      expect(onboarding3[0]).toBe('#F3E5F5');
    });

    it('all onboarding gradients end in cream (#FAF7F4)', () => {
      expect(onboarding1[1]).toBe('#FAF7F4');
      expect(onboarding2[1]).toBe('#FAF7F4');
      expect(onboarding3[1]).toBe('#FAF7F4');
    });
  });

  describe('Auth gradient', () => {
    it('authBg is a warm orange tint → cream', () => {
      expect(authBg).toHaveLength(2);
      expect(authBg[0]).toMatch(/rgba\(255,\s*139,\s*65/);
      expect(authBg[1]).toBe('#FAF7F4');
    });
  });

  describe('Paywall gradient', () => {
    it('paywallBg starts dark navy', () => {
      expect(paywallBg[0]).toBe('#1A1A2E');
    });

    it('paywallBg ends with orange glow', () => {
      expect(paywallBg[1]).toMatch(/rgba\(255,\s*139,\s*65/);
    });

    it('premiumCTA is orange → pink gradient', () => {
      expect(premiumCTA[0]).toBe('#FF8B41');
      expect(premiumCTA[1]).toBe('#F06292');
    });
  });

  describe('Error states — pastel tint + mascot', () => {
    const errorKeys = ['error', 'noResults', 'offline', 'timeout'] as const;

    it.each(errorKeys)('%s has a mascot with pastel tint', (key) => {
      const cfg = GenericEmptyStates[key];
      expect(cfg).toBeDefined();
      expect(cfg.useMascot).toBe(true);
      expect(cfg.mascotExpression).toBeTruthy();
      expect(cfg.pastelTint).toBeTruthy();
      expect(cfg.pastelTintDark).toBeTruthy();
    });

    it('each error state uses a distinct pastel tint', () => {
      const tints = errorKeys.map((k) => GenericEmptyStates[k].pastelTint);
      expect(new Set(tints).size).toBe(errorKeys.length);
    });

    it('pastel tints come from the Pastel palette', () => {
      const palette = Object.values(Pastel);
      errorKeys.forEach((k) => {
        expect(palette).toContain(GenericEmptyStates[k].pastelTint);
      });
    });

    it('dark-mode tints come from the PastelDark palette', () => {
      const palette = Object.values(PastelDark);
      errorKeys.forEach((k) => {
        expect(palette).toContain(GenericEmptyStates[k].pastelTintDark);
      });
    });

    it('error state uses lavender tint (per roadmap)', () => {
      expect(GenericEmptyStates.error.pastelTint).toBe(Pastel.lavender);
    });

    it('offline state uses sky tint (per roadmap)', () => {
      expect(GenericEmptyStates.offline.pastelTint).toBe(Pastel.sky);
    });

    it('timeout state uses golden tint (per roadmap)', () => {
      expect(GenericEmptyStates.timeout.pastelTint).toBe(Pastel.golden);
    });
  });

  describe('Error states — friendly copy (no system-failure words)', () => {
    const allKeys = Object.keys(GenericEmptyStates) as Array<keyof typeof GenericEmptyStates>;

    it.each(allKeys)('%s title has no "Error:", "Failed to", or "Invalid"', (key) => {
      const { title } = GenericEmptyStates[key];
      expect(title).not.toMatch(BANNED_COPY);
    });

    it.each(allKeys)('%s description has no "Error:", "Failed to", or "Invalid"', (key) => {
      const { description } = GenericEmptyStates[key];
      if (description) expect(description).not.toMatch(BANNED_COPY);
    });

    it('error title leads with personality ("Hmm")', () => {
      expect(GenericEmptyStates.error.title).toMatch(/^Hmm/);
    });
  });

  describe('Paywall features — pastel variety', () => {
    // Feature tints are defined inline in PaywallScreen.tsx — verified by
    // confirming the Pastel palette has the 6 expected keys the paywall uses.
    const requiredPastels = ['sage', 'sky', 'lavender', 'peach', 'golden', 'blush'] as const;

    it('all 6 required pastel keys exist for feature badges', () => {
      requiredPastels.forEach((key) => {
        expect(Pastel[key]).toMatch(/^#[0-9A-F]{6}$/i);
        expect(PastelDark[key]).toMatch(/^rgba\(/);
      });
    });

    it('all 6 pastel values are distinct (so feature badges look unique)', () => {
      const values = requiredPastels.map((k) => Pastel[k]);
      expect(new Set(values).size).toBe(requiredPastels.length);
    });
  });
});
