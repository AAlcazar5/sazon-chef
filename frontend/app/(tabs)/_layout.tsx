import React, { useState, useRef, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Modal, Animated, Dimensions, TextInput } from 'react-native';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import AnimatedBadge from '../../components/ui/AnimatedBadge';
import { router, usePathname, useSegments } from 'expo-router';
import ActionSheet, { ActionSheetItem } from '../../components/ui/ActionSheet';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { scannerApi } from '../../lib/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, DarkColors } from '../../constants/Colors';
import { FontSize, FontWeight } from '../../constants/Typography';
import { Spacing, ComponentSpacing, Gap } from '../../constants/Spacing';
import { Duration } from '../../constants/Animations';

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
  
  // FAB (Floating Action Button) animations
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;

  const actionItems: ActionSheetItem[] = [
    {
      label: 'Take a Picture',
      icon: 'camera-outline',
      onPress: async () => {
        // Request camera permission
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
      label: 'Add Recipe',
      icon: 'restaurant-outline',
      onPress: () => {
        router.push('/recipe-form');
      },
      color: 'red',
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
  ];

  const handleTakePhoto = async (cameraRef: any) => {
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setShowCamera(false);
        
        // Process the photo
        try {
          const response = await scannerApi.recognizeFood(photo.uri);
          if (response.data.success && response.data.result) {
            // Navigate to a results screen or show in modal
            // For now, just show the result
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
          bottom: 55, // Position closer to tab bar
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          zIndex: 10,
        }}
      >
        <View className="flex-row items-center" style={{ gap: Gap.md }}>
          {/* Search Bar */}
          <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
            <Ionicons name="search-outline" size={20} color={colors.text.secondary} style={{ marginRight: Spacing.sm }} />
            <TextInput
              placeholder="Search recipes..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search recipes"
              accessibilityHint="Enter recipe name or ingredient to search"
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  const query = searchQuery.trim();
                  console.log('🔍 Navigating to search with query:', query);
                  console.log('📍 Current pathname:', pathname);
                  console.log('📍 Current segments:', segments);
                  
                  // Check if we're already on the index tab
                  const lastSegment = segments[segments.length - 1] as string;
                  const isOnIndexTab = pathname === '/(tabs)/index' || pathname === '/index' || pathname === '/' || lastSegment === 'index' || pathname === '/(tabs)';
                  
                  if (isOnIndexTab) {
                    // If already on index tab, just update params
                    console.log('📍 Already on index tab, updating params');
                    router.setParams({ search: query });
                  } else {
                    // Navigate to index tab
                    console.log('📍 Navigating to index tab');
                    router.push({
                      pathname: '/(tabs)',
                      params: { search: query },
                    });
                  }
                }
              }}
              className="flex-1 text-gray-900 dark:text-gray-100"
              style={{ fontSize: FontSize.md, color: colors.text.primary }}
            />
            {searchQuery.length > 0 && (
              <HapticTouchableOpacity
                onPress={() => setSearchQuery('')}
                className="p-1"
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                accessibilityHint="Clears the search text"
              >
                <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
              </HapticTouchableOpacity>
            )}
          </View>

          {/* Plus Button */}
          <HapticTouchableOpacity
            onPress={() => {
              // Rotate animation on press
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
              
              // Bounce animation
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
