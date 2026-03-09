// frontend/components/home/ParallaxHeroSection.tsx
// Full-bleed parallax hero for Recipe of the Day at the top of the home feed.
// The background image scrolls at ~40% of the scroll speed, creating depth.

import React from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import type { SuggestedRecipe } from '../../types';
import type { UserFeedback } from '../../utils/recipeUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Visible height of the hero section */
const HERO_HEIGHT = 300;
/** Extra image height to allow parallax travel without revealing edges */
const PARALLAX_OVERFLOW = 70;

interface ParallaxHeroSectionProps {
  /** Featured recipe */
  recipe: SuggestedRecipe;
  /** Shared scroll position from the parent ScrollView */
  scrollY: Animated.Value;
  /** User feedback state (liked / disliked) */
  feedback: UserFeedback;
  /** Whether feedback is being submitted */
  isFeedbackLoading: boolean;
  /** Dark mode flag */
  isDark: boolean;
  /** Navigate to recipe detail */
  onPress: (recipeId: string) => void;
  /** Open action menu */
  onLongPress?: (recipe: SuggestedRecipe) => void;
  /** Like the recipe */
  onLike: (recipeId: string) => void;
  /** Save to collection */
  onSave: (recipeId: string) => void;
}

function ParallaxHeroSection({
  recipe,
  scrollY,
  feedback,
  isFeedbackLoading,
  isDark,
  onPress,
  onLongPress,
  onLike,
  onSave,
}: ParallaxHeroSectionProps) {
  // Image translates upward at 40% of scroll speed (parallax depth)
  const imageTranslate = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, -(PARALLAX_OVERFLOW * 0.6)],
    extrapolate: 'clamp',
  });

  const hasImage = !!recipe.imageUrl;

  return (
    <HapticTouchableOpacity
      onPress={() => onPress(recipe.id)}
      onLongPress={onLongPress ? () => onLongPress(recipe) : undefined}
      activeOpacity={0.95}
    >
      {/* Clipping container — content outside is hidden */}
      <View
        style={{
          height: HERO_HEIGHT,
          width: SCREEN_WIDTH,
          overflow: 'hidden',
        }}
      >
        {/* Parallax image / fallback gradient */}
        {hasImage ? (
          <Animated.Image
            source={{ uri: recipe.imageUrl }}
            style={{
              position: 'absolute',
              top: -(PARALLAX_OVERFLOW / 2),
              left: 0,
              width: SCREEN_WIDTH,
              height: HERO_HEIGHT + PARALLAX_OVERFLOW,
              transform: [{ translateY: imageTranslate }],
            }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={isDark ? ['#1f2937', '#374151'] : [Colors.primaryDark, Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}

        {/* Dark scrim so text is legible over any image */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.75)']}
          locations={[0, 0.45, 1]}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: HERO_HEIGHT * 0.7,
          }}
        />

        {/* Top badge */}
        <View
          style={{
            position: 'absolute',
            top: 14,
            left: 16,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.35)',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
          }}
        >
          <Text style={{ fontSize: 12 }}>🌟</Text>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: '700',
              marginLeft: 4,
              letterSpacing: 0.5,
            }}
          >
            RECIPE OF THE DAY
          </Text>
        </View>

        {/* Bottom content overlay */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingBottom: 16,
          }}
        >
          {/* Recipe title */}
          <Text
            numberOfLines={2}
            style={{
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: '800',
              lineHeight: 28,
              marginBottom: 6,
              textShadowColor: 'rgba(0,0,0,0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {recipe.title}
          </Text>

          {/* Metadata row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 }}>
            {!!recipe.cookTime && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' }}>
                  {recipe.cookTime} min
                </Text>
              </View>
            )}
            {!!recipe.calories && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="flame-outline" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' }}>
                  {recipe.calories} cal
                </Text>
              </View>
            )}
            {!!recipe.healthGrade && (
              <View
                style={{
                  backgroundColor: recipe.healthGrade === 'A' ? '#22c55e' : recipe.healthGrade === 'B' ? '#84cc16' : 'rgba(255,255,255,0.3)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                  Grade {recipe.healthGrade}
                </Text>
              </View>
            )}
          </View>

          {/* Action row */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <HapticTouchableOpacity
              onPress={() => onLike(recipe.id)}
              disabled={isFeedbackLoading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: feedback.liked
                  ? 'rgba(239,68,68,0.9)'
                  : 'rgba(255,255,255,0.22)',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Ionicons
                name={feedback.liked ? 'heart' : 'heart-outline'}
                size={15}
                color="#FFFFFF"
              />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
                {feedback.liked ? 'Liked' : 'Like'}
              </Text>
            </HapticTouchableOpacity>

            <HapticTouchableOpacity
              onPress={() => onSave(recipe.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: 'rgba(255,255,255,0.22)',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Ionicons name="bookmark-outline" size={15} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Save</Text>
            </HapticTouchableOpacity>

            <View style={{ flex: 1 }} />

            <HapticTouchableOpacity
              onPress={() => onPress(recipe.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: Colors.primary,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>View Recipe</Text>
              <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </HapticTouchableOpacity>
  );
}

export default React.memo(ParallaxHeroSection);
