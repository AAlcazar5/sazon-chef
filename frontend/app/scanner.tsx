// frontend/app/scanner.tsx
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
// Scanner screen for ingredient scanning and food recognition (Phase 6, Group 13)

import { View, Text, Alert, ScrollView, Animated, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import AnimatedActivityIndicator from '../components/ui/AnimatedActivityIndicator';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MotiView } from 'moti';
import { CameraView, CameraType, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scannerApi, shoppingListApi, foodApi } from '../lib/api';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import LoadingState from '../components/ui/LoadingState';
import LogoMascot from '../components/mascot/LogoMascot';
import Sazon from '../components/mascot/Sazon';
import { Colors, DarkColors, MACRO_COLORS } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { BorderRadius } from '../constants/Spacing';
import Icon from '../components/ui/Icon';
import { Icons } from '../constants/Icons';
import { useLocalSearchParams } from 'expo-router';

type ScannerMode = 'food' | 'barcode';

interface FoodRecognitionResult {
  foods: Array<{
    name: string;
    confidence: number;
    estimatedCalories: number;
    estimatedProtein: number;
    estimatedCarbs: number;
    estimatedFat: number;
    estimatedFiber: number;
    estimatedPortion?: string;
    portionGrams?: number;
    ingredients?: string[];
  }>;
  totalEstimatedCalories: number;
  totalEstimatedProtein: number;
  totalEstimatedCarbs: number;
  totalEstimatedFat: number;
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

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

function getDefaultMealSlot(): MealSlot {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

export default function ScannerScreen() {
  const params = useLocalSearchParams<{ mealType?: string; fromMealPlan?: string }>();
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

  // 10M: Snap to Log state
  const [foodServings, setFoodServings] = useState<Record<number, number>>({});
  const [removedFoods, setRemovedFoods] = useState<Set<number>>(new Set());
  const [selectedMealSlot, setSelectedMealSlot] = useState<MealSlot>(
    (params.mealType as MealSlot) || getDefaultMealSlot()
  );
  const [loggingMeal, setLoggingMeal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      Alert.alert('Oops!', 'Couldn\'t add that item — try again?');
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
      Alert.alert('Oops!', 'Couldn\'t capture the photo — try again?');
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
      Alert.alert('Oops!', 'Couldn\'t load that image — try another one?');
    }
  };

  const processPhoto = async (uri: string) => {
    try {
      setProcessing(true);
      setNoMatch(false);
      setErrorMessage(null);
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

      // Extract error code + message from API response
      const apiCode = error?.response?.data?.code;
      const apiMessage = error?.response?.data?.message;

      if (apiCode === 'not_food') {
        setErrorMessage("Hmm, I can't tell what food that is. Try a clearer photo with the food front and center!");
      } else if (apiCode === 'rate_limit') {
        setErrorMessage("Whoa, slow down! I'm a bit overwhelmed right now. Give me a sec and try again.");
      } else if (apiCode === 'auth_error' || apiCode === 'no_provider') {
        setErrorMessage("Food recognition isn't available right now. Try scanning a barcode instead!");
      } else if (apiMessage) {
        setErrorMessage(apiMessage);
      } else {
        setErrorMessage("Something went wrong analyzing that photo. Want to try again?");
      }

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
    setErrorMessage(null);
    setFoodServings({});
    setRemovedFoods(new Set());
    setLoggingMeal(false);
  };

  // 10M: Serving adjustment helpers
  const getFoodServing = (index: number) => foodServings[index] ?? 1;
  const adjustFoodServing = (index: number, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFoodServings((prev) => ({
      ...prev,
      [index]: Math.max(0.5, Math.round(((prev[index] ?? 1) + delta) * 10) / 10),
    }));
  };

  const removeFood = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRemovedFoods((prev) => new Set([...prev, index]));
  };

  // 10M: Compute totals from visible (non-removed) foods with serving adjustments
  const getVisibleFoods = () => {
    if (!result || !('foods' in result)) return [];
    return result.foods
      .map((food, i) => ({ ...food, originalIndex: i }))
      .filter((_, i) => !removedFoods.has(i));
  };

  const getAdjustedTotals = () => {
    const visible = getVisibleFoods();
    return {
      calories: Math.round(visible.reduce((s, f) => s + f.estimatedCalories * getFoodServing(f.originalIndex), 0)),
      protein: Math.round(visible.reduce((s, f) => s + f.estimatedProtein * getFoodServing(f.originalIndex), 0) * 10) / 10,
      carbs: Math.round(visible.reduce((s, f) => s + f.estimatedCarbs * getFoodServing(f.originalIndex), 0) * 10) / 10,
      fat: Math.round(visible.reduce((s, f) => s + f.estimatedFat * getFoodServing(f.originalIndex), 0) * 10) / 10,
    };
  };

  // 10M: Log This Meal handler — cache each food as FoodItem, create Meal entry
  const handleLogMeal = async () => {
    if (!result || !('foods' in result) || loggingMeal) return;
    setLoggingMeal(true);

    try {
      const visible = getVisibleFoods();
      const totals = getAdjustedTotals();

      // Cache each detected food as a FoodItem, then log as a single combined meal
      const createdItem = await foodApi.createItem({
        name: result.mealDescription || visible.map((f) => f.name).join(', '),
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
      });

      const foodItem = createdItem.data.foodItem;

      await foodApi.logFood({
        foodItemId: foodItem.id,
        mealType: selectedMealSlot,
        servings: 1,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Logged!', `${result.mealDescription} added to ${selectedMealSlot}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Log meal error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Oops!', 'Couldn\'t log that meal — try again?');
    } finally {
      setLoggingMeal(false);
    }
  };

  // ── Permission states ────────────────────────────────────────────────────────

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <LoadingState message="Setting up your camera..." expression="curious" size="small" />
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
        <GradientButton
          label="Grant Permission"
          onPress={requestPermission}
          colors={GradientPresets.brand}
          icon="camera"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Mode Selector */}
      <View className="flex-row bg-gray-900 px-4 py-2">
        <HapticTouchableOpacity
          onPress={() => { setMode('food'); reset(); }}
          accessibilityRole="tab"
          accessibilityLabel="Food photo mode"
          accessibilityState={{ selected: mode === 'food' }}
          className={`flex-1 py-2 px-4 rounded-lg mr-2 ${mode === 'food' ? 'bg-red-600 dark:bg-red-400' : 'bg-gray-700'}`}
        >
          <Text className={`text-center font-semibold ${mode === 'food' ? 'text-white' : 'text-gray-300'}`}>
            📸 Food Photo
          </Text>
        </HapticTouchableOpacity>
        <HapticTouchableOpacity
          onPress={() => { setMode('barcode'); reset(); }}
          accessibilityRole="tab"
          accessibilityLabel="Barcode mode"
          accessibilityState={{ selected: mode === 'barcode' }}
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
                  accessibilityRole="button"
                  accessibilityLabel="Pick an image from your library"
                  className="w-16 h-16 rounded-full bg-gray-700 items-center justify-center"
                >
                  <Ionicons name="images-outline" size={32} color="white" />
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={handleTakePhoto}
                  disabled={scanning || processing}
                  hapticStyle="medium"
                  accessibilityRole="button"
                  accessibilityLabel={scanning || processing ? 'Scanning food' : 'Take photo'}
                  accessibilityState={{ disabled: scanning || processing, busy: scanning || processing }}
                  className="w-20 h-20 rounded-full bg-red-600 dark:bg-red-400 items-center justify-center border-4 border-white"
                >
                  {scanning || processing ? (
                    <AnimatedActivityIndicator size="small" color="white" />
                  ) : (
                    <View className="w-16 h-16 rounded-full bg-white" />
                  )}
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel="Close scanner"
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
          <Sazon variant="orange" motion="jiggle" fx={['question']} size={96} />
          <Text style={styles.noMatchTitle}>Couldn't find that one</Text>
          <Text style={styles.noMatchSubtitle}>
            {errorMessage || 'Try searching by name instead?'}
          </Text>
          <HapticTouchableOpacity
            onPress={reset}
            accessibilityRole="button"
            accessibilityLabel="Try scanning again"
            style={styles.noMatchSearchBtn}
            hapticStyle="medium"
          >
            <Ionicons name="camera-outline" size={18} color="white" />
            <Text style={styles.noMatchSearchBtnText}>Try Again</Text>
          </HapticTouchableOpacity>
          <HapticTouchableOpacity
            onPress={() => router.replace('/' as any)}
            accessibilityRole="button"
            accessibilityLabel="Search by name instead"
            style={styles.noMatchRetryBtn}
          >
            <Text style={styles.noMatchRetryText}>Search by name instead</Text>
          </HapticTouchableOpacity>
        </View>
      )}

      {/* Results View — spring-scales in */}
      {result && (
        <Animated.View style={[{ flex: 1 }, { transform: [{ scale: resultScale }] }]}>
          <ScrollView className="flex-1 bg-white">
            <View className="p-4">
              {/* Header */}
              <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 0, damping: 18, stiffness: 200 }}
              >
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-2xl font-bold text-gray-900">Results</Text>
                  <HapticTouchableOpacity
                    onPress={reset}
                    accessibilityRole="button"
                    accessibilityLabel="Close results"
                  >
                    <Ionicons name="close-circle" size={32} color="#9CA3AF" />
                  </HapticTouchableOpacity>
                </View>
              </MotiView>

              {/* Image Preview with floating labels */}
              {imageUri && (
                <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'spring', delay: 80, damping: 18, stiffness: 200 }}
                >
                  <View style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: imageUri }}
                      className="w-full h-48 rounded-xl"
                      style={Shadows.MD}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                    />
                    {/* Floating glassmorphic labels */}
                    {mode === 'food' && 'foods' in result && (
                      <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {result.foods.map((food, index) => (
                          <MotiView
                            key={index}
                            from={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', delay: 200 + index * 120, damping: 14, stiffness: 260 }}
                          >
                            {Platform.OS === 'ios' ? (
                              <BlurView intensity={25} tint="dark" style={{ borderRadius: 100, overflow: 'hidden' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 }}>
                                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{food.name}</Text>
                                  <Text style={{ color: '#4ADE80', fontSize: 13, marginLeft: 4 }}>✓</Text>
                                </View>
                              </BlurView>
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 100 }}>
                                <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{food.name}</Text>
                                <Text style={{ color: '#4ADE80', fontSize: 13, marginLeft: 4 }}>✓</Text>
                              </View>
                            )}
                          </MotiView>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={{ height: 16 }} />
                </MotiView>
              )}

              {/* Food Recognition Results — 10M enhanced with macros, portions, log */}
              {mode === 'food' && 'foods' in result && (() => {
                const totals = getAdjustedTotals();
                const visibleFoods = getVisibleFoods();
                return (
                  <View>
                    {/* Meal summary with full macros */}
                    <MotiView
                      from={{ opacity: 0, translateY: 10 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: 'spring', delay: 160, damping: 18, stiffness: 200 }}
                    >
                      <View style={[{ padding: 16, borderRadius: BorderRadius.card, backgroundColor: '#FFF5F0', marginBottom: 16 }, Shadows.MD]}>
                        <Text style={{ fontSize: 17, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1F2937', marginBottom: 4 }}>
                          {result.mealDescription}
                        </Text>
                        <Text style={{ fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold', color: MACRO_COLORS.calories.accent, marginBottom: 12 }}>
                          {totals.calories} cal
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                          {([
                            { label: 'Protein', value: `${totals.protein}g`, color: MACRO_COLORS.protein },
                            { label: 'Carbs', value: `${totals.carbs}g`, color: MACRO_COLORS.carbs },
                            { label: 'Fat', value: `${totals.fat}g`, color: MACRO_COLORS.fat },
                          ] as const).map(({ label, value, color }) => (
                            <View key={label} style={{ alignItems: 'center' }}>
                              <Text style={{ fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: color.accent }}>{value}</Text>
                              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{label}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </MotiView>

                    {/* Per-food cards with serving steppers */}
                    <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#1F2937', marginBottom: 8 }}>
                      Food Items ({visibleFoods.length})
                    </Text>
                    {result.foods.map((food, index) => {
                      if (removedFoods.has(index)) return null;
                      const s = getFoodServing(index);
                      return (
                        <MotiView
                          key={index}
                          from={{ opacity: 0, translateY: 8 }}
                          animate={{ opacity: 1, translateY: 0 }}
                          transition={{ type: 'spring', delay: 240 + index * 80, damping: 18, stiffness: 200 }}
                        >
                          <View style={[{ padding: 14, borderRadius: BorderRadius.card, backgroundColor: '#FFFFFF', marginBottom: 10 }, Shadows.SM]}>
                            {/* Name + remove */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1F2937' }}>{food.name}</Text>
                                {food.estimatedPortion && (
                                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                                    {food.estimatedPortion}{food.portionGrams ? ` (${food.portionGrams}g)` : ''}
                                  </Text>
                                )}
                              </View>
                              <HapticTouchableOpacity
                                onPress={() => removeFood(index)}
                                pressedScale={0.9}
                                accessibilityLabel={`Remove ${food.name}`}
                              >
                                <Ionicons name="close-circle" size={24} color="#D1D5DB" />
                              </HapticTouchableOpacity>
                            </View>

                            {/* Scaled macros */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
                              {([
                                { label: 'Cal', value: Math.round(food.estimatedCalories * s), color: MACRO_COLORS.calories },
                                { label: 'P', value: Math.round(food.estimatedProtein * s * 10) / 10, color: MACRO_COLORS.protein },
                                { label: 'C', value: Math.round(food.estimatedCarbs * s * 10) / 10, color: MACRO_COLORS.carbs },
                                { label: 'F', value: Math.round(food.estimatedFat * s * 10) / 10, color: MACRO_COLORS.fat },
                              ] as const).map(({ label, value, color }) => (
                                <View key={label} style={{ alignItems: 'center' }}>
                                  <Text style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: color.accent }}>{value}</Text>
                                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</Text>
                                </View>
                              ))}
                            </View>

                            {/* Serving stepper */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F4F0', borderRadius: 12, paddingVertical: 6 }}>
                              {[0.5, 1, 1.5, 2].map((val) => (
                                <HapticTouchableOpacity
                                  key={val}
                                  onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setFoodServings((prev) => ({ ...prev, [index]: val }));
                                  }}
                                  pressedScale={0.9}
                                  accessibilityLabel={`${val}x serving`}
                                  style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 6,
                                    borderRadius: 12,
                                    backgroundColor: s === val ? MACRO_COLORS.calories.accent : 'transparent',
                                    marginHorizontal: 2,
                                  }}
                                >
                                  <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: s === val ? '#FFFFFF' : '#6B7280' }}>
                                    {val === 0.5 ? '½' : `${val}`}×
                                  </Text>
                                </HapticTouchableOpacity>
                              ))}
                            </View>
                          </View>
                        </MotiView>
                      );
                    })}

                    {/* Add an item the AI missed */}
                    <HapticTouchableOpacity
                      onPress={() => router.push('/scanner-results?addFood=1' as any)}
                      pressedScale={0.97}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginBottom: 8 }}
                      accessibilityLabel="Add a food item"
                    >
                      <Ionicons name="add-circle-outline" size={20} color={MACRO_COLORS.calories.accent} />
                      <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: MACRO_COLORS.calories.accent, marginLeft: 6 }}>
                        Add an item the AI missed
                      </Text>
                    </HapticTouchableOpacity>

                    {/* Meal slot picker */}
                    <View style={{ marginTop: 4, marginBottom: 8 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Log to
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((slot) => (
                          <HapticTouchableOpacity
                            key={slot}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setSelectedMealSlot(slot);
                            }}
                            pressedScale={0.95}
                            accessibilityLabel={`Log to ${slot}`}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 12,
                              backgroundColor: selectedMealSlot === slot ? MACRO_COLORS.calories.accent : '#F0EDE8',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{
                              fontSize: 13,
                              fontFamily: 'PlusJakartaSans_600SemiBold',
                              color: selectedMealSlot === slot ? '#FFFFFF' : '#6B7280',
                              textTransform: 'capitalize',
                            }}>
                              {slot}
                            </Text>
                          </HapticTouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })()}

              {/* Barcode Results */}
              {mode === 'barcode' && 'productName' in result && (
                <View>
                  <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'spring', delay: 160, damping: 18, stiffness: 200 }}
                  >
                    <View className="bg-blue-50 p-4 rounded-xl mb-4" style={Shadows.MD}>
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
                          contentFit="contain"
                          cachePolicy="memory-disk"
                          transition={200}
                        />
                      )}
                    </View>
                  </MotiView>

                  <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'spring', delay: 240, damping: 18, stiffness: 200 }}
                  >
                    <Text className="text-lg font-semibold text-gray-900 mb-2">Nutrition Information:</Text>
                    <View className="bg-surface p-4 rounded-xl mb-2" style={Shadows.SM}>
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
                  </MotiView>

                  {result.ingredients && result.ingredients.length > 0 && (
                    <MotiView
                      from={{ opacity: 0, translateY: 8 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: 'spring', delay: 320, damping: 18, stiffness: 200 }}
                    >
                      <View className="mt-2">
                        <Text className="text-sm font-semibold text-gray-700 mb-1">Ingredients:</Text>
                        <Text className="text-sm text-gray-600">{result.ingredients.join(', ')}</Text>
                      </View>
                    </MotiView>
                  )}
                </View>
              )}

              {/* Smart Action Buttons */}
              <View style={{ marginTop: 20, gap: 10 }}>
                {/* 10M: Log This Meal — most prominent */}
                {mode === 'food' && 'foods' in result && (
                  <HapticTouchableOpacity
                    onPress={handleLogMeal}
                    disabled={loggingMeal || getVisibleFoods().length === 0}
                    pressedScale={0.97}
                    accessibilityLabel="Log this meal"
                    style={[
                      {
                        paddingVertical: 16,
                        borderRadius: BorderRadius.xl,
                        backgroundColor: MACRO_COLORS.calories.accent,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: loggingMeal ? 0.6 : 1,
                        gap: 8,
                      },
                      Shadows.MD,
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={22} color="white" />
                    <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' }}>
                      {loggingMeal ? 'Logging...' : 'Log This Meal'}
                    </Text>
                  </HapticTouchableOpacity>
                )}

                <HapticTouchableOpacity
                  onPress={handleAddToShoppingList}
                  disabled={addingToList}
                  pressedScale={0.97}
                  accessibilityLabel="Add to shopping list"
                  style={{
                    paddingVertical: 13,
                    borderRadius: 12,
                    backgroundColor: '#16A34A',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {addingToList ? (
                    <AnimatedActivityIndicator size="small" color="white" />
                  ) : (
                    <Icon name={Icons.CART} size={20} color="white" />
                  )}
                  <Text style={{ color: 'white', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
                    {addingToList ? 'Adding...' : 'Add to Shopping List'}
                  </Text>
                </HapticTouchableOpacity>

                <GradientButton
                  label="Find Recipes"
                  onPress={handleFindRecipes}
                  icon="search"
                />

                <GradientButton
                  label="Scan Again"
                  onPress={reset}
                  colors={GradientPresets.fire}
                  icon="scan"
                />
                <HapticTouchableOpacity
                  onPress={() => router.back()}
                  pressedScale={0.97}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                  style={{ paddingVertical: 13, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center' }}
                >
                  <Text style={{ color: '#374151', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>Done</Text>
                </HapticTouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* Processing Overlay — frosted glass + Sazon "thinking" */}
      {processing && (
        <View className="absolute inset-0 items-center justify-center" style={{ zIndex: 20 }}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
          )}
          <LinearGradient
            colors={['rgba(220,38,38,0.12)', 'transparent']}
            style={[StyleSheet.absoluteFill]}
            pointerEvents="none"
          />
          <View className="rounded-2xl p-8 items-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)', ...Shadows.LG }}>
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
    color: DarkColors.text.primary,
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
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
    fontFamily: 'PlusJakartaSans_600SemiBold',
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
