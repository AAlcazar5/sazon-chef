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
import { EditorialCookbookHeader } from '../../components/cookbook/EditorialCookbookHeader';
import { CollectionChips } from '../../components/cookbook/CollectionChips';
import { MostCookedHero } from '../../components/cookbook/MostCookedHero';
import { RecentlySavedSection } from '../../components/cookbook/RecentlySavedSection';

// ─── EditorialCookbookHeader ─────────────────────────────────

describe('EditorialCookbookHeader (10V-G: Cookbook header)', () => {
  it('renders YOUR eyebrow uppercase', () => {
    const { getByText } = render(<EditorialCookbookHeader recipeCount={24} collectionCount={5} />);
    expect(getByText('YOUR')).toBeTruthy();
  });

  it('renders title with orange period', () => {
    const { getByText } = render(<EditorialCookbookHeader recipeCount={24} collectionCount={5} />);
    expect(getByText(/Cookbook/)).toBeTruthy();
    expect(getByText('.')).toBeTruthy();
  });

  it('renders subtitle with counts', () => {
    const { getByText } = render(<EditorialCookbookHeader recipeCount={24} collectionCount={5} />);
    expect(getByText(/24 recipes saved across 5 collections/)).toBeTruthy();
  });
});

// ─── CollectionChips ─────────────────────────────────────────

describe('CollectionChips (10V-G: Collection chips)', () => {
  const collections = [
    { id: 'all', label: 'All', count: 24 },
    { id: 'weeknight', label: 'Weeknight', count: 4 },
    { id: 'mealprep', label: 'Meal prep', count: 6 },
  ];

  it('renders chips with counts and labels', () => {
    const { getByText } = render(
      <CollectionChips collections={collections} activeId="all" onSelect={jest.fn()} />
    );
    expect(getByText('24 All')).toBeTruthy();
    expect(getByText('4 Weeknight')).toBeTruthy();
    expect(getByText('6 Meal prep')).toBeTruthy();
  });

  it('active chip has black bg', () => {
    const { getByTestId } = render(
      <CollectionChips collections={collections} activeId="all" onSelect={jest.fn()} />
    );
    const activeChip = getByTestId('chip-all');
    const flatStyle = Array.isArray(activeChip.props.style)
      ? Object.assign({}, ...activeChip.props.style.filter(Boolean))
      : activeChip.props.style;
    expect(flatStyle.backgroundColor).toBe('#111827');
  });

  it('inactive chip has white bg', () => {
    const { getByTestId } = render(
      <CollectionChips collections={collections} activeId="all" onSelect={jest.fn()} />
    );
    const inactiveChip = getByTestId('chip-weeknight');
    const flatStyle = Array.isArray(inactiveChip.props.style)
      ? Object.assign({}, ...inactiveChip.props.style.filter(Boolean))
      : inactiveChip.props.style;
    expect(flatStyle.backgroundColor).toBe('#FFFFFF');
  });

  it('tap fires onSelect', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <CollectionChips collections={collections} activeId="all" onSelect={onSelect} />
    );
    fireEvent.press(getByTestId('chip-weeknight'));
    expect(onSelect).toHaveBeenCalledWith('weeknight');
  });
});

// ─── MostCookedHero ──────────────────────────────────────────

describe('MostCookedHero (10V-G: Most cooked section)', () => {
  it('renders MOST COOKED eyebrow', () => {
    const { getByText } = render(
      <MostCookedHero title="Honey-garlic shrimp with jasmine rice" accentWord="with jasmine rice" cookCount={12} />
    );
    expect(getByText('MOST COOKED')).toBeTruthy();
  });

  it('renders MADE N TIMES badge', () => {
    const { getByText } = render(
      <MostCookedHero title="Honey-garlic shrimp with jasmine rice" accentWord="with jasmine rice" cookCount={12} />
    );
    expect(getByText('MADE 12 TIMES')).toBeTruthy();
  });

  it('renders title with italic accent', () => {
    const { getByText } = render(
      <MostCookedHero title="Honey-garlic shrimp with jasmine rice" accentWord="with jasmine rice" cookCount={12} />
    );
    expect(getByText(/Honey-garlic shrimp/)).toBeTruthy();
    expect(getByText('with jasmine rice')).toBeTruthy();
  });

  it('card has pastel pink bg', () => {
    const { getByTestId } = render(
      <MostCookedHero title="Shrimp bowl" accentWord="bowl" cookCount={5} />
    );
    const hero = getByTestId('most-cooked-hero');
    // Find the card child (second View child)
    const card = hero.children[1] as any;
    const flatStyle = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style.filter(Boolean))
      : card.props.style;
    expect(flatStyle.backgroundColor).toBe('#FCE4EC');
  });
});

// ─── RecentlySavedSection ────────────────────────────────────

describe('RecentlySavedSection (10V-G: Recently saved)', () => {
  const recipes = [
    { id: '1', title: 'Salmon Bowl' },
    { id: '2', title: 'Chicken Wrap' },
    { id: '3', title: 'Veggie Stir Fry' },
  ];

  it('renders section title with italic accent', () => {
    const { getByText } = render(
      <RecentlySavedSection recipes={recipes} onSort={jest.fn()} onRecipePress={jest.fn()} />
    );
    expect(getByText(/Recently/)).toBeTruthy();
    expect(getByText(/saved/)).toBeTruthy();
  });

  it('renders SORT link in orange', () => {
    const { getByText } = render(
      <RecentlySavedSection recipes={recipes} onSort={jest.fn()} onRecipePress={jest.fn()} />
    );
    expect(getByText('SORT')).toBeTruthy();
  });

  it('tap SORT fires onSort', () => {
    const onSort = jest.fn();
    const { getByTestId } = render(
      <RecentlySavedSection recipes={recipes} onSort={onSort} onRecipePress={jest.fn()} />
    );
    fireEvent.press(getByTestId('sort-button'));
    expect(onSort).toHaveBeenCalled();
  });

  it('renders recipe cards', () => {
    const { getByText } = render(
      <RecentlySavedSection recipes={recipes} onSort={jest.fn()} onRecipePress={jest.fn()} />
    );
    expect(getByText('Salmon Bowl')).toBeTruthy();
    expect(getByText('Chicken Wrap')).toBeTruthy();
    expect(getByText('Veggie Stir Fry')).toBeTruthy();
  });

  it('tap recipe fires onRecipePress', () => {
    const onRecipePress = jest.fn();
    const { getByTestId } = render(
      <RecentlySavedSection recipes={recipes} onSort={jest.fn()} onRecipePress={onRecipePress} />
    );
    fireEvent.press(getByTestId('saved-recipe-2'));
    expect(onRecipePress).toHaveBeenCalledWith('2');
  });
});
