// frontend/components/ui/FilterSection.tsx
// Collapsible section wrapper for filter sheets — icon + title + count badge + animated expand/collapse

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';

interface FilterSectionProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Number of active filters in this group */
  activeCount?: number;
  /** Start expanded (default: true if activeCount > 0) */
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const SPRING_CONFIG = { damping: 18, stiffness: 200 };

export default function FilterSection({
  title,
  icon,
  activeCount = 0,
  defaultExpanded,
  children,
}: FilterSectionProps) {
  const { theme, colors } = useTheme();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(
    defaultExpanded !== undefined ? defaultExpanded : true
  );

  const heightProgress = useSharedValue(expanded ? 1 : 0);
  const chevronRotation = useSharedValue(expanded ? 1 : 0);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    heightProgress.value = withSpring(next ? 1 : 0, SPRING_CONFIG);
    chevronRotation.value = withTiming(next ? 1 : 0, { duration: 200 });
  };

  const contentStyle = useAnimatedStyle(() => ({
    opacity: heightProgress.value,
    maxHeight: heightProgress.value * 500, // enough for content
    overflow: 'hidden' as const,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value * 180}deg` }],
  }));

  return (
    <View style={styles.container}>
      {/* Header row — tappable to collapse/expand */}
      <Pressable onPress={toggleExpand} style={styles.header}>
        <View style={styles.headerLeft}>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={isDark ? DarkColors.primary : Colors.primary}
              style={styles.headerIcon}
            />
          )}
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {title}
          </Text>
          {activeCount > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                },
              ]}
            >
              <Text style={styles.badgeText}>{activeCount}</Text>
            </View>
          )}
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons
            name="chevron-up"
            size={18}
            color={colors.text.tertiary}
          />
        </Animated.View>
      </Pressable>

      {/* Divider */}
      <View
        style={[
          styles.divider,
          { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' },
        ]}
      />

      {/* Collapsible content */}
      <Animated.View style={contentStyle}>
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  badge: {
    marginLeft: 8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  content: {
    paddingTop: 12,
    paddingBottom: 8,
  },
});
