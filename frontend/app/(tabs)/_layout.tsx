import React, { useState, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text, Modal } from 'react-native';
import { router } from 'expo-router';
import ActionSheet, { ActionSheetItem } from '../../components/ui/ActionSheet';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { scannerApi } from '../../lib/api';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function TabLayout() {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

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
      color: 'orange',
    },
    {
      label: 'Add Recipe',
      icon: 'restaurant-outline',
      onPress: () => {
        router.push('/recipe-form');
      },
      color: 'orange',
    },
    {
      label: 'Input Daily Weight',
      icon: 'scale-outline',
      onPress: () => {
        // TODO: Navigate to weight input screen
        router.push('/profile');
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
        // TODO: Navigate to create collection screen
        router.push('/(tabs)/cookbook');
      },
      color: 'purple',
    },
    {
      label: 'Shopping List',
      icon: 'list-outline',
      onPress: () => {
        router.push('/(tabs)/shopping-list');
      },
      color: 'green',
    },
  ];

  const handleTakePhoto = async (cameraRef: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#F97316',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            height: 60,
            paddingBottom: 16,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
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
          name="cookbook"
          options={{
            title: 'Cookbook',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="book-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            tabBarButton: (props) => (
              <TouchableOpacity
                {...props}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowActionSheet(true);
                }}
                className="flex-1 items-center justify-center -mt-2"
              >
                <View className="w-14 h-14 bg-orange-500 rounded-full items-center justify-center shadow-lg">
                  <Ionicons name="add" size={28} color="white" />
                </View>
              </TouchableOpacity>
            ),
            tabBarLabel: () => null,
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
    </>
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
            <TouchableOpacity
              onPress={onClose}
              className="w-16 h-16 rounded-full bg-gray-700 items-center justify-center"
            >
              <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onTakePhoto(cameraRef)}
              className="w-20 h-20 rounded-full bg-orange-500 items-center justify-center border-4 border-white"
            >
              <View className="w-16 h-16 rounded-full bg-white" />
            </TouchableOpacity>
            <TouchableOpacity
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
              className="w-16 h-16 rounded-full bg-gray-700 items-center justify-center"
            >
              <Ionicons name="images-outline" size={32} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
