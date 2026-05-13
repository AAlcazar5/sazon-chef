// P0 retention — day-1 quick-start. Renders 9 recipes after onboarding; the
// user picks 3 they'd cook tonight. Each pick is saved (recipeApi.saveRecipe),
// which seeds the recommender immediately so day-2 Today isn't cold-started.
//
// Why this exists: the audit found the recommender had no recipe-level signal
// from the user until they happened to save/cook one organically. Onboarding
// captures cuisines + diet + density — that's the cold start. The first cook
// might be 3-5 days away. This screen bridges those gaps with a one-tap-each
// commitment ritual ("pick 3 you'd cook tonight").

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import BrandButton from '../components/ui/BrandButton';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../constants/Colors';
import { EditorialFontFamily } from '../constants/Typography';
import { recipeApi } from '../lib/api/recipe';
import { HapticPatterns } from '../constants/Haptics';
import type { Recipe } from '../types';

const MIN_PICKS = 1;
const MAX_PICKS = 3;
const FETCH_LIMIT = 9;

export default function QuickStartScreen(): React.ReactElement {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await recipeApi.getRecipes({ pageSize: FETCH_LIMIT });
        if (cancelled) return;
        const raw = response?.data?.recipes ?? response?.data ?? [];
        const list = Array.isArray(raw) ? raw : [];
        setRecipes(list.slice(0, FETCH_LIMIT));
      } catch {
        // Best-effort — empty grid → user can still continue
        setRecipes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePick = (id: string): void => {
    HapticPatterns.buttonPress();
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_PICKS) {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    const ids = Array.from(picked);
    // Fire-and-forget saves so a slow network doesn't block the user from
    // getting to Today. The recommender picks up the saves on next read.
    await Promise.allSettled(
      ids.map((id) => recipeApi.saveRecipe(id).catch(() => null)),
    );
    HapticPatterns.success();
    router.replace('/(tabs)');
  };

  const handleSkip = (): void => {
    router.replace('/(tabs)');
  };

  const accent = isDark ? Accent.golden : Accent.golden;
  const cardBg = isDark ? PastelDark.peach : Pastel.peach;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const ctaLabel = useMemo(() => {
    if (picked.size === 0) return 'Skip for now';
    if (picked.size === 1) return 'Save 1 and continue';
    return `Save ${picked.size} and continue`;
  }, [picked.size]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? DarkColors.background : '#FAF7F4' }}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.headerRow}>
          <Text style={[styles.eyebrow, { color: accent }]}>QUICK START</Text>
        </View>
        <Text style={[styles.title, { color: text }]}>Pick a few you'd cook tonight.</Text>
        <Text style={[styles.subtitle, { color: sub }]}>
          Up to {MAX_PICKS} — Sazon learns from every tap. You can always come back to these.
        </Text>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={accent} />
          </View>
        ) : recipes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: sub }]}>
              Couldn't pull anything in just yet. Head to your kitchen and start exploring.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {recipes.map((r) => {
              const isPicked = picked.has(r.id);
              return (
                <HapticTouchableOpacity
                  key={r.id}
                  testID={`quick-start-card-${r.id}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isPicked }}
                  accessibilityLabel={`${r.title}${isPicked ? ', selected' : ''}`}
                  onPress={() => togglePick(r.id)}
                  hapticStyle="light"
                  style={[
                    styles.card,
                    { backgroundColor: cardBg },
                    isPicked && { borderColor: accent, borderWidth: 2 },
                  ]}
                >
                  {r.imageUrl ? (
                    <Image
                      source={{ uri: r.imageUrl }}
                      style={styles.cardImage}
                      contentFit="cover"
                      transition={140}
                    />
                  ) : (
                    <View style={[styles.cardImage, { backgroundColor: '#EAE6DF' }]} />
                  )}
                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: text }]} numberOfLines={2}>
                      {r.title}
                    </Text>
                    {r.cuisine ? (
                      <Text style={[styles.cardMeta, { color: sub }]} numberOfLines={1}>
                        {r.cuisine}
                      </Text>
                    ) : null}
                  </View>
                  {isPicked ? (
                    <View
                      testID={`quick-start-card-${r.id}-checkmark`}
                      style={[styles.checkmark, { backgroundColor: accent }]}
                    >
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  ) : null}
                </HapticTouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.ctaWrap, { backgroundColor: isDark ? DarkColors.background : '#FAF7F4' }]}>
        {picked.size >= MIN_PICKS ? (
          <BrandButton
            label={ctaLabel}
            variant="brand"
            icon="restaurant-outline"
            onPress={handleContinue}
            testID="quick-start-continue"
            accessibilityLabel={ctaLabel}
          />
        ) : (
          <HapticTouchableOpacity
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
            testID="quick-start-skip"
            style={styles.skipBtn}
          >
            <Text style={[styles.skipLabel, { color: sub }]}>Skip for now</Text>
          </HapticTouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 11,
    letterSpacing: 1.6,
  },
  title: {
    paddingHorizontal: 20,
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 28,
    letterSpacing: -0.6,
    marginTop: 4,
  },
  subtitle: {
    paddingHorizontal: 20,
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 18,
  },
  loaderWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyWrap: { paddingHorizontal: 20, paddingVertical: 32 },
  emptyText: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  card: {
    width: '47%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 14,
  },
  cardMeta: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 11,
    marginTop: 4,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
  skipLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 14,
  },
});
