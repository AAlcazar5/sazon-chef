// frontend/components/profile/BudgetCard.tsx
// Budget settings display card

import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { router } from 'expo-router';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';

interface BudgetCardProps {
  budgetSettings: any | null;
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
  };
  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}

export default function BudgetCard({ budgetSettings }: BudgetCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedDark }}>
            <Icon name={Icons.CART} size={IconSizes.MD} color={isDark ? DarkColors.secondaryRed : '#FFFFFF'} accessibilityLabel="Budget settings" />
          </View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Budget Settings</Text>
        </View>
        <HapticTouchableOpacity onPress={() => router.push('/edit-budget')}>
          <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit" />
        </HapticTouchableOpacity>
      </View>

      {budgetSettings ? (
        <View className="space-y-2">
          {budgetSettings.maxRecipeCost !== undefined && budgetSettings.maxRecipeCost !== null && (
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Max Recipe Cost</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(budgetSettings.maxRecipeCost, budgetSettings.currency)}
              </Text>
            </View>
          )}
          {budgetSettings.maxMealCost !== undefined && budgetSettings.maxMealCost !== null && (
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Max Meal Cost</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(budgetSettings.maxMealCost, budgetSettings.currency)}
              </Text>
            </View>
          )}
          {budgetSettings.maxDailyFoodBudget !== undefined && budgetSettings.maxDailyFoodBudget !== null && (
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Daily Food Budget</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(budgetSettings.maxDailyFoodBudget, budgetSettings.currency)}
              </Text>
            </View>
          )}
          {(!budgetSettings.maxRecipeCost && !budgetSettings.maxMealCost && !budgetSettings.maxDailyFoodBudget) && (
            <Text className="text-sm text-gray-500 dark:text-gray-400">No budget limits set</Text>
          )}
        </View>
      ) : (
        <HapticTouchableOpacity
          onPress={() => router.push('/edit-budget')}
          className="p-3 rounded-lg border"
          style={{
            backgroundColor: isDark ? `${Colors.secondaryRedLight}1A` : Colors.secondaryRedDark,
            borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark,
          }}
        >
          <View className="flex-row items-center">
            <Icon name={Icons.CART} size={IconSizes.MD} color={isDark ? DarkColors.secondaryRed : '#FFFFFF'} accessibilityLabel="Budget settings" />
            <Text className="font-medium ml-2" style={{ color: isDark ? DarkColors.secondaryRed : '#FFFFFF' }}>
              Set up your budget settings
            </Text>
          </View>
          <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.secondaryRed : '#FFFFFF' }}>
            Get recipe recommendations that fit your budget
          </Text>
        </HapticTouchableOpacity>
      )}
    </View>
  );
}
