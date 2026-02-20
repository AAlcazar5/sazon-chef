// frontend/components/cookbook/CookbookSortPicker.tsx
// Modal for selecting recipe sort order

import { View, Text, ScrollView, Modal, Dimensions } from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
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
  /** Whether the modal is visible */
  visible: boolean;
  /** Close the modal */
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
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-black/50 justify-center items-center px-4" edges={['top', 'bottom']}>
        <HapticTouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="absolute inset-0"
        />
        <View className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm shadow-lg">
          <View className="p-4 border-b border-gray-200 dark:border-gray-700 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sort recipes</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Choose how your cookbook is ordered
              </Text>
            </View>
            <HapticTouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }}
            >
              <Icon name={Icons.CLOSE} size={IconSizes.SM} color={isDark ? '#D1D5DB' : '#6B7280'} accessibilityLabel="Close sort modal" />
            </HapticTouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.6 }}>
            {SORT_OPTIONS.map((option) => {
              const isSelected = sortBy === option.value;
              return (
                <HapticTouchableOpacity
                  key={option.value}
                  onPress={() => onSortChange(option.value)}
                  className={`px-4 py-3 flex-row items-center border-b border-gray-100 dark:border-gray-700 ${
                    isSelected ? '' : 'bg-white dark:bg-gray-800'
                  }`}
                  style={isSelected ? { backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight } : undefined}
                >
                  <Icon
                    name={isSelected ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE}
                    size={IconSizes.MD}
                    color={isSelected ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"}
                    accessibilityLabel={isSelected ? "Selected" : "Not selected"}
                    style={{ marginRight: 12 }}
                  />
                  <Icon
                    name={option.icon}
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
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
