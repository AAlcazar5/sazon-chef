// frontend/__tests__/components/ContinuityCTA.test.tsx
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, testID, style }: any) => (
      <TouchableOpacity onPress={onPress} accessibilityLabel={accessibilityLabel} testID={testID} style={style}>
        {children}
      </TouchableOpacity>
    ),
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ContinuityCTA from '../../components/ui/ContinuityCTA';

describe('ContinuityCTA', () => {
  test('renders label and fires onPress', () => {
    const onPress = jest.fn();
    const { getByText, getByTestId } = render(
      <ContinuityCTA label="Cook tonight's meal" icon="restaurant" onPress={onPress} testID="cta" />,
    );
    expect(getByText("Cook tonight's meal")).toBeTruthy();
    fireEvent.press(getByTestId('cta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('uses label as accessibilityLabel when not explicitly set', () => {
    const { getByLabelText } = render(
      <ContinuityCTA label="Mark as used" icon="checkmark" onPress={() => {}} />,
    );
    expect(getByLabelText('Mark as used')).toBeTruthy();
  });

  test('respects explicit accessibilityLabel override', () => {
    const { getByLabelText } = render(
      <ContinuityCTA
        label="View shopping list"
        icon="cart"
        accessibilityLabel="Jump to shopping list for this week"
        onPress={() => {}}
      />,
    );
    expect(getByLabelText('Jump to shopping list for this week')).toBeTruthy();
  });

  test('renders across all tint variants without crashing', () => {
    const tints = ['sage', 'golden', 'lavender', 'peach', 'sky', 'blush'] as const;
    tints.forEach((tint) => {
      const { getByText } = render(
        <ContinuityCTA label={`Tint ${tint}`} icon="star" onPress={() => {}} tint={tint} />,
      );
      expect(getByText(`Tint ${tint}`)).toBeTruthy();
    });
  });
});
