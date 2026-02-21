// frontend/components/home/RecipeCarouselSection.tsx
// Reusable collapsible carousel section for recipe lists

import React, { useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import SkeletonLoader from '../ui/SkeletonLoader';
import { RecipeCard } from '../recipe/RecipeCard';
import type { SuggestedRecipe } from '../../types';
import type { UserFeedback } from '../../utils/recipeUtils';

const CARD_WIDTH = 280;
const CARD_MARGIN = 12;
const CARD_STEP = CARD_WIDTH + CARD_MARGIN;

interface RecipeCarouselSectionProps {
  title: string;
  subtitle?: string;
  emoji: string;
  recipes: SuggestedRecipe[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDark: boolean;
  isLoading?: boolean;
  // Recipe card handlers
  userFeedback: Record<string, UserFeedback>;
  feedbackLoading: string | null;
  onRecipePress: (recipeId: string) => void;
  onRecipeLongPress: (recipe: SuggestedRecipe) => void;
  onLike: (recipeId: string) => void;
  onDislike: (recipeId: string) => void;
  onSave: (recipeId: string) => void;
  // Optional refresh functionality
  showRefreshPrompt?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  refreshPromptText?: string;
  // Optional scroll ref
  scrollRef?: React.RefObject<ScrollView | null>;
  onScroll?: (event: any) => void;
  onMomentumScrollEnd?: (event: any) => void;
}

function RecipeCarouselSection({
  title,
  subtitle,
  emoji,
  recipes,
  isCollapsed,
  onToggleCollapse,
  isDark,
  isLoading = false,
  userFeedback,
  feedbackLoading,
  onRecipePress,
  onRecipeLongPress,
  onLike,
  onDislike,
  onSave,
  showRefreshPrompt = false,
  refreshing = false,
  onRefresh,
  refreshPromptText = 'Swipe to refresh and get new recipes',
  scrollRef,
  onScroll,
  onMomentumScrollEnd,
}: RecipeCarouselSectionProps) {
  // Prefetch images for the next 3 recipes when scrolling
  const handleMomentumScrollEnd = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(offsetX / CARD_STEP);
    const nextUrls = recipes
      .slice(currentIndex + 1, currentIndex + 4)
      .map(r => r.imageUrl)
      .filter(Boolean) as string[];
    if (nextUrls.length > 0) {
      nextUrls.forEach(url => Image.prefetch(url).catch(() => {}));
    }
    onMomentumScrollEnd?.(event);
  }, [recipes, onMomentumScrollEnd]);

  if (isLoading && recipes.length === 0) {
    return (
      <View className="px-4 mb-6">
        {/* Section Header skeleton */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <SkeletonLoader width={32} height={32} borderRadius={16} style={{ marginRight: 8 }} isDark={isDark} />
            <View className="flex-1">
              <SkeletonLoader width="50%" height={18} borderRadius={4} isDark={isDark} />
              <SkeletonLoader width="30%" height={12} borderRadius={4} style={{ marginTop: 4 }} isDark={isDark} />
            </View>
          </View>
        </View>
        {/* Skeleton cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }} scrollEnabled={false}>
          {[1, 2, 3].map(i => (
            <View key={i} style={{ width: CARD_WIDTH, marginRight: CARD_MARGIN }}>
              <SkeletonLoader width={CARD_WIDTH} height={160} borderRadius={12} isDark={isDark} />
              <SkeletonLoader width="75%" height={16} borderRadius={4} style={{ marginTop: 10 }} isDark={isDark} />
              <SkeletonLoader width="50%" height={12} borderRadius={4} style={{ marginTop: 6 }} isDark={isDark} />
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 6 }}>
                {[60, 60, 60, 60].map((w, j) => (
                  <SkeletonLoader key={j} width={w} height={28} borderRadius={14} isDark={isDark} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (recipes.length === 0) {
    return null;
  }

  return (
    <View className="px-4 mb-6">
      {/* Section Header */}
      <HapticTouchableOpacity
        onPress={onToggleCollapse}
        className="flex-row items-center justify-between mb-4"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          <Text className="text-2xl mr-2">{emoji}</Text>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle || `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>
        <Icon
          name={isCollapsed ? Icons.CHEVRON_DOWN : Icons.CHEVRON_UP}
          size={IconSizes.SM}
          color={isDark ? '#9CA3AF' : '#6B7280'}
          accessibilityLabel={isCollapsed ? 'Expand section' : 'Collapse section'}
        />
      </HapticTouchableOpacity>

      {/* Section Content */}
      {!isCollapsed && (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
          decelerationRate="fast"
          snapToInterval={CARD_STEP}
          snapToAlignment="start"
          onScroll={onScroll}
          scrollEventThrottle={100}
          onMomentumScrollEnd={handleMomentumScrollEnd}
        >
          {recipes.map((recipe) => {
            const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
            const isFeedbackLoading = feedbackLoading === recipe.id;

            return (
              <View key={recipe.id} style={{ width: CARD_WIDTH, marginRight: CARD_MARGIN }}>
                <RecipeCard
                  recipe={recipe}
                  variant="carousel"
                  onPress={onRecipePress}
                  onLongPress={onRecipeLongPress}
                  onLike={onLike}
                  onDislike={onDislike}
                  onSave={onSave}
                  feedback={feedback}
                  isFeedbackLoading={isFeedbackLoading}
                  isDark={isDark}
                  showDescription={true}
                />
              </View>
            );
          })}

          {/* Refresh prompt when on last recipe */}
          {showRefreshPrompt && onRefresh && (
            <View style={{ width: CARD_WIDTH, marginRight: CARD_MARGIN, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <View style={{
                backgroundColor: isDark ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)',
              }}>
                <Ionicons
                  name="refresh-outline"
                  size={32}
                  color={isDark ? DarkColors.primary : Colors.primary}
                  style={{ marginBottom: 8 }}
                />
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isDark ? DarkColors.text.primary : Colors.text.primary,
                  marginBottom: 4,
                  textAlign: 'center',
                }}>
                  Want more recipes?
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  marginBottom: 12,
                  textAlign: 'center',
                }}>
                  {refreshPromptText}
                </Text>
                <HapticTouchableOpacity
                  onPress={() => {
                    HapticPatterns.buttonPress();
                    onRefresh();
                  }}
                  disabled={refreshing}
                  style={{
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 8,
                    opacity: refreshing ? 0.7 : 1,
                  }}
                >
                  {refreshing ? (
                    <AnimatedActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                      Refresh Recipes
                    </Text>
                  )}
                </HapticTouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

export default RecipeCarouselSection;
