// frontend/app/pantry.tsx
// First-class pantry screen — promotes PantrySection out of shopping-list so that
// cooking and meal plan can deep-link to it (fixes the roadmap 10G-Pre seam audit).
import { useCallback, useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import PantrySection from '../components/shopping/PantrySection';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import ContinuityCTA from '../components/ui/ContinuityCTA';
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

export default function PantryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleRemoveItem = async (itemId: string) => {
    try {
      await pantryApi.removeItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {
      // ignored — next refresh will reconcile
    }
  };

  const handleSetupDefaults = async () => {
    try {
      await pantryApi.addMany(DEFAULT_PANTRY_ITEMS);
      await load();
    } catch {
      // ignored
    }
  };

  const bg = isDark ? '#0F172A' : '#FAF7F4';
  const textColor = isDark ? '#F5F5F5' : '#1F2937';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
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

      <View style={styles.ctaWrap}>
        <ContinuityCTA
          label="Recipes you can make right now"
          icon="restaurant"
          onPress={() => router.push('/(tabs)/' as any)}
          tint="sage"
          accessibilityLabel="View recipes you can make with your pantry"
          testID="pantry-cook-cta"
        />
      </View>

      <PantrySection
        pantryItems={items}
        loading={loading}
        onRemoveItem={handleRemoveItem}
        onSetupDefaults={handleSetupDefaults}
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
    fontWeight: '700',
  },
  ctaWrap: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
});
