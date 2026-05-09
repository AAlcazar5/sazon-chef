// frontend/app/edit-budget.tsx
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import BudgetInputRow from '../components/budget/BudgetInputRow';
// Budget settings screen

import { View, Text, ScrollView, Alert } from 'react-native';
import AnimatedActivityIndicator from '../components/ui/AnimatedActivityIndicator';
import LoadingState from '../components/ui/LoadingState';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
      // Continue with defaults if error
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await costTrackingApi.updateBudget(budget);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Budget settings saved!', [
        { text: 'OK', onPress: () => router.back() },
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
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: isDark ? DarkColors.background : Colors.surface }} edges={['top']}>
        <LoadingState message="Loading your budget..." expression="thinking" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? DarkColors.background : Colors.surface }} edges={['top']}>
      <KeyboardAvoidingContainer>
      {/* Header */}
      <View className="px-4 py-4" style={{
        backgroundColor: isDark ? DarkColors.card : '#FFFFFF',
      }}>
        <View className="flex-row items-center">
          <HapticTouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color={isDark ? DarkColors.text.primary : Colors.text.primary} />
          </HapticTouchableOpacity>
          <Text className="text-2xl font-bold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Budget Settings</Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Info Banner */}
          <View className="p-4 rounded-lg mb-6 border" style={{
            backgroundColor: isDark ? `${Colors.secondaryRedLight}1A` : Colors.secondaryRedDark,
            borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark,
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
              {['USD', 'EUR', 'GBP', 'CAD'].map((currency) => {
                const isSelected = budget.currency === currency;
                return (
                  <HapticTouchableOpacity
                    key={currency}
                    onPress={() => setBudget({ ...budget, currency })}
                    className="px-4 py-2 rounded-lg border-2"
                    style={{
                      backgroundColor: isSelected 
                        ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark)
                        : (isDark ? '#1F2937' : '#FFFFFF'),
                      borderColor: isSelected 
                        ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark)
                        : (isDark ? DarkColors.border.light : Colors.border.light),
                    }}
                  >
                    <Text className="font-semibold" style={{ 
                      color: isSelected 
                        ? 'white' 
                        : (isDark ? DarkColors.text.primary : Colors.text.primary)
                    }}>
                      {currency}
                    </Text>
                  </HapticTouchableOpacity>
                );
              })}
            </View>
          </View>

          {(() => {
            const symbol = CURRENCY_SYMBOLS[budget.currency] ?? '$';
            return (
              <>
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
              </>
            );
          })()}

          {/* Save Button */}
          <HapticTouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="py-4 rounded-lg"
            style={{
              backgroundColor: saving 
                ? (isDark ? '#4B5563' : '#D1D5DB')
                : (isDark ? DarkColors.secondaryRed : Colors.secondaryRed),
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <AnimatedActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-lg">Save Budget Settings</Text>
            )}
          </HapticTouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
}

