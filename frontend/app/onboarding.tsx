// frontend/app/onboarding.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Step 1: Welcome
// Step 2: Cuisines
// Step 3: Dietary Restrictions
// Step 4: Banned Ingredients
// Step 5: Physical Profile
// Step 6: Review & Finish

const CUISINE_OPTIONS = [
  { name: 'Italian', icon: '🍝' },
  { name: 'Mexican', icon: '🌮' },
  { name: 'Asian', icon: '🍜' },
  { name: 'Mediterranean', icon: '🥗' },
  { name: 'American', icon: '🍔' },
  { name: 'Indian', icon: '🍛' },
  { name: 'Middle Eastern', icon: '🥙' },
  { name: 'Latin American', icon: '🫔' },
  { name: 'French', icon: '🥐' },
  { name: 'Japanese', icon: '🍱' },
  { name: 'Thai', icon: '🍲' },
  { name: 'Chinese', icon: '🥟' },
];

const DIETARY_RESTRICTIONS = [
  { name: 'Vegetarian', icon: '🥕', description: 'No meat or fish' },
  { name: 'Vegan', icon: '🌱', description: 'No animal products' },
  { name: 'Gluten-Free', icon: '🌾', description: 'No wheat, barley, rye' },
  { name: 'Dairy-Free', icon: '🥛', description: 'No milk products' },
  { name: 'Nut-Free', icon: '🥜', description: 'No tree nuts or peanuts' },
  { name: 'Kosher', icon: '✡️', description: 'Jewish dietary laws' },
  { name: 'Halal', icon: '☪️', description: 'Islamic dietary laws' },
  { name: 'Pescatarian', icon: '🐟', description: 'No meat, but fish allowed' },
  { name: 'Keto', icon: '🥑', description: 'Low carb, high fat' },
  { name: 'Paleo', icon: '🦴', description: 'Whole foods, no processed' },
];

const COMMON_INGREDIENTS = [
  'Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs', 'Milk', 'Soy', 'Wheat',
  'Gluten', 'Sesame', 'Mushrooms', 'Cilantro', 'Onions', 'Garlic',
  'Bell Peppers', 'Tomatoes', 'Avocado', 'Coconut', 'Pork', 'Beef', 'Chicken',
];

const FITNESS_GOALS = [
  { value: 'lose_weight', label: 'Lose Weight', icon: '📉', description: 'Calorie deficit' },
  { value: 'maintain', label: 'Maintain Weight', icon: '⚖️', description: 'Maintain current weight' },
  { value: 'gain_muscle', label: 'Build Muscle', icon: '💪', description: 'Calorie surplus' },
  { value: 'athletic', label: 'Athletic Performance', icon: '🏃', description: 'Optimize for performance' },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise', multiplier: 1.2 },
  { value: 'lightly_active', label: 'Lightly Active', description: '1-3 days/week', multiplier: 1.375 },
  { value: 'moderately_active', label: 'Moderately Active', description: '3-5 days/week', multiplier: 1.55 },
  { value: 'very_active', label: 'Very Active', description: '6-7 days/week', multiplier: 1.725 },
  { value: 'extremely_active', label: 'Extremely Active', description: 'Athlete/physical job', multiplier: 1.9 },
];

interface OnboardingData {
  // Step 2: Cuisines
  likedCuisines: string[];
  // Step 3: Dietary Restrictions
  dietaryRestrictions: string[];
  // Step 4: Banned Ingredients
  bannedIngredients: string[];
  customBannedIngredient: string;
  // Step 5: Physical Profile
  gender: 'male' | 'female' | 'other' | '';
  age: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
  activityLevel: string;
  fitnessGoal: string;
  useMetric: boolean;
}

