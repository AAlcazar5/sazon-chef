import { View, Text, ScrollView, Switch, Alert, Modal, TextInput } from 'react-native';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { userApi, authApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import type { UserProfile, UserNotifications } from '../../types';
import SazonMascot from '../../components/mascot/SazonMascot';
import HelpTooltip from '../../components/ui/HelpTooltip';

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const { theme, themeMode, toggleTheme, setThemeMode, systemColorScheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<UserNotifications>({
    mealReminders: true,
    newRecipes: true,
    goalUpdates: false
  });
  const [loading, setLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPhysicalProfileHelp, setShowPhysicalProfileHelp] = useState(false);

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

  const handleChangePassword = () => {
    // Only show password change for users with password (not social login)
    if (user?.provider) {
      Alert.alert(
        'Social Login Account',
        'Password changes are not available for social login accounts. Please change your password through your social provider.',
        [{ text: 'OK' }]
      );
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleConfirmPasswordChange = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Password changed successfully', [
        {
          text: 'OK',
          onPress: () => {
            setShowPasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to change password';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  // Loading state
  if (loading || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Icon name={Icons.ACCOUNT_OUTLINE} size={64} color="#9CA3AF" accessibilityLabel="Loading profile" />
          <Text className="text-gray-500 dark:text-gray-200 mt-4">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-6 border-b border-gray-200 dark:border-gray-700">
        <View className="items-center">
          <View className="flex-row items-center justify-center mb-3">
            <View className="w-20 h-20 bg-orange-500 rounded-full items-center justify-center">
              <Text className="text-white text-2xl font-bold">
                {profile.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View className="ml-3">
              <SazonMascot expression="happy" size="small" variant="orange" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile.name}</Text>
          <Text className="text-gray-500 dark:text-gray-200">{profile.email}</Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Achievements Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center mb-3">
            <SazonMascot expression="proud" size="small" variant="orange" />
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-3">Achievements</Text>
          </View>
          
          <View>
            <View className="flex-row items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-900/30 mb-3">
              <View className="flex-row items-center flex-1">
                <Icon name={Icons.FAVORITE} size={IconSizes.SM} color="#F97316" accessibilityLabel="Recipes liked" />
                <Text className="text-gray-900 dark:text-gray-100 font-medium ml-2">Recipe Explorer</Text>
              </View>
              <Text className="text-orange-600 dark:text-orange-400 font-semibold">Coming Soon</Text>
            </View>
            
            <View className="flex-row items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-900/30 mb-3">
              <View className="flex-row items-center flex-1">
                <Icon name={Icons.BOOKMARK} size={IconSizes.SM} color="#F97316" accessibilityLabel="Recipes saved" />
                <Text className="text-gray-900 dark:text-gray-100 font-medium ml-2">Cookbook Collector</Text>
              </View>
              <Text className="text-orange-600 dark:text-orange-400 font-semibold">Coming Soon</Text>
            </View>
            
            <View className="flex-row items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-900/30">
              <View className="flex-row items-center flex-1">
                <Icon name={Icons.MEAL_PLAN} size={IconSizes.SM} color="#F97316" accessibilityLabel="Meal plans" />
                <Text className="text-gray-900 dark:text-gray-100 font-medium ml-2">Meal Planner</Text>
              </View>
              <Text className="text-orange-600 dark:text-orange-400 font-semibold">Coming Soon</Text>
            </View>
          </View>
          
          <Text className="text-gray-500 dark:text-gray-400 text-xs mt-3 text-center">
            Unlock achievements as you use Sazon Chef!
          </Text>
        </View>

        {/* Appearance Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center mb-3">
            <Icon name={Icons.THEME_OUTLINE} size={IconSizes.MD} color="#F97316" accessibilityLabel="Appearance" />
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">Appearance</Text>
          </View>
          
          {/* Theme Toggle */}
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center mb-1">
                <Icon 
                  name={theme === 'dark' ? Icons.DARK_MODE : Icons.LIGHT_MODE} 
                  size={IconSizes.SM} 
                  color={theme === 'dark' ? '#F97316' : '#F59E0B'} 
                  accessibilityLabel={theme === 'dark' ? 'Dark mode' : 'Light mode'}
                />
                <Text className="text-gray-900 dark:text-gray-100 font-medium ml-2">Dark Mode</Text>
              </View>
              <Text className="text-gray-500 dark:text-gray-200 text-sm">
                {themeMode === 'system' 
                  ? `Following system settings (${systemColorScheme === 'dark' ? 'Dark' : 'Light'})` 
                  : themeMode === 'dark' 
                    ? 'Dark mode enabled' 
                    : 'Light mode enabled'}
              </Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#D1D5DB', true: '#F97316' }}
              thumbColor={theme === 'dark' ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          
          {/* Theme Mode Selector */}
          <View className="pt-3">
            <Text className="text-gray-700 dark:text-gray-100 text-sm mb-2 font-medium">Theme Mode</Text>
            <Text className="text-gray-500 dark:text-gray-200 text-xs mb-3">
              Choose how the app theme is determined
            </Text>
            <View className="flex-row gap-2">
              <HapticTouchableOpacity
                onPress={() => setThemeMode('light')}
                className={`flex-1 py-2 px-3 rounded-lg border ${
                  themeMode === 'light'
                    ? 'bg-orange-500 border-orange-500'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                }`}
              >
                <View className="items-center">
                  <Icon 
                    name={Icons.LIGHT_MODE} 
                    size={IconSizes.XS} 
                    color={themeMode === 'light' ? '#FFFFFF' : (theme === 'dark' ? '#D1D5DB' : '#6B7280')} 
                    accessibilityLabel="Light mode"
                  />
                  <Text className={`text-center font-medium mt-1 ${
                    themeMode === 'light' ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                  }`}>
                    Light
                  </Text>
                </View>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => setThemeMode('dark')}
                className={`flex-1 py-2 px-3 rounded-lg border ${
                  themeMode === 'dark'
                    ? 'bg-orange-500 border-orange-500'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                }`}
              >
                <View className="items-center">
                  <Icon 
                    name={Icons.DARK_MODE} 
                    size={IconSizes.XS} 
                    color={themeMode === 'dark' ? '#FFFFFF' : (theme === 'dark' ? '#D1D5DB' : '#6B7280')} 
                    accessibilityLabel="Dark mode"
                  />
                  <Text className={`text-center font-medium mt-1 ${
                    themeMode === 'dark' ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                  }`}>
                    Dark
                  </Text>
                </View>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => setThemeMode('system')}
                className={`flex-1 py-2 px-3 rounded-lg border ${
                  themeMode === 'system'
                    ? 'bg-orange-500 border-orange-500'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                }`}
              >
                <View className="items-center">
                  <Icon 
                    name={Icons.SYSTEM_MODE_OUTLINE} 
                    size={IconSizes.XS} 
                    color={themeMode === 'system' ? '#FFFFFF' : (theme === 'dark' ? '#D1D5DB' : '#6B7280')} 
                    accessibilityLabel="System mode"
                  />
                  <Text className={`text-center font-medium mt-1 ${
                    themeMode === 'system' ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                  }`}>
                    System
                  </Text>
                </View>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>

        {/* Physical Profile Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Physical Profile</Text>
              <HapticTouchableOpacity
                onPress={() => setShowPhysicalProfileHelp(true)}
                className="ml-2 p-1"
                hapticStyle="light"
              >
                <Icon name={Icons.INFO_OUTLINE} size={IconSizes.SM} color="#6B7280" accessibilityLabel="Help" />
              </HapticTouchableOpacity>
            </View>
            <HapticTouchableOpacity onPress={() => router.push('/edit-physical-profile')}>
              <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit" />
            </HapticTouchableOpacity>
          </View>
          
          <HapticTouchableOpacity 
            onPress={() => router.push('/edit-physical-profile')}
            className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 p-3 rounded-lg border border-purple-200 dark:border-purple-700"
          >
            <View className="flex-row items-center">
              <Icon name={Icons.PHYSICAL_PROFILE} size={IconSizes.MD} color="#9333EA" accessibilityLabel="Physical profile" />
              <Text className="text-purple-900 dark:text-purple-200 font-medium ml-2">
                Set up your physical profile
              </Text>
            </View>
            <Text className="text-purple-700 dark:text-purple-300 text-xs mt-1">
              Get personalized macro calculations based on your body metrics
            </Text>
          </HapticTouchableOpacity>
        </View>

        {/* Macro Goals Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Macro Goals</Text>
            <HapticTouchableOpacity onPress={handleEditGoals}>
              <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit" />
            </HapticTouchableOpacity>
          </View>
          
          {profile.macroGoals ? (
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-200">Calories</Text>
                <Text className="font-semibold text-gray-900 dark:text-gray-100">{profile.macroGoals.calories} cal</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-200">Protein</Text>
                <Text className="font-semibold text-gray-900 dark:text-gray-100">{profile.macroGoals.protein}g</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-200">Carbs</Text>
                <Text className="font-semibold text-gray-900 dark:text-gray-100">{profile.macroGoals.carbs}g</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-200">Fat</Text>
                <Text className="font-semibold text-gray-900 dark:text-gray-100">{profile.macroGoals.fat}g</Text>
              </View>
            </View>
          ) : (
            <HapticTouchableOpacity 
              onPress={handleEditGoals}
              className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 p-3 rounded-lg border border-orange-200 dark:border-orange-700"
            >
              <View className="flex-row items-center">
                <Icon name={Icons.MACRO_GOALS} size={IconSizes.MD} color="#F97316" accessibilityLabel="Macro goals" />
                <Text className="text-orange-900 dark:text-orange-200 font-medium ml-2">
                  Set up your macro goals
                </Text>
              </View>
              <Text className="text-orange-700 dark:text-orange-300 text-xs mt-1">
                Get personalized recipe recommendations based on your nutrition goals
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>

        {/* Culinary Preferences Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Culinary Preferences</Text>
            <HapticTouchableOpacity onPress={handleEditPreferences}>
              <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit" />
            </HapticTouchableOpacity>
          </View>
          
          <View className="space-y-3">
            <View>
              <Text className="text-gray-600 dark:text-gray-200 text-sm mb-1">Banned Ingredients</Text>
              <View className="flex-row flex-wrap">
                {profile.preferences?.bannedIngredients && profile.preferences.bannedIngredients.length > 0 ? (
                  profile.preferences.bannedIngredients.map((ingredient: any, index: number) => (
                    <View key={index} className="bg-red-100 dark:bg-red-900 px-2 py-1 rounded-full mr-2 mb-2">
                      <Text className="text-red-800 dark:text-red-200 text-xs">
                        {typeof ingredient === 'string' ? ingredient : ingredient.name}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-400 dark:text-gray-200 text-xs">None set</Text>
                )}
              </View>
            </View>
            
            <View>
              <Text className="text-gray-600 dark:text-gray-200 text-sm mb-1">Liked Cuisines</Text>
              <View className="flex-row flex-wrap">
                {profile.preferences?.likedCuisines && profile.preferences.likedCuisines.length > 0 ? (
                  profile.preferences.likedCuisines.map((cuisine: any, index: number) => (
                    <View key={index} className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full mr-2 mb-2">
                      <Text className="text-green-800 dark:text-green-200 text-xs">
                        {typeof cuisine === 'string' ? cuisine : cuisine.name}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-400 dark:text-gray-200 text-xs">None set</Text>
                )}
              </View>
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600 dark:text-gray-200">Max Cook Time</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100">
                {profile.preferences?.cookTimePreference ? `${profile.preferences.cookTimePreference} min` : 'Not set'}
              </Text>
            </View>
          </View>
        </View>

        {/* Budget Settings Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Budget Settings</Text>
            <HapticTouchableOpacity onPress={handleEditBudget}>
              <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit" />
            </HapticTouchableOpacity>
          </View>
          
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Max Recipe Cost</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100">
                {profile.preferences?.maxRecipeCost ? `$${profile.preferences.maxRecipeCost.toFixed(2)}` : 'No limit'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Max Meal Cost</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100">
                {profile.preferences?.maxMealCost ? `$${profile.preferences.maxMealCost.toFixed(2)}` : 'No limit'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Daily Food Budget</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100">
                {profile.preferences?.maxDailyFoodBudget ? `$${profile.preferences.maxDailyFoodBudget.toFixed(2)}` : 'No limit'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-200">Currency</Text>
              <Text className="font-semibold text-gray-900 dark:text-gray-100">
                {profile.preferences?.currency || 'USD'}
              </Text>
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Notifications</Text>
          
          <View className="space-y-4">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-gray-900 dark:text-gray-100 font-medium">Meal Reminders</Text>
                <Text className="text-gray-500 dark:text-gray-200 text-sm">Daily recipe suggestions</Text>
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
                <Text className="text-gray-900 dark:text-gray-100 font-medium">New Recipes</Text>
                <Text className="text-gray-500 dark:text-gray-200 text-sm">When new recipes match your goals</Text>
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
                <Text className="text-gray-900 dark:text-gray-100 font-medium">Goal Updates</Text>
                <Text className="text-gray-500 dark:text-gray-200 text-sm">Weekly progress reports</Text>
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
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Data & Privacy</Text>
          
          <View className="space-y-3">
            <HapticTouchableOpacity 
              className="flex-row items-center justify-between py-3"
              onPress={handleExportData}
            >
              <View className="flex-row items-center">
                <Icon name={Icons.EXPORT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Export data" />
                <Text className="text-gray-900 dark:text-gray-100 ml-3">Export My Data</Text>
              </View>
              <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Navigate" />
            </HapticTouchableOpacity>
            
            <HapticTouchableOpacity 
              className="flex-row items-center justify-between py-3"
              onPress={handleClearHistory}
            >
              <View className="flex-row items-center">
                <Icon name={Icons.DELETE_OUTLINE} size={IconSizes.MD} color="#EF4444" accessibilityLabel="Clear history" />
                <Text className="text-red-600 dark:text-red-400 ml-3">Clear History</Text>
              </View>
              <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Navigate" />
            </HapticTouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Account</Text>
          
          {!user?.provider && (
            <HapticTouchableOpacity 
              className="flex-row items-center justify-between py-3 border-b border-gray-100"
              onPress={handleChangePassword}
            >
              <View className="flex-row items-center">
                <Icon name={Icons.LOCK_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Change password" />
                <Text className="text-gray-900 dark:text-gray-100 ml-3">Change Password</Text>
              </View>
              <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Navigate" />
            </HapticTouchableOpacity>
          )}
          
          <HapticTouchableOpacity 
            className="flex-row items-center justify-between py-3"
            onPress={handleLogout}
          >
            <View className="flex-row items-center">
              <Icon name={Icons.LOG_OUT_OUTLINE} size={IconSizes.MD} color="#EF4444" accessibilityLabel="Sign out" />
              <Text className="text-red-600 dark:text-red-400 ml-3 font-medium">Sign Out</Text>
            </View>
            <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Navigate" />
          </HapticTouchableOpacity>
        </View>

        {/* Password Change Modal */}
        <Modal
          visible={showPasswordModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPasswordModal(false)}
        >
          <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Change Password
              </Text>
              
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Current Password</Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="off"
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">New Password</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password (min 8 characters)"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="off"
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </View>

              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Confirm New Password</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="off"
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </View>
              
              <View className="flex-row space-x-3">
                <HapticTouchableOpacity 
                  onPress={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={changingPassword}
                  className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
                </HapticTouchableOpacity>
                
                <HapticTouchableOpacity 
                  onPress={handleConfirmPasswordChange}
                  disabled={changingPassword}
                  className={`flex-1 py-3 px-4 bg-orange-500 rounded-lg ${changingPassword ? 'opacity-50' : ''}`}
                >
                  <Text className="text-white font-medium text-center">
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </Text>
                </HapticTouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Help Tooltips */}
      <HelpTooltip
        visible={showPhysicalProfileHelp}
        title="About Physical Profile"
        message="Your physical profile helps us calculate your personalized daily calorie and macro nutrient needs using scientific formulas (BMR/TDEE). This includes your age, gender, height, weight, activity level, and fitness goals. The more accurate your information, the better we can personalize your recipe recommendations!"
        type="guide"
        onDismiss={() => setShowPhysicalProfileHelp(false)}
        actionLabel="Set Up Profile"
        onAction={() => {
          router.push('/edit-physical-profile');
        }}
      />
    </SafeAreaView>
  );
}