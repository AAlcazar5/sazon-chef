// frontend/components/cookbook/CookbookSortPicker.tsx
// Bottom sheet for selecting recipe sort order

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BottomSheet from '../ui/BottomSheet';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';

type SortOption = 'recent' | 'alphabetical' | 'cuisine' | 'matchScore' | 'cookTime' | 'rating' | 'mostCooked';

const SORT_OPTIONS: Array<{ value: SortOption; label: string; icon: string }> = [
  { value: 'recent', label: 'Recently Added', icon: Icons.TIME_OUTLINE },
  { value: 'rating', label: 'My Rating', icon: Icons.STAR },
  { value: 'mostCooked', label: 'Most Cooked', icon: Icons.CHECKMARK_CIRCLE },
  { value: 'alphabetical', label: 'Alphabetical', icon: Icons.SHOPPING_LIST },
  { value: 'cuisine', label: 'By Cuisine', icon: Icons.GLOBE },
  { value: 'matchScore', label: 'Match Score', icon: Icons.STAR_OUTLINE },
  { value: 'cookTime', label: 'Cook Time', icon: Icons.COOK_TIME },
];

interface CookbookSortPickerProps {
  /** Whether the sheet is visible */
  visible: boolean;
  /** Close the sheet */
  onClose: () => void;
  /** Current sort option */
  sortBy: SortOption;
  /** Called when a sort option is selected */
  onSortChange: (sort: SortOption) => void;
}

export default function CookbookSortPicker({
  visible,
  onClose,
  sortBy,
  onSortChange,
}: CookbookSortPickerProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Sort recipes"
      snapPoints={['50%']}
    >
      <View style={{ paddingBottom: 24 }}>
        <Text className="text-xs text-gray-500 dark:text-gray-400 px-4 mb-2">
          Choose how your cookbook is ordered
        </Text>
        {SORT_OPTIONS.map((option) => {
          const isSelected = sortBy === option.value;
          return (
            <HapticTouchableOpacity
              key={option.value}
              onPress={() => onSortChange(option.value)}
              className="px-4 py-3 flex-row items-center"
              style={isSelected ? {
                backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight,
              } : undefined}
            >
              <Icon
                name={isSelected ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE}
                size={IconSizes.MD}
                color={isSelected ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"}
                accessibilityLabel={isSelected ? "Selected" : "Not selected"}
                style={{ marginRight: 12 }}
              />
              <Icon
                name={option.icon as any}
                size={IconSizes.SM}
                color={isSelected ? (isDark ? DarkColors.primary : Colors.primary) : '#6B7280'}
                accessibilityLabel={option.label}
                style={{ marginRight: 12 }}
              />
              <Text
                className={`flex-1 text-base ${isSelected ? 'font-semibold' : 'text-gray-900 dark:text-gray-100'}`}
                style={isSelected ? { color: isDark ? DarkColors.primaryDark : Colors.primaryDark } : undefined}
              >
                {option.label}
              </Text>
            </HapticTouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}
