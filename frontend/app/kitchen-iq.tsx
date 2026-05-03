// Group 10S Surface 2 — Kitchen IQ browse screen.
// Four collapsible sections (one per type), each ranked by N=1 user-state relevance.

import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

import ScreenGradient from '../components/ui/ScreenGradient';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import KitchenIQDetailSheet from '../components/kitchen-iq/KitchenIQDetailSheet';

import {
  KITCHEN_IQ_CARDS,
  type KitchenIQCard,
  type KitchenIQCardType,
  type KitchenIQUnlockCondition,
} from '../lib/kitchenIQ/cards';
import { rankCardsByUserState } from '../lib/kitchenIQ/ranker';
import useKitchenIQProgress from '../hooks/useKitchenIQProgress';
import useFoodIntelUserState from '../hooks/useFoodIntelUserState';
import { useCookingJourney } from '../hooks/useCookingJourney';

import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../constants/Colors';
import { BorderRadius } from '../constants/Spacing';
import { EditorialFontFamily, FontSize } from '../constants/Typography';

interface SectionConfig {
  type: KitchenIQCardType;
  title: string;
  bgLight: string;
  bgDark: string;
  accent: string;
}

const SECTIONS: SectionConfig[] = [
  {
    type: 'nutrient',
    title: 'Nutrients 🧬',
    bgLight: Pastel.sage,
    bgDark: PastelDark.sage,
    accent: Accent.sage,
  },
  {
    type: 'ingredient',
    title: 'Ingredients 🌿',
    bgLight: Pastel.peach,
    bgDark: PastelDark.peach,
    accent: Accent.peach,
  },
  {
    type: 'concept',
    title: 'Concepts 📐',
    bgLight: Pastel.lavender,
    bgDark: PastelDark.lavender,
    accent: Accent.lavender,
  },
  {
    type: 'cuisine_health',
    title: 'Cuisine Stories 🌍',
    bgLight: Pastel.blush,
    bgDark: PastelDark.blush,
    accent: Accent.blush,
  },
];

function lockedHint(
  cond: KitchenIQUnlockCondition | undefined,
  cookCount: number,
  cuisineCount: number,
): string | null {
  if (!cond || cond.type === 'none') return null;
  if (cond.type === 'cook_count' && typeof cond.threshold === 'number') {
    const remaining = Math.max(cond.threshold - cookCount, 0);
    return `${remaining} more cooks · you've done ${cookCount}`;
  }
  if (cond.type === 'cuisine_count' && typeof cond.threshold === 'number') {
    const remaining = Math.max(cond.threshold - cuisineCount, 0);
    return `Try ${remaining} more cuisines · you've done ${cuisineCount}`;
  }
  if (cond.type === 'ingredient_used' && cond.value) {
    return `Cook with ${cond.value}`;
  }
  return null;
}

