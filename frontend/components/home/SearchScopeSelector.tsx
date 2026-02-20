import React from 'react';
// frontend/components/home/SearchScopeSelector.tsx
// Chip-style scope filter for search results: All | Saved | Liked

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';

export type SearchScope = 'all' | 'saved' | 'liked';

interface SearchScopeSelectorProps {
  /** Currently active scope */
  activeScope: SearchScope;
  /** Called when user taps a scope chip */
  onScopeChange: (scope: SearchScope) => void;
}

const SCOPES: { key: SearchScope; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: Icons.SEARCH },
  { key: 'saved', label: 'Saved', icon: Icons.BOOKMARK },
  { key: 'liked', label: 'Liked', icon: Icons.LIKE },
];

function SearchScopeSelector({
  activeScope,
  onScopeChange,
}: SearchScopeSelectorProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const primary = isDark ? DarkColors.primary : Colors.primary;

  return (
    <View className="flex-row px-4 py-2" style={{ gap: 8 }}>
      {SCOPES.map(({ key, label, icon }) => {
        const isActive = activeScope === key;

        return (
          <HapticTouchableOpacity
            key={key}
            onPress={() => {
              if (!isActive) {
                HapticPatterns.buttonPress();
                onScopeChange(key);
              }
            }}
            className={`flex-row items-center px-3.5 py-1.5 rounded-full ${
              isActive
                ? ''
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
            style={isActive ? { backgroundColor: primary } : undefined}
          >
            <Icon
              name={icon as any}
              size={14}
              color={isActive ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280'}
              style={{ marginRight: 5 }}
            />
            <Text
              className={`text-sm font-medium ${
                isActive ? '' : 'text-gray-600 dark:text-gray-300'
              }`}
              style={isActive ? { color: '#FFFFFF' } : undefined}
            >
              {label}
            </Text>
          </HapticTouchableOpacity>
        );
      })}
    </View>
  );
}

export default React.memo(SearchScopeSelector);
