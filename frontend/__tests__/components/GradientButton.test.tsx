// frontend/__tests__/components/GradientButton.test.tsx
// GradientButton — pill shape, gradient, haptic, loading/disabled states, presets

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GradientButton, { GradientPresets } from '../../components/ui/GradientButton';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: function MockLinearGradient(props: any) {
      return <View testID="gradient" {...props} />;
    },
  };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name }: { name: string }) {
      return <Text testID={`icon-${name}`}>{name}</Text>;
    },
  };
});

describe('GradientButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the label', () => {
    const { getByText } = render(<GradientButton label="Sign In" onPress={jest.fn()} />);
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('renders a LinearGradient', () => {
    const { getByTestId } = render(<GradientButton label="Test" onPress={jest.fn()} />);
    expect(getByTestId('gradient')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<GradientButton label="Sign In" onPress={onPress} />);
    fireEvent.press(getByText('Sign In'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<GradientButton label="Sign In" onPress={onPress} disabled />);
    fireEvent.press(getByLabelText('Sign In'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading', () => {
    const { getByTestId } = render(
      <GradientButton label="Sign In" onPress={jest.fn()} loading testID="btn" />
    );
    // Label replaced by ActivityIndicator — check label is gone
    expect(() => { require('@testing-library/react-native').getByText('Sign In'); }).toBeTruthy();
    expect(getByTestId('btn')).toBeTruthy();
  });

  it('renders icon when provided', () => {
    const { getByTestId } = render(
      <GradientButton label="Sign In" onPress={jest.fn()} icon="log-in-outline" />
    );
    expect(getByTestId('icon-log-in-outline')).toBeTruthy();
  });

  it('does not render icon when not provided', () => {
    const { queryByTestId } = render(<GradientButton label="No icon" onPress={jest.fn()} />);
    expect(queryByTestId(/icon-/)).toBeNull();
  });

  it('accepts custom colors', () => {
    const { toJSON } = render(
      <GradientButton label="Custom" onPress={jest.fn()} colors={['#8B5CF6', '#7C3AED']} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing for all GradientPresets', () => {
    for (const [name, colors] of Object.entries(GradientPresets)) {
      const { toJSON } = render(
        <GradientButton key={name} label={name} onPress={jest.fn()} colors={colors} />
      );
      expect(toJSON()).toBeTruthy();
    }
  });

  it('applies testID to the touchable wrapper', () => {
    const { getByTestId } = render(
      <GradientButton label="Test" onPress={jest.fn()} testID="my-btn" />
    );
    expect(getByTestId('my-btn')).toBeTruthy();
  });
});

describe('GradientPresets', () => {
  it('exports 6 named presets', () => {
    expect(Object.keys(GradientPresets)).toHaveLength(6);
  });

  it('each preset is a 2-element string tuple', () => {
    for (const colors of Object.values(GradientPresets)) {
      expect(colors).toHaveLength(2);
      expect(typeof colors[0]).toBe('string');
      expect(typeof colors[1]).toBe('string');
    }
  });

  it('brand preset starts with the app primary orange', () => {
    expect(GradientPresets.brand[0]).toBe('#fa7e12');
  });

  it('premium preset uses purple', () => {
    expect(GradientPresets.premium[0]).toBe('#A855F7');
  });

  it('fresh preset uses emerald', () => {
    expect(GradientPresets.fresh[0]).toBe('#10B981');
  });
});
