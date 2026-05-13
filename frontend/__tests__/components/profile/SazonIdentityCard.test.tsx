// P1 retention — identity card smoke + auto-hide.

const mockJourney = jest.fn();
jest.mock('../../../hooks/useCookingJourney', () => ({
  useCookingJourney: () => mockJourney(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import SazonIdentityCard from '../../../components/profile/SazonIdentityCard';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<SazonIdentityCard />', () => {
  it('returns null while the journey is loading', () => {
    mockJourney.mockReturnValue({ stats: null, progress: null, loading: true });
    const { queryByTestId } = render(<SazonIdentityCard />);
    expect(queryByTestId('sazon-identity-card')).toBeNull();
  });

  it('returns null when derived tags are empty (no signal yet)', () => {
    mockJourney.mockReturnValue({
      stats: {
        recipesCookedThisMonth: 0,
        recipesCookedAllTime: 0,
        cuisinesExplored: [],
        cuisinesExploredThisMonth: [],
        averageDifficulty: 1,
        averageDifficultyLabel: null,
        difficultyTrend: 'insufficient_data',
        longestStreakDays: 0,
        currentStreakDays: 0,
        firstCookedCuisines: [],
        seededCuisines: [],
      },
      progress: null,
      loading: false,
    });
    const { queryByTestId } = render(<SazonIdentityCard />);
    expect(queryByTestId('sazon-identity-card')).toBeNull();
  });

  it('renders the headline + tags when journey signals exist', () => {
    mockJourney.mockReturnValue({
      stats: {
        recipesCookedThisMonth: 5,
        recipesCookedAllTime: 12,
        cuisinesExplored: ['italian', 'thai', 'mexican', 'persian'],
        cuisinesExploredThisMonth: ['persian'],
        averageDifficulty: 2,
        averageDifficultyLabel: 'medium',
        difficultyTrend: 'steady',
        longestStreakDays: 4,
        currentStreakDays: 2,
        firstCookedCuisines: [],
        seededCuisines: [],
      },
      progress: {
        currentLevel: 'home_cook',
        effectiveLevel: 'home_cook',
        readyToLevelUp: false,
        nextLevel: 'confident',
        reason: '',
        easyRecipesCookedWithGoodRating: 0,
        mediumRecipesCooked: 0,
      },
      loading: false,
    });
    const { getByTestId, getByText } = render(<SazonIdentityCard />);
    expect(getByTestId('sazon-identity-card')).toBeTruthy();
    expect(getByText(/Sazon knows you as/i)).toBeTruthy();
    expect(getByText('Persian-curious')).toBeTruthy();
  });
});
