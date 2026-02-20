// frontend/components/shopping/PantrySection.tsx
// Collapsible "My Pantry" section showing items the user always has on hand

import { View, Text, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { PantryItem } from '../../types';

interface PantrySectionProps {
  pantryItems: PantryItem[];
  loading: boolean;
  onRemoveItem: (itemId: string) => void;
  onSetupDefaults: () => void;
}

export default function PantrySection({
  pantryItems,
  loading,
  onRemoveItem,
  onSetupDefaults,
}: PantrySectionProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (loading) return null;

  const formatItemName = (name: string) =>
    name.charAt(0).toUpperCase() + name.slice(1);

  if (pantryItems.length === 0) {
    return (
      <View className="mx-4 mb-4">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          My Pantry
        </Text>
        <View
          className="rounded-xl p-4 items-center"
          style={{
            backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
            borderWidth: 1,
            borderColor: isDark ? '#374151' : '#E5E7EB',
            borderStyle: 'dashed',
          }}
        >
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-3">
            Add staples you always have on hand.{'\n'}They'll be excluded from generated lists.
          </Text>
          <HapticTouchableOpacity
            onPress={onSetupDefaults}
            className="flex-row items-center px-4 py-2 rounded-full"
            style={{
              backgroundColor: isDark ? DarkColors.primary : Colors.primary,
            }}
          >
            <Icon
              name={Icons.ADD}
              size={16}
              color="white"
              accessibilityLabel="Add defaults"
              style={{ marginRight: 4 }}
            />
            <Text className="text-sm font-semibold text-white">
              Get Started
            </Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="mx-4 mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            My Pantry
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500 ml-2">
            {pantryItems.length} items
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        <View className="flex-row" style={{ gap: 8 }}>
          {pantryItems.map(item => (
            <HapticTouchableOpacity
              key={item.id}
              onLongPress={() => onRemoveItem(item.id)}
              className="flex-row items-center px-3 py-2 rounded-full border"
              style={{
                backgroundColor: isDark ? '#1E3A2F' : '#ECFDF5',
                borderColor: isDark ? '#065F46' : '#A7F3D0',
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color: isDark ? '#6EE7B7' : '#065F46',
                }}
                numberOfLines={1}
              >
                {formatItemName(item.name)}
              </Text>
            </HapticTouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Long-press to remove from pantry
      </Text>
    </View>
  );
}
