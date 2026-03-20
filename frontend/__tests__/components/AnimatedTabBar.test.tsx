// frontend/__tests__/components/AnimatedTabBar.test.tsx
// Tests for the custom animated tab bar with pill indicator

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AnimatedTabBar from '../../components/ui/AnimatedTabBar';

// Override global ThemeContext mock with full colors structure
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    isDark: false,
    theme: 'light',
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

// Helper to create mock BottomTabBarProps
function createMockTabBarProps(overrides: { activeIndex?: number } = {}) {
  const { activeIndex = 0 } = overrides;

  const routes = [
    { key: 'index-key', name: 'index', params: undefined },
    { key: 'add-key', name: 'add', params: undefined },
    { key: 'cookbook-key', name: 'cookbook', params: undefined },
    { key: 'meal-plan-key', name: 'meal-plan', params: undefined },
    { key: 'shopping-list-key', name: 'shopping-list', params: undefined },
    { key: 'profile-key', name: 'profile', params: undefined },
  ];

  const descriptors: any = {};
  routes.forEach(route => {
    descriptors[route.key] = {
      options: {
        title: route.name === 'index' ? 'Home'
          : route.name === 'cookbook' ? 'Cookbook'
          : route.name === 'meal-plan' ? 'Meal Plan'
          : route.name === 'shopping-list' ? 'Shopping'
          : route.name === 'profile' ? 'Profile'
          : route.name,
        // Hide the 'add' tab
        ...(route.name === 'add' ? { href: null } : {}),
      },
      render: () => null,
    };
  });

  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  };

  return {
    state: {
      index: activeIndex,
      routes,
      key: 'tabs-key',
      routeNames: routes.map(r => r.name),
      type: 'tab' as const,
      stale: false as const,
      history: [],
    },
    descriptors,
    navigation,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as any;
}

describe('AnimatedTabBar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all 5 visible tab labels (hides add tab)', () => {
    const props = createMockTabBarProps();
    const { getByText, queryByText } = render(<AnimatedTabBar {...props} />);
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Cookbook')).toBeTruthy();
    expect(getByText('Meal Plan')).toBeTruthy();
    expect(getByText('Shopping')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
    // 'add' tab should be hidden
    expect(queryByText('add')).toBeNull();
  });

  it('renders icons for all 5 visible tabs', () => {
    const props = createMockTabBarProps();
    const { getByTestId } = render(<AnimatedTabBar {...props} />);
    expect(getByTestId('icon-home-outline')).toBeTruthy();
    expect(getByTestId('icon-book-outline')).toBeTruthy();
    expect(getByTestId('icon-calendar-outline')).toBeTruthy();
    expect(getByTestId('icon-cart-outline')).toBeTruthy();
    expect(getByTestId('icon-person-outline')).toBeTruthy();
  });

  it('calls navigation.navigate when a non-active tab is pressed', () => {
    const props = createMockTabBarProps({ activeIndex: 0 });
    const { getByText } = render(<AnimatedTabBar {...props} />);
    fireEvent.press(getByText('Cookbook'));
    expect(props.navigation.navigate).toHaveBeenCalledWith('cookbook', undefined);
  });

  it('emits tabPress event when tab is pressed', () => {
    const props = createMockTabBarProps({ activeIndex: 0 });
    const { getByText } = render(<AnimatedTabBar {...props} />);
    fireEvent.press(getByText('Profile'));
    expect(props.navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'profile-key' })
    );
  });

  it('does not navigate when pressing the already active tab', () => {
    const props = createMockTabBarProps({ activeIndex: 0 });
    const { getByText } = render(<AnimatedTabBar {...props} />);
    fireEvent.press(getByText('Home'));
    // Should emit but not navigate since it's already focused
    expect(props.navigation.emit).toHaveBeenCalled();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('renders with different active index', () => {
    // activeIndex 4 = meal-plan (index 3 in routes, but index 0 is index, 1 is add (hidden))
    const props = createMockTabBarProps({ activeIndex: 3 });
    const { getByText } = render(<AnimatedTabBar {...props} />);
    expect(getByText('Meal Plan')).toBeTruthy();
  });
});
