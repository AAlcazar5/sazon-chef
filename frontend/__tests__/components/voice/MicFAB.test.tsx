// Y-Siri-1b (founder Telegram 2026-05-22) — visible voice-entry FAB tests.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MicFAB from '../../../components/voice/MicFAB';

describe('MicFAB', () => {
  it('renders with the default a11y label', () => {
    render(<MicFAB onPress={jest.fn()} />);
    expect(screen.getByLabelText('Voice to Sazon')).toBeTruthy();
    expect(screen.getByTestId('mic-fab')).toBeTruthy();
  });

  it('honors a custom accessibilityLabel override', () => {
    render(<MicFAB onPress={jest.fn()} accessibilityLabel="Tap to speak" />);
    expect(screen.getByLabelText('Tap to speak')).toBeTruthy();
  });

  it('exposes accessibilityRole=button + a hint', () => {
    render(<MicFAB onPress={jest.fn()} />);
    const fab = screen.getByTestId('mic-fab');
    expect(fab.props.accessibilityRole).toBe('button');
    expect(fab.props.accessibilityHint).toMatch(/speak|voice/i);
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    render(<MicFAB onPress={onPress} />);
    fireEvent.press(screen.getByTestId('mic-fab'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
