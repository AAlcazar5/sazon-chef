import { View, Text, ScrollView, Switch, Alert, Modal, TextInput, Share, ActivityIndicator, Image, Animated, Easing, Dimensions } from 'react-native';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { FontSize } from '../../constants/Typography';
import { Duration, Spring } from '../../constants/Animations';
import { HapticPatterns } from '../../constants/Haptics';
import { ProfileEmptyStates } from '../../constants/EmptyStates';
import { buttonAccessibility, iconButtonAccessibility, inputAccessibility, switchAccessibility } from '../../utils/accessibility';
import { userApi, authApi, recipeApi, mealPlanApi, shoppingListApi, mealHistoryApi, collectionsApi, costTrackingApi, weightGoalApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getNotificationPermissions,
  requestNotificationPermissions,
  getAllScheduledNotifications,
  scheduleNotification,
  cancelScheduledNotification,
  setNotificationHandler,
  type DailyTriggerInput,
  type DateTriggerInput,
} from '../../utils/notificationsService';
import type { UserProfile, UserNotifications } from '../../types';
import HelpTooltip from '../../components/ui/HelpTooltip';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from '../../utils/analytics';
import { locationService } from '../../utils/locationService';
import RecipeRoulette from '../../components/recipe/RecipeRoulette';
import type { SuggestedRecipe } from '../../types';

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const { theme, themeMode, toggleTheme, setThemeMode, systemColorScheme } = useTheme();
  const isDark = theme === 'dark';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [physicalProfile, setPhysicalProfile] = useState<any | null>(null);
  const [macroGoals, setMacroGoals] = useState<any | null>(null);
  const [preferences, setPreferences] = useState<any | null>(null);
  const [budgetSettings, setBudgetSettings] = useState<any | null>(null);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [weightHistoryLoading, setWeightHistoryLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotifications>({
    mealReminders: true,
    mealReminderTimes: ['08:00', '12:00', '18:00'], // Default meal reminder times
    newRecipes: true,
    goalUpdates: false,
    goalUpdateDay: 'Monday',
    goalUpdateTime: '09:00'
  });
  const [showMealReminderSchedule, setShowMealReminderSchedule] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [editingTime, setEditingTime] = useState('');
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [manualTimeInput, setManualTimeInput] = useState('');
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [clearOptions, setClearOptions] = useState({
    mealHistory: false,
    shoppingLists: false,
  });
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState('');
  
  // Recipe roulette state
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteRecipes, setRouletteRecipes] = useState<SuggestedRecipe[]>([]);
  const [rouletteLoading, setRouletteLoading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    appearance: false,
    physicalProfile: false,
    weightHistory: false,
    macroGoals: false,
    notifications: false,
    dataPrivacy: false,
    account: false,
  });
  
  // Animation refs for each section
  const sectionAnimations = useRef<Record<string, Animated.Value>>({
    appearance: new Animated.Value(1),
    physicalProfile: new Animated.Value(1),
    weightHistory: new Animated.Value(1),
    macroGoals: new Animated.Value(1),
    notifications: new Animated.Value(1),
    dataPrivacy: new Animated.Value(1),
    account: new Animated.Value(1),
  }).current;
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
  const [loading, setLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPhysicalProfileHelp, setShowPhysicalProfileHelp] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [showExportFormatModal, setShowExportFormatModal] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
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

  // Load profile data
  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.getProfile();
      console.log('📱 Profile: Loaded profile data', response.data);
      setProfile(response.data);
      
      // Load physical profile separately
      try {
        const physicalProfileResponse = await userApi.getPhysicalProfile();
        if (physicalProfileResponse.data) {
          setPhysicalProfile(physicalProfileResponse.data);
        }
      } catch (error) {
        // Physical profile might not exist yet - that's okay
        setPhysicalProfile(null);
      }
      
      // Load macro goals separately (in case profile doesn't include them)
      try {
        const macroGoalsResponse = await userApi.getMacroGoals();
        if (macroGoalsResponse.data) {
          setMacroGoals(macroGoalsResponse.data);
        }
      } catch (error) {
        // Macro goals might not exist yet - that's okay
        setMacroGoals(null);
      }
      
      // Load preferences separately (in case profile doesn't include them)
      try {
        const preferencesResponse = await userApi.getPreferences();
        if (preferencesResponse.data) {
          setPreferences(preferencesResponse.data);
        }
      } catch (error) {
        // Preferences might not exist yet - that's okay
        setPreferences(null);
      }
      
      // Load budget settings separately
      try {
        const budgetResponse = await costTrackingApi.getBudget();
        if (budgetResponse.data) {
          setBudgetSettings(budgetResponse.data);
        }
      } catch (error) {
        // Budget settings might not exist yet - that's okay
        setBudgetSettings(null);
      }
      
      // Load profile picture from local storage
      const savedPicture = await AsyncStorage.getItem(`profile_picture_${user?.id}`);
      if (savedPicture) {
        setProfilePicture(savedPicture);
      }

    } catch (error: any) {
      console.error('📱 Profile: Load error', error);
      
      // Handle authentication errors gracefully
      const statusCode = error.response?.status;
      const errorCode = error.code;
      const isAuthError = statusCode === 401 || statusCode === 403 || 
                         errorCode === 'HTTP_401' || errorCode === 'HTTP_403';
      
      // Don't show errors to user - just set profile to null so we can show logout button
      setProfile(null);
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
      
      // Schedule notifications if meal reminders are enabled
      if (response.data.mealReminders && response.data.mealReminderTimes && response.data.mealReminderTimes.length > 0) {
        await scheduleMealReminderNotifications(response.data.mealReminderTimes);
      }
      
      // Schedule notification if goal updates are enabled
      if (response.data.goalUpdates && response.data.goalUpdateDay && response.data.goalUpdateTime) {
        await scheduleGoalUpdateNotification(response.data.goalUpdateDay, response.data.goalUpdateTime);
      }
    } catch (error: any) {
      console.error('📱 Profile: Notifications load error', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Check profile completion status
  const checkProfileCompletion = async () => {
    try {
      const [physicalProfileRes, macroGoalsRes, preferencesRes] = await Promise.allSettled([
        userApi.getPhysicalProfile(),
        userApi.getMacroGoals(),
        userApi.getPreferences(),
      ]);

      const physicalProfile = physicalProfileRes.status === 'fulfilled' && physicalProfileRes.value.data;
      const macroGoalsData = macroGoalsRes.status === 'fulfilled' && macroGoalsRes.value.data;
      const preferencesData = preferencesRes.status === 'fulfilled' && preferencesRes.value.data;

      // Update physical profile state if it exists
      if (physicalProfile) {
        setPhysicalProfile(physicalProfile);
      }
      
      // Update macro goals state if it exists
      if (macroGoalsData) {
        setMacroGoals(macroGoalsData);
      }
      
      // Update preferences state if it exists
      if (preferencesData) {
        setPreferences(preferencesData);
      }

      const completed = {
        physicalProfile: !!physicalProfile,
        macroGoals: !!macroGoals,
        preferences: !!preferences,
      };

      const total = 3;
      const completedCount = Object.values(completed).filter(Boolean).length;
      const percentage = Math.round((completedCount / total) * 100);

      setProfileCompletion({
        ...completed,
        percentage,
      });
    } catch (error: any) {
      console.error('📱 Profile: Error checking completion', error);
    }
  };

  // Load data usage statistics
  const loadDataStats = async () => {
    try {
      setDataStats(prev => ({ ...prev, loading: true }));
      
      const [
        savedRecipesResponse,
        mealPlansResponse,
        shoppingListsResponse,
        mealHistoryResponse,
        collectionsResponse,
      ] = await Promise.allSettled([
        recipeApi.getSavedRecipes(),
        mealPlanApi.getWeeklyPlan({ startDate: '2020-01-01', endDate: '2030-12-31' }), // Broad range to get all
        shoppingListApi.getShoppingLists(),
        mealHistoryApi.getMealHistory({ limit: 1000 }), // Get all to count
        collectionsApi.list(),
      ]);

      const stats = {
        recipes: 0, // Total recipes in database (not user-specific)
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
      };

      setDataStats(stats);
    } catch (error: any) {
      console.error('📱 Profile: Error loading data stats', error);
      setDataStats(prev => ({ ...prev, loading: false }));
    }
  };

  // Load weight history
  const loadWeightHistory = async () => {
    try {
      setWeightHistoryLoading(true);
      const response = await weightGoalApi.getWeightHistory(30); // Last 30 days
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

  // Format currency based on currency code
  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatStorageSize = (items: number, avgSizePerItem: number = 1024): string => {
    const totalBytes = items * avgSizePerItem;
    if (totalBytes < 1024) {
      return `${totalBytes} B`;
    } else if (totalBytes < 1024 * 1024) {
      return `${(totalBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  // Load privacy settings
  const loadPrivacySettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(`privacy_settings_${user?.id}`);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setPrivacySettings(settings);
        
        // Initialize analytics and location services based on settings
        if (user?.id) {
          await analytics.initialize(user.id);
          await locationService.initialize(user.id);
        }
      } else {
        // Initialize services with defaults
        if (user?.id) {
          await analytics.initialize(user.id);
          await locationService.initialize(user.id);
        }
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };


  // Load data on mount
  useEffect(() => {
    loadProfile();
    loadNotifications();
    loadPrivacySettings();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Profile: Screen focused, refreshing data');
      loadProfile();
      loadNotifications();
      loadDataStats();
      loadWeightHistory();
      checkProfileCompletion();
      loadPrivacySettings();

      // Track screen view
      if (user?.id) {
        analytics.initialize(user.id).then(() => {
          analytics.trackScreenView('profile', {});
        });
      }
    }, [user?.id])
  );


  // Update privacy setting
  const updatePrivacySetting = async (key: keyof typeof privacySettings, value: boolean) => {
    setUpdatingPrivacySetting(key);
    try {
      const updatedSettings = { ...privacySettings, [key]: value };
      setPrivacySettings(updatedSettings);
      await AsyncStorage.setItem(`privacy_settings_${user?.id}`, JSON.stringify(updatedSettings));
      
      // Handle analytics setting change
      if (key === 'analyticsEnabled') {
        if (value) {
          // Analytics enabled - initialize service
          if (user?.id) {
            await analytics.initialize(user.id);
            await analytics.track('analytics_enabled', { source: 'privacy_settings' });
          }
        } else {
          // Analytics disabled - clear existing data
          await analytics.clearAnalyticsData();
        }
      }
      
      // Handle location services setting change
      if (key === 'locationServicesEnabled') {
        if (value && user?.id) {
          // Location services enabled - initialize service
          await locationService.initialize(user.id);
          // Request permissions if enabling
          const granted = await locationService.requestPermissions();
          if (granted) {
            // Optionally get and save location to preferences
            const location = await locationService.getCurrentLocation();
            if (location) {
              // Save location to user preferences
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
          // Location services disabled - clear location data
          await locationService.initialize(user.id);
          // Clear location from preferences
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
      
      // Track privacy setting change (only if analytics is enabled)
      if (key !== 'analyticsEnabled' || value) {
        await analytics.track('privacy_setting_changed', {
          setting: key,
          value,
        });
      }
      
      HapticPatterns.success();
    } catch (error: any) {
      console.error('📱 Profile: Error updating privacy setting', error);
      // Revert on error
      setPrivacySettings(privacySettings);
      HapticPatterns.error();
    } finally {
      setUpdatingPrivacySetting(null);
    }
  };

  const toggleNotification = async (key: keyof UserNotifications) => {
    // Prevent multiple simultaneous updates
    if (updatingNotification) {
      return;
    }

    const previousNotifications = { ...notifications };
    const updatedNotifications = {
      ...notifications,
      [key]: !notifications[key]
    };
    
    // Set loading state
    setUpdatingNotification(key);
    
    // Optimistic update
    setNotifications(updatedNotifications);
    
    try {
      await userApi.updateNotifications(updatedNotifications);
      console.log('📱 Profile: Notifications updated');
      
      // Handle meal reminders toggle
      if (key === 'mealReminders') {
        if (updatedNotifications.mealReminders && updatedNotifications.mealReminderTimes && updatedNotifications.mealReminderTimes.length > 0) {
          // Schedule notifications when enabled
          await scheduleMealReminderNotifications(updatedNotifications.mealReminderTimes);
        } else {
          // Cancel notifications when disabled
          await cancelMealReminderNotifications();
        }
      }
      
      // Handle goal updates toggle
      if (key === 'goalUpdates') {
        if (updatedNotifications.goalUpdates && updatedNotifications.goalUpdateDay && updatedNotifications.goalUpdateTime) {
          // Schedule notification when enabled
          await scheduleGoalUpdateNotification(updatedNotifications.goalUpdateDay, updatedNotifications.goalUpdateTime);
        } else {
          // Cancel notification when disabled
          await cancelGoalUpdateNotification();
        }
      }
      
      HapticPatterns.success();
    } catch (error: any) {
      console.error('📱 Profile: Notifications update error', error);
      // Revert on error
      setNotifications(previousNotifications);
      HapticPatterns.error();
      // Show error to user so they know it didn't persist
      Alert.alert(
        'Error',
        'Failed to save notification settings. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setUpdatingNotification(null);
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
      Alert.alert('Error', 'Failed to load recipes. Please try again.');
    } finally {
      setRouletteLoading(false);
    }
  };

  // Handle roulette like
  const handleRouletteLike = async (recipeId: string) => {
    try {
      await recipeApi.likeRecipe(recipeId);
      HapticPatterns.success();
    } catch (error) {
      console.error('Error liking recipe:', error);
      HapticPatterns.error();
    }
  };

  // Handle roulette pass
  const handleRoulettePass = async (recipeId: string) => {
    try {
      await recipeApi.dislikeRecipe(recipeId);
      HapticPatterns.success();
    } catch (error) {
      console.error('Error disliking recipe:', error);
      HapticPatterns.error();
    }
  };

  // Schedule meal reminder notifications
  const scheduleMealReminderNotifications = async (times: string[]) => {
    try {
      // Request permissions first
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

      // Cancel all existing meal reminder notifications
      const allScheduled = await getAllScheduledNotifications();
      const mealReminderIds = allScheduled
        .filter(n => n.identifier.startsWith('meal-reminder-'))
        .map(n => n.identifier);
      
      if (mealReminderIds.length > 0) {
        // Cancel each notification individually
        for (const id of mealReminderIds) {
          await cancelScheduledNotification(id);
        }
        console.log(`📱 Profile: Cancelled ${mealReminderIds.length} existing meal reminder notifications`);
      }

      // Configure notification handler
      await setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Schedule new notifications for each time
      for (const time of times) {
        const [hours, minutes] = time.split(':').map(Number);
        
        // Create a daily recurring trigger
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

  // Cancel all meal reminder notifications
  const cancelMealReminderNotifications = async () => {
    try {
      const allScheduled = await getAllScheduledNotifications();
      const mealReminderIds = allScheduled
        .filter(n => n.identifier.startsWith('meal-reminder-'))
        .map(n => n.identifier);
      
      if (mealReminderIds.length > 0) {
        // Cancel each notification individually
        for (const id of mealReminderIds) {
          await cancelScheduledNotification(id);
        }
        console.log(`📱 Profile: Cancelled ${mealReminderIds.length} meal reminder notifications`);
      }
    } catch (error: any) {
      console.error('📱 Profile: Error cancelling meal reminder notifications', error);
    }
  };

  // Schedule weekly goal update notification
  const scheduleGoalUpdateNotification = async (day: string, time: string) => {
    try {
      // Request permissions first
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

      // Cancel existing goal update notification
      const allScheduled = await getAllScheduledNotifications();
      const goalUpdateId = allScheduled
        .find(n => n.identifier === 'goal-update-weekly')
        ?.identifier;
      
      if (goalUpdateId) {
        await cancelScheduledNotification(goalUpdateId);
        console.log('📱 Profile: Cancelled existing goal update notification');
      }

      // Configure notification handler
      await setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Parse time
      const [hours, minutes] = time.split(':').map(Number);
      
      // Map day name to day of week (0 = Sunday, 1 = Monday, etc.)
      const dayMap: { [key: string]: number } = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6,
      };
      
      const targetDay = dayMap[day] ?? 1; // Default to Monday if invalid
      const today = new Date();
      const currentDay = today.getDay();
      
      // Calculate days until next occurrence of target day
      let daysUntilTarget = (targetDay - currentDay + 7) % 7;
      if (daysUntilTarget === 0) {
        // If today is the target day, check if we've passed the time
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(hours, minutes, 0, 0);
        if (now >= targetTime) {
          // Time has passed today, schedule for next week
          daysUntilTarget = 7;
        }
      }
      
      // Calculate the next occurrence date
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysUntilTarget);
      nextDate.setHours(hours, minutes, 0, 0);
      
      // Since expo-notifications doesn't have a weekly recurring trigger,
      // we'll schedule notifications for the next 52 weeks (1 year)
      // Each notification will have a unique identifier
      const notificationsToSchedule = [];
      
      for (let week = 0; week < 52; week++) {
        const notificationDate = new Date(nextDate);
        notificationDate.setDate(nextDate.getDate() + (week * 7));
        
        const trigger: DateTriggerInput = {
          type: 'date',
          date: notificationDate,
          repeats: false,
        };

        notificationsToSchedule.push({
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

      // Schedule all weekly notifications
      for (const notification of notificationsToSchedule) {
        await scheduleNotification(notification);
      }

      console.log(`📱 Profile: Scheduled 52 weekly goal update notifications starting ${day} at ${time}`);
    } catch (error: any) {
      console.error('📱 Profile: Error scheduling goal update notification', error);
    }
  };

  // Cancel goal update notifications
  const cancelGoalUpdateNotification = async () => {
    try {
      const allScheduled = await getAllScheduledNotifications();
      const goalUpdateIds = allScheduled
        .filter(n => n.identifier.startsWith('goal-update-weekly-'))
        .map(n => n.identifier);
      
      if (goalUpdateIds.length > 0) {
        // Cancel each notification individually
        for (const id of goalUpdateIds) {
          await cancelScheduledNotification(id);
        }
        console.log(`📱 Profile: Cancelled ${goalUpdateIds.length} goal update notifications`);
      }
    } catch (error: any) {
      console.error('📱 Profile: Error cancelling goal update notifications', error);
    }
  };


  // Convert data to CSV format
  const convertToCSV = (data: any): string => {
    const lines: string[] = [];
    
    // Helper to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Export recipes as CSV
    if (data.recipes && Array.isArray(data.recipes) && data.recipes.length > 0) {
      lines.push('=== RECIPES ===');
      lines.push('Title,Cuisine,Meal Type,Cook Time (min),Servings,Calories,Protein (g),Carbs (g),Fat (g)');
      data.recipes.forEach((recipe: any) => {
        lines.push([
          escapeCSV(recipe.title),
          escapeCSV(recipe.cuisine),
          escapeCSV(recipe.mealType || ''),
          escapeCSV(recipe.cookTime),
          escapeCSV(recipe.servings),
          escapeCSV(recipe.calories),
          escapeCSV(recipe.protein),
          escapeCSV(recipe.carbs),
          escapeCSV(recipe.fat),
        ].join(','));
      });
      lines.push('');
    }

    // Export meal history as CSV
    if (data.mealHistory && Array.isArray(data.mealHistory) && data.mealHistory.length > 0) {
      lines.push('=== MEAL HISTORY ===');
      lines.push('Date,Recipe Title,Consumed,Feedback');
      data.mealHistory.forEach((meal: any) => {
        lines.push([
          escapeCSV(meal.date),
          escapeCSV(meal.recipe?.title || ''),
          escapeCSV(meal.consumed ? 'Yes' : 'No'),
          escapeCSV(meal.feedback || ''),
        ].join(','));
      });
      lines.push('');
    }

    // Export shopping lists as CSV
    if (data.shoppingLists && Array.isArray(data.shoppingLists) && data.shoppingLists.length > 0) {
      lines.push('=== SHOPPING LISTS ===');
      data.shoppingLists.forEach((list: any) => {
        lines.push(`List: ${escapeCSV(list.name)}`);
        if (list.items && Array.isArray(list.items)) {
          lines.push('Item,Quantity,Purchased');
          list.items.forEach((item: any) => {
            lines.push([
              escapeCSV(item.name),
              escapeCSV(item.quantity || ''),
              escapeCSV(item.purchased ? 'Yes' : 'No'),
            ].join(','));
          });
        }
        lines.push('');
      });
    }

    return lines.join('\n');
  };

  // Convert data to PDF-like text format (basic implementation)
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

  const handleExportData = async (format?: 'json' | 'csv' | 'pdf') => {
    const exportFormat = format || selectedExportFormat;
    
    // Show format selection modal if format not specified
    if (!format) {
      setShowExportFormatModal(true);
      return;
    }

    try {
      setExportingData(true);
      HapticPatterns.success();
      
      // Fetch all user data
      const [
        profileData,
        preferencesData,
        physicalProfileData,
        macroGoalsData,
        notificationsData,
        recipesData,
        mealPlansData,
        shoppingListsData,
        mealHistoryData,
        collectionsData,
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

      // Compile all data
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

      // Convert to selected format
      const timestamp = new Date().toISOString().split('T')[0];
      let content: string;
      let filename: string;
      let title: string;

      if (exportFormat === 'csv') {
        content = convertToCSV(exportData);
        filename = `sazon-chef-export-${timestamp}.csv`;
        title = `Sazon Chef Data Export (CSV) - ${timestamp}`;
      } else if (exportFormat === 'pdf') {
        content = convertToPDF(exportData);
        filename = `sazon-chef-export-${timestamp}.txt`; // Using .txt as PDF generation requires additional libraries
        title = `Sazon Chef Data Export (PDF) - ${timestamp}`;
      } else {
        // JSON (default)
        content = JSON.stringify(exportData, null, 2);
        filename = `sazon-chef-export-${timestamp}.json`;
        title = `Sazon Chef Data Export (JSON) - ${timestamp}`;
      }

      // Share the data
      const result = await Share.share({
        message: content,
        title: title,
      });

      if (result.action === Share.sharedAction) {
        HapticPatterns.success();
        setShowExportFormatModal(false);
      }
    } catch (error: any) {
      console.error('📱 Profile: Export data error', error);
      HapticPatterns.error();
    } finally {
      setExportingData(false);
    }
  };

  const handleClearHistory = () => {
    setClearOptions({ mealHistory: false, shoppingLists: false });
    setShowClearHistoryModal(true);
  };

  const handleConfirmClearHistory = async () => {
    if (!clearOptions.mealHistory && !clearOptions.shoppingLists) {
      HapticPatterns.error();
      return;
    }

    setClearingHistory(true);
    try {
      const promises: Promise<any>[] = [];

      // Clear meal history
      if (clearOptions.mealHistory) {
        try {
          // Fetch all meal history entries
          const mealHistoryResponse = await mealHistoryApi.getMealHistory({ limit: 1000 });
          const mealHistory = mealHistoryResponse.data?.mealHistory || [];
          
          // Delete all entries
          const deletePromises = mealHistory.map((entry: any) => 
            mealHistoryApi.deleteMealHistory(entry.id).catch((error) => {
              console.error(`Error deleting meal history entry ${entry.id}:`, error);
              return null; // Continue with other deletions even if one fails
            })
          );
          promises.push(...deletePromises);
        } catch (error: any) {
          console.error('Error fetching meal history:', error);
        }
      }

      // Clear shopping lists
      if (clearOptions.shoppingLists) {
        try {
          // Fetch all shopping lists
          const shoppingListsResponse = await shoppingListApi.getShoppingLists();
          const shoppingLists = shoppingListsResponse.data || [];
          
          // Delete all lists
          const deletePromises = shoppingLists.map((list: any) => 
            shoppingListApi.deleteShoppingList(list.id).catch((error) => {
              console.error(`Error deleting shopping list ${list.id}:`, error);
              return null; // Continue with other deletions even if one fails
            })
          );
          promises.push(...deletePromises);
        } catch (error: any) {
          console.error('Error fetching shopping lists:', error);
        }
      }

      // Wait for all deletions to complete
      await Promise.allSettled(promises);

      HapticPatterns.success();
      setShowClearHistoryModal(false);
      setClearOptions({ mealHistory: false, shoppingLists: false });
    } catch (error: any) {
      console.error('Error clearing history:', error);
      HapticPatterns.error();
    } finally {
      setClearingHistory(false);
    }
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
      HapticPatterns.error();
      return;
    }

    if (newPassword.length < 8) {
      HapticPatterns.error();
      return;
    }

    if (newPassword !== confirmPassword) {
      HapticPatterns.error();
      return;
    }

    if (currentPassword === newPassword) {
      HapticPatterns.error();
      return;
    }

    setChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      HapticPatterns.success();
      // Close modal on success - don't show success message
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('📱 Profile: Password change error', error);
      HapticPatterns.error();
      // Don't show error to user
    } finally {
      setChangingPassword(false);
    }
  };

  const handleChangeProfilePicture = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photos to set a profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Show action sheet
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
              await AsyncStorage.removeItem(`profile_picture_${user?.id}`);
              setProfilePicture(null);
              HapticPatterns.success();
            },
          } : null,
        ].filter(Boolean)
      );
    } catch (error: any) {
      console.error('📱 Profile: Error changing profile picture', error);
      HapticPatterns.error();
    }
  };

  const handleImageSelected = async (uri: string) => {
    try {
      setUploadingPicture(true);
      
      // Save to local storage (in a real app, this would upload to a server)
      if (user?.id) {
        await AsyncStorage.setItem(`profile_picture_${user.id}`, uri);
        setProfilePicture(uri);
        HapticPatterns.success();
      }
    } catch (error: any) {
      console.error('📱 Profile: Error saving profile picture', error);
      HapticPatterns.error();
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleEditName = () => {
    if (profile) {
      setEditingName(profile.name);
      setShowEditNameModal(true);
    }
  };

  const handleSaveName = async () => {
    if (!editingName.trim() || !profile) {
      HapticPatterns.error();
      return;
    }

    if (editingName.trim() === profile.name) {
      setShowEditNameModal(false);
      return;
    }

    setUpdatingName(true);
    try {
      await userApi.updateProfile({ name: editingName.trim() });
      await loadProfile(); // Reload profile to get updated name
      HapticPatterns.success();
      setShowEditNameModal(false);
    } catch (error: any) {
      console.error('📱 Profile: Error updating name', error);
      HapticPatterns.error();
    } finally {
      setUpdatingName(false);
    }
  };

  // Wheel Picker Component
  const WheelPicker = ({ 
    data, 
    selectedValue, 
    onValueChange, 
    width: pickerWidth = 80,
    isDark: isDarkMode = false
  }: {
    data: number[];
    selectedValue: number;
    onValueChange: (value: number) => void;
    width?: number;
    isDark?: boolean;
  }) => {
    const itemHeight = 45;
    const visibleItems = 3;
    const totalHeight = itemHeight * visibleItems;
    const scrollViewRef = useRef<ScrollView>(null);
    const [isScrolling, setIsScrolling] = useState(false);

    // Calculate initial scroll position based on selected value
    const selectedIndex = data.indexOf(selectedValue);
    const initialScrollY = selectedIndex * itemHeight;

    // Set initial scroll position when component mounts
    useEffect(() => {
      if (scrollViewRef.current) {
        const newIndex = data.indexOf(selectedValue);
        const newScrollY = newIndex * itemHeight;
        scrollViewRef.current.scrollTo({ y: newScrollY, animated: false });
      }
    }, []);

    // Update scroll position when selectedValue changes externally (but not during user scrolling)
    useEffect(() => {
      if (!isScrolling && scrollViewRef.current) {
        const newIndex = data.indexOf(selectedValue);
        if (newIndex >= 0) {
          const newScrollY = newIndex * itemHeight;
          scrollViewRef.current.scrollTo({ y: newScrollY, animated: false });
        }
      }
    }, [selectedValue]);

    return (
      <View style={{ 
        height: totalHeight, 
        width: pickerWidth, 
        overflow: 'hidden',
        borderRadius: 8,
        backgroundColor: isDarkMode ? DarkColors.surface : Colors.surface,
        borderWidth: 1,
        borderColor: isDarkMode ? DarkColors.border.medium : Colors.border.medium
      }}>
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          decelerationRate="fast"
          onScrollBeginDrag={() => setIsScrolling(true)}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.y / itemHeight);
            if (data[index] !== undefined && data[index] !== selectedValue) {
              onValueChange(data[index]);
            }
            // Delay setting isScrolling to false to prevent immediate scroll back
            setTimeout(() => {
              setIsScrolling(false);
            }, 100);
          }}
          onScrollEndDrag={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.y / itemHeight);
            if (data[index] !== undefined && data[index] !== selectedValue) {
              onValueChange(data[index]);
            }
          }}
          contentContainerStyle={{
            paddingTop: itemHeight,
            paddingBottom: itemHeight,
          }}
        >
          {data.map((value, index) => (
            <HapticTouchableOpacity
              key={index}
              onPress={() => {
                onValueChange(value);
                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({ y: index * itemHeight, animated: true });
                }
              }}
              style={{
                height: itemHeight,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: selectedValue === value ? (isDarkMode ? DarkColors.primary : Colors.primary) : 'transparent',
                borderRadius: 6,
                marginHorizontal: 2,
                marginVertical: 1,
              }}
            >
              <Text
                style={{
                  fontSize: FontSize.xl,
                  fontWeight: selectedValue === value ? 'bold' : '600',
                  color: selectedValue === value ? 'white' : (isDarkMode ? DarkColors.text.primary : Colors.text.primary),
                }}
              >
                {value.toString().padStart(2, '0')}
              </Text>
            </HapticTouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const formatTime = (time: string): string => {
    // Convert HH:mm to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const toggleSection = (sectionKey: string) => {
    const isCollapsed = collapsedSections[sectionKey];
    setCollapsedSections(prev => ({ ...prev, [sectionKey]: !isCollapsed }));
    
    // Animate section
    const animValue = sectionAnimations[sectionKey];
    Animated.timing(animValue, {
      toValue: isCollapsed ? 1 : 0,
      duration: Duration.medium,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    
    HapticPatterns.buttonPress();
  };


  const handleAddMealReminderTime = () => {
    const times = notifications.mealReminderTimes || [];
    setEditingTimeIndex(times.length);
    setSelectedHour(8);
    setSelectedMinute(0);
    setEditingTime('08:00');
    setManualTimeInput('8:00 AM');
  };

  // Handle manual time input
  const handleManualTimeInput = (text: string) => {
    setManualTimeInput(text);
    
    // Try to parse various time formats
    // Formats: "8:00 AM", "8:00", "08:00", "20:00", "8:00PM", etc.
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i;
    const match = text.match(timeRegex);
    
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3]?.toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      // Validate ranges
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        setSelectedHour(hours);
        setSelectedMinute(minutes);
      }
    } else {
      // Try to parse HH:mm format directly
      const simpleMatch = text.match(/^(\d{1,2}):(\d{2})$/);
      if (simpleMatch) {
        const hours = parseInt(simpleMatch[1], 10);
        const minutes = parseInt(simpleMatch[2], 10);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          setSelectedHour(hours);
          setSelectedMinute(minutes);
        }
      }
    }
  };

  // Update manual input when picker values change
  useEffect(() => {
    const hour12 = selectedHour % 12 || 12;
    const ampm = selectedHour >= 12 ? 'PM' : 'AM';
    setManualTimeInput(`${hour12}:${selectedMinute.toString().padStart(2, '0')} ${ampm}`);
  }, [selectedHour, selectedMinute]);

  const handleSaveMealReminderTime = async () => {
    // Format time as HH:mm
    const timeString = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;

    const times = [...(notifications.mealReminderTimes || [])];
    
    if (editingTimeIndex !== null && editingTimeIndex < times.length) {
      // Update existing time
      times[editingTimeIndex] = timeString;
    } else {
      // Add new time
      times.push(timeString);
    }

    const updatedNotifications = {
      ...notifications,
      mealReminderTimes: times.sort()
    };

    setNotifications(updatedNotifications);
    
    // Save to backend without toggling the boolean
    setUpdatingNotification('mealReminders');
    try {
      await userApi.updateNotifications(updatedNotifications);
      
      // Schedule notifications if meal reminders are enabled
      if (notifications.mealReminders) {
        await scheduleMealReminderNotifications(times.sort());
      }
      
      HapticPatterns.success();
    } catch (error: any) {
      console.error('📱 Profile: Error updating meal reminder times', error);
      setNotifications(notifications); // Revert on error
      HapticPatterns.error();
    } finally {
      setUpdatingNotification(null);
    }
    
    setEditingTimeIndex(null);
    setEditingTime('');
    setSelectedHour(8);
    setSelectedMinute(0);
  };

  const handleRemoveMealReminderTime = async (index: number) => {
    const times = [...(notifications.mealReminderTimes || [])];
    const removedTime = times[index];
    times.splice(index, 1);
    
    const updatedNotifications = {
      ...notifications,
      mealReminderTimes: times
    };

    setNotifications(updatedNotifications);
    
    // Save to backend without toggling the boolean
    setUpdatingNotification('mealReminders');
    try {
      await userApi.updateNotifications(updatedNotifications);
      
      // Cancel the specific notification for the removed time
      if (removedTime) {
        try {
          await cancelScheduledNotification(`meal-reminder-${removedTime}`);
          console.log(`📱 Profile: Cancelled notification for ${removedTime}`);
        } catch (error) {
          console.error('📱 Profile: Error cancelling specific notification', error);
        }
      }
      
      // Reschedule remaining notifications if meal reminders are enabled
      if (notifications.mealReminders && times.length > 0) {
        await scheduleMealReminderNotifications(times);
      }
      
      HapticPatterns.success();
    } catch (error: any) {
      console.error('📱 Profile: Error removing meal reminder time', error);
      setNotifications(notifications); // Revert on error
      HapticPatterns.error();
    } finally {
      setUpdatingNotification(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirmText.toLowerCase() !== 'delete') {
      HapticPatterns.error();
      return;
    }

    // First, offer to export data
    Alert.alert(
      'Export Data Before Deletion?',
      'Would you like to export your data before deleting your account? This is your last chance to save your information.',
      [
        {
          text: 'Skip Export',
          style: 'cancel',
          onPress: () => proceedWithDeletion(false),
        },
        {
          text: 'Export Data',
          onPress: async () => {
            try {
              setShowDeleteAccountModal(false);
              await handleExportData();
              // Small delay to allow user to see export completed
              setTimeout(() => {
                proceedWithDeletion(true);
              }, 500);
            } catch (error) {
              console.error('Error exporting data before deletion:', error);
              // Continue with deletion even if export fails
              proceedWithDeletion(false);
            }
          },
        },
      ]
    );
  };

  const proceedWithDeletion = async (exported: boolean) => {
    setDeletingAccount(true);
    if (!exported) {
      setShowDeleteAccountModal(true);
    }
    
    try {
      // Delete the account
      await authApi.deleteAccount();
      
      HapticPatterns.success();
      
      // Logout and redirect to login
      await logout();
      router.replace('/login');
    } catch (error: any) {
      console.error('📱 Profile: Error deleting account', error);
      HapticPatterns.error();
      setShowDeleteAccountModal(true);
      Alert.alert(
        'Error',
        error.message || 'Failed to delete account. Please try again or contact support.'
      );
    } finally {
      setDeletingAccount(false);
      setShowDeleteAccountModal(false);
      setDeleteAccountConfirmText('');
    }
  };

  const handleLogout = async () => {
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
              // Always try to logout, even if there are errors
              await logout();
              // Navigate to login - router.replace will work even if logout had issues
              router.replace('/login');
            } catch (error: any) {
              // Even if logout fails, try to navigate to login
              // The auth state change should handle clearing tokens
              console.error('Error during logout:', error);
              try {
                router.replace('/login');
              } catch (navError) {
                // If navigation fails, at least we tried
                console.error('Error navigating to login:', navError);
              }
            }
          },
        },
      ]
    );
  };

  // Loading state or error state - show logout button even if profile fails to load
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Icon name={Icons.ACCOUNT_OUTLINE} size={64} color="#9CA3AF" accessibilityLabel="Loading profile" />
          <Text className="text-gray-500 dark:text-gray-200 mt-4">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state - show retry and logout options if profile failed to load
  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: Spacing['3xl'], flexGrow: 1 }}>
          <AnimatedEmptyState
            useMascot
            mascotExpression="supportive"
            mascotSize="large"
            title="Couldn't load your profile"
            description="We had trouble loading your profile data. Try again or sign out below."
            actionLabel="Try Again"
            onAction={loadProfile}
          />

          {/* Account Section with Logout */}
          <View className="px-4 mt-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Account</Text>
            <View className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <HapticTouchableOpacity
                onPress={handleLogout}
                className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700"
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: isDark ? `${Colors.secondaryLight}33` : Colors.secondaryLight }}
                  >
                    <Icon
                      name={Icons.LOGOUT}
                      size={IconSizes.SM}
                      color={isDark ? DarkColors.secondary : Colors.secondary}
                      accessibilityLabel="Sign out"
                    />
                  </View>
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100">Sign Out</Text>
                </View>
                <Icon
                  name={Icons.CHEVRON_RIGHT}
                  size={IconSizes.SM}
                  color="#9CA3AF"
                  accessibilityLabel="Navigate"
                />
              </HapticTouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-6 border-b border-gray-200 dark:border-gray-700">
        <View className="items-center">
          <HapticTouchableOpacity
            onPress={handleChangeProfilePicture}
            disabled={uploadingPicture}
            className="relative mb-3"
            activeOpacity={0.8}
          >
            <View className="w-20 h-20 rounded-full items-center justify-center overflow-hidden" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
              {profilePicture ? (
                <Image 
                  source={{ uri: profilePicture }}
                  style={{ width: 80, height: 80 }}
                  className="rounded-full"
                />
              ) : (
                <Text className="text-white text-2xl font-bold">
                  {profile.name.split(' ').map(n => n[0]).join('')}
                </Text>
              )}
            </View>
            {uploadingPicture ? (
              <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                <ActivityIndicator size="small" color="white" />
              </View>
            ) : (
              <View className="absolute bottom-0 right-0 w-6 h-6 rounded-full items-center justify-center border-2 border-white dark:border-gray-800" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
                <Icon name={Icons.EDIT_OUTLINE} size={12} color="white" accessibilityLabel="Edit profile picture" />
              </View>
            )}
          </HapticTouchableOpacity>
          <View className="flex-row items-center mb-1">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mr-2" accessibilityRole="header">{profile.name}</Text>
            <HapticTouchableOpacity
              onPress={handleEditName}
              className="p-1"
              activeOpacity={0.7}
            >
              <Icon 
                name={Icons.EDIT_OUTLINE} 
                size={IconSizes.SM} 
                color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
                accessibilityLabel="Edit name"
              />
            </HapticTouchableOpacity>
          </View>
          <Text className="text-gray-500 dark:text-gray-200">{profile.email}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
      >
        {/* Appearance Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <HapticTouchableOpacity
            onPress={() => toggleSection('appearance')}
            className="flex-row items-center justify-between mb-3"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center flex-1">
              <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}>
                <Text className="text-xl">🎨</Text>
              </View>
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</Text>
            </View>
            <Animated.View
              style={{
                transform: [{
                  rotate: sectionAnimations.appearance.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['180deg', '0deg'],
                  }),
                }],
              }}
            >
              <Icon 
                name={Icons.CHEVRON_DOWN} 
                size={IconSizes.MD} 
                color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
                accessibilityLabel={collapsedSections.appearance ? 'Expand' : 'Collapse'}
              />
            </Animated.View>
          </HapticTouchableOpacity>
          
          <Animated.View
            style={{
              maxHeight: sectionAnimations.appearance.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1000],
              }),
              opacity: sectionAnimations.appearance,
              overflow: 'hidden',
            }}
          >
            {/* Theme Toggle */}
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center mb-1">
                <Icon 
                  name={theme === 'dark' ? Icons.DARK_MODE : Icons.LIGHT_MODE} 
                  size={IconSizes.SM} 
                  color={isDark ? DarkColors.primary : Colors.primary} 
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
              trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
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
                    ? ''
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                }`}
                style={themeMode === 'light' ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary, borderColor: isDark ? DarkColors.primary : Colors.primary } : undefined}
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
                    ? ''
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                }`}
                style={themeMode === 'dark' ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary, borderColor: isDark ? DarkColors.primary : Colors.primary } : undefined}
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
                    ? ''
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                }`}
                style={themeMode === 'system' ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary, borderColor: isDark ? DarkColors.primary : Colors.primary } : undefined}
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
          </Animated.View>
        </View>

        {/* Profile Completion Indicator */}
        {profileCompletion.percentage < 100 && (
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1">
                <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight }}>
                  <Text className="text-xl">📊</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profile Completion</Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">{profileCompletion.percentage}% Complete</Text>
                </View>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
              <View 
                className="h-full rounded-full"
                style={{ 
                  width: `${profileCompletion.percentage}%`,
                  backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                }}
              />
            </View>

            {/* Completion Checklist */}
            <View className="space-y-2">
              <View className="flex-row items-center">
                <Icon 
                  name={profileCompletion.physicalProfile ? Icons.CHECKMARK_CIRCLE : Icons.CHECKMARK_CIRCLE_OUTLINE} 
                  size={IconSizes.SM} 
                  color={profileCompletion.physicalProfile 
                    ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                    : (isDark ? DarkColors.text.secondary : Colors.text.secondary)
                  } 
                  accessibilityLabel={profileCompletion.physicalProfile ? 'Completed' : 'Not completed'}
                />
                <Text 
                  className={`ml-2 text-sm ${profileCompletion.physicalProfile 
                    ? 'text-gray-900 dark:text-gray-100' 
                    : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Physical Profile
                </Text>
                {!profileCompletion.physicalProfile && (
                  <HapticTouchableOpacity
                    onPress={() => router.push('/physical-profile')}
                    className="ml-auto"
                  >
                    <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      Set up →
                    </Text>
                  </HapticTouchableOpacity>
                )}
              </View>

              <View className="flex-row items-center">
                <Icon 
                  name={profileCompletion.macroGoals ? Icons.CHECKMARK_CIRCLE : Icons.CHECKMARK_CIRCLE_OUTLINE} 
                  size={IconSizes.SM} 
                  color={profileCompletion.macroGoals 
                    ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                    : (isDark ? DarkColors.text.secondary : Colors.text.secondary)
                  } 
                  accessibilityLabel={profileCompletion.macroGoals ? 'Completed' : 'Not completed'}
                />
                <Text 
                  className={`ml-2 text-sm ${profileCompletion.macroGoals 
                    ? 'text-gray-900 dark:text-gray-100' 
                    : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Macro Goals
                </Text>
                {!profileCompletion.macroGoals && (
                  <HapticTouchableOpacity
                    onPress={handleEditGoals}
                    className="ml-auto"
                  >
                    <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      Set up →
                    </Text>
                  </HapticTouchableOpacity>
                )}
              </View>

              <View className="flex-row items-center">
                <Icon 
                  name={profileCompletion.preferences ? Icons.CHECKMARK_CIRCLE : Icons.CHECKMARK_CIRCLE_OUTLINE} 
                  size={IconSizes.SM} 
                  color={profileCompletion.preferences 
                    ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                    : (isDark ? DarkColors.text.secondary : Colors.text.secondary)
                  } 
                  accessibilityLabel={profileCompletion.preferences ? 'Completed' : 'Not completed'}
                />
                <Text 
                  className={`ml-2 text-sm ${profileCompletion.preferences 
                    ? 'text-gray-900 dark:text-gray-100' 
                    : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Culinary Preferences
                </Text>
                {!profileCompletion.preferences && (
                  <HapticTouchableOpacity
                    onPress={handleEditPreferences}
                    className="ml-auto"
                  >
                    <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      Set up →
                    </Text>
                  </HapticTouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Physical Profile Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight }}>
                <Icon name={Icons.PHYSICAL_PROFILE} size={IconSizes.MD} color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed} accessibilityLabel="Physical profile" />
              </View>
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
          
          {physicalProfile ? (
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-200">Gender</Text>
                <Text className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{physicalProfile.gender}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-200">Age</Text>
                <Text className="font-semibold text-gray-900 dark:text-gray-100">{physicalProfile.age} years</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-200">Height</Text>
                <Text className="font-semibold text-gray-900 dark:text-gray-100">
                  {(() => {
                    const totalInches = physicalProfile.heightCm / 2.54;
                    const feet = Math.floor(totalInches / 12);
                    const inches = Math.round(totalInches % 12);
                    return `${feet}'${inches}" (${physicalProfile.heightCm} cm)`;
                  })()}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-200">Weight</Text>
                <Text className="font-semibold text-gray-900 dark:text-gray-100">
                  {Math.round(physicalProfile.weightKg * 2.20462 * 10) / 10} lbs ({physicalProfile.weightKg} kg)
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-200">Activity Level</Text>
                <Text className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                  {physicalProfile.activityLevel.replace('_', ' ')}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-200">Fitness Goal</Text>
                <Text className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                  {physicalProfile.fitnessGoal.replace('_', ' ')}
                </Text>
              </View>
              {physicalProfile.targetWeightKg && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-200">Target Weight</Text>
                  <Text className="font-semibold text-gray-900 dark:text-gray-100">
                    {Math.round(physicalProfile.targetWeightKg * 2.20462 * 10) / 10} lbs ({physicalProfile.targetWeightKg} kg)
                  </Text>
                </View>
              )}
              {(physicalProfile.bmr || physicalProfile.tdee) && (
                <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  {physicalProfile.bmr && (
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-600 dark:text-gray-200">BMR</Text>
                      <Text className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(physicalProfile.bmr)} cal/day</Text>
                    </View>
                  )}
                  {physicalProfile.tdee && (
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 dark:text-gray-200">TDEE</Text>
                      <Text className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(physicalProfile.tdee)} cal/day</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <HapticTouchableOpacity 
              onPress={() => router.push('/edit-physical-profile')}
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: isDark ? `${Colors.primaryLight}1A` : Colors.primaryDark,
                borderColor: isDark ? DarkColors.primary : Colors.primaryDark,
              }}
            >
              <View className="flex-row items-center">
                <Icon name={Icons.PHYSICAL_PROFILE} size={IconSizes.MD} color={isDark ? DarkColors.primary : '#FFFFFF'} accessibilityLabel="Physical profile" />
                <Text className="font-medium ml-2" style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}>
                  Set up your physical profile
                </Text>
              </View>
              <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}>
                Get personalized macro calculations based on your body metrics
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>

        {/* Weight History Section */}
        {physicalProfile && (
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}>
                  <Icon name="scale-outline" size={IconSizes.MD} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Weight history" />
                </View>
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weight History</Text>
              </View>
              <HapticTouchableOpacity onPress={() => router.push('/weight-input')}>
                <Icon name={Icons.ADD} size={IconSizes.SM} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Log weight" />
              </HapticTouchableOpacity>
            </View>

            {weightHistoryLoading ? (
              <View className="p-4">
                <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
              </View>
            ) : weightHistory.length > 0 ? (
              <View>
                {weightHistory.slice(0, 5).map((log: any, index: number) => {
                  const date = new Date(log.date);
                  const weightLbs = Math.round(log.weightKg * 2.20462 * 10) / 10;

                  return (
                    <View
                      key={log.id}
                      className={`flex-row justify-between items-center py-3 ${index < Math.min(4, weightHistory.length - 1) ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
                    >
                      <View>
                        <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                        {log.notes && (
                          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {log.notes}
                          </Text>
                        )}
                      </View>
                      <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {weightLbs} lbs ({log.weightKg} kg)
                      </Text>
                    </View>
                  );
                })}

                {weightHistory.length > 5 && (
                  <HapticTouchableOpacity
                    onPress={() => {
                      // TODO: Navigate to full weight history screen
                      Alert.alert('Weight History', `You have ${weightHistory.length} weight logs in the last 30 days.`);
                    }}
                    className="mt-3"
                  >
                    <Text className="text-center text-sm font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      View all ({weightHistory.length} logs)
                    </Text>
                  </HapticTouchableOpacity>
                )}
              </View>
            ) : (
              <View className="py-3">
                <Text className="text-gray-500 dark:text-gray-400 text-sm text-center">
                  No weight logs yet. Tap + to log your first weight!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Macro Goals Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight }}>
                <Icon name={Icons.MACRO_GOALS} size={IconSizes.MD} color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} accessibilityLabel="Macro goals" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Macro Goals</Text>
            </View>
            <HapticTouchableOpacity onPress={handleEditGoals}>
              <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit" />
            </HapticTouchableOpacity>
          </View>
          
          {(profile?.macroGoals || macroGoals) ? (
            <View className="space-y-2">
              {(() => {
                const goals = profile?.macroGoals || macroGoals;
                return (
                  <>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 dark:text-gray-200">Calories</Text>
                      <Text className="font-semibold text-gray-900 dark:text-gray-100">{goals.calories} cal</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 dark:text-gray-200">Protein</Text>
                      <Text className="font-semibold text-gray-900 dark:text-gray-100">{goals.protein}g</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 dark:text-gray-200">Carbs</Text>
                      <Text className="font-semibold text-gray-900 dark:text-gray-100">{goals.carbs}g</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 dark:text-gray-200">Fat</Text>
                      <Text className="font-semibold text-gray-900 dark:text-gray-100">{goals.fat}g</Text>
                    </View>
                  </>
                );
              })()}
            </View>
          ) : (
            <HapticTouchableOpacity 
              onPress={handleEditGoals}
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: isDark ? `${Colors.tertiaryGreenLight}1A` : Colors.tertiaryGreenDark,
                borderColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreenDark,
              }}
            >
              <View className="flex-row items-center">
                <Icon name={Icons.MACRO_GOALS} size={IconSizes.MD} color={isDark ? DarkColors.tertiaryGreen : '#FFFFFF'} accessibilityLabel="Macro goals" />
                <Text className="font-medium ml-2" style={{ color: isDark ? DarkColors.tertiaryGreen : '#FFFFFF' }}>
                  Set up your macro goals
                </Text>
              </View>
              <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.tertiaryGreen : '#FFFFFF' }}>
                Get personalized recipe recommendations based on your nutrition goals
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>

        {/* Culinary Preferences Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
            <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}>
              <Text className="text-xl">🍽️</Text>
            </View>
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Culinary Preferences</Text>
            </View>
            <HapticTouchableOpacity onPress={handleEditPreferences}>
              <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit" />
            </HapticTouchableOpacity>
          </View>
          
          {(() => {
            const prefs = profile?.preferences || preferences;
            if (!prefs) {
              return (
                <HapticTouchableOpacity 
                  onPress={handleEditPreferences}
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: isDark ? `${Colors.primaryLight}1A` : Colors.primaryDark,
                    borderColor: isDark ? DarkColors.primary : Colors.primaryDark,
                  }}
                >
                  <View className="flex-row items-center">
                    <Text className="text-xl mr-2">🍽️</Text>
                    <Text className="font-medium ml-2" style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}>
                      Set up your culinary preferences
                    </Text>
                  </View>
                  <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}>
                    Get personalized recipe recommendations based on your tastes
                  </Text>
                </HapticTouchableOpacity>
              );
            }
            
            // Add roulette button when preferences don't exist
            if (!prefs) {
              return (
                <View>
                  <HapticTouchableOpacity 
                    onPress={handleEditPreferences}
                    className="p-3 rounded-lg border mb-3"
                    style={{
                      backgroundColor: isDark ? `${Colors.primaryLight}1A` : Colors.primaryDark,
                      borderColor: isDark ? DarkColors.primary : Colors.primaryDark,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Text className="text-xl mr-2">🍽️</Text>
                      <Text className="font-medium ml-2" style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}>
                        Set up your culinary preferences
                      </Text>
                    </View>
                    <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}>
                      Get personalized recipe recommendations based on your tastes
                    </Text>
                  </HapticTouchableOpacity>
                  
                  <HapticTouchableOpacity
                    onPress={async () => {
                      HapticPatterns.buttonPressPrimary();
                      await fetchRouletteRecipes();
                      setShowRoulette(true);
                    }}
                    className="mt-3 py-3 px-4 rounded-lg flex-row items-center justify-center"
                    style={{
                      backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name={Icons.RANDOM_RECIPE} size={IconSizes.MD} color="#FFFFFF" accessibilityLabel="Recipe roulette" />
                    <Text className="font-semibold ml-2 text-white">
                      Try Recipe Roulette
                    </Text>
                  </HapticTouchableOpacity>
                </View>
              );
            }
            
            return (
              <View className="space-y-3">
                <View>
                  <Text className="text-sm mb-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Banned Ingredients</Text>
                  <View className="flex-row flex-wrap">
                    {prefs.bannedIngredients && prefs.bannedIngredients.length > 0 ? (
                      prefs.bannedIngredients.map((ingredient: any, index: number) => {
                        const ingredientText = typeof ingredient === 'string' ? ingredient : ingredient.name;
                        const capitalized = ingredientText.replace(/\b\w/g, (char: string) => char.toUpperCase());
                        return (
                          <View key={index} className="px-2 py-1 rounded-full mr-2 mb-2" style={{ backgroundColor: isDark ? Colors.secondaryRedLight : Colors.secondaryRedLight }}>
                            <Text className="text-xs" style={{ color: '#FFFFFF' }}>
                              {capitalized}
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>None set</Text>
                    )}
                  </View>
                </View>
                
                <View>
                  <Text className="text-sm mb-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Liked Cuisines</Text>
                  <View className="flex-row flex-wrap">
                    {prefs.likedCuisines && prefs.likedCuisines.length > 0 ? (
                      prefs.likedCuisines.map((cuisine: any, index: number) => {
                        const cuisineText = typeof cuisine === 'string' ? cuisine : cuisine.name;
                        const capitalized = cuisineText.replace(/\b\w/g, (char: string) => char.toUpperCase());
                        return (
                          <View key={index} className="px-2 py-1 rounded-full mr-2 mb-2" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight }}>
                            <Text className="text-xs" style={{ color: '#FFFFFF' }}>
                              {capitalized}
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>None set</Text>
                    )}
                  </View>
                </View>
                
                <View>
                  <Text className="text-sm mb-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Preferred Superfoods</Text>
                  <View className="flex-row flex-wrap">
                    {prefs.preferredSuperfoods && prefs.preferredSuperfoods.length > 0 ? (
                      prefs.preferredSuperfoods.map((superfood: any, index: number) => {
                        const category = typeof superfood === 'string' ? superfood : superfood.category;
                        const capitalized = category.replace(/\b\w/g, (char: string) => char.toUpperCase());
                        return (
                          <View key={index} className="px-2 py-1 rounded-full mr-2 mb-2" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}>
                            <Text className="text-xs" style={{ color: '#FFFFFF' }}>
                              {capitalized}
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>None set</Text>
                    )}
                  </View>
                </View>
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600 dark:text-gray-200">Max Cook Time</Text>
                  <Text className="font-semibold text-gray-900 dark:text-gray-100">
                    {prefs.cookTimePreference ? `${prefs.cookTimePreference} min` : 'Not set'}
                  </Text>
                </View>
                
                {/* Recipe Roulette Button */}
                <HapticTouchableOpacity
                  onPress={async () => {
                    HapticPatterns.buttonPressPrimary();
                    await fetchRouletteRecipes();
                    setShowRoulette(true);
                  }}
                  className="mt-3 py-3 px-4 rounded-lg flex-row items-center justify-center"
                  style={{
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  }}
                  activeOpacity={0.7}
                >
                  <Icon name={Icons.RANDOM_RECIPE} size={IconSizes.MD} color="#FFFFFF" accessibilityLabel="Recipe roulette" />
                  <Text className="font-semibold ml-2 text-white">
                    Try Recipe Roulette
                  </Text>
                </HapticTouchableOpacity>
              </View>
            );
          })()}
        </View>

        {/* Budget Settings Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight }}>
                <Icon name={Icons.CART} size={IconSizes.MD} color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed} accessibilityLabel="Budget settings" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Budget Settings</Text>
            </View>
            <HapticTouchableOpacity onPress={handleEditBudget}>
              <Icon name={Icons.EDIT_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Edit" />
            </HapticTouchableOpacity>
          </View>
          
          {budgetSettings ? (
            <View className="space-y-2">
              {budgetSettings.maxRecipeCost !== undefined && budgetSettings.maxRecipeCost !== null && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-200">Max Recipe Cost</Text>
                  <Text className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(budgetSettings.maxRecipeCost, budgetSettings.currency)}
                  </Text>
                </View>
              )}
              {budgetSettings.maxMealCost !== undefined && budgetSettings.maxMealCost !== null && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-200">Max Meal Cost</Text>
                  <Text className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(budgetSettings.maxMealCost, budgetSettings.currency)}
                  </Text>
                </View>
              )}
              {budgetSettings.maxDailyFoodBudget !== undefined && budgetSettings.maxDailyFoodBudget !== null && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-200">Daily Food Budget</Text>
                  <Text className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(budgetSettings.maxDailyFoodBudget, budgetSettings.currency)}
                  </Text>
                </View>
              )}
              {(!budgetSettings.maxRecipeCost && !budgetSettings.maxMealCost && !budgetSettings.maxDailyFoodBudget) && (
                <Text className="text-sm text-gray-500 dark:text-gray-400">No budget limits set</Text>
              )}
            </View>
          ) : (
            <HapticTouchableOpacity 
              onPress={handleEditBudget}
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: isDark ? `${Colors.secondaryRedLight}1A` : Colors.secondaryRedDark,
                borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark,
              }}
            >
              <View className="flex-row items-center">
                <Icon name={Icons.CART} size={IconSizes.MD} color={isDark ? DarkColors.secondaryRed : '#FFFFFF'} accessibilityLabel="Budget settings" />
                <Text className="font-medium ml-2" style={{ color: isDark ? DarkColors.secondaryRed : '#FFFFFF' }}>
                  Set up your budget settings
                </Text>
              </View>
              <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.secondaryRed : '#FFFFFF' }}>
                Get recipe recommendations that fit your budget
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>

        {/* Notifications Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center mb-3">
            <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight }}>
              <Icon name={Icons.NOTIFICATIONS_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} accessibilityLabel="Notifications" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</Text>
          </View>
          
          <View className="space-y-4">
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-gray-900 dark:text-gray-100 font-medium">Meal Reminders</Text>
                  <Text className="text-gray-500 dark:text-gray-200 text-sm">Daily recipe suggestions</Text>
                </View>
                <View className="flex-row items-center">
                  {updatingNotification === 'mealReminders' && (
                    <ActivityIndicator 
                      size="small" 
                      color={isDark ? DarkColors.primary : Colors.primary}
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Switch
                    value={notifications.mealReminders}
                    onValueChange={() => toggleNotification('mealReminders')}
                    disabled={updatingNotification !== null}
                    trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                    thumbColor={notifications.mealReminders ? '#FFFFFF' : '#F3F4F6'}
                  />
                </View>
              </View>
              {notifications.mealReminders && (
                <View className="mt-2 ml-1">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm text-gray-600 dark:text-gray-400">Scheduled Times</Text>
                    <HapticTouchableOpacity
                      onPress={() => {
                        setShowMealReminderSchedule(true);
                        // If no times exist, automatically show the time picker
                        if (!notifications.mealReminderTimes || notifications.mealReminderTimes.length === 0) {
                          setEditingTimeIndex(0);
                          setSelectedHour(8);
                          setSelectedMinute(0);
                          setManualTimeInput('8:00 AM');
                        }
                      }}
                      className="px-3 py-1 rounded-lg"
                      style={{ backgroundColor: isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A` }}
                    >
                      <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                        {notifications.mealReminderTimes && notifications.mealReminderTimes.length > 0 ? 'Edit' : 'Set Times'}
                      </Text>
                    </HapticTouchableOpacity>
                  </View>
                  {notifications.mealReminderTimes && notifications.mealReminderTimes.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2">
                      {notifications.mealReminderTimes.map((time, index) => (
                        <View
                          key={index}
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: isDark ? DarkColors.surface : Colors.surface, borderWidth: 1, borderColor: isDark ? DarkColors.border.medium : Colors.border.medium }}
                        >
                          <Text className="text-sm" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                            {formatTime(time)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-xs text-gray-500 dark:text-gray-400 italic">No times set</Text>
                  )}
                </View>
              )}
            </View>
            
            <View className="flex-row justify-between items-center">
              <View className="flex-1 mr-3">
                <Text className="text-gray-900 dark:text-gray-100 font-medium">New Recipes</Text>
                <Text className="text-gray-500 dark:text-gray-200 text-sm">When new recipes match your goals</Text>
              </View>
              <View className="flex-row items-center">
                {updatingNotification === 'newRecipes' && (
                  <ActivityIndicator 
                    size="small" 
                    color={isDark ? DarkColors.primary : Colors.primary}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Switch
                  value={notifications.newRecipes}
                  onValueChange={() => toggleNotification('newRecipes')}
                  disabled={updatingNotification !== null}
                  trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                  thumbColor={notifications.newRecipes ? '#FFFFFF' : '#F3F4F6'}
                />
              </View>
            </View>
            
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-gray-900 dark:text-gray-100 font-medium">Goal Updates</Text>
                  <Text className="text-gray-500 dark:text-gray-200 text-sm">Weekly progress reports</Text>
                </View>
                <View className="flex-row items-center">
                  {updatingNotification === 'goalUpdates' && (
                    <ActivityIndicator 
                      size="small" 
                      color={isDark ? DarkColors.primary : Colors.primary}
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Switch
                    value={notifications.goalUpdates}
                    onValueChange={() => toggleNotification('goalUpdates')}
                    disabled={updatingNotification !== null}
                    trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                    thumbColor={notifications.goalUpdates ? '#FFFFFF' : '#F3F4F6'}
                  />
                </View>
              </View>
              {notifications.goalUpdates && (
                <View className="mt-2 ml-1">
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {notifications.goalUpdateDay || 'Monday'} at {notifications.goalUpdateTime ? formatTime(notifications.goalUpdateTime) : '9:00 AM'}
                  </Text>
                </View>
              )}
            </View>

          </View>
        </View>

        {/* Data & Privacy Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center mb-3">
            <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}>
              <Text className="text-xl">🔒</Text>
            </View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data & Privacy</Text>
          </View>
          
          {/* Data Usage Statistics */}
          <View className="mb-4 p-3 rounded-lg" style={{ backgroundColor: isDark ? DarkColors.surface : Colors.surface }}>
            <Text className="text-sm font-semibold mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              Data Usage
            </Text>
            {dataStats.loading ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
                <Text className="text-xs mt-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                  Loading statistics...
                </Text>
              </View>
            ) : (
              <View className="space-y-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                    Saved Recipes
                  </Text>
                  <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                    {dataStats.savedRecipes}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                    Meal Plans
                  </Text>
                  <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                    {dataStats.mealPlans}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                    Shopping Lists
                  </Text>
                  <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                    {dataStats.shoppingLists}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                    Meal History
                  </Text>
                  <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                    {dataStats.mealHistory}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                    Collections
                  </Text>
                  <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                    {dataStats.collections}
                  </Text>
                </View>
                <View className="mt-2 pt-2 border-t" style={{ borderTopColor: isDark ? DarkColors.border.light : Colors.border.light }}>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                      Total Items
                    </Text>
                    <Text className="text-xs font-bold" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      {dataStats.savedRecipes + dataStats.mealPlans + dataStats.shoppingLists + dataStats.mealHistory + dataStats.collections}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
          
          {/* Privacy Settings */}
          <View className="mb-4">
            <Text className="text-sm font-semibold mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
              Privacy Settings
            </Text>
            <View className="space-y-3">
              {/* Analytics */}
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                <View className="flex-1 mr-4">
                  <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                    Analytics & Tracking
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                    Help us improve the app by sharing usage analytics
                  </Text>
                </View>
                {updatingPrivacySetting === 'analyticsEnabled' ? (
                  <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
                ) : (
                  <Switch
                    value={privacySettings.analyticsEnabled}
                    onValueChange={(value) => updatePrivacySetting('analyticsEnabled', value)}
                    trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                )}
              </View>

              {/* Data Sharing */}
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                <View className="flex-1 mr-4">
                  <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                    Data Sharing for Recommendations
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                    Allow your data to be used for personalized recommendations
                  </Text>
                </View>
                {updatingPrivacySetting === 'dataSharingEnabled' ? (
                  <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
                ) : (
                  <Switch
                    value={privacySettings.dataSharingEnabled}
                    onValueChange={(value) => updatePrivacySetting('dataSharingEnabled', value)}
                    trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                )}
              </View>

              {/* Location Services */}
              <View className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                <View className="flex-1 mr-4">
                  <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                    Location Services
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                    Use your location for store recommendations and pricing
                  </Text>
                </View>
                {updatingPrivacySetting === 'locationServicesEnabled' ? (
                  <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
                ) : (
                  <Switch
                    value={privacySettings.locationServicesEnabled}
                    onValueChange={(value) => updatePrivacySetting('locationServicesEnabled', value)}
                    trackColor={{ false: '#D1D5DB', true: isDark ? DarkColors.primary : Colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                )}
              </View>

            </View>
          </View>

          <View className="space-y-3">
            <HapticTouchableOpacity 
              className="flex-row items-center justify-between py-3"
              onPress={handleExportData}
              disabled={exportingData}
            >
              <View className="flex-row items-center">
                {exportingData ? (
                  <ActivityIndicator size="small" color={isDark ? DarkColors.text.secondary : Colors.text.secondary} style={{ marginRight: 12 }} />
                ) : (
                  <Icon name={Icons.EXPORT_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} accessibilityLabel="Export data" />
                )}
                <Text className="ml-3" style={{ color: exportingData ? (isDark ? DarkColors.text.tertiary : Colors.text.tertiary) : (isDark ? DarkColors.text.primary : Colors.text.primary) }}>
                  {exportingData ? 'Exporting...' : 'Export My Data'}
                </Text>
              </View>
              {!exportingData && (
                <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} accessibilityLabel="Navigate" />
              )}
            </HapticTouchableOpacity>
            
            <HapticTouchableOpacity 
              className="flex-row items-center justify-between py-3"
              onPress={handleClearHistory}
            >
              <View className="flex-row items-center">
                <Icon name={Icons.DELETE_OUTLINE} size={IconSizes.MD} color={Colors.secondaryRed} accessibilityLabel="Clear history" />
                <Text className="ml-3" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>Clear History</Text>
              </View>
              <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Navigate" />
            </HapticTouchableOpacity>
          </View>
        </View>

        {/* Account Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center mb-3">
            <View className="rounded-full p-2 mr-3" style={{ backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight }}>
              <Icon name={Icons.ACCOUNT_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed} accessibilityLabel="Account" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account</Text>
          </View>
          

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
            className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700"
            onPress={handleLogout}
          >
            <View className="flex-row items-center">
              <Icon name={Icons.LOG_OUT_OUTLINE} size={IconSizes.MD} color={Colors.secondaryRed} accessibilityLabel="Sign out" />
              <Text className="ml-3 font-medium" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>Sign Out</Text>
            </View>
            <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Navigate" />
          </HapticTouchableOpacity>

          <HapticTouchableOpacity 
            className="flex-row items-center justify-between py-3"
            onPress={() => setShowDeleteAccountModal(true)}
          >
            <View className="flex-row items-center">
              <Icon name={Icons.DELETE_OUTLINE} size={IconSizes.MD} color={Colors.secondaryRed} accessibilityLabel="Delete account" />
              <Text className="ml-3 font-medium" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>Delete Account</Text>
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
                  className={`flex-1 py-3 px-4 rounded-lg ${changingPassword ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                >
                  <Text className="text-white font-medium text-center">
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </Text>
                </HapticTouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Name Modal */}
        <Modal
          visible={showEditNameModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEditNameModal(false)}
        >
          <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Edit Name
              </Text>
              
              <View className="mb-6">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Name</Text>
                <TextInput
                  value={editingName}
                  onChangeText={setEditingName}
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  autoComplete="name"
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </View>
              
              <View className="flex-row space-x-3">
                <HapticTouchableOpacity 
                  onPress={() => {
                    setShowEditNameModal(false);
                    setEditingName('');
                  }}
                  disabled={updatingName}
                  className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
                </HapticTouchableOpacity>
                
                <HapticTouchableOpacity 
                  onPress={handleSaveName}
                  disabled={updatingName || !editingName.trim()}
                  className={`flex-1 py-3 px-4 rounded-lg ${updatingName || !editingName.trim() ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                >
                  {updatingName ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-medium text-center">Save</Text>
                  )}
                </HapticTouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Meal Reminder Schedule Modal */}
        <Modal
          visible={showMealReminderSchedule}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowMealReminderSchedule(false);
            setEditingTimeIndex(null);
            setEditingTime('');
            setSelectedHour(8);
            setSelectedMinute(0);
            setManualTimeInput('8:00 AM');
          }}
        >
          <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm max-h-[80%]">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Meal Reminder Times
              </Text>
              
              <ScrollView className="max-h-64 mb-4">
                {notifications.mealReminderTimes && notifications.mealReminderTimes.length > 0 ? (
                  <View className="space-y-2">
                    {notifications.mealReminderTimes.map((time, index) => (
                      <View key={index} className="flex-row items-center justify-between p-3 rounded-lg border" style={{ borderColor: isDark ? DarkColors.border.medium : Colors.border.medium }}>
                        <Text className="text-gray-900 dark:text-gray-100 font-medium">
                          {formatTime(time)}
                        </Text>
                        <View className="flex-row items-center space-x-2">
                          <HapticTouchableOpacity
                            onPress={() => {
                              setEditingTimeIndex(index);
                              // Parse existing time
                              const [hours, minutes] = time.split(':');
                              setSelectedHour(parseInt(hours, 10));
                              setSelectedMinute(parseInt(minutes, 10));
                              setEditingTime(time);
                              const hour12 = parseInt(hours, 10) % 12 || 12;
                              const ampm = parseInt(hours, 10) >= 12 ? 'PM' : 'AM';
                              setManualTimeInput(`${hour12}:${minutes} ${ampm}`);
                            }}
                            className="px-3 py-1 rounded"
                            style={{ backgroundColor: isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A` }}
                          >
                            <Text className="text-sm" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>Edit</Text>
                          </HapticTouchableOpacity>
                          <HapticTouchableOpacity
                            onPress={() => handleRemoveMealReminderTime(index)}
                            className="px-3 py-1 rounded"
                            style={{ backgroundColor: isDark ? `${DarkColors.secondaryRed}33` : `${Colors.secondaryRed}1A` }}
                          >
                            <Text className="text-sm" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>Remove</Text>
                          </HapticTouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="text-gray-500 dark:text-gray-400 text-center py-4">No times set</Text>
                )}
              </ScrollView>

              {(editingTimeIndex !== null || !notifications.mealReminderTimes || notifications.mealReminderTimes.length === 0) && (
                <View className="mb-4 border-t pt-4" style={{ borderTopColor: isDark ? DarkColors.border.medium : Colors.border.medium }}>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-3">
                    {editingTimeIndex !== null ? 'Edit Time' : 'Add Time'}
                  </Text>
                  
                  {/* Time Display with Manual Input */}
                  <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <Text className="text-sm font-medium mb-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Selected Time</Text>
                    <View className="items-center">
                      <TextInput
                        value={manualTimeInput}
                        onChangeText={handleManualTimeInput}
                        placeholder="8:00 AM"
                        placeholderTextColor="#9CA3AF"
                        className="text-2xl font-bold text-center bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-300 dark:border-gray-600 w-full"
                        style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}
                        keyboardType="default"
                      />
                      <Text className="text-xs mt-1" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>
                        Format: 8:00 AM or 08:00
                      </Text>
                    </View>
                  </View>

                  {/* Time Picker Wheels */}
                  <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <View className="flex-row justify-center items-center">
                      {/* Hour Picker */}
                      <View className="items-center mr-6">
                        <Text className="text-sm font-medium mb-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Hour</Text>
                        <WheelPicker
                          data={Array.from({ length: 24 }, (_, i) => i)}
                          selectedValue={selectedHour}
                          onValueChange={setSelectedHour}
                          width={90}
                          isDark={isDark}
                        />
                      </View>
                      
                      {/* Separator */}
                      <View className="items-center justify-center">
                        <Text className="text-3xl font-bold" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>:</Text>
                      </View>
                      
                      {/* Minute Picker */}
                      <View className="items-center ml-6">
                        <Text className="text-sm font-medium mb-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Min</Text>
                        <WheelPicker
                          data={Array.from({ length: 60 }, (_, i) => i)}
                          selectedValue={selectedMinute}
                          onValueChange={setSelectedMinute}
                          width={90}
                          isDark={isDark}
                        />
                      </View>
                    </View>
                  </View>

                  <HapticTouchableOpacity
                    onPress={handleSaveMealReminderTime}
                    className="mt-2 py-2 px-4 rounded-lg"
                    style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                  >
                    <Text className="text-white font-medium text-center">Save</Text>
                  </HapticTouchableOpacity>
                </View>
              )}

              {editingTimeIndex === null && notifications.mealReminderTimes && notifications.mealReminderTimes.length > 0 && (
                <HapticTouchableOpacity
                  onPress={handleAddMealReminderTime}
                  className="py-2 px-4 rounded-lg border"
                  style={{ borderColor: isDark ? DarkColors.border.medium : Colors.border.medium }}
                >
                  <Text className="text-center font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>Add Time</Text>
                </HapticTouchableOpacity>
              )}
              
              <View className="mt-4">
                <HapticTouchableOpacity 
                  onPress={() => {
                    setShowMealReminderSchedule(false);
                    setEditingTimeIndex(null);
                    setEditingTime('');
                    setSelectedHour(8);
                    setSelectedMinute(0);
                    setManualTimeInput('8:00 AM');
                  }}
                  className="py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Done</Text>
                </HapticTouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Clear History Modal */}
        <Modal
          visible={showClearHistoryModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            if (!clearingHistory) {
              setShowClearHistoryModal(false);
            }
          }}
        >
          <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Clear History
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Select what you want to clear. This action cannot be undone.
              </Text>
              
              <View className="space-y-3 mb-6">
                <HapticTouchableOpacity
                  onPress={() => setClearOptions({ ...clearOptions, mealHistory: !clearOptions.mealHistory })}
                  disabled={clearingHistory}
                  className="flex-row items-center p-3 rounded-lg border"
                  style={{ 
                    borderColor: clearOptions.mealHistory 
                      ? (isDark ? DarkColors.primary : Colors.primary)
                      : (isDark ? DarkColors.border.medium : Colors.border.medium),
                    backgroundColor: clearOptions.mealHistory
                      ? (isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A`)
                      : 'transparent'
                  }}
                >
                  <View className="w-5 h-5 rounded border-2 items-center justify-center mr-3"
                    style={{ 
                      borderColor: clearOptions.mealHistory 
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : (isDark ? DarkColors.border.medium : Colors.border.medium),
                      backgroundColor: clearOptions.mealHistory
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : 'transparent'
                    }}
                  >
                    {clearOptions.mealHistory && (
                      <Icon name={Icons.CHECKMARK} size={12} color="white" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-gray-100 font-medium">Meal History</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">All recorded meals and recipes</Text>
                  </View>
                </HapticTouchableOpacity>

                <HapticTouchableOpacity
                  onPress={() => setClearOptions({ ...clearOptions, shoppingLists: !clearOptions.shoppingLists })}
                  disabled={clearingHistory}
                  className="flex-row items-center p-3 rounded-lg border"
                  style={{ 
                    borderColor: clearOptions.shoppingLists 
                      ? (isDark ? DarkColors.primary : Colors.primary)
                      : (isDark ? DarkColors.border.medium : Colors.border.medium),
                    backgroundColor: clearOptions.shoppingLists
                      ? (isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A`)
                      : 'transparent'
                  }}
                >
                  <View className="w-5 h-5 rounded border-2 items-center justify-center mr-3"
                    style={{ 
                      borderColor: clearOptions.shoppingLists 
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : (isDark ? DarkColors.border.medium : Colors.border.medium),
                      backgroundColor: clearOptions.shoppingLists
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : 'transparent'
                    }}
                  >
                    {clearOptions.shoppingLists && (
                      <Icon name={Icons.CHECKMARK} size={12} color="white" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-gray-100 font-medium">Shopping Lists</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">All shopping lists and items</Text>
                  </View>
                </HapticTouchableOpacity>
              </View>
              
              <View className="flex-row space-x-3">
                <HapticTouchableOpacity 
                  onPress={() => {
                    if (!clearingHistory) {
                      setShowClearHistoryModal(false);
                      setClearOptions({ mealHistory: false, shoppingLists: false });
                    }
                  }}
                  disabled={clearingHistory}
                  className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
                </HapticTouchableOpacity>
                
                <HapticTouchableOpacity 
                  onPress={handleConfirmClearHistory}
                  disabled={clearingHistory || (!clearOptions.mealHistory && !clearOptions.shoppingLists)}
                  className={`flex-1 py-3 px-4 rounded-lg ${clearingHistory || (!clearOptions.mealHistory && !clearOptions.shoppingLists) ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
                >
                  {clearingHistory ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-medium text-center">Clear</Text>
                  )}
                </HapticTouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Export Format Selection Modal */}
        <Modal
          visible={showExportFormatModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            if (!exportingData) {
              setShowExportFormatModal(false);
            }
          }}
        >
          <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Select Export Format
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Choose the format for your data export
              </Text>
              
              <View className="space-y-3 mb-6">
                <HapticTouchableOpacity
                  onPress={() => setSelectedExportFormat('json')}
                  className="flex-row items-center p-4 rounded-lg border"
                  style={{ 
                    borderColor: selectedExportFormat === 'json'
                      ? (isDark ? DarkColors.primary : Colors.primary)
                      : (isDark ? DarkColors.border.medium : Colors.border.medium),
                    backgroundColor: selectedExportFormat === 'json'
                      ? (isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A`)
                      : 'transparent'
                  }}
                >
                  <View className="w-5 h-5 rounded-full border-2 items-center justify-center mr-3"
                    style={{ 
                      borderColor: selectedExportFormat === 'json'
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : (isDark ? DarkColors.border.medium : Colors.border.medium),
                      backgroundColor: selectedExportFormat === 'json'
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : 'transparent'
                    }}
                  >
                    {selectedExportFormat === 'json' && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-gray-100 font-medium">JSON</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Complete data in structured format
                    </Text>
                  </View>
                </HapticTouchableOpacity>

                <HapticTouchableOpacity
                  onPress={() => setSelectedExportFormat('csv')}
                  className="flex-row items-center p-4 rounded-lg border"
                  style={{ 
                    borderColor: selectedExportFormat === 'csv'
                      ? (isDark ? DarkColors.primary : Colors.primary)
                      : (isDark ? DarkColors.border.medium : Colors.border.medium),
                    backgroundColor: selectedExportFormat === 'csv'
                      ? (isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A`)
                      : 'transparent'
                  }}
                >
                  <View className="w-5 h-5 rounded-full border-2 items-center justify-center mr-3"
                    style={{ 
                      borderColor: selectedExportFormat === 'csv'
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : (isDark ? DarkColors.border.medium : Colors.border.medium),
                      backgroundColor: selectedExportFormat === 'csv'
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : 'transparent'
                    }}
                  >
                    {selectedExportFormat === 'csv' && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-gray-100 font-medium">CSV</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Spreadsheet-friendly format
                    </Text>
                  </View>
                </HapticTouchableOpacity>

                <HapticTouchableOpacity
                  onPress={() => setSelectedExportFormat('pdf')}
                  className="flex-row items-center p-4 rounded-lg border"
                  style={{ 
                    borderColor: selectedExportFormat === 'pdf'
                      ? (isDark ? DarkColors.primary : Colors.primary)
                      : (isDark ? DarkColors.border.medium : Colors.border.medium),
                    backgroundColor: selectedExportFormat === 'pdf'
                      ? (isDark ? `${DarkColors.primary}33` : `${Colors.primary}1A`)
                      : 'transparent'
                  }}
                >
                  <View className="w-5 h-5 rounded-full border-2 items-center justify-center mr-3"
                    style={{ 
                      borderColor: selectedExportFormat === 'pdf'
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : (isDark ? DarkColors.border.medium : Colors.border.medium),
                      backgroundColor: selectedExportFormat === 'pdf'
                        ? (isDark ? DarkColors.primary : Colors.primary)
                        : 'transparent'
                    }}
                  >
                    {selectedExportFormat === 'pdf' && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-gray-100 font-medium">PDF / Text</Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Human-readable document format
                    </Text>
                  </View>
                </HapticTouchableOpacity>
              </View>

              <View className="flex-row space-x-3">
                <HapticTouchableOpacity 
                  onPress={() => setShowExportFormatModal(false)}
                  disabled={exportingData}
                  className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
                </HapticTouchableOpacity>
                
                <HapticTouchableOpacity 
                  onPress={() => handleExportData(selectedExportFormat)}
                  disabled={exportingData}
                  className={`flex-1 py-3 px-4 rounded-lg ${exportingData ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                >
                  {exportingData ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-medium text-center">Export</Text>
                  )}
                </HapticTouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete Account Modal */}
        <Modal
          visible={showDeleteAccountModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            if (!deletingAccount) {
              setShowDeleteAccountModal(false);
              setDeleteAccountConfirmText('');
            }
          }}
        >
          <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Delete Account
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This action cannot be undone. All your data, including recipes, meal plans, shopping lists, and preferences will be permanently deleted.
              </Text>
              
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2 mt-4">
                Type "DELETE" to confirm:
              </Text>
              <TextInput
                value={deleteAccountConfirmText}
                onChangeText={setDeleteAccountConfirmText}
                placeholder="DELETE"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                autoComplete="off"
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 mb-4"
                editable={!deletingAccount}
              />
              
              <View className="flex-row space-x-3">
                <HapticTouchableOpacity 
                  onPress={() => {
                    if (!deletingAccount) {
                      setShowDeleteAccountModal(false);
                      setDeleteAccountConfirmText('');
                    }
                  }}
                  disabled={deletingAccount}
                  className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
                </HapticTouchableOpacity>
                
                <HapticTouchableOpacity 
                  onPress={handleDeleteAccount}
                  disabled={deletingAccount || deleteAccountConfirmText.toLowerCase() !== 'delete'}
                  className={`flex-1 py-3 px-4 rounded-lg ${deletingAccount || deleteAccountConfirmText.toLowerCase() !== 'delete' ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
                >
                  {deletingAccount ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-medium text-center">Delete Account</Text>
                  )}
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
      {/* Recipe Roulette Modal */}
      {showRoulette && (
        <Modal
          visible={showRoulette}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowRoulette(false)}
        >
          {rouletteLoading ? (
            <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color={isDark ? DarkColors.primary : Colors.primary} />
                <Text className="mt-4 text-gray-600 dark:text-gray-300">Loading recipes...</Text>
              </View>
            </SafeAreaView>
          ) : rouletteRecipes.length > 0 ? (
            <RecipeRoulette
              recipes={rouletteRecipes}
              onLike={handleRouletteLike}
              onPass={handleRoulettePass}
              onClose={() => setShowRoulette(false)}
              initialIndex={0}
            />
          ) : (
            <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
              <View className="flex-1 justify-center items-center px-6">
                <Icon name={Icons.ALERT_CIRCLE} size={IconSizes.XL} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} accessibilityLabel="No recipes" />
                <Text className="text-xl font-semibold mt-4 text-center" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                  No Recipes Available
                </Text>
                <Text className="text-base mt-2 text-center" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                  We couldn't load any recipes right now. Please try again later.
                </Text>
                <HapticTouchableOpacity
                  onPress={() => setShowRoulette(false)}
                  className="mt-6 px-6 py-3 rounded-xl"
                  style={{ backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
                >
                  <Text className="text-white font-semibold">Close</Text>
                </HapticTouchableOpacity>
              </View>
            </SafeAreaView>
          )}
        </Modal>
      )}
    </SafeAreaView>
  );
}