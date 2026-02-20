// frontend/components/meal-plan/QuickMealLogModal.tsx
// Quick meal log modal for logging meals without a full recipe

import { useState } from 'react';
import { View, Text, Modal, TextInput, Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';
import { mealPlanApi } from '../../lib/api';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '☀️' },
  { key: 'dinner', label: 'Dinner', icon: '🌙' },
  { key: 'snack', label: 'Snack', icon: '🍎' },
] as const;

function getDefaultMealType(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export default function QuickMealLogModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [name, setName] = useState('');
  const [mealType, setMealType] = useState(getDefaultMealType);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setName('');
    setMealType(getDefaultMealType());
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setNotes('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a meal name');
      return;
    }
    const cal = parseFloat(calories);
    if (!calories || isNaN(cal) || cal < 0) {
      setError('Please enter valid calories');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await mealPlanApi.quickLogMeal({
        name: name.trim(),
        mealType,
        calories: cal,
        protein: protein ? parseFloat(protein) : undefined,
        carbs: carbs ? parseFloat(carbs) : undefined,
        fat: fat ? parseFloat(fat) : undefined,
        notes: notes.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      onClose();
    } catch (err) {
      setError('Failed to log meal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const inputBg = isDark ? '#374151' : '#F3F4F6';
  const inputText = isDark ? '#F3F4F6' : '#1F2937';
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';
  const canSubmit = name.trim() && calories && !loading;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            className="mx-6 rounded-2xl p-6"
            style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              width: Dimensions.get('window').width - 48,
              maxHeight: Dimensions.get('window').height * 0.8,
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View className="flex-row items-center justify-between mb-5">
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-2">🍽️</Text>
                  <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Log a Meal</Text>
                </View>
                <HapticTouchableOpacity onPress={handleClose} accessibilityLabel="Close meal log">
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </HapticTouchableOpacity>
              </View>

              {/* Meal Name */}
              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                What did you eat?
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Chicken salad, PB&J sandwich..."
                placeholderTextColor={placeholderColor}
                className="rounded-xl px-4 py-3 text-base mb-4"
                style={{ backgroundColor: inputBg, color: inputText }}
                accessibilityLabel="Meal name"
                returnKeyType="next"
              />

              {/* Meal Type */}
              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Meal type
              </Text>
              <View className="flex-row mb-4" style={{ gap: 8 }}>
                {MEAL_TYPES.map(({ key, label, icon }) => (
                  <HapticTouchableOpacity
                    key={key}
                    onPress={() => setMealType(key)}
                    className="flex-1 py-2.5 rounded-full items-center"
                    style={{
                      backgroundColor: mealType === key
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : (isDark ? '#374151' : '#F3F4F6'),
                    }}
                    accessibilityLabel={`${label} meal type`}
                    accessibilityState={{ selected: mealType === key }}
                  >
                    <Text className="text-xs font-semibold" style={{
                      color: mealType === key ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563'),
                    }}>
                      {icon} {label}
                    </Text>
                  </HapticTouchableOpacity>
                ))}
              </View>

              {/* Calories */}
              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Calories *
              </Text>
              <TextInput
                value={calories}
                onChangeText={setCalories}
                placeholder="e.g., 450"
                placeholderTextColor={placeholderColor}
                keyboardType="numeric"
                className="rounded-xl px-4 py-3 text-base mb-4"
                style={{ backgroundColor: inputBg, color: inputText }}
                accessibilityLabel="Calories"
                returnKeyType="next"
              />

              {/* Macros Row */}
              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Macros (optional)
              </Text>
              <View className="flex-row mb-4" style={{ gap: 8 }}>
                <View className="flex-1">
                  <TextInput
                    value={protein}
                    onChangeText={setProtein}
                    placeholder="Protein (g)"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numeric"
                    className="rounded-xl px-3 py-3 text-sm text-center"
                    style={{ backgroundColor: inputBg, color: inputText }}
                    accessibilityLabel="Protein in grams"
                  />
                </View>
                <View className="flex-1">
                  <TextInput
                    value={carbs}
                    onChangeText={setCarbs}
                    placeholder="Carbs (g)"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numeric"
                    className="rounded-xl px-3 py-3 text-sm text-center"
                    style={{ backgroundColor: inputBg, color: inputText }}
                    accessibilityLabel="Carbs in grams"
                  />
                </View>
                <View className="flex-1">
                  <TextInput
                    value={fat}
                    onChangeText={setFat}
                    placeholder="Fat (g)"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numeric"
                    className="rounded-xl px-3 py-3 text-sm text-center"
                    style={{ backgroundColor: inputBg, color: inputText }}
                    accessibilityLabel="Fat in grams"
                  />
                </View>
              </View>

              {/* Notes */}
              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                Notes (optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Any notes about this meal..."
                placeholderTextColor={placeholderColor}
                multiline
                numberOfLines={2}
                className="rounded-xl px-4 py-3 text-base mb-4"
                style={{ backgroundColor: inputBg, color: inputText, minHeight: 60, textAlignVertical: 'top' }}
                accessibilityLabel="Meal notes"
              />

              {/* Error */}
              {error ? (
                <Text className="text-sm text-red-500 mb-3 text-center">{error}</Text>
              ) : null}

              {/* Submit Button */}
              <HapticTouchableOpacity
                onPress={handleSubmit}
                disabled={!canSubmit}
                className="py-3.5 rounded-xl items-center"
                style={{
                  backgroundColor: canSubmit
                    ? (isDark ? DarkColors.primary : Colors.primary)
                    : (isDark ? '#374151' : '#E5E7EB'),
                  opacity: canSubmit ? 1 : 0.5,
                }}
                accessibilityLabel="Log meal"
                accessibilityHint="Logs this meal to your meal plan"
              >
                <Text className="font-bold text-base" style={{
                  color: canSubmit ? '#FFFFFF' : (isDark ? '#6B7280' : '#9CA3AF'),
                }}>
                  {loading ? 'Logging...' : 'Log Meal'}
                </Text>
              </HapticTouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
