// Skeleton Variants for Sazon Chef app
// Pre-built skeleton loaders for common UI patterns

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useColorScheme } from 'nativewind';
import SkeletonLoader from './SkeletonLoader';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { Colors, DarkColors } from '../../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Recipe Card Skeleton - for recipe feed lists
 */
export function RecipeCardSkeleton() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.recipeCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
      {/* Image */}
      <SkeletonLoader height={180} borderRadius={BorderRadius.lg} />

      {/* Content */}
      <View style={styles.recipeCardContent}>
        {/* Title */}
        <SkeletonLoader width="80%" height={24} borderRadius={BorderRadius.sm} />

        {/* Badges */}
        <View style={styles.badgeRow}>
          <SkeletonLoader width={60} height={24} borderRadius={BorderRadius.full} />
          <SkeletonLoader width={80} height={24} borderRadius={BorderRadius.full} />
          <SkeletonLoader width={50} height={24} borderRadius={BorderRadius.full} />
        </View>

        {/* Meta info */}
        <View style={styles.metaRow}>
          <SkeletonLoader width={80} height={16} borderRadius={BorderRadius.xs} />
          <SkeletonLoader width={60} height={16} borderRadius={BorderRadius.xs} />
        </View>

        {/* Macros */}
        <View style={styles.macroRow}>
          <SkeletonLoader width={50} height={32} borderRadius={BorderRadius.sm} />
          <SkeletonLoader width={50} height={32} borderRadius={BorderRadius.sm} />
          <SkeletonLoader width={50} height={32} borderRadius={BorderRadius.sm} />
          <SkeletonLoader width={50} height={32} borderRadius={BorderRadius.sm} />
        </View>
      </View>
    </View>
  );
}

/**
 * Recipe Feed Skeleton - multiple recipe cards
 */
export function RecipeFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.feedContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <RecipeCardSkeleton key={index} />
      ))}
    </View>
  );
}

/**
 * Compact Recipe Card Skeleton - for horizontal lists
 */
export function CompactRecipeCardSkeleton() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.compactCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
      <SkeletonLoader width={100} height={100} borderRadius={BorderRadius.md} />
      <View style={styles.compactContent}>
        <SkeletonLoader width="80%" height={18} borderRadius={BorderRadius.xs} />
        <SkeletonLoader width="60%" height={14} borderRadius={BorderRadius.xs} style={{ marginTop: 8 }} />
        <SkeletonLoader width={60} height={20} borderRadius={BorderRadius.full} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/**
 * Meal Plan Day Skeleton - for meal plan screen
 */
export function MealPlanDaySkeleton() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.mealPlanDay, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
      {/* Header */}
      <View style={styles.mealPlanHeader}>
        <SkeletonLoader width={100} height={20} borderRadius={BorderRadius.xs} />
        <SkeletonLoader width={80} height={16} borderRadius={BorderRadius.xs} />
      </View>

      {/* Meals */}
      {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((_, index) => (
        <View key={index} style={styles.mealItem}>
          <SkeletonLoader width={60} height={60} borderRadius={BorderRadius.md} />
          <View style={styles.mealContent}>
            <SkeletonLoader width="70%" height={16} borderRadius={BorderRadius.xs} />
            <SkeletonLoader width="50%" height={12} borderRadius={BorderRadius.xs} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}

      {/* Macro Summary */}
      <View style={styles.macroSummary}>
        <SkeletonLoader width="100%" height={8} borderRadius={BorderRadius.full} />
        <View style={styles.macroLabels}>
          <SkeletonLoader width={60} height={14} borderRadius={BorderRadius.xs} />
          <SkeletonLoader width={60} height={14} borderRadius={BorderRadius.xs} />
          <SkeletonLoader width={60} height={14} borderRadius={BorderRadius.xs} />
          <SkeletonLoader width={60} height={14} borderRadius={BorderRadius.xs} />
        </View>
      </View>
    </View>
  );
}

/**
 * Meal Plan Skeleton - full week view
 */
