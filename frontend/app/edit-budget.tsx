// frontend/app/edit-budget.tsx
// Budget settings screen
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import BrandButton from '../components/ui/BrandButton';
import EditScreenShell from '../components/edit/EditScreenShell';
import BudgetInputRow from '../components/budget/BudgetInputRow';

import { View, Text, Alert } from 'react-native';
import LoadingState from '../components/ui/LoadingState';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { costTrackingApi } from '../lib/api';
import { BudgetSettings } from '../types';
import * as Haptics from 'expo-haptics';
import { Colors, DarkColors } from '../constants/Colors';
import { useColorScheme } from 'nativewind';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: '$',
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'] as const;

export default function EditBudgetScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [budget, setBudget] = useState<BudgetSettings>({
    maxRecipeCost: undefined,
    maxMealCost: undefined,
    maxDailyFoodBudget: undefined,
    currency: 'USD',
  });

  useEffect(() => {
    loadBudget();
  }, []);

  const loadBudget = async () => {
    try {
      setLoading(true);
      const response = await costTrackingApi.getBudget();
      setBudget(response.data);
    } catch (error: any) {
      console.error('Error loading budget:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await costTrackingApi.updateBudget(budget);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Locked in', "We'll keep the plate inside your number.", [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error saving budget:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Oops!', 'Couldn\'t save your budget — try again?');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <EditScreenShell title="Budget Settings" noScroll>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <LoadingState message="Loading your budget..." expression="thinking" />
        </View>
      </EditScreenShell>
    );
  }

  const symbol = CURRENCY_SYMBOLS[budget.currency] ?? '$';

  return (
    <EditScreenShell title="Budget Settings">
      {/* Info Banner */}
      <View className="p-4 rounded-2xl mb-6" style={{
        backgroundColor: isDark ? `${Colors.secondaryRedLight}1A` : Colors.secondaryRedDark,
      }}>
        <View className="flex-row items-start">
          <Ionicons name="information-circle" size={24} color={isDark ? DarkColors.secondaryRed : '#FFFFFF'} />
          <View className="ml-3 flex-1">
            <Text className="font-semibold mb-1" style={{ color: isDark ? DarkColors.secondaryRed : '#FFFFFF' }}>Budget-Based Recommendations</Text>
            <Text className="text-sm" style={{ color: isDark ? DarkColors.secondaryRed : '#FFFFFF' }}>
              Set your budget limits to filter recipes and get personalized recommendations that fit your budget.
            </Text>
          </View>
        </View>
      </View>

      {/* Currency Selection */}
      <View className="mb-6">
        <Text className="text-lg font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Currency</Text>
        <View className="flex-row space-x-2">
          {CURRENCIES.map((currency) => {
            const isSelected = budget.currency === currency;
            return (
              <HapticTouchableOpacity
                key={currency}
                onPress={() => setBudget({ ...budget, currency })}
                accessibilityRole="button"
                accessibilityLabel={`Set currency to ${currency}`}
                accessibilityState={{ selected: isSelected }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 100,
                  backgroundColor: isSelected
                    ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark)
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'),
                }}
              >
                <Text className="font-semibold" style={{
                  color: isSelected
                    ? 'white'
                    : (isDark ? DarkColors.text.primary : Colors.text.primary),
                }}>
                  {currency}
                </Text>
              </HapticTouchableOpacity>
            );
          })}
        </View>
      </View>

      <BudgetInputRow
        title={`Max Recipe Cost (${budget.currency})`}
        description="Maximum cost for a single recipe. Recipes exceeding this will be filtered out."
        currencySymbol={symbol}
        value={budget.maxRecipeCost}
        onChange={(v) => setBudget({ ...budget, maxRecipeCost: v })}
        isDark={isDark}
      />
      <BudgetInputRow
        title={`Max Meal Cost (${budget.currency})`}
        description="Maximum cost per meal. Useful for meal planning."
        currencySymbol={symbol}
        value={budget.maxMealCost}
        onChange={(v) => setBudget({ ...budget, maxMealCost: v })}
        isDark={isDark}
      />
      <BudgetInputRow
        title={`Daily Food Budget (${budget.currency})`}
        description="Maximum daily food spending. Helps track overall food costs."
        currencySymbol={symbol}
        value={budget.maxDailyFoodBudget}
        onChange={(v) => setBudget({ ...budget, maxDailyFoodBudget: v })}
        isDark={isDark}
      />

      {/* Save Button */}
      <BrandButton
        label="Save Budget Settings"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
      />
    </EditScreenShell>
  );
}

