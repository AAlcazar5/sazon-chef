// frontend/components/shopping/ShoppingListItem.tsx
// Individual shopping list item component — simplified view
// Default: checkbox + name + qty/price (right-aligned). Tap row → edit modal.
// In-store: larger checkboxes + "Can't find" button.

import { View, Text, Animated } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { ShoppingListItem as ShoppingListItemType } from '../../types';
import { HapticChoreography } from '../../utils/hapticChoreography';

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
  const router = useRouter();

  const checkboxSize = inStoreMode ? 36 : 26;
  const checkmarkSize = inStoreMode ? 24 : 16;

  // Spring scale for the checkbox circle on check/uncheck
  const checkScale = useRef(new Animated.Value(1)).current;
  // Opacity for the checkmark icon (fades in/out)
  const checkOpacity = useRef(new Animated.Value(item.purchased ? 1 : 0)).current;
  // Strikethrough line width: 0 → '100%' (JS driver needed for layout)
  const strikeWidth = useRef(new Animated.Value(item.purchased ? 1 : 0)).current;
  // Row opacity fades when purchased
  const rowOpacity = useRef(new Animated.Value(item.purchased ? 0.5 : 1)).current;

  useEffect(() => {
    if (item.purchased) {
      // Checkbox spring bounce
      Animated.sequence([
        Animated.spring(checkScale, { toValue: 1.3, friction: 3, tension: 400, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }),
      ]).start();
      // Checkmark fade-in
      Animated.timing(checkOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      // Strikethrough grows across the text
      Animated.timing(strikeWidth, { toValue: 1, duration: 280, delay: 80, useNativeDriver: false }).start();
      // Row dims
      Animated.timing(rowOpacity, { toValue: 0.5, duration: 300, useNativeDriver: true }).start();
    } else {
      // Reverse everything instantly on uncheck
      Animated.timing(checkOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      strikeWidth.setValue(0);
      Animated.timing(rowOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [item.purchased]);

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
      // Choreographed haptic: fires at animation peak (~80ms into spring bounce)
      if (!item.purchased) {
        HapticChoreography.itemCheckOff();
      } else {
        HapticChoreography.itemUncheck();
      }
      onTogglePurchased(item);
    }
  };

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 16,
          marginBottom: 8,
          paddingVertical: inStoreMode ? 14 : 12,
          paddingHorizontal: inStoreMode ? 16 : 14,
          backgroundColor: item.purchased
            ? (isDark ? '#1A1A1C' : '#F9F9FB')
            : (isDark ? '#1C1C1E' : '#FFFFFF'),
        },
        !item.purchased && Shadows.SM,
        selectionMode && isSelected ? {
          backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight,
          borderWidth: 2,
          borderColor: isDark ? DarkColors.primary : Colors.primary,
        } : undefined,
        { opacity: rowOpacity },
      ]}
    >
      {/* Checkbox — hapticDisabled because HapticChoreography owns the timing */}
      <HapticTouchableOpacity
        onPress={handleCheckboxPress}
        hapticDisabled
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
          <Animated.View
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
              transform: [{ scale: checkScale }],
            }}
          >
            <Animated.View style={{ opacity: checkOpacity }}>
              <Icon name={Icons.CHECKMARK} size={checkmarkSize} color="white" accessibilityLabel="Purchased" />
            </Animated.View>
          </Animated.View>
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
        <View style={{ position: 'relative', justifyContent: 'center' }}>
          <Text
            className={`font-medium ${
              item.purchased
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-900 dark:text-gray-100'
            }`}
            style={{ fontSize: inStoreMode ? 17 : 15 }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {/* Recipe origin tag — hidden when already grouped by recipe */}
          {!groupByRecipe && item.recipe?.title && !item.purchased && (
            <HapticTouchableOpacity
              onPress={() => router.push(`/recipe/${item.recipeId}` as any)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}
            >
              <Icon
                name={Icons.RESTAURANT_OUTLINE as any}
                size={11}
                color={isDark ? '#9CA3AF' : '#6B7280'}
                style={{ marginRight: 3 }}
              />
              <Text
                style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280' }}
                numberOfLines={1}
              >
                {item.recipe.title}
              </Text>
            </HapticTouchableOpacity>
          )}
          {/* Animated strikethrough line */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              height: 1.5,
              borderRadius: 1,
              backgroundColor: isDark ? '#6B7280' : '#9CA3AF',
              width: strikeWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }}
            pointerEvents="none"
          />
        </View>
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
          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, marginLeft: 8, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '500', color: isDark ? '#9CA3AF' : '#6B7280' }}>
            Skip
          </Text>
        </HapticTouchableOpacity>
      )}
      {inStoreMode && isCantFind && (
        <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, marginLeft: 8, backgroundColor: isDark ? '#7C2D12' : '#FEF2F2' }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: isDark ? '#FCA5A5' : '#DC2626' }}>
            Skipped
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
