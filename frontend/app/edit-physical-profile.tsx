import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { userApi } from '../lib/api';
import * as Haptics from 'expo-haptics';
import { Colors, DarkColors } from '../constants/Colors';
import { useColorScheme } from 'nativewind';

const GENDERS = [
  { value: 'male', label: 'Male', icon: 'male' },
  { value: 'female', label: 'Female', icon: 'female' },
  { value: 'other', label: 'Other', icon: 'transgender' }
] as const;

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'lightly_active', label: 'Lightly Active', description: '1-3 days/week' },
  { value: 'moderately_active', label: 'Moderately Active', description: '3-5 days/week' },
  { value: 'very_active', label: 'Very Active', description: '6-7 days/week' },
  { value: 'extra_active', label: 'Extra Active', description: 'Physical job + exercise' }
] as const;

const FITNESS_GOALS = [
  { value: 'lose_weight', label: 'Lose Weight', icon: 'trending-down', color: 'bg-red-600 dark:bg-red-400' },
  { value: 'maintain', label: 'Maintain', icon: 'remove', color: 'bg-green-500' },
  { value: 'gain_muscle', label: 'Gain Muscle', icon: 'fitness', color: 'bg-purple-500' },
  { value: 'gain_weight', label: 'Gain Weight', icon: 'trending-up', color: 'bg-orange-500' }
] as const;

