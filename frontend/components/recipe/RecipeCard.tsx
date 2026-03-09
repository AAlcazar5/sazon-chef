import React from 'react';
import { Linking, View, Text, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { SuggestedRecipe } from '../../types';
import { Colors, DarkColors } from '../../constants/Colors';
import { Duration } from '../../constants/Animations';
import { Shadows } from '../../constants/Shadows';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import SmartBadges from './SmartBadges';
import { recipeCardAccessibility, iconButtonAccessibility } from '../../utils/accessibility';

interface RecipeCardProps {
  recipe: SuggestedRecipe;
  variant?: 'featured' | 'grid' | 'list' | 'carousel';
  onPress?: (recipeId: string) => void;
  onLongPress?: (recipe: SuggestedRecipe) => void;
  onLike?: (recipeId: string) => void;
  onDislike?: (recipeId: string) => void;
  onSave?: (recipeId: string) => void;
  onDelete?: (recipeId: string) => void;
  feedback?: { liked: boolean; disliked: boolean };
  isFeedbackLoading?: boolean;
  showDescription?: boolean;
  imageHeight?: number;
  cardHeight?: number;
  className?: string;
  style?: any;
  isDark?: boolean;
  // Optional props for badges
  showTopMatchBadge?: boolean;
  recommendationReason?: string;
  showSwipeIndicators?: boolean;
  swipeIndicatorCount?: number;
  swipeIndicatorIndex?: number;
  /** Optional footer rendered inside the card, between content and action buttons */
  footer?: React.ReactNode;
}

import { optimizedImageUrl } from '../../utils/imageUtils';

// Helper to truncate description
const truncateDescription = (text: string | undefined, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

const RecipeCardComponent: React.FC<RecipeCardProps> = ({
  recipe,
  variant = 'list',
  onPress,
  onLongPress,
  onLike,
  onDislike,
  onSave,
  onDelete,
  feedback = { liked: false, disliked: false },
  isFeedbackLoading = false,
  showDescription = true,
  imageHeight,
  cardHeight,
  className = '',
  style = {},
  isDark = false,
  showTopMatchBadge = false,
  recommendationReason,
  showSwipeIndicators = false,
  swipeIndicatorCount = 0,
  swipeIndicatorIndex = 0,
  footer,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);
  const [saveHighlighted, setSaveHighlighted] = React.useState(false);
  const saveScale = React.useRef(new Animated.Value(1)).current;

  // Reset image error when recipe changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [recipe.id, recipe.imageUrl]);

  // Heart-burst animation on save press (Airbnb-style)
  const handleSavePress = React.useCallback(() => {
    if (onDelete) {
      onDelete(recipe.id);
      return;
    }
    onSave?.(recipe.id);
    setSaveHighlighted(true);
    Animated.sequence([
      Animated.spring(saveScale, {
        toValue: 1.55,
        useNativeDriver: false,
        speed: 40,
        bounciness: 14,
      }),
      Animated.spring(saveScale, {
        toValue: 1,
        useNativeDriver: false,
        speed: 24,
        bounciness: 6,
      }),
    ]).start();
    setTimeout(() => setSaveHighlighted(false), 700);
  }, [onDelete, onSave, recipe.id, saveScale]);

  // Default dimensions based on variant
  const defaultImageHeight = variant === 'featured' ? 240 : (variant === 'carousel' ? 140 : variant === 'grid' ? 150 : 170);
  const defaultCardHeight = variant === 'featured' ? undefined : variant === 'carousel' ? 280 : variant === 'grid' ? 260 : 310;
  const finalImageHeight = imageHeight || defaultImageHeight;
  const finalCardHeight = cardHeight || defaultCardHeight;

  // Border color based on score
  const getBorderColor = () => {
    if (recipe.score?.matchPercentage) {
      const percentage = recipe.score.matchPercentage;
      if (percentage >= 80) return isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen;
      if (percentage >= 60) return isDark ? DarkColors.primary : Colors.primary;
      return isDark ? DarkColors.secondaryRed : Colors.secondaryRed;
    }
    return isDark ? DarkColors.primary : Colors.primary;
  };

  const getShadowStyle = () => Shadows.MD;

  const handlePress = () => {
    if (onPress) {
      onPress(recipe.id);
    }
  };


  const renderUnsplashAttribution = () => {
    const name = (recipe as any).unsplashPhotographerName as string | undefined;
    const username = (recipe as any).unsplashPhotographerUsername as string | undefined;
    if (!name || !username) return null;

    const profileUrl = `https://unsplash.com/@${username}?utm_source=Sazon%20Chef&utm_medium=referral`;

    return (
      <HapticTouchableOpacity
        onPress={() => Linking.openURL(profileUrl)}
        className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded"
      >
        <Text className="text-white text-xs">Photo by {name} on Unsplash</Text>
      </HapticTouchableOpacity>
    );
  };

  // Render based on variant
  if (variant === 'featured') {
  return (
      <HapticTouchableOpacity
        onPress={handlePress}
        onLongPress={() => onLongPress?.(recipe)}
        delayLongPress={500}
        className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg mb-4 ${className}`}
        style={{
          borderWidth: 2,
          borderColor: getBorderColor(),
          ...getShadowStyle(),
          ...style,
        }}
        {...recipeCardAccessibility(recipe.title, {
          cuisine: recipe.cuisine,
          calories: recipe.calories,
        })}
      >
        {/* Hero Recipe Image */}
        {recipe.imageUrl && recipe.imageUrl.trim() !== '' && !imageError ? (
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: optimizedImageUrl(recipe.imageUrl.trim()) }}
              style={{ width: '100%', height: finalImageHeight }}
              contentFit="cover"
              transition={Duration.normal}
              cachePolicy="memory-disk"
              recyclingKey={recipe.id}
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              onLoad={() => {
                setImageLoading(false);
                setImageError(false);
              }}
              onError={(error: any) => {
                // Extract error message from nested structure
                let errorMessage = '';
                if (typeof error === 'string') {
                  errorMessage = error;
                } else if (error?.error?.error) {
                  errorMessage = error.error.error;
                } else if (error?.error) {
                  errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
                } else if (error?.message) {
                  errorMessage = error.message;
                } else {
                  errorMessage = JSON.stringify(error);
                }
                
                // Silently handle image loading errors - these are expected for unreliable image sources
                // Only log in development for debugging, using warn instead of error to avoid alarming users
                if (__DEV__) {
                  const isNetworkError = errorMessage.includes('UnknownHostException') ||
                                        errorMessage.includes('Unable to resolve host') ||
                                        errorMessage.includes('Network request failed') ||
                                        errorMessage.includes('No address associated with hostname');
                  const isServiceError = errorMessage.includes('503') ||
                                        errorMessage.includes('Service Unavailable') ||
                                        errorMessage.includes('502') ||
                                        errorMessage.includes('504');

                  // Only log non-service errors in dev mode, and use warn instead of error
                  if (!isNetworkError && !isServiceError) {
                    console.warn(`⚠️ Image unavailable for "${recipe.title}" - using fallback`);
                  }
                }
                setImageError(true);
                setImageLoading(false);
              }}
            />
            <LinearGradient
              colors={isDark 
                ? ['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']
                : ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']
              }
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 120,
              }}
          />
            
            {/* Top Match Badge */}
            {showTopMatchBadge && (
              <View className="absolute top-4 left-4">
                <View className="px-3 py-1.5 rounded-full flex-row items-center" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreen}CC` : `${Colors.tertiaryGreen}E6` }}>
                  <Icon name={Icons.STAR} size={14} color="#FFFFFF" accessibilityLabel="Top match" />
                  <Text className="text-white font-bold text-xs ml-1">Top Match</Text>
                </View>
              </View>
            )}
            
            {/* Recommendation Reason Badge */}
            {recommendationReason && (
              <View className="absolute top-4 right-4">
                <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }}>
                  <Text className="text-xs font-semibold" style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>
                    {recommendationReason}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Swipe Indicator (if multiple recipes) */}
            {showSwipeIndicators && swipeIndicatorCount > 1 && (
              <View className="absolute bottom-4" style={{ left: '50%', transform: [{ translateX: -50 }] }}>
                <View className="flex-row items-center" style={{ gap: 4 }}>
                  {Array.from({ length: swipeIndicatorCount }).map((_, idx) => (
                    <View
                      key={idx}
                      className="rounded-full"
                      style={{
                        width: idx === swipeIndicatorIndex ? 8 : 6,
                        height: 6,
                        backgroundColor: idx === swipeIndicatorIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
            
            {renderUnsplashAttribution()}
        </View>
        ) : ((recipe.imageUrl && imageError) || !recipe.imageUrl || (recipe.imageUrl && recipe.imageUrl.trim() === '')) ? (
          // Fallback UI when image fails to load or is missing
          <View style={{ 
            width: '100%', 
            height: finalImageHeight, 
            backgroundColor: isDark ? '#374151' : '#E5E7EB',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}>
            <Icon 
              name={Icons.RESTAURANT} 
              size={48} 
              color={isDark ? '#6B7280' : '#9CA3AF'} 
              accessibilityLabel="Recipe image placeholder"
            />
            <Text style={{ 
              marginTop: 8,
              fontSize: 12,
              color: isDark ? '#6B7280' : '#9CA3AF',
              fontWeight: '500',
            }}>
              {recipe.cuisine}
            </Text>
            <LinearGradient
              colors={isDark 
                ? ['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']
                : ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']
              }
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 120,
              }}
            />
          </View>
        ) : null}

        <View className="p-4">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 mr-3">
              {/* Title */}
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {recipe.title}
              </Text>
              {/* Badges Row with Cuisine */}
              <View className="flex-row flex-wrap items-center">
                <SmartBadges recipe={recipe} maxVisible={3} variant="featured" />
                <View className="px-3.5 py-1.5 rounded-full mr-2 mb-2" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryDark }}>
                  <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.primaryDark : '#FFFFFF' }}>
                    {recipe.cuisine}
                  </Text>
                </View>
                <SmartBadges recipe={recipe} maxVisible={3} variant="featured" showOnlyInfoBadge={true} />
              </View>
            </View>
          </View>

          {/* Macro Nutrients - 4 Column Display */}
          <View className="flex-row items-center justify-between mb-3 p-2 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
            <View className="items-center flex-1">
              <Text className="text-xs text-gray-500 dark:text-gray-400">{recipe.calories} cal</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">{recipe.protein}g pro</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>{recipe.carbs}g carb</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-xs font-semibold text-purple-600 dark:text-purple-400">{recipe.fat}g fat</Text>
            </View>
          </View>

          {/* Description */}
          {showDescription && recipe.description && (
            <Text className="text-gray-600 dark:text-gray-300 text-sm mb-3" numberOfLines={2}>
              {recipe.description}
            </Text>
          )}

          {/* Action Buttons */}
          <View className="flex-row items-center justify-between">
            <HapticTouchableOpacity
              onPress={handleSavePress}
              className="p-2 rounded-full border"
              style={{
                backgroundColor: onDelete
                  ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2')
                  : saveHighlighted
                    ? (isDark ? DarkColors.primary : Colors.primary)
                    : (isDark ? `${Colors.primaryLight}33` : Colors.primaryDark),
                borderColor: onDelete
                  ? (isDark ? '#EF4444' : '#DC2626')
                  : (isDark ? DarkColors.primary : Colors.primaryDark),
              }}
              {...iconButtonAccessibility(onDelete ? 'Remove recipe' : 'Save recipe', {
                hint: onDelete ? 'Remove this recipe from your cookbook' : 'Save this recipe to your cookbook'
              })}
            >
              <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                <Icon
                  name={onDelete ? Icons.CLOSE : Icons.SAVE_RECIPE}
                  size={18}
                  color={onDelete ? '#EF4444' : (isDark ? DarkColors.primary : '#FFFFFF')}
                />
              </Animated.View>
            </HapticTouchableOpacity>

            <View className="flex-row items-center">
              <HapticTouchableOpacity
                onPress={() => onLike?.(recipe.id)}
                disabled={isFeedbackLoading}
                className={`p-2 rounded-full mr-2 border ${feedback.liked ? '' : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
                style={feedback.liked ? { backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen, borderColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen } : undefined}
                {...iconButtonAccessibility(feedback.liked ? 'Remove like' : 'Like recipe', { hint: 'Double tap to like this recipe' })}
              >
                <Icon name={feedback.liked ? Icons.LIKE : Icons.LIKE_OUTLINE} size={20} color={feedback.liked ? "#FFFFFF" : (isDark ? "#D1D5DB" : "#4B5563")} />
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => onDislike?.(recipe.id)}
                disabled={isFeedbackLoading}
                className={`p-2 rounded-full border ${feedback.disliked ? '' : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
                style={feedback.disliked ? { backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed, borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed } : undefined}
                {...iconButtonAccessibility(feedback.disliked ? 'Remove dislike' : 'Dislike recipe', { hint: 'Double tap to dislike this recipe' })}
              >
                <Icon name={feedback.disliked ? Icons.DISLIKE : Icons.DISLIKE_OUTLINE} size={20} color={feedback.disliked ? "#FFFFFF" : (isDark ? "#D1D5DB" : "#4B5563")} />
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </HapticTouchableOpacity>
    );
  }

  // Grid, List, and Carousel variants — image-first design
  const isGrid = variant === 'grid';
  const gradientHeight = isGrid ? 130 : 150;
  const titleLines = isGrid ? 1 : 2;
  const matchPct = recipe.score?.matchPercentage;

  return (
    <View
      className={`rounded-xl overflow-hidden ${className}`}
      style={{
        borderWidth: 2,
        borderColor: getBorderColor(),
        height: finalCardHeight,
        ...getShadowStyle(),
        ...style,
      }}
    >
      <HapticTouchableOpacity
        onPress={handlePress}
        onLongPress={() => onLongPress?.(recipe)}
        delayLongPress={500}
        activeOpacity={0.9}
        style={{ flex: 1 }}
        {...recipeCardAccessibility(recipe.title, {
          cuisine: recipe.cuisine,
          calories: recipe.calories,
        })}
      >
        {/* Full-bleed image */}
        {recipe.imageUrl && recipe.imageUrl.trim() !== '' && !imageError ? (
          <Image
            source={{ uri: optimizedImageUrl(recipe.imageUrl.trim()) }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            contentFit="cover"
            transition={Duration.normal}
            cachePolicy="memory-disk"
            recyclingKey={recipe.id}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            onLoad={() => { setImageLoading(false); setImageError(false); }}
            onError={(error: any) => {
              let errorMessage = '';
              if (typeof error === 'string') {
                errorMessage = error;
              } else if (error?.error?.error) {
                errorMessage = error.error.error;
              } else if (error?.error) {
                errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
              } else if (error?.message) {
                errorMessage = error.message;
              } else {
                errorMessage = JSON.stringify(error);
              }
              if (__DEV__) {
                const isNetworkError = errorMessage.includes('UnknownHostException') ||
                                      errorMessage.includes('Unable to resolve host') ||
                                      errorMessage.includes('Network request failed') ||
                                      errorMessage.includes('No address associated with hostname');
                const isServiceError = errorMessage.includes('503') ||
                                      errorMessage.includes('Service Unavailable') ||
                                      errorMessage.includes('502') ||
                                      errorMessage.includes('504');
                if (!isNetworkError && !isServiceError) {
                  console.warn(`⚠️ Image unavailable for "${recipe.title}" - using fallback`);
                }
              }
              setImageError(true);
              setImageLoading(false);
            }}
          />
        ) : (
          // Fallback background when image is missing or failed
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: isDark ? '#374151' : '#E5E7EB',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name={Icons.RESTAURANT} size={40} color={isDark ? '#6B7280' : '#9CA3AF'} accessibilityLabel="Recipe image placeholder" />
            <Text style={{ marginTop: 8, fontSize: 11, color: isDark ? '#6B7280' : '#9CA3AF', fontWeight: '500' }}>
              {recipe.cuisine}
            </Text>
          </View>
        )}

        {/* Strong gradient overlay at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: gradientHeight }}
        />

        {/* Sazon score pill — top right */}
        {matchPct !== undefined && (
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <View style={{
              backgroundColor: matchPct >= 80 ? Colors.tertiaryGreen : matchPct >= 60 ? Colors.primary : Colors.secondaryRed,
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
            }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{matchPct}%</Text>
            </View>
          </View>
        )}

        {/* Top Match badge — top left */}
        {showTopMatchBadge && (
          <View style={{ position: 'absolute', top: 8, left: 8 }}>
            <View style={{
              backgroundColor: `${Colors.tertiaryGreen}E6`,
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
              flexDirection: 'row', alignItems: 'center',
            }}>
              <Icon name={Icons.STAR} size={11} color="#FFFFFF" accessibilityLabel="Top match" />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 3 }}>Top Match</Text>
            </View>
          </View>
        )}

        {/* Recommendation reason — top right (only if no score pill) */}
        {recommendationReason && matchPct === undefined && (
          <View style={{ position: 'absolute', top: 8, right: 8 }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{recommendationReason}</Text>
            </View>
          </View>
        )}

        {/* Swipe indicators */}
        {showSwipeIndicators && swipeIndicatorCount > 1 && (
          <View style={{ position: 'absolute', bottom: gradientHeight + 8, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: swipeIndicatorCount }).map((_, idx) => (
                <View
                  key={idx}
                  style={{
                    width: idx === swipeIndicatorIndex ? 8 : 6,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: idx === swipeIndicatorIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </View>
          </View>
        )}

        {/* Overlaid content — sits on the gradient */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 10, paddingBottom: 10, paddingTop: 6 }}>
          {/* Cuisine label */}
          {!!recipe.cuisine && (
            <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 3, textTransform: 'uppercase' }}>
              {recipe.cuisine}
            </Text>
          )}

          {/* Title */}
          <Text
            style={{ color: '#ffffff', fontSize: isGrid ? 13 : 15, fontWeight: '900', lineHeight: isGrid ? 17 : 20, marginBottom: 6 }}
            numberOfLines={titleLines}
          >
            {recipe.title}
          </Text>

          {/* Macro pills */}
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
            {[
              { label: `${recipe.calories} cal`, bg: 'rgba(255,255,255,0.18)' },
              { label: `${recipe.protein}g P`, bg: 'rgba(59,130,246,0.50)' },
              { label: `${recipe.carbs}g C`, bg: `${Colors.tertiaryGreen}70` },
              { label: `${recipe.fat}g F`, bg: 'rgba(168,85,247,0.50)' },
            ].map(({ label, bg }) => (
              <View key={label} style={{ backgroundColor: bg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Unsplash attribution — above action row */}
          {(() => {
            const name = (recipe as any).unsplashPhotographerName as string | undefined;
            const username = (recipe as any).unsplashPhotographerUsername as string | undefined;
            if (!name || !username) return null;
            const profileUrl = `https://unsplash.com/@${username}?utm_source=Sazon%20Chef&utm_medium=referral`;
            return (
              <HapticTouchableOpacity
                onPress={() => Linking.openURL(profileUrl)}
                style={{ alignSelf: 'flex-end', marginBottom: 4 }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9 }}>
                  Photo by {name} on Unsplash
                </Text>
              </HapticTouchableOpacity>
            );
          })()}

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <HapticTouchableOpacity
              onPress={handleSavePress}
              style={{
                padding: 7, borderRadius: 999,
                backgroundColor: onDelete
                  ? 'rgba(239,68,68,0.30)'
                  : saveHighlighted
                    ? `${Colors.primary}CC`
                    : 'rgba(255,255,255,0.20)',
                borderWidth: 1,
                borderColor: onDelete ? 'rgba(239,68,68,0.60)' : 'rgba(255,255,255,0.35)',
              }}
              {...iconButtonAccessibility(onDelete ? 'Remove recipe' : 'Save recipe', {
                hint: onDelete ? 'Remove this recipe from your cookbook' : 'Save this recipe to your cookbook'
              })}
            >
              <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                <Icon name={onDelete ? Icons.CLOSE : Icons.SAVE_RECIPE} size={14} color={onDelete ? '#EF4444' : '#FFFFFF'} />
              </Animated.View>
            </HapticTouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <HapticTouchableOpacity
                testID="like-button"
                onPress={() => onLike?.(recipe.id)}
                disabled={isFeedbackLoading}
                style={{
                  padding: 7, borderRadius: 999,
                  backgroundColor: feedback.liked ? Colors.tertiaryGreen : 'rgba(255,255,255,0.20)',
                  borderWidth: 1,
                  borderColor: feedback.liked ? Colors.tertiaryGreen : 'rgba(255,255,255,0.35)',
                }}
                {...iconButtonAccessibility(feedback.liked ? 'Remove like' : 'Like recipe', { hint: 'Double tap to like this recipe' })}
              >
                <Icon name={feedback.liked ? Icons.LIKE : Icons.LIKE_OUTLINE} size={14} color="#FFFFFF" />
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                testID="dislike-button"
                onPress={() => onDislike?.(recipe.id)}
                disabled={isFeedbackLoading}
                style={{
                  padding: 7, borderRadius: 999,
                  backgroundColor: feedback.disliked ? Colors.secondaryRed : 'rgba(255,255,255,0.20)',
                  borderWidth: 1,
                  borderColor: feedback.disliked ? Colors.secondaryRed : 'rgba(255,255,255,0.35)',
                }}
                {...iconButtonAccessibility(feedback.disliked ? 'Remove dislike' : 'Dislike recipe', { hint: 'Double tap to dislike this recipe' })}
              >
                <Icon name={feedback.disliked ? Icons.DISLIKE : Icons.DISLIKE_OUTLINE} size={14} color="#FFFFFF" />
              </HapticTouchableOpacity>
            </View>
          </View>

          {footer}
        </View>
      </HapticTouchableOpacity>
    </View>
  );
};

export const RecipeCard = React.memo(RecipeCardComponent);
