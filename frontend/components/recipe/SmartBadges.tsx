import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import type { Recipe } from '../../types';

interface Badge {
  id: string;
  label: string;
  value: string | number;
  priority: number;
  tooltip: string;
  icon?: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
}

interface SmartBadgesProps {
  recipe: Recipe;
  maxVisible?: number;
  variant?: 'featured' | 'grid' | 'list' | 'carousel';
  showOnlyInfoBadge?: boolean;
  hideInfoBadge?: boolean;
  noWrap?: boolean;
  sizeVariant?: 'default' | 'compact';
  forceIncludeIds?: string[];
}

export default function SmartBadges({ recipe, maxVisible = 3, variant = 'list', showOnlyInfoBadge = false, hideInfoBadge = false, noWrap = false, sizeVariant = 'default', forceIncludeIds = [] }: SmartBadgesProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [tooltipBadge, setTooltipBadge] = useState<Badge | null>(null);
  const tooltipOpacity = useState(new Animated.Value(0))[0];
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Prevent any pending animation completion callbacks from firing setState
      tooltipOpacity.stopAnimation();
    };
  }, [tooltipOpacity]);

  // Generate all badges with priority
  const allBadges = useMemo(() => {
    const badges: Badge[] = [];

    // 1. Match Score (Highest Priority)
    if (recipe.score?.matchPercentage) {
      const matchPct = Math.round(recipe.score.matchPercentage);
      badges.push({
        id: 'match-score',
        label: 'Match',
        value: `${matchPct}%`,
        priority: 1,
        tooltip: `This recipe matches ${matchPct}% of your preferences, including dietary restrictions, taste preferences, and nutritional goals.`,
        icon: Icons.STAR,
        color: matchPct >= 85 ? Colors.tertiaryGreen : matchPct >= 70 ? Colors.primary : Colors.secondaryRed,
        bgColor: isDark 
          ? (matchPct >= 85 ? `${Colors.tertiaryGreen}33` : matchPct >= 70 ? `${Colors.primary}33` : `${Colors.secondaryRed}33`)
          : (matchPct >= 85 ? `${Colors.tertiaryGreen}25` : matchPct >= 70 ? `${Colors.primary}25` : `${Colors.secondaryRed}25`),
        textColor: matchPct >= 85 
          ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreenDark)
          : matchPct >= 70 
          ? (isDark ? DarkColors.primary : Colors.primaryDark)
          : (isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark),
      });
    }

    // 2. Health Grade (High Priority)
    const healthGrade = recipe.healthGrade || (recipe.score as any)?.healthGrade;
    if (healthGrade) {
      const gradeColors = {
        'A': { bg: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)', text: isDark ? '#4ADE80' : '#15803D', border: '#22C55E' },
        'B': { bg: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)', text: isDark ? '#60A5FA' : '#1D4ED8', border: '#3B82F6' },
        'C': { bg: isDark ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.15)', text: isDark ? '#FACC15' : '#A16207', border: '#EAB308' },
        'D': { bg: isDark ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.15)', text: isDark ? '#FB923C' : '#C2410C', border: '#F97316' },
        'F': { bg: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)', text: isDark ? '#F87171' : '#B91C1C', border: '#EF4444' },
      };
      const colors = gradeColors[healthGrade as keyof typeof gradeColors] || gradeColors['C'];
      badges.push({
        id: 'health-grade',
        label: 'Health Grade',
        value: `${healthGrade}`,
        priority: 2,
        tooltip: `Health Grade ${healthGrade}: ${healthGrade === 'A' ? 'Excellent nutritional value' : healthGrade === 'B' ? 'Good nutritional value' : healthGrade === 'C' ? 'Average nutritional value' : healthGrade === 'D' ? 'Below average nutritional value' : 'Poor nutritional value'}. Based on macronutrient balance, nutrient density, and ingredient quality.`,
        color: colors.border,
        bgColor: colors.bg,
        textColor: colors.text,
        borderColor: colors.border,
      });
    }

    // 3. Prep Time (High Priority) - Always show if cookTime exists
    // Show "Quick" badge for recipes <= 30 min, otherwise show general "Prep Time" badge
    if (recipe.cookTime) {
      if (recipe.cookTime <= 30) {
        // Quick & Easy badge for recipes <= 30 min
        badges.push({
          id: 'quick',
          label: 'Quick',
          value: `${recipe.cookTime} min`,
          priority: 3,
          tooltip: `This recipe takes only ${recipe.cookTime} minutes to prepare, making it perfect for busy days.`,
          icon: Icons.COOK_TIME,
          color: Colors.info,
          bgColor: isDark ? `${Colors.info}33` : `${Colors.info}25`,
          textColor: isDark ? DarkColors.info : '#1E40AF', // blue-800 for better contrast in light mode
        });
      } else {
        // General prep time badge for recipes > 30 min
        badges.push({
          id: 'prep-time',
          label: 'Prep Time',
          value: `${recipe.cookTime} min`,
          priority: 3,
          tooltip: `This recipe takes ${recipe.cookTime} minutes to prepare.`,
          icon: Icons.COOK_TIME,
          color: Colors.info,
          bgColor: isDark ? `${Colors.info}33` : `${Colors.info}25`,
          textColor: isDark ? DarkColors.info : '#1E40AF', // blue-800 for better contrast in light mode
        });
      }
    }

    // 5. Low Calorie (Medium Priority) - Success green (different from tertiaryGreen)
    if (recipe.calories && recipe.calories <= 300) {
      badges.push({
        id: 'low-cal',
        label: 'Low Cal',
        value: `${recipe.calories} cal`,
        priority: 4,
        tooltip: `This recipe contains only ${recipe.calories} calories per serving, making it great for weight management.`,
        color: Colors.success,
        bgColor: isDark ? `${Colors.success}33` : `${Colors.success}25`,
        textColor: isDark ? DarkColors.success : '#047857', // emerald-700 for better contrast in light mode
      });
    }

    // 6. Budget Friendly (Lower Priority) - Warning/Amber color
    if (recipe.estimatedCostPerServing && recipe.estimatedCostPerServing <= 3) {
      badges.push({
        id: 'budget',
        label: 'Budget',
        value: `$${recipe.estimatedCostPerServing.toFixed(2)}`,
        priority: 5,
        tooltip: `This recipe costs only $${recipe.estimatedCostPerServing.toFixed(2)} per serving, making it budget-friendly.`,
        icon: Icons.SAVE_RECIPE,
        color: Colors.warning,
        bgColor: isDark ? `${Colors.warning}33` : `${Colors.warning}25`,
        textColor: isDark ? DarkColors.warning : '#B45309', // amber-700 for better contrast in light mode
      });
    }

    // Sort by priority
    return badges.sort((a, b) => a.priority - b.priority);
  }, [recipe, isDark]);

  // Separate visible and hidden badges
  const forcedBadges = forceIncludeIds.length > 0
    ? forceIncludeIds
        .map((id) => allBadges.find((badge) => badge.id === id))
        .filter((badge): badge is Badge => Boolean(badge))
    : [];
  const remainingBadges = forcedBadges.length > 0
    ? allBadges.filter((badge) => !forceIncludeIds.includes(badge.id))
    : allBadges;
  const visibleBadges = [...forcedBadges, ...remainingBadges].slice(0, maxVisible);
  const visibleBadgeIds = new Set(visibleBadges.map((badge) => badge.id));
  const hiddenBadges = allBadges.filter((badge) => !visibleBadgeIds.has(badge.id));

  const showTooltip = (badge: Badge) => {
    if (!isMountedRef.current) return;
    setTooltipBadge(badge);
    tooltipOpacity.stopAnimation();
    Animated.timing(tooltipOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Avoid unhandled promise rejections
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const hideTooltip = () => {
    tooltipOpacity.stopAnimation();
    Animated.timing(tooltipOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      if (!isMountedRef.current) return;
      setTooltipBadge(null);
    });
  };

  // Unified variant check for consistent sizing (moved outside renderBadge for reuse)
  const isLargeVariant = variant === 'featured' || variant === 'list';
  const useCompactSize = sizeVariant === 'compact';

  const renderBadge = (badge: Badge, showTooltipOnLongPress = true) => {
    // Unified badge sizes - list and carousel use same template as featured
    const badgeSize = useCompactSize ? 'px-2 py-0.5' : (isLargeVariant ? 'px-3 py-1.5' : 'px-2.5 py-1');
    const textSize = useCompactSize ? 'text-xs' : (isLargeVariant ? 'text-sm' : 'text-xs');
    const iconSize = useCompactSize ? 12 : (isLargeVariant ? 14 : 12);

    return (
      <HapticTouchableOpacity
        key={badge.id}
        onLongPress={showTooltipOnLongPress ? () => showTooltip(badge) : undefined}
        onPressOut={showTooltipOnLongPress ? hideTooltip : undefined}
        delayLongPress={500}
        className={`${badgeSize} rounded-full border flex-row items-center mr-2 ${noWrap ? '' : 'mb-2'}`}
        style={{
          backgroundColor: badge.bgColor,
          borderColor: badge.borderColor || badge.color,
        }}
        activeOpacity={0.7}
      >
        {badge.icon && (
          <Icon
            name={badge.icon}
            size={iconSize}
            color={badge.textColor}
            accessibilityLabel={badge.label}
          />
        )}
        <Text className={`${textSize} font-semibold ${badge.icon ? 'ml-0.5' : ''}`} style={{ color: badge.textColor }}>
          {badge.value}
        </Text>
      </HapticTouchableOpacity>
    );
  };

  if (allBadges.length === 0) return null;

  const renderInfoBadge = () => (
    allBadges.length > 0 && (
      <HapticTouchableOpacity
        onPress={() => {
          if (!isMountedRef.current) return;
          setShowMoreMenu(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }}
        className={`rounded-full border mr-2 ${noWrap ? '' : 'mb-2'} items-center justify-center ${isLargeVariant ? 'w-8 h-8' : 'w-6 h-6'}`}
        style={{
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          borderColor: isDark ? '#4B5563' : '#D1D5DB',
        }}
        activeOpacity={0.7}
      >
        <Icon
          name={Icons.INFO_OUTLINE}
          size={isLargeVariant ? 16 : 12}
          color={isDark ? '#FFFFFF' : '#6B7280'}
          accessibilityLabel="View more badge details"
        />
      </HapticTouchableOpacity>
    )
  );

  const modalContent = (
    <>
      {/* More Badges Menu */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMoreMenu(false)}
          className="flex-1 bg-black/50 justify-center items-center px-4"
        >
          <View
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm"
            style={{ maxHeight: '80%' }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Recipe Badges
              </Text>
              <HapticTouchableOpacity
                onPress={() => setShowMoreMenu(false)}
                className="p-2"
              >
                <Icon
                  name={Icons.CLOSE}
                  size={IconSizes.MD}
                  color={isDark ? '#9CA3AF' : '#6B7280'}
                  accessibilityLabel="Close"
                />
              </HapticTouchableOpacity>
            </View>
            
            <View className="flex-row flex-wrap">
              {allBadges.map(badge => (
                <View key={badge.id} className="mb-3 w-full">
                  {renderBadge(badge, false)}
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-2">
                    {badge.tooltip}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tooltip Modal */}
      {tooltipBadge && (
        <Modal
          visible={!!tooltipBadge}
          transparent
          animationType="fade"
          onRequestClose={hideTooltip}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={hideTooltip}
            className="flex-1 justify-center items-center px-4"
          >
            <Animated.View
              style={{
                opacity: tooltipOpacity,
              }}
            >
              <View
                className="bg-gray-900 dark:bg-gray-100 rounded-lg p-4 max-w-xs"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 5,
                }}
              >
                <Text className="text-white dark:text-gray-900 text-sm font-semibold mb-2">
                  {tooltipBadge.label}
                </Text>
                <Text className="text-white/90 dark:text-gray-700 text-xs leading-5">
                  {tooltipBadge.tooltip}
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );

  if (showOnlyInfoBadge) {
    return (
      <>
        {renderInfoBadge()}
        {modalContent}
      </>
    );
  }

  return (
    <>
      <View className={`flex-row items-center ${noWrap ? '' : 'flex-wrap'}`}>
        {visibleBadges.map(badge => renderBadge(badge))}
        {variant !== 'featured' && !hideInfoBadge && renderInfoBadge()}
      </View>
      {modalContent}
    </>
  );
}

