import React from 'react';
import { Linking, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { SuggestedRecipe } from '../../types';
import { Colors, DarkColors } from '../../constants/Colors';
import { Duration } from '../../constants/Animations';
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
}

// Helper to truncate description
const truncateDescription = (text: string | undefined, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

export const RecipeCard: React.FC<RecipeCardProps> = ({
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
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

  // Reset image error when recipe changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [recipe.id, recipe.imageUrl]);

  // Default dimensions based on variant
  const defaultImageHeight = variant === 'featured' ? 240 : (variant === 'carousel' ? 140 : variant === 'grid' ? 150 : 170);
  const defaultCardHeight = variant === 'featured' ? undefined : variant === 'carousel' ? 360 : variant === 'grid' ? 340 : 390;
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

  // Shadow style
  const getShadowStyle = () => ({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  });

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
              source={{ uri: recipe.imageUrl.trim() }}
              style={{ width: '100%', height: finalImageHeight }}
              contentFit="cover"
              transition={Duration.normal}
              cachePolicy="memory-disk"
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
              onPress={() => onDelete ? onDelete(recipe.id) : onSave?.(recipe.id)}
              className="p-2 rounded-full border"
              style={{
                backgroundColor: onDelete
                  ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2')
                  : (isDark ? `${Colors.primaryLight}33` : Colors.primaryDark),
                borderColor: onDelete
                  ? (isDark ? '#EF4444' : '#DC2626')
                  : (isDark ? DarkColors.primary : Colors.primaryDark),
              }}
              {...iconButtonAccessibility(onDelete ? 'Remove recipe' : 'Save recipe', {
                hint: onDelete ? 'Remove this recipe from your cookbook' : 'Save this recipe to your cookbook'
              })}
            >
              <Icon
                name={onDelete ? Icons.CLOSE : Icons.SAVE_RECIPE}
                size={18}
                color={onDelete ? '#EF4444' : (isDark ? DarkColors.primary : '#FFFFFF')}
              />
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

  // Grid and List variants
  const isGrid = variant === 'grid';
  const isCarousel = variant === 'carousel';
  const isList = variant === 'list';
  const useCompactStyle = isGrid; // Only grid uses compact styling now
  // Ensure list and carousel use the same styling (unified template)
  const useListStyle = isList || isCarousel;
  const badgeMaxVisible = useCompactStyle ? 2 : 3;
  const useScaledBadges = true;
  const [badgeRowWidth, setBadgeRowWidth] = React.useState(0);
  const [badgeContentWidth, setBadgeContentWidth] = React.useState(0);
  const badgeRowScale = useScaledBadges && badgeRowWidth > 0 && badgeContentWidth > 0
    ? Math.min(1, badgeRowWidth / badgeContentWidth)
    : 1;
  const badgeRowTranslateX = useScaledBadges && badgeRowWidth > 0 && badgeContentWidth > 0
    ? -((badgeContentWidth * (1 - badgeRowScale)) / 2)
    : 0;

  return (
    <View
      className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden ${className}`}
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
        activeOpacity={0.7}
        style={{ flex: 1 }}
        {...recipeCardAccessibility(recipe.title, {
          cuisine: recipe.cuisine,
          calories: recipe.calories,
        })}
      >
        {/* Recipe Image */}
        {recipe.imageUrl && recipe.imageUrl.trim() !== '' && !imageError ? (
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: recipe.imageUrl.trim() }}
              style={{ width: '100%', height: finalImageHeight }}
              contentFit="cover"
              transition={Duration.normal}
              cachePolicy="memory-disk"
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
                ? ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)']
                : ['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']
              }
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 40,
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
              size={40} 
              color={isDark ? '#6B7280' : '#9CA3AF'} 
              accessibilityLabel="Recipe image placeholder"
            />
            <Text style={{ 
              marginTop: 8,
              fontSize: 11,
              color: isDark ? '#6B7280' : '#9CA3AF',
              fontWeight: '500',
            }}>
              {recipe.cuisine}
            </Text>
            <LinearGradient
              colors={isDark
                ? ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)']
                : ['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']
              }
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 40,
              }}
            />
          </View>
        ) : null}

        <View className="p-3" style={{ flex: 1, justifyContent: 'space-between' }}>
          <View>
            {/* Title */}
            <Text
              className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2"
              numberOfLines={1}
              style={{ lineHeight: 20 }}
            >
              {recipe.title}
            </Text>

            {/* Badges Row - Unified template for list and carousel */}
            <View
              className={useScaledBadges ? "mb-2" : "flex-row flex-wrap items-center mb-2"}
              onLayout={useScaledBadges ? (event) => setBadgeRowWidth(event.nativeEvent.layout.width) : undefined}
            >
              <View
                className={useScaledBadges ? "flex-row items-center" : "flex-row flex-wrap items-center"}
                onLayout={useScaledBadges ? (event) => setBadgeContentWidth(event.nativeEvent.layout.width) : undefined}
                style={useScaledBadges ? { transform: [{ translateX: badgeRowTranslateX }, { scale: badgeRowScale }], alignSelf: 'flex-start' } : undefined}
              >
                <SmartBadges 
                  recipe={recipe} 
                  maxVisible={badgeMaxVisible} 
                  variant={useListStyle ? 'list' : (useCompactStyle ? 'grid' : 'list')} 
                  hideInfoBadge={true} 
                  noWrap={useScaledBadges} 
                  forceIncludeIds={
                    isCarousel
                      ? ['match-score', 'health-grade', 'quick', 'prep-time']
                      : []
                  }
                />
                {!!recipe.cuisine && (
                  <View 
                    className={
                      useScaledBadges
                        ? "px-3 py-1.5 rounded-full mr-2"
                        : (useListStyle ? "px-3 py-1.5 rounded-full mr-2 mb-2" : "px-2.5 py-1 rounded-full mr-2 mb-2")
                    } 
                    style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryDark }}
                  >
                    <Text 
                      className={
                        useScaledBadges
                          ? "text-sm font-medium"
                          : (useListStyle ? "text-sm font-medium" : "text-xs font-medium")
                      } 
                      style={{ color: isDark ? DarkColors.primaryDark : '#FFFFFF' }}
                      numberOfLines={1}
                    >
                      {recipe.cuisine}
                    </Text>
                  </View>
                )}
                <SmartBadges 
                  recipe={recipe} 
                  maxVisible={1} 
                  variant={useListStyle ? 'list' : (useCompactStyle ? 'grid' : 'list')} 
                  showOnlyInfoBadge={true} 
                  noWrap={useScaledBadges} 
                />
              </View>
            </View>

            {/* Macro Nutrients - 4 Column Display - Unified template */}
            <View className="flex-row items-center justify-between py-2 px-2 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
              <View className="items-center flex-1">
                <Text 
                  className={isCarousel ? "text-sm text-gray-500 dark:text-gray-400" : (useListStyle ? "text-base text-gray-500 dark:text-gray-400" : (useCompactStyle ? "text-xs text-gray-500 dark:text-gray-400" : "text-base text-gray-500 dark:text-gray-400"))}
                  numberOfLines={1}
                >
                  {recipe.calories} cal
                </Text>
              </View>
              <View className="items-center flex-1">
                <Text 
                  className={isCarousel ? "text-sm font-semibold text-blue-600 dark:text-blue-400" : (useListStyle ? "text-base font-semibold text-blue-600 dark:text-blue-400" : (useCompactStyle ? "text-xs font-semibold text-blue-600 dark:text-blue-400" : "text-base font-semibold text-blue-600 dark:text-blue-400"))}
                  numberOfLines={1}
                >
                  {recipe.protein}g pro
                </Text>
              </View>
              <View className="items-center flex-1">
                <Text 
                  className={isCarousel ? "text-sm font-semibold" : (useListStyle ? "text-base font-semibold" : (useCompactStyle ? "text-xs font-semibold" : "text-base font-semibold"))} 
                  style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}
                  numberOfLines={1}
                >
                  {recipe.carbs}g carb
                </Text>
              </View>
              <View className="items-center flex-1">
                <Text 
                  className={isCarousel ? "text-sm font-semibold text-purple-600 dark:text-purple-400" : (useListStyle ? "text-base font-semibold text-purple-600 dark:text-purple-400" : (useCompactStyle ? "text-xs font-semibold text-purple-600 dark:text-purple-400" : "text-base font-semibold text-purple-600 dark:text-purple-400"))}
                  numberOfLines={1}
                >
                  {recipe.fat}g fat
                </Text>
              </View>
            </View>

            {/* Description - Unified template for list, carousel, and grid */}
            {showDescription && recipe.description && (
              <Text 
                className={useListStyle ? "text-gray-600 dark:text-gray-300 text-base" : "text-gray-600 dark:text-gray-300 text-xs"} 
                numberOfLines={2}
              >
                {recipe.description}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center justify-between" style={{ marginTop: isCarousel ? 0 : 8 }}>
            <HapticTouchableOpacity
              onPress={() => onDelete ? onDelete(recipe.id) : onSave?.(recipe.id)}
              className="p-1.5 rounded-full border"
              style={{
                backgroundColor: onDelete
                  ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2')
                  : (isDark ? `${Colors.primaryLight}33` : Colors.primaryDark),
                borderColor: onDelete
                  ? (isDark ? '#EF4444' : '#DC2626')
                  : (isDark ? DarkColors.primary : Colors.primaryDark),
              }}
              {...iconButtonAccessibility(onDelete ? 'Remove recipe' : 'Save recipe', {
                hint: onDelete ? 'Remove this recipe from your cookbook' : 'Save this recipe to your cookbook'
              })}
            >
              <Icon
                name={onDelete ? Icons.CLOSE : Icons.SAVE_RECIPE}
                size={14}
                color={onDelete ? '#EF4444' : (isDark ? DarkColors.primary : '#FFFFFF')}
              />
            </HapticTouchableOpacity>

            <View className="flex-row items-center">
              <HapticTouchableOpacity
                onPress={() => onLike?.(recipe.id)}
                disabled={isFeedbackLoading}
                className={`p-1.5 rounded-full mr-1.5 border ${feedback.liked ? '' : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
                style={feedback.liked ? { backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen, borderColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen } : undefined}
                {...iconButtonAccessibility(feedback.liked ? 'Remove like' : 'Like recipe', { hint: 'Double tap to like this recipe' })}
              >
                <Icon name={feedback.liked ? Icons.LIKE : Icons.LIKE_OUTLINE} size={14} color={feedback.liked ? "#FFFFFF" : (isDark ? "#D1D5DB" : "#4B5563")} />
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => onDislike?.(recipe.id)}
                disabled={isFeedbackLoading}
                className={`p-1.5 rounded-full border ${feedback.disliked ? '' : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
                style={feedback.disliked ? { backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed, borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed } : undefined}
                {...iconButtonAccessibility(feedback.disliked ? 'Remove dislike' : 'Dislike recipe', { hint: 'Double tap to dislike this recipe' })}
              >
                <Icon name={feedback.disliked ? Icons.DISLIKE : Icons.DISLIKE_OUTLINE} size={14} color={feedback.disliked ? "#FFFFFF" : (isDark ? "#D1D5DB" : "#4B5563")} />
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </HapticTouchableOpacity>
    </View>
  );
};
