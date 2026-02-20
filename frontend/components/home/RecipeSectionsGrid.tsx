// frontend/components/home/RecipeSectionsGrid.tsx
// Renders the contextual recipe sections with collapse/expand, grid/list/carousel views, and inline pagination

import React from 'react';
import { View, Text, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import AnimatedRecipeCard from '../recipe/AnimatedRecipeCard';
import CardStack from '../ui/CardStack';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { HapticPatterns } from '../../constants/Haptics';
import { RecipeCard } from '../recipe/RecipeCard';
import PaginationControls from './PaginationControls';
import type { SuggestedRecipe } from '../../types';
import type { RecipeSection, UserFeedback } from '../../utils/recipeUtils';
import type { PaginationInfo } from '../../hooks/useRecipePagination';

interface RecipeSectionsGridProps {
  sections: RecipeSection[];
  collapsedSections: Record<string, boolean>;
  onToggleSection: (key: string) => void;
  viewMode: 'grid' | 'list';
  isDark: boolean;

  // Recipe card handlers
  userFeedback: Record<string, UserFeedback>;
  feedbackLoading: string | null;
  onRecipePress: (recipeId: string) => void;
  onRecipeLongPress: (recipe: SuggestedRecipe) => void;
  onLike: (recipeId: string) => void;
  onDislike: (recipeId: string) => void;
  onSave: (recipeId: string) => void;

  // List-view animation
  animatedRecipeIds: Set<string>;
  onAnimatedRecipeId: (id: string) => void;
  scrollY: Animated.Value;

  // Quick meals carousel
  quickMealsScrollViewRef: React.RefObject<ScrollView | null>;
  quickMealsCurrentIndex: number;
  onQuickMealsIndexChange: (index: number) => void;
  refreshingQuickMeals: boolean;
  onRefreshQuickMeals: () => void;

  // Pagination (for "Recipes for You" section)
  currentPage: number;
  totalRecipes: number;
  suggestedRecipesCount: number;
  paginationInfo: PaginationInfo;
  paginationLoading: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}

function RecipeSectionsGrid({
  sections,
  collapsedSections,
  onToggleSection,
  viewMode,
  isDark,
  userFeedback,
  feedbackLoading,
  onRecipePress,
  onRecipeLongPress,
  onLike,
  onDislike,
  onSave,
  animatedRecipeIds,
  onAnimatedRecipeId,
  scrollY,
  quickMealsScrollViewRef,
  quickMealsCurrentIndex,
  onQuickMealsIndexChange,
  refreshingQuickMeals,
  onRefreshQuickMeals,
  currentPage,
  totalRecipes,
  suggestedRecipesCount,
  paginationInfo,
  paginationLoading,
  onPrevPage,
  onNextPage,
}: RecipeSectionsGridProps) {
  const filtered = sections.filter(s => s.key !== 'perfect-match' && s.key !== 'meal-prep');
  if (filtered.length === 0) return null;

  return (
    <View className="px-4">
      {filtered.map((section) => {
        const isCollapsed = collapsedSections[section.key];
        const isQuickMeals = section.key === 'quick-meals';
        const isMealPrep = section.key === 'meal-prep';
        const isRecipesForYou = section.key === 'quick-easy';

        return (
          <View key={section.key} className="mb-6">
            {/* Section Header */}
            <HapticTouchableOpacity
              onPress={() => onToggleSection(section.key)}
              className="flex-row items-center justify-between mb-4"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center flex-1">
                <Text className="text-2xl mr-2">{section.emoji}</Text>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {section.title}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {section.recipes.length} recipe{section.recipes.length !== 1 ? 's' : ''}
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
              <Animated.View>
                {isQuickMeals || isMealPrep ? (
                  /* Carousel view for Quick Meals / Meal Prep */
                  <ScrollView
                    ref={isQuickMeals ? quickMealsScrollViewRef : undefined}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 16 }}
                    decelerationRate="fast"
                    snapToInterval={280}
                    snapToAlignment="start"
                    onScroll={(event) => {
                      if (!isQuickMeals) return;
                      const scrollPosition = event.nativeEvent.contentOffset.x;
                      onQuickMealsIndexChange(Math.round(scrollPosition / (280 + 12)));
                    }}
                    scrollEventThrottle={100}
                    onMomentumScrollEnd={(event) => {
                      if (!isQuickMeals) return;
                      const scrollPosition = event.nativeEvent.contentOffset.x;
                      onQuickMealsIndexChange(Math.round(scrollPosition / (280 + 12)));
                    }}
                  >
                    {section.recipes.map((recipe) => {
                      const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
                      return (
                        <View key={recipe.id} style={{ width: 280, marginRight: 12 }}>
                          <RecipeCard
                            recipe={recipe}
                            variant="carousel"
                            onPress={onRecipePress}
                            onLongPress={onRecipeLongPress}
                            onLike={onLike}
                            onDislike={onDislike}
                            onSave={onSave}
                            feedback={feedback}
                            isFeedbackLoading={feedbackLoading === recipe.id}
                            isDark={isDark}
                            showDescription={true}
                          />
                        </View>
                      );
                    })}

                    {/* Refresh prompt at end of quick meals carousel */}
                    {isQuickMeals && quickMealsCurrentIndex >= section.recipes.length - 1 && section.recipes.length >= 5 && (
                      <View style={{ width: 280, marginRight: 12, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <View style={{
                          backgroundColor: isDark ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)',
                          borderRadius: 12,
                          padding: 16,
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)',
                        }}>
                          <Ionicons name="refresh-outline" size={32} color={isDark ? DarkColors.primary : Colors.primary} style={{ marginBottom: 8 }} />
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
                            Swipe to refresh and get new quick meals
                          </Text>
                          <HapticTouchableOpacity
                            onPress={() => {
                              HapticPatterns.buttonPress();
                              onRefreshQuickMeals();
                            }}
                            disabled={refreshingQuickMeals}
                            style={{
                              backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                              paddingHorizontal: 20,
                              paddingVertical: 10,
                              borderRadius: 8,
                              opacity: refreshingQuickMeals ? 0.7 : 1,
                            }}
                          >
                            {refreshingQuickMeals ? (
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

                ) : viewMode === 'grid' ? (
                  /* Grid view — 2-column layout */
                  <View className="flex-row flex-wrap" style={{ marginHorizontal: -Spacing.sm }}>
                    {section.recipes.map((recipe) => {
                      const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
                      return (
                        <View key={recipe.id} style={{ width: '50%', paddingHorizontal: Spacing.sm, marginBottom: Spacing.lg }}>
                          <RecipeCard
                            recipe={recipe}
                            variant="grid"
                            onPress={onRecipePress}
                            onLongPress={onRecipeLongPress}
                            onLike={onLike}
                            onDislike={onDislike}
                            onSave={onSave}
                            feedback={feedback}
                            isFeedbackLoading={feedbackLoading === recipe.id}
                            isDark={isDark}
                          />
                        </View>
                      );
                    })}
                  </View>

                ) : (
                  /* List view — swipeable cards with enter animation */
                  section.recipes.map((recipe, index) => {
                    const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
                    return (
                      <View key={recipe.id}>
                        <CardStack
                          onSwipeRight={() => onLike(recipe.id)}
                          onSwipeLeft={() => onDislike(recipe.id)}
                          onSwipeUp={() => onSave(recipe.id)}
                          onSwipeDown={() => onRecipePress(recipe.id)}
                        >
                          <AnimatedRecipeCard
                            index={index}
                            recipeId={recipe.id}
                            animatedIds={animatedRecipeIds}
                            onAnimated={onAnimatedRecipeId}
                            scrollY={scrollY}
                          >
                            <RecipeCard
                              recipe={recipe}
                              variant="list"
                              onPress={onRecipePress}
                              onLongPress={onRecipeLongPress}
                              onLike={onLike}
                              onDislike={onDislike}
                              onSave={onSave}
                              feedback={feedback}
                              isFeedbackLoading={feedbackLoading === recipe.id}
                              showDescription={true}
                              isDark={isDark}
                              className="mb-4"
                            />
                          </AnimatedRecipeCard>
                        </CardStack>
                      </View>
                    );
                  })
                )}

                {/* Inline pagination for "Recipes for You" */}
                {isRecipesForYou && (
                  <PaginationControls
                    currentPage={currentPage}
                    totalItems={totalRecipes}
                    itemsShown={suggestedRecipesCount}
                    paginationInfo={paginationInfo}
                    isLoading={paginationLoading}
                    onPrevPage={onPrevPage}
                    onNextPage={onNextPage}
                  />
                )}
              </Animated.View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default React.memo(RecipeSectionsGrid);
