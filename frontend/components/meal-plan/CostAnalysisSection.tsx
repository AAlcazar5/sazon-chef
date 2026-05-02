// frontend/components/meal-plan/CostAnalysisSection.tsx
// Group 10W — simplified weekly cost card.
// Hero line + single status pill + inline progress + "See breakdown" sheet.

import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import SkeletonLoader from '../ui/SkeletonLoader';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import BottomSheet from '../ui/BottomSheet';
import Icon from '../ui/Icon';
import AnimatedLogoMascot from '../mascot/AnimatedLogoMascot';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import { EditorialFontFamily } from '../../constants/Typography';

const CARD_BG_LIGHT = Pastel.golden;
const CARD_BG_DARK = PastelDark.golden;

const FALLBACK_RATIO_THRESHOLD = 0.4;

export type CostSource = 'priced' | 'category' | 'unknown';

export interface CostMealEntry {
  id?: string;
  name: string;
  cost: number;
  mealType: string;
  costSource?: CostSource;
}

export interface CostAnalysisData {
  totalCost?: number;
  costPerDay?: number;
  costPerMeal?: number;
  mealsCount?: number;
  budgetExceeded?: number;
  budgetRemaining?: number;
  recommendations?: string[];
  mealCosts?: CostMealEntry[];
  disclaimer?: string;
}

export interface ShoppingListSavingsData {
  store?: string;
  location?: string;
  savings?: number;
  savingsPercent?: number;
}

interface CostAnalysisSectionProps {
  costAnalysis: CostAnalysisData | null | undefined;
  loadingCostAnalysis: boolean;
  shoppingListSavings: ShoppingListSavingsData | null | undefined;
  maxWeeklyBudget: number | null;
  isDark: boolean;
  onOptimize: () => void;
}

const fmt = (n: number | undefined): string =>
  typeof n === 'number' && Number.isFinite(n) ? n.toFixed(2) : '0.00';

const computeFallbackRatio = (mealCosts: CostMealEntry[] | undefined): number => {
  if (!mealCosts || mealCosts.length === 0) return 0;
  const anySourcePresent = mealCosts.some((m) => m.costSource !== undefined);
  if (!anySourcePresent) return 0;
  const fallbackCount = mealCosts.filter((m) => m.costSource !== 'priced').length;
  return fallbackCount / mealCosts.length;
};

