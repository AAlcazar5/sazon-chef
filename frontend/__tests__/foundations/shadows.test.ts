import { Platform } from 'react-native';
import { Shadows, EditorialShadows } from '../../constants/Shadows';

describe('Editorial Shadow Tokens (10V-B)', () => {
  beforeEach(() => {
    // Default to iOS for shadow property tests
    (Platform as any).OS = 'ios';
    (Platform as any).select = (opts: Record<string, unknown>) => opts.ios ?? opts.default ?? {};
  });

  describe('new editorial shadow presets exist', () => {
    it('has platePhoto shadow', () => {
      expect(EditorialShadows.platePhoto).toBeDefined();
    });

    it('has cardRaised shadow', () => {
      expect(EditorialShadows.cardRaised).toBeDefined();
    });

    it('has fab shadow', () => {
      expect(EditorialShadows.fab).toBeDefined();
    });

    it('has blackCTA shadow', () => {
      expect(EditorialShadows.blackCTA).toBeDefined();
    });
  });

  describe('iOS shadow values are valid', () => {
    it('platePhoto has correct offset and radius', () => {
      const s = EditorialShadows.platePhoto.ios;
      expect(s.shadowOffset).toEqual({ width: 0, height: 14 });
      expect(s.shadowRadius).toBe(32);
      expect(s.shadowColor).toBeDefined();
    });

    it('cardRaised has correct offset and radius', () => {
      const s = EditorialShadows.cardRaised.ios;
      expect(s.shadowOffset).toEqual({ width: 0, height: 10 });
      expect(s.shadowRadius).toBe(28);
    });

    it('fab has correct offset and radius', () => {
      const s = EditorialShadows.fab.ios;
      expect(s.shadowOffset).toEqual({ width: 0, height: 10 });
      expect(s.shadowRadius).toBe(24);
    });

    it('blackCTA has correct offset and radius', () => {
      const s = EditorialShadows.blackCTA.ios;
      expect(s.shadowOffset).toEqual({ width: 0, height: 8 });
      expect(s.shadowRadius).toBe(20);
    });
  });

  describe('Android elevation integers', () => {
    it('each editorial shadow has an integer elevation', () => {
      for (const key of Object.keys(EditorialShadows) as (keyof typeof EditorialShadows)[]) {
        const elev = EditorialShadows[key].android.elevation;
        expect(Number.isInteger(elev)).toBe(true);
        expect(elev).toBeGreaterThan(0);
      }
    });
  });

  describe('existing Shadows unchanged', () => {
    it('SM shadow still exists', () => {
      expect(Shadows.SM).toBeDefined();
    });

    it('LG shadow still exists', () => {
      expect(Shadows.LG).toBeDefined();
    });
  });
});
