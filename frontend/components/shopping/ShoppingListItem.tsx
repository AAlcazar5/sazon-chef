// frontend/components/shopping/ShoppingListItem.tsx
// Individual shopping list item component — simplified view
// Default: checkbox + name + qty/price (right-aligned). Tap row → edit modal.
// In-store: larger checkboxes + "Can't find" button.

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { ShoppingListItem as ShoppingListItemType } from '../../types';

interface ShoppingListItemProps {
  item: ShoppingListItemType;
  selectionMode: boolean;
  isSelected: boolean;
  groupByRecipe: boolean;
  inStoreMode?: boolean;
  isCantFind?: boolean;
  isPantryItem?: boolean;
  onTogglePurchased: (item: ShoppingListItemType) => void;
  onEditQuantity: (item: ShoppingListItemType) => void;
  onToggleSelection: (itemId: string) => void;
  onLongPress: (itemId: string) => void;
  onCantFind?: (itemId: string) => void;
  onAddToPantry?: (name: string, category?: string) => void;
}

export default function ShoppingListItem({
  item,
  selectionMode,
  isSelected,
  groupByRecipe,
  inStoreMode = false,
  isCantFind = false,
  isPantryItem = false,
  onTogglePurchased,
  onEditQuantity,
  onToggleSelection,
  onLongPress,
  onCantFind,
}: ShoppingListItemProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const checkboxSize = inStoreMode ? 36 : 26;
  const checkmarkSize = inStoreMode ? 24 : 16;

  const handlePress = () => {
    if (selectionMode) {
      onToggleSelection(item.id);
    } else {
      // Tap row → edit modal (not toggle purchased)
      onEditQuantity(item);
    }
  };

  const handleCheckboxPress = () => {
    if (selectionMode) {
      onToggleSelection(item.id);
    } else {
      onTogglePurchased(item);
    }
  };

  return (
    <View
      className={`flex-row items-center rounded-xl mb-2 ${
        item.purchased ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
      } ${selectionMode && isSelected ? 'border-2' : 'border border-gray-100 dark:border-gray-700'}`}
      style={[
        { paddingVertical: inStoreMode ? 14 : 12, paddingHorizontal: inStoreMode ? 16 : 14 },
        selectionMode && isSelected ? {
          borderColor: isDark ? DarkColors.primary : Colors.primary,
          backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight,
        } : item.purchased ? {
          opacity: 0.5,
        } : undefined,
      ]}
    >
      {/* Checkbox */}
      <HapticTouchableOpacity
        onPress={handleCheckboxPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {selectionMode ? (
          <View
            style={{
              width: checkboxSize,
              height: checkboxSize,
              borderRadius: checkboxSize / 2,
              borderWidth: 2,
              borderColor: isSelected
                ? (isDark ? DarkColors.primary : Colors.primary)
                : '#D1D5DB',
              backgroundColor: isSelected
                ? (isDark ? DarkColors.primary : Colors.primary)
                : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSelected && (
              <Icon name={Icons.CHECKMARK} size={checkmarkSize} color="white" accessibilityLabel="Selected" />
            )}
          </View>
        ) : (
          <View
            style={{
              width: checkboxSize,
              height: checkboxSize,
              borderRadius: checkboxSize / 2,
              borderWidth: inStoreMode ? 3 : 2,
              borderColor: item.purchased
                ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                : (isDark ? '#4B5563' : '#D1D5DB'),
              backgroundColor: item.purchased
                ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.purchased && (
              <Icon name={Icons.CHECKMARK} size={checkmarkSize} color="white" accessibilityLabel="Purchased" />
            )}
          </View>
        )}
      </HapticTouchableOpacity>

      {/* Name — tappable to open edit modal */}
      <HapticTouchableOpacity
        onPress={handlePress}
        onLongPress={() => {
          if (!selectionMode) onLongPress(item.id);
        }}
        className="flex-1 ml-3"
        style={inStoreMode ? { minHeight: 40 } : undefined}
      >
        <Text
          className={`font-medium ${
            item.purchased
              ? 'text-gray-400 dark:text-gray-500 line-through'
              : 'text-gray-900 dark:text-gray-100'
          }`}
          style={{ fontSize: inStoreMode ? 17 : 15 }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </HapticTouchableOpacity>

      {/* Right side: qty + price */}
      <View className="items-end ml-2" style={{ minWidth: 60 }}>
        {item.quantity && (
          <Text
            className={`text-xs ${
              item.purchased ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'
            }`}
            numberOfLines={1}
          >
            {item.quantity}
          </Text>
        )}
        {item.price != null && item.price > 0 && (
          <Text
            className={`text-xs font-semibold ${
              item.purchased ? 'text-gray-400 dark:text-gray-500' : 'text-green-600 dark:text-green-400'
            }`}
          >
            ${item.price.toFixed(2)}
          </Text>
        )}
      </View>

      {/* In-store: Can't Find button */}
      {!selectionMode && inStoreMode && !item.purchased && !isCantFind && (
        <HapticTouchableOpacity
          onPress={() => onCantFind?.(item.id)}
          className="px-2.5 py-1.5 rounded-lg ml-2"
          style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
        >
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Skip
          </Text>
        </HapticTouchableOpacity>
      )}
      {inStoreMode && isCantFind && (
        <View className="px-2.5 py-1.5 rounded-lg ml-2" style={{ backgroundColor: isDark ? '#7C2D12' : '#FEF2F2' }}>
          <Text className="text-xs font-medium" style={{ color: isDark ? '#FCA5A5' : '#DC2626' }}>
            Skipped
          </Text>
        </View>
      )}
    </View>
  );
}
