// frontend/app/edit-budget.tsx
// Budget settings screen

import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { costTrackingApi } from '../lib/api';
import { BudgetSettings } from '../types';
import * as Haptics from 'expo-haptics';

export default function EditBudgetScreen() {
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await costTrackingApi.updateBudget(budget);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Budget settings saved!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error saving budget:', error);
      Alert.alert('Error', 'Failed to save budget settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="text-gray-600 mt-4">Loading budget settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">Budget Settings</Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Info Banner */}
          <View className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <View className="ml-3 flex-1">
                <Text className="text-blue-900 font-semibold mb-1">Budget-Based Recommendations</Text>
                <Text className="text-blue-700 text-sm">
                  Set your budget limits to filter recipes and get personalized recommendations that fit your budget.
                </Text>
              </View>
            </View>
          </View>

          {/* Currency Selection */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-2">Currency</Text>
            <View className="flex-row space-x-2">
              {['USD', 'EUR', 'GBP', 'CAD'].map((currency) => (
                <TouchableOpacity
                  key={currency}
                  onPress={() => setBudget({ ...budget, currency })}
                  className={`px-4 py-2 rounded-lg border-2 ${
                    budget.currency === currency
                      ? 'bg-orange-500 border-orange-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      budget.currency === currency ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {currency}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Max Recipe Cost */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              Max Recipe Cost ({budget.currency})
            </Text>
            <Text className="text-sm text-gray-600 mb-2">
              Maximum cost for a single recipe. Recipes exceeding this will be filtered out.
            </Text>
            <View className="flex-row items-center bg-white rounded-lg border border-gray-300">
              <Text className="text-gray-500 px-4 font-semibold">{budget.currency === 'USD' ? '$' : budget.currency === 'EUR' ? '€' : budget.currency === 'GBP' ? '£' : '$'}</Text>
              <TextInput
                placeholder="No limit"
                value={budget.maxRecipeCost?.toString() || ''}
                onChangeText={(text) => {
                  const value = text === '' ? undefined : parseFloat(text);
                  setBudget({ ...budget, maxRecipeCost: value || undefined });
                }}
                keyboardType="decimal-pad"
                className="flex-1 py-3 text-gray-900"
              />
            </View>
          </View>

          {/* Max Meal Cost */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              Max Meal Cost ({budget.currency})
            </Text>
            <Text className="text-sm text-gray-600 mb-2">
              Maximum cost per meal. Useful for meal planning.
            </Text>
            <View className="flex-row items-center bg-white rounded-lg border border-gray-300">
              <Text className="text-gray-500 px-4 font-semibold">{budget.currency === 'USD' ? '$' : budget.currency === 'EUR' ? '€' : budget.currency === 'GBP' ? '£' : '$'}</Text>
              <TextInput
                placeholder="No limit"
                value={budget.maxMealCost?.toString() || ''}
                onChangeText={(text) => {
                  const value = text === '' ? undefined : parseFloat(text);
                  setBudget({ ...budget, maxMealCost: value || undefined });
                }}
                keyboardType="decimal-pad"
                className="flex-1 py-3 text-gray-900"
              />
            </View>
          </View>

          {/* Daily Food Budget */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              Daily Food Budget ({budget.currency})
            </Text>
            <Text className="text-sm text-gray-600 mb-2">
              Maximum daily food spending. Helps track overall food costs.
            </Text>
            <View className="flex-row items-center bg-white rounded-lg border border-gray-300">
              <Text className="text-gray-500 px-4 font-semibold">{budget.currency === 'USD' ? '$' : budget.currency === 'EUR' ? '€' : budget.currency === 'GBP' ? '£' : '$'}</Text>
              <TextInput
                placeholder="No limit"
                value={budget.maxDailyFoodBudget?.toString() || ''}
                onChangeText={(text) => {
                  const value = text === '' ? undefined : parseFloat(text);
                  setBudget({ ...budget, maxDailyFoodBudget: value || undefined });
                }}
                keyboardType="decimal-pad"
                className="flex-1 py-3 text-gray-900"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`bg-orange-500 py-4 rounded-lg ${saving ? 'opacity-50' : ''}`}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-lg">Save Budget Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

