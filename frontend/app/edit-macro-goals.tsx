import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { userApi } from '../lib/api';
import type { MacroCalculations } from '../types';
import * as Haptics from 'expo-haptics';
import { Colors, DarkColors } from '../constants/Colors';
import { useColorScheme } from 'nativewind';

export default function EditMacroGoalsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [calculating, setCalculating] = useState(false);
  
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  
  // Calculated recommendations
  const [calculations, setCalculations] = useState<MacroCalculations | null>(null);
  const [hasPhysicalProfile, setHasPhysicalProfile] = useState(false);

  // Load current goals
  useEffect(() => {
    loadMacroGoals();
  }, []);

  const loadMacroGoals = async () => {
    try {
      setLoadingData(true);
      const response = await userApi.getMacroGoals();
      const goals = response.data;
      
      console.log('📱 Edit Macro Goals: Loaded goals', goals);
      setCalories(goals.calories.toString());
      setProtein(goals.protein.toString());
      setCarbs(goals.carbs.toString());
      setFat(goals.fat.toString());
      
      // Check if user has physical profile for calculations
      try {
        const profileResponse = await userApi.getPhysicalProfile();
        setHasPhysicalProfile(profileResponse.data !== null);
      } catch {
        setHasPhysicalProfile(false);
      }
    } catch (error: any) {
      console.error('📱 Edit Macro Goals: Load error', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to load macro goals');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCalculateFromProfile = async () => {
    try {
      setCalculating(true);
      const response = await userApi.getCalculatedMacros();
      const calc = response.data;
      
      console.log('📱 Edit Macro Goals: Calculated macros', calc);
      setCalculations(calc);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Show the calculated values
      Alert.alert(
        'Calculated Macros',
        `Based on your physical profile:\n\n` +
        `Calories: ${calc.calories}\n` +
        `Protein: ${calc.protein}g\n` +
        `Carbs: ${calc.carbs}g\n` +
        `Fat: ${calc.fat}g\n\n` +
        `BMR: ${calc.bmr} cal/day\n` +
        `TDEE: ${calc.tdee} cal/day\n\n` +
        `Would you like to apply these values?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            onPress: () => {
              setCalories(calc.calories.toString());
              setProtein(calc.protein.toString());
              setCarbs(calc.carbs.toString());
              setFat(calc.fat.toString());
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('📱 Edit Macro Goals: Calculate error', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error.message?.includes('Physical profile') || error.message?.includes('profile required')) {
        Alert.alert(
          'Physical Profile Required',
          'Please complete your physical profile first to use automatic macro calculation.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Set Up Profile',
              onPress: () => {
                router.back();
                setTimeout(() => router.push('/edit-physical-profile'), 100);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to calculate macros');
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!calories || !protein || !carbs || !fat) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    if (isNaN(Number(calories)) || isNaN(Number(protein)) || 
        isNaN(Number(carbs)) || isNaN(Number(fat))) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', 'Please enter valid numbers');
      return;
    }

    const caloriesNum = parseInt(calories);
    const proteinNum = parseInt(protein);
    const carbsNum = parseInt(carbs);
    const fatNum = parseInt(fat);

    if (caloriesNum < 500 || caloriesNum > 10000) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', 'Calories must be between 500 and 10,000');
      return;
    }

    if (proteinNum < 0 || carbsNum < 0 || fatNum < 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', 'Macro values must be positive');
      return;
    }

    try {
      setLoading(true);
      await userApi.updateMacroGoals({
        calories: caloriesNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum
      });
      
      console.log('📱 Edit Macro Goals: Goals updated');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Macro goals updated successfully!');
      router.back();
    } catch (error: any) {
      console.error('📱 Edit Macro Goals: Update error', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to update macro goals');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Ionicons name="fitness-outline" size={64} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} />
          <Text className="mt-4" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <KeyboardAvoidingContainer>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between">
        <HapticTouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color={isDark ? DarkColors.text.primary : Colors.text.primary} />
        </HapticTouchableOpacity>
        <Text className="text-xl font-bold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Edit Macro Goals</Text>
        <HapticTouchableOpacity 
          onPress={handleSave}
          disabled={loading}
          className="p-2"
        >
          <Text className="text-lg font-semibold" style={{ color: loading ? (isDark ? DarkColors.text.secondary : Colors.text.secondary) : (isDark ? DarkColors.secondaryRed : Colors.secondaryRed) }}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </HapticTouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Calculate from Profile Button */}
        {hasPhysicalProfile && (
          <HapticTouchableOpacity
            onPress={handleCalculateFromProfile}
            disabled={calculating}
            className="p-4 rounded-xl mb-4 flex-row items-center justify-center shadow-sm"
            style={{ backgroundColor: isDark ? DarkColors.accent : Colors.accent }}
          >
            <Ionicons name="calculator" size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-2">
              {calculating ? 'Calculating...' : 'Calculate from Profile'}
            </Text>
          </HapticTouchableOpacity>
        )}

        {/* Info about physical profile */}
        {!hasPhysicalProfile && (
          <HapticTouchableOpacity
            onPress={() => {
              router.back();
              setTimeout(() => router.push('/edit-physical-profile'), 100);
            }}
            className="p-4 rounded-xl mb-4 border"
            style={{
              backgroundColor: isDark ? `${Colors.secondaryRedLight}1A` : Colors.secondaryRedDark,
              borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark,
            }}
          >
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color={isDark ? DarkColors.secondaryRed : '#FFFFFF'} />
              <View className="flex-1 ml-2">
                <Text className="font-semibold mb-1" style={{ color: isDark ? DarkColors.secondaryRed : '#FFFFFF' }}>
                  Get Personalized Recommendations
                </Text>
                <Text className="text-sm" style={{ color: isDark ? DarkColors.secondaryRed : '#FFFFFF' }}>
                  Complete your physical profile to automatically calculate your ideal macro goals based on scientific formulas.
                </Text>
                <Text className="text-xs mt-2 font-medium" style={{ color: isDark ? DarkColors.secondaryRed : '#FFFFFF' }}>
                  Tap here to set up your profile →
                </Text>
              </View>
            </View>
          </HapticTouchableOpacity>
        )}

        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <Text className="text-sm mb-4" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
            Set your daily macro nutrient targets to help personalize recipe recommendations.
          </Text>

          {/* Calories */}
          <View className="mb-4">
            <Text className="font-medium mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Daily Calories *</Text>
            <TextInput
              value={calories}
              onChangeText={setCalories}
              placeholder="2000"
              keyboardType="numeric"
              className="rounded-lg px-4 py-3"
              style={{
                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                borderColor: isDark ? DarkColors.border.light : Colors.border.light,
                borderWidth: 1,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
              }}
              placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
            />
            <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>Recommended: 1500-3000 calories</Text>
          </View>

          {/* Protein */}
          <View className="mb-4">
            <Text className="font-medium mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Protein (grams) *</Text>
            <TextInput
              value={protein}
              onChangeText={setProtein}
              placeholder="150"
              keyboardType="numeric"
              className="rounded-lg px-4 py-3"
              style={{
                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                borderColor: isDark ? DarkColors.border.light : Colors.border.light,
                borderWidth: 1,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
              }}
              placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
            />
            <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>Recommended: 0.8-1.2g per lb body weight</Text>
          </View>

          {/* Carbs */}
          <View className="mb-4">
            <Text className="font-medium mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Carbs (grams) *</Text>
            <TextInput
              value={carbs}
              onChangeText={setCarbs}
              placeholder="200"
              keyboardType="numeric"
              className="rounded-lg px-4 py-3"
              style={{
                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                borderColor: isDark ? DarkColors.border.light : Colors.border.light,
                borderWidth: 1,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
              }}
              placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
            />
            <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>Adjust based on activity level</Text>
          </View>

          {/* Fat */}
          <View className="mb-4">
            <Text className="font-medium mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Fat (grams) *</Text>
            <TextInput
              value={fat}
              onChangeText={setFat}
              placeholder="65"
              keyboardType="numeric"
              className="rounded-lg px-4 py-3"
              style={{
                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                borderColor: isDark ? DarkColors.border.light : Colors.border.light,
                borderWidth: 1,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
              }}
              placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
            />
            <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>Essential for hormone production</Text>
          </View>

          {/* Quick presets */}
          <View className="mt-4">
            <Text className="text-sm mb-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Quick Presets:</Text>
            <View className="flex-row flex-wrap gap-2">
              <HapticTouchableOpacity 
                onPress={() => {
                  setCalories('2000');
                  setProtein('150');
                  setCarbs('200');
                  setFat('65');
                }}
                className="px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedDark,
                  borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark,
                }}
              >
                <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.secondaryRed : '#FFFFFF' }}>Standard</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity 
                onPress={() => {
                  setCalories('1800');
                  setProtein('140');
                  setCarbs('150');
                  setFat('60');
                }}
                className="px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenDark,
                  borderColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreenDark,
                }}
              >
                <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.tertiaryGreen : '#FFFFFF' }}>Weight Loss</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity 
                onPress={() => {
                  setCalories('2500');
                  setProtein('180');
                  setCarbs('280');
                  setFat('80');
                }}
                className="px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: isDark ? `${Colors.accent}33` : '#7C3AED',
                  borderColor: isDark ? DarkColors.accent : '#7C3AED',
                }}
              >
                <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.accent : '#FFFFFF' }}>Muscle Gain</Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
}

