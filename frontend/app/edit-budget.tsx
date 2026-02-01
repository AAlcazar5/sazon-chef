// frontend/app/edit-budget.tsx
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
// Budget settings screen

import { View, Text, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { costTrackingApi } from '../lib/api';
import { BudgetSettings } from '../types';
import * as Haptics from 'expo-haptics';
import { Colors, DarkColors } from '../constants/Colors';
import { useColorScheme } from 'nativewind';

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
      Alert.alert('Error', 'Failed to save budget settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: isDark ? '#111827' : '#F9FAFB' }} edges={['top']}>
        <ActivityIndicator size="large" color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed} />
        <Text className="mt-4" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Loading budget settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? '#111827' : '#F9FAFB' }} edges={['top']}>
      <KeyboardAvoidingContainer>
      {/* Header */}
      <View className="px-4 py-4 border-b" style={{ 
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderBottomColor: isDark ? DarkColors.border.light : Colors.border.light,
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

          {/* Max Recipe Cost */}
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              Max Recipe Cost ({budget.currency})
            </Text>
            <Text className="text-sm mb-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              Maximum cost for a single recipe. Recipes exceeding this will be filtered out.
            </Text>
            <View className="flex-row items-center rounded-lg border" style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderColor: isDark ? DarkColors.border.light : Colors.border.light,
              borderWidth: 1,
            }}>
              <Text className="px-4 font-semibold" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                {budget.currency === 'USD' ? '$' : budget.currency === 'EUR' ? '€' : budget.currency === 'GBP' ? '£' : '$'}
              </Text>
              <TextInput
                placeholder="No limit"
                value={budget.maxRecipeCost?.toString() || ''}
                onChangeText={(text) => {
                  const value = text === '' ? undefined : parseFloat(text);
                  setBudget({ ...budget, maxRecipeCost: value || undefined });
                }}
                keyboardType="decimal-pad"
                className="flex-1 py-3"
                style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}
                placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
              />
            </View>
          </View>

          {/* Max Meal Cost */}
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              Max Meal Cost ({budget.currency})
            </Text>
            <Text className="text-sm mb-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              Maximum cost per meal. Useful for meal planning.
            </Text>
            <View className="flex-row items-center rounded-lg border" style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderColor: isDark ? DarkColors.border.light : Colors.border.light,
              borderWidth: 1,
            }}>
              <Text className="px-4 font-semibold" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                {budget.currency === 'USD' ? '$' : budget.currency === 'EUR' ? '€' : budget.currency === 'GBP' ? '£' : '$'}
              </Text>
              <TextInput
                placeholder="No limit"
                value={budget.maxMealCost?.toString() || ''}
                onChangeText={(text) => {
                  const value = text === '' ? undefined : parseFloat(text);
                  setBudget({ ...budget, maxMealCost: value || undefined });
                }}
                keyboardType="decimal-pad"
                className="flex-1 py-3"
                style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}
                placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
              />
            </View>
          </View>

          {/* Daily Food Budget */}
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              Daily Food Budget ({budget.currency})
            </Text>
            <Text className="text-sm mb-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              Maximum daily food spending. Helps track overall food costs.
            </Text>
            <View className="flex-row items-center rounded-lg border" style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderColor: isDark ? DarkColors.border.light : Colors.border.light,
              borderWidth: 1,
            }}>
              <Text className="px-4 font-semibold" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                {budget.currency === 'USD' ? '$' : budget.currency === 'EUR' ? '€' : budget.currency === 'GBP' ? '£' : '$'}
              </Text>
              <TextInput
                placeholder="No limit"
                value={budget.maxDailyFoodBudget?.toString() || ''}
                onChangeText={(text) => {
                  const value = text === '' ? undefined : parseFloat(text);
                  setBudget({ ...budget, maxDailyFoodBudget: value || undefined });
                }}
                keyboardType="decimal-pad"
                className="flex-1 py-3"
                style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}
                placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
              />
            </View>
          </View>

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
              <ActivityIndicator color="white" />
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

