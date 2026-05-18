// frontend/components/today/MoreForYouSection.tsx
// ROADMAP 4.0 IA2.6 — Today carry-over consolidation.
//
// Caps visible cards at INITIAL_VISIBLE; user taps "More for you" to
// expand the rest. Preference persists in AsyncStorage so users who
// always-expand don't see the cap repeatedly. Cards that self-render
// null still count as "occupied" slots — that's intentional, since the
// alternative (visibility probing) would require refactoring every
// card's render contract.

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';

const STORAGE_KEY = '@sazon/today/more-for-you-expanded';
const INITIAL_VISIBLE = 2;

interface MoreForYouSectionProps {
  /** Cards to render. First INITIAL_VISIBLE always show; rest hide behind the expander. */
  children: React.ReactNode;
  /** Optional override for default visible count. */
  initialVisible?: number;
  /** Optional label override (defaults to "More for you"). */
  label?: string;
}

export default function MoreForYouSection({
  children,
  initialVisible = INITIAL_VISIBLE,
  label = 'More for you',
}: MoreForYouSectionProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (cancelled) return;
        setExpanded(v === '1');
        setHydrated(true);
      })
      .catch(() => {
        setHydrated(true);
      });
    return () => { cancelled = true; };
  }, []);

  const childArray = useMemo(
    () => React.Children.toArray(children),
    [children],
  );

  const handleToggle = async () => {
    const next = !expanded;
    setExpanded(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // best-effort persistence; not blocking
    }
  };

  // Don't run any logic until we've hydrated the persisted preference,
  // otherwise we'd flash the wrong state for users who always expand.
  if (!hydrated) {
    return <View testID="more-for-you-loading" />;
  }

  const visible = childArray.slice(0, initialVisible);
  const hidden = childArray.slice(initialVisible);
  const hasHidden = hidden.length > 0;

  return (
    <View testID="more-for-you-section">
      {visible}

      {hasHidden && expanded && (
        <View testID="more-for-you-expanded-content">{hidden}</View>
      )}

      {hasHidden && (
        <HapticTouchableOpacity
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? `Collapse ${label.toLowerCase()}` : `Expand ${label.toLowerCase()}`
          }
          style={styles.toggleRow}
          testID="more-for-you-toggle"
        >
          <Text
            style={[
              styles.toggleLabel,
              { color: isDark ? DarkColors.primary : Colors.primary },
            ]}
          >
            {expanded ? `Show less` : label}
          </Text>
          <Icon
            name={expanded ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN}
            size={IconSizes.SM}
            color={(isDark ? DarkColors.primary : Colors.primary) as string}
            accessibilityLabel=""
          />
        </HapticTouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
