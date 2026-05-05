// frontend/__tests__/components/kitchen/KitchenStoriesView.test.tsx
// ROADMAP 4.0 Tier A3-d — Kitchen Stories view (TDD).

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

jest.mock('../../../components/kitchen/WeeklyRecapCard', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: function MockWeeklyRecapCard() {
      return ReactLib.createElement(View, { testID: 'weekly-recap-card' });
    },
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import KitchenStoriesView from '../../../components/kitchen/KitchenStoriesView';

describe('KitchenStoriesView', () => {
  it('renders the WeeklyRecapCard at the top', () => {
    const { getByTestId } = render(<KitchenStoriesView isDark={false} />);
    expect(getByTestId('weekly-recap-card')).toBeTruthy();
  });

  it('renders the THIS WEEK eyebrow', () => {
    const { getByText } = render(<KitchenStoriesView isDark={false} />);
    expect(getByText(/THIS WEEK/i)).toBeTruthy();
  });

  it('renders the Past recaps section header', () => {
    const { getByText } = render(<KitchenStoriesView isDark={false} />);
    expect(getByText(/PAST RECAPS/i)).toBeTruthy();
  });

  it('renders an empty state for past recaps before any have been saved', () => {
    const { getByText } = render(<KitchenStoriesView isDark={false} />);
    expect(getByText(/Your weekly recaps will be saved here/i)).toBeTruthy();
  });

  it('renders the Monthly recap teaser section', () => {
    const { getByText } = render(<KitchenStoriesView isDark={false} />);
    expect(getByText(/THIS MONTH/i)).toBeTruthy();
  });
});
