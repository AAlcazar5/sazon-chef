// Group 10S Surface 2 — Kitchen IQ browse screen tests.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';


jest.mock('../../components/ui/ScreenGradient', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, testID, style }: any) => (
      <View testID={testID} style={style}>{children}</View>
    ),
  };
});

const mockOpenSheet = jest.fn();
jest.mock('../../components/kitchen-iq/KitchenIQDetailSheet', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  function MockSheet({ card }: any) {
    React.useEffect(() => {
      if (card?.id) mockOpenSheet(card.id);
    }, [card?.id]);
    return (
      <View testID="kitchen-iq-detail-sheet">
        <Text>{card?.id || 'closed'}</Text>
      </View>
    );
  }
  return { __esModule: true, default: MockSheet };
});

const mockProgress = {
  totalCards: 32,
  unlockedCount: 0,
  unlockedIds: [] as string[],
  newUnlocks: [] as string[],
  loading: false,
  error: null as string | null,
  isUnlocked: jest.fn((_id: string) => false),
  refresh: jest.fn(),
  acknowledgeNewUnlock: jest.fn(),
};

jest.mock('../../hooks/useKitchenIQProgress', () => ({
  __esModule: true,
  useKitchenIQProgress: () => mockProgress,
  default: () => mockProgress,
}));

const mockUserState = {
  userId: 'u1',
  cookHistory: { cuisines: [] as string[] },
  topAffinityIngredients: [] as string[],
  rolling7dNutrientGaps: [] as string[],
  skillTier: 'cook' as const,
  goalPhase: 'maintain' as const,
};

jest.mock('../../hooks/useFoodIntelUserState', () => ({
  __esModule: true,
  useFoodIntelUserState: () => mockUserState,
  default: () => mockUserState,
}));

const mockJourneyStats = {
  recipesCookedAllTime: 3,
  cuisinesExplored: ['italian'] as string[],
};

jest.mock('../../hooks/useCookingJourney', () => ({
  __esModule: true,
  useCookingJourney: () => ({ stats: mockJourneyStats }),
}));

import KitchenIQScreen from '../../app/kitchen-iq';

function resetState() {
  mockProgress.totalCards = 32;
  mockProgress.unlockedCount = 0;
  mockProgress.unlockedIds = [];
  mockProgress.loading = false;
  mockProgress.error = null;
  mockProgress.isUnlocked = jest.fn((_id: string) => false);
  mockUserState.cookHistory = { cuisines: [] };
  mockUserState.topAffinityIngredients = [];
  mockUserState.rolling7dNutrientGaps = [];
  mockUserState.skillTier = 'cook';
  mockJourneyStats.recipesCookedAllTime = 3;
  mockJourneyStats.cuisinesExplored = ['italian'];
  mockOpenSheet.mockReset();
}

describe('KitchenIQScreen', () => {
  beforeEach(() => {
    resetState();
  });

  it('renders 4 section headers with correct titles', () => {
    const { getByText } = render(React.createElement(KitchenIQScreen));
    expect(getByText(/Nutrients/)).toBeTruthy();
    expect(getByText(/Ingredients/)).toBeTruthy();
    expect(getByText(/Concepts/)).toBeTruthy();
    expect(getByText(/Cuisine Stories/)).toBeTruthy();
  });

  it('progress bar reflects unlockedCount / totalCards ratio', () => {
    mockProgress.unlockedCount = 8;
    mockProgress.totalCards = 32;
    const { getByTestId } = render(React.createElement(KitchenIQScreen));
    const bar = getByTestId('kitchen-iq-progress-bar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 32, now: 8 });
  });

  it('unlocked cards open the detail sheet on tap', () => {
    mockProgress.unlockedIds = ['nut-protein'];
    mockProgress.unlockedCount = 1;
    mockProgress.isUnlocked = jest.fn((id: string) => id === 'nut-protein');
    const { getByTestId } = render(React.createElement(KitchenIQScreen));
    const tile = getByTestId('kitchen-iq-tile-nut-protein');
    fireEvent.press(tile);
    expect(mockOpenSheet).toHaveBeenCalledWith('nut-protein');
  });

  it('locked cards show hint text that includes the user\'s actual cook count', () => {
    mockProgress.isUnlocked = jest.fn((_id: string) => false);
    mockJourneyStats.recipesCookedAllTime = 3;
    const { getByTestId } = render(React.createElement(KitchenIQScreen));
    // nut-magnesium is locked, threshold = 5, user has cooked 3 → 2 more cooks · you've done 3
    const hint = getByTestId('kitchen-iq-tile-nut-magnesium-hint');
    expect(hint.props.children).toMatch(/2 more cooks/);
    expect(hint.props.children).toMatch(/you've done 3/);
  });

  it('tapping a locked card does not open detail sheet', () => {
    mockProgress.isUnlocked = jest.fn((_id: string) => false);
    const { getByTestId } = render(React.createElement(KitchenIQScreen));
    const tile = getByTestId('kitchen-iq-tile-nut-magnesium');
    fireEvent.press(tile);
    expect(mockOpenSheet).not.toHaveBeenCalled();
  });

  it('tapping a section header collapses and re-expands the section', () => {
    const { getByTestId, queryByTestId } = render(React.createElement(KitchenIQScreen));

    expect(queryByTestId('kitchen-iq-section-list-nutrient')).toBeTruthy();

    const header = getByTestId('kitchen-iq-section-header-nutrient');
    fireEvent.press(header);

    expect(queryByTestId('kitchen-iq-section-list-nutrient')).toBeNull();

    fireEvent.press(header);
    expect(queryByTestId('kitchen-iq-section-list-nutrient')).toBeTruthy();
  });

  it('N=1 ranking: a nutrient gap on iron pushes iron card above magnesium when both unlocked', () => {
    mockProgress.unlockedIds = ['nut-iron', 'nut-magnesium'];
    mockProgress.unlockedCount = 2;
    mockProgress.isUnlocked = jest.fn(
      (id: string) => id === 'nut-iron' || id === 'nut-magnesium',
    );
    mockUserState.rolling7dNutrientGaps = ['iron'];

    const { getByTestId } = render(React.createElement(KitchenIQScreen));
    const list = getByTestId('kitchen-iq-section-list-nutrient');
    // Walk children to find the order of the two nutrient tile testIDs
    const order: string[] = [];
    const collect = (node: any) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(collect);
        return;
      }
      const tid = node?.props?.testID as string | undefined;
      if (tid === 'kitchen-iq-tile-nut-iron' || tid === 'kitchen-iq-tile-nut-magnesium') {
        order.push(tid);
      }
      const children = node?.props?.children;
      if (children) collect(children);
    };
    collect(list);
    const ironIdx = order.indexOf('kitchen-iq-tile-nut-iron');
    const magIdx = order.indexOf('kitchen-iq-tile-nut-magnesium');
    expect(ironIdx).toBeGreaterThanOrEqual(0);
    expect(magIdx).toBeGreaterThanOrEqual(0);
    expect(ironIdx).toBeLessThan(magIdx);
  });
});
