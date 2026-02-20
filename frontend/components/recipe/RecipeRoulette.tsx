// frontend/components/recipe/RecipeRoulette.tsx
// Tinder-style recipe roulette/swipe feature

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Colors, DarkColors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import SmartBadges from './SmartBadges';
import type { SuggestedRecipe } from '../../types';
import { optimizedImageUrl } from '../../utils/imageUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.75;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const ROTATION_DEG = 15;

interface RecipeRouletteProps {
  recipes: SuggestedRecipe[];
  onLike: (recipeId: string) => void;
  onPass: (recipeId: string) => void;
  onClose: () => void;
  onReshuffle?: () => void;
  initialIndex?: number;
}

export default function RecipeRoulette({
  recipes,
  onLike,
  onPass,
  onClose,
  onReshuffle,
  initialIndex = 0,
}: RecipeRouletteProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showLikeIndicator, setShowLikeIndicator] = useState(false);
  const [showPassIndicator, setShowPassIndicator] = useState(false);

  // Animation values for current card
  const position = useRef(new Animated.ValueXY()).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Animation values for next card (preview)
  const nextCardScale = useRef(new Animated.Value(0.95)).current;
  const nextCardOpacity = useRef(new Animated.Value(0.7)).current;

  const currentRecipe = recipes[currentIndex];
  const nextRecipe = recipes[currentIndex + 1];

  // Reset animations when card changes
  useEffect(() => {
    position.setValue({ x: 0, y: 0 });
    rotation.setValue(0);
    opacity.setValue(1);
    setShowLikeIndicator(false);
    setShowPassIndicator(false);
  }, [currentIndex]);

  // Animate next card preview when current card moves
  useEffect(() => {
    const listener = position.addListener(({ x }) => {
      const absX = Math.abs(x);
      const progress = Math.min(absX / SWIPE_THRESHOLD, 1);

      // Scale up next card as current card moves away (use setValue for immediate updates)
      nextCardScale.setValue(0.95 + progress * 0.05);
      nextCardOpacity.setValue(0.7 + progress * 0.3);

      // Show indicators
      if (x > 50) {
        setShowLikeIndicator(true);
        setShowPassIndicator(false);
      } else if (x < -50) {
        setShowPassIndicator(true);
        setShowLikeIndicator(false);
      } else {
        setShowLikeIndicator(false);
        setShowPassIndicator(false);
      }
    });

    return () => {
      position.removeListener(listener);
    };
  }, [currentIndex]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5;
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
        rotation.setValue(gesture.dx / SCREEN_WIDTH);
      },
      onPanResponderRelease: (_, gesture) => {
        const absX = Math.abs(gesture.dx);
        
        if (absX > SWIPE_THRESHOLD) {
          // Swipe detected
          const direction = gesture.dx > 0 ? 'right' : 'left';
          
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          
          // Run position animation separately since it requires useNativeDriver: false
          Animated.timing(position, {
            toValue: { 
              x: direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, 
              y: gesture.dy 
            },
            duration: 300,
            useNativeDriver: false,
          }).start();
          
          // Run opacity animation (must use same driver as position since they're on same component)
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            // Call appropriate handler
            if (direction === 'right') {
              onLike(currentRecipe.id);
            } else {
              onPass(currentRecipe.id);
            }
            
            // Move to next card
            if (currentIndex < recipes.length - 1) {
              setCurrentIndex(currentIndex + 1);
            } else {
              // No more recipes
              onClose();
            }
          });
        } else {
          // Spring back to center
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          
          // Run position animation separately since it requires useNativeDriver: false
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
          
          // Run rotation and opacity animations (must use same driver as position)
          Animated.parallel([
            Animated.spring(rotation, {
              toValue: 0,
              useNativeDriver: false,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const rotateCard = rotation.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [`-${ROTATION_DEG}deg`, '0deg', `${ROTATION_DEG}deg`],
    extrapolate: 'clamp',
  });

  if (!currentRecipe) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color={isDark ? DarkColors.primary : Colors.primary} />
          <Text style={[styles.emptyText, { color: isDark ? DarkColors.text : Colors.text }]}>
            You've seen all recipes!
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            {onReshuffle && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setCurrentIndex(0);
                  onReshuffle();
                }}
                style={[styles.closeButton, {
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  flex: 1,
                }]}
              >
                <Text style={[styles.closeButtonText, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
                  Shuffle Again
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: isDark ? DarkColors.primary : Colors.primary, flex: 1 }]}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={isDark 
          ? ['#1F2937', '#111827', '#0F172A']
          : ['#F9FAFB', '#F3F4F6', '#E5E7EB']
        }
        style={StyleSheet.absoluteFill}
      />

      {/* Next card preview (behind current card) */}
      {nextRecipe && (
        <Animated.View
          style={[
            styles.card,
            styles.nextCard,
            {
              transform: [{ scale: nextCardScale }],
              opacity: nextCardOpacity,
            },
          ]}
        >
          <RecipeCardContent recipe={nextRecipe} isDark={isDark} isPreview />
        </Animated.View>
      )}

      {/* Current card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          styles.currentCard,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate: rotateCard },
            ],
            opacity,
          },
        ]}
      >
        <RecipeCardContent recipe={currentRecipe} isDark={isDark} />
      </Animated.View>

      {/* Swipe indicators */}
      {showLikeIndicator && (
        <View style={[styles.indicator, styles.likeIndicator]}>
          <Ionicons name="heart" size={60} color="#10B981" />
          <Text style={styles.indicatorText}>LIKE</Text>
        </View>
      )}
      {showPassIndicator && (
        <View style={[styles.indicator, styles.passIndicator]}>
          <Ionicons name="close-circle" size={60} color={Colors.secondaryRed} />
          <Text style={styles.indicatorText}>PASS</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPass(currentRecipe.id);
            if (currentIndex < recipes.length - 1) {
              setCurrentIndex(currentIndex + 1);
            } else {
              onClose();
            }
          }}
          style={[styles.actionButton, styles.passButton]}
        >
          <Ionicons name="close" size={32} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onLike(currentRecipe.id);
            if (currentIndex < recipes.length - 1) {
              setCurrentIndex(currentIndex + 1);
            } else {
              onClose();
            }
          }}
          style={[styles.actionButton, styles.likeButton]}
        >
          <Ionicons name="heart" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Close button */}
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButtonTop}
      >
        <Ionicons name="close" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
      </TouchableOpacity>

      {/* Card counter */}
      <View style={styles.counter}>
        <Text style={[styles.counterText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {currentIndex + 1} / {recipes.length}
        </Text>
      </View>
    </View>
  );
}

