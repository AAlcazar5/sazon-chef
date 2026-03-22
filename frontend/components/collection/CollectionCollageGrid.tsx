// frontend/components/collection/CollectionCollageGrid.tsx
// 2x2 photo collage from a collection's first 4 recipe images + recipe count badge.
// Shows placeholder with Sazon mascot when collection is empty.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useColorScheme } from 'nativewind';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

interface CollectionCollageGridProps {
  /** Array of recipe image URLs (uses first 4) */
  imageUrls: string[];
  /** Total recipe count in the collection */
  recipeCount: number;
  /** Grid size (width & height) */
  size?: number;
  /** Border radius */
  borderRadius?: number;
  /** Test ID */
  testID?: string;
}

export default function CollectionCollageGrid({
  imageUrls,
  recipeCount,
  size = 160,
  borderRadius = 16,
  testID,
}: CollectionCollageGridProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const images = imageUrls.slice(0, 4);
  const gap = 2;

  // Calculate cell sizes: top-left is larger (2/3), rest are smaller
  const largeSize = (size * 2) / 3 - gap / 2;
  const smallSize = size / 3 - gap / 2;

  const placeholderBg = isDark ? '#1C1C1E' : '#F5F0EB';
  const badgeBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.55)';

  if (images.length === 0) {
    // Empty collection placeholder
    return (
      <View
        testID={testID}
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: placeholderBg,
          },
        ]}
      >
        <Text style={{ fontSize: 36 }}>🌶️</Text>
        <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Add recipes
        </Text>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          overflow: 'hidden',
        },
        Shadows.SM,
      ]}
    >
      {images.length === 1 ? (
        // Single image — fill
        <Image source={{ uri: images[0] }} style={{ width: size, height: size }} contentFit="cover" />
      ) : images.length <= 3 ? (
        // 2-3 images: large left + small stack right
        <View style={[styles.row, { gap }]}>
          <Image source={{ uri: images[0] }} style={{ width: largeSize, height: size }} contentFit="cover" />
          <View style={[styles.col, { gap }]}>
            {images.slice(1).map((url, i) => (
              <Image
                key={i}
                source={{ uri: url }}
                style={{ width: smallSize + gap, height: (size - gap * (images.length - 2)) / (images.length - 1) }}
                contentFit="cover"
              />
            ))}
          </View>
        </View>
      ) : (
        // 4 images: 2x2 grid (top-left large variant)
        <View style={[styles.row, { gap }]}>
          <Image source={{ uri: images[0] }} style={{ width: largeSize, height: size }} contentFit="cover" />
          <View style={[styles.col, { gap }]}>
            <Image source={{ uri: images[1] }} style={{ width: smallSize + gap, height: size / 3 - gap / 3 }} contentFit="cover" />
            <Image source={{ uri: images[2] }} style={{ width: smallSize + gap, height: size / 3 - gap / 3 }} contentFit="cover" />
            <Image source={{ uri: images[3] }} style={{ width: smallSize + gap, height: size / 3 - gap / 3 }} contentFit="cover" />
          </View>
        </View>
      )}

      {/* Recipe count badge */}
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text style={styles.badgeText}>
          {recipeCount} {recipeCount === 1 ? 'Recipe' : 'Recipes'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    flex: 1,
  },
  col: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
