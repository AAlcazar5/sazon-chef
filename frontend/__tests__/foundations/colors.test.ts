import { Colors, Pastel, EditorialColors } from '../../constants/Colors';

// Relative luminance for sRGB (WCAG 2.1)
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Editorial Color Tokens (10V-B)', () => {
  describe('new token existence', () => {
    it('has fg.muted_cream for inactive labels', () => {
      expect(EditorialColors.fg.muted_cream).toBe('#C9BFB5');
    });

    it('has blackCTA token', () => {
      expect(EditorialColors.blackCTA).toBe('#111827');
    });

    it('has all pastelTitle colors', () => {
      expect(EditorialColors.pastelTitle.peach).toBe('#8a4a00');
      expect(EditorialColors.pastelTitle.sage).toBe('#2E5931');
      expect(EditorialColors.pastelTitle.lavender).toBe('#6a2677');
      expect(EditorialColors.pastelTitle.sky).toBe('#0f4a7a');
      expect(EditorialColors.pastelTitle.golden).toBe('#8a6200');
      expect(EditorialColors.pastelTitle.blush).toBe('#9a1f5b');
    });
  });

  describe('WCAG AA contrast — pastelTitle on pastel bg', () => {
    const pairs: [string, string, string][] = [
      ['peach', '#8a4a00', Pastel.peach],
      ['sage', '#2E5931', Pastel.sage],
      ['lavender', '#6a2677', Pastel.lavender],
      ['sky', '#0f4a7a', Pastel.sky],
      ['golden', '#8a6200', Pastel.golden],
      ['blush', '#9a1f5b', Pastel.blush],
    ];

    it.each(pairs)('%s title has >= 4.5:1 contrast against its pastel bg', (_name, fg, bg) => {
      const ratio = contrastRatio(fg, bg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('existing Colors object unchanged', () => {
    it('primary color is still brand orange', () => {
      expect(Colors.primary).toBe('#fa7e12');
    });

    it('text.primary is still gray-900', () => {
      expect(Colors.text.primary).toBe('#111827');
    });
  });
});
