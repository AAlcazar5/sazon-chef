import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { userApi } from '../../lib/api';
import type { UserProfile, UserNotifications } from '../../types';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<UserNotifications>({
    mealReminders: true,
    newRecipes: true,
    goalUpdates: false
  });
  const [loading, setLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Load profile data
  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.getProfile();
      console.log('📱 Profile: Loaded profile data', response.data);
      setProfile(response.data);
    } catch (error: any) {
      console.error('📱 Profile: Load error', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const response = await userApi.getNotifications();
      console.log('📱 Profile: Loaded notifications', response.data);
      setNotifications(response.data);
    } catch (error: any) {
      console.error('📱 Profile: Notifications load error', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadProfile();
    loadNotifications();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Profile: Screen focused, refreshing data');
      loadProfile();
      loadNotifications();
    }, [])
  );

  const toggleNotification = async (key: keyof UserNotifications) => {
    const previousNotifications = { ...notifications };
    const updatedNotifications = {
      ...notifications,
      [key]: !notifications[key]
    };
    
    // Optimistic update
    setNotifications(updatedNotifications);
    
    try {
      await userApi.updateNotifications(updatedNotifications);
      console.log('📱 Profile: Notifications updated');
    } catch (error: any) {
      console.error('📱 Profile: Notifications update error', error);
      // Revert on error
      setNotifications(previousNotifications);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleEditGoals = () => {
    router.push('/edit-macro-goals');
  };

  const handleEditPreferences = () => {
    router.push('/onboarding?edit=true');
  };

  const handleEditBudget = () => {
    router.push('/edit-budget');
  };

  const handleExportData = () => {
    // TODO: Implement data export
    console.log('Export data');
  };

  const handleClearHistory = () => {
    // TODO: Implement clear history
    console.log('Clear history');
  };

  // Loading state
  if (loading || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Ionicons name="person-circle-outline" size={64} color="#9CA3AF" />
          <Text className="text-gray-500 mt-4">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-6 border-b border-gray-200">
        <View className="items-center">
          <View className="w-20 h-20 bg-orange-500 rounded-full items-center justify-center mb-3">
            <Text className="text-white text-2xl font-bold">
              {profile.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900">{profile.name}</Text>
          <Text className="text-gray-500">{profile.email}</Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Physical Profile Section */}
        <View className="bg-white rounded-xl p-4 m-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900">Physical Profile</Text>
            <TouchableOpacity onPress={() => router.push('/edit-physical-profile')}>
              <Ionicons name="create-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/edit-physical-profile')}
            className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg border border-purple-200"
          >
            <View className="flex-row items-center">
              <Ionicons name="body" size={20} color="#9333EA" />
              <Text className="text-purple-900 font-medium ml-2">
                Set up your physical profile
              </Text>
            </View>
            <Text className="text-purple-700 text-xs mt-1">
              Get personalized macro calculations based on your body metrics
            </Text>
          </TouchableOpacity>
        </View>

        {/* Macro Goals Section */}
        <View className="bg-white rounded-xl p-4 m-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900">Macro Goals</Text>
            <TouchableOpacity onPress={handleEditGoals}>
              <Ionicons name="create-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Calories</Text>
              <Text className="font-semibold text-gray-900">{profile.macroGoals.calories} cal</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Protein</Text>
              <Text className="font-semibold text-gray-900">{profile.macroGoals.protein}g</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Carbs</Text>
              <Text className="font-semibold text-gray-900">{profile.macroGoals.carbs}g</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Fat</Text>
              <Text className="font-semibold text-gray-900">{profile.macroGoals.fat}g</Text>
            </View>
          </View>
        </View>

        {/* Culinary Preferences Section */}
        <View className="bg-white rounded-xl p-4 m-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900">Culinary Preferences</Text>
            <TouchableOpacity onPress={handleEditPreferences}>
              <Ionicons name="create-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View className="space-y-3">
            <View>
              <Text className="text-gray-600 text-sm mb-1">Banned Ingredients</Text>
              <View className="flex-row flex-wrap">
                {profile.preferences?.bannedIngredients && profile.preferences.bannedIngredients.length > 0 ? (
                  profile.preferences.bannedIngredients.map((ingredient: any, index: number) => (
                    <View key={index} className="bg-red-100 px-2 py-1 rounded-full mr-2 mb-2">
                      <Text className="text-red-800 text-xs">
                        {typeof ingredient === 'string' ? ingredient : ingredient.name}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-400 text-xs">None set</Text>
                )}
              </View>
            </View>
            
            <View>
              <Text className="text-gray-600 text-sm mb-1">Liked Cuisines</Text>
              <View className="flex-row flex-wrap">
                {profile.preferences?.likedCuisines && profile.preferences.likedCuisines.length > 0 ? (
                  profile.preferences.likedCuisines.map((cuisine: any, index: number) => (
                    <View key={index} className="bg-green-100 px-2 py-1 rounded-full mr-2 mb-2">
                      <Text className="text-green-800 text-xs">
                        {typeof cuisine === 'string' ? cuisine : cuisine.name}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-400 text-xs">None set</Text>
                )}
              </View>
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">Max Cook Time</Text>
              <Text className="font-semibold text-gray-900">{profile.preferences.cookTimePreference} min</Text>
            </View>
          </View>
        </View>

        {/* Budget Settings Section */}
        <View className="bg-white rounded-xl p-4 m-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900">Budget Settings</Text>
            <TouchableOpacity onPress={handleEditBudget}>
              <Ionicons name="create-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Max Recipe Cost</Text>
              <Text className="font-semibold text-gray-900">
                {profile.preferences?.maxRecipeCost ? `$${profile.preferences.maxRecipeCost.toFixed(2)}` : 'No limit'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Max Meal Cost</Text>
              <Text className="font-semibold text-gray-900">
                {profile.preferences?.maxMealCost ? `$${profile.preferences.maxMealCost.toFixed(2)}` : 'No limit'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Daily Food Budget</Text>
              <Text className="font-semibold text-gray-900">
                {profile.preferences?.maxDailyFoodBudget ? `$${profile.preferences.maxDailyFoodBudget.toFixed(2)}` : 'No limit'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Currency</Text>
              <Text className="font-semibold text-gray-900">
                {profile.preferences?.currency || 'USD'}
              </Text>
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View className="bg-white rounded-xl p-4 m-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Notifications</Text>
          
          <View className="space-y-4">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-gray-900 font-medium">Meal Reminders</Text>
                <Text className="text-gray-500 text-sm">Daily recipe suggestions</Text>
              </View>
              <Switch
                value={notifications.mealReminders}
                onValueChange={() => toggleNotification('mealReminders')}
                trackColor={{ false: '#D1D5DB', true: '#F97316' }}
                thumbColor={notifications.mealReminders ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
            
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-gray-900 font-medium">New Recipes</Text>
                <Text className="text-gray-500 text-sm">When new recipes match your goals</Text>
              </View>
              <Switch
                value={notifications.newRecipes}
                onValueChange={() => toggleNotification('newRecipes')}
                trackColor={{ false: '#D1D5DB', true: '#F97316' }}
                thumbColor={notifications.newRecipes ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
            
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-gray-900 font-medium">Goal Updates</Text>
                <Text className="text-gray-500 text-sm">Weekly progress reports</Text>
              </View>
              <Switch
                value={notifications.goalUpdates}
                onValueChange={() => toggleNotification('goalUpdates')}
                trackColor={{ false: '#D1D5DB', true: '#F97316' }}
                thumbColor={notifications.goalUpdates ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>

        {/* Data & Privacy Section */}
        <View className="bg-white rounded-xl p-4 m-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Data & Privacy</Text>
          
          <View className="space-y-3">
            <TouchableOpacity 
              className="flex-row items-center justify-between py-3"
              onPress={handleExportData}
            >
              <View className="flex-row items-center">
                <Ionicons name="download-outline" size={20} color="#6B7280" />
                <Text className="text-gray-900 ml-3">Export My Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center justify-between py-3"
              onPress={handleClearHistory}
            >
              <View className="flex-row items-center">
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text className="text-red-600 ml-3">Clear History</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}