// frontend/__tests__/lib/sazonTabShortcut.test.ts
// ROADMAP 4.0 Tier A4-b/c/d/e — long-press tab shortcut helpers.

import {
  buildSazonSeedForTab,
  type SazonShortcutTab,
} from '../../lib/sazonTabShortcut';

describe('buildSazonSeedForTab', () => {
  it('seeds tonight context for the Today tab', () => {
    const seed = buildSazonSeedForTab('today');
    expect(seed.toLowerCase()).toContain('tonight');
  });

  it('seeds plan context for the Week tab', () => {
    const seed = buildSazonSeedForTab('week');
    expect(seed.toLowerCase()).toContain('plan');
  });

  it('seeds discovery context for the Kitchen tab', () => {
    const seed = buildSazonSeedForTab('kitchen');
    expect(seed.toLowerCase()).toMatch(/love|find/);
  });

  it('returns short, conversational copy (no banned trainer vocabulary)', () => {
    const tabs: SazonShortcutTab[] = ['today', 'week', 'kitchen'];
    for (const tab of tabs) {
      const seed = buildSazonSeedForTab(tab);
      expect(seed.length).toBeLessThanOrEqual(80);
      expect(seed.toLowerCase()).not.toContain('cut');
      expect(seed.toLowerCase()).not.toContain('bulk');
      expect(seed.toLowerCase()).not.toContain('coach');
    }
  });

  it('always returns a non-empty seed', () => {
    expect(buildSazonSeedForTab('today').length).toBeGreaterThan(0);
    expect(buildSazonSeedForTab('week').length).toBeGreaterThan(0);
    expect(buildSazonSeedForTab('kitchen').length).toBeGreaterThan(0);
  });
});
