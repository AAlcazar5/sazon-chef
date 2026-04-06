// frontend/components/cookbook/CollectionSuggestionBanner.tsx
// One-time prompt that appears when user has 10+ saved recipes but 0 collections.
// Offers 3 pre-named collection chips to quick-create. Dismissal is persisted
// in AsyncStorage so it only shows once.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { HapticPatterns } from '../../constants/Haptics';
import { Pastel, PastelDark } from '../../constants/Colors';

const DISMISSED_KEY = '@sazon/collection_suggestion_dismissed';

const SUGGESTIONS = ['Weeknight Dinners', 'Meal Prep Sunday', 'Date Night'];

interface CollectionSuggestionBannerProps {
  savedCount: number;
  customCollectionCount: number;
  onDismiss: () => void;
  onCreateSuggested: (name: string) => void;
}

function CollectionSuggestionBanner({
  savedCount,
  customCollectionCount,
  onDismiss,
  onCreateSuggested,
}: CollectionSuggestionBannerProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [dismissed, setDismissed] = useState(true); // start hidden until we check storage

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((val) => {
      if (!val) setDismissed(false);
    });
  }, []);

  const shouldShow = savedCount >= 10 && customCollectionCount === 0 && !dismissed;
  if (!shouldShow) return null;

  const handleDismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, 'true').catch(() => {});
    HapticPatterns.buttonPress();
    onDismiss();
  };

  const handleChip = (name: string) => {
    HapticPatterns.buttonPress();
    onCreateSuggested(name);
  };

  const bg = isDark ? PastelDark.lavender : Pastel.lavender;

  return (
    <View
      style={[styles.banner, { backgroundColor: bg }]}
      testID="suggestion-banner"
      accessibilityLabel="Organize your cookbook suggestion"
    >
      {/* Dismiss button */}
      <HapticTouchableOpacity
        onPress={handleDismiss}
        testID="suggestion-banner-dismiss"
        accessibilityLabel="Dismiss suggestion"
        accessibilityRole="button"
        style={styles.dismissBtn}
      >
        <Text style={[styles.dismissText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>✕</Text>
      </HapticTouchableOpacity>

      {/* Heading */}
      <Text style={[styles.heading, { color: isDark ? '#F9FAFB' : '#111827' }]}>
        Organize your cookbook 📚
      </Text>
      <Text style={[styles.sub, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        You've saved {savedCount} recipes. Create a collection to keep things tidy.
      </Text>

      {/* Suggestion chips */}
      <View style={styles.chips}>
        {SUGGESTIONS.map((name) => (
          <HapticTouchableOpacity
            key={name}
            onPress={() => handleChip(name)}
            accessibilityLabel={`Create ${name} collection`}
            accessibilityRole="button"
            style={[styles.chip, { backgroundColor: '#AB47BC' }]}
          >
            <Text style={styles.chipText}>+ {name}</Text>
          </HapticTouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
  },
  dismissBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    marginRight: 24,
  },
  sub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default React.memo(CollectionSuggestionBanner);
