// Group 10I: CookingJourneyCard tests — stats rendering + skill level-up nudge behavior.

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, accessibilityLabel, testID, style }: any) => (
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={style}
      >
        {children}
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../components/ui/BottomSheet', () => {
  return function MockBottomSheet({ visible, children, title }: any) {
    if (!visible) return null;
    const { View, Text } = require('react-native');
    return require('react').createElement(
      View,
      { testID: 'mock-bottom-sheet' },
      require('react').createElement(Text, null, title),
      children,
    );
  };
});

const mockGetCookingStats = jest.fn();
const mockGetSkillProgress = jest.fn();
const mockAcceptSkillLevelUp = jest.fn();
const mockSeedCookingJourney = jest.fn();

jest.mock('../../lib/api', () => ({
  userApi: {
    getCookingStats: (...args: any[]) => mockGetCookingStats(...args),
    getSkillProgress: (...args: any[]) => mockGetSkillProgress(...args),
    acceptSkillLevelUp: (...args: any[]) => mockAcceptSkillLevelUp(...args),
    seedCookingJourney: (...args: any[]) => mockSeedCookingJourney(...args),
  },
}));

import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import CookingJourneyCard from '../../components/profile/CookingJourneyCard';

const baseStats = {
  recipesCookedThisMonth: 5,
  recipesCookedAllTime: 23,
  cuisinesExplored: ['Italian', 'Mexican', 'Thai'],
  cuisinesExploredThisMonth: ['Italian'],
  averageDifficulty: 1.5,
  averageDifficultyLabel: 'easy',
  difficultyTrend: 'leveling_up',
  longestStreakDays: 6,
  currentStreakDays: 2,
  firstCookedCuisines: [],
  seededCuisines: [],
};

describe('CookingJourneyCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders stats after loading', async () => {
    mockGetCookingStats.mockResolvedValue({ data: baseStats });
    mockGetSkillProgress.mockResolvedValue({
      data: {
        currentLevel: 'beginner',
        effectiveLevel: 'beginner',
        readyToLevelUp: false,
        nextLevel: 'home_cook',
        reason: 'Keep cooking',
        easyRecipesCookedWithGoodRating: 3,
        mediumRecipesCooked: 0,
      },
    });

    const { findByTestId } = render(<CookingJourneyCard />);
    expect(await findByTestId('stat-cooked-month')).toBeTruthy();
    expect(await findByTestId('stat-cooked-total')).toBeTruthy();
    expect(await findByTestId('stat-cuisines')).toBeTruthy();
    expect(await findByTestId('cuisine-chip-Italian')).toBeTruthy();
  });

  test('shows level-up nudge when readyToLevelUp and accepts it', async () => {
    mockGetCookingStats.mockResolvedValue({ data: baseStats });
    mockGetSkillProgress.mockResolvedValue({
      data: {
        currentLevel: 'beginner',
        effectiveLevel: 'home_cook',
        readyToLevelUp: true,
        nextLevel: 'home_cook',
        reason: 'You crushed 10 easy recipes.',
        easyRecipesCookedWithGoodRating: 10,
        mediumRecipesCooked: 0,
      },
    });
    mockAcceptSkillLevelUp.mockResolvedValue({ data: { cookingSkillLevel: 'home_cook' } });

    const { findByTestId } = render(<CookingJourneyCard />);
    const banner = await findByTestId('skill-levelup-banner');
    await act(async () => {
      fireEvent.press(banner);
    });
    await waitFor(() => expect(mockAcceptSkillLevelUp).toHaveBeenCalledWith('home_cook'));
  });

  test('hides level-up nudge when not ready', async () => {
    mockGetCookingStats.mockResolvedValue({ data: baseStats });
    mockGetSkillProgress.mockResolvedValue({
      data: {
        currentLevel: 'beginner',
        effectiveLevel: 'beginner',
        readyToLevelUp: false,
        nextLevel: 'home_cook',
        reason: 'Keep cooking',
        easyRecipesCookedWithGoodRating: 3,
        mediumRecipesCooked: 0,
      },
    });

    const { queryByTestId, findByTestId } = render(<CookingJourneyCard />);
    await findByTestId('stat-cooked-month');
    expect(queryByTestId('skill-levelup-banner')).toBeNull();
  });

  test('tapping header opens edit sheet', async () => {
    mockGetCookingStats.mockResolvedValue({ data: baseStats });
    mockGetSkillProgress.mockResolvedValue({
      data: {
        currentLevel: 'beginner',
        effectiveLevel: 'beginner',
        readyToLevelUp: false,
        nextLevel: 'home_cook',
        reason: 'Keep cooking',
        easyRecipesCookedWithGoodRating: 3,
        mediumRecipesCooked: 0,
      },
    });

    const { findByTestId, queryByTestId } = render(<CookingJourneyCard />);
    expect(queryByTestId('mock-bottom-sheet')).toBeNull();
    const trigger = await findByTestId('cooking-journey-edit-trigger');
    await act(async () => {
      fireEvent.press(trigger);
    });
    await findByTestId('mock-bottom-sheet');
  });
});
