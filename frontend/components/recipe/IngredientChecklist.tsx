// frontend/components/recipe/IngredientChecklist.tsx
// Ingredient checklist for cooking mode — with check-off, scaling, and serving counter

import { View, Text, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors } from '../../constants/Colors';

function IngredientRow({ index, isChecked, scaledText, onToggle }: {
  index: number;
  isChecked: boolean;
  scaledText: string;
  onToggle: (index: number) => void;
}) {
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(isChecked ? 1 : 0);

  const handlePress = () => {
    // Spring scale bounce on check
    scale.value = withSequence(
      withSpring(0.95, { damping: 12, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    if (!isChecked) {
      checkScale.value = withSequence(
        withSpring(1.3, { damping: 6, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
    } else {
      checkScale.value = withSpring(0, { damping: 12, stiffness: 200 });
    }
    onToggle(index);
  };

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Animated.View style={rowStyle}>
      <HapticTouchableOpacity
        onPress={handlePress}
        hapticStyle="light"
        className="flex-row items-start py-2.5 gap-3"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
      >
        {/* Checkbox */}
        <View
          className="w-6 h-6 rounded-full border-2 items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            borderColor: isChecked ? '#22C55E' : '#4B5563',
            backgroundColor: isChecked ? '#22C55E' : 'transparent',
          }}
        >
          {isChecked && (
            <Animated.View style={checkStyle}>
              <Icon name={Icons.CHECKMARK} size={14} color="white" />
            </Animated.View>
          )}
        </View>

        {/* Ingredient text */}
        <Text
          className="flex-1 text-base leading-6"
          style={{
            color: isChecked ? '#6B7280' : '#E5E7EB',
            textDecorationLine: isChecked ? 'line-through' : 'none',
          }}
        >
          {scaledText}
        </Text>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

interface IngredientChecklistProps {
  /** Ingredient text strings (e.g. "1 cup flour") */
  ingredients: string[];
  /** Currently checked ingredient indices */
  checkedIndices: Set<number>;
  /** Toggle an ingredient checked state */
  onToggle: (index: number) => void;
  /** Current serving count */
  servings: number;
  /** Original recipe serving count */
  originalServings: number;
  /** Update serving count */
  onServingsChange: (servings: number) => void;
}

export default function IngredientChecklist({
  ingredients,
  checkedIndices,
  onToggle,
  servings,
  originalServings,
  onServingsChange,
}: IngredientChecklistProps) {
  const checkedCount = checkedIndices.size;
  const ratio = originalServings > 0 ? servings / originalServings : 1;

  return (
    <View className="flex-1">
      {/* Serving counter */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2 border-b border-gray-700">
        <Text className="text-sm font-semibold text-gray-300">
          Ingredients
          {checkedCount > 0 && (
            <Text className="text-green-400"> · {checkedCount}/{ingredients.length} prepped</Text>
          )}
        </Text>
        <View className="flex-row items-center gap-3">
          <Text className="text-xs text-gray-400">Servings:</Text>
          <HapticTouchableOpacity
            onPress={() => onServingsChange(Math.max(1, servings - 1))}
            hapticStyle="light"
            className="w-7 h-7 rounded-full bg-gray-700 items-center justify-center"
          >
            <Text className="text-white font-bold text-base">−</Text>
          </HapticTouchableOpacity>
          <Text className="text-white font-bold text-base w-5 text-center">{servings}</Text>
          <HapticTouchableOpacity
            onPress={() => onServingsChange(Math.min(99, servings + 1))}
            hapticStyle="light"
            className="w-7 h-7 rounded-full bg-gray-700 items-center justify-center"
          >
            <Text className="text-white font-bold text-base">+</Text>
          </HapticTouchableOpacity>
        </View>
      </View>

      {/* Ingredients list */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}
      >
        {ingredients.map((ingredient, index) => {
          const isChecked = checkedIndices.has(index);
          const scaledText = scaleIngredientText(ingredient, ratio);

          return (
            <IngredientRow
              key={index}
              index={index}
              isChecked={isChecked}
              scaledText={scaledText}
              onToggle={onToggle}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * Scale ingredient quantities in a text string by a ratio.
 * E.g. "2 cups flour" × 1.5 → "3 cups flour"
 * Falls back to original text if no quantity found.
 */
function scaleIngredientText(text: string, ratio: number): string {
  if (Math.abs(ratio - 1) < 0.01) return text; // No scaling needed

  // Match leading number(s): "2", "1/2", "1 1/2", "0.5"
  const pattern = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/;
  const match = text.match(pattern);
  if (!match) return text;

  const originalAmount = parseFraction(match[1]);
  if (originalAmount === 0) return text;

  const scaledAmount = originalAmount * ratio;
  const scaledStr = formatAmount(scaledAmount);

  return text.replace(match[0], scaledStr);
}

function parseFraction(str: string): number {
  // "1 1/2"
  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  }
  // "1/2"
  const frac = str.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    return parseInt(frac[1], 10) / parseInt(frac[2], 10);
  }
  return parseFloat(str) || 0;
}

function formatAmount(n: number): string {
  if (n <= 0) return '0';

  // Common fractions display
  const fractions: Array<[number, string]> = [
    [1 / 8, '⅛'],
    [1 / 4, '¼'],
    [1 / 3, '⅓'],
    [3 / 8, '⅜'],
    [1 / 2, '½'],
    [5 / 8, '⅝'],
    [2 / 3, '⅔'],
    [3 / 4, '¾'],
    [7 / 8, '⅞'],
  ];

  const whole = Math.floor(n);
  const frac = n - whole;

  for (const [value, symbol] of fractions) {
    if (Math.abs(frac - value) < 0.04) {
      return whole > 0 ? `${whole} ${symbol}` : symbol;
    }
  }

  // If close to whole number
  if (frac < 0.04) return String(whole);

  // Decimal fallback
  return n % 1 === 0 ? String(whole) : n.toFixed(1).replace(/\.0$/, '');
}
