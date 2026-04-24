import { Typography, FontFamily, EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

describe('Typography Foundation — Fraunces + Plus Jakarta Sans', () => {
  describe('EditorialFontFamily', () => {
    it('defines Fraunces display font families for all required weights', () => {
      expect(EditorialFontFamily.display.regular).toBe('Fraunces_400Regular');
      expect(EditorialFontFamily.display.light).toBe('Fraunces_300Light');
      expect(EditorialFontFamily.display.medium).toBe('Fraunces_500Medium');
      expect(EditorialFontFamily.display.semibold).toBe('Fraunces_600SemiBold');
      expect(EditorialFontFamily.display.bold).toBe('Fraunces_700Bold');
      expect(EditorialFontFamily.display.extrabold).toBe('Fraunces_800ExtraBold');
    });

    it('defines Fraunces italic font families for all required weights', () => {
      expect(EditorialFontFamily.displayItalic.regular).toBe('Fraunces_400Regular_Italic');
      expect(EditorialFontFamily.displayItalic.light).toBe('Fraunces_300Light_Italic');
      expect(EditorialFontFamily.displayItalic.medium).toBe('Fraunces_500Medium_Italic');
      expect(EditorialFontFamily.displayItalic.semibold).toBe('Fraunces_600SemiBold_Italic');
      expect(EditorialFontFamily.displayItalic.bold).toBe('Fraunces_700Bold_Italic');
      expect(EditorialFontFamily.displayItalic.extrabold).toBe('Fraunces_800ExtraBold_Italic');
    });

    it('defines Plus Jakarta Sans body font families for all required weights', () => {
      expect(EditorialFontFamily.body.regular).toBe('PlusJakartaSans_400Regular');
      expect(EditorialFontFamily.body.medium).toBe('PlusJakartaSans_500Medium');
      expect(EditorialFontFamily.body.semibold).toBe('PlusJakartaSans_600SemiBold');
      expect(EditorialFontFamily.body.bold).toBe('PlusJakartaSans_700Bold');
      expect(EditorialFontFamily.body.extrabold).toBe('PlusJakartaSans_800ExtraBold');
    });
  });

  describe('EditorialTypography presets', () => {
    it('display uses Fraunces 46px/400 with tight letter-spacing', () => {
      expect(EditorialTypography.display.fontFamily).toBe('Fraunces_400Regular');
      expect(EditorialTypography.display.fontSize).toBe(46);
      expect(EditorialTypography.display.letterSpacing).toBe(-1.5);
    });

    it('displayAccent uses Fraunces 46px/700 italic', () => {
      expect(EditorialTypography.displayAccent.fontFamily).toBe('Fraunces_700Bold_Italic');
      expect(EditorialTypography.displayAccent.fontSize).toBe(46);
    });

    it('sectionTitle uses Fraunces 26px/400 with letter-spacing -0.8', () => {
      expect(EditorialTypography.sectionTitle.fontFamily).toBe('Fraunces_400Regular');
      expect(EditorialTypography.sectionTitle.fontSize).toBe(26);
      expect(EditorialTypography.sectionTitle.letterSpacing).toBe(-0.8);
    });

    it('sectionAccent uses Fraunces 26px/600 italic', () => {
      expect(EditorialTypography.sectionAccent.fontFamily).toBe('Fraunces_600SemiBold_Italic');
      expect(EditorialTypography.sectionAccent.fontSize).toBe(26);
    });

    it('heroTitle uses Fraunces 22px/400', () => {
      expect(EditorialTypography.heroTitle.fontFamily).toBe('Fraunces_400Regular');
      expect(EditorialTypography.heroTitle.fontSize).toBe(22);
    });

    it('statNumber uses Fraunces 22px/600 with tight letter-spacing', () => {
      expect(EditorialTypography.statNumber.fontFamily).toBe('Fraunces_600SemiBold');
      expect(EditorialTypography.statNumber.fontSize).toBe(22);
      expect(EditorialTypography.statNumber.letterSpacing).toBe(-0.5);
    });

    it('recipeDetailTitle uses Fraunces 38px/400 with letter-spacing -1.2', () => {
      expect(EditorialTypography.recipeDetailTitle.fontFamily).toBe('Fraunces_400Regular');
      expect(EditorialTypography.recipeDetailTitle.fontSize).toBe(38);
      expect(EditorialTypography.recipeDetailTitle.letterSpacing).toBe(-1.2);
    });

    it('eyebrow uses Plus Jakarta Sans 11px/800 with wide letter-spacing', () => {
      expect(EditorialTypography.eyebrow.fontFamily).toBe('PlusJakartaSans_800ExtraBold');
      expect(EditorialTypography.eyebrow.fontSize).toBe(11);
      expect(EditorialTypography.eyebrow.letterSpacing).toBe(1.2);
      expect(EditorialTypography.eyebrow.textTransform).toBe('uppercase');
    });

    it('body uses Plus Jakarta Sans 14px/500', () => {
      expect(EditorialTypography.body.fontFamily).toBe('PlusJakartaSans_500Medium');
      expect(EditorialTypography.body.fontSize).toBe(14);
    });
  });

  describe('existing presets preserved', () => {
    it('keeps all legacy Typography presets', () => {
      const requiredKeys = [
        'display', 'hero', 'h1', 'h2', 'h3', 'h4', 'h5',
        'body', 'bodyLarge', 'bodySmall', 'label', 'input',
        'button', 'buttonSmall', 'caption', 'hint', 'error',
        'badge', 'tabLabel', 'navTitle', 'stat', 'statLarge',
      ];
      for (const key of requiredKeys) {
        expect(Typography).toHaveProperty(key);
        expect((Typography as Record<string, unknown>)[key]).toHaveProperty('fontSize');
      }
    });

    it('keeps legacy FontFamily values', () => {
      expect(FontFamily.regular).toBeDefined();
      expect(FontFamily.bold).toBeDefined();
      expect(FontFamily.system).toBeDefined();
    });
  });

  describe('font map for loading', () => {
    it('exports EDITORIAL_FONTS map with all required font assets', () => {
      const { EDITORIAL_FONTS } = require('../../constants/Typography');
      // Fraunces weights 300-800 regular + italic = 12
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_300Light');
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_400Regular');
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_500Medium');
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_600SemiBold');
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_700Bold');
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_800ExtraBold');
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_300Light_Italic');
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_400Regular_Italic');
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_500Medium_Italic');
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_600SemiBold_Italic');
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_700Bold_Italic');
      expect(EDITORIAL_FONTS).toHaveProperty('Fraunces_800ExtraBold_Italic');
      // Plus Jakarta Sans weights 400-800 = 5
      expect(EDITORIAL_FONTS).toHaveProperty('PlusJakartaSans_400Regular');
      expect(EDITORIAL_FONTS).toHaveProperty('PlusJakartaSans_500Medium');
      expect(EDITORIAL_FONTS).toHaveProperty('PlusJakartaSans_600SemiBold');
      expect(EDITORIAL_FONTS).toHaveProperty('PlusJakartaSans_700Bold');
      expect(EDITORIAL_FONTS).toHaveProperty('PlusJakartaSans_800ExtraBold');
      // Each value should be a font asset (number in expo)
      expect(typeof EDITORIAL_FONTS['Fraunces_400Regular']).toBe('number');
    });
  });
});
