// frontend/components/cookbook/CookbookInsights.tsx
// Cookbook insights modal with stats and one-tap filter pills

import { View, Text, ScrollView, Modal, Dimensions } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import type { SavedRecipe } from '../../types';
import type { CookbookFilters } from './CookbookFilterModal';
import { useMemo } from 'react';

interface CookbookInsightsProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Close the modal */
  onClose: () => void;
  /** All filtered and sorted recipes to compute stats from */
  recipes: SavedRecipe[];
  /** Current cookbook filters */
  filters: CookbookFilters;
  /** Update cookbook filters (one-tap pills) */
  onFilterChange: (filters: CookbookFilters) => void;
}

export default function CookbookInsights({
  visible,
  onClose,
  recipes,
  filters,
  onFilterChange,
}: CookbookInsightsProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const insights = useMemo(() => {
    const total = recipes.length;
    const normalizeDifficulty = (d: unknown) => String(d || '').trim().toLowerCase();

    let quickCount = 0;
    let easyCount = 0;
    let mealPrepCount = 0;
    let highProteinCount = 0;
    let lowCalCount = 0;
    let budgetCount = 0;

    let cookTimeSum = 0;
    let cookTimeN = 0;
    let caloriesSum = 0;
    let caloriesN = 0;
    let proteinSum = 0;
    let proteinN = 0;

    let bestMatch = 0;

    const gradeCounts: Record<string, number> = {};
    let abCount = 0;

    for (const r of recipes) {
      const anyR = r as any;
      const cookTime = Number(r.cookTime);
      const calories = Number(r.calories);
      const protein = Number(r.protein);

      if (Number.isFinite(cookTime)) {
        cookTimeSum += cookTime;
        cookTimeN += 1;
        if (cookTime <= 30) quickCount += 1;
      }

      if (Number.isFinite(calories)) {
        caloriesSum += calories;
        caloriesN += 1;
        if (calories <= 400) lowCalCount += 1;
      }

      if (Number.isFinite(protein)) {
        proteinSum += protein;
        proteinN += 1;
        if (protein >= 25) highProteinCount += 1;
      }

      const diff = normalizeDifficulty(anyR.difficulty);
      if (diff === 'easy') easyCount += 1;

      if (!!anyR.mealPrepSuitable || !!anyR.freezable || !!anyR.batchFriendly) mealPrepCount += 1;

      const cost = Number(anyR.estimatedCostPerServing);
      if (Number.isFinite(cost) && cost <= 3) budgetCount += 1;

      const match = Number((anyR.score && (anyR.score.matchPercentage ?? anyR.score.total)) ?? anyR.score?.total);
      if (Number.isFinite(match)) bestMatch = Math.max(bestMatch, Math.round(match));

      const grade = String(anyR.healthGrade || anyR.score?.healthGrade || '').toUpperCase();
      if (grade) {
        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        if (grade === 'A' || grade === 'B') abCount += 1;
      }
    }

    const avgCookTime = cookTimeN > 0 ? Math.round(cookTimeSum / cookTimeN) : null;
    const avgCalories = caloriesN > 0 ? Math.round(caloriesSum / caloriesN) : null;
    const avgProtein = proteinN > 0 ? Math.round(proteinSum / proteinN) : null;
    const abPct = total > 0 ? Math.round((abCount / total) * 100) : 0;

    return {
      total,
      quickCount,
      easyCount,
      mealPrepCount,
      highProteinCount,
      lowCalCount,
      budgetCount,
      bestMatch,
      avgCookTime,
      avgCalories,
      avgProtein,
      abCount,
      abPct,
      gradeCounts,
    };
  }, [recipes]);

  const handleFilterTap = (updatedFilters: CookbookFilters) => {
    onFilterChange(updatedFilters);
    onClose();
  };

  const pills = [
    {
      label: 'Quick',
      count: insights.quickCount,
      icon: Icons.COOK_TIME,
      onPress: () => handleFilterTap({ ...filters, maxCookTime: filters.maxCookTime === 30 ? null : 30 }),
    },
    {
      label: '✨ Easy',
      count: insights.easyCount,
      onPress: () => {
        const has = filters.difficulty.includes('Easy');
        handleFilterTap({
          ...filters,
          difficulty: has ? filters.difficulty.filter(d => d !== 'Easy') : [...filters.difficulty, 'Easy'],
        });
      },
    },
    {
      label: '🍱 Meal prep',
      count: insights.mealPrepCount,
      onPress: () => handleFilterTap({ ...filters, mealPrepOnly: !filters.mealPrepOnly }),
    },
    {
      label: '💪 High protein',
      count: insights.highProteinCount,
      onPress: () => handleFilterTap({ ...filters, highProtein: !filters.highProtein }),
    },
    {
      label: '🥗 Low cal',
      count: insights.lowCalCount,
      onPress: () => handleFilterTap({ ...filters, lowCal: !filters.lowCal }),
    },
    {
      label: '💰 Budget',
      count: insights.budgetCount,
      onPress: () => handleFilterTap({ ...filters, budget: !filters.budget }),
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View style={{ maxHeight: Dimensions.get('window').height * 0.8 }} className="bg-white dark:bg-gray-900 rounded-t-2xl p-4">
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cookbook insights</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Quick stats + one-tap filters
              </Text>
            </View>
            <HapticTouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }}
            >
              <Icon name={Icons.CLOSE} size={IconSizes.SM} color={isDark ? '#D1D5DB' : '#6B7280'} accessibilityLabel="Close insights" />
            </HapticTouchableOpacity>
          </View>

          <ScrollView scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
              {/* Top stats */}
              <View className="flex-row items-start justify-between mb-3">
                <View>
                  <Text className="text-sm text-gray-600 dark:text-gray-200">Best match</Text>
                  <Text
                    className="text-2xl font-bold"
                    style={{ color: isDark ? DarkColors.primary : Colors.primary }}
                  >
                    {insights.bestMatch}%
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Highest match across this collection
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-gray-600 dark:text-gray-200">A/B health</Text>
                  <Text
                    className="text-2xl font-bold"
                    style={{
                      color:
                        insights.abPct >= 70
                          ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                          : insights.abPct >= 40
                            ? (isDark ? DarkColors.primary : Colors.primary)
                            : (isDark ? DarkColors.secondaryRed : Colors.secondaryRed),
                    }}
                  >
                    {insights.abPct}%
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {insights.abCount} of {insights.total} recipes
                  </Text>
                </View>
              </View>

              {/* A/B Progress Bar */}
              <View className="mb-4">
                <View className="relative w-full" style={{ height: 10, borderRadius: 5, overflow: 'hidden' }}>
                  <View
                    className="absolute rounded-full"
                    style={{
                      width: '100%',
                      height: 10,
                      backgroundColor: isDark ? '#374151' : '#E5E7EB',
                      borderRadius: 5,
                    }}
                  />
                  <View
                    className="absolute rounded-full"
                    style={{
                      height: 10,
                      width: `${insights.abPct}%`,
                      backgroundColor:
                        insights.abPct >= 70
                          ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                          : insights.abPct >= 40
                            ? (isDark ? DarkColors.primary : Colors.primary)
                            : (isDark ? DarkColors.secondaryRed : Colors.secondaryRed),
                      borderRadius: 5,
                    }}
                  />
                </View>
              </View>

              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Tap to filter
              </Text>

              {/* One-tap filter pills */}
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {pills.map((pill) => (
                  <HapticTouchableOpacity
                    key={pill.label}
                    onPress={pill.onPress}
                    className="px-3 py-2 rounded-full flex-row items-center border"
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
                      borderColor: isDark ? '#374151' : '#E5E7EB',
                    }}
                  >
                    {pill.icon && (
                      <Icon name={pill.icon} size={12} color={isDark ? '#D1D5DB' : '#6B7280'} accessibilityLabel={pill.label} />
                    )}
                    <Text className={`text-xs font-semibold ${pill.icon ? 'ml-1.5' : ''} text-gray-700 dark:text-gray-200`}>
                      {pill.label}
                    </Text>
                    <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
                      <Text className="text-xs font-semibold text-white">{pill.count}</Text>
                    </View>
                  </HapticTouchableOpacity>
                ))}
              </View>

              {/* Averages */}
              <View className="mt-4">
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Avg cook time: {insights.avgCookTime ?? '—'} min  ·  Avg protein: {insights.avgProtein ?? '—'}g  ·  Avg calories: {insights.avgCalories ?? '—'}
                </Text>
              </View>
            </View>
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
