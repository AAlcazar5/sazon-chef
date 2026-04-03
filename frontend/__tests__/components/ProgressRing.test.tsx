// frontend/__tests__/components/ProgressRing.test.tsx
// Tests for ProgressRing circular progress indicator with gradient support (9L)

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import ProgressRing from '../../components/ui/ProgressRing';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = {
    ...jest.requireActual('react-native-reanimated/mock'),
    createAnimatedComponent: (component: any) => component,
    useReducedMotion: () => false,
  };
  return Reanimated;
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <View {...props} />,
    Svg: (props: any) => <View {...props} />,
    Circle: (props: any) => <View {...props} />,
    Defs: (props: any) => <View {...props} />,
    LinearGradient: (props: any) => <View {...props} />,
    Stop: (props: any) => <View {...props} />,
  };
});

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

describe('ProgressRing', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <ProgressRing progress={0.75} size={80} color="#81C784" testID="ring" />
    );
    expect(getByTestId('ring')).toBeTruthy();
  });

  it('shows correct accessibility label', () => {
    const { getByTestId } = render(
      <ProgressRing progress={0.5} size={80} color="#FFB74D" testID="ring" />
    );
    expect(getByTestId('ring').props.accessibilityLabel).toBe('Progress: 50%');
  });

  it('renders center children', () => {
    const { getByText } = render(
      <ProgressRing progress={0.6} size={100} color="#64B5F6">
        <Text>60%</Text>
      </ProgressRing>
    );
    expect(getByText('60%')).toBeTruthy();
  });

  it('accepts gradient color array', () => {
    const { getByTestId } = render(
      <ProgressRing
        progress={0.8}
        size={120}
        color={['#FFB74D', '#FB923C']}
        testID="gradient-ring"
      />
    );
    expect(getByTestId('gradient-ring')).toBeTruthy();
  });

  it('handles 0% progress', () => {
    const { getByTestId } = render(
      <ProgressRing progress={0} size={80} color="#81C784" testID="ring-0" />
    );
    expect(getByTestId('ring-0').props.accessibilityLabel).toBe('Progress: 0%');
  });

  it('handles 100% progress', () => {
    const { getByTestId } = render(
      <ProgressRing progress={1} size={80} color="#81C784" testID="ring-100" />
    );
    expect(getByTestId('ring-100').props.accessibilityLabel).toBe('Progress: 100%');
  });

  it('clamps progress above 150%', () => {
    const { getByTestId } = render(
      <ProgressRing progress={2} size={80} color="#81C784" testID="ring-over" />
    );
    // Should render without crashing
    expect(getByTestId('ring-over')).toBeTruthy();
  });
});
