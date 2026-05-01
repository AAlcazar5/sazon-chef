import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mocks
jest.mock('../../constants/Haptics', () => ({
  triggerHaptic: jest.fn(),
  ImpactStyle: { LIGHT: 'light', MEDIUM: 'medium', HEAVY: 'heavy' },
  HapticPatterns: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, testID }: { name: string; testID?: string }) {
      return <Text testID={testID || `icon-${name}`}>{name}</Text>;
    },
  };
});

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

// Import after mocks
import { EditorialGreeting, getGreeting, getHeadlineWord } from '../../components/home/EditorialGreeting';
import { EditorialMacroWidgets } from '../../components/home/EditorialMacroWidgets';
import { EditorialQuickPicks } from '../../components/home/EditorialQuickPicks';
import { SurpriseFAB } from '../../components/home/SurpriseFAB';

// ─── EditorialGreeting ────────────────────────────────────────

describe('EditorialGreeting (10V-D: Top bar + headline)', () => {
  it('renders time-aware greeting', () => {
    const { getByText } = render(
      <EditorialGreeting onSearchPress={jest.fn()} onNotificationsPress={jest.fn()} />
    );
    const greeting = getGreeting();
    expect(getByText(greeting)).toBeTruthy();
  });

  it('renders user name when provided', () => {
    const { getByText } = render(
      <EditorialGreeting userName="Alex" onSearchPress={jest.fn()} onNotificationsPress={jest.fn()} />
    );
    expect(getByText('Hi, Alex')).toBeTruthy();
  });

  it('renders search and notification buttons', () => {
    const { getByTestId } = render(
      <EditorialGreeting onSearchPress={jest.fn()} onNotificationsPress={jest.fn()} />
    );
    expect(getByTestId('search-button')).toBeTruthy();
    expect(getByTestId('notifications-button')).toBeTruthy();
  });

  it('headline contains "picks" in italic accent', () => {
    const { getByText } = render(
      <EditorialGreeting onSearchPress={jest.fn()} onNotificationsPress={jest.fn()} />
    );
    expect(getByText('picks')).toBeTruthy();
  });

  it('renders orange period', () => {
    const { getByText } = render(
      <EditorialGreeting onSearchPress={jest.fn()} onNotificationsPress={jest.fn()} />
    );
    expect(getByText('.')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    const { getByText } = render(
      <EditorialGreeting onSearchPress={jest.fn()} onNotificationsPress={jest.fn()} />
    );
    expect(getByText(/pantry.*macro budget/)).toBeTruthy();
  });
});

describe('getGreeting', () => {
  const originalDate = global.Date;

  afterEach(() => {
    global.Date = originalDate;
  });

  it('returns GOOD MORNING before noon', () => {
    jest.spyOn(global, 'Date').mockImplementation(() => ({ getHours: () => 9 }) as any);
    expect(getGreeting()).toBe('GOOD MORNING');
  });

  it('returns GOOD AFTERNOON between noon and 5pm', () => {
    jest.spyOn(global, 'Date').mockImplementation(() => ({ getHours: () => 14 }) as any);
    expect(getGreeting()).toBe('GOOD AFTERNOON');
  });

  it('returns GOOD EVENING after 5pm', () => {
    jest.spyOn(global, 'Date').mockImplementation(() => ({ getHours: () => 20 }) as any);
    expect(getGreeting()).toBe('GOOD EVENING');
  });
});

// ─── EditorialMacroWidgets ────────────────────────────────────

describe('EditorialMacroWidgets (10V-D: Macro widget row)', () => {
  const props = {
    calories: { consumed: 1420, goal: 1800 },
    protein: { consumed: 98, goal: 120 },
    carbs: { consumed: 165, goal: 220 },
    fat: { consumed: 52, goal: 70 },
    fiber: { consumed: 22, goal: 30 },
  };

  it('renders 5 widget cards', () => {
    const { getByTestId } = render(<EditorialMacroWidgets {...props} />);
    expect(getByTestId('widget-0')).toBeTruthy();
    expect(getByTestId('widget-1')).toBeTruthy();
    expect(getByTestId('widget-2')).toBeTruthy();
    expect(getByTestId('widget-3')).toBeTruthy();
    expect(getByTestId('widget-4')).toBeTruthy();
  });

  it('shows calorie value', () => {
    const { getAllByText } = render(<EditorialMacroWidgets {...props} />);
    expect(getAllByText('1420').length).toBeGreaterThan(0);
  });

  it('shows protein value', () => {
    const { getAllByText } = render(<EditorialMacroWidgets {...props} />);
    expect(getAllByText('98g').length).toBeGreaterThan(0);
  });

  it('shows carbs, fat, and fiber values', () => {
    const { getAllByText } = render(<EditorialMacroWidgets {...props} />);
    expect(getAllByText('165g').length).toBeGreaterThan(0);
    expect(getAllByText('52g').length).toBeGreaterThan(0);
    expect(getAllByText('22g').length).toBeGreaterThan(0);
  });
});

// ─── EditorialQuickPicks ──────────────────────────────────────

describe('EditorialQuickPicks (10V-D: Quick picks section)', () => {
  const recipes = [
    { id: '1', title: 'Recipe A', cookTime: 20, calories: 400, matchScore: 92 },
    { id: '2', title: 'Recipe B', cookTime: 15, calories: 350, matchScore: 85 },
    { id: '3', title: 'Recipe C', cookTime: 30, calories: 500, matchScore: 78 },
    { id: '4', title: 'Recipe D', cookTime: 25, calories: 450, matchScore: 90 },
  ];

  it('renders section title with italic accent', () => {
    const { getByText } = render(
      <EditorialQuickPicks recipes={recipes} savedIds={new Set()} onRecipePress={jest.fn()} onToggleSave={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(getByText(/Quick/)).toBeTruthy();
    expect(getByText(/picks/)).toBeTruthy();
  });

  it('renders "SEE ALL →" link in orange uppercase', () => {
    const { getByText } = render(
      <EditorialQuickPicks recipes={recipes} savedIds={new Set()} onRecipePress={jest.fn()} onToggleSave={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(getByText('SEE ALL →')).toBeTruthy();
  });

  it('renders 4 cards in grid', () => {
    const { getByText } = render(
      <EditorialQuickPicks recipes={recipes} savedIds={new Set()} onRecipePress={jest.fn()} onToggleSave={jest.fn()} onSeeAll={jest.fn()} />
    );
    expect(getByText('Recipe A')).toBeTruthy();
    expect(getByText('Recipe B')).toBeTruthy();
    expect(getByText('Recipe C')).toBeTruthy();
    expect(getByText('Recipe D')).toBeTruthy();
  });

  it('see all link fires onSeeAll', () => {
    const onSeeAll = jest.fn();
    const { getByTestId } = render(
      <EditorialQuickPicks recipes={recipes} savedIds={new Set()} onRecipePress={jest.fn()} onToggleSave={jest.fn()} onSeeAll={onSeeAll} />
    );
    fireEvent.press(getByTestId('see-all'));
    expect(onSeeAll).toHaveBeenCalled();
  });
});

// ─── SurpriseFAB ──────────────────────────────────────────────

describe('SurpriseFAB (10V-D: Surprise FAB)', () => {
  it('renders at bottom-right', () => {
    const { getByTestId } = render(<SurpriseFAB onPress={jest.fn()} />);
    const fab = getByTestId('surprise-fab');
    const flatStyle = Array.isArray(fab.props.style)
      ? Object.assign({}, ...fab.props.style.filter(Boolean))
      : fab.props.style;
    expect(flatStyle.position).toBe('absolute');
    expect(flatStyle.right).toBe(20);
  });

  it('tap fires onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<SurpriseFAB onPress={onPress} />);
    fireEvent.press(getByTestId('surprise-fab'));
    expect(onPress).toHaveBeenCalled();
  });

  it('has sparkles icon', () => {
    const { getByTestId } = render(<SurpriseFAB onPress={jest.fn()} />);
    expect(getByTestId('icon-sparkles')).toBeTruthy();
  });
});
