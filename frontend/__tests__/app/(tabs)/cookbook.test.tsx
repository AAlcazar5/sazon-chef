// frontend/__tests__/app/(tabs)/cookbook.test.tsx
// Group 10X Phase 1+2 — verifies the `composed` smart collection chip is rendered
// with editorial sage tint (using SmartCollectionCard).

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, testID, style }: any) => (
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={style}
      >
        {children}
      </TouchableOpacity>
    ),
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import SmartCollectionCard from '../../../components/cookbook/SmartCollectionCard';
import { Pastel } from '../../../constants/Colors';

const flattenStyle = (style: any) =>
  Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : (style ?? {});

describe('Cookbook — composed Smart Collection chip', () => {
  it('renders with sage pastel background tint when id is "composed"', () => {
    const { getByTestId } = render(
      <SmartCollectionCard
        id="composed"
        name="My Plates"
        icon="🍽️"
        description="Plates you composed"
        count={3}
        onPress={() => {}}
      />,
    );
    const card = getByTestId('smart-collection-card-composed');
    const flat = flattenStyle(card.props.style);
    // Sage pastel background — editorial tint for user-composed plates
    expect(flat.backgroundColor).toBe(Pastel.sage);
  });

  it('exposes accessibilityLabel including the recipe count', () => {
    const { getByLabelText } = render(
      <SmartCollectionCard
        id="composed"
        name="My Plates"
        icon="🍽️"
        description="Plates you composed"
        count={5}
        onPress={() => {}}
      />,
    );
    expect(getByLabelText(/My Plates smart collection, 5 recipes/i)).toBeTruthy();
  });

  it('singular recipe label when count is 1', () => {
    const { getByLabelText } = render(
      <SmartCollectionCard
        id="composed"
        name="My Plates"
        icon="🍽️"
        description="Plates you composed"
        count={1}
        onPress={() => {}}
      />,
    );
    expect(getByLabelText(/1 recipe/i)).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SmartCollectionCard
        id="composed"
        name="My Plates"
        icon="🍽️"
        description="Plates you composed"
        count={3}
        onPress={onPress}
      />,
    );
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(getByTestId('smart-collection-card-composed'));
    expect(onPress).toHaveBeenCalled();
  });
});
