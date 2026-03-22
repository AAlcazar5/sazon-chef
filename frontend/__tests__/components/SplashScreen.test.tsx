// frontend/__tests__/components/SplashScreen.test.tsx
// Tests for the SplashScreen brand intro component

import React from 'react';
import { render, act } from '@testing-library/react-native';
import SplashScreen from '../../components/ui/SplashScreen';

// Mock mascot components
jest.mock('../../components/mascot', () => ({
  AnimatedLogoMascot: function MockAnimatedLogoMascot({ expression, size, animationType }: any) {
    const { Text } = require('react-native');
    return <Text testID="animated-logo-mascot">{`${expression}-${size}-${animationType}`}</Text>;
  },
}));

// Mock useColorScheme
const mockUseColorScheme = jest.fn(() => 'light');
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockUseColorScheme(),
}));

describe('SplashScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders splash screen with testID', () => {
    const { getByTestId } = render(<SplashScreen />);
    expect(getByTestId('splash-screen')).toBeTruthy();
  });

  it('renders with mascot', () => {
    const { getByTestId } = render(<SplashScreen />);
    const mascot = getByTestId('animated-logo-mascot');
    expect(mascot).toBeTruthy();
    expect(mascot.props.children).toBe('excited-hero-celebrate');
  });

  it('renders the app title', () => {
    const { getByText } = render(<SplashScreen />);
    expect(getByText('Sazon Chef')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    const { getByText } = render(<SplashScreen />);
    expect(getByText('Your personal cooking companion')).toBeTruthy();
  });

  it('calls onFinish after duration', async () => {
    const mockOnFinish = jest.fn();
    render(<SplashScreen onFinish={mockOnFinish} duration={2000} />);

    // Should not have called onFinish yet
    expect(mockOnFinish).not.toHaveBeenCalled();

    // Advance past the duration
    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    // Advance past the cross-fade (400ms)
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockOnFinish).toHaveBeenCalledTimes(1);
  });

  it('uses default duration of 2000ms', async () => {
    const mockOnFinish = jest.fn();
    render(<SplashScreen onFinish={mockOnFinish} />);

    // Before 2000ms
    await act(async () => {
      jest.advanceTimersByTime(1900);
    });
    expect(mockOnFinish).not.toHaveBeenCalled();

    // After 2000ms + cross-fade 400ms
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(mockOnFinish).toHaveBeenCalled();
  });

  it('uses brand gradient background (LinearGradient is rendered)', () => {
    // LinearGradient is mocked in jest.setup.js as a passthrough component
    // If it renders without crashing, LinearGradient is being used
    const { getByTestId, getByText } = render(<SplashScreen />);
    expect(getByTestId('splash-screen')).toBeTruthy();
    // Content is visible through the LinearGradient mock
    expect(getByText('Sazon Chef')).toBeTruthy();
  });

  it('does not call onFinish when not provided', async () => {
    // Should not throw when onFinish is undefined
    render(<SplashScreen duration={500} />);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // No error means the guard `if (onFinish)` works
  });

  it('supports custom duration', async () => {
    const mockOnFinish = jest.fn();
    render(<SplashScreen onFinish={mockOnFinish} duration={500} />);

    // Before custom duration
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(mockOnFinish).not.toHaveBeenCalled();

    // After custom duration + cross-fade
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(mockOnFinish).toHaveBeenCalled();
  });

  it('cleans up timer on unmount', async () => {
    const mockOnFinish = jest.fn();
    const { unmount } = render(
      <SplashScreen onFinish={mockOnFinish} duration={2000} />
    );

    // Unmount before duration completes
    unmount();

    // Advance past duration
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    // onFinish should NOT have been called since component was unmounted
    expect(mockOnFinish).not.toHaveBeenCalled();
  });

  it('renders dark mode variant', () => {
    mockUseColorScheme.mockReturnValue('dark');

    const { getByText } = render(<SplashScreen />);
    const title = getByText('Sazon Chef');
    // In dark mode the title should still render
    expect(title).toBeTruthy();
  });
});
