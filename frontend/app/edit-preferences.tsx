import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { userApi } from '../lib/api';

// Predefined options
const CUISINE_OPTIONS = ['Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian', 'Middle Eastern', 'Latin American'];
const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Kosher', 'Halal'];
const SPICE_LEVELS = ['mild', 'medium', 'spicy'];

export default function EditPreferencesScreen() {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // State for all preference fields
  const [bannedIngredients, setBannedIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [likedCuisines, setLikedCuisines] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
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
      setCookTimePreference(prefs.cookTimePreference?.toString() || '30');
      setSpiceLevel(prefs.spiceLevel || 'medium');
    } catch (error: any) {
      console.error('📱 Edit Preferences: Load error', error);
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

  const handleSave = async () => {
    // Validation
    if (!cookTimePreference || isNaN(Number(cookTimePreference))) {
      Alert.alert('Validation Error', 'Please enter a valid cook time');
      return;
    }

    const cookTime = parseInt(cookTimePreference);
    if (cookTime < 5 || cookTime > 300) {
      Alert.alert('Validation Error', 'Cook time must be between 5 and 300 minutes');
      return;
    }

    try {
      setLoading(true);
      await userApi.updatePreferences({
        bannedIngredients,
        likedCuisines,
        dietaryRestrictions,
        cookTimePreference: cookTime,
        spiceLevel
      });
      
      console.log('📱 Edit Preferences: Preferences updated');
      Alert.alert('Success', 'Preferences updated successfully!');
      router.back();
    } catch (error: any) {
      console.error('📱 Edit Preferences: Update error', error);
      Alert.alert('Error', error.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Ionicons name="settings-outline" size={64} color="#9CA3AF" />
          <Text className="text-gray-500 mt-4">Loading preferences...</Text>
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
        <Text className="text-xl font-bold text-gray-900">Culinary Preferences</Text>
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
        {/* Banned Ingredients */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-2">Banned Ingredients</Text>
          <Text className="text-gray-600 text-sm mb-3">
            Add ingredients you want to avoid in recipes
          </Text>
          
          <View className="flex-row mb-2">
            <TextInput
              value={newIngredient}
              onChangeText={setNewIngredient}
              placeholder="e.g., mushrooms"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 mr-2"
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={addBannedIngredient}
            />
            <TouchableOpacity 
              onPress={addBannedIngredient}
              className="bg-orange-500 px-4 py-2 rounded-lg justify-center"
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap">
            {bannedIngredients.length > 0 ? (
              bannedIngredients.map((ingredient, index) => (
                <TouchableOpacity 
                  key={index}
                  onPress={() => removeBannedIngredient(ingredient)}
                  className="bg-red-100 px-3 py-1 rounded-full mr-2 mb-2 flex-row items-center"
                >
                  <Text className="text-red-800 text-xs mr-1">{ingredient}</Text>
                  <Ionicons name="close-circle" size={14} color="#991B1B" />
                </TouchableOpacity>
              ))
            ) : (
              <Text className="text-gray-400 text-xs">No banned ingredients</Text>
            )}
          </View>
        </View>

        {/* Liked Cuisines */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-2">Liked Cuisines</Text>
          <Text className="text-gray-600 text-sm mb-3">
            Select cuisines you enjoy
          </Text>
          
          <View className="flex-row flex-wrap">
            {CUISINE_OPTIONS.map((cuisine) => (
              <TouchableOpacity 
                key={cuisine}
                onPress={() => toggleCuisine(cuisine)}
                className={`px-3 py-2 rounded-full mr-2 mb-2 ${
                  likedCuisines.includes(cuisine) ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <Text className={`text-xs font-medium ${
                  likedCuisines.includes(cuisine) ? 'text-white' : 'text-gray-700'
                }`}>
                  {cuisine}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dietary Restrictions */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-2">Dietary Restrictions</Text>
          <Text className="text-gray-600 text-sm mb-3">
            Select any dietary restrictions you have
          </Text>
          
          <View className="flex-row flex-wrap">
            {DIETARY_OPTIONS.map((dietary) => (
              <TouchableOpacity 
                key={dietary}
                onPress={() => toggleDietary(dietary)}
                className={`px-3 py-2 rounded-full mr-2 mb-2 ${
                  dietaryRestrictions.includes(dietary) ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              >
                <Text className={`text-xs font-medium ${
                  dietaryRestrictions.includes(dietary) ? 'text-white' : 'text-gray-700'
                }`}>
                  {dietary}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cook Time & Spice Level */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Other Preferences</Text>
          
          {/* Cook Time */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Max Cook Time (minutes) *</Text>
            <TextInput
              value={cookTimePreference}
              onChangeText={setCookTimePreference}
              placeholder="30"
              keyboardType="numeric"
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
              placeholderTextColor="#9CA3AF"
            />
            <Text className="text-gray-400 text-xs mt-1">
              Recipes longer than this won't be recommended
            </Text>
          </View>

          {/* Spice Level */}
          <View>
            <Text className="text-gray-700 font-medium mb-2">Spice Level Preference</Text>
            <View className="flex-row gap-2">
              {SPICE_LEVELS.map((level) => (
                <TouchableOpacity 
                  key={level}
                  onPress={() => setSpiceLevel(level)}
                  className={`flex-1 py-3 rounded-lg ${
                    spiceLevel === level ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                >
                  <Text className={`text-center text-sm font-medium ${
                    spiceLevel === level ? 'text-white' : 'text-gray-700'
                  }`}>
                    {level === 'mild' ? '🌶️ Mild' : level === 'medium' ? '🌶️🌶️ Medium' : '🌶️🌶️🌶️ Spicy'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Bottom padding for safe scrolling */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

