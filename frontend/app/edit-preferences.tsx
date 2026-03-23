import { View, Text, TextInput, Alert, ScrollView, Animated } from 'react-native';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useColorScheme } from 'nativewind';
import { userApi } from '../lib/api';
import { SUPERFOOD_CATEGORIES } from '../constants/Superfoods';
import { Colors, DarkColors } from '../constants/Colors';
import { getCategoryColor } from '../constants/CategoryColors';
import { Shadows } from '../constants/Shadows';
import { HapticPatterns } from '../constants/Haptics';
import * as Haptics from 'expo-haptics';

const CUISINE_OPTIONS = [
  { id: 'Italian', label: 'Italian', emoji: '🍝' },
  { id: 'Mexican', label: 'Mexican', emoji: '🌮' },
  { id: 'Asian', label: 'Asian', emoji: '🍜' },
  { id: 'Mediterranean', label: 'Mediterranean', emoji: '🫒' },
  { id: 'American', label: 'American', emoji: '🍔' },
  { id: 'Indian', label: 'Indian', emoji: '🍛' },
  { id: 'Middle Eastern', label: 'Middle Eastern', emoji: '🧆' },
  { id: 'Latin American', label: 'Latin American', emoji: '🥘' },
];

const DIETARY_OPTIONS = [
  { id: 'Vegetarian', label: 'Vegetarian', emoji: '🥗' },
  { id: 'Vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'Gluten-free', label: 'Gluten-free', emoji: '🌾' },
  { id: 'Dairy-free', label: 'Dairy-free', emoji: '🥛' },
  { id: 'Nut-free', label: 'Nut-free', emoji: '🥜' },
  { id: 'Kosher', label: 'Kosher', emoji: '✡️' },
  { id: 'Halal', label: 'Halal', emoji: '☪️' },
];

const SPICE_LEVELS = ['mild', 'medium', 'spicy'];

// ── Cuisine chip with spring-scale animation ───────────────────────────────
function CuisineChip({
  item,
  isSelected,
  onToggle,
  isDark,
}: {
  item: (typeof CUISINE_OPTIONS)[number];
  isSelected: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.87, friction: 5, tension: 300, useNativeDriver: true }).start();

  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();

  const catColor = getCategoryColor(item.id);

  return (
    <Animated.View style={{ transform: [{ scale }], marginRight: 8, marginBottom: 8 }}>
      <HapticTouchableOpacity
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onToggle}
        style={{
          paddingHorizontal: 13,
          paddingVertical: 9,
          borderRadius: 100,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          backgroundColor: isSelected
            ? (isDark ? catColor.bgDark : catColor.bg)
            : (isDark ? '#374151' : '#E5E7EB'),
          borderWidth: isSelected ? 1.5 : 0,
          borderColor: isSelected ? (isDark ? catColor.textDark : catColor.text) : 'transparent',
        }}
      >
        <Text style={{ fontSize: 15 }}>{item.emoji}</Text>
        <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? (isDark ? catColor.textDark : catColor.text) : (isDark ? '#D1D5DB' : '#374151') }}>
          {item.label}
        </Text>
        {isSelected && <Ionicons name="checkmark" size={13} color={isDark ? catColor.textDark : catColor.text} />}
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

