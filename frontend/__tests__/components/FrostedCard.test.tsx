// frontend/__tests__/components/FrostedCard.test.tsx
// Tests for the FrostedCard glassmorphic component

import React from 'react';
import { Text, Platform } from 'react-native';
import { render } from '@testing-library/react-native';
import FrostedCard from '../../components/ui/FrostedCard';

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return {
    BlurView: function MockBlurView(props: any) {
      return <View testID="blur-view" {...props} />;
    },
  };
});

describe('FrostedCard', () => {
  const originalPlatformOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatformOS, writable: true });
  });

  it('renders children', () => {
    const { getByText } = render(
      <FrostedCard>
        <Text>Card Content</Text>
      </FrostedCard>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('renders BlurView on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    const { getByTestId } = render(
      <FrostedCard testID="frosted-card">
        <Text>Content</Text>
      </FrostedCard>
    );
    expect(getByTestId('blur-view')).toBeTruthy();
  });

  it('uses semi-transparent fallback on Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
    const { getByTestId, queryByTestId } = render(
      <FrostedCard testID="frosted-card">
        <Text>Android Content</Text>
      </FrostedCard>
    );
    expect(getByTestId('frosted-card')).toBeTruthy();
    // No BlurView on Android
    expect(queryByTestId('blur-view')).toBeNull();
  });

  it('applies custom borderRadius', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
    const { getByTestId } = render(
      <FrostedCard testID="card" borderRadius={16}>
        <Text>Content</Text>
      </FrostedCard>
    );
    const card = getByTestId('card');
    const flatStyle = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style)
      : card.props.style;
    expect(flatStyle.borderRadius).toBe(16);
  });

  it('applies custom style', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
    const { getByTestId } = render(
      <FrostedCard testID="card" style={{ padding: 20 }}>
        <Text>Content</Text>
      </FrostedCard>
    );
    const card = getByTestId('card');
    const flatStyle = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style)
      : card.props.style;
    expect(flatStyle.padding).toBe(20);
  });
});