export function MealPlanSkeleton() {
  return (
    <View style={styles.mealPlanContainer}>
      {/* Week selector */}
      <View style={styles.weekSelector}>
        <SkeletonLoader width={24} height={24} borderRadius={BorderRadius.full} />
        <SkeletonLoader width={150} height={20} borderRadius={BorderRadius.xs} />
        <SkeletonLoader width={24} height={24} borderRadius={BorderRadius.full} />
      </View>

      {/* Day tabs */}
      <View style={styles.dayTabs}>
        {Array.from({ length: 7 }).map((_, index) => (
          <SkeletonLoader key={index} width={40} height={50} borderRadius={BorderRadius.md} />
        ))}
      </View>

      {/* Day content */}
      <MealPlanDaySkeleton />
    </View>
  );
}

/**
 * Shopping List Skeleton
 */
export function ShoppingListSkeleton() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.shoppingListContainer}>
      {/* List header */}
      <View style={[styles.listHeader, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
        <SkeletonLoader width="60%" height={24} borderRadius={BorderRadius.xs} />
        <SkeletonLoader width={80} height={16} borderRadius={BorderRadius.xs} />
      </View>

      {/* Progress bar */}
      <SkeletonLoader width="100%" height={8} borderRadius={BorderRadius.full} style={{ marginVertical: 16 }} />

      {/* Items by category */}
      {['Produce', 'Dairy', 'Proteins'].map((_, categoryIndex) => (
        <View key={categoryIndex} style={styles.categorySection}>
          <SkeletonLoader width={100} height={18} borderRadius={BorderRadius.xs} />
          {Array.from({ length: 3 }).map((_, itemIndex) => (
            <View key={itemIndex} style={styles.shoppingItem}>
              <SkeletonLoader width={24} height={24} borderRadius={BorderRadius.sm} />
              <SkeletonLoader width="60%" height={16} borderRadius={BorderRadius.xs} />
              <SkeletonLoader width={40} height={16} borderRadius={BorderRadius.xs} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Profile Section Skeleton
 */
export function ProfileSectionSkeleton() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.profileSection, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
      <SkeletonLoader width="40%" height={18} borderRadius={BorderRadius.xs} />
      <View style={styles.profileItems}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.profileItem}>
            <SkeletonLoader width={24} height={24} borderRadius={BorderRadius.sm} />
            <SkeletonLoader width="70%" height={16} borderRadius={BorderRadius.xs} />
            <SkeletonLoader width={20} height={20} borderRadius={BorderRadius.sm} />
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Collection Grid Skeleton - for cookbook collections
 */
export function CollectionGridSkeleton({ count = 4 }: { count?: number }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const cardWidth = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

  return (
    <View style={styles.collectionGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.collectionCard, { width: cardWidth, backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <SkeletonLoader height={100} borderRadius={BorderRadius.md} />
          <View style={styles.collectionContent}>
            <SkeletonLoader width="80%" height={16} borderRadius={BorderRadius.xs} />
            <SkeletonLoader width="50%" height={12} borderRadius={BorderRadius.xs} style={{ marginTop: 6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Search Results Skeleton
 */
export function SearchResultsSkeleton() {
  return (
    <View style={styles.searchResults}>
      {/* Search bar placeholder */}
      <SkeletonLoader width="100%" height={44} borderRadius={BorderRadius.lg} style={{ marginBottom: 16 }} />

      {/* Results */}
      <RecipeFeedSkeleton count={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Recipe Card
  recipeCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeCardContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },

  // Feed
  feedContainer: {
    padding: Spacing.lg,
  },

  // Compact Card
  compactCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginRight: Spacing.md,
    width: 220,
  },
  compactContent: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },

  // Meal Plan
  mealPlanContainer: {
    padding: Spacing.lg,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  dayTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  mealPlanDay: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  mealPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  mealContent: {
    flex: 1,
  },
  macroSummary: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  macroLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Shopping List
  shoppingListContainer: {
    padding: Spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  categorySection: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  // Profile
  profileSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  profileItems: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },

  // Collection Grid
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  collectionCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  collectionContent: {
    padding: Spacing.md,
  },

  // Search Results
  searchResults: {
    padding: Spacing.lg,
  },
});
