// frontend/__tests__/components/FrostedHeader.test.tsx
// Phase 2: FrostedHeader — BlurView on iOS, opaque fallback on Android

import React from 'react';
import { Text, Platform } from 'react-native';
import { render } from '@testing-library/react-native';
import FrostedHeader from '../../components/ui/FrostedHeader';

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return {
    BlurView: function MockBlurView(props: any) {
      return <View testID="blur-view" {...props} />;
    },
  };
});

describe('FrostedHeader', () => {
  const originalPlatformOS = Platform.OS;

  afterEach(() => {
    // Restore Platform.OS after each test
    Object.defineProperty(Platform, 'OS', { value: originalPlatformOS, writable: true });
  });

  it('renders children on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    const { getByText } = render(
      <FrostedHeader>
        <Text>Header Content</Text>
      </FrostedHeader>
    );
    expect(getByText('Header Content')).toBeTruthy();
  });

  it('uses BlurView on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    const { getByTestId } = render(
      <FrostedHeader>
        <Text>Content</Text>
      </FrostedHeader>
    );
    expect(getByTestId('blur-view')).toBeTruthy();
  });

  it('renders children on Android (fallback path)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
    const { getByText } = render(
      <FrostedHeader>
        <Text>Android Header</Text>
      </FrostedHeader>
    );
    expect(getByText('Android Header')).toBeTruthy();
  });

  it('does not use BlurView on Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
    const { queryByTestId } = render(
      <FrostedHeader>
        <Text>Content</Text>
      </FrostedHeader>
    );
    expect(queryByTestId('blur-view')).toBeNull();
  });

  it('applies paddingBottom prop without crashing', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
    const { toJSON } = render(
      <FrostedHeader paddingBottom={20}>
        <Text>Content</Text>
      </FrostedHeader>
    );
    expect(toJSON()).toBeTruthy();
  });

  it('adds safe area top inset by default', () => {
    // useSafeAreaInsets is globally mocked to return { top: 0 }
    // withTopInset=true (default) means paddingTop will include insets.top
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
    const { toJSON } = render(
      <FrostedHeader withTopInset>
        <Text>Content</Text>
      </FrostedHeader>
    );
    expect(toJSON()).toBeTruthy();
  });

  it('skips top inset when withTopInset=false', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    const { toJSON } = render(
      <FrostedHeader withTopInset={false}>
        <Text>Content</Text>
      </FrostedHeader>
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders multiple children', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    const { getByText } = render(
      <FrostedHeader>
        <Text>Left</Text>
        <Text>Right</Text>
      </FrostedHeader>
    );
    expect(getByText('Left')).toBeTruthy();
    expect(getByText('Right')).toBeTruthy();
  });
});