export default function KitchenIQScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const progress = useKitchenIQProgress();
  const userState = useFoodIntelUserState();
  const { stats } = useCookingJourney();
  const cookCount = stats?.recipesCookedAllTime ?? 0;
  const cuisineCount = stats?.cuisinesExplored.length ?? 0;

  const [activeCard, setActiveCard] = useState<KitchenIQCard | null>(null);

  const [collapsed, setCollapsed] = useState<Record<KitchenIQCardType, boolean>>({
    nutrient: false,
    ingredient: false,
    concept: false,
    cuisine_health: false,
  });

  const cardsByType = useMemo(() => {
    const grouped: Record<KitchenIQCardType, KitchenIQCard[]> = {
      nutrient: [],
      ingredient: [],
      concept: [],
      cuisine_health: [],
    };
    for (const card of KITCHEN_IQ_CARDS) grouped[card.type].push(card);
    for (const t of Object.keys(grouped) as KitchenIQCardType[]) {
      grouped[t] = rankCardsByUserState(grouped[t], userState, progress.isUnlocked);
    }
    return grouped;
  }, [userState, progress.isUnlocked]);

  const textColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const tileBg = isDark ? 'rgba(255,255,255,0.04)' : '#FAF7F4';

  const handleTilePress = (card: KitchenIQCard, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    setActiveCard(card);
  };

  const toggleSection = (type: KitchenIQCardType) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const ratio =
    progress.totalCards > 0 ? Math.min(progress.unlockedCount / progress.totalCards, 1) : 0;

  return (
    <ScreenGradient testID="kitchen-iq-screen">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <HapticTouchableOpacity
            onPress={() => router.back()}
            hapticStyle="light"
            accessibilityLabel="Back"
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={28} color={textColor} />
          </HapticTouchableOpacity>
          <Text style={[styles.title, { color: textColor }]}>Kitchen IQ</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.progressStrip}>
          <View
            testID="kitchen-iq-progress-bar"
            accessibilityRole="progressbar"
            accessibilityLabel="Kitchen IQ unlock progress"
            accessibilityValue={{ min: 0, max: progress.totalCards, now: progress.unlockedCount }}
            style={[
              styles.progressTrack,
              { backgroundColor: isDark ? PastelDark.sage : Pastel.sage },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(ratio * 100)}%`, backgroundColor: Accent.sage },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: textSecondary }]}>
            {progress.unlockedCount} / {progress.totalCards} unlocked
          </Text>
        </View>

        {progress.loading ? (
          <View style={styles.skeletonWrap} testID="kitchen-iq-skeleton">
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.skeletonRow,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EEE7DF' },
                ]}
              />
            ))}
          </View>
        ) : progress.error ? (
          <View style={styles.errorWrap}>
            <Text style={[styles.errorText, { color: textSecondary }]}>
              We couldn&apos;t load your Kitchen IQ right now. Pull down to retry in a moment.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {SECTIONS.map((section) => {
              const isCollapsed = collapsed[section.type];
              const cards = cardsByType[section.type];
              const sectionBg = isDark ? section.bgDark : section.bgLight;

              return (
                <View key={section.type} style={styles.section}>
                  <HapticTouchableOpacity
                    testID={`kitchen-iq-section-header-${section.type}`}
                    onPress={() => toggleSection(section.type)}
                    hapticStyle="light"
                    accessibilityLabel={`${section.title} section, ${
                      isCollapsed ? 'collapsed' : 'expanded'
                    }`}
                    style={[styles.sectionHeader, { backgroundColor: sectionBg }]}
                  >
                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                      {section.title}
                    </Text>
                    <Ionicons
                      name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                      size={22}
                      color={textColor}
                    />
                  </HapticTouchableOpacity>

                  {!isCollapsed && (
                    <View
                      testID={`kitchen-iq-section-list-${section.type}`}
                      style={styles.sectionList}
                    >
                      {cards.map((card) => {
                        const unlocked = progress.isUnlocked(card.id);
                        const hint = unlocked
                          ? null
                          : lockedHint(card.unlockCondition, cookCount, cuisineCount);
                        return (
                          <HapticTouchableOpacity
                            key={card.id}
                            testID={`kitchen-iq-tile-${card.id}`}
                            onPress={() => handleTilePress(card, unlocked)}
                            disabled={!unlocked}
                            hapticStyle="light"
                            accessibilityLabel={
                              unlocked
                                ? `${card.title} — open card`
                                : `${card.title} — locked`
                            }
                            style={[
                              styles.tile,
                              {
                                backgroundColor: tileBg,
                                opacity: unlocked ? 1 : 0.55,
                              },
                            ]}
                          >
                            <Text style={styles.tileEmoji}>{card.heroEmoji}</Text>
                            <View style={styles.tileBody}>
                              <Text
                                style={[styles.tileTitle, { color: textColor }]}
                                numberOfLines={1}
                              >
                                {card.title}
                              </Text>
                              {unlocked ? (
                                <Text
                                  style={[styles.tileSubtitle, { color: textSecondary }]}
                                  numberOfLines={1}
                                >
                                  {card.subtitle}
                                </Text>
                              ) : hint ? (
                                <Text
                                  testID={`kitchen-iq-tile-${card.id}-hint`}
                                  style={[styles.tileHint, { color: textSecondary }]}
                                >
                                  {hint}
                                </Text>
                              ) : null}
                            </View>
                            {!unlocked && (
                              <Ionicons
                                name="lock-closed"
                                size={16}
                                color={textSecondary}
                              />
                            )}
                          </HapticTouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        <KitchenIQDetailSheet card={activeCard} onClose={() => setActiveCard(null)} />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  progressStrip: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 100,
  },
  progressLabel: {
    marginTop: 6,
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: FontSize.sm,
  },
  skeletonWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  skeletonRow: {
    height: 80,
    borderRadius: BorderRadius.card,
  },
  errorWrap: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  errorText: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: FontSize.base,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: BorderRadius.card,
  },
  sectionTitle: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  sectionList: {
    marginTop: 10,
    gap: 10,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: BorderRadius.card,
    gap: 12,
  },
  tileEmoji: {
    fontSize: 28,
  },
  tileBody: {
    flex: 1,
  },
  tileTitle: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: FontSize.md,
    letterSpacing: -0.3,
  },
  tileSubtitle: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  tileHint: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});
