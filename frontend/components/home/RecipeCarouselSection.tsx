// frontend/components/home/RecipeCarouselSection.tsx
// Reusable collapsible carousel section for recipe lists

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, Pressable, type ListRenderItem } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { EditorialSectionHeader } from './EditorialSectionHeader';
import { EditorialRecipeCard } from './EditorialRecipeCard';
import { Colors, DarkColors, Pastel, EditorialColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import SkeletonLoader from '../ui/SkeletonLoader';
import type { SuggestedRecipe } from '../../types';

const PASTEL_ROTATION = [Pastel.peach, Pastel.sage, Pastel.lavender, Pastel.sky, Pastel.golden, Pastel.blush];
const TITLE_ROTATION = [
  EditorialColors.pastelTitle.peach,
  EditorialColors.pastelTitle.sage,
  EditorialColors.pastelTitle.lavender,
  EditorialColors.pastelTitle.sky,
  EditorialColors.pastelTitle.golden,
  EditorialColors.pastelTitle.blush,
];
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
  scrollRef?: React.RefObject<FlatList<SuggestedRecipe> | null>;
  onScroll?: (event: any) => void;
  onMomentumScrollEnd?: (event: any) => void;
  // Slow auto-scroll (default false)
  autoScroll?: boolean;
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
  autoScroll = false,
}: RecipeCarouselSectionProps) {
  const internalScrollRef = useRef<FlatList<SuggestedRecipe>>(null);
  const activeScrollRef = (scrollRef ?? internalScrollRef) as React.RefObject<FlatList<SuggestedRecipe> | null>;

  // Auto-scroll refs
  const autoScrollIndexRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Advance one card every 4s — single scrollTo call, no rapid-fire ticks
  useEffect(() => {
    if (!autoScroll || recipes.length === 0) return;

    const CARD_STEP = CARD_WIDTH + CARD_MARGIN;
    const DWELL_MS = 5000;

    const interval = setInterval(() => {
      if (isUserScrollingRef.current) return;

      const next = autoScrollIndexRef.current + 1;

      if (next >= recipes.length) {
        autoScrollIndexRef.current = 0;
        activeScrollRef.current?.scrollToOffset({ offset: 0, animated: false });
      } else {
        autoScrollIndexRef.current = next;
        activeScrollRef.current?.scrollToOffset({ offset: next * CARD_STEP, animated: true });
      }
    }, DWELL_MS);

    return () => clearInterval(interval);
  }, [autoScroll, recipes.length]);

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
      <View className="mb-6">
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
        {/* Skeleton cards — fixed-count placeholder, no virtualization needed */}
        <View style={{ flexDirection: 'row', paddingLeft: 16, paddingRight: 16 }}>
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
        </View>
      </View>
    );
  }

  if (recipes.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      {/* Section Header — editorial styling */}
      <EditorialSectionHeader
        title={title}
        emoji={emoji}
        count={recipes.length}
        subtitle={subtitle}
        isDark={isDark}
        isCollapsed={isCollapsed}
        onToggle={onToggleCollapse}
      />

      {/* Section Content */}
      {!isCollapsed && (
        <Pressable
          onHoverIn={() => {
            isUserScrollingRef.current = true;
            if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
          }}
          onHoverOut={() => {
            resumeTimeoutRef.current = setTimeout(() => {
              isUserScrollingRef.current = false;
            }, 1000);
          }}
        >
        <RecipeCarouselFlatList
          activeScrollRef={activeScrollRef}
          recipes={recipes}
          userFeedback={userFeedback}
          feedbackLoading={feedbackLoading}
          onRecipePress={onRecipePress}
          onRecipeLongPress={onRecipeLongPress}
          onLike={onLike}
          onDislike={onDislike}
          onSave={onSave}
          isUserScrollingRef={isUserScrollingRef}
          resumeTimeoutRef={resumeTimeoutRef}
          autoScrollIndexRef={autoScrollIndexRef}
          onScroll={onScroll}
          handleMomentumScrollEnd={handleMomentumScrollEnd}
          showRefreshPrompt={showRefreshPrompt}
          onRefresh={onRefresh}
          refreshing={refreshing}
          refreshPromptText={refreshPromptText}
          isDark={isDark}
        />
        </Pressable>
      )}
    </View>
  );
}

interface RecipeCarouselFlatListProps {
  activeScrollRef: React.RefObject<FlatList<SuggestedRecipe> | null>;
  recipes: SuggestedRecipe[];
  userFeedback: Record<string, UserFeedback>;
  feedbackLoading: string | null;
  onRecipePress: (recipeId: string) => void;
  onRecipeLongPress: (recipe: SuggestedRecipe) => void;
  onLike: (recipeId: string) => void;
  onDislike: (recipeId: string) => void;
  onSave: (recipeId: string) => void;
  isUserScrollingRef: React.MutableRefObject<boolean>;
  resumeTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  autoScrollIndexRef: React.MutableRefObject<number>;
  onScroll?: (event: any) => void;
  handleMomentumScrollEnd: (event: any) => void;
  showRefreshPrompt: boolean;
  onRefresh?: () => void;
  refreshing: boolean;
  refreshPromptText: string;
  isDark: boolean;
}

function RecipeCarouselFlatList({
  activeScrollRef,
  recipes,
  userFeedback,
  feedbackLoading,
  onRecipePress,
  onRecipeLongPress,
  onLike,
  onDislike,
  onSave,
  isUserScrollingRef,
  resumeTimeoutRef,
  autoScrollIndexRef,
  onScroll,
  handleMomentumScrollEnd,
  showRefreshPrompt,
  onRefresh,
  refreshing,
  refreshPromptText,
  isDark,
}: RecipeCarouselFlatListProps) {
  const renderItem = useCallback<ListRenderItem<SuggestedRecipe>>(
    ({ item: recipe, index: i }) => {
      const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
      const isFeedbackLoading = feedbackLoading === recipe.id;
      return (
        <View style={{ width: CARD_WIDTH, marginRight: CARD_MARGIN }}>
          <EditorialRecipeCard
            recipe={recipe}
            bg={PASTEL_ROTATION[i % PASTEL_ROTATION.length]}
            titleColor={TITLE_ROTATION[i % TITLE_ROTATION.length]}
            feedback={feedback}
            isFeedbackLoading={isFeedbackLoading}
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
    if (!showRefreshPrompt || !onRefresh) return null;
    return (
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
              borderRadius: 12,
              opacity: refreshing ? 0.7 : 1,
            }}
          >
            {refreshing ? (
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
  }, [showRefreshPrompt, onRefresh, refreshing, refreshPromptText, isDark]);

  return (
    <FlatList<SuggestedRecipe>
      ref={activeScrollRef}
      horizontal
      data={recipes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListFooterComponent={ListFooter}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingLeft: 16, paddingRight: 48 }}
      decelerationRate="fast"
      snapToInterval={CARD_STEP}
      snapToAlignment="start"
      onTouchStart={() => {
        isUserScrollingRef.current = true;
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      }}
      onTouchEnd={() => {
        resumeTimeoutRef.current = setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 1500);
      }}
      onScrollBeginDrag={() => {
        isUserScrollingRef.current = true;
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      }}
      onScrollEndDrag={(e) => {
        autoScrollIndexRef.current = Math.round(e.nativeEvent.contentOffset.x / CARD_STEP);
        resumeTimeoutRef.current = setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 2000);
      }}
      onScroll={onScroll}
      scrollEventThrottle={100}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      initialNumToRender={3}
      windowSize={5}
      removeClippedSubviews
    />
  );
}

export default RecipeCarouselSection;
