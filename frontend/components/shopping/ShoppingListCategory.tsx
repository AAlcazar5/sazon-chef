// frontend/components/shopping/ShoppingListCategory.tsx
// Category grouping component for recipe-grouped view

import { View, Text, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import SwipeableItem from '../ui/SwipeableItem';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
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

// Header for a recipe group — flashes green when all items are purchased
function RecipeGroupHeader({
  recipe,
  itemCount,
  allPurchased,
  isDark,
}: {
  recipe: any;
  itemCount: number;
  allPurchased: boolean;
  isDark: boolean;
}) {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const prevAllPurchased = useRef(false);

  useEffect(() => {
    if (allPurchased && !prevAllPurchased.current) {
      // Flash: fade in green overlay, then fade back out
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 600, delay: 400, useNativeDriver: false }),
      ]).start();
    }
    prevAllPurchased.current = allPurchased;
  }, [allPurchased]);

  const baseColor = isDark ? `${Colors.primaryLight}33` : Colors.primaryLight;
  const backgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [baseColor, isDark ? '#14532D' : '#DCFCE7'],
  });

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
          padding: 14,
          borderRadius: 20,
          opacity: allPurchased ? 0.6 : 1,
        },
        Shadows.SM,
        { backgroundColor },
      ]}
    >
      <HapticTouchableOpacity
        onPress={() => router.push(`/recipe/${recipe.id}` as any)}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
      >
        <View className="flex-1">
          <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
            {recipe.title}
            {allPurchased ? ' ✓' : ''}
          </Text>
          <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.SM} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="View recipe" />
      </HapticTouchableOpacity>
    </Animated.View>
  );
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
      {Object.values(itemsByRecipe.grouped).map((group) => {
        const allPurchased = group.items.length > 0 && group.items.every((item) => item.purchased);
        return (
        <View key={group.recipe.id} className="mb-6">
          <RecipeGroupHeader
            recipe={group.recipe}
            itemCount={group.items.length}
            allPurchased={allPurchased}
            isDark={isDark}
          />
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
        );
      })}
      {/* Items without recipe */}
      {itemsByRecipe.noRecipe.length > 0 && (
        <View className="mb-6">
          <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#D1D5DB' : '#374151', marginBottom: 12 }}>Other Items</Text>
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
