// frontend/components/cookbook/SmartCollectionCard.tsx
// A pastel-tinted card representing a single smart collection.
// Displays icon, name, "Smart" badge, description, and recipe count.

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

// One pastel theme per collection id — cycles through available tints
const COLLECTION_THEMES: Record<string, { bg: string; bgDark: string; accent: string }> = {
  quick_easy:      { bg: Pastel.sky,      bgDark: PastelDark.sky,      accent: '#42A5F5' },
  high_protein:    { bg: Pastel.sage,     bgDark: PastelDark.sage,     accent: '#66BB6A' },
  under_400_cal:   { bg: Pastel.peach,    bgDark: PastelDark.peach,    accent: '#FF9800' },
  one_pot:         { bg: Pastel.golden,   bgDark: PastelDark.golden,   accent: '#FFC107' },
  budget_friendly: { bg: Pastel.lavender, bgDark: PastelDark.lavender, accent: '#AB47BC' },
  high_fiber:      { bg: Pastel.blush,    bgDark: PastelDark.blush,    accent: '#EC407A' },
};

const FALLBACK_THEME = { bg: Pastel.orange, bgDark: PastelDark.orange, accent: '#FF8B41' };

export interface SmartCollectionCardProps {
  id: string;
  name: string;
  icon: string;
  description: string;
  count: number;
  previewImages?: string[];
  onPress: () => void;
}

function SmartCollectionCard({ id, name, icon, description, count, previewImages = [], onPress }: SmartCollectionCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = COLLECTION_THEMES[id] ?? FALLBACK_THEME;
  const bgColor = isDark ? theme.bgDark : theme.bg;

  const recipeLabel = count === 1 ? '1 recipe' : `${count} recipes`;
  const images = previewImages.slice(0, 3);

  return (
    <HapticTouchableOpacity
      onPress={onPress}
      testID={`smart-collection-card-${id}`}
      accessibilityLabel={`${name} smart collection, ${recipeLabel}`}
      accessibilityRole="button"
      style={[styles.card, { backgroundColor: bgColor }, Shadows.SM]}
    >
      {/* 3-image preview strip */}
      {images.length > 0 && (
        <View style={styles.previewStrip}>
          {images.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.previewImage} resizeMode="cover" testID={`preview-image-${i}`} />
          ))}
          {Array.from({ length: Math.max(0, 3 - images.length) }).map((_, i) => (
            <View key={`ph-${i}`} style={[styles.previewImage, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
          ))}
        </View>
      )}

      {/* Content area with padding */}
      <View style={styles.content}>
        {/* Smart badge */}
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <Text style={styles.badgeText}>Smart</Text>
        </View>

        {/* Icon */}
        <Text style={styles.icon}>{icon}</Text>

        {/* Name */}
        <Text
          style={[styles.name, { color: isDark ? '#F9FAFB' : '#111827' }]}
          numberOfLines={2}
        >
          {name}
        </Text>

        {/* Description */}
        <Text
          style={[styles.description, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
          numberOfLines={2}
        >
          {description}
        </Text>

        {/* Count */}
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: theme.accent }]}>{count}</Text>
          <Text style={[styles.countLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {count === 1 ? 'recipe' : 'recipes'}
          </Text>
        </View>
      </View>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 160,
    position: 'relative',
  },
  previewStrip: {
    flexDirection: 'row',
    height: 60,
    marginBottom: 10,
  },
  previewImage: {
    flex: 1,
    height: 60,
  },
  content: {
    padding: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  icon: {
    fontSize: 28,
    marginBottom: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
    flex: 1,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  count: {
    fontSize: 18,
    fontWeight: '800',
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default React.memo(SmartCollectionCard);
