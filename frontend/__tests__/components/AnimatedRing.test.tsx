// frontend/__tests__/components/AnimatedRing.test.tsx
// Tests for the AnimatedRing progress visualization component

import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedRing from '../../components/ui/AnimatedRing';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const Reanimated = {
    ...jest.requireActual('react-native-reanimated/mock'),
    createAnimatedComponent: (component: any) => component,
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
  };
});

describe('AnimatedRing', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <AnimatedRing progress={75} testID="ring" />
    );
    expect(getByTestId('ring')).toBeTruthy();
  });

  it('displays label text', () => {
    const { getByText } = render(
      <AnimatedRing progress={50} label="50%" />
    );
    expect(getByText('50%')).toBeTruthy();
  });

  it('displays sublabel text', () => {
    const { getByText } = render(
      <AnimatedRing progress={75} label="75" sublabel="Complete" />
    );
    expect(getByText('Complete')).toBeTruthy();
  });

  it('clamps progress to 0-100', () => {
    // Should not crash with out-of-bounds values
    const { getByTestId: getOver } = render(
      <AnimatedRing progress={150} testID="ring-over" />
    );
    expect(getOver('ring-over')).toBeTruthy();

    const { getByTestId: getUnder } = render(
      <AnimatedRing progress={-10} testID="ring-under" />
    );
    expect(getUnder('ring-under')).toBeTruthy();
  });

  it('sets accessibility label with progress value', () => {
    const { getByLabelText } = render(
      <AnimatedRing progress={42} />
    );
    expect(getByLabelText('Progress: 42%')).toBeTruthy();
  });

  it('renders at custom size', () => {
    const { getByTestId } = render(
      <AnimatedRing progress={50} size={120} testID="ring" />
    );
    expect(getByTestId('ring')).toBeTruthy();
  });
});