export default function EditPhysicalProfileScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Form state
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [age, setAge] = useState('');
  
  // Height - stored in cm, but can input in feet/inches
  const [heightCm, setHeightCm] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  
  // Weight - stored in kg, but can input in lbs
  const [weightKg, setWeightKg] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  
  const [activityLevel, setActivityLevel] = useState<string>('moderately_active');
  const [fitnessGoal, setFitnessGoal] = useState<string>('maintain');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [targetWeightLbs, setTargetWeightLbs] = useState('');
  const [useMetric, setUseMetric] = useState(false); // Default to imperial (US)
  
  // Calculated values (from backend after save)
  const [bmr, setBmr] = useState<number | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoadingData(true);
      const response = await userApi.getPhysicalProfile();
      const profile = response.data;
      
      console.log('📱 Edit Physical Profile: Loaded profile', profile);
      
      // If profile is null, user hasn't set it up yet - use defaults
      if (!profile) {
        console.log('📱 Edit Physical Profile: No existing profile, starting fresh');
        setLoadingData(false);
        return;
      }
      
      // Load existing profile data
      setGender(profile.gender);
      setAge(profile.age.toString());
      
      // Convert and set height
      setHeightCm(profile.heightCm.toString());
      const heightFtIn = cmToFeetInches(profile.heightCm);
      setHeightFeet(heightFtIn.feet.toString());
      setHeightInches(heightFtIn.inches.toString());
      
      // Convert and set weight
      setWeightKg(profile.weightKg.toString());
      setWeightLbs(kgToLbs(profile.weightKg).toString());
      
      setActivityLevel(profile.activityLevel);
      setFitnessGoal(profile.fitnessGoal);
      
      // Convert and set target weight
      if (profile.targetWeightKg) {
        setTargetWeightKg(profile.targetWeightKg.toString());
        setTargetWeightLbs(kgToLbs(profile.targetWeightKg).toString());
      }
      
      setBmr(profile.bmr || null);
      setTdee(profile.tdee || null);
    } catch (error: any) {
      console.error('📱 Edit Physical Profile: Error loading profile', error);
      // Non-blocking error - let user create profile
      Alert.alert('Notice', 'Starting with a fresh profile. Fill in your details below.');
    } finally {
      setLoadingData(false);
    }
  };

  // Unit conversions
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
  const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462 * 10) / 10;
  const cmToFeetInches = (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };
  const feetInchesToCm = (feet: number, inches: number) => Math.round((feet * 12 + inches) * 2.54);

  // Height change handlers
  const handleHeightFeetChange = (value: string) => {
    setHeightFeet(value);
    const feet = parseFloat(value) || 0;
    const inches = parseFloat(heightInches) || 0;
    const cm = feetInchesToCm(feet, inches);
    setHeightCm(cm.toString());
  };

  const handleHeightInchesChange = (value: string) => {
    setHeightInches(value);
    const feet = parseFloat(heightFeet) || 0;
    const inches = parseFloat(value) || 0;
    const cm = feetInchesToCm(feet, inches);
    setHeightCm(cm.toString());
  };

  const handleHeightCmChange = (value: string) => {
    setHeightCm(value);
    const cm = parseFloat(value) || 0;
    const { feet, inches } = cmToFeetInches(cm);
    setHeightFeet(feet.toString());
    setHeightInches(inches.toString());
  };

  // Weight change handlers
  const handleWeightLbsChange = (value: string) => {
    setWeightLbs(value);
    const lbs = parseFloat(value) || 0;
    const kg = lbsToKg(lbs);
    setWeightKg(kg.toString());
  };

  const handleWeightKgChange = (value: string) => {
    setWeightKg(value);
    const kg = parseFloat(value) || 0;
    const lbs = kgToLbs(kg);
    setWeightLbs(lbs.toString());
  };

  const handleTargetWeightLbsChange = (value: string) => {
    setTargetWeightLbs(value);
    const lbs = parseFloat(value) || 0;
    const kg = lbsToKg(lbs);
    setTargetWeightKg(kg.toString());
  };

  const handleTargetWeightKgChange = (value: string) => {
    setTargetWeightKg(value);
    const kg = parseFloat(value) || 0;
    const lbs = kgToLbs(kg);
    setTargetWeightLbs(lbs.toString());
  };

  const handleSave = async () => {
    // Calculate actual values from either metric or imperial inputs
    let finalHeightCm: number;
    let finalWeightKg: number;

    if (useMetric) {
      // Using metric - get from metric inputs
      finalHeightCm = parseFloat(heightCm) || 0;
      finalWeightKg = parseFloat(weightKg) || 0;
    } else {
      // Using imperial - convert from imperial inputs
      const feet = parseFloat(heightFeet) || 0;
      const inches = parseFloat(heightInches) || 0;
      finalHeightCm = feetInchesToCm(feet, inches);
      
      const lbs = parseFloat(weightLbs) || 0;
      finalWeightKg = lbsToKg(lbs);
    }

    // Validation - check for actual values
    if (!gender || !age || !activityLevel || !fitnessGoal) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    const ageNum = parseInt(age);

    // Validate age
    if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', 'Age must be between 13 and 120');
      return;
    }

    // Validate height - check if we have valid input
    if (useMetric) {
      if (!heightCm || isNaN(parseFloat(heightCm)) || finalHeightCm < 100 || finalHeightCm > 250) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Validation Error', 'Height must be between 3\'3" and 8\'2" (100cm - 250cm)');
        return;
      }
    } else {
      const feet = parseFloat(heightFeet) || 0;
      const inches = parseFloat(heightInches) || 0;
      if ((feet === 0 && inches === 0) || finalHeightCm < 100 || finalHeightCm > 250) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Validation Error', 'Height must be between 3\'3" and 8\'2" (100cm - 250cm)');
        return;
      }
    }

    // Validate weight - check if we have valid input
    if (useMetric) {
      if (!weightKg || isNaN(parseFloat(weightKg)) || finalWeightKg < 30 || finalWeightKg > 300) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Validation Error', 'Weight must be between 66 lbs and 661 lbs (30kg - 300kg)');
        return;
      }
    } else {
      const lbs = parseFloat(weightLbs) || 0;
      if (lbs === 0 || finalWeightKg < 30 || finalWeightKg > 300) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Validation Error', 'Weight must be between 66 lbs and 661 lbs (30kg - 300kg)');
        return;
      }
    }

    // Use calculated values
    const heightNum = finalHeightCm;
    const weightNum = finalWeightKg;

    try {
      setLoading(true);
      
      // Ensure we have the latest converted values
      const profileData: any = {
        gender,
        age: ageNum,
        heightCm: heightNum, // Always use calculated cm value
        weightKg: weightNum, // Always use calculated kg value
        activityLevel,
        fitnessGoal
      };

      if (targetWeightKg) {
        const targetNum = parseFloat(targetWeightKg);
        if (!isNaN(targetNum)) {
          profileData.targetWeightKg = targetNum;
        }
      }

      const response = await userApi.updatePhysicalProfile(profileData);
      console.log('📱 Edit Physical Profile: Profile saved', response.data);
      
      // Update calculated values
      if (response.data.profile) {
        setBmr(response.data.profile.bmr);
        setTdee(response.data.profile.tdee);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Physical profile saved successfully!', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);
    } catch (error: any) {
      console.error('📱 Edit Physical Profile: Save error', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to save physical profile');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Ionicons name="body-outline" size={64} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} />
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
        <Text className="text-xl font-bold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Physical Profile</Text>
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
        {/* Gender Selection */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-semibold mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Gender *</Text>
          <View className="flex-row gap-2">
            {GENDERS.map((g) => (
              <HapticTouchableOpacity
                key={g.value}
                onPress={() => setGender(g.value)}
                className="flex-1 py-3 rounded-lg flex-row items-center justify-center"
                style={{
                  backgroundColor: gender === g.value 
                    ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                    : (isDark ? '#374151' : '#E5E7EB')
                }}
              >
                <Ionicons 
                  name={g.icon as any} 
                  size={18} 
                  color={gender === g.value ? 'white' : (isDark ? DarkColors.text.primary : Colors.text.primary)} 
                />
                <Text className="ml-2 font-medium" style={{ color: gender === g.value ? 'white' : (isDark ? DarkColors.text.primary : Colors.text.primary) }}>
                  {g.label}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Age *</Text>
          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder="25"
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
        </View>

        {/* Height */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-lg font-semibold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Height *</Text>
            <HapticTouchableOpacity 
              onPress={() => setUseMetric(!useMetric)}
              className="px-3 py-1 rounded-lg"
              style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}
            >
              <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                {useMetric ? 'Switch to ft/in' : 'Switch to cm'}
              </Text>
            </HapticTouchableOpacity>
          </View>
          
          {useMetric ? (
            // Metric input (cm)
            <TextInput
              value={heightCm}
              onChangeText={handleHeightCmChange}
              placeholder="170"
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
          ) : (
            // Imperial input (feet and inches)
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="text-xs mb-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Feet</Text>
                <TextInput
                  value={heightFeet}
                  onChangeText={handleHeightFeetChange}
                  placeholder="5"
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
              </View>
              <View className="flex-1">
                <Text className="text-xs mb-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Inches</Text>
                <TextInput
                  value={heightInches}
                  onChangeText={handleHeightInchesChange}
                  placeholder="10"
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
              </View>
            </View>
          )}
          
          {heightCm && parseFloat(heightCm) > 0 && (
            <Text className="text-xs mt-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              {useMetric ? `≈ ${cmToFeetInches(parseFloat(heightCm)).feet}' ${cmToFeetInches(parseFloat(heightCm)).inches}"` : `≈ ${heightCm} cm`}
            </Text>
          )}
        </View>

        {/* Weight */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Current Weight *</Text>
          <TextInput
            value={useMetric ? weightKg : weightLbs}
            onChangeText={useMetric ? handleWeightKgChange : handleWeightLbsChange}
            placeholder={useMetric ? '70' : '154'}
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
          {weightKg && parseFloat(weightKg) > 0 && (
            <Text className="text-xs mt-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              {useMetric ? `≈ ${kgToLbs(parseFloat(weightKg))} lbs` : `≈ ${weightKg} kg`}
            </Text>
          )}
        </View>

        {/* Target Weight (Optional) */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-semibold mb-2" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
            Target Weight <Text className="text-sm" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>(Optional)</Text>
          </Text>
          <TextInput
            value={useMetric ? targetWeightKg : targetWeightLbs}
            onChangeText={useMetric ? handleTargetWeightKgChange : handleTargetWeightLbsChange}
            placeholder={useMetric ? '65' : '143'}
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
          {targetWeightKg && parseFloat(targetWeightKg) > 0 && (
            <Text className="text-xs mt-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
              {useMetric ? `≈ ${kgToLbs(parseFloat(targetWeightKg))} lbs` : `≈ ${targetWeightKg} kg`}
            </Text>
          )}
        </View>

        {/* Activity Level */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-semibold mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Activity Level *</Text>
          {ACTIVITY_LEVELS.map((level) => {
            const isSelected = activityLevel === level.value;
            return (
              <HapticTouchableOpacity
                key={level.value}
                onPress={() => setActivityLevel(level.value)}
                className="p-3 rounded-lg mb-2"
                style={{
                  backgroundColor: isSelected 
                    ? (isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedDark)
                    : (isDark ? '#1F2937' : '#F9FAFB'),
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: isSelected 
                    ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark)
                    : 'transparent',
                }}
              >
                <Text className="font-medium" style={{ 
                  color: isSelected 
                    ? (isDark ? DarkColors.secondaryRed : '#FFFFFF')
                    : (isDark ? DarkColors.text.primary : Colors.text.primary)
                }}>
                  {level.label}
                </Text>
                <Text className="text-xs mt-1" style={{ 
                  color: isSelected 
                    ? (isDark ? DarkColors.text.secondary : '#FFFFFF')
                    : (isDark ? DarkColors.text.secondary : Colors.text.secondary)
                }}>
                  {level.description}
                </Text>
              </HapticTouchableOpacity>
            );
          })}
        </View>

        {/* Fitness Goal */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-semibold mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Fitness Goal *</Text>
          <View className="flex-row flex-wrap gap-2">
            {FITNESS_GOALS.map((goal) => {
              const isSelected = fitnessGoal === goal.value;
              let bgColor = isSelected 
                ? (goal.value === 'lose_weight' ? (isDark ? '#DC2626' : '#DC2626')
                  : goal.value === 'maintain' ? (isDark ? '#10B981' : '#10B981')
                  : goal.value === 'gain_muscle' ? (isDark ? '#8B5CF6' : '#8B5CF6')
                  : (isDark ? '#F97316' : '#F97316'))
                : (isDark ? '#374151' : '#E5E7EB');
              
              return (
                <HapticTouchableOpacity
                  key={goal.value}
                  onPress={() => setFitnessGoal(goal.value)}
                  className="flex-1 min-w-[45%] p-3 rounded-lg flex-row items-center"
                  style={{ backgroundColor: bgColor }}
                >
                  <Ionicons 
                    name={goal.icon as any} 
                    size={20} 
                    color={isSelected ? 'white' : (isDark ? DarkColors.text.primary : Colors.text.primary)} 
                  />
                  <Text className="ml-2 text-sm font-medium" style={{ color: isSelected ? 'white' : (isDark ? DarkColors.text.primary : Colors.text.primary) }}>
                    {goal.label}
                  </Text>
                </HapticTouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Calculated Metrics */}
        {(bmr || tdee) && (
          <View className="rounded-xl p-4 mb-4 border" style={{
            backgroundColor: isDark ? `${Colors.secondaryRedLight}1A` : Colors.secondaryRedDark,
            borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark,
          }}>
            <View className="flex-row items-center mb-3">
              <Ionicons name="calculator" size={20} color={isDark ? DarkColors.secondaryRed : '#FFFFFF'} />
              <Text className="ml-2 text-lg font-semibold" style={{ color: isDark ? DarkColors.text.primary : '#FFFFFF' }}>Calculated Metrics</Text>
            </View>
            {bmr && (
              <View className="mb-2">
                <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : '#FFFFFF' }}>Basal Metabolic Rate (BMR)</Text>
                <Text className="text-2xl font-bold" style={{ color: isDark ? DarkColors.text.primary : '#FFFFFF' }}>{Math.round(bmr)} cal/day</Text>
              </View>
            )}
            {tdee && (
              <View>
                <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : '#FFFFFF' }}>Total Daily Energy Expenditure (TDEE)</Text>
                <Text className="text-2xl font-bold" style={{ color: isDark ? DarkColors.text.primary : '#FFFFFF' }}>{Math.round(tdee)} cal/day</Text>
              </View>
            )}
            <Text className="text-xs mt-3" style={{ color: isDark ? DarkColors.text.secondary : '#FFFFFF' }}>
              These values are calculated based on your physical data and will update your macro recommendations.
            </Text>
          </View>
        )}

        {/* Info Box */}
        <View className="rounded-xl p-4 mb-4 border" style={{
          backgroundColor: isDark ? `${Colors.secondaryRedLight}1A` : Colors.secondaryRedDark,
          borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark,
        }}>
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color={isDark ? DarkColors.secondaryRed : '#FFFFFF'} />
            <Text className="flex-1 ml-2 text-sm" style={{ color: isDark ? DarkColors.secondaryRed : '#FFFFFF' }}>
              This information helps us calculate your personalized macro nutrient goals based on scientific formulas. All fields marked with * are required.
            </Text>
          </View>
        </View>

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
}

