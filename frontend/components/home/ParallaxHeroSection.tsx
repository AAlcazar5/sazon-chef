// frontend/components/home/ParallaxHeroSection.tsx
// Full-bleed parallax hero for Recipe of the Day at the top of the home feed.
// The background image scrolls at ~40% of the scroll speed, creating depth.

import React from 'react';
import { View, Text, Animated, Dimensions, Linking } from 'react-native';
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
  /** Dislike the recipe */
  onDislike: (recipeId: string) => void;
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
  onDislike,
  onSave,
}: ParallaxHeroSectionProps) {
  // Image translates upward at 40% of scroll speed (parallax depth)
  const imageTranslate = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, -(PARALLAX_OVERFLOW * 0.6)],
    extrapolate: 'clamp',
  });

  const hasImage = !!recipe.imageUrl;
  const matchPct = recipe.score?.matchPercentage;
  const grade = recipe.healthGrade || recipe.score?.healthGrade;

  // Unsplash attribution
  const photographerName = (recipe as any).unsplashPhotographerName as string | undefined;
  const photographerUsername = (recipe as any).unsplashPhotographerUsername as string | undefined;

  return (
    <HapticTouchableOpacity
      onPress={() => onPress(recipe.id)}
      onLongPress={onLongPress ? () => onLongPress(recipe) : undefined}
      activeOpacity={0.95}
    >
      {/* Clipping container — rounded bottom for smooth blend into content */}
      <View
        style={{
          height: HERO_HEIGHT,
          width: SCREEN_WIDTH,
          overflow: 'hidden',
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          marginBottom: 4,
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

        {/* Top row: "Recipe of the Day" badge left */}
        <View
          style={{
            position: 'absolute',
            top: 14,
            left: 16,
          }}
        >
          <View
            style={{
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
        </View>

        {/* Match percentage badge — top right corner */}
        {matchPct !== undefined && matchPct > 0 && (
          <View style={{ position: 'absolute', top: 14, right: 16 }}>
            <View
              style={{
                backgroundColor: matchPct >= 80
                  ? Colors.tertiaryGreen
                  : matchPct >= 60
                    ? Colors.primary
                    : Colors.secondaryRed,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {Math.round(matchPct)}%
              </Text>
            </View>
          </View>
        )}

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
          {/* Cuisine label */}
          {!!recipe.cuisine && (
            <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 3, textTransform: 'uppercase' }}>
              {recipe.cuisine}
            </Text>
          )}

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

          {/* Metadata row: cook time + health grade */}
          {(!!recipe.cookTime || !!grade) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
              {!!recipe.cookTime && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.85)" />
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600' }}>
                    {recipe.cookTime} min
                  </Text>
                </View>
              )}
              {!!grade && (
                <View
                  style={{
                    backgroundColor: grade === 'A' ? '#22c55e' : grade === 'B' ? '#84cc16' : 'rgba(255,255,255,0.3)',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                    Grade {grade}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Macros row — evenly spaced across full card width */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            {[
              { value: recipe.calories, label: `${recipe.calories} cal`, bg: 'rgba(255,255,255,0.18)' },
              { value: recipe.protein, label: `${recipe.protein}g P`, bg: 'rgba(59,130,246,0.50)' },
              { value: recipe.carbs, label: `${recipe.carbs}g C`, bg: `${Colors.tertiaryGreen}70` },
              { value: recipe.fat, label: `${recipe.fat}g F`, bg: 'rgba(168,85,247,0.50)' },
              { value: recipe.fiber, label: `${recipe.fiber}g Fi`, bg: 'rgba(16,185,129,0.50)' },
            ].filter(({ value }) => !!value).map(({ label, bg }) => (
              <View key={label} style={{ flex: 1, marginHorizontal: 2, backgroundColor: bg, paddingVertical: 3, borderRadius: 999, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Action row — save left, like/dislike right */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <HapticTouchableOpacity
              onPress={() => onSave(recipe.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.20)',
              }}
            >
              <Ionicons name="bookmark-outline" size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Save</Text>
            </HapticTouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <HapticTouchableOpacity
                onPress={() => onLike(recipe.id)}
                disabled={isFeedbackLoading}
                style={{
                  padding: 7,
                  borderRadius: 999,
                  backgroundColor: feedback.liked ? Colors.tertiaryGreen : 'rgba(255,255,255,0.20)',
                }}
              >
                <Ionicons
                  name={feedback.liked ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={14}
                  color="#FFFFFF"
                />
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => onDislike(recipe.id)}
                disabled={isFeedbackLoading}
                style={{
                  padding: 7,
                  borderRadius: 999,
                  backgroundColor: feedback.disliked ? Colors.secondaryRed : 'rgba(255,255,255,0.20)',
                }}
              >
                <Ionicons
                  name={feedback.disliked ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={14}
                  color="#FFFFFF"
                />
              </HapticTouchableOpacity>
            </View>
          </View>

          {/* Unsplash attribution — bottom right */}
          {!!photographerName && !!photographerUsername && (
            <HapticTouchableOpacity
              onPress={() => Linking.openURL(`https://unsplash.com/@${photographerUsername}?utm_source=Sazon%20Chef&utm_medium=referral`)}
              style={{ alignSelf: 'flex-end', marginTop: 6 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9 }}>
                Photo by {photographerName} on Unsplash
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>
      </View>
    </HapticTouchableOpacity>
  );
}

export default React.memo(ParallaxHeroSection);
