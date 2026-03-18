// frontend/components/meal-plan/GoalModeSelector.tsx
// Three-button selector for Cut / Maintain / Build goal modes

import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { Icons, IconSizes } from '../../constants/Icons';

export type GoalMode = 'cut' | 'maintain' | 'build';

interface GoalModeSelectorProps {
  selectedMode: GoalMode;
  onSelect: (mode: GoalMode) => void;
  isDark: boolean;
}

const MODES: Array<{
  key: GoalMode;
  label: string;
  icon: string;
  description: string;
  activeColor: string;
  activeBg: string;
  darkActiveBg: string;
}> = [
  {
    key: 'cut',
    label: 'Cut',
    icon: 'trending-down',
    description: 'Fewer calories',
    activeColor: '#EF4444',
    activeBg: '#FEE2E2',
    darkActiveBg: 'rgba(239, 68, 68, 0.2)',
  },
  {
    key: 'maintain',
    label: 'Maintain',
    icon: 'remove',
    description: 'Stay balanced',
    activeColor: '#3B82F6',
    activeBg: '#DBEAFE',
    darkActiveBg: 'rgba(59, 130, 246, 0.2)',
  },
  {
    key: 'build',
    label: 'Build',
    icon: 'trending-up',
    description: 'More fuel',
    activeColor: '#22C55E',
    activeBg: '#DCFCE7',
    darkActiveBg: 'rgba(34, 197, 94, 0.2)',
  },
];

function GoalModeButton({ mode, isSelected, isDark, onSelect }: {
  mode: typeof MODES[number];
  isSelected: boolean;
  isDark: boolean;
  onSelect: (mode: GoalMode) => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animStyle, { flex: 1 }]}>
      <HapticTouchableOpacity
        onPress={() => onSelect(mode.key)}
        onPressIn={() => { scale.value = withSpring(0.93, { damping: 10, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
        style={[{
          alignItems: 'center',
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 8,
          backgroundColor: isSelected
            ? (isDark ? mode.darkActiveBg : mode.activeBg)
            : (isDark ? '#1C1C1E' : '#FFFFFF'),
        }, isSelected ? Shadows.MD : Shadows.SM]}
      >
        <Icon
          name={mode.icon as any}
          size={IconSizes.LG}
          color={isSelected ? mode.activeColor : (isDark ? '#9CA3AF' : '#6B7280')}
        />
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            marginTop: 4,
            color: isSelected ? mode.activeColor : (isDark ? '#D1D5DB' : '#374151'),
          }}
        >
          {mode.label}
        </Text>
        <Text
          style={{
            fontSize: 11,
            marginTop: 2,
            color: isSelected ? mode.activeColor : (isDark ? '#9CA3AF' : '#9CA3AF'),
          }}
        >
          {mode.description}
        </Text>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

export default function GoalModeSelector({ selectedMode, onSelect, isDark }: GoalModeSelectorProps) {
  return (
    <View className="flex-row" style={{ gap: 10 }}>
      {MODES.map((mode) => (
        <GoalModeButton
          key={mode.key}
          mode={mode}
          isSelected={selectedMode === mode.key}
          isDark={isDark}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}
