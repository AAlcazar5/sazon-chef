// frontend/components/shopping/ShoppingListItem.tsx
// Individual shopping list item component

import { View, Text } from 'react-native';
import { router } from 'expo-router';
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
  onAddToPantry,
}: ShoppingListItemProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const checkboxSize = inStoreMode ? 36 : 28;
  const checkmarkSize = inStoreMode ? 24 : 18;

  return (
    <View
      className={`flex-row items-center justify-between rounded-xl mb-3 ${
        item.purchased ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-800'
      } ${selectionMode && isSelected ? 'border-2' : ''} ${!item.purchased ? 'border border-gray-200 dark:border-gray-700' : ''}`}
      style={[
        { padding: inStoreMode ? 18 : 16 },
        selectionMode && isSelected ? {
          borderColor: isDark ? DarkColors.primary : Colors.primary,
          backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight,
        } : item.purchased ? {
          opacity: 0.6,
        } : undefined,
      ]}
    >
      <HapticTouchableOpacity
        onPress={() => {
          if (selectionMode) {
            onToggleSelection(item.id);
          } else {
            onTogglePurchased(item);
          }
        }}
        onLongPress={() => {
          if (!selectionMode) {
            onLongPress(item.id);
          }
        }}
        className="flex-1 flex-row items-center"
        style={inStoreMode ? { minHeight: 44 } : undefined}
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
              borderWidth: inStoreMode ? 3 : 2.5,
              borderColor: item.purchased
                ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                : '#D1D5DB',
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
        <View className="ml-4 flex-1">
          <View className="flex-row items-center">
            <Text
              className={`font-semibold ${
                item.purchased
                  ? 'text-gray-500 dark:text-gray-400 line-through'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
              style={{ fontSize: inStoreMode ? 18 : 16 }}
            >
              {item.name}
            </Text>
            {isPantryItem && !inStoreMode && (
              <View
                className="ml-1.5 px-1.5 py-0.5 rounded"
                style={{ backgroundColor: isDark ? '#1E3A2F' : '#ECFDF5' }}
              >
                <Text style={{ fontSize: 10, color: isDark ? '#6EE7B7' : '#065F46', fontWeight: '600' }}>
                  PANTRY
                </Text>
              </View>
            )}
          </View>
          {item.quantity && (
            <Text className={`mt-1 ${
              item.purchased
                ? 'text-gray-500 dark:text-gray-400'
                : 'text-gray-600 dark:text-gray-400'
            }`} style={{ fontSize: inStoreMode ? 15 : 14 }}>
              {item.quantity}
            </Text>
          )}
          {item.price != null && item.price > 0 && (
            <Text
              className={`mt-0.5 ${
                item.purchased
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
              style={{ fontSize: inStoreMode ? 15 : 14, fontWeight: '600' }}
            >
              ${item.price.toFixed(2)}
            </Text>
          )}
          {item.notes && !inStoreMode && (
            <Text
              className="mt-0.5 text-gray-500 dark:text-gray-400 italic"
              style={{ fontSize: 13 }}
              numberOfLines={1}
            >
              {item.notes}
            </Text>
          )}
          {item.recipe && !groupByRecipe && !inStoreMode && (
            <HapticTouchableOpacity
              onPress={() => router.push(`/recipe/${item.recipeId}` as any)}
              className="flex-row items-center mt-1"
            >
              <Icon name={Icons.RESTAURANT_OUTLINE} size={12} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="View recipe" style={{ marginRight: 4 }} />
              <Text className="text-xs" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                {item.recipe.title}
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>
      </HapticTouchableOpacity>
      {!selectionMode && !inStoreMode && (
        <View className="flex-row items-center">
          {!isPantryItem && onAddToPantry && (
            <HapticTouchableOpacity
              onPress={() => onAddToPantry(item.name, item.category)}
              className="p-2"
            >
              <Icon
                name={Icons.HOME_OUTLINE}
                size={IconSizes.MD}
                color={isDark ? '#6EE7B7' : '#059669'}
                accessibilityLabel="Add to pantry"
              />
            </HapticTouchableOpacity>
          )}
          <HapticTouchableOpacity
            onPress={() => onEditQuantity(item)}
            className="p-2 ml-1"
          >
            <Icon
              name={Icons.EDIT_OUTLINE}
              size={IconSizes.MD}
              color={isDark ? "#9CA3AF" : "#6B7280"}
              accessibilityLabel="Edit quantity"
            />
          </HapticTouchableOpacity>
        </View>
      )}
      {!selectionMode && inStoreMode && !item.purchased && !isCantFind && (
        <HapticTouchableOpacity
          onPress={() => onCantFind?.(item.id)}
          className="px-3 py-2 rounded-lg ml-2"
          style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
        >
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Can't find
          </Text>
        </HapticTouchableOpacity>
      )}
      {inStoreMode && isCantFind && (
        <View className="px-3 py-2 rounded-lg ml-2" style={{ backgroundColor: isDark ? '#7C2D12' : '#FEF2F2' }}>
          <Text className="text-xs font-medium" style={{ color: isDark ? '#FCA5A5' : '#DC2626' }}>
            Skipped
          </Text>
        </View>
      )}
    </View>
  );
}
