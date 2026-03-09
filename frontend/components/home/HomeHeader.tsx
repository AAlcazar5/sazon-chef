// frontend/components/home/HomeHeader.tsx
// Frosted-glass header for the home screen — brand name collapses on scroll, search fades in

import React, { useRef } from 'react';
import { View, Text, Animated, TextInput } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import FrostedHeader from '../ui/FrostedHeader';
import { LogoMascot } from '../mascot';
import { Colors, DarkColors } from '../../constants/Colors';

export type ViewMode = 'grid' | 'list';

interface HomeHeaderProps {
  /** Current view mode */
  viewMode: ViewMode;
  /** Called when view mode changes */
  onToggleViewMode: (mode: ViewMode) => void;
  /** Called when the mascot logo is pressed — scrolls to top */
  onMascotPress: () => void;
  /** Scroll offset from the main scroll view — drives brand name collapse */
  scrollY?: Animated.Value;
  /** Current search query value (shown in collapsed header search bar) */
  searchValue?: string;
  /** Called when search text changes in the collapsed header search bar */
  onSearchChange?: (text: string) => void;
}

/**
 * Header component for the home screen.
 * Brand name fades out as the user scrolls; a compact search bar fades in to replace it.
 * Logo (mascot) stays visible throughout.
 */
export default function HomeHeader({
  viewMode,
  onToggleViewMode,
  onMascotPress,
  scrollY,
  searchValue = '',
  onSearchChange,
}: HomeHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Brand name fades from fully visible → invisible over first 48px of scroll
  const brandOpacity = scrollY
    ? scrollY.interpolate({ inputRange: [0, 48], outputRange: [1, 0], extrapolate: 'clamp' })
    : 1;

  // Brand name slides left slightly as it fades (feels more intentional than a flat fade)
  const brandTranslateX = scrollY
    ? scrollY.interpolate({ inputRange: [0, 48], outputRange: [0, -8], extrapolate: 'clamp' })
    : 0;

  // Search bar fades in as the brand name fades out (inverse animation)
  const searchOpacity = scrollY
    ? scrollY.interpolate({ inputRange: [0, 48], outputRange: [0, 1], extrapolate: 'clamp' })
    : 0;

  // Focus ring animation — springs to 1 on focus, back to 0 on blur
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    Animated.spring(focusAnim, { toValue: 1, useNativeDriver: false, speed: 28, bounciness: 8 }).start();
  };
  const handleBlur = () => {
    Animated.spring(focusAnim, { toValue: 0, useNativeDriver: false, speed: 20, bounciness: 4 }).start();
  };

  const pillBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
  const iconColor = isDark ? '#9CA3AF' : '#6B7280';
  const textColor = isDark ? DarkColors.text.primary : Colors.text.primary;

  const focusBorderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', isDark ? DarkColors.primary : Colors.primary],
  });
  const focusBorderWidth = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1.5],
  });

  return (
    <FrostedHeader paddingBottom={12} withTopInset={false}>
      <View className="flex-row items-center justify-between" style={{ height: 36 }}>
        {/* Logo — always visible */}
        <HapticTouchableOpacity onPress={onMascotPress}>
          <LogoMascot size="xsmall" />
        </HapticTouchableOpacity>

        {/* Cross-fade area: brand name ↔ compact search bar */}
        <View style={{ flex: 1, height: 36, marginLeft: 2 }}>
          {/* Brand name — fades out on scroll */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              opacity: brandOpacity,
              transform: [{ translateX: brandTranslateX }],
            }}
          >
            <Text
              className="text-2xl font-black text-gray-900 dark:text-gray-100"
              style={{ lineHeight: 36 }}
              accessibilityRole="header"
            >
              Sazon Chef
            </Text>
          </Animated.View>

          {/* Compact search bar — fades in on scroll */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              opacity: searchOpacity,
            }}
          >
            <Animated.View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 12,
                paddingHorizontal: 12,
                height: 32,
                backgroundColor: pillBg,
                borderWidth: focusBorderWidth,
                borderColor: focusBorderColor,
              }}
            >
              <Ionicons name="search" size={14} color={iconColor} style={{ marginRight: 6 }} />
              <TextInput
                value={searchValue}
                onChangeText={onSearchChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="Search recipes..."
                placeholderTextColor={iconColor}
                style={{ flex: 1, color: textColor, fontSize: 14, paddingVertical: 0 }}
                returnKeyType="search"
                accessibilityLabel="Search recipes"
              />
              {searchValue.length > 0 && (
                <HapticTouchableOpacity onPress={() => onSearchChange?.('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={iconColor} />
                </HapticTouchableOpacity>
              )}
            </Animated.View>
          </Animated.View>
        </View>

        {/* View Mode Toggle */}
        <View
          className="flex-row items-center rounded-lg p-1 ml-2"
          style={{ backgroundColor: pillBg }}
        >
          {(['list', 'grid'] as ViewMode[]).map((mode) => (
            <HapticTouchableOpacity
              key={mode}
              onPress={() => onToggleViewMode(mode)}
              className="px-3 py-1.5 rounded"
              style={
                viewMode === mode
                  ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary }
                  : undefined
              }
            >
              <Ionicons
                name={mode as any}
                size={18}
                color={viewMode === mode ? '#FFF' : iconColor}
              />
            </HapticTouchableOpacity>
          ))}
        </View>
      </View>
    </FrostedHeader>
  );
}
