// frontend/hooks/useRandomRecipe.ts
// Custom hook for AI-powered random recipe generation

import { useState, useRef, useCallback } from 'react';
import { Alert, Animated } from 'react-native';
import { router } from 'expo-router';
import { aiRecipeApi, recipeApi } from '../lib/api';
import { HapticPatterns } from '../constants/Haptics';
import { Duration, Spring } from '../constants/Animations';
import { analytics } from '../utils/analytics';
import type { FilterState } from '../lib/filterStorage';

interface UseRandomRecipeOptions {
  filters: FilterState;
  userId?: string;
  onRefresh?: () => void;
}

interface UseRandomRecipeReturn {
  showModal: boolean;
  buttonScale: Animated.Value;
  buttonOpacity: Animated.Value;
  generateRandomRecipe: () => Promise<void>;
  closeModal: () => void;
}

export function useRandomRecipe(options: UseRandomRecipeOptions): UseRandomRecipeReturn {
  const { filters, userId, onRefresh } = options;

  const [showModal, setShowModal] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  const animateButton = useCallback(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: Duration.instant,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 0.8,
          duration: Duration.instant,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(buttonScale, {
          toValue: 1.1,
          ...Spring.bouncy,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: Duration.normal,
        useNativeDriver: true,
      }),
    ]).start();
  }, [buttonScale, buttonOpacity]);

  const generateRandomRecipe = useCallback(async () => {
    try {
      console.log('🤖 Generating AI recipe with filters:', filters);

      // Animate button press
      animateButton();

      // Show loading modal
      setShowModal(true);

      // Build params from active filters
      const params: any = {};

      // Pick random cuisine from filtered list
      if (filters.cuisines.length > 0) {
        const randomCuisine = filters.cuisines[Math.floor(Math.random() * filters.cuisines.length)];
        params.cuisine = randomCuisine;
        console.log('🎲 Using filtered cuisine:', randomCuisine);
      }

      // Respect max cook time filter
      if (filters.maxCookTime) {
        params.maxCookTime = filters.maxCookTime;
        console.log('⏱️ Respecting max cook time:', filters.maxCookTime);
      }

      const response = await aiRecipeApi.generateRecipe(params);
      const aiRecipe = response.data.recipe;

      console.log('✅ AI recipe generated:', aiRecipe.title);

      // Track AI recipe generation
      if (userId) {
        analytics.trackFeatureUsage('ai_recipe_generation', {
          source: 'home_screen',
          cuisine: params.cuisine,
          maxCookTime: params.maxCookTime,
        });
      }

      HapticPatterns.success();
      setShowModal(false);

      // Navigate after brief delay
      setTimeout(() => {
        router.push(`../modal?id=${aiRecipe.id}`);
      }, 500);

    } catch (error: any) {
      console.error('❌ Error generating AI recipe:', error);
      setShowModal(false);

      // Check if it's a quota/billing error
      const isQuotaError = error.code === 'insufficient_quota' ||
                          error.message?.includes('quota') ||
                          error.message?.includes('429');

      // Fallback to existing random recipe if AI fails
      if (isQuotaError) {
        try {
          console.log('🔄 Falling back to random recipe from database...');
          const fallbackResponse = await recipeApi.getRandomRecipe();
          const fallbackRecipe = fallbackResponse.data;

          HapticPatterns.success();

          Alert.alert(
            'Using Existing Recipe',
            "AI generation is temporarily unavailable. Here's a great recipe from our collection!",
            [],
            { cancelable: false }
          );

          setTimeout(() => {
            router.push(`../modal?id=${fallbackRecipe.id}`);
          }, 1500);

          return;
        } catch (fallbackError: any) {
          console.error('❌ Fallback also failed:', fallbackError);
        }
      }

      const isTimeout = error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR';
      const message = isQuotaError
        ? 'AI recipe generation is temporarily unavailable due to quota limits. Try again later or browse our existing recipes!'
        : isTimeout
        ? 'The recipe took too long to generate. This is usually temporary - try again!'
        : 'Unable to generate a recipe right now. Please check your connection and try again.';

      Alert.alert(
        'Generation Failed',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => generateRandomRecipe() },
          { text: 'Browse Recipes', onPress: () => onRefresh?.() },
        ]
      );
    }
  }, [filters, userId, onRefresh, animateButton]);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  return {
    showModal,
    buttonScale,
    buttonOpacity,
    generateRandomRecipe,
    closeModal,
  };
}

export default useRandomRecipe;
