// frontend/components/shopping/ShoppingListProgress.tsx
// Progress ring + estimated cost card for shopping list (9L).

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import ProgressRing from '../ui/ProgressRing';
import { CountingNumber } from '../ui/AnimatedStatCounter';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Accent } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import { ShoppingListItem } from '../../types';

interface ShoppingListProgressProps {
  progressStats: {
    total: number;
    purchased: number;
    progress: number;
  };
  estimatedCost: number;
  spentSoFar: number;
  currentItems: ShoppingListItem[];
}

export default function ShoppingListProgress({
  progressStats,
  estimatedCost,
  spentSoFar,
  currentItems,
}: ShoppingListProgressProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (currentItems.length === 0) return null;

  const remaining = progressStats.total - progressStats.purchased;
  const progress = progressStats.total > 0
    ? progressStats.purchased / progressStats.total
    : 0;

  // Ring color transitions: orange → sage green as progress increases
  const ringColor = progress >= 0.8
    ? [Accent.sage, '#66BB6A']
    : progress >= 0.4
      ? [Accent.golden, Accent.sage]
      : [Colors.primary, Accent.peach];

  const progressText = progress >= 1
    ? 'All done! Time to cook!'
    : remaining <= 3 && remaining > 0
      ? `Almost done! ${remaining} item${remaining !== 1 ? 's' : ''} left`
      : `${progressStats.purchased} of ${progressStats.total} items`;

  return (
    <>
      {/* Progress Ring + Summary */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        gap: 16,
      }}>
        <ProgressRing
          progress={progress}
          size={80}
          strokeWidth={8}
          color={ringColor}
          testID="shopping-progress-ring"
        >
          <Text style={{
            fontSize: FontSize.lg,
            fontWeight: FontWeight.extrabold,
            color: isDark ? DarkColors.text.primary : Colors.text.primary,
          }}>
            {remaining}
          </Text>
          <Text style={{
            fontSize: 8,
            fontWeight: FontWeight.medium,
            color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary,
            marginTop: -1,
          }}>
            left
          </Text>
        </ProgressRing>

        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: FontSize.base,
            fontWeight: FontWeight.semibold,
            color: isDark ? DarkColors.text.primary : Colors.text.primary,
            marginBottom: 2,
          }}>
            {progressText}
          </Text>
          <Text style={{
            fontSize: FontSize.sm,
            color: isDark ? DarkColors.text.secondary : Colors.text.secondary,
          }}>
            {Math.round(progressStats.progress)}% complete
          </Text>
        </View>
      </View>

      {/* Estimated Total Cost */}
      {estimatedCost > 0 && (
        <View className="mx-4 mb-4">
          <View style={[{
            backgroundColor: isDark ? DarkColors.card : Colors.card,
            borderRadius: BorderRadius.card,
            padding: 16,
          }, Shadows.SM]}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Icon name={Icons.CART_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.accent : Colors.accent} accessibilityLabel="Estimated total" style={{ marginRight: 8 }} />
                <View>
                  <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">Estimated total</Text>
                  <Text className="text-2xl font-bold" style={{ color: isDark ? DarkColors.accent : Colors.accent }}>
                    ${estimatedCost.toFixed(2)}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500 dark:text-gray-400 italic">
                {currentItems.filter(item => !item.purchased).length} items
              </Text>
            </View>
            {spentSoFar > 0 && (
              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">Spent so far</Text>
                <Text className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ${spentSoFar.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </>
  );
}
