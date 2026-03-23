// frontend/components/ui/FilterSheet.tsx
// Shared filter bottom sheet skeleton — used by both Home and Cookbook filter modals
// Provides consistent structure: active filter summary → quick filters slot → screen-specific sections → bottom bar

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import BottomSheet from './BottomSheet';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import BrandButton from './BrandButton';
import { ActiveFilterChip } from './FilterPill';
import { AnimatedLogoMascot } from '../mascot';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';

interface ActiveFilter {
  key: string;
  label: string;
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Total count of active filters */
  activeFilterCount: number;
  /** Active filters for the dismissible summary row */
  activeFilters?: ActiveFilter[];
  onDismissFilter?: (key: string) => void;
  onReset: () => void;
  onApply: () => void;
  /** Quick filters row (rendered first) */
  quickFilters?: React.ReactNode;
  /** Screen-specific filter sections */
  children: React.ReactNode;
  snapPoints?: (string | number)[];
}

export default function FilterSheet({
  visible,
  onClose,
  title = 'Filters',
  activeFilterCount,
  activeFilters,
  onDismissFilter,
  onReset,
  onApply,
  quickFilters,
  children,
  snapPoints = ['75%', '92%'],
}: FilterSheetProps) {
  const { theme, colors } = useTheme();
  const isDark = theme === 'dark';
  const showGuidance = activeFilterCount >= 5;
  const resetScale = useSharedValue(1);

  const resetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resetScale.value }],
  }));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      snapPoints={snapPoints}
      scrollable
    >
      {/* Active filter summary — sticky at top */}
      {activeFilters && activeFilters.length > 0 && onDismissFilter && (
        <View style={styles.activeRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeRowContent}
          >
            {activeFilters.map((f) => (
              <ActiveFilterChip
                key={f.key}
                label={f.label}
                onDismiss={() => onDismissFilter(f.key)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <Animated.View style={[styles.body, resetAnimatedStyle]}>
        {/* Quick filters slot */}
        {quickFilters && (
          <View style={styles.quickFiltersSection}>{quickFilters}</View>
        )}

        {/* Screen-specific sections */}
        {children}

        {/* Guidance when many filters selected */}
        {showGuidance && (
          <View
            style={[
              styles.guidanceCard,
              {
                borderColor: isDark ? '#7c3421' : '#fed7aa',
                backgroundColor: isDark
                  ? `${Colors.primaryLight}33`
                  : Colors.primaryLight,
              },
            ]}
          >
            <View style={styles.guidanceRow}>
              <View style={styles.guidanceMascot}>
                <AnimatedLogoMascot
                  expression="thinking"
                  size="small"
                  animationType="idle"
                />
              </View>
              <View style={styles.guidanceText}>
                <Text
                  style={[
                    styles.guidanceTitle,
                    {
                      color: isDark
                        ? DarkColors.primaryDark
                        : Colors.primaryDark,
                    },
                  ]}
                >
                  That's a lot of filters!
                </Text>
                <Text
                  style={[
                    styles.guidanceBody,
                    {
                      color: isDark ? DarkColors.primary : Colors.primary,
                    },
                  ]}
                >
                  You've selected {activeFilterCount} filters. Try removing some
                  to see more recipes.
                </Text>
              </View>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Bottom bar — Apply CTA + Reset */}
      <View
        style={[
          styles.bottomBar,
          {
            borderTopColor: isDark ? '#2C2C2E' : '#F3F4F6',
            backgroundColor: isDark ? DarkColors.card : '#FFFFFF',
          },
        ]}
      >
        {activeFilterCount > 0 && (
          <HapticTouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              resetScale.value = withSequence(
                withTiming(0.96, { duration: 100 }),
                withSpring(1, { damping: 12, stiffness: 200 })
              );
              onReset();
            }}
            style={styles.resetButton}
          >
            <Text
              style={[
                styles.resetText,
                {
                  color: isDark
                    ? DarkColors.secondaryRed
                    : Colors.secondaryRed,
                },
              ]}
            >
              Reset all
            </Text>
          </HapticTouchableOpacity>
        )}

        <View style={styles.applyButtonWrapper}>
          <BrandButton
            label={
              activeFilterCount > 0
                ? `Apply ${activeFilterCount} Filter${activeFilterCount !== 1 ? 's' : ''}`
                : 'Apply'
            }
            onPress={onApply}
            variant="brand"
            hapticStyle="medium"
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  activeRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  activeRowContent: {
    gap: 8,
    flexDirection: 'row',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 100, // space for bottom bar
  },
  quickFiltersSection: {
    marginBottom: 16,
  },
  guidanceCard: {
    marginVertical: 12,
    padding: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  guidanceMascot: {
    marginRight: 12,
  },
  guidanceText: {
    flex: 1,
  },
  guidanceTitle: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 14,
  },
  guidanceBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28, // safe area
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyButtonWrapper: {
    flex: 1,
  },
});
