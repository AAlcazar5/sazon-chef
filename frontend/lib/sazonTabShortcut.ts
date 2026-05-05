// frontend/lib/sazonTabShortcut.ts
// ROADMAP 4.0 Tier A4-b/c/d — long-press tab shortcut helpers.
//
// When the user long-presses a tab in the bottom bar, we open Sazon (Coach)
// with a tab-aware seed message. This module is the policy layer; the layout
// component handles the actual press timing + navigation.

import { router } from 'expo-router';

export type SazonShortcutTab = 'today' | 'week' | 'kitchen';

export function buildSazonSeedForTab(tab: SazonShortcutTab): string {
  switch (tab) {
    case 'today':
      return "What's a good move for tonight?";
    case 'week':
      return 'Why this plan?';
    case 'kitchen':
      return "Find me something I'd love";
  }
}

export function openSazonWithSeed(seed: string): void {
  router.push({ pathname: '/(tabs)/coach', params: { seedMessage: seed } } as never);
}

export function openSazonForTab(tab: SazonShortcutTab): void {
  const seed = buildSazonSeedForTab(tab);
  openSazonWithSeed(seed);
}

// ROADMAP 4.0 A4-e — long-press dual-threshold timing.
// Today tab routes <1.8s holds to voice composer (existing 1s threshold)
// and ≥1.8s holds to Sazon. Other tabs route any long-press to Sazon.
export const LONG_PRESS_VOICE_MS = 1000;
export const LONG_PRESS_SAZON_MS = 1800;
