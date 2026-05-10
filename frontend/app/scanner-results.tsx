// frontend/app/scanner-results.tsx
// Results screen for food recognition — 10M enhanced with macros + Log This Meal
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';

import { View, Text, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MACRO_COLORS } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { BorderRadius } from '../constants/Spacing';
import { foodApi } from '../lib/api';

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

function getDefaultMealSlot(): MealSlot {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

export default function ScannerResultsScreen() {
  const { result, imageUri } = useLocalSearchParams<{
    result: string;
    imageUri: string;
  }>();

  let parsedResult: any = null;
  try {
    if (result) {
      parsedResult = JSON.parse(result);
    }
  } catch (e) {
    console.error('Failed to parse result:', e);
  }

  const [selectedMealSlot, setSelectedMealSlot] = useState<MealSlot>(getDefaultMealSlot());
  const [loggingMeal, setLoggingMeal] = useState(false);

  const handleLogMeal = useCallback(async () => {
    if (!parsedResult || loggingMeal) return;
    setLoggingMeal(true);

    try {
      const name = parsedResult.mealDescription || parsedResult.foods?.map((f: any) => f.name).join(', ') || 'Scanned Meal';
      const calories = parsedResult.totalEstimatedCalories || 0;
      const protein = parsedResult.totalEstimatedProtein || 0;
      const carbs = parsedResult.totalEstimatedCarbs || 0;
      const fat = parsedResult.totalEstimatedFat || 0;

      const createdItem = await foodApi.createItem({ name, calories, protein, carbs, fat });
      const foodItem = createdItem.data.foodItem;

      await foodApi.logFood({
        foodItemId: foodItem.id,
        mealType: selectedMealSlot,
        servings: 1,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Logged!', `${name} added to ${selectedMealSlot}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Oops!', 'Couldn\'t log that meal — try again?');
    } finally {
      setLoggingMeal(false);
    }
  }, [parsedResult, selectedMealSlot, loggingMeal]);

  if (!parsedResult) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
        <Text style={{ fontSize: 20, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1F2937', marginTop: 16, marginBottom: 8 }}>No Results</Text>
        <Text style={{ color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
          Unable to process the food recognition results.
        </Text>
        <GradientButton
          label="Go Back"
          onPress={() => router.back()}
          colors={GradientPresets.brand}
          icon="arrow-back"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' }}>
        <HapticTouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </HapticTouchableOpacity>
        <Text style={{ fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', color: '#1F2937' }}>Food Recognition</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', height: 200, borderRadius: 16, marginBottom: 16 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          )}

          {/* Summary with full macros */}
          <View style={[{ padding: 16, borderRadius: BorderRadius.card, backgroundColor: '#FFF5F0', marginBottom: 16 }, Shadows.MD]}>
            <Text style={{ fontSize: 17, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1F2937', marginBottom: 4 }}>
              {parsedResult.mealDescription || 'Food Items'}
            </Text>
            <Text style={{ fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold', color: MACRO_COLORS.calories.accent, marginBottom: 12 }}>
              {parsedResult.totalEstimatedCalories} cal
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              {([
                { label: 'Protein', value: `${parsedResult.totalEstimatedProtein || 0}g`, color: MACRO_COLORS.protein },
                { label: 'Carbs', value: `${parsedResult.totalEstimatedCarbs || 0}g`, color: MACRO_COLORS.carbs },
                { label: 'Fat', value: `${parsedResult.totalEstimatedFat || 0}g`, color: MACRO_COLORS.fat },
              ] as const).map(({ label, value, color }) => (
                <View key={label} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: color.accent }}>{value}</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Food items */}
          {parsedResult.foods && parsedResult.foods.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1F2937', marginBottom: 8 }}>Food Items:</Text>
              {parsedResult.foods.map((food: any, index: number) => (
                <View key={index} style={[{ padding: 12, borderRadius: BorderRadius.card, backgroundColor: '#FFF', marginBottom: 8 }, Shadows.SM]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1F2937' }}>{food.name}</Text>
                    <Text style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: MACRO_COLORS.calories.accent }}>{food.estimatedCalories} cal</Text>
                  </View>
                  {food.estimatedPortion && (
                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Portion: {food.estimatedPortion}</Text>
                  )}
                  <View style={{ flexDirection: 'row', marginTop: 6, gap: 12 }}>
                    <Text style={{ fontSize: 12, color: MACRO_COLORS.protein.accent }}>P: {food.estimatedProtein || 0}g</Text>
                    <Text style={{ fontSize: 12, color: MACRO_COLORS.carbs.accent }}>C: {food.estimatedCarbs || 0}g</Text>
                    <Text style={{ fontSize: 12, color: MACRO_COLORS.fat.accent }}>F: {food.estimatedFat || 0}g</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Meal slot picker */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Log to
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((slot) => (
                <HapticTouchableOpacity
                  key={slot}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedMealSlot(slot);
                  }}
                  pressedScale={0.95}
                  accessibilityLabel={`Log to ${slot}`}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: selectedMealSlot === slot ? MACRO_COLORS.calories.accent : '#F0EDE8',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontFamily: 'PlusJakartaSans_600SemiBold',
                    color: selectedMealSlot === slot ? '#FFFFFF' : '#6B7280',
                    textTransform: 'capitalize',
                  }}>
                    {slot}
                  </Text>
                </HapticTouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ marginTop: 16, gap: 10 }}>
            <HapticTouchableOpacity
              onPress={handleLogMeal}
              disabled={loggingMeal}
              pressedScale={0.97}
              accessibilityLabel="Log this meal"
              style={[
                {
                  paddingVertical: 16,
                  borderRadius: BorderRadius.xl,
                  backgroundColor: MACRO_COLORS.calories.accent,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loggingMeal ? 0.6 : 1,
                  gap: 8,
                },
                Shadows.MD,
              ]}
            >
              <Ionicons name="checkmark-circle" size={22} color="white" />
              <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' }}>
                {loggingMeal ? 'Logging...' : 'Log This Meal'}
              </Text>
            </HapticTouchableOpacity>

            <GradientButton
              label="Done"
              onPress={() => router.back()}
              colors={GradientPresets.brand}
              icon="checkmark-circle"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
