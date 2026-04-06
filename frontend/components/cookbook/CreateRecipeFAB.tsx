// frontend/components/cookbook/CreateRecipeFAB.tsx
// Floating action button for creating a new recipe from the cookbook.
// Pill-shaped gradient using BrandButton for visual consistency.

import { StyleSheet, ViewStyle } from 'react-native';
import BrandButton from '../ui/BrandButton';

interface CreateRecipeFABProps {
  onPress: () => void;
  bottomOffset?: number;
}

export default function CreateRecipeFAB({ onPress, bottomOffset }: CreateRecipeFABProps) {
  const wrapperStyle: ViewStyle = {
    position: 'absolute',
    bottom: bottomOffset !== undefined ? bottomOffset + 12 : 100,
    right: 20,
    zIndex: 50,
  };

  return (
    <BrandButton
      label="Create"
      icon="add"
      onPress={onPress}
      variant="brand"
      idlePulse
      style={wrapperStyle}
      accessibilityLabel="Create a new recipe"
      testID="create-recipe-fab"
    />
  );
}