export default function EditPreferencesScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [bannedIngredients, setBannedIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [likedCuisines, setLikedCuisines] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  // severity per restriction id: 'strict' = "I'm allergic", 'prefer_avoid' = "I try to avoid"
  const [dietarySeverities, setDietarySeverities] = useState<Record<string, 'strict' | 'prefer_avoid'>>({});
  const [preferredSuperfoods, setPreferredSuperfoods] = useState<string[]>([]);
  const [cookTimePreference, setCookTimePreference] = useState('30');
  const [spiceLevel, setSpiceLevel] = useState('medium');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoadingData(true);
      const response = await userApi.getPreferences();
      const prefs = response.data;

      setBannedIngredients(
        prefs.bannedIngredients?.map((i: any) => (typeof i === 'string' ? i : i.name)) || []
      );
      setLikedCuisines(
        prefs.likedCuisines?.map((c: any) => (typeof c === 'string' ? c : c.name)) || []
      );

      const names: string[] = [];
      const severities: Record<string, 'strict' | 'prefer_avoid'> = {};
      (prefs.dietaryRestrictions || []).forEach((d: any) => {
        const name = typeof d === 'string' ? d : d.name;
        const sev: 'strict' | 'prefer_avoid' =
          typeof d === 'string' ? 'strict' : (d.severity || 'strict');
        names.push(name);
        severities[name] = sev;
      });
      setDietaryRestrictions(names);
      setDietarySeverities(severities);

      setPreferredSuperfoods(
        prefs.preferredSuperfoods?.map((sf: any) => (typeof sf === 'string' ? sf : sf.category)) || []
      );
      setCookTimePreference(prefs.cookTimePreference?.toString() || '30');
      setSpiceLevel(prefs.spiceLevel || 'medium');
    } catch (error: any) {
      HapticPatterns.error();
      Alert.alert('Oops!', error.message || 'Couldn\'t load your preferences — try again?');
    } finally {
      setLoadingData(false);
    }
  };

  const addBannedIngredient = () => {
    const trimmed = newIngredient.trim();
    if (trimmed && !bannedIngredients.includes(trimmed)) {
      setBannedIngredients([...bannedIngredients, trimmed]);
      setNewIngredient('');
    }
  };

  const removeBannedIngredient = useCallback((ingredient: string) => {
    setBannedIngredients(prev => prev.filter(i => i !== ingredient));
  }, []);

  const toggleCuisine = useCallback((id: string) => {
    setLikedCuisines(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }, []);

  const toggleDietary = useCallback((id: string) => {
    setDietaryRestrictions(prev => {
      if (prev.includes(id)) return prev.filter(d => d !== id);
      // Default to 'strict' when first selected
      setDietarySeverities(s => ({ ...s, [id]: s[id] || 'strict' }));
      return [...prev, id];
    });
  }, []);

  const toggleSeverity = useCallback((id: string) => {
    setDietarySeverities(prev => ({
      ...prev,
      [id]: prev[id] === 'prefer_avoid' ? 'strict' : 'prefer_avoid',
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const toggleSuperfood = useCallback((category: string) => {
    setPreferredSuperfoods(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  }, []);

  const handleSave = async () => {
    if (!cookTimePreference || isNaN(Number(cookTimePreference))) {
      HapticPatterns.error();
      Alert.alert('Hold On', 'Please enter a valid cook time');
      return;
    }
    const cookTime = parseInt(cookTimePreference);
    if (cookTime < 5 || cookTime > 300) {
      HapticPatterns.error();
      Alert.alert('Hold On', 'Cook time must be between 5 and 300 minutes');
      return;
    }

    try {
      setLoading(true);
      await userApi.updatePreferences({
        bannedIngredients,
        likedCuisines,
        dietaryRestrictions: dietaryRestrictions.map(name => ({
          name,
          severity: dietarySeverities[name] || 'strict',
        })),
        preferredSuperfoods,
        cookTimePreference: cookTime,
        spiceLevel,
      });
      HapticPatterns.success();
      Alert.alert('Success', 'Preferences updated successfully!');
      router.back();
    } catch (error: any) {
      HapticPatterns.error();
      Alert.alert('Oops!', error.message || 'Couldn\'t save your preferences — try again?');
    } finally {
      setLoading(false);
    }
  };

  const bg = isDark ? DarkColors.background : Colors.surface;
  const cardBg = isDark ? DarkColors.card : '#FFFFFF';
  // borders removed — cards now use Shadows.SM for elevation
  const label = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? '#9CA3AF' : '#6B7280';
  const inputBg = isDark ? '#374151' : '#F3F4F6';
  const primaryColor = isDark ? DarkColors.primary : Colors.primary;

  if (loadingData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="settings-outline" size={56} color={sub} />
          <Text style={{ color: sub, marginTop: 12, fontSize: 15 }}>Loading preferences…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <KeyboardAvoidingContainer>
        {/* Header */}
        <View style={{ backgroundColor: cardBg, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <HapticTouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={label} />
          </HapticTouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: label }}>Culinary Preferences</Text>
          <HapticTouchableOpacity onPress={handleSave} disabled={loading} style={{ padding: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: loading ? sub : primaryColor }}>
              {loading ? 'Saving…' : 'Save'}
            </Text>
          </HapticTouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Cuisine Preferences ─────────────────────────────────────────── */}
          <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, marginBottom: 14, ...Shadows.SM }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: label, marginBottom: 4 }}>Favorite Cuisines</Text>
            <Text style={{ fontSize: 13, color: sub, marginBottom: 14 }}>Recipes from these cuisines will be ranked higher for you</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {CUISINE_OPTIONS.map(cuisine => (
                <CuisineChip
                  key={cuisine.id}
                  item={cuisine}
                  isSelected={likedCuisines.includes(cuisine.id)}
                  onToggle={() => toggleCuisine(cuisine.id)}
                  isDark={isDark}
                />
              ))}
            </View>
          </View>

          {/* ── Dietary Restrictions ────────────────────────────────────────── */}
          <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, marginBottom: 14, ...Shadows.SM }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: label, marginBottom: 4 }}>Dietary Restrictions</Text>
            <Text style={{ fontSize: 13, color: sub, marginBottom: 12 }}>Select any that apply, then tap the badge to set how strict it is</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {(() => {
                const sortedDietary = [...DIETARY_OPTIONS].sort((a, b) => {
                  const aSelected = dietaryRestrictions.includes(a.id);
                  const bSelected = dietaryRestrictions.includes(b.id);
                  if (aSelected && !bSelected) return -1;
                  if (!aSelected && bSelected) return 1;
                  if (aSelected && bSelected) {
                    const aStrict = dietarySeverities[a.id] === 'strict';
                    const bStrict = dietarySeverities[b.id] === 'strict';
                    if (aStrict && !bStrict) return -1;
                    if (!aStrict && bStrict) return 1;
                  }
                  return 0;
                });

                const hasStrict = dietaryRestrictions.some(id => dietarySeverities[id] === 'strict');
                const hasAvoid = dietaryRestrictions.some(id => dietarySeverities[id] === 'prefer_avoid');
                let insertedDivider = false;

                return sortedDietary.map(({ id, label: optLabel, emoji }) => {
                  const isSelected = dietaryRestrictions.includes(id);
                  const sev = dietarySeverities[id] || 'strict';
                  const isAllergic = sev === 'strict';

                  const chipBg = isSelected
                    ? (isAllergic
                        ? (isDark ? 'rgba(220,38,38,0.2)' : '#FEE2E2')
                        : (isDark ? 'rgba(217,119,6,0.2)' : '#FEF3C7'))
                    : (isDark ? '#374151' : '#E5E7EB');
                  const chipBorderColor = isSelected
                    ? (isAllergic
                        ? (isDark ? '#F87171' : '#DC2626')
                        : (isDark ? '#FCD34D' : '#D97706'))
                    : 'transparent';
                  const chipTextColor = isSelected
                    ? (isAllergic
                        ? (isDark ? '#FCA5A5' : '#B91C1C')
                        : (isDark ? '#FCD34D' : '#92400E'))
                    : (isDark ? '#D1D5DB' : '#374151');

                  // Determine if we need a divider before this chip
                  let showDivider = false;
                  if (hasStrict && hasAvoid && isSelected && !isAllergic && !insertedDivider) {
                    showDivider = true;
                    insertedDivider = true;
                  }

                  // Size & weight differ by severity
                  const chipPaddingV = isSelected && isAllergic ? 10 : 8;
                  const chipPaddingH = isSelected && isAllergic ? 12 : 10;
                  const chipFontSize = isSelected && isAllergic ? 13 : 12;
                  const chipFontWeight = isSelected && isAllergic ? '700' : '500';
                  const borderStyle = isSelected && !isAllergic ? 'dashed' as const : 'solid' as const;

                  return (
                    <View key={id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {showDivider && (
                        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4, gap: 8 }}>
                          <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#4B5563' : '#D1D5DB' }} />
                          <Text style={{ fontSize: 10, color: sub, fontWeight: '500' }}>Nice to have</Text>
                          <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#4B5563' : '#D1D5DB' }} />
                        </View>
                      )}
                      <View style={{
                        flexDirection: 'row',
                        marginRight: 8,
                        marginBottom: 8,
                        borderRadius: 100,
                        borderWidth: 1,
                        borderStyle,
                        borderColor: chipBorderColor,
                        backgroundColor: chipBg,
                        overflow: 'hidden',
                        ...(isSelected && isAllergic ? { borderLeftWidth: 3, borderLeftColor: chipBorderColor } : {}),
                      }}>
                        {/* Main chip area — tap to toggle selection */}
                        <HapticTouchableOpacity
                          onPress={() => toggleDietary(id)}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: chipPaddingH, paddingVertical: chipPaddingV, paddingRight: isSelected ? 6 : chipPaddingH, gap: 5 }}
                        >
                          <Text style={{ fontSize: 14 }}>{emoji}</Text>
                          <Text style={{ fontSize: chipFontSize, fontWeight: chipFontWeight as any, color: chipTextColor }}>{optLabel}</Text>
                        </HapticTouchableOpacity>

                        {/* Severity badge — tap to toggle allergic vs avoid */}
                        {isSelected && (
                          <HapticTouchableOpacity
                            onPress={() => toggleSeverity(id)}
                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: chipPaddingV, borderLeftWidth: 1, borderLeftColor: chipBorderColor, gap: 3 }}
                          >
                            <Text style={{ fontSize: 11 }}>{isAllergic ? '🚫' : '⚠️'}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: chipTextColor }}>
                              {isAllergic ? "Allergic" : "Avoid"}
                            </Text>
                          </HapticTouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                });
              })()}
            </View>

            {dietaryRestrictions.length > 0 && (
              <Text style={{ fontSize: 11, color: sub, marginTop: 8 }}>
                🚫 I'm allergic — strictly excluded from all recipes{"   "}⚠️ I try to avoid — will be minimized
              </Text>
            )}
          </View>

          {/* ── Banned Ingredients ──────────────────────────────────────────── */}
          <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, marginBottom: 14, ...Shadows.SM }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: label, marginBottom: 4 }}>Banned Ingredients</Text>
            <Text style={{ fontSize: 13, color: sub, marginBottom: 12 }}>Recipes containing these will never be recommended</Text>

            <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8 }}>
              <TextInput
                value={newIngredient}
                onChangeText={setNewIngredient}
                placeholder="e.g., mushrooms"
                style={{ flex: 1, backgroundColor: inputBg, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: label, ...Shadows.SM }}
                placeholderTextColor={sub}
                onSubmitEditing={addBannedIngredient}
              />
              <HapticTouchableOpacity
                onPress={addBannedIngredient}
                style={{ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 9, backgroundColor: primaryColor, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="add" size={20} color="white" />
              </HapticTouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {bannedIngredients.length > 0 ? (
                bannedIngredients.map((ingredient, index) => (
                  <HapticTouchableOpacity
                    key={index}
                    onPress={() => removeBannedIngredient(ingredient)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 8, paddingVertical: 7, borderRadius: 100, marginRight: 8, marginBottom: 8, borderWidth: 1, backgroundColor: isDark ? 'rgba(220,38,38,0.15)' : '#FEE2E2', borderColor: isDark ? '#F87171' : '#DC2626', gap: 4 }}
                  >
                    <Text style={{ fontSize: 12, color: isDark ? '#FCA5A5' : '#B91C1C' }}>{ingredient}</Text>
                    <Ionicons name="close-circle" size={14} color={isDark ? '#F87171' : '#DC2626'} />
                  </HapticTouchableOpacity>
                ))
              ) : (
                <Text style={{ fontSize: 12, color: sub }}>No banned ingredients added</Text>
              )}
            </View>
          </View>

          {/* ── Preferred Superfoods ─────────────────────────────────────────── */}
          <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, marginBottom: 14, ...Shadows.SM }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: label, marginBottom: 4 }}>Preferred Superfoods</Text>
            <Text style={{ fontSize: 13, color: sub, marginBottom: 12 }}>Recipes with these get a boost in your recommendations</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {SUPERFOOD_CATEGORIES.map((superfood) => {
                const isSelected = preferredSuperfoods.includes(superfood.id);
                return (
                  <HapticTouchableOpacity
                    key={superfood.id}
                    onPress={() => toggleSuperfood(superfood.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, marginRight: 8, marginBottom: 8, gap: 4, backgroundColor: isSelected ? (isDark ? '#166534' : '#16A34A') : (isDark ? '#374151' : '#E5E7EB') }}
                  >
                    {superfood.emoji && <Text style={{ fontSize: 14 }}>{superfood.emoji}</Text>}
                    <Text style={{ fontSize: 12, fontWeight: '500', color: isSelected ? 'white' : (isDark ? '#D1D5DB' : '#374151') }}>
                      {superfood.name}
                    </Text>
                  </HapticTouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Other Preferences ───────────────────────────────────────────── */}
          <View style={{ backgroundColor: cardBg, borderRadius: 14, padding: 16, marginBottom: 14, ...Shadows.SM }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: label, marginBottom: 14 }}>Other Preferences</Text>

            {/* Cook Time */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: label, marginBottom: 6 }}>Max Cook Time (minutes)</Text>
              <TextInput
                value={cookTimePreference}
                onChangeText={setCookTimePreference}
                placeholder="30"
                keyboardType="numeric"
                style={{ backgroundColor: inputBg, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: label, ...Shadows.SM }}
                placeholderTextColor={sub}
              />
              <Text style={{ fontSize: 11, color: sub, marginTop: 4 }}>Recipes longer than this won't be recommended</Text>
            </View>

            {/* Spice Level */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: label, marginBottom: 8 }}>Spice Preference</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {SPICE_LEVELS.map((level) => {
                  const isSelected = spiceLevel === level;
                  return (
                    <HapticTouchableOpacity
                      key={level}
                      onPress={() => setSpiceLevel(level)}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: isSelected ? primaryColor : (isDark ? '#374151' : '#E5E7EB') }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: isSelected ? 'white' : (isDark ? '#D1D5DB' : '#374151') }}>
                        {level === 'mild' ? '🌶 Mild' : level === 'medium' ? '🌶🌶 Medium' : '🌶🌶🌶 Spicy'}
                      </Text>
                    </HapticTouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
}
