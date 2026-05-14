// Group 10I: Collapsible "What's this?" tip for an unfamiliar cooking technique.
// Shown inline below the current instruction in cooking mode.

import { useState } from 'react';
import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';

interface TechniqueTipProps {
  term: string;
  explanation: string;
  testID?: string;
  onOpen?: () => void;
}

export default function TechniqueTip({ term, explanation, testID, onOpen }: TechniqueTipProps) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const toggle = () => {
    if (!open) onOpen?.();
    setOpen((prev) => !prev);
  };

  // a11y 2026-05-14: theme-aware text/bg. Light: 10% orange tint over white →
  // dark-orange text passes 4.7:1. Dark: 18% orange tint over near-black + light
  // text (#FFE0B2 + #F5EFE6) so the tip stays visible in dark mode (prev fixed
  // colors rendered invisible on dark composited bg).
  const containerBg = isDark ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.10)';
  const toggleColor = isDark ? '#FFE0B2' : '#C2410C';
  const subtleColor = isDark ? '#D1C7B8' : '#6B6B6B';
  const bodyColor = isDark ? '#F5EFE6' : '#1F1B16';

  return (
    <View
      testID={testID}
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 16,
        backgroundColor: containerBg,
      }}
    >
      <HapticTouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`What is ${term}?`}
        onPress={toggle}
        testID={`${testID}-toggle`}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={{ color: toggleColor, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
          {open ? '—' : '?'} What’s {term.toLowerCase()}?
        </Text>
        <Text style={{ color: subtleColor, fontSize: 12 }}>{open ? 'Hide' : 'Show'}</Text>
      </HapticTouchableOpacity>

      {open && (
        <Text
          testID={`${testID}-explanation`}
          style={{ color: bodyColor, fontSize: 13, marginTop: 8, lineHeight: 18 }}
        >
          {explanation}
        </Text>
      )}
    </View>
  );
}
