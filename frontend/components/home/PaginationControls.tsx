import React from 'react';
// frontend/components/home/PaginationControls.tsx
// Editorial-styled pagination controls for recipe lists

import { View, Text, StyleSheet, Platform } from 'react-native';
import { useColorScheme } from 'nativewind';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Ionicons } from '@expo/vector-icons';
import { Pastel, EditorialColors } from '../../constants/Colors';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';

interface PaginationInfo {
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  hasMultiplePages: boolean;
}

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  itemsShown: number;
  paginationInfo: PaginationInfo;
  isLoading: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}

function PaginationControls({
  currentPage,
  totalItems,
  paginationInfo,
  isLoading,
  onPrevPage,
  onNextPage,
}: PaginationControlsProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (totalItems === 0 || !paginationInfo.hasMultiplePages) {
    return null;
  }

  const shadow = Platform.OS === 'ios' ? EditorialShadows.cardRaised.ios : EditorialShadows.cardRaised.android;

  const prevDisabled = paginationInfo.isFirstPage || isLoading;
  const nextDisabled = paginationInfo.isLastPage || isLoading;

  return (
    <View style={styles.wrapper}>
      {/* W-D1 no-recipe-count law: the "N–M OF {total} RECIPES" eyebrow is
          removed — recipes are a like-signal store, not a countable catalog
          (Claude-class tooling ⇒ unlimited on-demand recipes). */}
      <View style={[styles.card, { backgroundColor: isDark ? '#1F2937' : Pastel.peach }, shadow]}>
        <HapticTouchableOpacity
          onPress={onPrevPage}
          disabled={prevDisabled}
          hapticStyle="light"
          style={[styles.pill, prevDisabled && styles.pillDisabled]}
          accessibilityLabel="Previous page"
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={prevDisabled ? '#9CA3AF' : '#FFFFFF'}
          />
          <Text style={[styles.pillText, prevDisabled && styles.pillTextDisabled]}>
            Prev
          </Text>
        </HapticTouchableOpacity>

        <View style={styles.center}>
          {isLoading ? (
            <AnimatedActivityIndicator size="small" color={EditorialColors.blackCTA} />
          ) : (
            <Text style={[styles.pageText, isDark && styles.pageTextDark]}>
              Page {currentPage + 1}
            </Text>
          )}
        </View>

        <HapticTouchableOpacity
          onPress={onNextPage}
          disabled={nextDisabled}
          hapticStyle="light"
          style={[styles.pill, nextDisabled && styles.pillDisabled]}
          accessibilityLabel="Next page"
        >
          <Text style={[styles.pillText, nextDisabled && styles.pillTextDisabled]}>
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={nextDisabled ? '#9CA3AF' : '#FFFFFF'}
          />
        </HapticTouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#fa7e12',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 12,
  },
  card: {
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: EditorialColors.blackCTA,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 88,
    justifyContent: 'center',
  },
  pillDisabled: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  pillText: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  pillTextDisabled: {
    color: '#9CA3AF',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  pageText: {
    ...EditorialTypography.sectionTitle,
    fontSize: 16,
    color: '#111827',
  },
  pageTextDark: {
    color: '#F9FAFB',
  },
  pageTextAccent: {
    ...EditorialTypography.sectionAccent,
    fontSize: 16,
    color: '#111827',
  },
});

export default React.memo(PaginationControls);
