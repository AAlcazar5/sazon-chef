// frontend/components/kitchen/KitchenCookLogView.tsx
//
// W-D Phase 1 / D-2 — the Cook Log Kitchen view: "your cooking, over time".
// The memory surface a stateless assistant structurally cannot hold — the
// screenshot-a-friend moat (asteroid memo §3). W-D1: zero recipe/catalog
// counts anywhere; pagination is a seamless "show earlier", never a total.
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCookLog } from '../../hooks/useCookLog';
import type { CookLogEntry } from '../../lib/api/cook';
import { Brand, PastelTokens } from '../../constants/tokens';
import { ComponentSpacing } from '../../constants/Spacing';
import { EditorialFontFamily } from '../../constants/Typography';
import { Shadows } from '../../constants/Shadows';
import AnimatedEmptyState from '../ui/AnimatedEmptyState';
import LoadingState from '../ui/LoadingState';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import LogAClaudeCookSheet from '../cook/LogAClaudeCookSheet';

interface KitchenCookLogViewProps {
  isDark: boolean;
}

// Human, count-free label for an event. The *echo* — what Sazon learned —
// is the point (asteroid §5: every adjustment shows its echo).
function describeEntry(e: CookLogEntry): { line: string; echo?: string } {
  const p = e.payload ?? {};
  switch (e.type) {
    case 'made_it':
      return { line: 'Made it', echo: 'logged to your taste' };
    case 'scale': {
      const t = (p as { target?: { amount?: number; unit?: string } }).target;
      return {
        line: t?.amount ? `Scaled to ${t.amount} ${t.unit ?? ''}`.trim() : 'Scaled the recipe',
        echo: 'you batch-cook — prep-friendly bias on',
      };
    }
    case 'swap':
      return { line: 'Swapped an ingredient', echo: 'refining your swap profile' };
    case 'note':
      return { line: 'Added a note' };
    case 'outcome':
      return { line: 'Rated this cook', echo: 'tuning tomorrow’s picks' };
    default:
      return { line: 'Cooked' };
  }
}

function weekLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const now = new Date();
  const day = 86_400_000;
  const diff = Math.floor((now.getTime() - d.getTime()) / day);
  if (diff <= 7) return 'This week';
  if (diff <= 14) return 'Last week';
  return `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function groupByWeek(entries: CookLogEntry[]): Array<{ label: string; items: CookLogEntry[] }> {
  const out: Array<{ label: string; items: CookLogEntry[] }> = [];
  for (const e of entries) {
    const label = weekLabel(e.createdAt);
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(e);
    else out.push({ label, items: [e] });
  }
  return out;
}

export default function KitchenCookLogView({ isDark }: KitchenCookLogViewProps) {
  useTheme();
  const { entries, loading, error, hasMore, loadMore, refresh } = useCookLog();
  const [logSheet, setLogSheet] = React.useState(false);

  const accent = isDark ? Brand.dark.base : Brand.light.base;
  const peach = isDark ? PastelTokens.dark.peach : PastelTokens.light.peach;

  // §9a entry — always reachable (even for a user who only ever cooks with
  // help elsewhere and has no Sazon-native cooks yet). Behind the same
  // FEATURE_FLAGS.cookLog that gates this whole view.
  const elsewhereTrigger = (
    <HapticTouchableOpacity
      onPress={() => setLogSheet(true)}
      accessibilityRole="button"
      accessibilityLabel="Log a cook you made with help elsewhere"
      style={[styles.elsewhere, { borderColor: accent }]}
    >
      <Text style={[styles.elsewhereText, { color: accent }]}>
        + Cooked with help elsewhere? Log it
      </Text>
    </HapticTouchableOpacity>
  );

  const sheet = (
    <LogAClaudeCookSheet
      visible={logSheet}
      onClose={() => setLogSheet(false)}
      onLogged={refresh}
    />
  );

  let body: React.ReactNode;
  if (loading && entries.length === 0) {
    body = (
      <LoadingState message="Gathering your cooking story…" expression="thinking" />
    );
  } else if (error && entries.length === 0) {
    body = (
      <AnimatedEmptyState
        useMascot
        mascotExpression="sleepy"
        title="Couldn’t reach your cook log"
        subtitle="Give it a moment and pull to refresh — your cooking history is safe."
      />
    );
  } else if (entries.length === 0) {
    body = (
      <AnimatedEmptyState
        useMascot
        mascotExpression="curious"
        title="Your cooking story starts here"
        subtitle="Cook something tonight — or log one you made with help elsewhere — and Sazon starts learning how you cook."
      />
    );
  } else {
    body = renderTimeline();
  }

  function renderTimeline() {
    const groups = groupByWeek(entries);
    return (
      <View>
        {groups.map((g) => (
          <View key={g.label} style={styles.group}>
            <Text style={[styles.groupLabel, { color: accent }]}>{g.label}</Text>
            {g.items.map((e) => {
              const { line, echo } = describeEntry(e);
              return (
                <View
                  key={e.id}
                  style={[styles.card, { backgroundColor: peach }, Shadows.SM]}
                  accessibilityLabel={`${line}${echo ? `, ${echo}` : ''}`}
                >
                  <Text style={[styles.line, isDark && styles.lineDark]}>{line}</Text>
                  {echo ? <Text style={styles.echo}>{echo}</Text> : null}
                </View>
              );
            })}
          </View>
        ))}

        {hasMore ? (
          <HapticTouchableOpacity
            onPress={loadMore}
            accessibilityRole="button"
            accessibilityLabel="Show earlier cooks"
            style={[styles.more, { borderColor: accent }]}
          >
            <Text style={[styles.moreText, { color: accent }]}>Show earlier cooks</Text>
          </HapticTouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      accessibilityLabel="Your cooking history, most recent first"
    >
      {elsewhereTrigger}
      {body}
      {sheet}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: ComponentSpacing.screenPadding ?? 16, paddingBottom: 48 },
  group: { marginBottom: 20 },
  groupLabel: {
    fontFamily: EditorialFontFamily.heading,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: { borderRadius: 20, padding: 16, marginBottom: 10 },
  line: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  lineDark: { color: '#F9FAFB' },
  echo: { fontSize: 13, marginTop: 4, color: '#6B7280', fontStyle: 'italic' },
  more: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
    borderWidth: 1,
  },
  moreText: { fontSize: 14, fontWeight: '600' },
  elsewhere: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  elsewhereText: { fontSize: 14, fontWeight: '600' },
});
