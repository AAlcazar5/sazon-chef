// frontend/__tests__/components/kitchen/KitchenDiscoverView.test.tsx
// ROADMAP 4.0 Tier A3-b — Kitchen Discover view (TDD).

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../../components/home/NewToYouSection', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    NewToYouSection: function MockNewToYouSection() {
      return ReactLib.createElement(View, { testID: 'new-to-you-section' });
    },
  };
});

jest.mock('../../../components/home/BrowseByFamilySection', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    BrowseByFamilySection: function MockBrowseByFamilySection() {
      return ReactLib.createElement(View, { testID: 'browse-by-family-section' });
    },
  };
});

jest.mock('../../../hooks/useSurfaceTracking', () => ({
  useSurfaceTracking: () => ({ track: jest.fn() }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import KitchenDiscoverView from '../../../components/kitchen/KitchenDiscoverView';

beforeEach(() => {
  mockPush.mockClear();
});

describe('KitchenDiscoverView', () => {
  it('renders NewToYou + BrowseByFamily sections', () => {
    const { getByTestId } = render(<KitchenDiscoverView isDark={false} />);
    expect(getByTestId('new-to-you-section')).toBeTruthy();
    expect(getByTestId('browse-by-family-section')).toBeTruthy();
  });

  it('renders the Cravings-Made-Real tile', () => {
    const { getByLabelText } = render(<KitchenDiscoverView isDark={false} />);
    expect(getByLabelText(/Cravings, Made Real/i)).toBeTruthy();
  });

  it('routes to filtered Cravings-Made-Real list when tile is tapped', () => {
    const { getByLabelText } = render(<KitchenDiscoverView isDark={false} />);
    fireEvent.press(getByLabelText(/Cravings, Made Real/i));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('cravings_made_real'),
    );
  });

  it('renders the craving section header', () => {
    const { getByText } = render(<KitchenDiscoverView isDark={false} />);
    expect(getByText("I'M CRAVING")).toBeTruthy();
  });

  it('renders craving chips', () => {
    const { getByLabelText } = render(<KitchenDiscoverView isDark={false} />);
    expect(getByLabelText(/Comfort Food/i)).toBeTruthy();
    expect(getByLabelText(/Spicy/i)).toBeTruthy();
    expect(getByLabelText(/Sweet Tooth/i)).toBeTruthy();
    expect(getByLabelText(/Cheesy/i)).toBeTruthy();
  });

  it('routes to Today with the craving query when a chip is tapped', () => {
    const { getByLabelText } = render(<KitchenDiscoverView isDark={false} />);
    fireEvent.press(getByLabelText(/Spicy/i));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('craving=Spicy'),
    );
  });
});
