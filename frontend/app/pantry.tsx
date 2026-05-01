// frontend/app/pantry.tsx
// First-class pantry screen — promotes PantrySection out of shopping-list so that
// cooking and meal plan can deep-link to it (fixes the roadmap 10G-Pre seam audit).
import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import PantrySection from '../components/shopping/PantrySection';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import LoadingState from '../components/ui/LoadingState';
import { PantryMatchCard } from '../components/pantry/PantryMatchCard';
import { Colors, DarkColors } from '../constants/Colors';
import { FontSize, EditorialFontFamily, EditorialTypography } from '../constants/Typography';
import { BorderRadius } from '../constants/Spacing';
import { pantryApi } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import type { PantryItem } from '../types';

const DEFAULT_PANTRY_ITEMS: Array<{ name: string; category: string }> = [
  { name: 'salt', category: 'Pantry' },
  { name: 'pepper', category: 'Pantry' },
  { name: 'olive oil', category: 'Pantry' },
  { name: 'garlic', category: 'Produce' },
  { name: 'onion', category: 'Produce' },
  { name: 'flour', category: 'Pantry' },
  { name: 'sugar', category: 'Pantry' },
  { name: 'butter', category: 'Dairy' },
];

interface MatchRecipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  cookTime: number;
  imageUrl: string | null;
  calories: number;
  protein: number;
  matchPercentage: number;
  missingIngredients: string[];
  canSubstitute: boolean;
}

export default function PantryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRecipe[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await pantryApi.getAll();
      setItems((res.data as PantryItem[]) || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMatches = useCallback(async () => {
    try {
      setMatchesLoading(true);
      const res = await pantryApi.pantryMatch({ minMatch: 60, limit: 50 });
      setMatches(((res as any).data?.recipes as MatchRecipe[]) || []);
    } catch {
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadMatches();
  }, [load, loadMatches]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void loadMatches();
    }, [load, loadMatches]),
  );

  const handleRemoveItem = async (itemId: string) => {
    try {
      await pantryApi.removeItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      void loadMatches();
    } catch {
      // ignored — next refresh will reconcile
    }
  };

  const handleSetupDefaults = async () => {
    try {
      await pantryApi.addMany(DEFAULT_PANTRY_ITEMS);
      await load();
      void loadMatches();
    } catch {
      // ignored
    }
  };

  const bg = isDark ? '#0F172A' : '#FAF7F4';
  const textColor = isDark ? '#F5F5F5' : '#1F2937';
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const renderRecipe = ({ item, index }: { item: MatchRecipe; index: number }) => (
    <PantryMatchCard
      recipe={item}
      index={index}
      isDark={isDark}
      onPress={(id) => router.push(`/modal?id=${id}&source=pantry` as any)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <HapticTouchableOpacity
          onPress={() => router.back()}
          hapticStyle="light"
          accessibilityLabel="Back"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={28} color={textColor} />
        </HapticTouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>My Pantry</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={matches}
        keyExtractor={(r) => r.id}
        renderItem={renderRecipe}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        testID="pantry-matches-list"
        ListHeaderComponent={
          <>
            <PantrySection
              pantryItems={items}
              loading={loading}
              onRemoveItem={handleRemoveItem}
              onSetupDefaults={handleSetupDefaults}
            />
            <View style={{ paddingHorizontal: 0, marginTop: 8, marginBottom: 14 }}>
              <Text style={editorialStyles.eyebrow}>WHAT YOU CAN COOK</Text>
              <Text style={[editorialStyles.title, { color: textPrimary }]}>
                Right <Text style={editorialStyles.titleAccent}>now</Text>
                <Text style={editorialStyles.orangePeriod}>.</Text>
              </Text>
              <Text style={[editorialStyles.subtitle, { color: textSecondary }]}>
                Sorted by how much of your pantry each recipe uses.
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          matchesLoading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <LoadingState message="Finding matches..." expression="thinking" />
            </View>
          ) : (
            <View
              style={{
                paddingVertical: 24,
                paddingHorizontal: 16,
                borderRadius: BorderRadius.card,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                alignItems: 'center',
              }}
            >
              <Text
                style={{ fontSize: FontSize.sm, fontFamily: 'PlusJakartaSans_700Bold', color: textPrimary, marginBottom: 4 }}
              >
                Nothing quite matches yet
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: textSecondary, textAlign: 'center' }}>
                Add a few more pantry items and we'll find recipes that fit.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});

const TITLE_SIZE = 36;

const editorialStyles = StyleSheet.create({
  eyebrow: {
    ...EditorialTypography.eyebrow,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.05,
    letterSpacing: -1.2,
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
    letterSpacing: -1.2,
  },
  orangePeriod: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    color: '#fa7e12',
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
});
