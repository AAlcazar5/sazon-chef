// frontend/__tests__/components/home/HomeErrorState.test.tsx
// ROADMAP 4.0 FX1.2 — body-only error state.

import React from 'react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import HomeErrorState from '../../../components/home/HomeErrorState';

jest.mock('../../../components/mascot', () => ({
  AnimatedLogoMascot: function MockAnimatedLogoMascot() {
    const { View } = require('react-native');
    return <View testID="mascot-animated-header" />;
  },
  LogoMascot: function MockLogoMascot() {
    const { View } = require('react-native');
    return <View testID="mascot-body" />;
  },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../components/ui/GradientButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockGradientButton({ label, onPress }: any) {
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{label}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../../constants/Haptics', () => ({
  HapticPatterns: { buttonPressPrimary: jest.fn() },
}));

describe('HomeErrorState (FX1.2 body-only)', () => {
  const baseProps = {
    error: 'Something went wrong',
    errorCode: null,
    failureClass: null,
    onRetry: jest.fn(),
  };

  it('does not render the inner mascot+title header', () => {
    const { queryByText, queryByTestId } = renderWithProviders(<HomeErrorState {...baseProps} />);
    expect(queryByText(/^Sazon Chef$/)).toBeNull();
    expect(queryByTestId('mascot-animated-header')).toBeNull();
  });

  it('renders the body mascot + retry CTA', () => {
    const { getByTestId, getByText } = renderWithProviders(<HomeErrorState {...baseProps} />);
    expect(getByTestId('mascot-body')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('fires onRetry when retry pressed', () => {
    const onRetry = jest.fn();
    const { getByText } = renderWithProviders(<HomeErrorState {...baseProps} onRetry={onRetry} />);
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(getByText('Try Again'));
    expect(onRetry).toHaveBeenCalled();
  });
});
