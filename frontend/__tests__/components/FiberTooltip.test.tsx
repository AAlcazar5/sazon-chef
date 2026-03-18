// frontend/__tests__/components/FiberTooltip.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import FiberTooltip from '../../components/recipe/FiberTooltip';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('FiberTooltip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
  });

  it('shows tooltip on first view (no AsyncStorage value)', async () => {
    render(<FiberTooltip />);
    await waitFor(() => {
      expect(screen.getByText('Fiber is a core macro')).toBeTruthy();
    });
  });

  it('does not show tooltip if already dismissed', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('1');
    render(<FiberTooltip />);
    // Wait for async check
    await waitFor(() => {
      expect(screen.queryByText('Fiber is a core macro')).toBeNull();
    });
  });

  it('shows educational copy about gut health', async () => {
    render(<FiberTooltip />);
    await waitFor(() => {
      expect(screen.getByText(/highest-impact things you can do/)).toBeTruthy();
    });
  });

  it('dismisses and saves to AsyncStorage when "Got it" is tapped', async () => {
    render(<FiberTooltip />);
    await waitFor(() => {
      expect(screen.getByText('Got it')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Got it'));
    });

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('sazon:fiber_tooltip_seen', '1');
  });

  it('checks AsyncStorage on mount', async () => {
    render(<FiberTooltip />);
    await waitFor(() => {
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('sazon:fiber_tooltip_seen');
    });
  });
});
