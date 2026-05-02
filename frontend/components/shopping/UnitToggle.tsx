// frontend/components/shopping/UnitToggle.tsx
// Group 10Q: imperial ↔ metric toggle — persists to AsyncStorage, display-only

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors } from '../../constants/Colors';
import type { UnitSystem } from '../../utils/unitConversion';

const STORAGE_KEY = 'shoppingList.unitSystem';

interface UnitToggleProps {
  onToggle: (system: UnitSystem) => void;
}

export default function UnitToggle({ onToggle }: UnitToggleProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [system, setSystem] = useState<UnitSystem>('imperial');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'metric' || stored === 'imperial') {
          setSystem(stored as UnitSystem);
        }
      })
      .catch(() => {
        // Ignore — fall through to the default 'imperial'. Keeps the toggle
        // usable even when AsyncStorage is corrupted or unavailable.
      });
  }, []);

  const toggle = async () => {
    const next: UnitSystem = system === 'imperial' ? 'metric' : 'imperial';
    setSystem(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persist failure is non-fatal; the in-memory toggle still flips.
    }
    onToggle(next);
  };

  const label = system === 'imperial' ? 'oz / cups' : 'ml / g';

  return (
    <HapticTouchableOpacity
      onPress={toggle}
      accessibilityLabel="Toggle unit system"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontFamily: 'PlusJakartaSans_500Medium',
          color: isDark ? '#D1D5DB' : '#374151',
        }}
      >
        {label}
      </Text>
    </HapticTouchableOpacity>
  );
}
