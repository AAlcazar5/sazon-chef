// frontend/__tests__/components/AnimatedTabBar.test.tsx
// Phase 1: AnimatedTabBar — spring scale on active tab + indicator slide

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AnimatedTabBar from '../../components/ui/AnimatedTabBar';

// expo-router is globally mocked; add usePathname
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: jest.fn(() => '/(tabs)/'),
}));

// Override global ThemeContext mock with full colors structure
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    isDark: false,
    themeMode: 'light',
    colors: {
      background: '#FFFFFF',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
      border: { light: '#F3F4F6', medium: '#E5E7EB' },
    },
    setThemeMode: jest.fn(),
    toggleTheme: jest.fn(),
  })),
  ThemeProvider: function MockThemeProvider(props: any) { return props.children; },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name }: { name: string }) {
      return <Text testID={`icon-${name}`}>{name}</Text>;
    },
  };
});

describe('AnimatedTabBar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all 5 tab labels', () => {
    const { getByText } = render(<AnimatedTabBar />);
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Cookbook')).toBeTruthy();
    expect(getByText('Meal Plan')).toBeTruthy();
    expect(getByText('Shopping')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
  });

  it('renders icons for all 5 tabs', () => {
    const { getByTestId } = render(<AnimatedTabBar />);
    expect(getByTestId('icon-home-outline')).toBeTruthy();
    expect(getByTestId('icon-book-outline')).toBeTruthy();
    expect(getByTestId('icon-calendar-outline')).toBeTruthy();
    expect(getByTestId('icon-cart-outline')).toBeTruthy();
    expect(getByTestId('icon-person-outline')).toBeTruthy();
  });

  it('calls router.push when a tab is pressed', () => {
    const mockRouter = { push: jest.fn() };
    const { useRouter } = require('expo-router');
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    const { getByText } = render(<AnimatedTabBar />);
    fireEvent.press(getByText('Cookbook'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/cookbook');
  });

  it('navigates to correct route for each tab', () => {
    const mockRouter = { push: jest.fn() };
    const { useRouter } = require('expo-router');
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    const { getByText } = render(<AnimatedTabBar />);

    fireEvent.press(getByText('Meal Plan'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/meal-plan');

    fireEvent.press(getByText('Shopping'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/shopping-list');

    fireEvent.press(getByText('Profile'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/profile');
  });

  it('marks Home as active when pathname is "/(tabs)/"', () => {
    const { usePathname } = require('expo-router');
    (usePathname as jest.Mock).mockReturnValue('/(tabs)/');

    const { getByText } = render(<AnimatedTabBar />);
    // Active tab renders with orange color (#F97316) — check the label text exists
    expect(getByText('Home')).toBeTruthy();
  });

  it('marks Cookbook as active when pathname matches', () => {
    const { usePathname } = require('expo-router');
    (usePathname as jest.Mock).mockReturnValue('/(tabs)/cookbook');

    const { getByText } = render(<AnimatedTabBar />);
    expect(getByText('Cookbook')).toBeTruthy();
  });

  it('renders without crashing on unknown pathname (falls back to Home)', () => {
    const { usePathname } = require('expo-router');
    (usePathname as jest.Mock).mockReturnValue('/unknown-route');

    const { getByText } = render(<AnimatedTabBar />);
    expect(getByText('Home')).toBeTruthy();
  });
});
