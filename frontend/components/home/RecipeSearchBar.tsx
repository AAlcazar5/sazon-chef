// frontend/components/home/RecipeSearchBar.tsx
// Search bar component for recipe search

import { View, Text, TextInput } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';

interface RecipeSearchBarProps {
  /** Current search query value */
  value: string;
  /** Called when search text changes */
  onChangeText: (text: string) => void;
  /** Called when clear button is pressed */
  onClear: () => void;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Search bar component for recipe search
 * Includes search icon, text input, and clear button
 */
export default function RecipeSearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search recipes, ingredients, tags...',
}: RecipeSearchBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleClear = () => {
    onClear();
    HapticPatterns.buttonPress();
  };

  return (
    <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2.5">
        <Icon
          name={Icons.SEARCH}
          size={IconSizes.MD}
          color={isDark ? '#9CA3AF' : '#6B7280'}
          accessibilityLabel="Search"
          style={{ marginRight: 8 }}
        />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          value={value}
          onChangeText={onChangeText}
          className="flex-1 text-gray-900 dark:text-gray-100 text-base"
          style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search recipes"
          accessibilityHint="Enter text to search for recipes"
        />
        {value.length > 0 && (
          <HapticTouchableOpacity onPress={handleClear} className="ml-2">
            <Icon
              name={Icons.CLOSE_CIRCLE}
              size={IconSizes.SM}
              color={isDark ? '#9CA3AF' : '#6B7280'}
              accessibilityLabel="Clear search"
            />
          </HapticTouchableOpacity>
        )}
      </View>
      {value.length > 0 && (
        <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2 ml-1">
          Results for "{value}"
        </Text>
      )}
    </View>
  );
}
