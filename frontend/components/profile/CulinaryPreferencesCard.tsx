// frontend/components/profile/CulinaryPreferencesCard.tsx
// Culinary preferences display card with tags and recipe roulette button

import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { router } from 'expo-router';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { UserProfile } from '../../types';

interface CulinaryPreferencesCardProps {
  profile: UserProfile | null;
  preferences: any | null;
}

export default function CulinaryPreferencesCard({ profile, preferences }: CulinaryPreferencesCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const prefs = profile?.preferences || preferences;

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryDark }}>
            <Text className="text-xl">🍽️</Text>
          </View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Culinary Preferences</Text>
        </View>
        <HapticTouchableOpacity onPress={() => router.push('/onboarding?edit=true')}>
          <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit" />
        </HapticTouchableOpacity>
      </View>

      {!prefs ? (
        <HapticTouchableOpacity
          onPress={() => router.push('/onboarding?edit=true')}
          className="p-3 rounded-lg border"
          style={{
            backgroundColor: isDark ? `${Colors.primaryLight}1A` : Colors.primaryDark,
            borderColor: isDark ? DarkColors.primary : Colors.primaryDark,
          }}
        >
          <View className="flex-row items-center">
            <Text className="text-xl mr-2">🍽️</Text>
            <Text className="font-medium ml-2" style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}>
              Set up your culinary preferences
            </Text>
          </View>
          <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}>
            Get personalized recipe recommendations based on your tastes
          </Text>
        </HapticTouchableOpacity>
      ) : (
        <View className="space-y-3">
          <View>
            <Text className="text-sm mb-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Banned Ingredients</Text>
            <View className="flex-row flex-wrap">
              {prefs.bannedIngredients && prefs.bannedIngredients.length > 0 ? (
                prefs.bannedIngredients.map((ingredient: any, index: number) => {
                  const ingredientText = typeof ingredient === 'string' ? ingredient : ingredient.name;
                  const capitalized = ingredientText.replace(/\b\w/g, (char: string) => char.toUpperCase());
                  return (
                    <View key={index} className="px-2 py-1 rounded-full mr-2 mb-2" style={{ backgroundColor: isDark ? Colors.secondaryRedLight : Colors.secondaryRedLight }}>
                      <Text className="text-xs" style={{ color: '#FFFFFF' }}>
                        {capitalized}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>None set</Text>
              )}
            </View>
          </View>

          <View>
            <Text className="text-sm mb-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Liked Cuisines</Text>
            <View className="flex-row flex-wrap">
              {prefs.likedCuisines && prefs.likedCuisines.length > 0 ? (
                prefs.likedCuisines.map((cuisine: any, index: number) => {
                  const cuisineText = typeof cuisine === 'string' ? cuisine : cuisine.name;
                  const capitalized = cuisineText.replace(/\b\w/g, (char: string) => char.toUpperCase());
                  return (
                    <View key={index} className="px-2 py-1 rounded-full mr-2 mb-2" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight }}>
                      <Text className="text-xs" style={{ color: '#FFFFFF' }}>
                        {capitalized}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>None set</Text>
              )}
            </View>
          </View>

          <View>
            <Text className="text-sm mb-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Preferred Superfoods</Text>
            <View className="flex-row flex-wrap">
              {prefs.preferredSuperfoods && prefs.preferredSuperfoods.length > 0 ? (
                prefs.preferredSuperfoods.map((superfood: any, index: number) => {
                  const category = typeof superfood === 'string' ? superfood : superfood.category;
                  const capitalized = category.replace(/\b\w/g, (char: string) => char.toUpperCase());
                  return (
                    <View key={index} className="px-2 py-1 rounded-full mr-2 mb-2" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}>
                      <Text className="text-xs" style={{ color: '#FFFFFF' }}>
                        {capitalized}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>None set</Text>
              )}
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-gray-600 dark:text-gray-200">Max Cook Time</Text>
            <Text className="font-semibold text-gray-900 dark:text-gray-100">
              {prefs.cookTimePreference ? `${prefs.cookTimePreference} min` : 'Not set'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
