import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

import { EditorialFontFamily } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';
import { HapticPatterns } from '../../constants/Haptics';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import SmartBadges from '../recipe/SmartBadges';
import type { SuggestedRecipe } from '../../types';

interface EditorialRecipeCardProps {
  recipe: SuggestedRecipe;
  bg: string;
  titleColor: string;
  feedback?: { liked: boolean; disliked: boolean };
  isFeedbackLoading?: boolean;
  onPress: (id: string) => void;
  onLongPress?: (recipe: SuggestedRecipe) => void;
  onLike?: (id: string) => void;
  onDislike?: (id: string) => void;
  onSave?: (id: string) => void;
  /** Show the description body. Defaults to true. */
  showDescription?: boolean;
  /** Optional content rendered between the action row and the bottom of the card */
  footer?: React.ReactNode;
}

const PHOTO_SIZE = 132;

export function EditorialRecipeCard({
  recipe,
  bg,
  titleColor,
  feedback = { liked: false, disliked: false },
  isFeedbackLoading = false,
  onPress,
  onLongPress,
  onLike,
  onDislike,
  onSave,
  showDescription = true,
  footer,
}: EditorialRecipeCardProps) {
  const shadowStyle =
    Platform.OS === 'ios' ? EditorialShadows.cardRaised.ios : EditorialShadows.cardRaised.android;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  // Translucent strip + action buttons over jewel-dark cards use ivory-on-cocoa instead of white-on-pastel
  const macroRowBg = isDark ? 'rgba(245,239,230,0.08)' : 'rgba(255,255,255,0.55)';
  const actionBtnBg = isDark ? 'rgba(245,239,230,0.10)' : 'rgba(255,255,255,0.7)';
  const actionBtnActiveBg = isDark ? 'rgba(245,239,230,0.18)' : '#FFFFFF';
  // Macro text colors are theme-aware so they stay legible against either pastel.
  const macroValueColor = isDark ? '#F5EFE6' : '#374151';
  const macroLabelColor = isDark ? 'rgba(245,239,230,0.6)' : '#9CA3AF';
  const metaColor = isDark ? 'rgba(245,239,230,0.7)' : '#6B7280';
  const descColor = isDark ? 'rgba(245,239,230,0.78)' : '#4B5563';

  const matchScore = recipe.score?.matchPercentage ?? 0;
  const cookTime = recipe.cookTime ?? 0;
  const calories = recipe.calories ?? 0;

  const handleSave = () => {
    HapticPatterns.buttonPress();
    onSave?.(recipe.id);
  };
  const handleLike = () => {
    if (isFeedbackLoading) return;
    HapticPatterns.buttonPress();
    onLike?.(recipe.id);
  };
  const handleDislike = () => {
    if (isFeedbackLoading) return;
    HapticPatterns.buttonPress();
    onDislike?.(recipe.id);
  };

  return (
    <Pressable
      onPress={() => onPress(recipe.id)}
      onLongPress={() => onLongPress?.(recipe)}
      delayLongPress={500}
      style={[styles.container, { backgroundColor: bg }, shadowStyle]}
      accessibilityLabel={recipe.title}
      accessibilityRole="button"
    >
      {/* Circular photo */}
      <View style={styles.photoContainer}>
        {recipe.imageUrl ? (
          <Image
            source={{ uri: recipe.imageUrl }}
            style={styles.photo}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.photo,
              styles.photoPlaceholder,
              { backgroundColor: isDark ? 'rgba(245,239,230,0.10)' : 'rgba(255,255,255,0.5)' },
            ]}
          >
            <Ionicons name="restaurant-outline" size={32} color={isDark ? 'rgba(245,239,230,0.55)' : '#9CA3AF'} />
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
        {recipe.title}
      </Text>

      {/* Meta strip: time · match */}
      <Text style={[styles.meta, { color: metaColor }]} numberOfLines={1}>
        {cookTime} min · {matchScore}% match
      </Text>

      {/* Macro strip — calories + protein/carbs/fat/fiber */}
      <View style={[styles.macroRow, { backgroundColor: macroRowBg }]}>
        <View style={styles.macroCell}>
          <Text style={[styles.macroValue, { color: macroValueColor }]}>{calories}</Text>
          <Text style={[styles.macroLabel, { color: macroLabelColor }]}>cal</Text>
        </View>
        <View style={styles.macroCell}>
          <Text style={[styles.macroValue, styles.macroProtein]}>{recipe.protein ?? 0}g</Text>
          <Text style={[styles.macroLabel, { color: macroLabelColor }]}>pro</Text>
        </View>
        <View style={styles.macroCell}>
          <Text style={[styles.macroValue, styles.macroCarbs]}>{recipe.carbs ?? 0}g</Text>
          <Text style={[styles.macroLabel, { color: macroLabelColor }]}>carb</Text>
        </View>
        <View style={styles.macroCell}>
          <Text style={[styles.macroValue, styles.macroFat]}>{recipe.fat ?? 0}g</Text>
          <Text style={[styles.macroLabel, { color: macroLabelColor }]}>fat</Text>
        </View>
        {!!recipe.fiber && (
          <View style={styles.macroCell}>
            <Text style={[styles.macroValue, styles.macroFiber]}>{recipe.fiber}g</Text>
            <Text style={[styles.macroLabel, { color: macroLabelColor }]}>fib</Text>
          </View>
        )}
      </View>

      {/* Description */}
      {showDescription && recipe.description ? (
        <Text style={[styles.description, { color: descColor }]} numberOfLines={2}>
          {recipe.description}
        </Text>
      ) : null}

      {/* Smart badges (allergy, dietary, prep, etc.) */}
      <View style={styles.badgesRow}>
        <SmartBadges recipe={recipe as any} maxVisible={3} />
      </View>

      {/* Action row: bookmark left, like/dislike right */}
      <View style={styles.actions}>
        <HapticTouchableOpacity
          onPress={handleSave}
          style={[styles.actionButton, { backgroundColor: actionBtnBg }]}
          accessibilityLabel="Save to cookbook"
        >
          <Ionicons name="bookmark-outline" size={16} color="#6B7280" />
        </HapticTouchableOpacity>

        <View style={styles.actionsRight}>
          {onDislike && (
            <HapticTouchableOpacity
              onPress={handleDislike}
              style={[styles.actionButton, { backgroundColor: feedback.disliked ? actionBtnActiveBg : actionBtnBg }]}
              accessibilityLabel="Not for me"
            >
              <Ionicons
                name={feedback.disliked ? 'thumbs-down' : 'thumbs-down-outline'}
                size={16}
                color={feedback.disliked ? '#EF4444' : '#6B7280'}
              />
            </HapticTouchableOpacity>
          )}
          {onLike && (
            <HapticTouchableOpacity
              onPress={handleLike}
              style={[styles.actionButton, { backgroundColor: feedback.liked ? actionBtnActiveBg : actionBtnBg }]}
              accessibilityLabel="Love it"
            >
              <Ionicons
                name={feedback.liked ? 'heart' : 'heart-outline'}
                size={16}
                color={feedback.liked ? '#EF4444' : '#6B7280'}
              />
            </HapticTouchableOpacity>
          )}
        </View>
      </View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 9999,
  },
  photoPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 6,
    // Reserve 2 lines of vertical space so 1-line titles don't make a shorter
    // card than 2-line titles in the same horizontal carousel.
    minHeight: 44,
  },
  meta: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  macroCell: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 12,
    color: '#374151',
  },
  macroLabel: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 9,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  macroProtein: { color: '#2563EB' },
  macroCarbs: { color: '#059669' },
  macroFat: { color: '#7C3AED' },
  macroFiber: { color: '#10B981' },
  description: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 12,
    lineHeight: 17,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 4,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    alignSelf: 'stretch',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
