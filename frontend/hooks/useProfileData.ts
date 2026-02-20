// frontend/hooks/useProfileData.ts
// Custom hook for profile data loading, state management, and actions

import { useState, useCallback, useRef } from 'react';
import { Alert, Share } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  userApi, authApi, recipeApi, mealPlanApi, shoppingListApi,
  mealHistoryApi, collectionsApi, costTrackingApi, weightGoalApi,
  getBaseURL,
} from '../lib/api';
import {
  getNotificationPermissions,
  requestNotificationPermissions,
  getAllScheduledNotifications,
  scheduleNotification,
  cancelScheduledNotification,
  setNotificationHandler,
  type DailyTriggerInput,
  type DateTriggerInput,
} from '../utils/notificationsService';
import { HapticPatterns } from '../constants/Haptics';
import { analytics } from '../utils/analytics';
import { locationService } from '../utils/locationService';
import type { UserProfile, UserNotifications, SuggestedRecipe, ProfilePreset } from '../types';

interface UseProfileDataOptions {
  user: { id?: string; provider?: string } | null;
  logout: () => Promise<void>;
}

// Helper to detect if running in Expo Go (notifications not supported in SDK 53+)
const isRunningInExpoGo = () => {
  return Constants.appOwnership === 'expo';
};

export function useProfileData({ user, logout }: UseProfileDataOptions) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [physicalProfile, setPhysicalProfile] = useState<any | null>(null);
  const [macroGoals, setMacroGoals] = useState<any | null>(null);
  const [preferences, setPreferences] = useState<any | null>(null);
  const [budgetSettings, setBudgetSettings] = useState<any | null>(null);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [weightHistoryLoading, setWeightHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<UserNotifications>({
    mealReminders: true,
    mealReminderTimes: ['08:00', '12:00', '18:00'],
    newRecipes: true,
    goalUpdates: false,
    goalUpdateDay: 'Monday',
    goalUpdateTime: '09:00',
  });
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [updatingNotification, setUpdatingNotification] = useState<keyof UserNotifications | null>(null);

  const [privacySettings, setPrivacySettings] = useState<{
    analyticsEnabled: boolean;
    dataSharingEnabled: boolean;
    locationServicesEnabled: boolean;
  }>({
    analyticsEnabled: true,
    dataSharingEnabled: true,
    locationServicesEnabled: false,
  });
  const [updatingPrivacySetting, setUpdatingPrivacySetting] = useState<string | null>(null);

  const [dataStats, setDataStats] = useState<{
    recipes: number;
    savedRecipes: number;
    mealPlans: number;
    shoppingLists: number;
    mealHistory: number;
    collections: number;
    loading: boolean;
  }>({
    recipes: 0,
    savedRecipes: 0,
    mealPlans: 0,
    shoppingLists: 0,
    mealHistory: 0,
    collections: 0,
    loading: true,
  });

  const [profileCompletion, setProfileCompletion] = useState<{
    physicalProfile: boolean;
    macroGoals: boolean;
    preferences: boolean;
    percentage: number;
  }>({
    physicalProfile: false,
    macroGoals: false,
    preferences: false,
    percentage: 0,
  });

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteRecipes, setRouletteRecipes] = useState<SuggestedRecipe[]>([]);
  const [rouletteLoading, setRouletteLoading] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  // Profile presets
  const [presets, setPresets] = useState<ProfilePreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);

  // --- Notification Scheduling ---

  const scheduleMealReminderNotifications = async (times: string[]) => {
    // Skip notification scheduling in Expo Go (not supported in SDK 53+)
    if (isRunningInExpoGo()) {
      console.log('📱 Profile: Running in Expo Go, skipping notification scheduling (notifications require a development build)');
      return;
    }

    try {
      const existingStatusResult = await getNotificationPermissions();
      let finalStatus = existingStatusResult?.status;

      if (!finalStatus || finalStatus !== 'granted') {
        const requestResult = await requestNotificationPermissions();
        finalStatus = requestResult?.status;
      }
      if (!finalStatus || finalStatus !== 'granted') {
        console.log('📱 Profile: Notification permissions not granted');
        return;
      }

      const allScheduled = await getAllScheduledNotifications();
      const mealReminderIds = allScheduled
        .filter(n => n.identifier.startsWith('meal-reminder-'))
        .map(n => n.identifier);

      for (const id of mealReminderIds) {
        await cancelScheduledNotification(id);
      }

      await setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      for (const time of times) {
        const [hours, minutes] = time.split(':').map(Number);
        const trigger: DailyTriggerInput = {
          type: 'daily',
          hour: hours,
          minute: minutes,
          repeats: true,
        };

        await scheduleNotification({
          identifier: `meal-reminder-${time}`,
          content: {
            title: '🍳 Meal Reminder',
            body: 'Time to plan your meal! Check out today\'s recommendations.',
            sound: true,
            data: { type: 'meal-reminder', time },
          },
          trigger,
        });
      }
      console.log(`📱 Profile: Scheduled ${times.length} meal reminder notifications`);
    } catch (error: any) {
      console.error('📱 Profile: Error scheduling meal reminder notifications', error);
    }
  };

  const cancelMealReminderNotifications = async () => {
    // Skip notification cancellation in Expo Go (not supported in SDK 53+)
    if (isRunningInExpoGo()) {
      console.log('📱 Profile: Running in Expo Go, skipping notification cancellation (notifications require a development build)');
      return;
    }

    try {
      const allScheduled = await getAllScheduledNotifications();
      const mealReminderIds = allScheduled
        .filter(n => n.identifier.startsWith('meal-reminder-'))
        .map(n => n.identifier);

      for (const id of mealReminderIds) {
        await cancelScheduledNotification(id);
      }
    } catch (error: any) {
      console.error('📱 Profile: Error cancelling meal reminder notifications', error);
    }
  };

  const scheduleGoalUpdateNotification = async (day: string, time: string) => {
    // Skip notification scheduling in Expo Go (not supported in SDK 53+)
    if (isRunningInExpoGo()) {
      console.log('📱 Profile: Running in Expo Go, skipping notification scheduling (notifications require a development build)');
      return;
    }

    try {
      const existingStatusResult = await getNotificationPermissions();
      let finalStatus = existingStatusResult?.status;

      if (!finalStatus || finalStatus !== 'granted') {
        const requestResult = await requestNotificationPermissions();
        finalStatus = requestResult?.status;
      }
      if (!finalStatus || finalStatus !== 'granted') return;

      const allScheduled = await getAllScheduledNotifications();
      const goalUpdateId = allScheduled.find(n => n.identifier === 'goal-update-weekly')?.identifier;
      if (goalUpdateId) await cancelScheduledNotification(goalUpdateId);

      await setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      const [hours, minutes] = time.split(':').map(Number);
      const dayMap: { [key: string]: number } = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6,
      };
      const targetDay = dayMap[day] ?? 1;
      const today = new Date();
      const currentDay = today.getDay();

      let daysUntilTarget = (targetDay - currentDay + 7) % 7;
      if (daysUntilTarget === 0) {
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(hours, minutes, 0, 0);
        if (now >= targetTime) daysUntilTarget = 7;
      }

      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysUntilTarget);
      nextDate.setHours(hours, minutes, 0, 0);

      for (let week = 0; week < 52; week++) {
        const notificationDate = new Date(nextDate);
        notificationDate.setDate(nextDate.getDate() + (week * 7));
        const trigger: DateTriggerInput = {
          type: 'date',
          date: notificationDate,
          repeats: false,
        };

        await scheduleNotification({
          identifier: `goal-update-weekly-${week}`,
          content: {
            title: '📊 Weekly Progress Report',
            body: 'Check out your weekly nutrition and meal planning progress!',
            sound: true,
            data: { type: 'goal-update', day, time },
          },
          trigger,
        });
      }
      console.log(`📱 Profile: Scheduled 52 weekly goal update notifications starting ${day} at ${time}`);
    } catch (error: any) {
      console.error('📱 Profile: Error scheduling goal update notification', error);
    }
  };

  const cancelGoalUpdateNotification = async () => {
    // Skip notification cancellation in Expo Go (not supported in SDK 53+)
    if (isRunningInExpoGo()) {
      console.log('📱 Profile: Running in Expo Go, skipping notification cancellation (notifications require a development build)');
      return;
    }

    try {
      const allScheduled = await getAllScheduledNotifications();
      const goalUpdateIds = allScheduled
        .filter(n => n.identifier.startsWith('goal-update-weekly-'))
        .map(n => n.identifier);

      for (const id of goalUpdateIds) {
        await cancelScheduledNotification(id);
      }
    } catch (error: any) {
      console.error('📱 Profile: Error cancelling goal update notifications', error);
    }
  };

  // --- Data Loading ---

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Load all profile data in parallel for faster loading
      const [
        profileRes,
        physicalProfileRes,
        macroGoalsRes,
        preferencesRes,
        budgetRes,
        savedPicture,
      ] = await Promise.all([
        userApi.getProfile(),
        userApi.getPhysicalProfile().catch(() => ({ data: null })),
        userApi.getMacroGoals().catch(() => ({ data: null })),
        userApi.getPreferences().catch(() => ({ data: null })),
        costTrackingApi.getBudget().catch(() => ({ data: null })),
        AsyncStorage.getItem(`profile_picture_${user?.id}`),
      ]);

      console.log('📱 Profile: Loaded profile data');
      setProfile(profileRes.data);
      setPhysicalProfile(physicalProfileRes.data);
      setMacroGoals(macroGoalsRes.data);
      setPreferences(preferencesRes.data);
      setBudgetSettings(budgetRes.data);

      // Load profile picture: prefer server URL, fall back to local cache
      const serverPictureUrl = profileRes.data?.profilePictureUrl;
      if (serverPictureUrl) {
        const baseUrl = getBaseURL().replace('/api', '');
        const fullUrl = `${baseUrl}${serverPictureUrl}?t=${Date.now()}`;
        setProfilePicture(fullUrl);
        if (user?.id) {
          await AsyncStorage.setItem(`profile_picture_${user.id}`, fullUrl).catch(() => {});
        }
      } else if (savedPicture) {
        setProfilePicture(savedPicture);
      }

      // Update profile completion from the data we already have (no extra API calls)
      const completed = {
        physicalProfile: !!physicalProfileRes.data,
        macroGoals: !!macroGoalsRes.data,
        preferences: !!preferencesRes.data,
      };
      const completedCount = Object.values(completed).filter(Boolean).length;
      setProfileCompletion({ ...completed, percentage: Math.round((completedCount / 3) * 100) });
    } catch (error: any) {
      console.error('📱 Profile: Load error', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const loadPresets = async () => {
    try {
      setPresetsLoading(true);
      const response = await userApi.getPresets();
      setPresets(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('📱 Profile: Error loading presets:', error);
      setPresets([]);
    } finally {
      setPresetsLoading(false);
    }
  };

  const loadNotifications = async (scheduleNotifications = false) => {
    try {
      setNotificationsLoading(true);
      const response = await userApi.getNotifications();
      console.log('📱 Profile: Loaded notifications');
      setNotifications(response.data);

      // Only schedule notifications on initial load, not on every focus
      if (scheduleNotifications) {
        if (response.data.mealReminders && response.data.mealReminderTimes && response.data.mealReminderTimes.length > 0) {
          scheduleMealReminderNotifications(response.data.mealReminderTimes);
        }
        if (response.data.goalUpdates && response.data.goalUpdateDay && response.data.goalUpdateTime) {
          scheduleGoalUpdateNotification(response.data.goalUpdateDay, response.data.goalUpdateTime);
        }
      }
    } catch (error: any) {
      console.error('📱 Profile: Notifications load error', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const loadDataStats = async () => {
    try {
      setDataStats(prev => ({ ...prev, loading: true }));

      // Use smaller limits since we only need counts (APIs should return total in response)
      const [
        savedRecipesResponse,
        mealPlansResponse,
        shoppingListsResponse,
        mealHistoryResponse,
        collectionsResponse,
      ] = await Promise.allSettled([
        recipeApi.getSavedRecipes(),
        mealPlanApi.getWeeklyPlan(), // Use default date range
        shoppingListApi.getShoppingLists(),
        mealHistoryApi.getMealHistory({ limit: 1 }), // Only need total count, not all items
        collectionsApi.list(),
      ]);

      setDataStats({
        recipes: 0,
        savedRecipes: savedRecipesResponse.status === 'fulfilled'
          ? (Array.isArray(savedRecipesResponse.value.data)
              ? savedRecipesResponse.value.data.length
              : (savedRecipesResponse.value.data?.total || savedRecipesResponse.value.data?.data?.length || 0))
          : 0,
        mealPlans: mealPlansResponse.status === 'fulfilled'
          ? (Array.isArray(mealPlansResponse.value.data)
              ? mealPlansResponse.value.data.length
              : (mealPlansResponse.value.data?.mealPlans?.length || 0))
          : 0,
        shoppingLists: shoppingListsResponse.status === 'fulfilled'
          ? (Array.isArray(shoppingListsResponse.value.data)
              ? shoppingListsResponse.value.data.length
              : 0)
          : 0,
        mealHistory: mealHistoryResponse.status === 'fulfilled'
          ? (mealHistoryResponse.value.data?.total
              || (Array.isArray(mealHistoryResponse.value.data?.mealHistory)
                  ? mealHistoryResponse.value.data.mealHistory.length
                  : 0))
          : 0,
        collections: collectionsResponse.status === 'fulfilled'
          ? (Array.isArray(collectionsResponse.value.data)
              ? collectionsResponse.value.data.length
              : (collectionsResponse.value.data?.data?.length || 0))
          : 0,
        loading: false,
      });
    } catch (error: any) {
      console.error('📱 Profile: Error loading data stats', error);
      setDataStats(prev => ({ ...prev, loading: false }));
    }
  };

  const loadWeightHistory = async () => {
    try {
      setWeightHistoryLoading(true);
      const response = await weightGoalApi.getWeightHistory(30);
      if (response.data && response.data.history) {
        setWeightHistory(response.data.history);
      }
    } catch (error: any) {
      console.error('📱 Profile: Error loading weight history', error);
      setWeightHistory([]);
    } finally {
      setWeightHistoryLoading(false);
    }
  };

  const loadPrivacySettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(`privacy_settings_${user?.id}`);
      if (savedSettings) {
        setPrivacySettings(JSON.parse(savedSettings));
      }
      // Initialize analytics/location in background (don't await)
      if (user?.id) {
        analytics.initialize(user.id);
        locationService.initialize(user.id);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  // Track if initial load has completed
  const hasInitialLoadRef = useRef(false);

  // --- Effects ---

  useFocusEffect(
    useCallback(() => {
      const isInitialLoad = !hasInitialLoadRef.current;

      if (isInitialLoad) {
        console.log('📱 Profile: Initial load');
        hasInitialLoadRef.current = true;

        // Load essential data first (profile shows loading state)
        loadProfile();
        loadNotifications(true); // Schedule notifications on initial load
        loadPrivacySettings();
        loadPresets();

        // Load secondary data after a short delay to not block UI
        setTimeout(() => {
          loadDataStats();
          loadWeightHistory();
        }, 100);
      } else {
        console.log('📱 Profile: Screen refocused, refreshing data');
        // On refocus, refresh data but don't re-schedule notifications
        loadProfile();
        loadNotifications(false);
        loadPresets();
        loadDataStats();
        loadWeightHistory();
      }

      // Track screen view in background
      if (user?.id) {
        analytics.trackScreenView('profile', {});
      }
    }, [user?.id])
  );

  // --- Action Handlers ---

  const updatePrivacySetting = async (key: keyof typeof privacySettings, value: boolean) => {
    setUpdatingPrivacySetting(key);
    try {
      const updatedSettings = { ...privacySettings, [key]: value };
      setPrivacySettings(updatedSettings);
      await AsyncStorage.setItem(`privacy_settings_${user?.id}`, JSON.stringify(updatedSettings));

      if (key === 'analyticsEnabled') {
        if (value) {
          if (user?.id) {
            await analytics.initialize(user.id);
            await analytics.track('analytics_enabled', { source: 'privacy_settings' });
          }
        } else {
          await analytics.clearAnalyticsData();
        }
      }

      if (key === 'locationServicesEnabled') {
        if (value && user?.id) {
          await locationService.initialize(user.id);
          const granted = await locationService.requestPermissions();
          if (granted) {
            const location = await locationService.getCurrentLocation();
            if (location) {
              try {
                await userApi.updatePreferences({
                  latitude: location.latitude,
                  longitude: location.longitude,
                  useLocationServices: true,
                });
              } catch (error) {
                console.error('Error saving location to preferences:', error);
              }
            }
          }
        } else if (user?.id) {
          await locationService.initialize(user.id);
          try {
            await userApi.updatePreferences({
              latitude: null,
              longitude: null,
              useLocationServices: false,
            });
          } catch (error) {
            console.error('Error clearing location from preferences:', error);
          }
        }
      }

      if (key !== 'analyticsEnabled' || value) {
        await analytics.track('privacy_setting_changed', { setting: key, value });
      }

      HapticPatterns.success();
    } catch (error: any) {
      console.error('📱 Profile: Error updating privacy setting', error);
      setPrivacySettings(privacySettings);
      HapticPatterns.error();
    } finally {
      setUpdatingPrivacySetting(null);
    }
  };

  const toggleNotification = async (key: keyof UserNotifications) => {
    if (updatingNotification) return;

    const previousNotifications = { ...notifications };
    const updatedNotifications = { ...notifications, [key]: !notifications[key] };

    setUpdatingNotification(key);
    setNotifications(updatedNotifications);

    try {
      await userApi.updateNotifications(updatedNotifications);
      console.log('📱 Profile: Notifications updated');

      if (key === 'mealReminders') {
        if (updatedNotifications.mealReminders && updatedNotifications.mealReminderTimes && updatedNotifications.mealReminderTimes.length > 0) {
          await scheduleMealReminderNotifications(updatedNotifications.mealReminderTimes);
        } else {
          await cancelMealReminderNotifications();
        }
      }

      if (key === 'goalUpdates') {
        if (updatedNotifications.goalUpdates && updatedNotifications.goalUpdateDay && updatedNotifications.goalUpdateTime) {
          await scheduleGoalUpdateNotification(updatedNotifications.goalUpdateDay, updatedNotifications.goalUpdateTime);
        } else {
          await cancelGoalUpdateNotification();
        }
      }

      HapticPatterns.success();
    } catch (error: any) {
      console.error('📱 Profile: Notifications update error', error);
      setNotifications(previousNotifications);
      HapticPatterns.error();
      Alert.alert('Error', 'Failed to save notification settings. Please try again.', [{ text: 'OK' }]);
    } finally {
      setUpdatingNotification(null);
    }
  };

  const handleSaveMealReminderTime = async (selectedHour: number, selectedMinute: number, editingTimeIndex: number | null) => {
    const timeString = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    const times = [...(notifications.mealReminderTimes || [])];

    if (editingTimeIndex !== null && editingTimeIndex < times.length) {
      times[editingTimeIndex] = timeString;
    } else {
      times.push(timeString);
    }

    const updatedNotifications = { ...notifications, mealReminderTimes: times.sort() };
    setNotifications(updatedNotifications);
    setUpdatingNotification('mealReminders');

    try {
      await userApi.updateNotifications(updatedNotifications);
      if (notifications.mealReminders) {
        await scheduleMealReminderNotifications(times.sort());
      }
      HapticPatterns.success();
    } catch (error: any) {
      console.error('📱 Profile: Error updating meal reminder times', error);
      setNotifications(notifications);
      HapticPatterns.error();
    } finally {
      setUpdatingNotification(null);
    }
  };

  const handleRemoveMealReminderTime = async (index: number) => {
    const times = [...(notifications.mealReminderTimes || [])];
    const removedTime = times[index];
    times.splice(index, 1);

    const updatedNotifications = { ...notifications, mealReminderTimes: times };
    setNotifications(updatedNotifications);
    setUpdatingNotification('mealReminders');

    try {
      await userApi.updateNotifications(updatedNotifications);
      if (removedTime) {
        try {
          await cancelScheduledNotification(`meal-reminder-${removedTime}`);
          console.log(`📱 Profile: Cancelled notification for ${removedTime}`);
        } catch (error) {
          console.error('📱 Profile: Error cancelling specific notification', error);
        }
      }
      if (notifications.mealReminders && times.length > 0) {
        await scheduleMealReminderNotifications(times);
      }
      HapticPatterns.success();
    } catch (error: any) {
      console.error('📱 Profile: Error removing meal reminder time', error);
      setNotifications(notifications);
      HapticPatterns.error();
    } finally {
      setUpdatingNotification(null);
    }
  };

  // --- Export ---

  const convertToCSV = (data: any): string => {
    const lines: string[] = [];
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    if (data.recipes && Array.isArray(data.recipes) && data.recipes.length > 0) {
      lines.push('=== RECIPES ===');
      lines.push('Title,Cuisine,Meal Type,Cook Time (min),Servings,Calories,Protein (g),Carbs (g),Fat (g)');
      data.recipes.forEach((recipe: any) => {
        lines.push([
          escapeCSV(recipe.title), escapeCSV(recipe.cuisine), escapeCSV(recipe.mealType || ''),
          escapeCSV(recipe.cookTime), escapeCSV(recipe.servings), escapeCSV(recipe.calories),
          escapeCSV(recipe.protein), escapeCSV(recipe.carbs), escapeCSV(recipe.fat),
        ].join(','));
      });
      lines.push('');
    }

    if (data.mealHistory && Array.isArray(data.mealHistory) && data.mealHistory.length > 0) {
      lines.push('=== MEAL HISTORY ===');
      lines.push('Date,Recipe Title,Consumed,Feedback');
      data.mealHistory.forEach((meal: any) => {
        lines.push([
          escapeCSV(meal.date), escapeCSV(meal.recipe?.title || ''),
          escapeCSV(meal.consumed ? 'Yes' : 'No'), escapeCSV(meal.feedback || ''),
        ].join(','));
      });
      lines.push('');
    }

    if (data.shoppingLists && Array.isArray(data.shoppingLists) && data.shoppingLists.length > 0) {
      lines.push('=== SHOPPING LISTS ===');
      data.shoppingLists.forEach((list: any) => {
        lines.push(`List: ${escapeCSV(list.name)}`);
        if (list.items && Array.isArray(list.items)) {
          lines.push('Item,Quantity,Purchased');
          list.items.forEach((item: any) => {
            lines.push([escapeCSV(item.name), escapeCSV(item.quantity || ''), escapeCSV(item.purchased ? 'Yes' : 'No')].join(','));
          });
        }
        lines.push('');
      });
    }

    return lines.join('\n');
  };

  const convertToPDF = (data: any): string => {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    lines.push('SAZON CHEF DATA EXPORT');
    lines.push('='.repeat(50));
    lines.push(`Export Date: ${timestamp}`);
    lines.push(`Version: ${data.version || '1.0'}`);
    lines.push('');

    if (data.profile) {
      lines.push('PROFILE');
      lines.push('-'.repeat(50));
      lines.push(`Name: ${data.profile.name || ''}`);
      lines.push(`Email: ${data.profile.email || ''}`);
      lines.push('');
    }

    if (data.physicalProfile) {
      lines.push('PHYSICAL PROFILE');
      lines.push('-'.repeat(50));
      lines.push(`Gender: ${data.physicalProfile.gender || ''}`);
      lines.push(`Age: ${data.physicalProfile.age || ''}`);
      lines.push(`Height: ${data.physicalProfile.heightCm || ''} cm`);
      lines.push(`Weight: ${data.physicalProfile.weightKg || ''} kg`);
      lines.push(`Activity Level: ${data.physicalProfile.activityLevel || ''}`);
      lines.push(`Fitness Goal: ${data.physicalProfile.fitnessGoal || ''}`);
      lines.push('');
    }

    if (data.macroGoals) {
      lines.push('MACRO GOALS');
      lines.push('-'.repeat(50));
      lines.push(`Calories: ${data.macroGoals.calories || ''}`);
      lines.push(`Protein: ${data.macroGoals.protein || ''} g`);
      lines.push(`Carbs: ${data.macroGoals.carbs || ''} g`);
      lines.push(`Fat: ${data.macroGoals.fat || ''} g`);
      lines.push('');
    }

    if (data.recipes && Array.isArray(data.recipes) && data.recipes.length > 0) {
      lines.push('RECIPES');
      lines.push('-'.repeat(50));
      data.recipes.forEach((recipe: any, index: number) => {
        lines.push(`${index + 1}. ${recipe.title || ''}`);
        lines.push(`   Cuisine: ${recipe.cuisine || ''} | Cook Time: ${recipe.cookTime || ''} min`);
        lines.push(`   Calories: ${recipe.calories || ''} | Protein: ${recipe.protein || ''}g | Carbs: ${recipe.carbs || ''}g | Fat: ${recipe.fat || ''}g`);
        lines.push('');
      });
    }

    return lines.join('\n');
  };

  const handleExportData = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      setExportingData(true);
      HapticPatterns.success();

      const [
        profileData, preferencesData, physicalProfileData, macroGoalsData, notificationsData,
        recipesData, mealPlansData, shoppingListsData, mealHistoryData, collectionsData,
      ] = await Promise.allSettled([
        userApi.getProfile().then(r => r.data),
        userApi.getPreferences().then(r => r.data),
        userApi.getPhysicalProfile().then(r => r.data),
        userApi.getMacroGoals().then(r => r.data),
        userApi.getNotifications().then(r => r.data),
        recipeApi.getRecipes({ pageSize: 1000 }).then(r => r.data?.recipes || r.data || []),
        mealPlanApi.getWeeklyPlan().then(r => r.data).catch(() => null),
        shoppingListApi.getShoppingLists().then(r => r.data || []),
        mealHistoryApi.getMealHistory().then(r => r.data || []).catch(() => []),
        collectionsApi.list().then(r => Array.isArray(r.data) ? r.data : (r.data?.data || [])).catch(() => []),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        profile: profileData.status === 'fulfilled' ? profileData.value : null,
        preferences: preferencesData.status === 'fulfilled' ? preferencesData.value : null,
        physicalProfile: physicalProfileData.status === 'fulfilled' ? physicalProfileData.value : null,
        macroGoals: macroGoalsData.status === 'fulfilled' ? macroGoalsData.value : null,
        notifications: notificationsData.status === 'fulfilled' ? notificationsData.value : null,
        recipes: recipesData.status === 'fulfilled' ? recipesData.value : [],
        mealPlans: mealPlansData.status === 'fulfilled' ? mealPlansData.value : null,
        shoppingLists: shoppingListsData.status === 'fulfilled' ? shoppingListsData.value : [],
        mealHistory: mealHistoryData.status === 'fulfilled' ? mealHistoryData.value : [],
        collections: collectionsData.status === 'fulfilled' ? collectionsData.value : [],
      };

      const timestamp = new Date().toISOString().split('T')[0];
      let content: string;
      let title: string;

      if (format === 'csv') {
        content = convertToCSV(exportData);
        title = `Sazon Chef Data Export (CSV) - ${timestamp}`;
      } else if (format === 'pdf') {
        content = convertToPDF(exportData);
        title = `Sazon Chef Data Export (PDF) - ${timestamp}`;
      } else {
        content = JSON.stringify(exportData, null, 2);
        title = `Sazon Chef Data Export (JSON) - ${timestamp}`;
      }

      const result = await Share.share({ message: content, title });
      if (result.action === Share.sharedAction) {
        HapticPatterns.success();
      }
    } catch (error: any) {
      console.error('📱 Profile: Export data error', error);
      HapticPatterns.error();
    } finally {
      setExportingData(false);
    }
  };

  const handleConfirmClearHistory = async (clearOptions: { mealHistory: boolean; shoppingLists: boolean }) => {
    if (!clearOptions.mealHistory && !clearOptions.shoppingLists) {
      HapticPatterns.error();
      return false;
    }

    try {
      const promises: Promise<any>[] = [];

      if (clearOptions.mealHistory) {
        try {
          const mealHistoryResponse = await mealHistoryApi.getMealHistory({ limit: 1000 });
          const mealHistory = mealHistoryResponse.data?.mealHistory || [];
          const deletePromises = mealHistory.map((entry: any) =>
            mealHistoryApi.deleteMealHistory(entry.id).catch((error) => {
              console.error(`Error deleting meal history entry ${entry.id}:`, error);
              return null;
            })
          );
          promises.push(...deletePromises);
        } catch (error: any) {
          console.error('Error fetching meal history:', error);
        }
      }

      if (clearOptions.shoppingLists) {
        try {
          const shoppingListsResponse = await shoppingListApi.getShoppingLists();
          const shoppingLists = shoppingListsResponse.data || [];
          const deletePromises = shoppingLists.map((list: any) =>
            shoppingListApi.deleteShoppingList(list.id).catch((error) => {
              console.error(`Error deleting shopping list ${list.id}:`, error);
              return null;
            })
          );
          promises.push(...deletePromises);
        } catch (error: any) {
          console.error('Error fetching shopping lists:', error);
        }
      }

      await Promise.allSettled(promises);
      HapticPatterns.success();
      return true;
    } catch (error: any) {
      console.error('Error clearing history:', error);
      HapticPatterns.error();
      return false;
    }
  };

  // --- Profile Picture ---

  const handleChangeProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos to set a profile picture.', [{ text: 'OK' }]);
        return;
      }

      const handleImageSelected = async (uri: string) => {
        try {
          setUploadingPicture(true);
          if (user?.id) {
            try {
              const response = await userApi.uploadProfilePicture(uri);
              const serverUrl = response.data?.profilePictureUrl;
              if (serverUrl) {
                const baseUrl = getBaseURL().replace('/api', '');
                const fullUrl = `${baseUrl}${serverUrl}?t=${Date.now()}`;
                setProfilePicture(fullUrl);
                await AsyncStorage.setItem(`profile_picture_${user.id}`, fullUrl);
              }
            } catch (uploadError: any) {
              console.error('📱 Profile: Server upload failed, saving locally:', uploadError);
              await AsyncStorage.setItem(`profile_picture_${user.id}`, uri);
              setProfilePicture(uri);
            }
            HapticPatterns.success();
          }
        } catch (error: any) {
          console.error('📱 Profile: Error saving profile picture', error);
          HapticPatterns.error();
        } finally {
          setUploadingPicture(false);
        }
      };

      Alert.alert(
        'Change Profile Picture',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Take Photo',
            onPress: async () => {
              const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
              if (cameraStatus !== 'granted') {
                Alert.alert('Permission Required', 'We need camera access to take a photo.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                await handleImageSelected(result.assets[0].uri);
              }
            },
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                await handleImageSelected(result.assets[0].uri);
              }
            },
          },
          profilePicture ? {
            text: 'Remove Picture',
            style: 'destructive',
            onPress: async () => {
              try {
                await userApi.deleteProfilePicture();
              } catch (e) {
                console.error('📱 Profile: Error removing server picture:', e);
              }
              await AsyncStorage.removeItem(`profile_picture_${user?.id}`);
              setProfilePicture(null);
              HapticPatterns.success();
            },
          } : null,
        ].filter(Boolean) as any[]
      );
    } catch (error: any) {
      console.error('📱 Profile: Error changing profile picture', error);
      HapticPatterns.error();
    }
  };

  // --- Name ---

  const saveNewName = async (name: string) => {
    if (!name.trim() || !profile) return false;
    if (name.trim() === profile.name) return true;

    try {
      await userApi.updateProfile({ name: name.trim() });
      await loadProfile();
      HapticPatterns.success();
      return true;
    } catch (error: any) {
      console.error('📱 Profile: Error updating name', error);
      HapticPatterns.error();
      return false;
    }
  };

  // --- Recipe Roulette ---

  const fetchRouletteRecipes = async () => {
    try {
      setRouletteLoading(true);
      const response = await recipeApi.getAllRecipes({ page: 0, limit: 20 });
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
      Alert.alert('Error', 'Failed to load recipes. Please try again.');
    } finally {
      setRouletteLoading(false);
    }
  };

  const handleRouletteLike = async (recipeId: string) => {
    try {
      await recipeApi.likeRecipe(recipeId);
      HapticPatterns.success();
    } catch (error) {
      console.error('Error liking recipe:', error);
      HapticPatterns.error();
    }
  };

  const handleRoulettePass = async (recipeId: string) => {
    try {
      await recipeApi.dislikeRecipe(recipeId);
      HapticPatterns.success();
    } catch (error) {
      console.error('Error disliking recipe:', error);
      HapticPatterns.error();
    }
  };

  // --- Password ---

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await authApi.changePassword(currentPassword, newPassword);
      HapticPatterns.success();
      return true;
    } catch (error: any) {
      console.error('📱 Profile: Password change error', error);
      HapticPatterns.error();
      return false;
    }
  };

  // --- Logout ---

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error: any) {
              console.error('Error during logout:', error);
              try { router.replace('/login'); } catch (navError) {
                console.error('Error navigating to login:', navError);
              }
            }
          },
        },
      ]
    );
  };

  // --- Delete Account ---

  const proceedWithDeletion = async () => {
    try {
      await authApi.deleteAccount();
      HapticPatterns.success();
      await logout();
      router.replace('/login');
    } catch (error: any) {
      console.error('📱 Profile: Error deleting account', error);
      HapticPatterns.error();
      Alert.alert('Error', error.message || 'Failed to delete account. Please try again or contact support.');
    }
  };

  // --- Profile Presets ---

  const handleSavePreset = async (name: string, description?: string) => {
    try {
      await userApi.createPreset({ name, description });
      HapticPatterns.success();
      await loadPresets();
    } catch (error: any) {
      console.error('📱 Profile: Error saving preset:', error);
      HapticPatterns.error();
      const msg = error?.response?.data?.error || 'Failed to save preset';
      Alert.alert('Error', msg);
    }
  };

  const handleApplyPreset = async (preset: ProfilePreset) => {
    try {
      await userApi.applyPreset(preset.id);
      HapticPatterns.success();
      // Refresh all profile data since macros/preferences changed
      await loadProfile();
      await loadPresets();
    } catch (error: any) {
      console.error('📱 Profile: Error applying preset:', error);
      HapticPatterns.error();
      Alert.alert('Error', error?.response?.data?.error || 'Failed to apply preset');
    }
  };

  const handleDeletePreset = async (id: string) => {
    try {
      await userApi.deletePreset(id);
      HapticPatterns.success();
      await loadPresets();
    } catch (error: any) {
      console.error('📱 Profile: Error deleting preset:', error);
      HapticPatterns.error();
    }
  };

  return {
    // Data
    profile, physicalProfile, macroGoals, preferences, budgetSettings,
    weightHistory, weightHistoryLoading,
    loading,
    notifications, notificationsLoading, updatingNotification,
    privacySettings, updatingPrivacySetting,
    dataStats, profileCompletion,
    profilePicture, uploadingPicture,
    showRoulette, rouletteRecipes, rouletteLoading,
    exportingData,
    presets, presetsLoading,
    // Setters
    setShowRoulette,
    // Actions
    loadProfile,
    loadPresets,
    toggleNotification,
    updatePrivacySetting,
    handleSaveMealReminderTime,
    handleRemoveMealReminderTime,
    handleExportData,
    handleConfirmClearHistory,
    handleChangeProfilePicture,
    saveNewName,
    fetchRouletteRecipes,
    handleRouletteLike,
    handleRoulettePass,
    handleLogout,
    proceedWithDeletion,
    changePassword,
    handleSavePreset,
    handleApplyPreset,
    handleDeletePreset,
  };
}
