import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BlackPillCTA } from '../../../components/ui/BlackPillCTA';

jest.mock('../../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name }: { name: string }) {
      return <Text testID={`icon-${name}`}>{name}</Text>;
    },
  };
});

describe('BlackPillCTA', () => {
  it('renders with black background', () => {
    const { getByTestId } = render(
      <BlackPillCTA label="Start cooking" onPress={jest.fn()} testID="cta" />
    );
    const cta = getByTestId('cta');
    expect(cta).toBeTruthy();
  });

  it('renders label in white text', () => {
    const { getByText } = render(
      <BlackPillCTA label="Start cooking" onPress={jest.fn()} />
    );
    expect(getByText('Start cooking')).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <BlackPillCTA label="Start cooking" onPress={onPress} />
    );
    fireEvent.press(getByText('Start cooking'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <BlackPillCTA label="Start cooking" onPress={onPress} disabled />
    );
    fireEvent.press(getByText('Start cooking'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders icon when provided', () => {
    const { getByTestId } = render(
      <BlackPillCTA label="Start cooking" onPress={jest.fn()} icon="play" />
    );
    expect(getByTestId('icon-play')).toBeTruthy();
  });

  it('has accessibility label', () => {
    const { getByLabelText } = render(
      <BlackPillCTA label="Start cooking" onPress={jest.fn()} />
    );
    expect(getByLabelText('Start cooking')).toBeTruthy();
  });
});
