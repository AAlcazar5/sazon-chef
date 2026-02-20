import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Modal, Animated, Dimensions, TextInput, ScrollView, Keyboard } from 'react-native';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import AnimatedBadge from '../../components/ui/AnimatedBadge';
import { router, usePathname, useSegments } from 'expo-router';
import ActionSheet, { ActionSheetItem } from '../../components/ui/ActionSheet';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { scannerApi, shoppingListApi } from '../../lib/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, DarkColors } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Spacing, ComponentSpacing, Gap } from '../../constants/Spacing';
import { Duration } from '../../constants/Animations';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { QuickMealLogModal } from '../../components/meal-plan';

export default function TabLayout() {
  console.log('[TabLayout] Rendering');
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
  const searchInputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search history
  const { searchHistory, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

  // FAB (Floating Action Button) animations
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;

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
      label: "Today's Meals",
      icon: 'calendar-outline',
      onPress: () => {
        router.push('/(tabs)/meal-plan' as any);
      },
      color: 'blue',
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
        tabBarActiveTintColor: '#F97316',
        headerShown: false,
        tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 0,
          height: ComponentSpacing.tabBar.height,
            paddingBottom: ComponentSpacing.tabBar.paddingBottom,
          paddingTop: ComponentSpacing.tabBar.paddingTop,
        },
        tabBarLabelStyle: {
          fontSize: FontSize.sm,
          fontWeight: FontWeight.medium,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
        <Tabs.Screen
          name="add"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      <Tabs.Screen
        name="cookbook"
        options={{
          title: 'Cookbook',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
        <Tabs.Screen
          name="meal-plan"
          options={{
            title: 'Meal Plan',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="shopping-list"
          options={{
            title: 'Shopping',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
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
          backgroundColor: colors.background,
          bottom: 55,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          zIndex: 10,
        }}
      >
        <View className="flex-row items-center" style={{ gap: Gap.md }}>
          {/* Search Bar */}
          <View className="flex-1" style={{ position: 'relative' }}>
            <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
              <Ionicons name="search-outline" size={20} color={colors.text.secondary} style={{ marginRight: Spacing.sm }} />
              <TextInput
                ref={searchInputRef}
                placeholder="Search recipes..."
                placeholderTextColor={colors.text.tertiary}
                value={searchQuery}
                onChangeText={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  // Delay to allow tapping history items
                  setTimeout(() => setIsSearchFocused(false), 200);
                }}
                accessibilityLabel="Search recipes"
                accessibilityHint="Enter recipe name or ingredient to search. Results update as you type."
                onSubmitEditing={() => {
                  if (searchQuery.trim()) {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    executeSearch(searchQuery);
                  }
                }}
                className="flex-1 text-gray-900 dark:text-gray-100"
                style={{ fontSize: FontSize.md, color: colors.text.primary }}
              />
              {searchQuery.length > 0 && (
                <HapticTouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                  }}
                  className="p-1"
                  accessibilityLabel="Clear search"
                  accessibilityRole="button"
                  accessibilityHint="Clears the search text"
                >
                  <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
                </HapticTouchableOpacity>
              )}
            </View>

            {/* Search History Dropdown */}
            {showHistoryDropdown && (
              <View
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  marginBottom: 4,
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#E5E7EB',
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
                        borderTopWidth: index > 0 ? 1 : 0,
                        borderTopColor: isDark ? '#374151' : '#F3F4F6',
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

          {/* Plus Button */}
          <HapticTouchableOpacity
            onPress={async () => {
              Animated.sequence([
                Animated.timing(fabRotation, {
                  toValue: 1,
                  duration: Duration.normal,
                  useNativeDriver: true,
                }),
                Animated.timing(fabRotation, {
                  toValue: 0,
                  duration: Duration.normal,
                  useNativeDriver: true,
                }),
              ]).start();

              Animated.sequence([
                Animated.spring(fabScale, {
                  toValue: 0.9,
                  friction: 3,
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
            className="w-12 h-12 rounded-full items-center justify-center shadow-lg border-2"
            style={{
              backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed
            }}
            accessibilityLabel="Quick actions menu"
            accessibilityRole="button"
            accessibilityHint="Opens menu with options to add recipes, take photos, and more"
          >
            <Animated.View
              style={{
                transform: [
                  { scale: fabScale },
                  {
                    rotate: fabRotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '45deg'],
                    }),
                  },
                ],
              }}
            >
              <Ionicons name="add" size={24} color="white" />
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
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
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