export default function OnboardingScreen() {
  const params = useLocalSearchParams();
  const isEditMode = params.edit === 'true';
  
  const [currentStep, setCurrentStep] = useState(isEditMode ? 1 : 0); // Skip welcome if editing
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  
  const [data, setData] = useState<OnboardingData>({
    likedCuisines: [],
    dietaryRestrictions: [],
    bannedIngredients: [],
    customBannedIngredient: '',
    gender: '',
    age: '',
    heightFeet: '',
    heightInches: '',
    weight: '',
    activityLevel: '',
    fitnessGoal: '',
    useMetric: false,
  });

  // Load existing preferences if in edit mode
  useEffect(() => {
    if (isEditMode) {
      loadExistingData();
    }
  }, [isEditMode]);

  const loadExistingData = async () => {
    try {
      setLoading(true);
      const [prefsResponse, profileResponse] = await Promise.all([
        userApi.getPreferences(),
        userApi.getPhysicalProfile(),
      ]);

      const prefs = prefsResponse.data;
      const profile = profileResponse.data;

      // Load preferences
      const likedCuisines = prefs.likedCuisines?.map((c: any) => 
        typeof c === 'string' ? c : c.name
      ) || [];
      const dietaryRestrictions = prefs.dietaryRestrictions?.map((d: any) => 
        typeof d === 'string' ? d : d.name
      ) || [];
      const bannedIngredients = prefs.bannedIngredients?.map((i: any) => 
        typeof i === 'string' ? i : i.name
      ) || [];

      // Load physical profile
      const useMetric = false; // Default to imperial for US
      let heightFeet = '';
      let heightInches = '';
      let weight = '';

      if (profile) {
        // Convert height from cm
        if (profile.heightCm) {
          const totalInches = profile.heightCm / 2.54;
          heightFeet = Math.floor(totalInches / 12).toString();
          heightInches = Math.round(totalInches % 12).toString();
        }

        // Convert weight from kg
        if (profile.weightKg) {
          weight = (profile.weightKg * 2.20462).toFixed(1);
        }
      }

      setData({
        likedCuisines,
        dietaryRestrictions,
        bannedIngredients,
        customBannedIngredient: '',
        gender: profile?.gender || '',
        age: profile?.age?.toString() || '',
        heightFeet,
        heightInches,
        weight,
        activityLevel: profile?.activityLevel || '',
        fitnessGoal: profile?.fitnessGoal || '',
        useMetric,
      });
    } catch (error) {
      console.error('Error loading existing data:', error);
      Alert.alert('Error', 'Failed to load existing preferences');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 6;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const toggleSelection = (field: 'likedCuisines' | 'dietaryRestrictions' | 'bannedIngredients', value: string) => {
    const currentArray = data[field];
    if (currentArray.includes(value)) {
      setData({ ...data, [field]: currentArray.filter(v => v !== value) });
    } else {
      setData({ ...data, [field]: [...currentArray, value] });
    }
  };

  const addCustomIngredient = () => {
    if (data.customBannedIngredient.trim()) {
      setData({
        ...data,
        bannedIngredients: [...data.bannedIngredients, data.customBannedIngredient.trim()],
        customBannedIngredient: '',
      });
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Welcome
        return true;
      case 1: // Cuisines
        return data.likedCuisines.length > 0;
      case 2: // Dietary Restrictions
        return true; // Optional
      case 3: // Banned Ingredients
        return true; // Optional
      case 4: // Physical Profile
        return (
          data.gender !== '' &&
          data.age !== '' &&
          (data.useMetric ? (data.heightFeet !== '' && data.weight !== '') : (data.heightFeet !== '' && data.heightInches !== '' && data.weight !== '')) &&
          data.activityLevel !== '' &&
          data.fitnessGoal !== ''
        );
      case 5: // Review
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      saveOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveOnboarding = async () => {
    try {
      setSaving(true);

      // Calculate height in cm
      let heightCm: number;
      if (data.useMetric) {
        heightCm = parseFloat(data.heightFeet);
      } else {
        const feet = parseInt(data.heightFeet) || 0;
        const inches = parseInt(data.heightInches) || 0;
        heightCm = (feet * 30.48) + (inches * 2.54);
      }

      // Calculate weight in kg
      const weightKg = data.useMetric ? parseFloat(data.weight) : parseFloat(data.weight) * 0.453592;

      // Save preferences
      await userApi.updatePreferences({
        likedCuisines: data.likedCuisines,
        dietaryRestrictions: data.dietaryRestrictions,
        bannedIngredients: data.bannedIngredients,
        cookTimePreference: 30,
        spiceLevel: 'medium',
      });

      // Save physical profile
      await userApi.updatePhysicalProfile({
        gender: data.gender as 'male' | 'female' | 'other',
        age: parseInt(data.age),
        heightCm,
        weightKg,
        activityLevel: data.activityLevel,
        fitnessGoal: data.fitnessGoal,
      });

      // Mark onboarding as complete
      await AsyncStorage.setItem('onboarding_complete', 'true');

      if (isEditMode) {
        // If editing, just go back to profile
        Alert.alert(
          '✅ Preferences Updated',
          'Your preferences have been saved successfully.',
          [
            {
              text: 'Done',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        // If first time, show welcome and go to main app
        Alert.alert(
          '🎉 Welcome to Sazon Chef!',
          'Your preferences have been saved. We\'ll use this information to give you personalized recipe recommendations.',
          [
            {
              text: 'Get Started',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const skipOnboarding = () => {
    Alert.alert(
      'Skip Onboarding?',
      'You can always set up your preferences later from the Profile screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => router.replace('/(tabs)') },
      ]
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderWelcome();
      case 1:
        return renderCuisines();
      case 2:
        return renderDietaryRestrictions();
      case 3:
        return renderBannedIngredients();
      case 4:
        return renderPhysicalProfile();
      case 5:
        return renderReview();
      default:
        return null;
    }
  };

  const renderWelcome = () => (
    <ScrollView className="flex-1 px-6 py-8">
      <View className="items-center mb-8">
        <Text className="text-6xl mb-4">👨‍🍳</Text>
        <Text className="text-3xl font-bold text-gray-900 text-center mb-3">
          Welcome to Sazon Chef!
        </Text>
        <Text className="text-lg text-gray-600 text-center">
          Let's personalize your experience in just a few steps
        </Text>
      </View>

      <View className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
        <View className="flex-row items-center mb-4">
          <View className="bg-orange-100 rounded-full p-3 mr-4">
            <Text className="text-2xl">🍝</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              Choose Your Cuisines
            </Text>
            <Text className="text-sm text-gray-600">
              Select the cuisines you love
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mb-4">
          <View className="bg-green-100 rounded-full p-3 mr-4">
            <Text className="text-2xl">🥗</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              Set Your Restrictions
            </Text>
            <Text className="text-sm text-gray-600">
              Tell us about dietary needs
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mb-4">
          <View className="bg-blue-100 rounded-full p-3 mr-4">
            <Text className="text-2xl">💪</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              Build Your Profile
            </Text>
            <Text className="text-sm text-gray-600">
              Set your fitness goals
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <View className="bg-purple-100 rounded-full p-3 mr-4">
            <Text className="text-2xl">🎯</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              Get Recommendations
            </Text>
            <Text className="text-sm text-gray-600">
              Personalized just for you
            </Text>
          </View>
        </View>
      </View>

      <Text className="text-sm text-gray-500 text-center px-4">
        This will take about 2-3 minutes. You can skip and set this up later.
      </Text>
    </ScrollView>
  );

  const renderCuisines = () => (
    <ScrollView className="flex-1 px-6 py-6">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Select Your Favorite Cuisines
      </Text>
      <Text className="text-base text-gray-600 mb-6">
        Choose at least one cuisine you enjoy
      </Text>

      <View className="flex-row flex-wrap">
        {CUISINE_OPTIONS.map((cuisine, index) => {
          const isSelected = data.likedCuisines.includes(cuisine.name);
          return (
            <TouchableOpacity
              key={cuisine.name}
              onPress={() => toggleSelection('likedCuisines', cuisine.name)}
              className={`w-[48%] ${index % 2 === 0 ? 'mr-[4%]' : ''} mb-4 p-4 rounded-2xl border-2 ${
                isSelected
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white'
              }`}
              activeOpacity={0.7}
            >
              <View className="items-center">
                <Text className="text-4xl mb-2">{cuisine.icon}</Text>
                <Text className={`text-base font-semibold text-center ${
                  isSelected ? 'text-orange-900' : 'text-gray-900'
                }`}>
                  {cuisine.name}
                </Text>
                {isSelected && (
                  <View className="absolute top-2 right-2 bg-orange-500 rounded-full p-1">
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderDietaryRestrictions = () => (
    <ScrollView className="flex-1 px-6 py-6">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Any Dietary Restrictions?
      </Text>
      <Text className="text-base text-gray-600 mb-6">
        Optional - Skip if none apply
      </Text>

      {DIETARY_RESTRICTIONS.map((restriction) => {
        const isSelected = data.dietaryRestrictions.includes(restriction.name);
        return (
          <TouchableOpacity
            key={restriction.name}
            onPress={() => toggleSelection('dietaryRestrictions', restriction.name)}
            className={`mb-3 p-4 rounded-xl border-2 flex-row items-center ${
              isSelected
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
            activeOpacity={0.7}
          >
            <Text className="text-3xl mr-3">{restriction.icon}</Text>
            <View className="flex-1">
              <Text className={`text-base font-semibold ${
                isSelected ? 'text-green-900' : 'text-gray-900'
              }`}>
                {restriction.name}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                {restriction.description}
              </Text>
            </View>
            {isSelected && (
              <View className="bg-green-500 rounded-full p-1">
                <Ionicons name="checkmark" size={16} color="white" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderBannedIngredients = () => (
    <ScrollView className="flex-1 px-6 py-6">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Ingredients to Avoid?
      </Text>
      <Text className="text-base text-gray-600 mb-6">
        Optional - Select ingredients you don't like or are allergic to
      </Text>

      {/* Custom ingredient input */}
      <View className="mb-6">
        <Text className="text-sm font-semibold text-gray-700 mb-2">
          Add Custom Ingredient
        </Text>
        <View className="flex-row">
          <TextInput
            value={data.customBannedIngredient}
            onChangeText={(text) => setData({ ...data, customBannedIngredient: text })}
            placeholder="e.g., Cilantro"
            className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-base"
            returnKeyType="done"
            onSubmitEditing={addCustomIngredient}
          />
          <TouchableOpacity
            onPress={addCustomIngredient}
            className="ml-2 bg-orange-500 rounded-xl px-4 justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Common ingredients */}
      <Text className="text-sm font-semibold text-gray-700 mb-3">
        Common Ingredients
      </Text>
      <View className="flex-row flex-wrap">
        {COMMON_INGREDIENTS.map((ingredient) => {
          const isSelected = data.bannedIngredients.includes(ingredient);
          return (
            <TouchableOpacity
              key={ingredient}
              onPress={() => toggleSelection('bannedIngredients', ingredient)}
              className={`mb-3 mr-2 px-4 py-2 rounded-full border-2 ${
                isSelected
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`text-sm font-medium ${
                isSelected ? 'text-red-900' : 'text-gray-900'
              }`}>
                {ingredient}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Custom banned ingredients */}
      {data.bannedIngredients.filter(ing => !COMMON_INGREDIENTS.includes(ing)).length > 0 && (
        <>
          <Text className="text-sm font-semibold text-gray-700 mb-3 mt-4">
            Your Custom Ingredients
          </Text>
          <View className="flex-row flex-wrap">
            {data.bannedIngredients
              .filter(ing => !COMMON_INGREDIENTS.includes(ing))
              .map((ingredient) => (
                <TouchableOpacity
                  key={ingredient}
                  onPress={() => toggleSelection('bannedIngredients', ingredient)}
                  className="mb-3 mr-2 px-4 py-2 rounded-full border-2 border-red-500 bg-red-50"
                  activeOpacity={0.7}
                >
                  <Text className="text-sm font-medium text-red-900">
                    {ingredient}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderPhysicalProfile = () => (
    <ScrollView className="flex-1 px-6 py-6">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Tell Us About Yourself
      </Text>
      <Text className="text-base text-gray-600 mb-6">
        We'll calculate your nutritional needs
      </Text>

      {/* Unit Toggle */}
      <View className="bg-white rounded-xl p-4 mb-4 flex-row items-center justify-between">
        <Text className="text-base font-medium text-gray-900">
          Use Metric Units (cm, kg)
        </Text>
        <Switch
          value={data.useMetric}
          onValueChange={(value) => setData({ ...data, useMetric: value })}
          trackColor={{ false: '#d1d5db', true: '#f97316' }}
          thumbColor={data.useMetric ? '#fff' : '#f4f3f4'}
        />
      </View>

      {/* Gender */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-2">Gender</Text>
        <View className="flex-row">
          {['male', 'female', 'other'].map((gender) => (
            <TouchableOpacity
              key={gender}
              onPress={() => setData({ ...data, gender: gender as any })}
              className={`flex-1 ${gender !== 'other' ? 'mr-2' : ''} py-3 rounded-xl border-2 ${
                data.gender === gender
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`text-center font-semibold capitalize ${
                data.gender === gender ? 'text-orange-900' : 'text-gray-900'
              }`}>
                {gender}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Age */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-2">Age</Text>
        <TextInput
          value={data.age}
          onChangeText={(text) => setData({ ...data, age: text })}
          placeholder="Enter your age"
          keyboardType="numeric"
          className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base"
        />
      </View>

      {/* Height */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-2">
          Height {data.useMetric ? '(cm)' : '(feet & inches)'}
        </Text>
        {data.useMetric ? (
          <TextInput
            value={data.heightFeet}
            onChangeText={(text) => setData({ ...data, heightFeet: text })}
            placeholder="Enter height in cm"
            keyboardType="numeric"
            className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base"
          />
        ) : (
          <View className="flex-row">
            <TextInput
              value={data.heightFeet}
              onChangeText={(text) => setData({ ...data, heightFeet: text })}
              placeholder="Feet"
              keyboardType="numeric"
              className="flex-1 mr-2 bg-white border border-gray-300 rounded-xl px-4 py-3 text-base"
            />
            <TextInput
              value={data.heightInches}
              onChangeText={(text) => setData({ ...data, heightInches: text })}
              placeholder="Inches"
              keyboardType="numeric"
              className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-base"
            />
          </View>
        )}
      </View>

      {/* Weight */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-2">
          Weight {data.useMetric ? '(kg)' : '(lbs)'}
        </Text>
        <TextInput
          value={data.weight}
          onChangeText={(text) => setData({ ...data, weight: text })}
          placeholder={`Enter weight in ${data.useMetric ? 'kg' : 'lbs'}`}
          keyboardType="numeric"
          className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base"
        />
      </View>

      {/* Activity Level */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-2">Activity Level</Text>
        {ACTIVITY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.value}
            onPress={() => setData({ ...data, activityLevel: level.value })}
            className={`mb-2 p-4 rounded-xl border-2 ${
              data.activityLevel === level.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
            activeOpacity={0.7}
          >
            <Text className={`text-base font-semibold mb-1 ${
              data.activityLevel === level.value ? 'text-blue-900' : 'text-gray-900'
            }`}>
              {level.label}
            </Text>
            <Text className="text-sm text-gray-600">
              {level.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fitness Goal */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-2">Fitness Goal</Text>
        <View className="flex-row flex-wrap">
          {FITNESS_GOALS.map((goal) => (
            <TouchableOpacity
              key={goal.value}
              onPress={() => setData({ ...data, fitnessGoal: goal.value })}
              className={`w-[48%] ${FITNESS_GOALS.indexOf(goal) % 2 === 0 ? 'mr-[4%]' : ''} mb-4 p-4 rounded-2xl border-2 ${
                data.fitnessGoal === goal.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white'
              }`}
              activeOpacity={0.7}
            >
              <Text className="text-3xl text-center mb-2">{goal.icon}</Text>
              <Text className={`text-sm font-semibold text-center mb-1 ${
                data.fitnessGoal === goal.value ? 'text-purple-900' : 'text-gray-900'
              }`}>
                {goal.label}
              </Text>
              <Text className="text-xs text-gray-600 text-center">
                {goal.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderReview = () => (
    <ScrollView className="flex-1 px-6 py-6">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Review Your Profile
      </Text>
      <Text className="text-base text-gray-600 mb-6">
        Make sure everything looks good
      </Text>

      {/* Cuisines */}
      <View className="bg-white rounded-xl p-4 mb-4">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          🍝 Favorite Cuisines
        </Text>
        <Text className="text-base text-gray-700">
          {data.likedCuisines.join(', ') || 'None selected'}
        </Text>
      </View>

      {/* Dietary Restrictions */}
      <View className="bg-white rounded-xl p-4 mb-4">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          🥗 Dietary Restrictions
        </Text>
        <Text className="text-base text-gray-700">
          {data.dietaryRestrictions.length > 0 ? data.dietaryRestrictions.join(', ') : 'None'}
        </Text>
      </View>

      {/* Banned Ingredients */}
      <View className="bg-white rounded-xl p-4 mb-4">
        <Text className="text-lg font-semibold text-gray-900 mb-2">
          🚫 Ingredients to Avoid
        </Text>
        <Text className="text-base text-gray-700">
          {data.bannedIngredients.length > 0 ? data.bannedIngredients.join(', ') : 'None'}
        </Text>
      </View>

      {/* Physical Profile */}
      <View className="bg-white rounded-xl p-4 mb-4">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          💪 Physical Profile
        </Text>
        <View className="space-y-2">
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-sm text-gray-600">Gender</Text>
            <Text className="text-sm font-medium text-gray-900 capitalize">{data.gender}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-sm text-gray-600">Age</Text>
            <Text className="text-sm font-medium text-gray-900">{data.age} years</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-sm text-gray-600">Height</Text>
            <Text className="text-sm font-medium text-gray-900">
              {data.useMetric 
                ? `${data.heightFeet} cm` 
                : `${data.heightFeet}' ${data.heightInches}"`
              }
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-sm text-gray-600">Weight</Text>
            <Text className="text-sm font-medium text-gray-900">
              {data.weight} {data.useMetric ? 'kg' : 'lbs'}
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-100">
            <Text className="text-sm text-gray-600">Activity Level</Text>
            <Text className="text-sm font-medium text-gray-900 capitalize">
              {ACTIVITY_LEVELS.find(l => l.value === data.activityLevel)?.label}
            </Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-sm text-gray-600">Fitness Goal</Text>
            <Text className="text-sm font-medium text-gray-900">
              {FITNESS_GOALS.find(g => g.value === data.fitnessGoal)?.label}
            </Text>
          </View>
        </View>
      </View>

      <View className="bg-orange-50 rounded-xl p-4 border border-orange-200">
        <Text className="text-sm text-orange-900 text-center">
          💡 You can update these preferences anytime from your Profile
        </Text>
      </View>
    </ScrollView>
  );

  // Show loading screen while fetching data in edit mode
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F97316" />
          <Text className="text-gray-600 mt-4">Loading your preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-3">
            {currentStep > 0 ? (
              <TouchableOpacity onPress={prevStep} className="p-1">
                <Ionicons name="arrow-back" size={24} color="#6B7280" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 32 }} />
            )}
            <Text className="text-base font-medium text-gray-600">
              Step {currentStep + 1} of {totalSteps}
            </Text>
            <TouchableOpacity onPress={skipOnboarding} className="p-1">
              <Text className="text-base font-medium text-orange-500">Skip</Text>
            </TouchableOpacity>
          </View>
          {/* Progress Bar */}
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View 
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>

        {/* Content */}
        {renderStep()}

        {/* Bottom Bar */}
        <View className="bg-white px-6 py-4 border-t border-gray-200">
          <TouchableOpacity
            onPress={nextStep}
            disabled={!canProceed() || saving}
            className={`py-4 rounded-xl ${
              !canProceed() || saving
                ? 'bg-gray-300'
                : 'bg-orange-500'
            }`}
            activeOpacity={0.7}
          >
            {saving ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator size="small" color="white" />
                <Text className="text-white font-semibold ml-2">Setting Up...</Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-center text-lg">
                {currentStep === totalSteps - 1 ? 'Finish' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
