// frontend/components/meal-plan/CostAnalysisSection.tsx
// Cost analysis and budget tracking section for meal plan

import React from 'react';
import { View, Text } from 'react-native';
import SkeletonLoader from '../ui/SkeletonLoader';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';

interface CostAnalysisSectionProps {
  costAnalysis: any;
  loadingCostAnalysis: boolean;
  shoppingListSavings: any;
  maxWeeklyBudget: number | null;
  isDark: boolean;
  onOptimize: () => void;
}

function CostAnalysisSection({
  costAnalysis,
  loadingCostAnalysis,
  shoppingListSavings,
  maxWeeklyBudget,
  isDark,
  onOptimize,
}: CostAnalysisSectionProps) {
  // No cost analysis data - show empty or loading state
  if (!costAnalysis || typeof costAnalysis !== 'object' || Array.isArray(costAnalysis)) {
    return (
      <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4" style={{ borderLeftColor: isDark ? DarkColors.primary : Colors.primary }}>
        {loadingCostAnalysis ? (
          <View style={{ gap: 12 }}>
            <SkeletonLoader width="60%" height={16} borderRadius={4} isDark={isDark} />
            <SkeletonLoader width="100%" height={12} borderRadius={4} isDark={isDark} />
            <SkeletonLoader width="80%" height={12} borderRadius={4} isDark={isDark} />
          </View>
        ) : (
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {"Add recipes to your meal plan to see cost analysis"}
          </Text>
        )}
      </View>
    );
  }

  // Has cost analysis data - show full analysis
  return (
    <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4" style={{ borderLeftColor: isDark ? DarkColors.primary : Colors.primary }}>
      <View className="flex-row justify-between items-center mb-3">
        <View>
          <Text className="text-sm text-gray-500 dark:text-gray-200">{"Total Weekly Cost"}</Text>
          <Text className="text-2xl font-bold" style={{ color: costAnalysis.budgetExceeded ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed) : (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen) }}>
            {`$${costAnalysis.totalCost ? costAnalysis.totalCost.toFixed(2) : '0.00'}`}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm text-gray-500 dark:text-gray-200">{"Per Day"}</Text>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {`$${costAnalysis.costPerDay ? costAnalysis.costPerDay.toFixed(2) : '0.00'}`}
          </Text>
        </View>
      </View>

      {costAnalysis.budgetExceeded ? (
        <View className="rounded-lg p-3 mb-3 border" style={{ backgroundColor: isDark ? '#EF444433' : Colors.secondaryRedLight, borderColor: isDark ? DarkColors.secondaryRedDark : Colors.secondaryRedDark }}>
          <View className="flex-row items-center mb-1">
            <Icon name={Icons.WARNING_OUTLINE} size={IconSizes.XS} color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed} accessibilityLabel="Budget exceeded warning" />
            <Text className="font-semibold ml-2" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
              {`Over Budget by $${costAnalysis.budgetExceeded.toFixed(2)}`}
            </Text>
          </View>
          <Text className="text-sm" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
            {"Consider cheaper recipe alternatives to stay within budget."}
          </Text>
        </View>
      ) : null}

      {costAnalysis.budgetRemaining && costAnalysis.budgetRemaining > 0 ? (
        <View className="rounded-lg p-3 mb-3 border" style={{ backgroundColor: isDark ? '#10B98133' : Colors.tertiaryGreenLight, borderColor: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark }}>
          <View className="flex-row items-center">
            <Icon name={Icons.CHECKMARK_CIRCLE_OUTLINE} size={IconSizes.XS} color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} accessibilityLabel="Budget remaining" />
            <Text className="font-semibold ml-2" style={{ color: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark }}>
              {`$${costAnalysis.budgetRemaining.toFixed(2)} remaining in budget`}
            </Text>
          </View>
        </View>
      ) : null}

      {costAnalysis.recommendations && Array.isArray(costAnalysis.recommendations) && costAnalysis.recommendations.length > 0 ? (
        <View className="mt-2">
          {costAnalysis.recommendations.map((rec: string, idx: number) => (
            <Text key={idx} className="text-sm text-gray-600 dark:text-gray-100 mb-1">
              {`• ${rec}`}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Budget Progress */}
      {maxWeeklyBudget ? (
        <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {"Weekly Budget"}
            </Text>
            <Text className="text-sm font-semibold" style={{
              color: costAnalysis.budgetExceeded
                ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                : (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
            }}>
              {`$${costAnalysis.totalCost ? costAnalysis.totalCost.toFixed(2) : '0.00'} / $${maxWeeklyBudget.toFixed(2)}`}
            </Text>
          </View>
          <View className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.min((costAnalysis.totalCost / maxWeeklyBudget) * 100, 100)}%`,
                backgroundColor: costAnalysis.budgetExceeded
                  ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                  : (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen),
              }}
            />
          </View>
        </View>
      ) : null}

      <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-500 dark:text-gray-200">{"Cost per meal"}</Text>
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {`$${costAnalysis.costPerMeal ? costAnalysis.costPerMeal.toFixed(2) : '0.00'}`}
          </Text>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-sm text-gray-500 dark:text-gray-200">{"Meals planned"}</Text>
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {`${costAnalysis.mealsCount || 0} meals`}
          </Text>
        </View>
      </View>

      {/* Per-Meal Costs */}
      {costAnalysis.mealCosts && costAnalysis.mealCosts.length > 0 ? (
        <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {"Per-Meal Costs"}
          </Text>
          <View style={{ gap: 8 }}>
            {costAnalysis.mealCosts
              .sort((a: any, b: any) => b.cost - a.cost)
              .slice(0, 10)
              .map((meal: any, index: number) => {
                const mealTypeColors: Record<string, string> = {
                  breakfast: isDark ? DarkColors.primary : Colors.primary,
                  lunch: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
                  dinner: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                  snacks: isDark ? DarkColors.accent : Colors.accent,
                };
                const mealTypeColor = mealTypeColors[meal.mealType] || '#9CA3AF';
                const allMealCosts = costAnalysis.mealCosts.map((m: any) => m.cost);
                const maxCost = allMealCosts.length > 0 ? Math.max(...allMealCosts) : 0;
                const barWidth = maxCost > 0 ? (meal.cost / maxCost) * 100 : 0;

                return (
                  <View key={index} className="flex-row items-center">
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-xs text-gray-700 dark:text-gray-300 flex-1" numberOfLines={1}>
                          {meal.name}
                        </Text>
                        <Text className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-2">
                          {`$${meal.cost.toFixed(2)}`}
                        </Text>
                      </View>
                      <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: mealTypeColor,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            {costAnalysis.mealCosts.length > 10 ? (
              <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                {"Showing top 10 most expensive meals"}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Savings Suggestions */}
      {shoppingListSavings && shoppingListSavings.savings > 0 ? (
        <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Icon name={Icons.STORE_OUTLINE} size={IconSizes.XS} color="#10B981" accessibilityLabel="Best store" />
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 ml-2">{"Best Store"}</Text>
            </View>
            <View className="px-2 py-1 rounded" style={{ backgroundColor: isDark ? '#10B98133' : Colors.tertiaryGreenLight }}>
              <Text className="font-semibold text-xs" style={{ color: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark }}>
                {`Save $${shoppingListSavings.savings.toFixed(2)}`}
              </Text>
            </View>
          </View>
          <Text className="text-sm text-gray-700 dark:text-gray-100">
            {`Shop at ${shoppingListSavings.store || 'this store'}${shoppingListSavings.location ? ` (${shoppingListSavings.location})` : ''} to save ${shoppingListSavings.savingsPercent ? shoppingListSavings.savingsPercent.toFixed(0) : '0'}%`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default CostAnalysisSection;
