// frontend/__tests__/components/AnimatedEmptyState.test.tsx
// Phase 2: AnimatedEmptyState — Moti-animated mascot/icon + CTA

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';

jest.mock('moti', () => {
  const { View } = require('react-native');
  return {
    MotiView: function MockMotiView(props: any) {
      return <View {...props} />;
    },
  };
});

jest.mock('../../components/mascot/LogoMascot', () => {
  const { Text } = require('react-native');
  return function MockLogoMascot({ expression }: { expression?: string }) {
    return <Text testID="mascot">{expression || 'mascot'}</Text>;
  };
});

jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: { accessibilityLabel?: string }) {
    return <Text testID="empty-icon">{accessibilityLabel || 'icon'}</Text>;
  };
});

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchableOpacity(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: { buttonPressPrimary: jest.fn() },
}));

describe('AnimatedEmptyState', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the title', () => {
    const { getByText } = render(
      <AnimatedEmptyState title="Nothing here yet" />
    );
    expect(getByText('Nothing here yet')).toBeTruthy();
  });

  it('renders description when provided', () => {
    const { getByText } = render(
      <AnimatedEmptyState title="Empty" description="Add some items to get started" />
    );
    expect(getByText('Add some items to get started')).toBeTruthy();
  });

  it('does not render description when omitted', () => {
    const { queryByText } = render(
      <AnimatedEmptyState title="Empty" />
    );
    // Only the title, no description text
    expect(queryByText('Add some items to get started')).toBeNull();
  });

  it('renders action button when actionLabel and onAction provided', () => {
    const { getByText } = render(
      <AnimatedEmptyState
        title="Empty"
        actionLabel="Get Started"
        onAction={jest.fn()}
      />
    );
    expect(getByText('Get Started')).toBeTruthy();
  });

  it('does not render action button when onAction is missing', () => {
    const { queryByText } = render(
      <AnimatedEmptyState title="Empty" actionLabel="Get Started" />
    );
    expect(queryByText('Get Started')).toBeNull();
  });

  it('calls onAction when action button is pressed', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <AnimatedEmptyState title="Empty" actionLabel="Get Started" onAction={onAction} />
    );
    fireEvent.press(getByText('Get Started'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('fires haptic when action button pressed', () => {
    const { HapticPatterns } = require('../../constants/Haptics');
    const { getByText } = render(
      <AnimatedEmptyState title="Empty" actionLabel="Go" onAction={jest.fn()} />
    );
    fireEvent.press(getByText('Go'));
    expect(HapticPatterns.buttonPressPrimary).toHaveBeenCalledTimes(1);
  });

  it('renders mascot when useMascot=true', () => {
    const { getByTestId } = render(
      <AnimatedEmptyState title="Empty" useMascot mascotExpression="thinking" />
    );
    expect(getByTestId('mascot')).toBeTruthy();
  });

  it('renders mascot with correct expression', () => {
    const { getByText } = render(
      <AnimatedEmptyState title="Empty" useMascot mascotExpression="chef-kiss" />
    );
    expect(getByText('chef-kiss')).toBeTruthy();
  });

  it('does not render mascot when useMascot=false', () => {
    const { queryByTestId } = render(
      <AnimatedEmptyState title="Empty" useMascot={false} />
    );
    expect(queryByTestId('mascot')).toBeNull();
  });

  it('renders icon when useMascot=false and icon provided', () => {
    const { getByTestId } = render(
      <AnimatedEmptyState title="Empty" useMascot={false} icon="CART_OUTLINE" />
    );
    expect(getByTestId('empty-icon')).toBeTruthy();
  });

  it('uses config.title when config is provided', () => {
    const config = {
      title: 'Config Title',
      description: 'Config Description',
      useMascot: false,
    } as any;
    const { getByText } = render(
      <AnimatedEmptyState title="Fallback" config={config} />
    );
    expect(getByText('Config Title')).toBeTruthy();
    expect(getByText('Config Description')).toBeTruthy();
  });

  it('config.actionLabel + onAction renders the CTA', () => {
    const onAction = jest.fn();
    const config = {
      title: 'Empty',
      actionLabel: 'Config CTA',
      useMascot: false,
    } as any;
    const { getByText } = render(
      <AnimatedEmptyState title="Fallback" config={config} onAction={onAction} />
    );
    fireEvent.press(getByText('Config CTA'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
