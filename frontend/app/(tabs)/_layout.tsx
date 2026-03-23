import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Modal, Animated, Dimensions, TextInput, ScrollView, Keyboard } from 'react-native';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import SearchBar from '../../components/ui/SearchBar';
import { router, usePathname, useSegments } from 'expo-router';
import ActionSheet, { ActionSheetItem } from '../../components/ui/ActionSheet';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { scannerApi, shoppingListApi, mealPlanApi } from '../../lib/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, DarkColors, DarkElevation } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Spacing, ComponentSpacing, Gap } from '../../constants/Spacing';

import { useSearchHistory } from '../../hooks/useSearchHistory';
import { QuickMealLogModal } from '../../components/meal-plan';
import { AnimatedTabIcon } from '../../components/ui/AnimatedTabBar';

export default function TabLayout() {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showQuickTimer, setShowQuickTimer] = useState(false);
  const [showQuickMealLog, setShowQuickMealLog] = useState(false);
  const [shoppingRemaining, setShoppingRemaining] = useState<number | null>(null);
  const [shoppingBadge, setShoppingBadge] = useState<number | undefined>(undefined);
  const [mealPlanHasUncooked, setMealPlanHasUncooked] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search history
  const { searchHistory, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

  // Tab badge counts — fetch on mount and periodically
  const fetchBadgeCounts = useCallback(async () => {
    try {
      const response = await shoppingListApi.getShoppingLists();
      const lists = response.data || [];
      const activeList = lists.find((l: any) => l.isActive) || lists[0];
      if (activeList?.items) {
        const unchecked = activeList.items.filter((i: any) => !i.purchased).length;
        setShoppingBadge(unchecked > 0 ? unchecked : undefined);
      } else {
        setShoppingBadge(undefined);
      }
    } catch {
      // Silently fail
    }

    try {
      const response = await mealPlanApi.getDailySuggestion();
      const meals = response.data?.meals || response.data?.todayMeals || [];
      const hasUncooked = meals.some((m: any) => !m.cooked && !m.skipped);
      setMealPlanHasUncooked(hasUncooked);
    } catch {
      setMealPlanHasUncooked(false);
    }
  }, []);

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [fetchBadgeCounts]);

  // FAB (Floating Action Button) animations
  const fabScale = useRef(new Animated.Value(1)).current;


  // Execute a search query
  const executeSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    addToHistory(trimmed);
    setIsSearchFocused(false);
    Keyboard.dismiss();

    const lastSegment = segments[segments.length - 1] as string;
    const isOnIndexTab = pathname === '/(tabs)/index' || pathname === '/index' || pathname === '/' || lastSegment === 'index' || pathname === '/(tabs)';

    if (isOnIndexTab) {
      router.setParams({ search: trimmed });
    } else {
      router.push({
        pathname: '/(tabs)',
        params: { search: trimmed },
      });
    }
  }, [pathname, segments, addToHistory]);

  // Debounced instant search - triggers as user types
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        executeSearch(text);
      }, 500);
    }
  }, [executeSearch]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSelectHistoryItem = useCallback((query: string) => {
    setSearchQuery(query);
    executeSearch(query);
  }, [executeSearch]);

  const actionItems: ActionSheetItem[] = [
    {
      label: 'Take a Picture',
      icon: 'camera-outline',
      onPress: async () => {
        if (!cameraPermission?.granted) {
          const result = await requestCameraPermission();
          if (!result.granted) {
            return;
          }
        }
        setShowCamera(true);
      },
      color: 'red',
    },
    {
      label: 'Surprise Me!',
      icon: 'dice-outline',
      onPress: () => {
        router.push({
          pathname: '/(tabs)',
          params: { openRoulette: 'true' },
        });
      },
      color: 'orange',
    },
    {
      label: 'Add Recipe',
      icon: 'restaurant-outline',
      onPress: () => {
        router.push('/recipe-form');
      },
      color: 'red',
    },
    {
      label: 'Log a Meal',
      icon: 'nutrition-outline',
      onPress: () => {
        setShowQuickMealLog(true);
      },
      color: 'orange',
    },
    {
      label: 'Quick Timer',
      icon: 'timer-outline',
      onPress: () => {
        setShowQuickTimer(true);
      },
      color: 'green',
    },
    {
      label: 'Input Daily Weight',
      icon: 'scale-outline',
      onPress: () => {
        router.push('/weight-input');
      },
      color: 'blue',
    },
    {
      label: 'Edit Preferences',
      icon: 'settings-outline',
      onPress: () => {
        router.push('/edit-preferences');
      },
      color: 'gray',
    },
    {
      label: 'Create Collection',
      icon: 'create-outline',
      onPress: () => {
        router.push('/create-collection');
      },
      color: 'purple',
    },
    {
      label: 'Create Shopping List',
      icon: 'cart-outline',
      onPress: () => {
        router.push('/create-shopping-list');
      },
      color: 'green',
    },
    {
      label: 'Shopping Mode',
      icon: 'storefront-outline',
      onPress: () => {
        router.push({
          pathname: '/(tabs)/shopping-list' as any,
          params: { activateInStore: 'true' },
        });
      },
      color: 'green',
      subtitle: shoppingRemaining != null && shoppingRemaining > 0
        ? `${shoppingRemaining} left`
        : undefined,
    },
  ];

  const handleTakePhoto = async (cameraRef: any) => {
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setShowCamera(false);

        try {
          const response = await scannerApi.recognizeFood(photo.uri);
          if (response.data.success && response.data.result) {
            router.push({
              pathname: '/scanner-results',
              params: {
                result: JSON.stringify(response.data.result),
                imageUri: photo.uri,
              },
            });
          }
        } catch (error: any) {
          console.error('Food recognition error:', error);
        }
      }
    } catch (error: any) {
      console.error('Camera error:', error);
    }
  };

  const showHistoryDropdown = isSearchFocused && searchQuery.length === 0 && searchHistory.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          borderTopWidth: 0,
          height: ComponentSpacing.tabBar.height + insets.bottom * 0.5,
          paddingBottom: insets.bottom * 0.5,
          paddingTop: ComponentSpacing.tabBar.paddingTop,
          elevation: 0,
          backgroundColor: isDark ? '#1C1C1E' : Colors.surface,
          shadowOpacity: 0,
        },
        tabBarSafeAreaInsets: { bottom: 0 },
        tabBarLabelStyle: {
          fontSize: FontSize.sm,
          fontWeight: FontWeight.medium,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="home-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="cookbook"
        options={{
          title: 'Cookbook',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="book-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="meal-plan"
        options={{
          title: 'Meal Plan',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="calendar-outline" color={color} size={size} focused={focused} badgeDot={mealPlanHasUncooked} badgeColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping-list"
        options={{
          title: 'Shopping',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="cart-outline" color={color} size={size} focused={focused} badgeCount={shoppingBadge} badgeColor={colors.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="person-outline" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
      </View>

      {/* Search Bar + Plus Button Above Tab Bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          backgroundColor: isDark ? '#1C1C1E' : Colors.surface,
          bottom: ComponentSpacing.tabBar.height + insets.bottom * 0.5,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          zIndex: 10,
        }}
      >
        <View className="flex-row items-center" style={{ gap: Gap.md }}>
          {/* Search Bar */}
          <View className="flex-1" style={{ position: 'relative' }}>
            <SearchBar
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onClear={() => {
                setSearchQuery('');
                if (debounceRef.current) clearTimeout(debounceRef.current);
              }}
              placeholder="Search recipes..."
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                // Delay to allow tapping history items
                setTimeout(() => setIsSearchFocused(false), 200);
              }}
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  executeSearch(searchQuery);
                }
              }}
              accessibilityLabel="Search recipes"
              accessibilityHint="Enter recipe name or ingredient to search. Results update as you type."
            />

            {/* Search History Dropdown */}
            {showHistoryDropdown && (
              <View
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: 4,
                  backgroundColor: isDark ? DarkElevation.dp8 : '#FFFFFF',
                  borderRadius: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 5,
                  maxHeight: 250,
                  zIndex: 20,
                }}
              >
                <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
                  <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Recent Searches
                  </Text>
                  <HapticTouchableOpacity
                    onPress={clearHistory}
                    accessibilityLabel="Clear search history"
                  >
                    <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                      Clear All
                    </Text>
                  </HapticTouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                  {searchHistory.map((query, index) => (
                    <HapticTouchableOpacity
                      key={`${query}-${index}`}
                      onPress={() => handleSelectHistoryItem(query)}
                      className="flex-row items-center px-4 py-3"
                      style={{
                        marginTop: index > 0 ? 1 : 0,
                      }}
                    >
                      <Ionicons name="time-outline" size={16} color={colors.text.tertiary} style={{ marginRight: 12 }} />
                      <Text className="flex-1 text-base text-gray-800 dark:text-gray-200" numberOfLines={1}>
                        {query}
                      </Text>
                      <HapticTouchableOpacity
                        onPress={() => removeFromHistory(query)}
                        className="p-1"
                        accessibilityLabel={`Remove "${query}" from history`}
                      >
                        <Ionicons name="close" size={16} color={colors.text.tertiary} />
                      </HapticTouchableOpacity>
                    </HapticTouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Quick Actions Button — gradient pill matching header buttons */}
          <HapticTouchableOpacity
            onPress={async () => {
              Animated.sequence([
                Animated.spring(fabScale, {
                  toValue: 0.93,
                  friction: 5,
                  tension: 40,
                  useNativeDriver: true,
                }),
                Animated.spring(fabScale, {
                  toValue: 1,
                  friction: 4,
                  tension: 40,
                  useNativeDriver: true,
                }),
              ]).start();

              // Fetch shopping list remaining count for badge
              try {
                const response = await shoppingListApi.getShoppingLists();
                const lists = response.data || [];
                const activeList = lists.find((l: any) => l.isActive) || lists[0];
                if (activeList?.items) {
                  setShoppingRemaining(activeList.items.filter((i: any) => !i.purchased).length);
                } else {
                  setShoppingRemaining(null);
                }
              } catch {
                // Silently fail - badge just won't show
              }

              setShowActionSheet(true);
            }}
            activeOpacity={1}
            accessibilityLabel="Quick actions menu"
            accessibilityRole="button"
            accessibilityHint="Opens menu with options to add recipes, take photos, and more"
            style={{
              borderRadius: 100,
              overflow: 'hidden',
              shadowColor: '#E84D3D',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Animated.View style={{ transform: [{ scale: fabScale }] }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 100,
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  gap: 5,
                }}
              >
                <Ionicons name="add" size={18} color="white" />
              </View>
            </Animated.View>
          </HapticTouchableOpacity>
        </View>
      </View>

      {/* Action Sheet */}
      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        items={actionItems}
        title="Quick Actions"
      />

      {/* Quick Timer Modal */}
      {showQuickTimer && (
        <QuickTimerModal
          visible={showQuickTimer}
          onClose={() => setShowQuickTimer(false)}
        />
      )}

      {/* Quick Meal Log Modal */}
      {showQuickMealLog && (
        <QuickMealLogModal
          visible={showQuickMealLog}
          onClose={() => setShowQuickMealLog(false)}
        />
      )}

      {/* Quick Camera Modal */}
      {showCamera && cameraPermission?.granted && (
        <QuickCameraModal
          visible={showCamera}
          onClose={() => setShowCamera(false)}
          onTakePhoto={handleTakePhoto}
        />
      )}
    </View>
  );
}

// Quick Timer Modal Component
function QuickTimerModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const presets = [
    { label: '1 min', seconds: 60 },
    { label: '5 min', seconds: 300 },
    { label: '10 min', seconds: 600 },
    { label: '15 min', seconds: 900 },
    { label: '30 min', seconds: 1800 },
  ];

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, seconds]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePreset = (presetSeconds: number) => {
    setSelectedPreset(presetSeconds);
    setSeconds(presetSeconds);
    setIsRunning(false);
  };

  const handleStartStop = () => {
    if (seconds === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(selectedPreset || 0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View
          className="mx-6 rounded-2xl p-6"
          style={{
            backgroundColor: isDark ? DarkElevation.dp16 : '#FFFFFF',
            width: Dimensions.get('window').width - 48,
          }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <Text className="text-2xl mr-2">⏱️</Text>
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">Quick Timer</Text>
            </View>
            <HapticTouchableOpacity onPress={onClose} accessibilityLabel="Close timer">
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </HapticTouchableOpacity>
          </View>

          {/* Timer Display */}
          <View className="items-center mb-6">
            <Text
              className="font-bold text-gray-900 dark:text-gray-100"
              style={{ fontSize: 56, fontVariant: ['tabular-nums'] }}
            >
              {formatTime(seconds)}
            </Text>
            {seconds === 0 && !isRunning && (
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select a time to start
              </Text>
            )}
            {seconds === 0 && selectedPreset && !isRunning && (
              <Text className="text-sm font-semibold mt-1" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
                Timer complete!
              </Text>
            )}
          </View>

          {/* Preset Buttons */}
          <View className="flex-row flex-wrap justify-center mb-6" style={{ gap: 8 }}>
            {presets.map(({ label, seconds: presetSec }) => (
              <HapticTouchableOpacity
                key={label}
                onPress={() => handlePreset(presetSec)}
                className="px-4 py-2.5 rounded-full"
                style={{
                  backgroundColor: selectedPreset === presetSec
                    ? (isDark ? DarkColors.primary : Colors.primary)
                    : (isDark ? '#374151' : '#F3F4F6'),
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color: selectedPreset === presetSec
                      ? '#FFFFFF'
                      : (isDark ? '#D1D5DB' : '#4B5563'),
                  }}
                >
                  {label}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>

          {/* Controls */}
          <View className="flex-row justify-center" style={{ gap: 16 }}>
            <HapticTouchableOpacity
              onPress={handleReset}
              disabled={!selectedPreset}
              className="flex-1 py-3 rounded-xl items-center"
              style={{
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                opacity: selectedPreset ? 1 : 0.4,
              }}
            >
              <Text className="font-semibold text-gray-700 dark:text-gray-300">Reset</Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity
              onPress={handleStartStop}
              disabled={seconds === 0 && !isRunning}
              className="flex-1 py-3 rounded-xl items-center"
              style={{
                backgroundColor: isRunning
                  ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                  : (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen),
                opacity: (seconds === 0 && !isRunning) ? 0.4 : 1,
              }}
            >
              <Text className="font-semibold text-white">
                {isRunning ? 'Pause' : 'Start'}
              </Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Quick Camera Modal Component
function QuickCameraModal({
  visible,
  onClose,
  onTakePhoto
}: {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: (cameraRef: any) => void;
}) {
  const cameraRef = useRef<any>(null);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        <CameraView
          ref={cameraRef}
          className="flex-1"
          facing="back"
        />
        <View className="absolute inset-0 justify-end pb-8 items-center">
          <View className="flex-row" style={{ gap: 16 }}>
            <HapticTouchableOpacity
              onPress={onClose}
              className="w-16 h-16 rounded-full bg-gray-700 dark:bg-gray-600 items-center justify-center"
              accessibilityLabel="Close camera"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={32} color="white" />
            </HapticTouchableOpacity>
            <HapticTouchableOpacity
              onPress={() => onTakePhoto(cameraRef)}
              hapticStyle="medium"
              className="w-20 h-20 rounded-full bg-orange-500 dark:bg-orange-600 items-center justify-center border-4 border-white"
              accessibilityLabel="Take photo"
              accessibilityRole="button"
              accessibilityHint="Takes a photo of food to scan"
            >
              <View className="w-16 h-16 rounded-full bg-white" />
            </HapticTouchableOpacity>
            <HapticTouchableOpacity
              onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') return;

                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.8,
                });

                if (!result.canceled && result.assets[0]) {
                  try {
                    const response = await scannerApi.recognizeFood(result.assets[0].uri);
                    if (response.data.success && response.data.result) {
                      onClose();
                      router.push({
                        pathname: '/scanner-results',
                        params: {
                          result: JSON.stringify(response.data.result),
                          imageUri: result.assets[0].uri,
                        },
                      });
                    }
                  } catch (error: any) {
                    console.error('Food recognition error:', error);
                  }
                }
              }}
              className="w-16 h-16 rounded-full bg-gray-700 dark:bg-gray-600 items-center justify-center"
              accessibilityLabel="Choose from photo library"
              accessibilityRole="button"
              accessibilityHint="Opens photo library to select an image"
            >
              <Ionicons name="images-outline" size={32} color="white" />
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
