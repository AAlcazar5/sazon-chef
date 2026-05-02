// frontend/components/shopping/MergeSuggestionBanner.tsx
// Group 10Q-ListMgmt: Peach-tinted dismissible banner suggesting a merge with
// a recently-archived list that shares >= 70% ingredient overlap.

import { useState } from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Pastel, PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { shoppingListApi } from '../../lib/api';

export interface MergeSuggestion {
  suggestionId: string;
  name: string;
  overlap: number;
}

interface MergeSuggestionBannerProps {
  activeListId: string;
  suggestion: MergeSuggestion | null;
  onMerged: () => void;
  onDismissed: () => void;
  testID?: string;
}

export default function MergeSuggestionBanner({
  activeListId,
  suggestion,
  onMerged,
  onDismissed,
  testID,
}: MergeSuggestionBannerProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [dismissed, setDismissed] = useState(false);
  const [merging, setMerging] = useState(false);

  if (!suggestion || dismissed) return null;

  const handleMerge = async () => {
    setMerging(true);
    try {
      await shoppingListApi.mergeFrom(activeListId, suggestion.suggestionId);
      setDismissed(true);
      onMerged();
    } catch {
      // Silently fail — banner stays visible so user can retry
    } finally {
      setMerging(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await shoppingListApi.dismissMergeSuggestion(activeListId, suggestion.suggestionId);
    } catch {
      // Best-effort — still hide the banner
    }
    setDismissed(true);
    onDismissed();
  };

  return (
    <View
      testID={testID}
      style={[
        styles.banner,
        { backgroundColor: isDark ? PastelDark.peach : Pastel.peach },
        Shadows.SM,
      ]}
    >
      <Icon
        name={Icons.MERGE_LISTS_OUTLINE}
        size={IconSizes.SM}
        color={isDark ? '#FCD34D' : '#92400E'}
        accessibilityLabel=""
        style={styles.icon}
      />

      <Text
        style={[styles.text, { color: isDark ? '#FDE68A' : '#78350F' }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        Looks similar to <Text style={styles.bold}>{suggestion.name}</Text>
      </Text>

      <HapticTouchableOpacity
        onPress={handleMerge}
        hapticStyle="light"
        disabled={merging}
        style={styles.mergeButton}
        accessibilityLabel="Merge lists"
      >
        <Text style={[styles.mergeText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
          {merging ? '...' : 'Merge?'}
        </Text>
      </HapticTouchableOpacity>

      <HapticTouchableOpacity
        onPress={handleDismiss}
        hapticStyle="light"
        style={styles.closeButton}
        accessibilityLabel="Dismiss merge suggestion"
      >
        <Icon
          name={Icons.CLOSE}
          size={14}
          color={isDark ? '#FCD34D' : '#92400E'}
          accessibilityLabel="Dismiss"
        />
      </HapticTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  icon: {
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  bold: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  mergeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    flexShrink: 0,
  },
  mergeText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  closeButton: {
    padding: 4,
    flexShrink: 0,
  },
});
