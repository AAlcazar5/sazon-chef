// frontend/app/scanner-results.tsx
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
// Results screen for food recognition

import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ScannerResultsScreen() {
  const { result, imageUri } = useLocalSearchParams<{
    result: string;
    imageUri: string;
  }>();

  let parsedResult: any = null;
  try {
    if (result) {
      parsedResult = JSON.parse(result);
    }
  } catch (e) {
    console.error('Failed to parse result:', e);
  }

  if (!parsedResult) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
        <Ionicons name="alert-circle-outline" size={64} color="#9CA3AF" />
        <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2">No Results</Text>
        <Text className="text-gray-600 text-center mb-6">
          Unable to process the food recognition results.
        </Text>
        <HapticTouchableOpacity
          onPress={() => router.back()}
          className="bg-orange-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </HapticTouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200 flex-row items-center">
        <HapticTouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </HapticTouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Food Recognition</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Image Preview */}
          {imageUri && (
            <Image source={{ uri: imageUri }} className="w-full h-64 rounded-lg mb-4" resizeMode="cover" />
          )}

          {/* Summary */}
          <View className="bg-orange-50 p-4 rounded-lg mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              {parsedResult.mealDescription || 'Food Items'}
            </Text>
            <Text className="text-3xl font-bold text-orange-600">
              {parsedResult.totalEstimatedCalories} calories
            </Text>
          </View>

          {/* Food Items */}
          {parsedResult.foods && parsedResult.foods.length > 0 && (
            <View className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-2">Food Items:</Text>
              {parsedResult.foods.map((food: any, index: number) => (
                <View key={index} className="bg-gray-50 p-3 rounded-lg mb-2">
                  <View className="flex-row justify-between items-center">
                    <Text className="font-semibold text-gray-900">{food.name}</Text>
                    <Text className="text-orange-600 font-bold">{food.estimatedCalories} cal</Text>
                  </View>
                  {food.estimatedPortion && (
                    <Text className="text-sm text-gray-600 mt-1">Portion: {food.estimatedPortion}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View className="mt-4 space-y-2">
            <HapticTouchableOpacity
              onPress={() => router.back()}
              className="bg-orange-500 py-3 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">Done</Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

