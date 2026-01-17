// frontend/app/create-collection.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import ShakeAnimation from '../components/ui/ShakeAnimation';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import { collectionsApi } from '../lib/api';
import { useColorScheme } from 'nativewind';

export default function CreateCollectionScreen() {
  const [name, setName] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shakeName, setShakeName] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to select a cover image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverImageUrl(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setShakeName(true);
      setTimeout(() => setShakeName(false), 500);
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }

    setLoading(true);
    try {
      const response = await collectionsApi.create({
        name: name.trim(),
        coverImageUrl: coverImageUrl || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Success',
        `Collection "${name.trim()}" created successfully!`,
        [
          {
            text: 'View in Cookbook',
            onPress: () => {
              router.back();
              router.push('/(tabs)/cookbook');
            }
          },
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create collection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-md self-center">
          {/* Back button */}
          <HapticTouchableOpacity
            onPress={() => router.back()}
            className="mb-4"
            disabled={loading}
          >
            <View className="flex-row items-center">
              <Ionicons name="arrow-back" size={24} color={theme === 'dark' ? '#fff' : '#000'} />
              <Text className="ml-2 text-base text-gray-900 dark:text-gray-100">Back</Text>
            </View>
          </HapticTouchableOpacity>

          <View className="items-center mb-6">
            <Ionicons name="folder-outline" size={64} color="#F97316" />
          </View>

          <Text className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2 text-center">
            Create Collection
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-200 mb-8 text-center">
            Organize your favorite recipes
          </Text>

          <View className="w-full">
            {/* Collection Name */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Collection Name <Text className="text-red-600">*</Text>
              </Text>
              <ShakeAnimation shake={shakeName}>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Quick Weeknight Dinners, Healthy Breakfast"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                  maxLength={50}
                />
              </ShakeAnimation>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {name.length}/50 characters
              </Text>
            </View>

            {/* Cover Image (Optional) */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Cover Image (Optional)
              </Text>

              {coverImageUrl ? (
                <View className="relative">
                  <Image
                    source={{ uri: coverImageUrl }}
                    style={{
                      width: '100%',
                      height: 160,
                      borderRadius: 8,
                      backgroundColor: '#E5E7EB',
                    }}
                    resizeMode="cover"
                  />
                  <HapticTouchableOpacity
                    onPress={() => setCoverImageUrl(null)}
                    disabled={loading}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-600 dark:bg-red-400 items-center justify-center"
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </HapticTouchableOpacity>
                </View>
              ) : (
                <HapticTouchableOpacity
                  onPress={handlePickImage}
                  disabled={loading}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 items-center justify-center bg-gray-50 dark:bg-gray-800"
                  style={{ height: 160 }}
                >
                  <Ionicons name="image-outline" size={40} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text className="text-gray-600 dark:text-gray-200 text-sm mt-2">
                    Tap to select image
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    Recommended: 16:9 aspect ratio
                  </Text>
                </HapticTouchableOpacity>
              )}
            </View>

            {/* Create Button */}
            <HapticTouchableOpacity
              className={`bg-red-600 dark:bg-red-400 rounded-lg px-4 py-4 items-center justify-center mt-2 min-h-[50px] ${loading ? 'opacity-60' : ''}`}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="add-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white text-base font-semibold">Create Collection</Text>
                </View>
              )}
            </HapticTouchableOpacity>

            {/* Cancel Button */}
            <HapticTouchableOpacity
              className="mt-4"
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text className="text-center text-gray-600 dark:text-gray-200 text-sm">
                Cancel
              </Text>
            </HapticTouchableOpacity>

            {/* Info Box */}
            <View className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <View className="flex-row items-start">
                <Ionicons name="information-circle-outline" size={20} color="#3B82F6" style={{ marginRight: 8, marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="text-sm text-blue-800 dark:text-blue-200 font-semibold mb-1">
                    What are collections?
                  </Text>
                  <Text className="text-xs text-blue-700 dark:text-blue-300">
                    Collections help you organize your saved recipes into custom groups like "Family Favorites", "Meal Prep Ideas", or "Holiday Recipes".
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
