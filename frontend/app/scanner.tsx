// frontend/app/scanner.tsx
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
// Scanner screen for ingredient scanning and food recognition (Phase 6, Group 13)

import { View, Text, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { CameraView, CameraType, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scannerApi } from '../lib/api';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import LoadingState from '../components/ui/LoadingState';

type ScannerMode = 'food' | 'barcode';

interface FoodRecognitionResult {
  foods: Array<{
    name: string;
    confidence: number;
    estimatedCalories: number;
    estimatedPortion?: string;
    ingredients?: string[];
  }>;
  totalEstimatedCalories: number;
  mealDescription: string;
  confidence: number;
}

interface BarcodeResult {
  productName: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  servingSize?: string;
  ingredients?: string[];
  imageUrl?: string;
  barcode: string;
}

export default function ScannerScreen() {
  const [mode, setMode] = useState<ScannerMode>('food');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<FoodRecognitionResult | BarcodeResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [barcodeScanned, setBarcodeScanned] = useState(false);

  // Request camera permission on mount
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      setScanning(true);

      // Take photo using camera
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        setImageUri(photo.uri);
        await processPhoto(photo.uri);
      }
    } catch (error: any) {
      console.error('❌ Camera error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        await processPhoto(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('❌ Image picker error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const processPhoto = async (uri: string) => {
    try {
      setProcessing(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (mode === 'food') {
        // Food recognition
        const response = await scannerApi.recognizeFood(uri);
        if (response.data.success && response.data.result) {
          setResult(response.data.result as FoodRecognitionResult);
        } else {
          throw new Error('Failed to recognize food');
        }
      }
    } catch (error: any) {
      console.error('❌ Processing error:', error);
      Alert.alert(
        'Recognition Failed',
        error.message || 'Failed to process image. Please ensure OPENAI_API_KEY is configured.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleBarcodeScanned = async ({ data, type }: BarcodeScanningResult) => {
    if (barcodeScanned) return; // Prevent multiple scans
    if (mode !== 'barcode') return;

    try {
      setBarcodeScanned(true);
      setProcessing(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const response = await scannerApi.scanBarcode(data);
      if (response.data.success && response.data.result) {
        setResult(response.data.result as BarcodeResult);
      } else {
        throw new Error('Product not found');
      }
    } catch (error: any) {
      console.error('❌ Barcode scan error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Product Not Found',
        'This barcode was not found in our database. Please try another product.'
      );
    } finally {
      setProcessing(false);
      // Reset after 2 seconds to allow re-scanning
      setTimeout(() => setBarcodeScanned(false), 2000);
    }
  };

  const reset = () => {
    setResult(null);
    setImageUri(null);
    setBarcodeScanned(false);
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-gray-600">Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-6">
        <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
        <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2">Camera Permission Required</Text>
        <Text className="text-gray-600 text-center mb-6">
          We need access to your camera to scan ingredients and barcodes.
        </Text>
        <HapticTouchableOpacity
          onPress={requestPermission}
          className="bg-orange-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </HapticTouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Mode Selector */}
      <View className="flex-row bg-gray-900 px-4 py-2">
        <HapticTouchableOpacity
          onPress={() => {
            setMode('food');
            reset();
          }}
          className={`flex-1 py-2 px-4 rounded-lg mr-2 ${mode === 'food' ? 'bg-orange-500' : 'bg-gray-700'}`}
        >
          <Text className={`text-center font-semibold ${mode === 'food' ? 'text-white' : 'text-gray-300'}`}>
            📸 Food Photo
          </Text>
        </HapticTouchableOpacity>
        <HapticTouchableOpacity
          onPress={() => {
            setMode('barcode');
            reset();
          }}
          className={`flex-1 py-2 px-4 rounded-lg ${mode === 'barcode' ? 'bg-orange-500' : 'bg-gray-700'}`}
        >
          <Text className={`text-center font-semibold ${mode === 'barcode' ? 'text-white' : 'text-gray-300'}`}>
            📱 Barcode
          </Text>
        </HapticTouchableOpacity>
      </View>

      {/* Camera View */}
      {!result && (
        <View className="flex-1">
          <CameraView
            ref={cameraRef}
            className="flex-1"
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
            }}
            onBarcodeScanned={mode === 'barcode' && !barcodeScanned ? handleBarcodeScanned : undefined}
          />
          {mode === 'barcode' ? (
            <View className="absolute inset-0 justify-center items-center">
              <View className="w-64 h-64 border-4 border-orange-500 rounded-lg" />
              <Text className="text-white mt-4 text-lg font-semibold">Position barcode within frame</Text>
            </View>
          ) : (
            <View className="absolute inset-0 justify-end pb-8 items-center">
              <View className="flex-row" style={{ gap: 16 }}>
                <HapticTouchableOpacity
                  onPress={handlePickImage}
                  className="w-16 h-16 rounded-full bg-gray-700 items-center justify-center"
                >
                  <Ionicons name="images-outline" size={32} color="white" />
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={handleTakePhoto}
                  disabled={scanning || processing}
                  hapticStyle="medium"
                  className="w-20 h-20 rounded-full bg-orange-500 items-center justify-center border-4 border-white"
                >
                  {scanning || processing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View className="w-16 h-16 rounded-full bg-white" />
                  )}
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={() => router.back()}
                  className="w-16 h-16 rounded-full bg-gray-700 items-center justify-center"
                >
                  <Ionicons name="close" size={32} color="white" />
                </HapticTouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Results View */}
      {result && (
        <ScrollView className="flex-1 bg-white">
          <View className="p-4">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-900">Results</Text>
              <HapticTouchableOpacity onPress={reset}>
                <Ionicons name="close-circle" size={32} color="#9CA3AF" />
              </HapticTouchableOpacity>
            </View>

            {/* Image Preview */}
            {imageUri && (
              <Image source={{ uri: imageUri }} className="w-full h-48 rounded-lg mb-4" resizeMode="cover" />
            )}

            {/* Food Recognition Results */}
            {mode === 'food' && 'foods' in result && (
              <View>
                <View className="bg-orange-50 p-4 rounded-lg mb-4">
                  <Text className="text-lg font-semibold text-gray-900 mb-1">
                    {result.mealDescription}
                  </Text>
                  <Text className="text-3xl font-bold text-orange-600">
                    {result.totalEstimatedCalories} calories
                  </Text>
                </View>

                <Text className="text-lg font-semibold text-gray-900 mb-2">Food Items:</Text>
                {result.foods.map((food, index) => (
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

            {/* Barcode Results */}
            {mode === 'barcode' && 'productName' in result && (
              <View>
                <View className="bg-blue-50 p-4 rounded-lg mb-4">
                  <Text className="text-lg font-semibold text-gray-900 mb-1">
                    {result.productName}
                  </Text>
                  {result.brand && (
                    <Text className="text-sm text-gray-600 mb-2">Brand: {result.brand}</Text>
                  )}
                  {result.imageUrl && (
                    <Image
                      source={{ uri: result.imageUrl }}
                      className="w-full h-32 rounded-lg mb-2"
                      resizeMode="contain"
                    />
                  )}
                </View>

                <Text className="text-lg font-semibold text-gray-900 mb-2">Nutrition Information:</Text>
                <View className="bg-gray-50 p-4 rounded-lg mb-2">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-700">Calories</Text>
                    <Text className="font-semibold text-gray-900">{result.calories} cal</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-700">Protein</Text>
                    <Text className="font-semibold text-gray-900">{result.protein}g</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-700">Carbs</Text>
                    <Text className="font-semibold text-gray-900">{result.carbs}g</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-700">Fat</Text>
                    <Text className="font-semibold text-gray-900">{result.fat}g</Text>
                  </View>
                  {result.servingSize && (
                    <Text className="text-sm text-gray-600 mt-2">Serving Size: {result.servingSize}</Text>
                  )}
                </View>

                {result.ingredients && result.ingredients.length > 0 && (
                  <View className="mt-2">
                    <Text className="text-sm font-semibold text-gray-700 mb-1">Ingredients:</Text>
                    <Text className="text-sm text-gray-600">{result.ingredients.join(', ')}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View className="mt-6 space-y-2">
              <HapticTouchableOpacity
                onPress={reset}
                className="bg-orange-500 py-3 rounded-lg"
              >
                <Text className="text-white text-center font-semibold">Scan Again</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => router.back()}
                className="bg-gray-200 py-3 rounded-lg"
              >
                <Text className="text-gray-700 text-center font-semibold">Done</Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Processing Overlay */}
      {processing && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white dark:bg-gray-800 p-8 rounded-lg items-center">
            <LoadingState
              message={mode === 'food' ? 'Analyzing food photo...' : 'Looking up product...'}
              expression="focused"
              size="medium"
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

