// frontend/app/weight-input.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import ShakeAnimation from '../components/ui/ShakeAnimation';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import { apiClient } from '../lib/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColorScheme } from 'nativewind';

export default function WeightInputScreen() {
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shakeWeight, setShakeWeight] = useState(false);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('lbs');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const router = useRouter();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Load user's preferred unit from physical profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const response = await apiClient.get('/user/physical-profile');
        // Infer unit from height/weight data (if heightCm is set, they probably use metric)
        const profile = response.data;
        if (profile && profile.heightCm) {
          // If height is in cm, assume metric user
          setUnit('kg');
        } else {
          setUnit('lbs');
        }
      } catch (error) {
        // Default to lbs if no profile
        setUnit('lbs');
      } finally {
        setLoadingProfile(false);
      }
    };
    loadUserProfile();
  }, []);

  const handleSave = async () => {
    if (!weight.trim()) {
      setShakeWeight(true);
      setTimeout(() => setShakeWeight(false), 500);
      Alert.alert('Error', 'Please enter your weight');
      return;
    }

    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      setShakeWeight(true);
      setTimeout(() => setShakeWeight(false), 500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    // Convert to kg if needed (API expects kg)
    const weightInKg = unit === 'lbs' ? weightValue * 0.453592 : weightValue;

    setLoading(true);
    try {
      await apiClient.post('/weight-goal/log', {
        date: date.toISOString(),
        weightKg: weightInKg,
        notes: notes.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Success',
        'Weight logged successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to log weight. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loadingProfile) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top']}>
      <KeyboardAvoidingContainer>
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

          <Text className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2 text-center">
            Log Weight
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-200 mb-8 text-center">
            Track your weight progress
          </Text>

          <View className="w-full">
            {/* Date Picker */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Date</Text>
              <HapticTouchableOpacity
                onPress={() => setShowDatePicker(true)}
                disabled={loading}
              >
                <View className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 bg-white dark:bg-gray-800 flex-row items-center justify-between">
                  <Text className="text-base text-gray-900 dark:text-gray-100">
                    {formatDate(date)}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </View>
              </HapticTouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setDate(selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            )}

            {/* Weight Input */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Weight ({unit})
              </Text>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <ShakeAnimation shake={shakeWeight}>
                  <TextInput
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder={`Enter weight in ${unit}`}
                    placeholderTextColor="#9CA3AF"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                </ShakeAnimation>

                {/* Unit Toggle */}
                <View className="flex-row border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <HapticTouchableOpacity
                    onPress={() => setUnit('lbs')}
                    disabled={loading}
                    className={`px-3 py-3 ${unit === 'lbs' ? 'bg-red-600 dark:bg-red-400' : 'bg-white dark:bg-gray-800'}`}
                  >
                    <Text className={`text-sm font-semibold ${unit === 'lbs' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                      lbs
                    </Text>
                  </HapticTouchableOpacity>
                  <HapticTouchableOpacity
                    onPress={() => setUnit('kg')}
                    disabled={loading}
                    className={`px-3 py-3 ${unit === 'kg' ? 'bg-red-600 dark:bg-red-400' : 'bg-white dark:bg-gray-800'}`}
                  >
                    <Text className={`text-sm font-semibold ${unit === 'kg' ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                      kg
                    </Text>
                  </HapticTouchableOpacity>
                </View>
              </View>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {unit === 'lbs' ? '1 lb = 0.45 kg' : '1 kg = 2.2 lbs'}
              </Text>
            </View>

            {/* Notes (Optional) */}
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Notes (Optional)
              </Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-3 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Add notes (e.g., morning weigh-in, after workout)"
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            {/* Save Button */}
            <HapticTouchableOpacity
              className={`bg-red-600 dark:bg-red-400 rounded-lg px-4 py-4 items-center justify-center mt-2 min-h-[50px] ${loading ? 'opacity-60' : ''}`}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-base font-semibold">Save Weight</Text>
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
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
}
