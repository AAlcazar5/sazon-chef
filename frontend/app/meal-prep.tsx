// frontend/app/meal-prep.tsx
// Meal Prep hub — replaces the deleted /build-a-plate-family screen.
//
// Three-section consolidator for the existing meal-prep building blocks:
//   1. Mode toggle — flips the global `useMealPrepMode` flag that re-ranks
//      home-feed + cookbook recipes for batch cooking.
//   2. This week's prep sessions — reads `mealPlanApi.getWeeklyPlan()`
//      and surfaces any `mealPrepSessions` already on the plan; CTA routes
//      to the Weekly tab where sessions are scheduled/edited.
//   3. Browse meal-prep recipes — turns the mode on and routes to home so
//      the existing "Great for Meal Prep" surfaces light up.
//
// Intentionally minimal — the deleted Family Cooking screen failed because
// it asked the user to manage state (plate tabs, slot rows). This screen
// asks the user to pick one of three jobs, then sends them to the surface
// that already does that job well.

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import ScreenGradient from '../components/ui/ScreenGradient';
import BrandButton from '../components/ui/BrandButton';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import { mealPlanApi } from '../lib/api';
import { useMealPrepMode } from '../hooks/useMealPrepMode';
import { useTheme } from '../contexts/ThemeContext';
import { Pastel, Accent } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { BorderRadius } from '../constants/Spacing';
import { EditorialTypography } from '../constants/Typography';

interface MealPrepSession {
  id: string;
  scheduledDate?: string;
  scheduledTime?: string;
  duration?: number;
  recipes?: unknown[];
  isCompleted?: boolean;
  notes?: string;
}

interface WeeklyPlanShape {
  weeklyPlan?: Record<string, { mealPrepSessions?: MealPrepSession[] } | undefined>;
}

