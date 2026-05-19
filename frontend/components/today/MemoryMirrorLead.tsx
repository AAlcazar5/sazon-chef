// W-D P2 / D-3 — Today's lead is a *memory mirror*: what the app knows
// about how YOU cook, derived from the Cook Log, shown ABOVE the hero so
// the suggestion reads as the output of visible memory (asteroid §5).
// Honest: if there's no history yet it renders nothing (no fabricated
// facts) and the hero leads as before. W-D1: zero counts.
//
// This is an OPTIONAL enhancement surface. It must never crash the Today
// screen or surface an error to the user — a class boundary makes any
// render/hook/data failure fail CLOSED (render nothing, silently). Same
// user-visible outcome as "no history yet", so degrading is invisible.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCookLog } from '../../hooks/useCookLog';
import { Brand, PastelTokens } from '../../constants/tokens';

// Qualitative only — never a count. Order = strongest signal first.
function deriveFact(types: Set<string>): string | null {
  if (types.has('scale')) {
    return 'You batch-cook — Sazon’s biasing prep-friendly tonight.';
  }
  if (types.has('swap')) {
    return 'Sazon’s learning your swaps — tonight reflects them.';
  }
  if (types.has('outcome')) {
    return 'Your ratings are shaping what shows up here.';
  }
  if (types.has('made_it')) {
    return 'Sazon’s getting to know how you cook.';
  }
  return null;
}

function MemoryMirrorLeadInner() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { entries, loading } = useCookLog();

  // No fabricated memory: nothing to mirror yet → render nothing.
  if (loading || !Array.isArray(entries) || entries.length === 0) return null;

  const fact = deriveFact(new Set(entries.map((e) => e.type)));
  if (!fact) return null;

  const bg = isDark ? PastelTokens.dark.sage : PastelTokens.light.sage;
  const accent = isDark ? Brand.dark.base : Brand.light.base;

  return (
    <View
      style={[styles.wrap, { backgroundColor: bg }]}
      accessibilityLabel={`What your kitchen knows: ${fact}`}
    >
      <Text style={[styles.eyebrow, { color: accent }]}>YOUR KITCHEN KNOWS</Text>
      <Text style={[styles.fact, isDark && styles.factDark]}>{fact}</Text>
    </View>
  );
}

// Silent fail-closed boundary. An optional surface failing must be
// invisible — NOT logged (the global ErrorBoundary's errorLogger is the
// console noise we're eliminating) and NOT propagated.
export default class MemoryMirrorLead extends React.Component<
  Record<string, never>,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  // Intentionally swallow — degrading this surface is a no-op for the
  // user (same as "no cook history yet"); never surface or log it.
  componentDidCatch(): void {}

  render(): React.ReactNode {
    if (this.state.failed) return null;
    return <MemoryMirrorLeadInner />;
  }
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  fact: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 4 },
  factDark: { color: '#F9FAFB' },
});
