// frontend/components/meal-plan/LogFoodSheet.tsx
// 10L: Branded Food & Restaurant Tracking — search, recent, frequent, serve & log

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from 'react-native';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { useModalAnimation } from '../../hooks/useModalAnimation';
import { Colors, DarkColors, MACRO_COLORS } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import { foodApi } from '../../lib/api';
import type { FoodItem } from '../../types';

interface LogFoodSheetProps {
  visible: boolean;
  onClose: () => void;
  onFoodLogged: () => void;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

type SheetView = 'search' | 'confirm' | 'manual';

export default function LogFoodSheet({
  visible,
  onClose,
  onFoodLogged,
  mealType,
}: LogFoodSheetProps) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const { contentStyle } = useModalAnimation(visible);

  const [view, setView] = useState<SheetView>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);
  const [logging, setLogging] = useState(false);

  // Manual entry state
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent + frequent on mount
  useEffect(() => {
    if (!visible) return;
    setView('search');
    setQuery('');
    setResults([]);
    setSelectedFood(null);
    setServings(1);

    Promise.all([
      foodApi.getRecent().catch(() => ({ data: { items: [] } })),
      foodApi.getFrequent().catch(() => ({ data: { items: [] } })),
    ]).then(([recentRes, frequentRes]) => {
      setRecentFoods(recentRes.data.items ?? []);
      setFrequentFoods(frequentRes.data.items ?? []);
    });
  }, [visible]);

  // Debounced search
  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!text.trim()) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await foodApi.search(text.trim());
        setResults(res.data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleSelectFood = (food: FoodItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFood(food);
    setServings(1);
    setView('confirm');
  };

  const handleLogFood = async () => {
    if (!selectedFood || logging) return;
    setLogging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await foodApi.logFood({
        foodItemId: selectedFood.id,
        mealType,
        servings,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onFoodLogged();
      onClose();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLogging(false);
    }
  };

  const handleManualSubmit = async () => {
    const cals = parseFloat(manualCalories);
    if (!manualName.trim() || isNaN(cals)) return;

    setLogging(true);
    try {
      const res = await foodApi.createItem({
        name: manualName.trim(),
        calories: cals,
        protein: parseFloat(manualProtein) || 0,
        carbs: parseFloat(manualCarbs) || 0,
        fat: parseFloat(manualFat) || 0,
      });
      const created = res.data.foodItem as FoodItem;
      await foodApi.logFood({
        foodItemId: created.id,
        mealType,
        servings: 1,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onFoodLogged();
      onClose();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLogging(false);
    }
  };

  const adjustServings = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setServings((prev) => Math.max(0.5, Math.round((prev + delta) * 10) / 10));
  };

  const scaledMacro = (value: number) => Math.round(value * servings);

  const bg = isDark ? DarkColors.background : '#FAF7F4';
  const cardBg = isDark ? DarkColors.card : '#FFFFFF';
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const renderFoodRow = (food: FoodItem) => (
    <HapticTouchableOpacity
      key={food.id}
      onPress={() => handleSelectFood(food)}
      pressedScale={0.97}
      accessibilityLabel={`${food.name}, ${food.calories} calories`}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          marginHorizontal: 16,
          marginVertical: 4,
          borderRadius: BorderRadius.card,
          backgroundColor: cardBg,
        },
        Shadows.SM,
      ]}
    >
      {food.imageUrl ? (
        <Image
          source={{ uri: food.imageUrl }}
          style={{ width: 44, height: 44, borderRadius: 12, marginRight: 12 }}
        />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            marginRight: 12,
            backgroundColor: isDark ? '#333' : '#F0EDE8',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="restaurant-outline" size={20} color={textSecondary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', color: textPrimary }}
          numberOfLines={1}
        >
          {food.name}
        </Text>
        {food.brand && (
          <Text style={{ fontSize: 13, color: textSecondary, marginTop: 1 }}>
            {food.brand}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: MACRO_COLORS.calories.accent }}>
          {food.calories}
        </Text>
        <Text style={{ fontSize: 11, color: textSecondary }}>cal</Text>
      </View>
    </HapticTouchableOpacity>
  );

  // SEARCH VIEW
  const renderSearchView = () => (
    <>
      {/* Search bar */}
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 16,
            marginBottom: 12,
            paddingHorizontal: 14,
            borderRadius: BorderRadius.input,
            backgroundColor: isDark ? '#2A2A2A' : '#F0EDE8',
            height: 46,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={textSecondary} />
        <TextInput
          placeholder="Search branded food or restaurant..."
          placeholderTextColor={textSecondary}
          value={query}
          onChangeText={handleSearch}
          style={{
            flex: 1,
            marginLeft: 10,
            fontSize: 15,
            color: textPrimary,
          }}
          autoFocus
          returnKeyType="search"
          accessibilityLabel="Search food"
        />
        {loading && <AnimatedActivityIndicator size="small" />}
      </View>

      {/* Results or recent/frequent */}
      {query.trim() ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderFoodRow(item)}
          ListEmptyComponent={
            !loading ? (
              <Text
                style={{
                  textAlign: 'center',
                  marginTop: 24,
                  color: textSecondary,
                  fontSize: 14,
                }}
              >
                No results found
              </Text>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {recentFoods.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: 'PlusJakartaSans_700Bold',
                      color: textSecondary,
                      marginHorizontal: 16,
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Recent Foods
                  </Text>
                  {recentFoods.map(renderFoodRow)}
                </View>
              )}
              {frequentFoods.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: 'PlusJakartaSans_700Bold',
                      color: textSecondary,
                      marginHorizontal: 16,
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Frequent Foods
                  </Text>
                  {frequentFoods.map(renderFoodRow)}
                </View>
              )}
            </>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Can't find it? */}
      <HapticTouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setView('manual');
        }}
        pressedScale={0.97}
        accessibilityLabel="Add food manually"
        style={{
          paddingVertical: 14,
          alignItems: 'center',
          borderTopWidth: 0.5,
          borderTopColor: isDark ? '#333' : '#E5E0DA',
        }}
      >
        <Text style={{ fontSize: 14, color: MACRO_COLORS.calories.accent, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
          Can't find it? Add your own
        </Text>
      </HapticTouchableOpacity>
    </>
  );

  // CONFIRM VIEW
  const renderConfirmView = () => {
    if (!selectedFood) return null;

    return (
      <View style={{ flex: 1 }}>
        <HapticTouchableOpacity
          onPress={() => {
            setView('search');
            setSelectedFood(null);
          }}
          pressedScale={0.97}
          style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16 }}
        >
          <Ionicons name="chevron-back" size={20} color={MACRO_COLORS.calories.accent} />
          <Text style={{ fontSize: 14, color: MACRO_COLORS.calories.accent, marginLeft: 4 }}>
            Back to search
          </Text>
        </HapticTouchableOpacity>

        {/* Food info */}
        <View
          style={[
            {
              marginHorizontal: 16,
              padding: 16,
              borderRadius: BorderRadius.card,
              backgroundColor: cardBg,
            },
            Shadows.MD,
          ]}
        >
          <Text style={{ fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: textPrimary, marginBottom: 4 }}>
            {selectedFood.name}
          </Text>
          {selectedFood.brand && (
            <Text style={{ fontSize: 14, color: textSecondary, marginBottom: 8 }}>
              {selectedFood.brand}
            </Text>
          )}
          {selectedFood.servingSize && (
            <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 12 }}>
              Serving: {selectedFood.servingSize}
            </Text>
          )}

          {/* Serving stepper */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              paddingVertical: 10,
              backgroundColor: isDark ? '#2A2A2A' : '#F7F4F0',
              borderRadius: BorderRadius.md,
            }}
          >
            <HapticTouchableOpacity
              onPress={() => adjustServings(-0.5)}
              pressedScale={0.9}
              accessibilityLabel="Decrease servings"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? '#444' : '#E5E0DA',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', color: textPrimary }}>−</Text>
            </HapticTouchableOpacity>

            <Text
              style={{
                fontSize: 20,
                fontFamily: 'PlusJakartaSans_700Bold',
                color: textPrimary,
                marginHorizontal: 24,
              }}
              accessibilityLabel={`${servings} serving${servings !== 1 ? 's' : ''}`}
            >
              {servings} serving{servings !== 1 ? 's' : ''}
            </Text>

            <HapticTouchableOpacity
              onPress={() => adjustServings(0.5)}
              pressedScale={0.9}
              accessibilityLabel="Increase servings"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? '#444' : '#E5E0DA',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', color: textPrimary }}>+</Text>
            </HapticTouchableOpacity>
          </View>

          {/* Macro badges */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {([
              { label: 'Cal', value: scaledMacro(selectedFood.calories), color: MACRO_COLORS.calories },
              { label: 'Protein', value: scaledMacro(selectedFood.protein), color: MACRO_COLORS.protein },
              { label: 'Carbs', value: scaledMacro(selectedFood.carbs), color: MACRO_COLORS.carbs },
              { label: 'Fat', value: scaledMacro(selectedFood.fat), color: MACRO_COLORS.fat },
            ] as const).map(({ label, value, color }) => (
              <View key={label} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: color.accent }}>
                  {value}
                </Text>
                <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Log button */}
        <HapticTouchableOpacity
          onPress={handleLogFood}
          pressedScale={0.97}
          accessibilityLabel={`Log ${selectedFood.name}`}
          style={[
            {
              marginHorizontal: 16,
              marginTop: 20,
              paddingVertical: 16,
              borderRadius: BorderRadius.xl,
              backgroundColor: MACRO_COLORS.calories.accent,
              alignItems: 'center',
              opacity: logging ? 0.6 : 1,
            },
            Shadows.MD,
          ]}
        >
          <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' }}>
            {logging ? 'Logging...' : `Log ${mealType}`}
          </Text>
        </HapticTouchableOpacity>
      </View>
    );
  };

  // MANUAL ENTRY VIEW
  const renderManualView = () => (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      <HapticTouchableOpacity
        onPress={() => setView('search')}
        pressedScale={0.97}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
      >
        <Ionicons name="chevron-back" size={20} color={MACRO_COLORS.calories.accent} />
        <Text style={{ fontSize: 14, color: MACRO_COLORS.calories.accent, marginLeft: 4 }}>
          Back to search
        </Text>
      </HapticTouchableOpacity>

      <Text style={{ fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: textPrimary, marginBottom: 16 }}>
        Add your own food
      </Text>

      {([
        { label: 'Food name', value: manualName, setter: setManualName, keyboard: 'default' as const },
        { label: 'Calories', value: manualCalories, setter: setManualCalories, keyboard: 'numeric' as const },
        { label: 'Protein (g)', value: manualProtein, setter: setManualProtein, keyboard: 'numeric' as const },
        { label: 'Carbs (g)', value: manualCarbs, setter: setManualCarbs, keyboard: 'numeric' as const },
        { label: 'Fat (g)', value: manualFat, setter: setManualFat, keyboard: 'numeric' as const },
      ] as const).map(({ label, value, setter, keyboard }) => (
        <View key={label} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 4 }}>{label}</Text>
          <TextInput
            value={value}
            onChangeText={setter}
            keyboardType={keyboard}
            placeholder={label}
            placeholderTextColor={isDark ? '#666' : '#BBB'}
            style={{
              borderRadius: BorderRadius.input,
              backgroundColor: isDark ? '#2A2A2A' : '#F0EDE8',
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: textPrimary,
            }}
          />
        </View>
      ))}

      <HapticTouchableOpacity
        onPress={handleManualSubmit}
        pressedScale={0.97}
        accessibilityLabel="Save and log food"
        style={[
          {
            marginTop: 8,
            paddingVertical: 16,
            borderRadius: BorderRadius.xl,
            backgroundColor: MACRO_COLORS.calories.accent,
            alignItems: 'center',
            opacity: logging || !manualName.trim() || !manualCalories ? 0.5 : 1,
          },
          Shadows.MD,
        ]}
      >
        <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' }}>
          {logging ? 'Saving...' : 'Save & Log'}
        </Text>
      </HapticTouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <HapticTouchableOpacity
            onPress={onClose}
            pressedScale={1}
            style={{ flex: 1 }}
            accessibilityLabel="Close"
          />
          <Animated.View
            style={[
              {
                backgroundColor: bg,
                borderTopLeftRadius: BorderRadius.sheet,
                borderTopRightRadius: BorderRadius.sheet,
                maxHeight: '85%',
                minHeight: 400,
                paddingTop: 12,
                paddingBottom: Platform.OS === 'ios' ? 34 : 16,
              },
              contentStyle,
            ]}
          >
            {/* Handle bar */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark ? '#555' : '#D5D0CA',
                alignSelf: 'center',
                marginBottom: 12,
              }}
            />

            {/* Title */}
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'PlusJakartaSans_800ExtraBold',
                color: textPrimary,
                marginHorizontal: 16,
                marginBottom: 14,
              }}
            >
              Log Food
            </Text>

            {view === 'search' && renderSearchView()}
            {view === 'confirm' && renderConfirmView()}
            {view === 'manual' && renderManualView()}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