// Recipe card content component
function RecipeCardContent({ 
  recipe, 
  isDark, 
  isPreview = false 
}: { 
  recipe: SuggestedRecipe; 
  isDark: boolean; 
  isPreview?: boolean;
}) {
  return (
    <View style={[styles.cardContent, { backgroundColor: isDark ? DarkColors.gray800 : Colors.white }]}>
      {/* Recipe Image */}
      {recipe.imageUrl && (
        <View style={styles.imageContainer}>
          <ExpoImage
            source={{ uri: optimizedImageUrl(recipe.imageUrl) }}
            style={styles.recipeImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          />
          <LinearGradient
            colors={isDark
              ? ['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']
              : ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']
            }
            style={styles.imageGradient}
          />
        </View>
      )}

      {/* Content */}
      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.contentPadding}>
          {/* Title */}
          <Text style={[styles.title, { color: isDark ? DarkColors.text : Colors.text }]}>
            {recipe.title}
          </Text>

          {/* Smart Badges */}
          <View style={styles.badgesContainer}>
            <SmartBadges recipe={recipe} maxVisible={4} variant="list" />
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {recipe.description}
          </Text>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Icon name={Icons.COOK_TIME} size={IconSizes.SM} color={isDark ? '#9CA3AF' : '#6B7280'} accessibilityLabel="Cook time" />
              <Text style={[styles.metaText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {recipe.cookTime} min
              </Text>
            </View>
            <View style={[styles.cuisineBadge, { backgroundColor: isDark ? `${DarkColors.primary}33` : Colors.primaryDark }]}>
              <Text style={[styles.cuisineText, { color: isDark ? DarkColors.primaryDark : '#FFFFFF' }]}>
                {recipe.cuisine}
              </Text>
            </View>
          </View>

          {/* Macros */}
          <View style={[styles.macrosContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Calories</Text>
              <Text style={[styles.macroValue, { color: isDark ? DarkColors.text : Colors.text }]}>
                {recipe.calories}
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Protein</Text>
              <Text style={[styles.macroValue, { color: '#3B82F6' }]}>{recipe.protein}g</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Carbs</Text>
              <Text style={[styles.macroValue, { color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }]}>
                {recipe.carbs}g
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Fat</Text>
              <Text style={[styles.macroValue, { color: '#F59E0B' }]}>{recipe.fat}g</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'absolute',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  nextCard: {
    zIndex: 1,
    elevation: 5,
  },
  currentCard: {
    zIndex: 2,
    elevation: 10,
  },
  cardContent: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    width: '100%',
    height: CARD_HEIGHT * 0.5,
    position: 'relative',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  contentPadding: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  badgesContainer: {
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cuisineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cuisineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  indicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -75,
    marginTop: -75,
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  likeIndicator: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 4,
    borderColor: '#10B981',
  },
  passIndicator: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 4,
    borderColor: Colors.secondaryRed,
  },
  indicatorText: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    zIndex: 100,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  passButton: {
    backgroundColor: Colors.secondaryRed,
  },
  likeButton: {
    backgroundColor: '#10B981',
  },
  closeButtonTop: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  counter: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
  },
  counterText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  closeButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

