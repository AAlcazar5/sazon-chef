// frontend/components/home/RecipeSectionsGrid.tsx
// Renders the contextual recipe sections with collapse/expand, grid/list/carousel views, and inline pagination

import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, FlatList, Pressable, type ListRenderItem } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import AnimatedRecipeCard from '../recipe/AnimatedRecipeCard';
import CardStack from '../ui/CardStack';
import { EditorialSectionHeader } from './EditorialSectionHeader';
import { EditorialRecipeCard } from './EditorialRecipeCard';
import { Colors, DarkColors, Pastel, EditorialColors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { HapticPatterns } from '../../constants/Haptics';
import PaginationControls from './PaginationControls';

const PASTEL_ROTATION = [Pastel.peach, Pastel.sage, Pastel.lavender, Pastel.sky, Pastel.golden, Pastel.blush];
const TITLE_ROTATION = [
  EditorialColors.pastelTitle.peach,
  EditorialColors.pastelTitle.sage,
  EditorialColors.pastelTitle.lavender,
  EditorialColors.pastelTitle.sky,
  EditorialColors.pastelTitle.golden,
  EditorialColors.pastelTitle.blush,
];

// Dark-mode rotations — opaque jewel tones (not the 12% rgba PastelDark tints,
// which would render as washed-out white over the dark screen base).
const PASTEL_ROTATION_DARK = [
  '#3A2A1F', // peach → dark terracotta
  '#1F3A2E', // sage → forest
  '#2A2A3A', // lavender → plum
  '#1F2F3A', // sky → midnight blue
  '#3A3018', // golden → dark amber
  '#3A1F28', // blush → wine
];
const TITLE_ROTATION_DARK = [
  '#FFD4A6', // peach ink
  '#A8DDA9', // sage ink
  '#D9B6E1', // lavender ink
  '#A8C7E5', // sky ink
  '#FFE08A', // golden ink
  '#F4A4BC', // blush ink
];
import type { SuggestedRecipe } from '../../types';
import type { RecipeSection, UserFeedback } from '../../utils/recipeUtils';
import type { PaginationInfo } from '../../hooks/useRecipePagination';

interface RecipeSectionsGridProps {
  sections: RecipeSection[];
  collapsedSections: Record<string, boolean>;
  onToggleSection: (key: string) => void;
  viewMode: 'grid' | 'list';
  onToggleViewMode: (mode: 'grid' | 'list') => void;
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
  // Quick meals carousel
  quickMealsScrollViewRef: React.RefObject<FlatList<SuggestedRecipe> | null>;
  quickMealsCurrentIndex: number;
  onQuickMealsIndexChange: (index: number) => void;
  refreshingQuickMeals: boolean;
  onRefreshQuickMeals: () => void;
  onQuickMealsTouchStart?: () => void;
  onQuickMealsTouchEnd?: () => void;
  onQuickMealsScrollBeginDrag?: () => void;
  onQuickMealsScrollEndDrag?: (event: any) => void;

  // Pagination (for "Recipes for You" section)
  currentPage: number;
  totalRecipes: number;
  suggestedRecipesCount: number;
  paginationInfo: PaginationInfo;
  paginationLoading: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  /** Force dark card backgrounds in light mode */
  darkFeed?: boolean;
  /** Buttons to render in the Quick Meals section header right slot */
  quickMealsHeaderRight?: React.ReactNode;
}

function RecipeSectionsGrid({
  sections,
  collapsedSections,
  onToggleSection,
  viewMode,
  onToggleViewMode,
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
  quickMealsScrollViewRef,
  quickMealsCurrentIndex,
  onQuickMealsIndexChange,
  refreshingQuickMeals,
  onRefreshQuickMeals,
  onQuickMealsTouchStart,
  onQuickMealsTouchEnd,
  onQuickMealsScrollBeginDrag,
  onQuickMealsScrollEndDrag,
  currentPage,
  totalRecipes,
  suggestedRecipesCount,
  paginationInfo,
  paginationLoading,
  onPrevPage,
  onNextPage,
  darkFeed = false,
  quickMealsHeaderRight,
}: RecipeSectionsGridProps) {
  const filtered = sections.filter(s => s.key !== 'perfect-match' && s.key !== 'meal-prep' && s.key !== 'macro-optimized');
  if (filtered.length === 0) return null;
  // Theme-aware card rotations — light pastels in light mode read as
  // washed-out white in dark mode, so swap to opaque jewel tones at runtime.
  const cardBgRotation = isDark ? PASTEL_ROTATION_DARK : PASTEL_ROTATION;
  const cardTitleRotation = isDark ? TITLE_ROTATION_DARK : TITLE_ROTATION;

  return (
    // mt-6 separates the contextual recipe rails from the editorial
    // discovery cards above (PairingDiscoveryCard / StretchHomeCard /
    // PlateOfWeekCard) — without it the section header sat flush against
    // the previous card with only 8px of card-margin.
    <View className="px-4 mt-6">
      {filtered.map((section) => {
        const isCollapsed = collapsedSections[section.key];
        const isQuickMeals = section.key === 'quick-meals';
        const isMealPrep = section.key === 'meal-prep';
        const isMacroOptimized = section.key === 'macro-optimized';
        const isRecipesForYou = section.key === 'quick-easy';

        return (
          <View key={section.key} className="mb-6">
            {/* Section Header — editorial styling */}
            <EditorialSectionHeader
              title={section.title}
              emoji={section.emoji}
              count={section.recipes.length}
              isDark={isDark}
              isCollapsed={isCollapsed}
              onToggle={() => onToggleSection(section.key)}
              rightSlot={
                isQuickMeals && quickMealsHeaderRight ? quickMealsHeaderRight :
                isRecipesForYou ? (
                  <View
                    className="flex-row items-center rounded-lg p-1"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
                  >
                    {(['list', 'grid'] as const).map((mode) => (
                      <HapticTouchableOpacity
                        key={mode}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          onToggleViewMode(mode);
                        }}
                        className="px-2.5 py-1 rounded"
                        style={
                          viewMode === mode
                            ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary }
                            : undefined
                        }
                      >
                        <Ionicons
                          name={mode as any}
                          size={16}
                          color={viewMode === mode ? '#FFF' : (isDark ? '#9CA3AF' : '#6B7280')}
                        />
                      </HapticTouchableOpacity>
                    ))}
                  </View>
                ) : null
              }
            />

            {/* Section Content */}
            {!isCollapsed && section.recipes.length === 0 && (
              <View className="items-center py-6 px-4">
                <Text className="text-3xl mb-2">{section.emoji}</Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  No recipes matched yet — check back soon!
                </Text>
              </View>
            )}
            {!isCollapsed && section.recipes.length > 0 && (
              <View>
                {isQuickMeals || isMealPrep || isMacroOptimized ? (
                  /* Carousel view for Quick Meals / Meal Prep */
                  <Pressable
                    onHoverIn={isQuickMeals ? onQuickMealsTouchStart : undefined}
                    onHoverOut={isQuickMeals ? onQuickMealsTouchEnd : undefined}
                  >
                  <QuickMealsCarouselFlatList
                    listRef={isQuickMeals ? quickMealsScrollViewRef : null}
                    recipes={section.recipes}
                    cardBgRotation={cardBgRotation}
                    cardTitleRotation={cardTitleRotation}
                    userFeedback={userFeedback}
                    feedbackLoading={feedbackLoading}
                    onRecipePress={onRecipePress}
                    onRecipeLongPress={onRecipeLongPress}
                    onLike={onLike}
                    onDislike={onDislike}
                    onSave={onSave}
                    isQuickMeals={isQuickMeals}
                    onQuickMealsTouchStart={onQuickMealsTouchStart}
                    onQuickMealsTouchEnd={onQuickMealsTouchEnd}
                    onQuickMealsScrollBeginDrag={onQuickMealsScrollBeginDrag}
                    onQuickMealsScrollEndDrag={onQuickMealsScrollEndDrag}
                    onQuickMealsIndexChange={onQuickMealsIndexChange}
                    quickMealsCurrentIndex={quickMealsCurrentIndex}
                    refreshingQuickMeals={refreshingQuickMeals}
                    onRefreshQuickMeals={onRefreshQuickMeals}
                    isDark={isDark}
                  />
                  </Pressable>

                ) : viewMode === 'grid' ? (
                  /* Grid view — 2-column layout */
                  <View className="flex-row flex-wrap" style={{ marginHorizontal: -Spacing.sm }}>
                    {section.recipes.map((recipe, i) => {
                      const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
                      return (
                        <View key={recipe.id} style={{ width: '50%', paddingHorizontal: Spacing.sm, marginBottom: Spacing.lg }}>
                          <EditorialRecipeCard
                            recipe={recipe}
                            bg={cardBgRotation[i % cardBgRotation.length]}
                            titleColor={cardTitleRotation[i % cardTitleRotation.length]}
                            feedback={feedback}
                            isFeedbackLoading={feedbackLoading === recipe.id}
                            onPress={onRecipePress}
                            onLongPress={onRecipeLongPress}
                            onLike={onLike}
                            onDislike={onDislike}
                            onSave={onSave}
                            showDescription={false}
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
                      <View key={recipe.id} style={{ marginBottom: Spacing.lg }}>
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
                          >
                            <EditorialRecipeCard
                              recipe={recipe}
                              bg={cardBgRotation[index % cardBgRotation.length]}
                              titleColor={cardTitleRotation[index % cardTitleRotation.length]}
                              feedback={feedback}
                              isFeedbackLoading={feedbackLoading === recipe.id}
                              onPress={onRecipePress}
                              onLongPress={onRecipeLongPress}
                              onLike={onLike}
                              onDislike={onDislike}
                              onSave={onSave}
                              showDescription
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
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

interface QuickMealsCarouselFlatListProps {
  listRef: React.RefObject<FlatList<SuggestedRecipe> | null> | null;
  recipes: SuggestedRecipe[];
  cardBgRotation: string[];
  cardTitleRotation: string[];
  userFeedback: Record<string, { liked: boolean; disliked: boolean }>;
  feedbackLoading: string | null;
  onRecipePress: (recipeId: string) => void;
  onRecipeLongPress: (recipe: SuggestedRecipe) => void;
  onLike: (recipeId: string) => void;
  onDislike: (recipeId: string) => void;
  onSave: (recipeId: string) => void;
  isQuickMeals: boolean;
  onQuickMealsTouchStart?: () => void;
  onQuickMealsTouchEnd?: () => void;
  onQuickMealsScrollBeginDrag?: () => void;
  onQuickMealsScrollEndDrag?: (event: any) => void;
  onQuickMealsIndexChange: (index: number) => void;
  quickMealsCurrentIndex: number;
  refreshingQuickMeals: boolean;
  onRefreshQuickMeals: () => void;
  isDark: boolean;
}

function QuickMealsCarouselFlatList({
  listRef,
  recipes,
  cardBgRotation,
  cardTitleRotation,
  userFeedback,
  feedbackLoading,
  onRecipePress,
  onRecipeLongPress,
  onLike,
  onDislike,
  onSave,
  isQuickMeals,
  onQuickMealsTouchStart,
  onQuickMealsTouchEnd,
  onQuickMealsScrollBeginDrag,
  onQuickMealsScrollEndDrag,
  onQuickMealsIndexChange,
  quickMealsCurrentIndex,
  refreshingQuickMeals,
  onRefreshQuickMeals,
  isDark,
}: QuickMealsCarouselFlatListProps) {
  const renderItem = useCallback<ListRenderItem<SuggestedRecipe>>(
    ({ item: recipe, index: i }) => {
      const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
      return (
        <View style={{ width: 280, marginRight: 12 }}>
          <EditorialRecipeCard
            recipe={recipe}
            bg={cardBgRotation[i % cardBgRotation.length]}
            titleColor={cardTitleRotation[i % cardTitleRotation.length]}
            feedback={feedback}
            isFeedbackLoading={feedbackLoading === recipe.id}
            onPress={onRecipePress}
            onLongPress={onRecipeLongPress}
            onLike={onLike}
            onDislike={onDislike}
            onSave={onSave}
            showDescription
          />
        </View>
      );
    },
    [
      cardBgRotation,
      cardTitleRotation,
      userFeedback,
      feedbackLoading,
      onRecipePress,
      onRecipeLongPress,
      onLike,
      onDislike,
      onSave,
    ],
  );

  const keyExtractor = useCallback((r: SuggestedRecipe) => r.id, []);

  const ListFooter = useMemo(() => {
    if (!isQuickMeals || quickMealsCurrentIndex < recipes.length - 1 || recipes.length < 5) return null;
    return (
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
            fontFamily: 'PlusJakartaSans_600SemiBold',
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
              borderRadius: 12,
              opacity: refreshingQuickMeals ? 0.7 : 1,
            }}
          >
            {refreshingQuickMeals ? (
              <AnimatedActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 }}>
                Refresh Recipes
              </Text>
            )}
          </HapticTouchableOpacity>
        </View>
      </View>
    );
  }, [isQuickMeals, quickMealsCurrentIndex, recipes.length, refreshingQuickMeals, onRefreshQuickMeals, isDark]);

  return (
    <FlatList<SuggestedRecipe>
      ref={listRef ?? undefined}
      horizontal
      data={recipes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListFooterComponent={ListFooter}
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -16 }}
      contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}
      decelerationRate="fast"
      snapToInterval={280}
      snapToAlignment="start"
      onTouchStart={isQuickMeals ? onQuickMealsTouchStart : undefined}
      onTouchEnd={isQuickMeals ? onQuickMealsTouchEnd : undefined}
      onScrollBeginDrag={isQuickMeals ? onQuickMealsScrollBeginDrag : undefined}
      onScrollEndDrag={isQuickMeals ? onQuickMealsScrollEndDrag : undefined}
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
      initialNumToRender={3}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

export default React.memo(RecipeSectionsGrid);
