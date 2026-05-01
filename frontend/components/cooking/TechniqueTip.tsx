// Group 10I: Collapsible "What's this?" tip for an unfamiliar cooking technique.
// Shown inline below the current instruction in cooking mode.

import { useState } from 'react';
import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';

interface TechniqueTipProps {
  term: string;
  explanation: string;
  testID?: string;
  onOpen?: () => void;
}

export default function TechniqueTip({ term, explanation, testID, onOpen }: TechniqueTipProps) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    if (!open) onOpen?.();
    setOpen((prev) => !prev);
  };

  return (
    <View
      testID={testID}
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(249,115,22,0.10)',
      }}
    >
      <HapticTouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`What is ${term}?`}
        onPress={toggle}
        testID={`${testID}-toggle`}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={{ color: '#FDBA74', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
          {open ? '—' : '?'} What’s {term.toLowerCase()}?
        </Text>
        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{open ? 'Hide' : 'Show'}</Text>
      </HapticTouchableOpacity>

      {open && (
        <Text
          testID={`${testID}-explanation`}
          style={{ color: '#E5E7EB', fontSize: 13, marginTop: 8, lineHeight: 18 }}
        >
          {explanation}
        </Text>
      )}
    </View>
  );
}
