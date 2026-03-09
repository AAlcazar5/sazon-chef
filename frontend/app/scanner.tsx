// frontend/app/scanner.tsx
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
// Scanner screen for ingredient scanning and food recognition (Phase 6, Group 13)

import { View, Text, Alert, ActivityIndicator, ScrollView, Image, Animated, StyleSheet } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraView, CameraType, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scannerApi, shoppingListApi } from '../lib/api';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import LoadingState from '../components/ui/LoadingState';
import LogoMascot from '../components/mascot/LogoMascot';
import { Colors, DarkColors } from '../constants/Colors';
import Icon from '../components/ui/Icon';
import { Icons } from '../constants/Icons';

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

const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;
const FRAME_SIZE = 256;
const PRIMARY_RED = '#DC2626';

export default function ScannerScreen() {
  const [mode, setMode] = useState<ScannerMode>('food');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<FoodRecognitionResult | BarcodeResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [barcodeScanned, setBarcodeScanned] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [noMatch, setNoMatch] = useState(false);

  // ── Animation refs ──────────────────────────────────────────────────────────
  const cornerScale = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const scanLineLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Animate corner brackets in when in barcode mode with no result
  useEffect(() => {
    if (mode === 'barcode' && !result && !noMatch) {
      cornerScale.setValue(0);
      Animated.spring(cornerScale, {
        toValue: 1,
        friction: 5,
        tension: 200,
        useNativeDriver: true,
      }).start();

      scanLineAnim.setValue(0);
      scanLineLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
        ])
      );
      scanLineLoop.current.start();
    } else {
      scanLineLoop.current?.stop();
      cornerScale.setValue(0);
    }
    return () => { scanLineLoop.current?.stop(); };
  }, [mode, result, noMatch]);

  // Spring-scale result card in when result is set
  useEffect(() => {
    if (result) {
      resultScale.setValue(0);
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 6,
        tension: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [result]);

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_SIZE - 4],
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const getItemNameFromResult = useCallback((): string => {
    if (!result) return '';
    if ('productName' in result) {
      const name = result.productName;
      if (result.brand && name.toLowerCase().startsWith(result.brand.toLowerCase())) {
        return name.slice(result.brand.length).trim();
      }
      return name;
    }
    if ('foods' in result && result.foods.length > 0) {
      return result.foods[0].name;
    }
    return '';
  }, [result]);

  const handleAddToShoppingList = useCallback(async () => {
    const itemName = getItemNameFromResult();
    if (!itemName) return;

    try {
      setAddingToList(true);
      const listsResponse = await shoppingListApi.getShoppingLists();
      const lists = listsResponse.data?.shoppingLists || listsResponse.data || [];

      if (!lists.length) {
        await shoppingListApi.createShoppingList({
          name: 'My Shopping List',
          items: [{ name: itemName, quantity: '1' }],
        });
      } else {
        const targetList = lists[0];
        await shoppingListApi.addItem(targetList.id, {
          name: itemName,
          quantity: '1',
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Added!', `"${itemName}" added to your shopping list.`);
    } catch (error: any) {
      console.error('Error adding to shopping list:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to add item to shopping list.');
    } finally {
      setAddingToList(false);
    }
  }, [getItemNameFromResult]);

  const handleFindRecipes = useCallback(() => {
    const itemName = getItemNameFromResult();
    if (!itemName) return;

    const cleanName = itemName
      .replace(/\b(organic|fresh|frozen|canned|dried|raw|cooked|whole|natural|pure)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace(`/?search=${encodeURIComponent(cleanName)}` as any);
  }, [getItemNameFromResult]);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      setScanning(true);

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

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!picked.canceled && picked.assets[0]) {
        setImageUri(picked.assets[0].uri);
        await processPhoto(picked.assets[0].uri);
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
      setNoMatch(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (mode === 'food') {
        const response = await scannerApi.recognizeFood(uri);
        if (response.data.success && response.data.result) {
          setResult(response.data.result as FoodRecognitionResult);
        } else {
          throw new Error('Failed to recognize food');
        }
      }
    } catch (error: any) {
      console.error('❌ Processing error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setNoMatch(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleBarcodeScanned = async ({ data, type }: BarcodeScanningResult) => {
    if (barcodeScanned) return;
    if (mode !== 'barcode') return;

    try {
      setBarcodeScanned(true);
      setProcessing(true);
      setNoMatch(false);
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
      setNoMatch(true);
    } finally {
      setProcessing(false);
      setTimeout(() => setBarcodeScanned(false), 2000);
    }
  };

  const reset = () => {
    setResult(null);
    setImageUri(null);
    setBarcodeScanned(false);
    setNoMatch(false);
  };

  // ── Permission states ────────────────────────────────────────────────────────

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
          className="bg-red-600 dark:bg-red-400 px-6 py-3 rounded-lg"
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
          onPress={() => { setMode('food'); reset(); }}
          className={`flex-1 py-2 px-4 rounded-lg mr-2 ${mode === 'food' ? 'bg-red-600 dark:bg-red-400' : 'bg-gray-700'}`}
        >
          <Text className={`text-center font-semibold ${mode === 'food' ? 'text-white' : 'text-gray-300'}`}>
            📸 Food Photo
          </Text>
        </HapticTouchableOpacity>
        <HapticTouchableOpacity
          onPress={() => { setMode('barcode'); reset(); }}
          className={`flex-1 py-2 px-4 rounded-lg ${mode === 'barcode' ? 'bg-red-600 dark:bg-red-400' : 'bg-gray-700'}`}
        >
          <Text className={`text-center font-semibold ${mode === 'barcode' ? 'text-white' : 'text-gray-300'}`}>
            📱 Barcode
          </Text>
        </HapticTouchableOpacity>
      </View>

      {/* Camera View */}
      {!result && !noMatch && (
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
            // ── Frosted scanning frame with animated corner brackets ──────────
            <View style={StyleSheet.absoluteFill} className="justify-center items-center">
              <View style={{ width: FRAME_SIZE, height: FRAME_SIZE }}>
                {/* Dimmed surround — top */}
                <View style={[StyleSheet.absoluteFill, styles.scanDimTop]} pointerEvents="none" />

                {/* Animated corner brackets */}
                <Animated.View style={[styles.corner, styles.cornerTL, { transform: [{ scale: cornerScale }] }]} />
                <Animated.View style={[styles.corner, styles.cornerTR, { transform: [{ scale: cornerScale }] }]} />
                <Animated.View style={[styles.corner, styles.cornerBL, { transform: [{ scale: cornerScale }] }]} />
                <Animated.View style={[styles.corner, styles.cornerBR, { transform: [{ scale: cornerScale }] }]} />

                {/* Scan line */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineTranslateY }] },
                  ]}
                />
              </View>
              <Text className="text-white mt-5 text-base font-semibold" style={{ opacity: 0.9 }}>
                Position barcode within frame
              </Text>
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
                  className="w-20 h-20 rounded-full bg-red-600 dark:bg-red-400 items-center justify-center border-4 border-white"
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

      {/* No-match state */}
      {noMatch && !result && (
        <View style={styles.noMatchContainer}>
          <LogoMascot expression="surprised" size="medium" />
          <Text style={styles.noMatchTitle}>Couldn't find that one</Text>
          <Text style={styles.noMatchSubtitle}>
            Try searching by name instead?
          </Text>
          <HapticTouchableOpacity
            onPress={() => router.replace('/' as any)}
            style={styles.noMatchSearchBtn}
            hapticStyle="medium"
          >
            <Icon name={Icons.SEARCH} size={18} color="white" />
            <Text style={styles.noMatchSearchBtnText}>Search Recipes</Text>
          </HapticTouchableOpacity>
          <HapticTouchableOpacity onPress={reset} style={styles.noMatchRetryBtn}>
            <Text style={styles.noMatchRetryText}>Try again</Text>
          </HapticTouchableOpacity>
        </View>
      )}

      {/* Results View — spring-scales in */}
      {result && (
        <Animated.View style={[{ flex: 1 }, { transform: [{ scale: resultScale }] }]}>
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
                  <View className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4 border border-red-200 dark:border-red-800">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {result.mealDescription}
                    </Text>
                    <Text className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {result.totalEstimatedCalories} calories
                    </Text>
                  </View>

                  <Text className="text-lg font-semibold text-gray-900 mb-2">Food Items:</Text>
                  {result.foods.map((food, index) => (
                    <View key={index} className="bg-gray-50 p-3 rounded-lg mb-2">
                      <View className="flex-row justify-between items-center">
                        <Text className="font-semibold text-gray-900">{food.name}</Text>
                        <Text className="text-red-600 dark:text-red-400 font-bold">{food.estimatedCalories} cal</Text>
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

              {/* Smart Action Buttons */}
              <View className="mt-6" style={{ gap: 10 }}>
                <HapticTouchableOpacity
                  onPress={handleAddToShoppingList}
                  disabled={addingToList}
                  className="bg-green-600 py-3 rounded-lg flex-row items-center justify-center"
                  style={{ gap: 8 }}
                >
                  {addingToList ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Icon name={Icons.CART} size={20} color="white" />
                  )}
                  <Text className="text-white text-center font-semibold">
                    {addingToList ? 'Adding...' : 'Add to Shopping List'}
                  </Text>
                </HapticTouchableOpacity>

                <HapticTouchableOpacity
                  onPress={handleFindRecipes}
                  className="bg-orange-500 py-3 rounded-lg flex-row items-center justify-center"
                  style={{ gap: 8 }}
                >
                  <Icon name={Icons.SEARCH} size={20} color="white" />
                  <Text className="text-white text-center font-semibold">Find Recipes</Text>
                </HapticTouchableOpacity>

                <HapticTouchableOpacity
                  onPress={reset}
                  className="bg-red-600 dark:bg-red-400 py-3 rounded-lg"
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
        </Animated.View>
      )}

      {/* Processing Overlay — Sazon "thinking" during scan */}
      {processing && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-white dark:bg-gray-800 p-8 rounded-lg items-center">
            <LoadingState
              message={mode === 'food' ? 'Analyzing food photo...' : 'Looking up product...'}
              expression="thinking"
              size="medium"
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Scanning frame ───────────────────────────────────────────────────────────
  scanDimTop: {
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: PRIMARY_RED,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: PRIMARY_RED,
    opacity: 0.85,
    borderRadius: 1,
  },
  // ── No-match state ──────────────────────────────────────────────────────────
  noMatchContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  noMatchTitle: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  noMatchSubtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  noMatchSearchBtn: {
    marginTop: 24,
    backgroundColor: PRIMARY_RED,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noMatchSearchBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  noMatchRetryBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  noMatchRetryText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