function CostAnalysisSection({
  costAnalysis,
  loadingCostAnalysis,
  shoppingListSavings,
  maxWeeklyBudget,
  isDark,
  onOptimize,
}: CostAnalysisSectionProps) {
  const [breakdownVisible, setBreakdownVisible] = useState(false);

  const cardBg = isDark ? CARD_BG_DARK : CARD_BG_LIGHT;

  if (!costAnalysis || typeof costAnalysis !== 'object' || Array.isArray(costAnalysis)) {
    return (
      <View
        style={[
          { backgroundColor: cardBg, borderRadius: BorderRadius.card, padding: 20 },
          Shadows.SM as object,
        ]}
      >
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

  const fallbackRatio = computeFallbackRatio(costAnalysis.mealCosts);
  const estimateIncomplete = fallbackRatio > FALLBACK_RATIO_THRESHOLD;
  const confidentEstimate = !estimateIncomplete;
  const overBudget = (costAnalysis.budgetExceeded ?? 0) > 0;
  const underBudget =
    !overBudget &&
    typeof maxWeeklyBudget === 'number' &&
    maxWeeklyBudget > 0 &&
    (costAnalysis.budgetRemaining ?? 0) >= 0;

  const showOptimize = overBudget && confidentEstimate;
  const totalCost = costAnalysis.totalCost ?? 0;
  const progressPct =
    typeof maxWeeklyBudget === 'number' && maxWeeklyBudget > 0
      ? Math.min((totalCost / maxWeeklyBudget) * 100, 100)
      : 0;

  const sortedMeals = useMemo(() => {
    const list = costAnalysis.mealCosts ?? [];
    return [...list].sort((a, b) => b.cost - a.cost).slice(0, 10);
  }, [costAnalysis.mealCosts]);

  const overflowCount = (costAnalysis.mealCosts?.length ?? 0) - sortedMeals.length;

  return (
    <View
      style={[
        { backgroundColor: cardBg, borderRadius: BorderRadius.card, padding: 20 },
        Shadows.SM as object,
      ]}
    >
      {estimateIncomplete ? (
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? PastelDark.peach : Pastel.peach,
              borderRadius: BorderRadius.lg,
              padding: 14,
              gap: 12,
            },
            Shadows.SM as object,
          ]}
          accessibilityLabel="Incomplete cost estimate banner"
        >
          <AnimatedLogoMascot expression="curious" size="small" animationType="idle" />
          <Text
            style={{
              flex: 1,
              fontFamily: EditorialFontFamily.body.medium,
              fontSize: 13,
              color: isDark ? '#F4E4D0' : '#7A4A1F',
              lineHeight: 18,
            }}
          >
            {"Cost estimates incomplete — add pantry items or import recipes with prices for better accuracy"}
          </Text>
        </View>
      ) : (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text
              style={{
                fontFamily: EditorialFontFamily.display.bold,
                fontSize: 38,
                letterSpacing: -1.2,
                color: isDark ? '#F8FAFC' : '#111827',
              }}
              accessibilityLabel="Total weekly cost"
            >
              {`$${fmt(totalCost)}`}
            </Text>
            <Text
              style={{
                fontFamily: EditorialFontFamily.body.semibold,
                fontSize: 13,
                color: isDark ? '#D1D5DB' : '#6B7280',
              }}
            >
              {`$${fmt(costAnalysis.costPerDay)} / day`}
            </Text>
          </View>
        </View>
      )}

      {!estimateIncomplete && (overBudget || underBudget) ? (
        <View style={{ marginTop: 12 }}>
          {overBudget ? (
            <View
              accessibilityLabel="Over budget status"
              style={[
                {
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: BorderRadius.full,
                  backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7',
                },
                Shadows.SM as object,
              ]}
            >
              <Icon
                name={Icons.WARNING_OUTLINE}
                size={IconSizes.XS}
                color={isDark ? '#FCD34D' : '#B45309'}
                accessibilityLabel="Over budget icon"
              />
              <Text
                style={{
                  marginLeft: 6,
                  fontFamily: EditorialFontFamily.body.bold,
                  fontSize: 12,
                  color: isDark ? '#FCD34D' : '#B45309',
                }}
              >
                {`Over by $${fmt(costAnalysis.budgetExceeded)}`}
              </Text>
            </View>
          ) : (
            <View
              accessibilityLabel="On budget status"
              style={[
                {
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: BorderRadius.full,
                  backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : '#D1FAE5',
                },
                Shadows.SM as object,
              ]}
            >
              <Icon
                name={Icons.CHECKMARK_CIRCLE_OUTLINE}
                size={IconSizes.XS}
                color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen}
                accessibilityLabel="On budget icon"
              />
              <Text
                style={{
                  marginLeft: 6,
                  fontFamily: EditorialFontFamily.body.bold,
                  fontSize: 12,
                  color: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark,
                }}
              >
                {`On budget · $${fmt(costAnalysis.budgetRemaining)} left`}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {!estimateIncomplete && typeof maxWeeklyBudget === 'number' && maxWeeklyBudget > 0 ? (
        <View
          style={{
            marginTop: 14,
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: isDark ? '#374151' : '#F3E8C6',
          }}
          accessibilityLabel="Weekly budget progress"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progressPct) }}
        >
          <View
            style={{
              width: `${progressPct}%`,
              height: '100%',
              backgroundColor: overBudget
                ? isDark
                  ? '#FCD34D'
                  : '#F59E0B'
                : isDark
                  ? DarkColors.tertiaryGreen
                  : Colors.tertiaryGreen,
            }}
          />
        </View>
      ) : null}

      <View
        style={{
          marginTop: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <HapticTouchableOpacity
          onPress={() => setBreakdownVisible(true)}
          accessibilityLabel="See cost breakdown"
          style={{
            paddingVertical: 6,
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              fontFamily: EditorialFontFamily.body.bold,
              fontSize: 13,
              color: isDark ? '#FCD34D' : '#B45309',
              textDecorationLine: 'underline',
            }}
          >
            {"See breakdown"}
          </Text>
        </HapticTouchableOpacity>

        {showOptimize ? (
          <BrandButton
            label="Optimize"
            onPress={onOptimize}
            variant="brand"
            size="compact"
            accessibilityLabel="Optimize meal plan to fit budget"
          />
        ) : null}
      </View>

      {costAnalysis.disclaimer && !estimateIncomplete ? (
        <Text
          style={{
            marginTop: 10,
            fontSize: 11,
            fontFamily: EditorialFontFamily.body.medium,
            color: isDark ? '#9CA3AF' : '#6B7280',
            fontStyle: 'italic',
          }}
        >
          {costAnalysis.disclaimer}
        </Text>
      ) : null}

      <BottomSheet
        visible={breakdownVisible}
        onClose={() => setBreakdownVisible(false)}
        title="Cost breakdown"
        snapPoints={['90%']}
        scrollable
      >
        <View style={{ padding: 20, gap: 20 }}>
          <View>
            <Text
              style={{
                fontFamily: EditorialFontFamily.display.semibold,
                fontSize: 18,
                color: isDark ? '#F8FAFC' : '#111827',
                marginBottom: 4,
              }}
            >
              {"Per-Meal Costs"}
            </Text>
            <Text
              style={{
                fontFamily: EditorialFontFamily.body.medium,
                fontSize: 12,
                color: isDark ? '#9CA3AF' : '#6B7280',
                marginBottom: 12,
              }}
            >
              {`${costAnalysis.mealsCount ?? 0} meals · $${fmt(costAnalysis.costPerMeal)} avg`}
            </Text>
            <View style={{ gap: 10 }}>
              {sortedMeals.map((meal, idx) => {
                const allCosts = (costAnalysis.mealCosts ?? []).map((m) => m.cost);
                const maxCost = allCosts.length > 0 ? Math.max(...allCosts) : 0;
                const barWidth = maxCost > 0 ? (meal.cost / maxCost) * 100 : 0;
                const mealTypeColors: Record<string, string> = {
                  breakfast: isDark ? DarkColors.primary : Colors.primary,
                  lunch: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
                  dinner: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                  snacks: isDark ? DarkColors.accent : Colors.accent,
                };
                const barColor = mealTypeColors[meal.mealType] ?? '#9CA3AF';
                return (
                  <View key={meal.id ?? `${meal.name}-${idx}`}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          fontFamily: EditorialFontFamily.body.medium,
                          fontSize: 13,
                          color: isDark ? '#E5E7EB' : '#111827',
                        }}
                      >
                        {meal.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: EditorialFontFamily.body.bold,
                          fontSize: 13,
                          color: isDark ? '#F8FAFC' : '#111827',
                          marginLeft: 8,
                        }}
                      >
                        {`$${fmt(meal.cost)}`}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 6,
                        borderRadius: 3,
                        overflow: 'hidden',
                        backgroundColor: isDark ? '#374151' : '#E5E7EB',
                      }}
                    >
                      <View
                        style={{
                          width: `${barWidth}%`,
                          height: '100%',
                          backgroundColor: barColor,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
              {overflowCount > 0 ? (
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontFamily: EditorialFontFamily.body.medium,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                  }}
                >
                  {`+${overflowCount} more`}
                </Text>
              ) : null}
            </View>
          </View>

          {shoppingListSavings && (shoppingListSavings.savings ?? 0) > 0 ? (
            <View
              style={[
                {
                  backgroundColor: isDark ? PastelDark.sage : Pastel.sage,
                  borderRadius: BorderRadius.card,
                  padding: 16,
                },
                Shadows.SM as object,
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: EditorialFontFamily.display.semibold,
                    fontSize: 16,
                    color: isDark ? '#F8FAFC' : '#111827',
                  }}
                >
                  {"Best Store"}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: BorderRadius.full,
                    backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : Colors.tertiaryGreenLight,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: EditorialFontFamily.body.bold,
                      fontSize: 12,
                      color: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark,
                    }}
                  >
                    {`Save $${fmt(shoppingListSavings.savings)}`}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  fontFamily: EditorialFontFamily.body.medium,
                  fontSize: 13,
                  color: isDark ? '#E5E7EB' : '#374151',
                }}
              >
                {`Shop at ${shoppingListSavings.store ?? 'this store'}${
                  shoppingListSavings.location ? ` (${shoppingListSavings.location})` : ''
                } to save ${
                  typeof shoppingListSavings.savingsPercent === 'number'
                    ? shoppingListSavings.savingsPercent.toFixed(0)
                    : '0'
                }%`}
              </Text>
            </View>
          ) : null}

          {costAnalysis.recommendations &&
          Array.isArray(costAnalysis.recommendations) &&
          costAnalysis.recommendations.length > 0 ? (
            <View>
              <Text
                style={{
                  fontFamily: EditorialFontFamily.display.semibold,
                  fontSize: 16,
                  color: isDark ? '#F8FAFC' : '#111827',
                  marginBottom: 8,
                }}
              >
                {"Recommendations"}
              </Text>
              <View style={{ gap: 6 }}>
                {costAnalysis.recommendations.map((rec, idx) => (
                  <Text
                    key={idx}
                    style={{
                      fontFamily: EditorialFontFamily.body.medium,
                      fontSize: 13,
                      color: isDark ? '#E5E7EB' : '#374151',
                      lineHeight: 19,
                    }}
                  >
                    {`• ${rec}`}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </BottomSheet>
    </View>
  );
}

export default CostAnalysisSection;
