// frontend/components/home/SurpriseMeFAB.tsx
// Floating Action Button — "Surprise Me!" gradient pill with spring bounce on press.
// Now uses BrandButton with idlePulse for consistent animation behavior.

import { StyleSheet, ViewStyle } from 'react-native';
import BrandButton from '../ui/BrandButton';

interface SurpriseMeFABProps {
  onPress: () => void;
  bottomOffset?: number;
}

export default function SurpriseMeFAB({ onPress, bottomOffset }: SurpriseMeFABProps) {
  const wrapperStyle: ViewStyle = {
    position: 'absolute',
    bottom: bottomOffset !== undefined ? bottomOffset + 12 : 100,
    right: 20,
    zIndex: 50,
  };

  return (
    <BrandButton
      label="Surprise Me!"
      emoji="🎰"
      onPress={onPress}
      variant="brand"
      idlePulse
      style={wrapperStyle}
      accessibilityLabel="Surprise Me — open recipe roulette"
    />
  );
}
