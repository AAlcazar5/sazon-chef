// frontend/__tests__/utils/renderWithProviders.test.tsx

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { Text } from 'react-native';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

function AuthConsumer() {
  const { user, isAuthenticated } = useAuth();
  return <Text testID="auth">{isAuthenticated ? user?.email ?? '' : 'guest'}</Text>;
}

function ThemeConsumer() {
  const { theme } = useTheme();
  return <Text testID="theme">{theme}</Text>;
}

describe('renderWithProviders', () => {
  it('exposes a fake authenticated user by default', () => {
    const { getByTestId } = renderWithProviders(<AuthConsumer />);
    expect(getByTestId('auth').children[0]).toBe('test@sazon.local');
  });

  it('exposes light theme by default', () => {
    const { getByTestId } = renderWithProviders(<ThemeConsumer />);
    expect(getByTestId('theme').children[0]).toBe('light');
  });

  // useAuth has a jest.setup global mock too — same caveat as the theme
  // override below.

  // Note: a global jest.setup mock of `useTheme` returns light unconditionally
  // for legacy tests. The provider override on the helper still wraps children
  // in the right context — direct `useContext(ThemeContext)` consumers see
  // the override — but anything that goes through `useTheme()` will still see
  // the global mock until that mock is removed (R3).
});
