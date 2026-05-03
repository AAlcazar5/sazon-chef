// frontend/components/kitchen-iq/KitchenIQDetailSheet.tsx
// Group 10S Surface 3 — Kitchen IQ detail bottom sheet.

import React, { useEffect, useMemo } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useFoodIntelUserState } from '../../hooks/useFoodIntelUserState';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import type { KitchenIQCard, KitchenIQVisual } from '../../lib/kitchenIQ/cards';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.85);

const VISUAL_ICON: Record<KitchenIQVisual, string> = {
  icon_list: '📋',
  comparison: '⚖️',
  scale: '📏',
};

const STORAGE_KEY_PREFIX = 'kitchen_iq_recipe_interest';

export interface KitchenIQRecipeRef {
  id: string;
  title: string;
  cuisine?: string;
  isInCookbook?: boolean;
}

export interface KitchenIQDetailSheetProps {
  card: KitchenIQCard | null;
  onClose: () => void;
  recipes?: KitchenIQRecipeRef[];
  onRecipeTap?: (recipeId: string) => void;
  testID?: string;
}

interface RecipeInterestEntry {
  cardId: string;
  recipeId: string;
  timestamp: number;
}

function isRecipeInterestEntry(value: unknown): value is RecipeInterestEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.cardId === 'string' &&
    typeof v.recipeId === 'string' &&
    typeof v.timestamp === 'number'
  );
}

async function recordNutrientInterest(
  userId: string,
  cardId: string,
  recipeId: string,
): Promise<void> {
  const key = `${STORAGE_KEY_PREFIX}::${userId}`;
  try {
    const existing = await AsyncStorage.getItem(key);
    let parsed: RecipeInterestEntry[] = [];
    if (existing) {
      const raw = JSON.parse(existing) as unknown;
      if (Array.isArray(raw)) parsed = raw.filter(isRecipeInterestEntry);
    }
    const next = [...parsed, { cardId, recipeId, timestamp: Date.now() }];
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Best-effort engagement signal; never block UI on failure.
  }
}

