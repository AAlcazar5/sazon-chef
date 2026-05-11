// frontend/components/action-sheet/QuickActionsSheet.tsx
// Group 9O — Two-tier quick-actions sheet.
// ROADMAP 4.0 BAP2.1 — `heroItem` prop pins Build-a-Plate as a larger
// gradient card above the primary row list, visually elevating the
// flagship surface in the quick-actions sheet.
//
// Wraps ActionSheet with a "primary list + More actions → secondary list"
// pattern so the always-visible "+" FAB stays uncluttered while every kept
// long-tail item remains reachable.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import ActionSheet, { type ActionSheetItem } from '../ui/ActionSheet';
import { DarkColors } from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { FontSize } from '../../constants/Typography';
import { buttonAccessibility } from '../../utils/accessibility';

interface QuickActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  primaryItems: ActionSheetItem[];
  secondaryItems: ActionSheetItem[];
  /** Override the default "More actions" + "Back" labels. */
  moreLabel?: string;
  backLabel?: string;
  /**
   * BAP2.1: Optional hero item pinned above the primary list as a larger
   * gradient card (sage). Render-distinct from the row items below — used
   * to give the Build-a-Plate flagship surface visual priority in the FAB
   * sheet. When omitted, the sheet falls back to the pre-BAP2.1 behavior
   * (no hero, just the two-tier list).
   */
  heroItem?: ActionSheetItem;
}

const SAGE_GRADIENT: readonly [string, string] = ['#A8C9A8', '#7FB37F'];
const SAGE_GRADIENT_DARK: readonly [string, string] = ['#3F5F3F', '#2F4F2F'];

export default function QuickActionsSheet({
  visible,
  onClose,
  primaryItems,
  secondaryItems,
  moreLabel,
  backLabel,
  heroItem,
}: QuickActionsSheetProps) {
  const [tier, setTier] = useState<'primary' | 'secondary'>('primary');
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Whenever the parent re-opens us, snap back to the primary tier so power
  // users don't accidentally land on the long tail from a previous session.
  useEffect(() => {
    if (visible) setTier('primary');
  }, [visible]);

  const moreItem: ActionSheetItem = {
    label: moreLabel ?? 'More actions',
    icon: 'chevron-forward',
    subtitle:
      secondaryItems.length === 1
        ? '1 more shortcut'
        : `${secondaryItems.length} more shortcuts`,
    onPress: () => setTier('secondary'),
    tint: 'golden',
    keepOpen: true,
  };

  const backItem: ActionSheetItem = {
    label: backLabel ?? 'Back to main actions',
    icon: 'chevron-back',
    onPress: () => setTier('primary'),
    tint: 'sky',
    keepOpen: true,
  };

  const items: ActionSheetItem[] =
    tier === 'primary'
      ? secondaryItems.length > 0
        ? [...primaryItems, moreItem]
        : primaryItems
      : [backItem, ...secondaryItems];

  // BAP2.1: render the hero card only on the primary tier. Tapping it fires
  // the item's onPress and dismisses the sheet (consistent with regular
  // row items, modulo keepOpen which doesn't apply to the hero).
  const heroSlot =
    heroItem && tier === 'primary' ? (
      <Pressable
        testID="qa-hero-item"
        onPress={() => {
          heroItem.onPress();
          if (!heroItem.keepOpen) onClose();
        }}
        {...buttonAccessibility(heroItem.label, {
          hint: heroItem.subtitle,
        })}
        accessibilityRole="menuitem"
      >
        <LinearGradient
          colors={isDark ? SAGE_GRADIENT_DARK : SAGE_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroIconWrap}>
            <Ionicons
              name={heroItem.icon as never}
              size={32}
              color={isDark ? DarkColors.text.primary : '#FFFFFF'}
            />
          </View>
          <View style={styles.heroTextWrap}>
            <Text
              style={[
                styles.heroLabel,
                { color: isDark ? DarkColors.text.primary : '#FFFFFF' },
              ]}
              numberOfLines={1}
            >
              {heroItem.label}
            </Text>
            {heroItem.subtitle ? (
              <Text
                style={[
                  styles.heroSubtitle,
                  {
                    color: isDark
                      ? DarkColors.text.secondary
                      : 'rgba(255,255,255,0.85)',
                  },
                ]}
                numberOfLines={1}
              >
                {heroItem.subtitle}
              </Text>
            ) : null}
          </View>
        </LinearGradient>
      </Pressable>
    ) : null;

  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      items={items}
      title={tier === 'secondary' ? 'More actions' : undefined}
      headerSlot={heroSlot}
    />
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.md,
    minHeight: 96,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroLabel: {
    fontSize: FontSize.xl,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: FontSize.sm,
    fontWeight: '500' as const,
  },
});
