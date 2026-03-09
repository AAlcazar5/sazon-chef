// frontend/__tests__/components/HapticTouchableOpacity.test.tsx
// Phase 1: useSpringPress + haptic feedback behavior

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('../../constants/Haptics', () => ({
  ImpactStyle: { light: 'light', medium: 'medium', heavy: 'heavy' },
  HapticPatterns: {
    buttonPress: jest.fn(),
    buttonPressPrimary: jest.fn(),
    buttonPressDestructive: jest.fn(),
  },
}));

describe('HapticTouchableOpacity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders children', () => {
    const { getByText } = render(
      <HapticTouchableOpacity onPress={jest.fn()}>
        <Text>Press me</Text>
      </HapticTouchableOpacity>
    );
    expect(getByText('Press me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <HapticTouchableOpacity onPress={onPress}>
        <Text>Tap</Text>
      </HapticTouchableOpacity>
    );
    fireEvent.press(getByText('Tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('fires light haptic by default', () => {
    const { HapticPatterns } = require('../../constants/Haptics');
    const { getByText } = render(
      <HapticTouchableOpacity onPress={jest.fn()}>
        <Text>Tap</Text>
      </HapticTouchableOpacity>
    );
    fireEvent.press(getByText('Tap'));
    expect(HapticPatterns.buttonPress).toHaveBeenCalledTimes(1);
    expect(HapticPatterns.buttonPressPrimary).not.toHaveBeenCalled();
    expect(HapticPatterns.buttonPressDestructive).not.toHaveBeenCalled();
  });

  it('fires medium haptic when hapticStyle="medium"', () => {
    const { HapticPatterns } = require('../../constants/Haptics');
    const { getByText } = render(
      <HapticTouchableOpacity onPress={jest.fn()} hapticStyle="medium">
        <Text>Tap</Text>
      </HapticTouchableOpacity>
    );
    fireEvent.press(getByText('Tap'));
    expect(HapticPatterns.buttonPressPrimary).toHaveBeenCalledTimes(1);
    expect(HapticPatterns.buttonPress).not.toHaveBeenCalled();
  });

  it('fires heavy haptic when hapticStyle="heavy"', () => {
    const { HapticPatterns } = require('../../constants/Haptics');
    const { getByText } = render(
      <HapticTouchableOpacity onPress={jest.fn()} hapticStyle="heavy">
        <Text>Tap</Text>
      </HapticTouchableOpacity>
    );
    fireEvent.press(getByText('Tap'));
    expect(HapticPatterns.buttonPressDestructive).toHaveBeenCalledTimes(1);
  });

  it('does not fire haptic when hapticDisabled=true', () => {
    const { HapticPatterns } = require('../../constants/Haptics');
    const { getByText } = render(
      <HapticTouchableOpacity onPress={jest.fn()} hapticDisabled>
        <Text>Tap</Text>
      </HapticTouchableOpacity>
    );
    fireEvent.press(getByText('Tap'));
    expect(HapticPatterns.buttonPress).not.toHaveBeenCalled();
  });

  it('does not call onPress or haptic when disabled=true', () => {
    const { HapticPatterns } = require('../../constants/Haptics');
    const onPress = jest.fn();
    const { getByText } = render(
      <HapticTouchableOpacity onPress={onPress} disabled>
        <Text>Tap</Text>
      </HapticTouchableOpacity>
    );
    fireEvent.press(getByText('Tap'));
    expect(onPress).not.toHaveBeenCalled();
    expect(HapticPatterns.buttonPress).not.toHaveBeenCalled();
  });

  it('has accessibilityRole="button" by default', () => {
    const { getByRole } = render(
      <HapticTouchableOpacity onPress={jest.fn()}>
        <Text>Tap</Text>
      </HapticTouchableOpacity>
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('renders without onPress prop without crashing', () => {
    const { getByText } = render(
      <HapticTouchableOpacity>
        <Text>No handler</Text>
      </HapticTouchableOpacity>
    );
    expect(getByText('No handler')).toBeTruthy();
    // Should not throw when pressed with no onPress
    expect(() => fireEvent.press(getByText('No handler'))).not.toThrow();
  });
});
