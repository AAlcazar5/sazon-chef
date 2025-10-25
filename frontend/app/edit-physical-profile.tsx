import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { userApi } from '../lib/api';

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
  { value: 'lose_weight', label: 'Lose Weight', icon: 'trending-down', color: 'bg-blue-500' },
  { value: 'maintain', label: 'Maintain', icon: 'remove', color: 'bg-green-500' },
  { value: 'gain_muscle', label: 'Gain Muscle', icon: 'fitness', color: 'bg-purple-500' },
  { value: 'gain_weight', label: 'Gain Weight', icon: 'trending-up', color: 'bg-orange-500' }
] as const;

export default function EditPhysicalProfileScreen() {
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
    // Validation
    if (!gender || !age || !heightCm || !weightKg || !activityLevel || !fitnessGoal) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    const ageNum = parseInt(age);
    const heightNum = parseFloat(heightCm);
    const weightNum = parseFloat(weightKg);

    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      Alert.alert('Validation Error', 'Age must be between 13 and 120');
      return;
    }

    if (isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      Alert.alert('Validation Error', 'Height must be between 3\'3" and 8\'2" (100cm - 250cm)');
      return;
    }

    if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      Alert.alert('Validation Error', 'Weight must be between 66 lbs and 661 lbs (30kg - 300kg)');
      return;
    }

    try {
      setLoading(true);
      
      const profileData: any = {
        gender,
        age: ageNum,
        heightCm: heightNum,
        weightKg: weightNum,
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
      
      Alert.alert('Success', 'Physical profile saved successfully!', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);
    } catch (error: any) {
      console.error('📱 Edit Physical Profile: Save error', error);
      Alert.alert('Error', error.message || 'Failed to save physical profile');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Ionicons name="body-outline" size={64} color="#9CA3AF" />
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
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Physical Profile</Text>
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
        {/* Gender Selection */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Gender *</Text>
          <View className="flex-row gap-2">
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                onPress={() => setGender(g.value)}
                className={`flex-1 py-3 rounded-lg flex-row items-center justify-center ${
                  gender === g.value ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              >
                <Ionicons 
                  name={g.icon as any} 
                  size={18} 
                  color={gender === g.value ? 'white' : '#374151'} 
                />
                <Text className={`ml-2 font-medium ${
                  gender === g.value ? 'text-white' : 'text-gray-700'
                }`}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-2">Age *</Text>
          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder="25"
            keyboardType="numeric"
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Height */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-lg font-semibold text-gray-900">Height *</Text>
            <TouchableOpacity 
              onPress={() => setUseMetric(!useMetric)}
              className="bg-gray-200 px-3 py-1 rounded-lg"
            >
              <Text className="text-gray-700 text-xs font-medium">
                {useMetric ? 'Switch to ft/in' : 'Switch to cm'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {useMetric ? (
            // Metric input (cm)
            <TextInput
              value={heightCm}
              onChangeText={handleHeightCmChange}
              placeholder="170"
              keyboardType="numeric"
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
              placeholderTextColor="#9CA3AF"
            />
          ) : (
            // Imperial input (feet and inches)
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Text className="text-gray-600 text-xs mb-1">Feet</Text>
                <TextInput
                  value={heightFeet}
                  onChangeText={handleHeightFeetChange}
                  placeholder="5"
                  keyboardType="numeric"
                  className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View className="flex-1">
                <Text className="text-gray-600 text-xs mb-1">Inches</Text>
                <TextInput
                  value={heightInches}
                  onChangeText={handleHeightInchesChange}
                  placeholder="10"
                  keyboardType="numeric"
                  className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          )}
          
          {heightCm && parseFloat(heightCm) > 0 && (
            <Text className="text-gray-500 text-xs mt-2">
              {useMetric ? `≈ ${cmToFeetInches(parseFloat(heightCm)).feet}' ${cmToFeetInches(parseFloat(heightCm)).inches}"` : `≈ ${heightCm} cm`}
            </Text>
          )}
        </View>

        {/* Weight */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-2">Current Weight *</Text>
          <TextInput
            value={useMetric ? weightKg : weightLbs}
            onChangeText={useMetric ? handleWeightKgChange : handleWeightLbsChange}
            placeholder={useMetric ? '70' : '154'}
            keyboardType="numeric"
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
            placeholderTextColor="#9CA3AF"
          />
          {weightKg && parseFloat(weightKg) > 0 && (
            <Text className="text-gray-500 text-xs mt-2">
              {useMetric ? `≈ ${kgToLbs(parseFloat(weightKg))} lbs` : `≈ ${weightKg} kg`}
            </Text>
          )}
        </View>

        {/* Target Weight (Optional) */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-2">
            Target Weight <Text className="text-gray-400 text-sm">(Optional)</Text>
          </Text>
          <TextInput
            value={useMetric ? targetWeightKg : targetWeightLbs}
            onChangeText={useMetric ? handleTargetWeightKgChange : handleTargetWeightLbsChange}
            placeholder={useMetric ? '65' : '143'}
            keyboardType="numeric"
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
            placeholderTextColor="#9CA3AF"
          />
          {targetWeightKg && parseFloat(targetWeightKg) > 0 && (
            <Text className="text-gray-500 text-xs mt-2">
              {useMetric ? `≈ ${kgToLbs(parseFloat(targetWeightKg))} lbs` : `≈ ${targetWeightKg} kg`}
            </Text>
          )}
        </View>

        {/* Activity Level */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Activity Level *</Text>
          {ACTIVITY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              onPress={() => setActivityLevel(level.value)}
              className={`p-3 rounded-lg mb-2 ${
                activityLevel === level.value ? 'bg-orange-100 border-2 border-orange-500' : 'bg-gray-50'
              }`}
            >
              <Text className={`font-medium ${
                activityLevel === level.value ? 'text-orange-900' : 'text-gray-900'
              }`}>
                {level.label}
              </Text>
              <Text className="text-gray-600 text-xs mt-1">{level.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fitness Goal */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Fitness Goal *</Text>
          <View className="flex-row flex-wrap gap-2">
            {FITNESS_GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.value}
                onPress={() => setFitnessGoal(goal.value)}
                className={`flex-1 min-w-[45%] p-3 rounded-lg flex-row items-center ${
                  fitnessGoal === goal.value ? goal.color : 'bg-gray-200'
                }`}
              >
                <Ionicons 
                  name={goal.icon as any} 
                  size={20} 
                  color={fitnessGoal === goal.value ? 'white' : '#374151'} 
                />
                <Text className={`ml-2 text-sm font-medium ${
                  fitnessGoal === goal.value ? 'text-white' : 'text-gray-700'
                }`}>
                  {goal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Calculated Metrics */}
        {(bmr || tdee) && (
          <View className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4 border border-blue-200">
            <Text className="text-lg font-semibold text-gray-900 mb-3 flex-row items-center">
              <Ionicons name="calculator" size={20} color="#1F2937" />
              <Text className="ml-2">Calculated Metrics</Text>
            </Text>
            {bmr && (
              <View className="mb-2">
                <Text className="text-gray-600 text-sm">Basal Metabolic Rate (BMR)</Text>
                <Text className="text-2xl font-bold text-gray-900">{Math.round(bmr)} cal/day</Text>
              </View>
            )}
            {tdee && (
              <View>
                <Text className="text-gray-600 text-sm">Total Daily Energy Expenditure (TDEE)</Text>
                <Text className="text-2xl font-bold text-gray-900">{Math.round(tdee)} cal/day</Text>
              </View>
            )}
            <Text className="text-gray-500 text-xs mt-3">
              These values are calculated based on your physical data and will update your macro recommendations.
            </Text>
          </View>
        )}

        {/* Info Box */}
        <View className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-200">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text className="flex-1 ml-2 text-blue-900 text-sm">
              This information helps us calculate your personalized macro nutrient goals based on scientific formulas. All fields marked with * are required.
            </Text>
          </View>
        </View>

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