export default function MealPrepScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { mealPrepMode, toggleMealPrepMode, isLoaded } = useMealPrepMode();

  const [sessions, setSessions] = useState<Array<MealPrepSession & { dateStr: string }>>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date();
        const start = new Date(today);
        const end = new Date(today);
        end.setDate(end.getDate() + 6);
        const res = await mealPlanApi.getWeeklyPlan({
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        });
        const plan = (res?.data ?? {}) as WeeklyPlanShape;
        const flat: Array<MealPrepSession & { dateStr: string }> = [];
        Object.entries(plan.weeklyPlan ?? {}).forEach(([dateStr, day]) => {
          (day?.mealPrepSessions ?? []).forEach((s) => flat.push({ ...s, dateStr }));
        });
        if (!cancelled) setSessions(flat);
      } catch {
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const subtitleColor = isDark ? '#D1D5DB' : '#6B7280';
  const onPastelInk = '#1F2937';

  const handleToggleMode = async () => {
    await toggleMealPrepMode();
  };

  const handlePlanASession = () => {
    router.push('/(tabs)/meal-plan' as never);
  };

  const handleBrowseRecipes = async () => {
    if (!mealPrepMode) await toggleMealPrepMode();
    router.push('/(tabs)' as never);
  };

  const formatSessionDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <ScreenGradient testID="meal-prep-screen">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <HapticTouchableOpacity
            onPress={() => router.back()}
            hapticStyle="light"
            accessibilityLabel="Back"
            testID="meal-prep-back"
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={24} color={titleColor} />
          </HapticTouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[EditorialTypography.eyebrow, { color: Accent.peach }]}>
              MEAL PREP
            </Text>
            <Text style={[styles.title, { color: titleColor }]}>
              Cook once, eat all week
            </Text>
          </View>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* Section 1 — Mode toggle */}
          <View
            style={[styles.card, { backgroundColor: Pastel.peach }, Shadows.SM]}
            testID="meal-prep-mode-card"
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>🍱</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: onPastelInk }]}>
                  Meal Prep Mode
                </Text>
                <Text style={[styles.cardBody, { color: onPastelInk }]}>
                  {mealPrepMode
                    ? 'On — Today and Cookbook are filtered for batch-friendly recipes.'
                    : 'Off — turn on to see batch-friendly recipes everywhere.'}
                </Text>
              </View>
            </View>
            <BrandButton
              label={mealPrepMode ? 'Turn off' : 'Turn on'}
              variant={mealPrepMode ? 'ghost' : 'peach'}
              icon={mealPrepMode ? 'close' : 'checkmark-circle'}
              onPress={handleToggleMode}
              disabled={!isLoaded}
              accessibilityLabel={mealPrepMode ? 'Turn meal prep mode off' : 'Turn meal prep mode on'}
              testID="meal-prep-mode-toggle"
              style={styles.cardCta}
            />
          </View>

          {/* Section 2 — This week's prep sessions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: titleColor }]}>This week</Text>
            {sessionsLoading ? (
              <Text style={[styles.sectionBody, { color: subtitleColor }]}>Warming up…</Text>
            ) : sessions.length === 0 ? (
              <View
                style={[styles.card, { backgroundColor: Pastel.sage }, Shadows.SM]}
                testID="meal-prep-empty-sessions"
              >
                <Text style={[styles.cardTitle, { color: onPastelInk }]}>
                  No prep sessions planned
                </Text>
                <Text style={[styles.cardBody, { color: onPastelInk, marginBottom: 12 }]}>
                  Block off an hour, batch-cook, eat well all week.
                </Text>
                <BrandButton
                  label="Plan a session"
                  variant="sage"
                  icon="calendar-outline"
                  onPress={handlePlanASession}
                  accessibilityLabel="Plan a meal prep session in the Week tab"
                  testID="meal-prep-plan-session"
                  style={styles.cardCta}
                />
              </View>
            ) : (
              <>
                {sessions.map((s) => (
                  <View
                    key={s.id}
                    style={[styles.sessionCard, { backgroundColor: Pastel.sage }, Shadows.SM]}
                    testID={`meal-prep-session-${s.id}`}
                  >
                    <View style={styles.sessionRow}>
                      <Ionicons name="calendar-outline" size={18} color={onPastelInk} />
                      <Text style={[styles.sessionTitle, { color: onPastelInk }]}>
                        {formatSessionDate(s.dateStr)}
                        {s.scheduledTime ? ` · ${s.scheduledTime}` : ''}
                      </Text>
                      {s.isCompleted ? (
                        <View style={styles.completedPill}>
                          <Text style={styles.completedPillText}>Done</Text>
                        </View>
                      ) : null}
                    </View>
                    {s.duration ? (
                      <Text style={[styles.sessionMeta, { color: onPastelInk }]}>
                        {s.duration} min
                        {s.recipes?.length
                          ? ` · ${s.recipes.length} recipe${s.recipes.length > 1 ? 's' : ''}`
                          : ''}
                      </Text>
                    ) : null}
                    {s.notes ? (
                      <Text style={[styles.sessionNotes, { color: onPastelInk }]}>{s.notes}</Text>
                    ) : null}
                  </View>
                ))}
                <BrandButton
                  label="Plan another session"
                  variant="sage"
                  icon="add-circle-outline"
                  onPress={handlePlanASession}
                  accessibilityLabel="Plan another meal prep session in the Week tab"
                  testID="meal-prep-plan-another"
                  style={styles.sectionCta}
                />
              </>
            )}
          </View>

          {/* Section 3 — Browse meal-prep recipes */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: titleColor }]}>Browse recipes</Text>
            <View
              style={[styles.card, { backgroundColor: Pastel.lavender }, Shadows.SM]}
              testID="meal-prep-browse-card"
            >
              <Text style={[styles.cardTitle, { color: onPastelInk }]}>
                Built for batch cooking
              </Text>
              <Text style={[styles.cardBody, { color: onPastelInk, marginBottom: 12 }]}>
                Recipes that scale up, freeze well, and reheat on day five.
              </Text>
              <BrandButton
                label="Browse meal-prep recipes"
                variant="lavender"
                icon="restaurant-outline"
                onPress={handleBrowseRecipes}
                accessibilityLabel="Turn meal prep mode on and browse batch-friendly recipes"
                testID="meal-prep-browse-cta"
                style={styles.cardCta}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  iconBtn: { padding: 6 },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    letterSpacing: -0.4,
  },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
  card: {
    padding: 16,
    borderRadius: BorderRadius.card,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  cardEmoji: { fontSize: 28, lineHeight: 32 },
  cardTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    letterSpacing: -0.2,
  },
  cardBody: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  cardCta: { alignSelf: 'stretch' },
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    letterSpacing: -0.2,
    marginTop: 4,
  },
  sectionBody: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
  },
  sectionCta: { alignSelf: 'stretch', marginTop: 4 },
  sessionCard: {
    padding: 14,
    borderRadius: BorderRadius.card,
    gap: 4,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionTitle: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  sessionMeta: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
  },
  sessionNotes: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  completedPill: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  completedPillText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: '#1F2937',
  },
});
