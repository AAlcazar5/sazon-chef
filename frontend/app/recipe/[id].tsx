// frontend/app/recipe/[id].tsx
// Group 10X Phase 1+2 — recipe detail route. For user-composed plates we render
// a hybrid view (editorial "BUILT FROM" header + Edit Composition + Vary this
// plate buttons). Non-composed recipes redirect into the existing modal route.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import BrandButton from '../../components/ui/BrandButton';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import PlateVariationsSheet from '../../components/recipe/PlateVariationsSheet';
import PlateMenuExportButton, {
  type PlateMenuPlate,
} from '../../components/recipe/PlateMenuExportButton';
import { recipeApi } from '../../lib/api';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';

interface ComposedComponent {
  slot: string;
  componentName: string;
}

interface RecipeData {
  id: string;
  title: string;
  imageUrl?: string;
  source?: string;
  ingredients?: Array<string | { id: string; text: string; order: number }>;
  instructions?: Array<string | { id: string; text: string; step: number }>;
  cookTime?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  composedComponents?: ComposedComponent[];
}

const SLOT_PASTEL: Record<string, string> = {
  protein: Pastel.peach,
  base: Pastel.golden,
  vegetable: Pastel.sage,
  sauce: Pastel.sky,
  garnish: Pastel.lavender,
};

const SLOT_PASTEL_DARK: Record<string, string> = {
  protein: PastelDark.peach,
  base: PastelDark.golden,
  vegetable: PastelDark.sage,
  sauce: PastelDark.sky,
  garnish: PastelDark.lavender,
};

function getInstructionText(item: any): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && 'text' in item) return item.text;
  return String(item);
}

