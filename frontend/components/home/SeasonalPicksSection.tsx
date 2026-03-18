// frontend/components/home/SeasonalPicksSection.tsx
// "Right now" seasonal picks — horizontal scroll row.
// Season determined by month, tag-matched against recipe categories.

import { View, Text, ScrollView, Image } from 'react-native';
import { useColorScheme } from 'nativewind';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import type { SuggestedRecipe } from '../../types';

type Season = 'spring' | 'summer' | 'fall' | 'winter';

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring Picks',
  summer: 'Summer Vibes',
  fall: 'Fall Favorites',
  winter: 'Winter Warmers',
};

const SEASON_EMOJI: Record<Season, string> = {
  spring: '\u{1F331}',
  summer: '\u{2600}\u{FE0F}',
  fall: '\u{1F342}',
  winter: '\u{2744}\u{FE0F}',
};

/** Tags to match against recipe title/description/category per season */
const SEASON_TAGS: Record<Season, string[]> = {
  winter: ['soup', 'stew', 'roast', 'braise', 'chili', 'casserole', 'pot pie', 'ramen'],
  spring: ['salad', 'pasta', 'grain bowl', 'light', 'asparagus', 'pea', 'spring roll'],
  summer: ['grill', 'cold', 'smoothie', 'poke', 'ceviche', 'bbq', 'corn', 'tomato'],
  fall: ['squash', 'pumpkin', 'apple', 'chili', 'baked', 'pie', 'cinnamon', 'maple'],
};

function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function matchesSeason(recipe: SuggestedRecipe, season: Season): boolean {
  const text = `${recipe.title} ${recipe.description ?? ''}`.toLowerCase();
  return SEASON_TAGS[season].some(tag => text.includes(tag));
}

interface SeasonalPicksSectionProps {
  recipes: SuggestedRecipe[];
}

export default function SeasonalPicksSection({ recipes }: SeasonalPicksSectionProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const season = getCurrentSeason();

  const seasonal = recipes.filter(r => matchesSeason(r, season)).slice(0, 10);

  if (seasonal.length < 2) return null;

  return (
    <View className="mt-4">
      <View className="flex-row items-center px-4 mb-3">
        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {SEASON_EMOJI[season]} {SEASON_LABELS[season]}
        </Text>
        <Text className="text-xs text-gray-400 dark:text-gray-500 ml-2 mt-0.5">
          Right now
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {seasonal.map((recipe) => (
          <HapticTouchableOpacity
            key={recipe.id}
            onPress={() => {
              HapticPatterns.buttonPress();
              router.push(`/recipe/${recipe.id}` as any);
            }}
            style={{
              width: 160,
              marginRight: 12,
              borderRadius: 14,
              overflow: 'hidden',
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 6,
              elevation: 3,
            }}
            accessibilityLabel={recipe.title}
          >
            {recipe.imageUrl ? (
              <Image
                source={{ uri: recipe.imageUrl }}
                style={{ width: 160, height: 100 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 160,
                  height: 100,
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text className="text-2xl">{SEASON_EMOJI[season]}</Text>
              </View>
            )}
            <View className="p-2.5">
              <Text
                className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                numberOfLines={2}
              >
                {recipe.title}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {recipe.cookTime}min · {recipe.calories}cal
              </Text>
            </View>
          </HapticTouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
