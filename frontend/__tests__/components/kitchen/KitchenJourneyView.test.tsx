// frontend/__tests__/components/kitchen/KitchenJourneyView.test.tsx
// ROADMAP 4.0 Tier A3-c — Kitchen Journey view (TDD).

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

const mockUseCookingJourney = jest.fn();
jest.mock('../../../hooks/useCookingJourney', () => ({
  useCookingJourney: () => mockUseCookingJourney(),
  SkillLevel: {},
}));

jest.mock('../../../components/profile/CookingJourneyCard', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: function MockCookingJourneyCard() {
      return ReactLib.createElement(View, { testID: 'cooking-journey-card' });
    },
  };
});

jest.mock('../../../components/profile/KitchenIQSection', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: function MockKitchenIQSection() {
      return ReactLib.createElement(View, { testID: 'kitchen-iq-section' });
    },
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import KitchenJourneyView from '../../../components/kitchen/KitchenJourneyView';

const baseStats = {
  recipesCookedThisMonth: 5,
  recipesCookedAllTime: 42,
  cuisinesExplored: ['Persian', 'Salvadorean', 'Burmese'],
  cuisinesExploredThisMonth: ['Persian'],
  averageDifficulty: 2,
  averageDifficultyLabel: 'medium' as const,
  difficultyTrend: 'leveling_up' as const,
  longestStreakDays: 14,
  currentStreakDays: 3,
  firstCookedCuisines: [
    { cuisine: 'Persian', firstCookedAt: '2026-01-01' },
    { cuisine: 'Salvadorean', firstCookedAt: '2026-02-01' },
  ],
  seededCuisines: [],
};

beforeEach(() => {
  mockUseCookingJourney.mockReturnValue({
    stats: baseStats,
    progress: null,
    loading: false,
    error: null,
    refresh: jest.fn(),
    acceptLevelUp: jest.fn(),
    seedJourney: jest.fn(),
  });
});

describe('KitchenJourneyView', () => {
  it('renders the embedded CookingJourneyCard', () => {
    const { getByTestId } = render(<KitchenJourneyView isDark={false} />);
    expect(getByTestId('cooking-journey-card')).toBeTruthy();
  });

  it('renders the KitchenIQSection wall', () => {
    const { getByTestId } = render(<KitchenJourneyView isDark={false} />);
    expect(getByTestId('kitchen-iq-section')).toBeTruthy();
  });

  it('renders the cuisine map section header', () => {
    const { getByText } = render(<KitchenJourneyView isDark={false} />);
    expect(getByText(/CUISINE MAP/i)).toBeTruthy();
  });

  it('renders each cuisine the user has explored', () => {
    const { getAllByText, getByText } = render(<KitchenJourneyView isDark={false} />);
    expect(getAllByText('Persian').length).toBeGreaterThan(0);
    expect(getAllByText('Salvadorean').length).toBeGreaterThan(0);
    expect(getByText('Burmese')).toBeTruthy();
  });

  it('renders the cuisine count in the map header', () => {
    const { getByText } = render(<KitchenJourneyView isDark={false} />);
    expect(getByText(/3 CUISINES/i)).toBeTruthy();
  });

  it('renders the arc section header', () => {
    const { getByText } = render(<KitchenJourneyView isDark={false} />);
    expect(getByText(/YOUR ARC/i)).toBeTruthy();
  });

  it('renders first and latest cuisine in arc', () => {
    const { getAllByText } = render(<KitchenJourneyView isDark={false} />);
    expect(getAllByText('Persian').length).toBeGreaterThan(0);
  });

  it('hides the arc when fewer than 2 cuisines have been cooked', () => {
    mockUseCookingJourney.mockReturnValue({
      stats: { ...baseStats, cuisinesExplored: ['Persian'], firstCookedCuisines: [{ cuisine: 'Persian', firstCookedAt: '2026-01-01' }] },
      progress: null,
      loading: false,
      error: null,
      refresh: jest.fn(),
      acceptLevelUp: jest.fn(),
      seedJourney: jest.fn(),
    });
    const { queryByText } = render(<KitchenJourneyView isDark={false} />);
    expect(queryByText(/YOUR ARC/i)).toBeNull();
  });

  it('renders a quiet state when stats are unavailable', () => {
    mockUseCookingJourney.mockReturnValue({
      stats: null,
      progress: null,
      loading: false,
      error: null,
      refresh: jest.fn(),
      acceptLevelUp: jest.fn(),
      seedJourney: jest.fn(),
    });
    const { getByText } = render(<KitchenJourneyView isDark={false} />);
    expect(getByText(/start cooking/i)).toBeTruthy();
  });
});