export default function KitchenIQDetailSheet({
  card,
  onClose,
  recipes,
  onRecipeTap,
  testID,
}: KitchenIQDetailSheetProps) {
  const { userId } = useFoodIntelUserState();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = useMemo(() => makeStyles(isDark), [isDark]);
  const translateY = useSharedValue(SHEET_HEIGHT);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (card) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = SHEET_HEIGHT;
      opacity.value = 0;
    }
  }, [card, translateY, opacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!card) return null;

  const hasRecipes = recipes && recipes.length > 0;

  const handleRecipePress = (recipeId: string) => {
    void recordNutrientInterest(userId, card.id, recipeId);
    onRecipeTap?.(recipeId);
  };

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <HapticTouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            hapticStyle="light"
            scaleOnPress={false}
            testID="kitchen-iq-backdrop"
            accessibilityLabel="Close details"
          />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, sheetStyle]}
          accessibilityLabel={`${card.title} details`}
        >
          <View style={styles.handle} />

          <HapticTouchableOpacity
            onPress={onClose}
            hapticStyle="light"
            pressedScale={0.9}
            accessibilityLabel="Close"
            style={styles.closeBtn}
          >
            <Text style={styles.closeIcon}>×</Text>
          </HapticTouchableOpacity>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View style={styles.hero}>
              <Text style={styles.heroEmoji}>{card.heroEmoji}</Text>
              <Text style={styles.title}>{card.title}</Text>
              <Text style={styles.subtitle}>{card.subtitle}</Text>
            </View>

            {/* Sections */}
            {card.sections.map((section, idx) => (
              <View key={`${section.heading}-${idx}`} style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  {section.visual ? (
                    <Text style={styles.sectionVisual}>{VISUAL_ICON[section.visual]}</Text>
                  ) : null}
                  <Text style={styles.sectionHeading}>{section.heading}</Text>
                </View>
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
            ))}

            {/* Top foods */}
            {card.topFoods.length > 0 && (
              <View style={styles.block}>
                <Text style={styles.blockHeading}>Top sources</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.topFoodsRow}
                >
                  {card.topFoods.map((food, idx) => {
                    const widthPct = `${Math.min(food.dvPercent, 100)}%` as `${number}%`;
                    return (
                      <View key={`${food.name}-${idx}`} style={styles.topFoodPill}>
                        <Text style={styles.topFoodName}>{food.name}</Text>
                        <Text style={styles.topFoodAmount}>{food.amount}</Text>
                        <View style={styles.topFoodTrack}>
                          <View
                            testID={`top-food-bar-${idx}`}
                            style={[styles.topFoodBar, { width: widthPct }]}
                          />
                        </View>
                        <Text style={styles.topFoodPct}>{food.dvPercent}% DV</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Recipes carousel */}
            {hasRecipes && (
              <View style={styles.block} testID="kitchen-iq-recipes-carousel">
                <Text style={styles.blockHeading}>Recipes with this</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recipesRow}
                >
                  {recipes!.map((recipe) => (
                    <HapticTouchableOpacity
                      key={recipe.id}
                      onPress={() => handleRecipePress(recipe.id)}
                      hapticStyle="light"
                      pressedScale={0.97}
                      accessibilityLabel={`Open recipe ${recipe.title}`}
                      style={styles.recipeTile}
                    >
                      {recipe.isInCookbook ? (
                        <Text style={styles.recipeBadge}>In your cookbook</Text>
                      ) : null}
                      <Text style={styles.recipeTitle} numberOfLines={2}>
                        {recipe.title}
                      </Text>
                      {recipe.cuisine ? (
                        <Text style={styles.recipeCuisine}>{recipe.cuisine}</Text>
                      ) : null}
                    </HapticTouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(isDark: boolean) {
  const surface = isDark ? '#1F2937' : '#FAF7F4';
  const sectionBg = isDark ? PastelDark.sage : Pastel.sage;
  const topFoodBg = isDark ? PastelDark.peach : Pastel.peach;
  const recipeBg = isDark ? PastelDark.lavender : Pastel.lavender;
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const handleBg = isDark ? '#4B5563' : '#D1D5DB';
  const closeBtnBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
  const trackBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';

  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      height: SHEET_HEIGHT,
      backgroundColor: surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      overflow: 'hidden',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: handleBg,
      alignSelf: 'center',
      opacity: 0.6,
    },
    closeBtn: {
      position: 'absolute',
      top: 12,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: closeBtnBg,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    closeIcon: {
      fontSize: 22,
      lineHeight: 24,
      color: textPrimary,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 32,
    },
    hero: {
      alignItems: 'center',
      paddingTop: 24,
      paddingBottom: 20,
    },
    heroEmoji: {
      fontSize: 72,
      marginBottom: 12,
    },
    title: {
      fontSize: 26,
      fontFamily: 'Fraunces_700Bold',
      color: textPrimary,
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans_500Medium',
      color: textSecondary,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    sectionCard: {
      backgroundColor: sectionBg,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    sectionVisual: {
      fontSize: 18,
      marginRight: 8,
    },
    sectionHeading: {
      fontSize: 17,
      fontFamily: 'Fraunces_600SemiBold',
      color: textPrimary,
      flex: 1,
    },
    sectionBody: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans_400Regular',
      color: textPrimary,
      lineHeight: 21,
    },
    block: {
      marginTop: 12,
      marginBottom: 4,
    },
    blockHeading: {
      fontSize: 13,
      fontFamily: 'PlusJakartaSans_600SemiBold',
      color: textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    topFoodsRow: {
      paddingRight: 8,
      gap: 10,
    },
    topFoodPill: {
      width: 160,
      backgroundColor: topFoodBg,
      borderRadius: 20,
      padding: 14,
      marginRight: 10,
    },
    topFoodName: {
      fontSize: 14,
      fontFamily: 'PlusJakartaSans_700Bold',
      color: textPrimary,
      marginBottom: 2,
    },
    topFoodAmount: {
      fontSize: 12,
      fontFamily: 'PlusJakartaSans_500Medium',
      color: textSecondary,
      marginBottom: 10,
    },
    topFoodTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: trackBg,
      overflow: 'hidden',
      marginBottom: 6,
    },
    topFoodBar: {
      height: 6,
      borderRadius: 3,
      backgroundColor: Accent.peach,
    },
    topFoodPct: {
      fontSize: 11,
      fontFamily: 'PlusJakartaSans_600SemiBold',
      color: textSecondary,
    },
    recipesRow: {
      paddingRight: 8,
      gap: 10,
    },
    recipeTile: {
      width: 180,
      minHeight: 100,
      backgroundColor: recipeBg,
      borderRadius: 20,
      padding: 14,
      marginRight: 10,
      justifyContent: 'flex-end',
    },
    recipeBadge: {
      fontSize: 10,
      fontFamily: 'PlusJakartaSans_700Bold',
      color: Accent.lavender,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    recipeTitle: {
      fontSize: 15,
      fontFamily: 'PlusJakartaSans_700Bold',
      color: textPrimary,
      marginBottom: 4,
    },
    recipeCuisine: {
      fontSize: 12,
      fontFamily: 'PlusJakartaSans_500Medium',
      color: textSecondary,
      textTransform: 'capitalize',
    },
  });
}
void PastelDark;
