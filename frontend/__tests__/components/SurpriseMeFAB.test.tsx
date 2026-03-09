// frontend/__tests__/components/SurpriseMeFAB.test.tsx
// Phase 4: SurpriseMeFAB — gradient FAB with spring bounce, spring scale on press

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SurpriseMeFAB from '../../components/home/SurpriseMeFAB';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: function MockLinearGradient(props: any) {
      return <View testID="linear-gradient" {...props} />;
    },
  };
});

describe('SurpriseMeFAB', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { toJSON } = render(<SurpriseMeFAB onPress={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders "Surprise Me!" label', () => {
    const { getByText } = render(<SurpriseMeFAB onPress={jest.fn()} />);
    expect(getByText('Surprise Me!')).toBeTruthy();
  });

  it('renders the roulette emoji', () => {
    const { getByText } = render(<SurpriseMeFAB onPress={jest.fn()} />);
    expect(getByText('🎰')).toBeTruthy();
  });

  it('renders LinearGradient pill', () => {
    const { getByTestId } = render(<SurpriseMeFAB onPress={jest.fn()} />);
    expect(getByTestId('linear-gradient')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SurpriseMeFAB onPress={onPress} />);
    fireEvent.press(getByText('Surprise Me!'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibilityLabel', () => {
    const { getByLabelText } = render(<SurpriseMeFAB onPress={jest.fn()} />);
    expect(getByLabelText('Surprise Me — open recipe roulette')).toBeTruthy();
  });
});
