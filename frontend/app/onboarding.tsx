// frontend/app/onboarding.tsx
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
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
import LogoMascot from '../components/mascot/LogoMascot';
import LoadingState from '../components/ui/LoadingState';
import SuccessModal from '../components/ui/SuccessModal';
import { SUPERFOOD_CATEGORIES } from '../constants/Superfoods';
import { Colors, DarkColors } from '../constants/Colors';
import { Spacing, BorderRadius } from '../constants/Spacing';
import { HapticPatterns } from '../constants/Haptics';
import { useColorScheme } from 'nativewind';
import RecipeRoulette from '../components/recipe/RecipeRoulette';
import { recipeApi } from '../lib/api';
import type { SuggestedRecipe } from '../types';

// Step 0: Welcome
// Step 1: Cuisines
// Step 2: Dietary Restrictions
// Step 3: Superfoods
// Step 4: Banned Ingredients
// Step 5: Physical Profile
// Step 6: Recipe Roulette
// Step 7: Review & Finish

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
  // Step 4: Superfoods
  preferredSuperfoods: string[];
  // Step 5: Banned Ingredients
  bannedIngredients: string[];
  customBannedIngredient: string;
  // Step 6: Physical Profile
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const isEditMode = params.edit === 'true';
  
  const [currentStep, setCurrentStep] = useState(isEditMode ? 1 : 0); // Skip welcome if editing
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  
  // Recipe roulette state
  const [rouletteRecipes, setRouletteRecipes] = useState<SuggestedRecipe[]>([]);
  const [rouletteLoading, setRouletteLoading] = useState(false);
  const [rouletteLiked, setRouletteLiked] = useState<Set<string>>(new Set());
  const [roulettePassed, setRoulettePassed] = useState<Set<string>>(new Set());
  
  const [data, setData] = useState<OnboardingData>({
    likedCuisines: [],
    dietaryRestrictions: [],
    preferredSuperfoods: [],
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

  // Fetch recipes for roulette when entering that step
  useEffect(() => {
    if (currentStep === 6 && rouletteRecipes.length === 0 && !rouletteLoading) {
      fetchRouletteRecipes();
    }
  }, [currentStep]);

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
      const preferredSuperfoods = prefs.preferredSuperfoods?.map((sf: any) => 
        typeof sf === 'string' ? sf : sf.category
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
        preferredSuperfoods,
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
      HapticPatterns.error();
      Alert.alert('Error', 'Failed to load existing preferences');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 8; // Added roulette step (step 6)
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Get mascot expression based on current step
  const getMascotExpression = (): 'excited' | 'curious' | 'happy' | 'proud' | 'thinking' | 'supportive' | 'focused' => {
    switch (currentStep) {
      case 0: // Welcome
        return 'excited';
      case 1: // Cuisines
        return 'curious';
      case 2: // Dietary Restrictions
        return 'supportive';
      case 3: // Superfoods
        return 'happy';
      case 4: // Banned Ingredients
        return 'thinking';
      case 5: // Physical Profile
        return 'focused';
      case 6: // Review
        return 'proud';
      default:
        return 'happy';
    }
  };

  const toggleSelection = (field: 'likedCuisines' | 'dietaryRestrictions' | 'bannedIngredients' | 'preferredSuperfoods', value: string) => {
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
      case 3: // Superfoods
        return true; // Optional
      case 4: // Banned Ingredients
        return true; // Optional
      case 5: // Physical Profile
        return (
          data.gender !== '' &&
          data.age !== '' &&
          (data.useMetric ? (data.heightFeet !== '' && data.weight !== '') : (data.heightFeet !== '' && data.heightInches !== '' && data.weight !== '')) &&
          data.activityLevel !== '' &&
          data.fitnessGoal !== ''
        );
      case 6: // Recipe Roulette
        return rouletteLiked.size > 0 || roulettePassed.size > 0; // At least one interaction
      case 7: // Review
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
        preferredSuperfoods: data.preferredSuperfoods,
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

      HapticPatterns.success();
      if (isEditMode) {
        // If editing, show success modal then go back
        setSuccessMessage({
          title: 'Preferences Updated!',
          message: 'Your preferences have been saved successfully.',
        });
        setShowSuccessModal(true);
      } else {
        // If first time, show welcome success modal
        setSuccessMessage({
          title: 'Welcome to Sazon Chef!',
          message: 'Your preferences have been saved. We\'ll use this information to give you personalized recipe recommendations.',
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      HapticPatterns.error();
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
        return renderSuperfoods();
      case 4:
        return renderBannedIngredients();
      case 5:
        return renderPhysicalProfile();
      case 6:
        return renderRoulette();
      case 7:
        return renderReview();
      default:
        return null;
    }
  };

  const renderWelcome = () => (
    <ScrollView className="flex-1 px-6 py-8">
      <View className="items-center mb-8">
        <LogoMascot 
          expression="excited" 
          size="large" 
          style={{ marginBottom: 16 }}
        />
        <Text className="text-3xl font-bold text-center mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          Welcome to Sazon Chef!
        </Text>
        <Text className="text-lg text-center" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
          Let's personalize your experience in just a few steps
        </Text>
      </View>

      <View className="rounded-2xl p-6 mb-4 shadow-sm" style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
        <View className="flex-row items-center mb-4">
          <View className="rounded-full p-3 mr-4" style={{ backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight }}>
            <Text className="text-2xl">🍝</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold mb-1" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              Choose Your Cuisines
            </Text>
            <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              Select the cuisines you love
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mb-4">
          <View className="rounded-full p-3 mr-4" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight }}>
            <Text className="text-2xl">🥗</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold mb-1" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              Set Your Restrictions
            </Text>
            <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              Tell us about dietary needs
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mb-4">
          <View className="rounded-full p-3 mr-4" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}>
            <Text className="text-2xl">💪</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold mb-1" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              Build Your Profile
            </Text>
            <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              Set your fitness goals
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mb-4">
          <View className="rounded-full p-3 mr-4" style={{ backgroundColor: isDark ? `${Colors.accent}33` : '#EDE9FE' }}>
            <Text className="text-2xl">🎯</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold mb-1" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              Get Recommendations
            </Text>
            <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              Personalized just for you
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <View className="rounded-full p-3 mr-4" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}>
            <Text className="text-2xl">🎲</Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold mb-1" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              Quick Recipe Roulette
            </Text>
            <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              Swipe through recipes to help us learn your taste
            </Text>
          </View>
        </View>
      </View>

      <Text className="text-sm text-center px-4" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>
        This will take about 2-3 minutes. You can skip and set this up later.
      </Text>
    </ScrollView>
  );

  const renderCuisines = () => (
    <ScrollView className="flex-1 px-6 py-6">
      <Text className="text-2xl font-bold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
        Select Your Favorite Cuisines
      </Text>
      <Text className="text-base mb-6" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
        Choose at least one cuisine you enjoy
      </Text>

      <View className="flex-row flex-wrap">
        {CUISINE_OPTIONS.map((cuisine, index) => {
          const isSelected = data.likedCuisines.includes(cuisine.name);
          return (
            <HapticTouchableOpacity
              key={cuisine.name}
              onPress={() => toggleSelection('likedCuisines', cuisine.name)}
              className={`w-[48%] ${index % 2 === 0 ? 'mr-[4%]' : ''} mb-4 p-4 rounded-2xl border-2`}
              style={{
                borderColor: isSelected 
                  ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                  : (isDark ? DarkColors.border.light : Colors.border.light),
                backgroundColor: isSelected 
                  ? (isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight)
                  : (isDark ? '#1F2937' : '#FFFFFF'),
              }}
              activeOpacity={0.7}
            >
              <View className="items-center">
                <Text className="text-4xl mb-2">{cuisine.icon}</Text>
                <Text className="text-base font-semibold text-center" style={{ 
                  color: isSelected 
                    ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                    : (isDark ? DarkColors.text.primary : Colors.text.primary)
                }}>
                  {cuisine.name}
                </Text>
                {isSelected && (
                  <View className="absolute top-2 right-2 rounded-full p-1" style={{ backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                )}
              </View>
            </HapticTouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderDietaryRestrictions = () => (
    <ScrollView className="flex-1 px-6 py-6">
      <Text className="text-2xl font-bold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
        Any Dietary Restrictions?
      </Text>
      <Text className="text-base mb-6" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
        Optional - Skip if none apply
      </Text>

      {DIETARY_RESTRICTIONS.map((restriction) => {
        const isSelected = data.dietaryRestrictions.includes(restriction.name);
        return (
          <HapticTouchableOpacity
            key={restriction.name}
            onPress={() => toggleSelection('dietaryRestrictions', restriction.name)}
            className="mb-3 p-4 rounded-xl border-2 flex-row items-center"
            style={{
              borderColor: isSelected 
                ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                : (isDark ? DarkColors.border.light : Colors.border.light),
              backgroundColor: isSelected 
                ? (isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight)
                : (isDark ? '#1F2937' : '#FFFFFF'),
            }}
            activeOpacity={0.7}
          >
            <Text className="text-3xl mr-3">{restriction.icon}</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold" style={{ 
                color: isSelected 
                  ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                  : (isDark ? DarkColors.text.primary : Colors.text.primary)
              }}>
                {restriction.name}
              </Text>
              <Text className="text-sm mt-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                {restriction.description}
              </Text>
            </View>
            {isSelected && (
              <View className="rounded-full p-1" style={{ backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
                <Ionicons name="checkmark" size={16} color="white" />
              </View>
            )}
          </HapticTouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderSuperfoods = () => (
    <ScrollView className="flex-1 px-6 py-6">
      <Text className="text-2xl font-bold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
        Preferred Superfoods
      </Text>
      <Text className="text-base mb-6" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
        Optional - Select superfoods you'd like to see more of. Recipes containing these will be boosted in your recommendations!
      </Text>

      <View className="flex-row flex-wrap">
        {SUPERFOOD_CATEGORIES.map((superfood) => {
          const isSelected = data.preferredSuperfoods.includes(superfood.id);
          return (
            <HapticTouchableOpacity
              key={superfood.id}
              onPress={() => toggleSelection('preferredSuperfoods', superfood.id)}
              className="w-[48%] mb-3 p-3 rounded-xl border-2"
              style={{
                borderColor: isSelected 
                  ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                  : (isDark ? DarkColors.border.light : Colors.border.light),
                backgroundColor: isSelected 
                  ? (isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight)
                  : (isDark ? '#1F2937' : '#FFFFFF'),
              }}
              activeOpacity={0.7}
            >
              <View className="items-center">
                {superfood.emoji && (
                  <Text className="text-3xl mb-2">{superfood.emoji}</Text>
                )}
                <Text className="text-sm font-semibold text-center" style={{ 
                  color: isSelected 
                    ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                    : (isDark ? DarkColors.text.primary : Colors.text.primary)
                }}>
                  {superfood.name}
                </Text>
                {isSelected && (
                  <View className="absolute top-2 right-2 rounded-full p-1" style={{ backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
                    <Ionicons name="checkmark" size={10} color="white" />
                  </View>
                )}
              </View>
            </HapticTouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderBannedIngredients = () => (
    <ScrollView className="flex-1 px-6 py-6">
      <Text className="text-2xl font-bold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
        Ingredients to Avoid?
      </Text>
      <Text className="text-base mb-6" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
        Optional - Select ingredients you don't like or are allergic to
      </Text>

      {/* Custom ingredient input */}
      <View className="mb-6">
        <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          Add Custom Ingredient
        </Text>
        <View className="flex-row">
          <TextInput
            value={data.customBannedIngredient}
            onChangeText={(text) => setData({ ...data, customBannedIngredient: text })}
            placeholder="e.g., Cilantro"
            className="flex-1 border rounded-xl px-4 py-3 text-base"
            style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderColor: isDark ? DarkColors.border.light : Colors.border.light,
              borderWidth: 1,
              color: isDark ? DarkColors.text.primary : Colors.text.primary,
            }}
            placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
            returnKeyType="done"
            onSubmitEditing={addCustomIngredient}
          />
          <HapticTouchableOpacity
            onPress={addCustomIngredient}
            className="ml-2 rounded-xl px-4 justify-center"
            style={{ backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color="white" />
          </HapticTouchableOpacity>
        </View>
      </View>

      {/* Common ingredients */}
      <Text className="text-sm font-semibold mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
        Common Ingredients
      </Text>
      <View className="flex-row flex-wrap">
        {COMMON_INGREDIENTS.map((ingredient) => {
          const isSelected = data.bannedIngredients.includes(ingredient);
          return (
            <HapticTouchableOpacity
              key={ingredient}
              onPress={() => toggleSelection('bannedIngredients', ingredient)}
              className="mb-3 mr-2 px-4 py-2 rounded-full border-2"
              style={{
                borderColor: isSelected 
                  ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                  : (isDark ? DarkColors.border.light : Colors.border.light),
                backgroundColor: isSelected 
                  ? (isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight)
                  : (isDark ? '#1F2937' : '#FFFFFF'),
              }}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-medium" style={{ 
                color: isSelected 
                  ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                  : (isDark ? DarkColors.text.primary : Colors.text.primary)
              }}>
                {ingredient}
              </Text>
            </HapticTouchableOpacity>
          );
        })}
      </View>

      {/* Custom banned ingredients */}
      {data.bannedIngredients.filter(ing => !COMMON_INGREDIENTS.includes(ing)).length > 0 && (
        <>
          <Text className="text-sm font-semibold mb-3 mt-4" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
            Your Custom Ingredients
          </Text>
          <View className="flex-row flex-wrap">
            {data.bannedIngredients
              .filter(ing => !COMMON_INGREDIENTS.includes(ing))
              .map((ingredient) => (
                <HapticTouchableOpacity
                  key={ingredient}
                  onPress={() => toggleSelection('bannedIngredients', ingredient)}
                  className="mb-3 mr-2 px-4 py-2 rounded-full border-2"
                  style={{
                    borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
                    backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight,
                  }}
                  activeOpacity={0.7}
                >
                  <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
                    {ingredient}
                  </Text>
                </HapticTouchableOpacity>
              ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderPhysicalProfile = () => (
    <ScrollView className="flex-1 px-6 py-6">
      <Text className="text-2xl font-bold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
        Tell Us About Yourself
      </Text>
      <Text className="text-base mb-6" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
        We'll calculate your nutritional needs
      </Text>

      {/* Unit Toggle */}
      <View className="rounded-xl p-4 mb-4 flex-row items-center justify-between" style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
        <Text className="text-base font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          Use Metric Units (cm, kg)
        </Text>
        <Switch
          value={data.useMetric}
          onValueChange={(value) => setData({ ...data, useMetric: value })}
          trackColor={{ false: isDark ? '#4B5563' : '#d1d5db', true: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
          thumbColor={data.useMetric ? '#fff' : '#f4f3f4'}
        />
      </View>

      {/* Gender */}
      <View className="mb-4">
        <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Gender</Text>
        <View className="flex-row">
          {['male', 'female', 'other'].map((gender) => {
            const isSelected = data.gender === gender;
            return (
              <HapticTouchableOpacity
                key={gender}
                onPress={() => setData({ ...data, gender: gender as any })}
                className={`flex-1 ${gender !== 'other' ? 'mr-2' : ''} py-3 rounded-xl border-2`}
                style={{
                  borderColor: isSelected 
                    ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                    : (isDark ? DarkColors.border.light : Colors.border.light),
                  backgroundColor: isSelected 
                    ? (isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight)
                    : (isDark ? '#1F2937' : '#FFFFFF'),
                }}
                activeOpacity={0.7}
              >
                <Text className="text-center font-semibold capitalize" style={{ 
                  color: isSelected 
                    ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                    : (isDark ? DarkColors.text.primary : Colors.text.primary)
                }}>
                  {gender}
                </Text>
              </HapticTouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Age */}
      <View className="mb-4">
        <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Age</Text>
        <TextInput
          value={data.age}
          onChangeText={(text) => setData({ ...data, age: text })}
          placeholder="Enter your age"
          keyboardType="numeric"
          className="border rounded-xl px-4 py-3 text-base"
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderColor: isDark ? DarkColors.border.light : Colors.border.light,
            borderWidth: 1,
            color: isDark ? DarkColors.text.primary : Colors.text.primary,
          }}
          placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
        />
      </View>

      {/* Height */}
      <View className="mb-4">
        <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          Height {data.useMetric ? '(cm)' : '(feet & inches)'}
        </Text>
        {data.useMetric ? (
          <TextInput
            value={data.heightFeet}
            onChangeText={(text) => setData({ ...data, heightFeet: text })}
            placeholder="Enter height in cm"
            keyboardType="numeric"
            className="border rounded-xl px-4 py-3 text-base"
            style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderColor: isDark ? DarkColors.border.light : Colors.border.light,
              borderWidth: 1,
              color: isDark ? DarkColors.text.primary : Colors.text.primary,
            }}
            placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
          />
        ) : (
          <View className="flex-row">
            <TextInput
              value={data.heightFeet}
              onChangeText={(text) => setData({ ...data, heightFeet: text })}
              placeholder="Feet"
              keyboardType="numeric"
              className="flex-1 mr-2 border rounded-xl px-4 py-3 text-base"
              style={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderColor: isDark ? DarkColors.border.light : Colors.border.light,
                borderWidth: 1,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
              }}
              placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
            />
            <TextInput
              value={data.heightInches}
              onChangeText={(text) => setData({ ...data, heightInches: text })}
              placeholder="Inches"
              keyboardType="numeric"
              className="flex-1 border rounded-xl px-4 py-3 text-base"
              style={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderColor: isDark ? DarkColors.border.light : Colors.border.light,
                borderWidth: 1,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
              }}
              placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
            />
          </View>
        )}
      </View>

      {/* Weight */}
      <View className="mb-4">
        <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          Weight {data.useMetric ? '(kg)' : '(lbs)'}
        </Text>
        <TextInput
          value={data.weight}
          onChangeText={(text) => setData({ ...data, weight: text })}
          placeholder={`Enter weight in ${data.useMetric ? 'kg' : 'lbs'}`}
          keyboardType="numeric"
          className="border rounded-xl px-4 py-3 text-base"
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderColor: isDark ? DarkColors.border.light : Colors.border.light,
            borderWidth: 1,
            color: isDark ? DarkColors.text.primary : Colors.text.primary,
          }}
          placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
        />
      </View>

      {/* Activity Level */}
      <View className="mb-4">
        <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Activity Level</Text>
        {ACTIVITY_LEVELS.map((level) => {
          const isSelected = data.activityLevel === level.value;
          return (
            <HapticTouchableOpacity
              key={level.value}
              onPress={() => setData({ ...data, activityLevel: level.value })}
              className="mb-2 p-4 rounded-xl border-2"
              style={{
                borderColor: isSelected 
                  ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                  : (isDark ? DarkColors.border.light : Colors.border.light),
                backgroundColor: isSelected 
                  ? (isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight)
                  : (isDark ? '#1F2937' : '#FFFFFF'),
              }}
              activeOpacity={0.7}
            >
              <Text className="text-base font-semibold mb-1" style={{ 
                color: isSelected 
                  ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                  : (isDark ? DarkColors.text.primary : Colors.text.primary)
              }}>
                {level.label}
              </Text>
              <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                {level.description}
              </Text>
            </HapticTouchableOpacity>
          );
        })}
      </View>

      {/* Fitness Goal */}
      <View className="mb-4">
        <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Fitness Goal</Text>
        <View className="flex-row flex-wrap">
          {FITNESS_GOALS.map((goal) => {
            const isSelected = data.fitnessGoal === goal.value;
            let bgColor = isSelected 
              ? (goal.value === 'lose_weight' ? (isDark ? '#DC2626' : '#DC2626')
                : goal.value === 'maintain' ? (isDark ? '#10B981' : '#10B981')
                : goal.value === 'gain_muscle' ? (isDark ? '#8B5CF6' : '#8B5CF6')
                : (isDark ? '#F97316' : '#F97316'))
              : (isDark ? '#1F2937' : '#FFFFFF');
            let borderColor = isSelected 
              ? (goal.value === 'lose_weight' ? (isDark ? '#DC2626' : '#DC2626')
                : goal.value === 'maintain' ? (isDark ? '#10B981' : '#10B981')
                : goal.value === 'gain_muscle' ? (isDark ? '#8B5CF6' : '#8B5CF6')
                : (isDark ? '#F97316' : '#F97316'))
              : (isDark ? DarkColors.border.light : Colors.border.light);
            
            return (
              <HapticTouchableOpacity
                key={goal.value}
                onPress={() => setData({ ...data, fitnessGoal: goal.value })}
                className={`w-[48%] ${FITNESS_GOALS.indexOf(goal) % 2 === 0 ? 'mr-[4%]' : ''} mb-4 p-4 rounded-2xl border-2`}
                style={{
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                }}
                activeOpacity={0.7}
              >
                <Text className="text-3xl text-center mb-2">{goal.icon}</Text>
                <Text className="text-sm font-semibold text-center mb-1" style={{ 
                  color: isSelected ? 'white' : (isDark ? DarkColors.text.primary : Colors.text.primary)
                }}>
                  {goal.label}
                </Text>
                <Text className="text-xs text-center" style={{ 
                  color: isSelected ? 'white' : (isDark ? DarkColors.text.secondary : Colors.text.secondary)
                }}>
                  {goal.description}
                </Text>
              </HapticTouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );

  // Fetch recipes for roulette
  const fetchRouletteRecipes = async () => {
    try {
      setRouletteLoading(true);
      const response = await recipeApi.getAllRecipes({
        page: 0,
        limit: 20, // Get 20 recipes for roulette
      });
      
      const responseData = response.data;
      let recipes: SuggestedRecipe[] = [];
      
      if (responseData && responseData.recipes && Array.isArray(responseData.recipes)) {
        recipes = responseData.recipes;
      } else if (Array.isArray(responseData)) {
        recipes = responseData;
      }
      
      setRouletteRecipes(recipes);
    } catch (error) {
      console.error('Error fetching roulette recipes:', error);
      Alert.alert('Error', 'Failed to load recipes. You can skip this step.');
    } finally {
      setRouletteLoading(false);
    }
  };

  // Handle roulette like
  const handleRouletteLike = async (recipeId: string) => {
    setRouletteLiked(prev => new Set(prev).add(recipeId));
    setRoulettePassed(prev => {
      const next = new Set(prev);
      next.delete(recipeId);
      return next;
    });
    
    // Save like to backend
    try {
      await recipeApi.likeRecipe(recipeId);
    } catch (error) {
      console.error('Error liking recipe:', error);
    }
  };

  // Handle roulette pass
  const handleRoulettePass = async (recipeId: string) => {
    setRoulettePassed(prev => new Set(prev).add(recipeId));
    setRouletteLiked(prev => {
      const next = new Set(prev);
      next.delete(recipeId);
      return next;
    });
    
    // Save dislike to backend
    try {
      await recipeApi.dislikeRecipe(recipeId);
    } catch (error) {
      console.error('Error disliking recipe:', error);
    }
  };

  const renderRoulette = () => {
    if (rouletteLoading) {
      return (
        <View className="flex-1 justify-center items-center px-6">
          <LoadingState
            message="Loading recipes for you..."
            expression="thinking"
            size="large"
          />
        </View>
      );
    }

    if (rouletteRecipes.length === 0) {
      return (
        <ScrollView className="flex-1 px-6 py-8">
          <View className="items-center mb-8">
            <LogoMascot 
              expression="curious" 
              size="large" 
              style={{ marginBottom: 16 }}
            />
            <Text className="text-2xl font-bold text-center mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              No Recipes Available
            </Text>
            <Text className="text-lg text-center mb-6" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              We couldn't load any recipes right now. You can skip this step and continue.
            </Text>
            <HapticTouchableOpacity
              onPress={nextStep}
              className="py-4 px-8 rounded-xl"
              style={{ backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
            >
              <Text className="text-white font-semibold text-lg">Skip This Step</Text>
            </HapticTouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    return (
      <View className="flex-1">
        <RecipeRoulette
          recipes={rouletteRecipes}
          onLike={handleRouletteLike}
          onPass={handleRoulettePass}
          onClose={() => {
            // When roulette closes (all recipes viewed), show message that they can continue
            // The Continue button will be enabled if they've interacted with at least one recipe
          }}
          initialIndex={0}
        />
      </View>
    );
  };

  const renderReview = () => (
    <ScrollView className="flex-1 px-6 py-6">
      <Text className="text-2xl font-bold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
        Review Your Profile
      </Text>
      <Text className="text-base mb-6" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
        Make sure everything looks good
      </Text>

      {/* Cuisines */}
      <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
        <Text className="text-lg font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          🍝 Favorite Cuisines
        </Text>
        <Text className="text-base" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
          {data.likedCuisines.join(', ') || 'None selected'}
        </Text>
      </View>

      {/* Dietary Restrictions */}
      <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
        <Text className="text-lg font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          🥗 Dietary Restrictions
        </Text>
        <Text className="text-base" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
          {data.dietaryRestrictions.length > 0 ? data.dietaryRestrictions.join(', ') : 'None'}
        </Text>
      </View>

      {/* Preferred Superfoods */}
      <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
        <Text className="text-lg font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          🌟 Preferred Superfoods
        </Text>
        <Text className="text-base" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
          {data.preferredSuperfoods.length > 0 
            ? data.preferredSuperfoods.map(id => {
                const superfood = SUPERFOOD_CATEGORIES.find(sf => sf.id === id);
                return superfood?.name || id;
              }).join(', ')
            : 'None'}
        </Text>
      </View>

      {/* Banned Ingredients */}
      <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
        <Text className="text-lg font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          🚫 Ingredients to Avoid
        </Text>
        <Text className="text-base" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
          {data.bannedIngredients.length > 0 ? data.bannedIngredients.join(', ') : 'None'}
        </Text>
      </View>

      {/* Physical Profile */}
      <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
        <Text className="text-lg font-semibold mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          💪 Physical Profile
        </Text>
        <View className="space-y-2">
          <View className="flex-row justify-between py-2 border-b" style={{ borderBottomColor: isDark ? DarkColors.border.light : Colors.border.light }}>
            <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Gender</Text>
            <Text className="text-sm font-medium capitalize" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>{data.gender}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b" style={{ borderBottomColor: isDark ? DarkColors.border.light : Colors.border.light }}>
            <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Age</Text>
            <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>{data.age} years</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b" style={{ borderBottomColor: isDark ? DarkColors.border.light : Colors.border.light }}>
            <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Height</Text>
            <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              {data.useMetric 
                ? `${data.heightFeet} cm` 
                : `${data.heightFeet}' ${data.heightInches}"`
              }
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b" style={{ borderBottomColor: isDark ? DarkColors.border.light : Colors.border.light }}>
            <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Weight</Text>
            <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              {data.weight} {data.useMetric ? 'kg' : 'lbs'}
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b" style={{ borderBottomColor: isDark ? DarkColors.border.light : Colors.border.light }}>
            <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Activity Level</Text>
            <Text className="text-sm font-medium capitalize" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              {ACTIVITY_LEVELS.find(l => l.value === data.activityLevel)?.label}
            </Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Fitness Goal</Text>
            <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              {FITNESS_GOALS.find(g => g.value === data.fitnessGoal)?.label}
            </Text>
          </View>
        </View>
      </View>

      <View className="rounded-xl p-4 border" style={{
        backgroundColor: isDark ? `${Colors.secondaryRedLight}1A` : Colors.secondaryRedLight,
        borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
      }}>
        <Text className="text-sm text-center" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
          💡 You can update these preferences anytime from your Profile
        </Text>
      </View>
    </ScrollView>
  );

  // Show loading screen while fetching data in edit mode
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <LoadingState
          message="Loading your preferences..."
          expression="thinking"
          size="large"
          fullScreen
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 border-b" style={{ 
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderBottomColor: isDark ? DarkColors.border.light : Colors.border.light,
        }}>
          <View className="flex-row items-center justify-between mb-3">
            {currentStep > 0 ? (
              <HapticTouchableOpacity onPress={prevStep} className="p-1">
                <Ionicons name="arrow-back" size={24} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} />
              </HapticTouchableOpacity>
            ) : (
              <View style={{ width: 32 }} />
            )}
            <View className="flex-row items-center">
              <LogoMascot 
                expression={getMascotExpression()} 
                size="small" 
                style={{ marginRight: 8 }}
              />
              <Text className="text-base font-medium" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                Step {currentStep + 1} of {totalSteps}
              </Text>
            </View>
            <HapticTouchableOpacity onPress={skipOnboarding} className="p-1">
              <Text className="text-base font-medium" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>Skip</Text>
            </HapticTouchableOpacity>
          </View>
          {/* Progress Bar */}
          <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
            <View 
              className="h-full rounded-full"
              style={{ 
                width: `${progress}%`,
                backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
              }}
            />
          </View>
        </View>

        {/* Content */}
        {renderStep()}

        {/* Bottom Bar */}
        <View className="px-6 py-4 border-t" style={{ 
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderTopColor: isDark ? DarkColors.border.light : Colors.border.light,
        }}>
          <HapticTouchableOpacity
            onPress={nextStep}
            disabled={!canProceed() || saving}
            className="py-4 rounded-xl"
            style={{
              backgroundColor: (!canProceed() || saving)
                ? (isDark ? '#4B5563' : '#D1D5DB')
                : (isDark ? DarkColors.secondaryRed : Colors.secondaryRed),
            }}
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
          </HapticTouchableOpacity>
        </View>
      </View>
      
      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={successMessage.title}
        message={successMessage.message}
        expression={isEditMode ? 'chef-kiss' : 'excited'}
        actionLabel={isEditMode ? 'Done' : 'Get Started'}
        onAction={() => {
          setShowSuccessModal(false);
          if (isEditMode) {
            // Redirect to profile page when editing preferences
            router.replace('/(tabs)/profile');
          } else {
            router.replace('/(tabs)');
          }
        }}
        onDismiss={() => {
          setShowSuccessModal(false);
          if (isEditMode) {
            // Redirect to profile page when editing preferences
            router.replace('/(tabs)/profile');
          } else {
            router.replace('/(tabs)');
          }
        }}
      />
    </SafeAreaView>
  );
}
