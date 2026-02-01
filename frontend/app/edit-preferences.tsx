import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import { userApi } from '../lib/api';
import { SUPERFOOD_CATEGORIES } from '../constants/Superfoods';
import { Colors, DarkColors } from '../constants/Colors';
import { Spacing, BorderRadius } from '../constants/Spacing';
import { HapticPatterns } from '../constants/Haptics';

// Predefined options
const CUISINE_OPTIONS = ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian', 'Middle Eastern', 'Latin American'];
const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Kosher', 'Halal'];
const SPICE_LEVELS = ['mild', 'medium', 'spicy'];

export default function EditPreferencesScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // State for all preference fields
  const [bannedIngredients, setBannedIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [likedCuisines, setLikedCuisines] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [preferredSuperfoods, setPreferredSuperfoods] = useState<string[]>([]);
  const [cookTimePreference, setCookTimePreference] = useState('30');
  const [spiceLevel, setSpiceLevel] = useState('medium');

  // Load current preferences
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoadingData(true);
      const response = await userApi.getPreferences();
      const prefs = response.data;
      
      console.log('📱 Edit Preferences: Loaded preferences', prefs);
      
      // Handle both array of strings and array of objects with name property
      setBannedIngredients(
        prefs.bannedIngredients?.map((i: any) => typeof i === 'string' ? i : i.name) || []
      );
      setLikedCuisines(
        prefs.likedCuisines?.map((c: any) => typeof c === 'string' ? c : c.name) || []
      );
      setDietaryRestrictions(
        prefs.dietaryRestrictions?.map((d: any) => typeof d === 'string' ? d : d.name) || []
      );
      setPreferredSuperfoods(
        prefs.preferredSuperfoods?.map((sf: any) => typeof sf === 'string' ? sf : sf.category) || []
      );
      setCookTimePreference(prefs.cookTimePreference?.toString() || '30');
      setSpiceLevel(prefs.spiceLevel || 'medium');
    } catch (error: any) {
      console.error('📱 Edit Preferences: Load error', error);
      HapticPatterns.error();
      Alert.alert('Error', error.message || 'Failed to load preferences');
    } finally {
      setLoadingData(false);
    }
  };

  const addBannedIngredient = () => {
    const trimmed = newIngredient.trim();
    if (trimmed && !bannedIngredients.includes(trimmed)) {
      setBannedIngredients([...bannedIngredients, trimmed]);
      setNewIngredient('');
    }
  };

  const removeBannedIngredient = (ingredient: string) => {
    setBannedIngredients(bannedIngredients.filter(i => i !== ingredient));
  };

  const toggleCuisine = (cuisine: string) => {
    setLikedCuisines(prev => 
      prev.includes(cuisine) 
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const toggleDietary = (dietary: string) => {
    setDietaryRestrictions(prev => 
      prev.includes(dietary) 
        ? prev.filter(d => d !== dietary)
        : [...prev, dietary]
    );
  };

  const toggleSuperfood = (category: string) => {
    setPreferredSuperfoods(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = async () => {
    // Validation
    if (!cookTimePreference || isNaN(Number(cookTimePreference))) {
      HapticPatterns.error();
      Alert.alert('Validation Error', 'Please enter a valid cook time');
      return;
    }

    const cookTime = parseInt(cookTimePreference);
    if (cookTime < 5 || cookTime > 300) {
      HapticPatterns.error();
      Alert.alert('Validation Error', 'Cook time must be between 5 and 300 minutes');
      return;
    }

    try {
      setLoading(true);
      await userApi.updatePreferences({
        bannedIngredients,
        likedCuisines,
        dietaryRestrictions,
        preferredSuperfoods,
        cookTimePreference: cookTime,
        spiceLevel
      });
      
      console.log('📱 Edit Preferences: Preferences updated');
      HapticPatterns.success();
      Alert.alert('Success', 'Preferences updated successfully!');
      router.back();
    } catch (error: any) {
      console.error('📱 Edit Preferences: Update error', error);
      HapticPatterns.error();
      Alert.alert('Error', error.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`} edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Ionicons name="settings-outline" size={64} color={isDark ? "#6B7280" : "#9CA3AF"} />
          <Text className={isDark ? 'text-gray-400 mt-4' : 'text-gray-500 mt-4'}>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`} edges={['top']}>
      <KeyboardAvoidingContainer>
      {/* Header */}
      <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} px-4 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex-row items-center justify-between`}>
        <HapticTouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color={isDark ? "#E5E7EB" : "#111827"} />
        </HapticTouchableOpacity>
        <Text className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Culinary Preferences</Text>
        <HapticTouchableOpacity 
          onPress={handleSave}
          disabled={loading}
          className="p-2"
        >
          <Text className={`text-lg font-semibold ${loading ? (isDark ? 'text-gray-400' : 'text-gray-500') : ''}`} style={{ color: loading ? undefined : (isDark ? DarkColors.primary : Colors.primary) }}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </HapticTouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Banned Ingredients */}
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 mb-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Banned Ingredients</Text>
          <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm mb-3`}>
            Add ingredients you want to avoid in recipes
          </Text>
          
          <View className="flex-row mb-2">
            <TextInput
              value={newIngredient}
              onChangeText={setNewIngredient}
              placeholder="e.g., mushrooms"
              className="flex-1 border rounded-lg px-4 py-2 mr-2"
              style={{
                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                borderColor: isDark ? DarkColors.border.light : Colors.border.light,
                borderWidth: 1,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
              }}
              placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
              onSubmitEditing={addBannedIngredient}
            />
            <HapticTouchableOpacity 
              onPress={addBannedIngredient}
              className="px-4 py-2 rounded-lg justify-center"
              style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
            >
              <Ionicons name="add" size={20} color="white" />
            </HapticTouchableOpacity>
          </View>

          <View className="flex-row flex-wrap">
            {bannedIngredients.length > 0 ? (
              bannedIngredients.map((ingredient, index) => (
                <HapticTouchableOpacity 
                  key={index}
                  onPress={() => removeBannedIngredient(ingredient)}
                  className="px-3 py-1 rounded-full mr-2 mb-2 flex-row items-center border"
                  style={{
                    backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight,
                    borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
                  }}
                >
                  <Text className="text-xs mr-1" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>{ingredient}</Text>
                  <Ionicons name="close-circle" size={14} color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed} />
                </HapticTouchableOpacity>
              ))
            ) : (
              <Text className="text-xs" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>No banned ingredients</Text>
            )}
          </View>
        </View>

        {/* Liked Cuisines */}
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 mb-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Liked Cuisines</Text>
          <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm mb-3`}>
            Select cuisines you enjoy
          </Text>
          
          <View className="flex-row flex-wrap">
            {CUISINE_OPTIONS.map((cuisine) => {
              const isSelected = likedCuisines.includes(cuisine);
              return (
                <HapticTouchableOpacity 
                  key={cuisine}
                  onPress={() => toggleCuisine(cuisine)}
                  className="px-3 py-2 rounded-full mr-2 mb-2"
                  style={{
                    backgroundColor: isSelected 
                      ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                      : (isDark ? '#374151' : '#E5E7EB'),
                  }}
                >
                  <Text className="text-xs font-medium" style={{ 
                    color: isSelected 
                      ? 'white' 
                      : (isDark ? DarkColors.text.primary : Colors.text.primary)
                  }}>
                    {cuisine}
                  </Text>
                </HapticTouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Dietary Restrictions */}
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 mb-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Dietary Restrictions</Text>
          <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm mb-3`}>
            Select any dietary restrictions you have
          </Text>
          
          <View className="flex-row flex-wrap">
            {DIETARY_OPTIONS.map((dietary) => {
              const isSelected = dietaryRestrictions.includes(dietary);
              return (
                <HapticTouchableOpacity 
                  key={dietary}
                  onPress={() => toggleDietary(dietary)}
                  className="px-3 py-2 rounded-full mr-2 mb-2"
                  style={{
                    backgroundColor: isSelected 
                      ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                      : (isDark ? '#374151' : '#E5E7EB'),
                  }}
                >
                  <Text className="text-xs font-medium" style={{ 
                    color: isSelected 
                      ? 'white' 
                      : (isDark ? DarkColors.text.primary : Colors.text.primary)
                  }}>
                    {dietary}
                  </Text>
                </HapticTouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Preferred Superfoods */}
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 mb-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Preferred Superfoods</Text>
          <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm mb-3`}>
            Select superfoods you'd like to see more of in your recipes. Recipes containing these will be boosted in recommendations.
          </Text>
          
          <View className="flex-row flex-wrap">
            {SUPERFOOD_CATEGORIES.map((superfood) => {
              const isSelected = preferredSuperfoods.includes(superfood.id);
              return (
                <HapticTouchableOpacity 
                  key={superfood.id}
                  onPress={() => toggleSuperfood(superfood.id)}
                  className="px-3 py-2 rounded-full mr-2 mb-2 flex-row items-center"
                  style={{
                    backgroundColor: isSelected 
                      ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                      : (isDark ? '#374151' : '#E5E7EB'),
                  }}
                >
                  {superfood.emoji && (
                    <Text className="mr-1">{superfood.emoji}</Text>
                  )}
                  <Text className="text-xs font-medium" style={{ 
                    color: isSelected 
                      ? 'white' 
                      : (isDark ? DarkColors.text.primary : Colors.text.primary)
                  }}>
                    {superfood.name}
                  </Text>
                </HapticTouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Cook Time & Spice Level */}
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 mb-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-3`}>Other Preferences</Text>
          
          {/* Cook Time */}
          <View className="mb-4">
            <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Max Cook Time (minutes) *</Text>
            <TextInput
              value={cookTimePreference}
              onChangeText={setCookTimePreference}
              placeholder="30"
              keyboardType="numeric"
              className="border rounded-lg px-4 py-3"
              style={{
                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                borderColor: isDark ? DarkColors.border.light : Colors.border.light,
                borderWidth: 1,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
              }}
              placeholderTextColor={isDark ? DarkColors.text.tertiary : Colors.text.tertiary}
            />
            <Text className={isDark ? 'text-gray-400 text-xs mt-1' : 'text-gray-500 text-xs mt-1'}>
              Recipes longer than this won't be recommended
            </Text>
          </View>

          {/* Spice Level */}
          <View>
            <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Spice Level Preference</Text>
            <View className="flex-row gap-2">
              {SPICE_LEVELS.map((level) => {
                const isSelected = spiceLevel === level;
                return (
                  <HapticTouchableOpacity 
                    key={level}
                    onPress={() => setSpiceLevel(level)}
                    className="flex-1 py-3 rounded-lg"
                    style={{
                      backgroundColor: isSelected 
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : (isDark ? '#374151' : '#E5E7EB'),
                    }}
                  >
                    <Text className="text-center text-sm font-medium" style={{ 
                      color: isSelected 
                        ? 'white' 
                        : (isDark ? DarkColors.text.primary : Colors.text.primary)
                    }}>
                      {level === 'mild' ? '🌶️ Mild' : level === 'medium' ? '🌶️🌶️ Medium' : '🌶️🌶️🌶️ Spicy'}
                    </Text>
                  </HapticTouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Bottom padding for safe scrolling */}
        <View className="h-8" />
      </ScrollView>
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
}

