import React, { useEffect } from 'react';
import { View, Platform, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { ComponentSpacing } from '../../constants/Spacing';
import { FontSize, FontWeight } from '../../constants/Typography';

const SPRING_CONFIG = { damping: 16, stiffness: 180, mass: 0.8 };

function TabItem({
  label,
  iconName,
  isFocused,
  onPress,
  onLongPress,
  color,
  activeColor,
}: {
  label: string;
  iconName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  color: string;
  activeColor: string;
}) {
  const scale = useSharedValue(isFocused ? 1.15 : 1);
  const opacity = useSharedValue(isFocused ? 1 : 0.6);
  const labelOpacity = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.15 : 1, SPRING_CONFIG);
    opacity.value = withSpring(isFocused ? 1 : 0.6, SPRING_CONFIG);
    labelOpacity.value = withSpring(isFocused ? 1 : 0, { damping: 20, stiffness: 200 });
  }, [isFocused]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ scale: labelOpacity.value * 0.2 + 0.8 }],
  }));

  return (
    <HapticTouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      hapticStyle="light"
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.iconWrap, iconAnimatedStyle]}>
        <Ionicons
          name={iconName as any}
          size={22}
          color={isFocused ? activeColor : color}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.label,
          { color: isFocused ? activeColor : color },
          labelAnimatedStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </HapticTouchableOpacity>
  );
}

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.filter(r => {
    const opts = descriptors[r.key]?.options;
    return (opts as any)?.href !== null;
  }).length;

  // Pill indicator position
  const indicatorX = useSharedValue(0);
  const tabWidths = useSharedValue<number[]>([]);
  const tabPositions = useSharedValue<number[]>([]);

  // Track visible tab index (excluding hidden tabs like "add")
  const visibleRoutes = state.routes.filter(r => {
    const opts = descriptors[r.key]?.options;
    return (opts as any)?.href !== null;
  });
  const activeVisibleIndex = visibleRoutes.findIndex(r => r.key === state.routes[state.index]?.key);

  useEffect(() => {
    if (tabPositions.value.length > 0 && activeVisibleIndex >= 0) {
      const pos = tabPositions.value[activeVisibleIndex] ?? 0;
      const w = tabWidths.value[activeVisibleIndex] ?? 0;
      indicatorX.value = withSpring(pos + w / 2 - 24, SPRING_CONFIG);
    }
  }, [activeVisibleIndex, tabPositions.value]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const barHeight = ComponentSpacing.tabBar.height + insets.bottom;

  return (
    <View style={[styles.container, { height: barHeight, paddingBottom: insets.bottom }]}>
      {/* Frosted background */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        >
          <View style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(15, 15, 15, 0.4)' : 'rgba(255, 255, 255, 0.4)' },
          ]} />
        </BlurView>
      ) : (
        <View style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? 'rgba(15, 15, 15, 0.92)' : 'rgba(255, 255, 255, 0.92)' },
        ]} />
      )}

      {/* Animated pill indicator */}
      <Animated.View style={[styles.pill, { backgroundColor: isDark ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.12)' }, pillStyle]} />

      {/* Tab items */}
      <View style={styles.tabsRow}>
        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.tabBarLabel as string) ?? options.title ?? route.name;
          const isFocused = activeVisibleIndex === index;
          const iconName = getIconName(route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <View
              key={route.key}
              style={styles.tab}
              onLayout={(e: LayoutChangeEvent) => {
                const { x, width } = e.nativeEvent.layout;
                const newPositions = [...tabPositions.value];
                const newWidths = [...tabWidths.value];
                newPositions[index] = x;
                newWidths[index] = width;
                tabPositions.value = newPositions;
                tabWidths.value = newWidths;
              }}
            >
              <TabItem
                label={label}
                iconName={iconName}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                color={colors.text.secondary}
                activeColor="#F97316"
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function getIconName(routeName: string): string {
  switch (routeName) {
    case 'index': return 'home-outline';
    case 'cookbook': return 'book-outline';
    case 'meal-plan': return 'calendar-outline';
    case 'shopping-list': return 'cart-outline';
    case 'profile': return 'person-outline';
    default: return 'ellipse-outline';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  tabsRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    paddingTop: ComponentSpacing.tabBar.paddingTop,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
    textAlign: 'center',
  },
  pill: {
    position: 'absolute',
    top: 6,
    width: 48,
    height: 32,
    borderRadius: 16,
  },
});
