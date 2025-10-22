import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { userApi } from '../lib/api';
import type { MacroCalculations } from '../types';

export default function EditMacroGoalsScreen() {
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
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    if (isNaN(Number(calories)) || isNaN(Number(protein)) || 
        isNaN(Number(carbs)) || isNaN(Number(fat))) {
      Alert.alert('Validation Error', 'Please enter valid numbers');
      return;
    }

    const caloriesNum = parseInt(calories);
    const proteinNum = parseInt(protein);
    const carbsNum = parseInt(carbs);
    const fatNum = parseInt(fat);

    if (caloriesNum < 500 || caloriesNum > 10000) {
      Alert.alert('Validation Error', 'Calories must be between 500 and 10,000');
      return;
    }

    if (proteinNum < 0 || carbsNum < 0 || fatNum < 0) {
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
      Alert.alert('Success', 'Macro goals updated successfully!');
      router.back();
    } catch (error: any) {
      console.error('📱 Edit Macro Goals: Update error', error);
      Alert.alert('Error', error.message || 'Failed to update macro goals');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Ionicons name="fitness-outline" size={64} color="#9CA3AF" />
          <Text className="text-gray-500 mt-4">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Edit Macro Goals</Text>
        <TouchableOpacity 
          onPress={handleSave}
          disabled={loading}
          className="p-2"
        >
          <Text className={`text-lg font-semibold ${loading ? 'text-gray-400' : 'text-orange-500'}`}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Calculate from Profile Button */}
        {hasPhysicalProfile && (
          <TouchableOpacity
            onPress={handleCalculateFromProfile}
            disabled={calculating}
            className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 rounded-xl mb-4 flex-row items-center justify-center shadow-sm"
          >
            <Ionicons name="calculator" size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-2">
              {calculating ? 'Calculating...' : 'Calculate from Profile'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Info about physical profile */}
        {!hasPhysicalProfile && (
          <TouchableOpacity
            onPress={() => {
              router.back();
              setTimeout(() => router.push('/edit-physical-profile'), 100);
            }}
            className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-200"
          >
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <View className="flex-1 ml-2">
                <Text className="text-blue-900 font-semibold mb-1">
                  Get Personalized Recommendations
                </Text>
                <Text className="text-blue-800 text-sm">
                  Complete your physical profile to automatically calculate your ideal macro goals based on scientific formulas.
                </Text>
                <Text className="text-blue-600 text-xs mt-2 font-medium">
                  Tap here to set up your profile →
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Text className="text-gray-600 text-sm mb-4">
            Set your daily macro nutrient targets to help personalize recipe recommendations.
          </Text>

          {/* Calories */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Daily Calories *</Text>
            <TextInput
              value={calories}
              onChangeText={setCalories}
              placeholder="2000"
              keyboardType="numeric"
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
              placeholderTextColor="#9CA3AF"
            />
            <Text className="text-gray-400 text-xs mt-1">Recommended: 1500-3000 calories</Text>
          </View>

          {/* Protein */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Protein (grams) *</Text>
            <TextInput
              value={protein}
              onChangeText={setProtein}
              placeholder="150"
              keyboardType="numeric"
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
              placeholderTextColor="#9CA3AF"
            />
            <Text className="text-gray-400 text-xs mt-1">Recommended: 0.8-1.2g per lb body weight</Text>
          </View>

          {/* Carbs */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Carbs (grams) *</Text>
            <TextInput
              value={carbs}
              onChangeText={setCarbs}
              placeholder="200"
              keyboardType="numeric"
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
              placeholderTextColor="#9CA3AF"
            />
            <Text className="text-gray-400 text-xs mt-1">Adjust based on activity level</Text>
          </View>

          {/* Fat */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Fat (grams) *</Text>
            <TextInput
              value={fat}
              onChangeText={setFat}
              placeholder="65"
              keyboardType="numeric"
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
              placeholderTextColor="#9CA3AF"
            />
            <Text className="text-gray-400 text-xs mt-1">Essential for hormone production</Text>
          </View>

          {/* Quick presets */}
          <View className="mt-4">
            <Text className="text-gray-600 text-sm mb-2">Quick Presets:</Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity 
                onPress={() => {
                  setCalories('2000');
                  setProtein('150');
                  setCarbs('200');
                  setFat('65');
                }}
                className="bg-blue-100 px-3 py-2 rounded-lg"
              >
                <Text className="text-blue-800 text-xs font-medium">Standard</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setCalories('1800');
                  setProtein('140');
                  setCarbs('150');
                  setFat('60');
                }}
                className="bg-green-100 px-3 py-2 rounded-lg"
              >
                <Text className="text-green-800 text-xs font-medium">Weight Loss</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  setCalories('2500');
                  setProtein('180');
                  setCarbs('280');
                  setFat('80');
                }}
                className="bg-purple-100 px-3 py-2 rounded-lg"
              >
                <Text className="text-purple-800 text-xs font-medium">Muscle Gain</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

