// frontend/components/meal-plan/GoalModeSelector.tsx
// Three-button selector for Cut / Maintain / Build goal modes

import React from 'react';
import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Colors, DarkColors } from '../../constants/Colors';
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

export default function GoalModeSelector({ selectedMode, onSelect, isDark }: GoalModeSelectorProps) {
  return (
    <View className="flex-row" style={{ gap: 8 }}>
      {MODES.map((mode) => {
        const isSelected = selectedMode === mode.key;
        return (
          <HapticTouchableOpacity
            key={mode.key}
            onPress={() => onSelect(mode.key)}
            className="flex-1 items-center rounded-xl py-3 px-2"
            style={{
              backgroundColor: isSelected
                ? (isDark ? mode.darkActiveBg : mode.activeBg)
                : (isDark ? '#374151' : '#F3F4F6'),
              borderWidth: isSelected ? 2 : 1,
              borderColor: isSelected ? mode.activeColor : (isDark ? '#4B5563' : '#E5E7EB'),
            }}
          >
            <Icon
              name={mode.icon as any}
              size={IconSizes.LG}
              color={isSelected ? mode.activeColor : (isDark ? '#9CA3AF' : '#6B7280')}
            />
            <Text
              className="font-semibold mt-1"
              style={{
                fontSize: 14,
                color: isSelected ? mode.activeColor : (isDark ? '#D1D5DB' : '#374151'),
              }}
            >
              {mode.label}
            </Text>
            <Text
              className="mt-0.5"
              style={{
                fontSize: 11,
                color: isSelected ? mode.activeColor : (isDark ? '#9CA3AF' : '#9CA3AF'),
              }}
            >
              {mode.description}
            </Text>
          </HapticTouchableOpacity>
        );
      })}
    </View>
  );
}