export default function RecipeIdScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [recipe, setRecipe] = useState<RecipeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [variationsVisible, setVariationsVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const res = await recipeApi.getRecipe(id);
        if (!cancelled) {
          setRecipe((res?.data as RecipeData) ?? null);
        }
      } catch {
        if (!cancelled) {
          setRecipe(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const isComposed = recipe?.source === 'user-composed';

  const handleEditComposition = useCallback(() => {
    if (!recipe) return;
    router.push({
      pathname: '/build-a-plate',
      params: { plateId: recipe.id },
    });
  }, [router, recipe]);

  const handleOpenVariations = useCallback(() => {
    setVariationsVisible(true);
  }, []);

  const handleCloseVariations = useCallback(() => {
    setVariationsVisible(false);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const menuPlate = useMemo<PlateMenuPlate | null>(() => {
    if (!recipe || recipe.source !== 'user-composed') return null;
    const components = (recipe.composedComponents ?? []).map((c) => ({
      slot: c.slot,
      label: c.slot.charAt(0).toUpperCase() + c.slot.slice(1),
      variants: [{ id: `${recipe.id}-${c.slot}`, name: c.componentName }],
    }));
    return {
      id: recipe.id,
      title: recipe.title,
      components,
      totalCalories: recipe.calories,
      totalProtein: recipe.protein,
      totalCarbs: recipe.carbs,
      totalFat: recipe.fat,
    };
  }, [recipe]);

  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';
  const bodyColor = isDark ? '#D1D5DB' : '#374151';
  const accentOrange = '#FB923C';
  const screenBg = isDark ? '#1C1C1E' : '#FAF7F4';

  if (isLoading) {
    return (
      <View
        style={[styles.loadingState, { backgroundColor: screenBg }]}
        testID="recipe-id-loading"
      >
        <Text style={{ color: subtitleColor, fontFamily: EditorialFontFamily.body.medium }}>
          Plating that up…
        </Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={[styles.loadingState, { backgroundColor: screenBg }]}>
        <Text style={{ color: subtitleColor, fontFamily: EditorialFontFamily.body.medium }}>
          Couldn't find that recipe.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero image — full bleed */}
        {recipe.imageUrl ? (
          <View style={styles.heroWrap}>
            <Image
              source={{ uri: recipe.imageUrl }}
              style={styles.heroImage}
              contentFit="cover"
              testID="recipe-hero-image"
            />
            <LinearGradient
              colors={isDark
                ? (['rgba(28,28,30,0)', 'rgba(28,28,30,0.85)'] as const)
                : (['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)'] as const)}
              style={styles.heroGradient}
              start={{ x: 0, y: 0.4 }}
              end={{ x: 0, y: 1 }}
            />
            <HapticTouchableOpacity
              onPress={handleBack}
              accessibilityLabel="Back"
              testID="recipe-back-btn"
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </HapticTouchableOpacity>
            {isComposed && (
              <View style={styles.editTopBtn}>
                <BrandButton
                  label="Edit composition"
                  variant="sage"
                  size="compact"
                  onPress={handleEditComposition}
                  accessibilityLabel="Edit this plate's composition"
                  testID="recipe-edit-composition-top"
                />
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.contentBlock}>
          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: titleColor }]} numberOfLines={3}>
              {recipe.title}
            </Text>
            <Text style={[styles.titlePeriod, { color: accentOrange }]}>.</Text>
          </View>

          {/* BUILT FROM editorial header — only for user-composed plates */}
          {isComposed && recipe.composedComponents && recipe.composedComponents.length > 0 && (
            <View style={styles.builtFromBlock}>
              <Text style={[EditorialTypography.eyebrow, { color: Accent.sage }]}>
                BUILT FROM
              </Text>
              <View style={styles.chipRow}>
                {recipe.composedComponents.map((c, i) => {
                  const bg = isDark
                    ? (SLOT_PASTEL_DARK[c.slot] ?? PastelDark.sage)
                    : (SLOT_PASTEL[c.slot] ?? Pastel.sage);
                  return (
                    <View
                      key={`${c.componentName}-${i}`}
                      style={[styles.chip, { backgroundColor: bg }]}
                      testID={`built-from-chip-${c.slot}`}
                    >
                      <Text style={[styles.chipText, { color: titleColor }]}>
                        {c.componentName}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Vary this plate button — only for composed plates */}
          {isComposed && (
            <BrandButton
              label="Vary this plate"
              variant="lavender"
              onPress={handleOpenVariations}
              accessibilityLabel="See variations of this plate"
              testID="recipe-vary-this-plate"
              style={styles.varyBtn}
            />
          )}

          {/* Export as menu PDF — only for composed plates (Phase 9) */}
          {isComposed && menuPlate && (
            <PlateMenuExportButton plate={menuPlate} testID="recipe-export-menu" />
          )}

          {/* Macros line */}
          {recipe.calories ? (
            <Text style={[styles.macros, { color: subtitleColor }]}>
              {`${Math.round(recipe.calories)} cal · ${Math.round(recipe.protein ?? 0)}g pro · ${Math.round(recipe.carbs ?? 0)}g carbs · ${Math.round(recipe.fat ?? 0)}g fat`}
            </Text>
          ) : null}

          {/* Instructions */}
          {recipe.instructions && recipe.instructions.length > 0 && (
            <View style={styles.instructionsBlock}>
              <Text style={[EditorialTypography.eyebrow, { color: subtitleColor }]}>
                HOW TO COOK
              </Text>
              {recipe.instructions.map((item, i) => (
                <View key={i} style={styles.instructionRow}>
                  <Text style={[styles.instructionNum, { color: Accent.sage }]}>
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                  <Text style={[styles.instructionText, { color: bodyColor }]}>
                    {getInstructionText(item)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Variations bottom sheet */}
      <PlateVariationsSheet
        plateId={recipe.id}
        visible={variationsVisible}
        onClose={handleCloseVariations}
      />
    </View>
  );
}

const heroShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  android: { elevation: 6 },
  default: {},
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWrap: {
    width: '100%',
    height: 340,
    backgroundColor: '#000',
    ...heroShadow,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTopBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 20,
    right: 16,
  },
  contentBlock: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  title: {
    flexShrink: 1,
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  titlePeriod: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  builtFromBlock: {
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  chipText: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
    letterSpacing: 0.1,
  },
  varyBtn: {
    alignSelf: 'flex-start',
  },
  macros: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  instructionsBlock: {
    gap: 14,
    marginTop: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  instructionNum: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 15,
    letterSpacing: 0.6,
    width: 28,
  },
  instructionText: {
    flex: 1,
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 15,
    lineHeight: 22,
  },
});
