// frontend/components/shopping/ShoppingListCategory.tsx
// Category grouping component for recipe-grouped view

import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import SwipeableItem from '../ui/SwipeableItem';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { ShoppingListItem as ShoppingListItemType } from '../../types';
import ShoppingListItem from './ShoppingListItem';

interface RecipeGroup {
  recipe: any;
  items: ShoppingListItemType[];
}

interface ShoppingListCategoryProps {
  itemsByRecipe: {
    grouped: { [recipeId: string]: RecipeGroup };
    noRecipe: ShoppingListItemType[];
  };
  selectionMode: boolean;
  selectedItems: string[];
  cantFindItems?: string[];
  inStoreMode?: boolean;
  onTogglePurchased: (item: ShoppingListItemType) => void;
  onEditQuantity: (item: ShoppingListItemType) => void;
  onDeleteItem: (item: ShoppingListItemType) => void;
  onToggleSelection: (itemId: string) => void;
  onLongPress: (itemId: string) => void;
  onCantFind?: (itemId: string) => void;
}

export default function ShoppingListCategory({
  itemsByRecipe,
  selectionMode,
  selectedItems,
  cantFindItems = [],
  inStoreMode = false,
  onTogglePurchased,
  onEditQuantity,
  onDeleteItem,
  onToggleSelection,
  onLongPress,
  onCantFind,
}: ShoppingListCategoryProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const selectedItemsSet = new Set(selectedItems);

  return (
    <>
      {/* Grouped by Recipe */}
      {Object.values(itemsByRecipe.grouped).map((group) => (
        <View key={group.recipe.id} className="mb-6">
          <HapticTouchableOpacity
            onPress={() => router.push(`/recipe/${group.recipe.id}` as any)}
            className="flex-row items-center mb-3 p-3 rounded-lg"
            style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
          >
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {group.recipe.title}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
            <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.SM} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="View recipe" />
          </HapticTouchableOpacity>
          {group.items.map((item) => (
            <SwipeableItem
              key={item.id}
              onDelete={() => onDeleteItem(item)}
              disabled={selectionMode}
            >
              <ShoppingListItem
                item={item}
                selectionMode={selectionMode}
                isSelected={selectedItemsSet.has(item.id)}
                groupByRecipe={true}
                inStoreMode={inStoreMode}
                isCantFind={cantFindItems.includes(item.id)}
                onTogglePurchased={onTogglePurchased}
                onEditQuantity={onEditQuantity}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onCantFind={onCantFind}
              />
            </SwipeableItem>
          ))}
        </View>
      ))}
      {/* Items without recipe */}
      {itemsByRecipe.noRecipe.length > 0 && (
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Other Items</Text>
          {itemsByRecipe.noRecipe.map((item) => (
            <SwipeableItem
              key={item.id}
              onDelete={() => onDeleteItem(item)}
              disabled={selectionMode}
            >
              <ShoppingListItem
                item={item}
                selectionMode={selectionMode}
                isSelected={selectedItemsSet.has(item.id)}
                groupByRecipe={true}
                inStoreMode={inStoreMode}
                isCantFind={cantFindItems.includes(item.id)}
                onTogglePurchased={onTogglePurchased}
                onEditQuantity={onEditQuantity}
                onToggleSelection={onToggleSelection}
                onLongPress={onLongPress}
                onCantFind={onCantFind}
              />
            </SwipeableItem>
          ))}
        </View>
      )}
    </>
  );
}
