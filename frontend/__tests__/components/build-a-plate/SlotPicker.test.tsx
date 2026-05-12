// frontend/__tests__/components/build-a-plate/SlotPicker.test.tsx
// Group 10X Phase 4 — SlotPicker favorite chip + affinity sort tests.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, colors: { background: '#FAF7F4' } }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    BottomSheetModal: React.forwardRef(({ children }: any, _ref: any) => (
      <View testID="bottom-sheet-modal">{children}</View>
    )),
    BottomSheetView: ({ children }: any) => <View>{children}</View>,
    BottomSheetScrollView: ({ children }: any) => <View>{children}</View>,
    BottomSheetBackdrop: () => null,
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SlotPicker from '../../../components/build-a-plate/SlotPicker';
import type { MealComponent } from '../../../lib/api';

const makeComponent = (overrides: Partial<MealComponent>): MealComponent => ({
  id: 'c1',
  slot: 'protein',
  name: 'Salmon',
  defaultPortionGrams: 150,
  caloriesPerPortion: 280,
  proteinG: 30,
  carbsG: 0,
  fatG: 18,
  fiberG: 0,
  cuisineTags: [],
  dietaryTags: [],
  cookMethodHint: 'pan_sear',
  pantryIngredientNames: ['salmon'],
  pantryCoveragePercent: 100,
  ...overrides,
});

const SALMON = makeComponent({ id: 'salmon', name: 'Salmon', pantryCoveragePercent: 100 });
const TOFU = makeComponent({ id: 'tofu', name: 'Tofu', pantryCoveragePercent: 100 });
const CHICKEN = makeComponent({ id: 'chicken', name: 'Chicken', pantryCoveragePercent: 100 });

const defaultProps = {
  visible: true,
  slot: 'protein' as const,
  components: [SALMON, TOFU, CHICKEN],
  loading: false,
  pantryOnly: false,
  onSelect: jest.fn(),
  onClose: jest.fn(),
  testID: 'slot-picker',
  favoriteIds: new Set<string>(),
  scoresById: new Map<string, number>(),
};

describe('SlotPicker — favorite chip', () => {
  it('renders favorite chip when component id is in favoriteIds', () => {
    const favoriteIds = new Set(['salmon']);
    const { getByTestId } = render(
      <SlotPicker {...defaultProps} favoriteIds={favoriteIds} />
    );
    expect(getByTestId('slot-picker-favorite-chip-salmon')).toBeTruthy();
  });

  it('does not render favorite chip when component id is not in favoriteIds', () => {
    const favoriteIds = new Set(['salmon']);
    const { queryByTestId } = render(
      <SlotPicker {...defaultProps} favoriteIds={favoriteIds} />
    );
    expect(queryByTestId('slot-picker-favorite-chip-tofu')).toBeNull();
    expect(queryByTestId('slot-picker-favorite-chip-chicken')).toBeNull();
  });

  it('does not render any favorite chip when favoriteIds is empty', () => {
    const { queryByTestId } = render(<SlotPicker {...defaultProps} />);
    expect(queryByTestId('slot-picker-favorite-chip-salmon')).toBeNull();
    expect(queryByTestId('slot-picker-favorite-chip-tofu')).toBeNull();
  });
});

describe('SlotPicker — affinity sort', () => {
  it('sorts favorites above non-favorites within equal pantry coverage', () => {
    const favoriteIds = new Set(['tofu']);
    const scoresById = new Map([['tofu', 1.2]]);
    const components = [SALMON, TOFU, CHICKEN];
    const { getAllByTestId } = render(
      <SlotPicker
        {...defaultProps}
        components={components}
        favoriteIds={favoriteIds}
        scoresById={scoresById}
      />
    );
    const options = getAllByTestId(/slot-picker-option-/);
    const ids = options.map((el) => el.props.testID.replace('slot-picker-option-', ''));
    const tofuIdx = ids.indexOf('tofu');
    const salmonIdx = ids.indexOf('salmon');
    const chickenIdx = ids.indexOf('chicken');
    expect(tofuIdx).toBeLessThan(salmonIdx);
    expect(tofuIdx).toBeLessThan(chickenIdx);
  });

  it('sorts by name asc when pantry coverage and affinity score are equal', () => {
    const components = [
      makeComponent({ id: 'z-item', name: 'Z Item', pantryCoveragePercent: 50 }),
      makeComponent({ id: 'a-item', name: 'A Item', pantryCoveragePercent: 50 }),
    ];
    const { getAllByTestId } = render(
      <SlotPicker {...defaultProps} components={components} />
    );
    const options = getAllByTestId(/slot-picker-option-/);
    const ids = options.map((el) => el.props.testID.replace('slot-picker-option-', ''));
    expect(ids.indexOf('a-item')).toBeLessThan(ids.indexOf('z-item'));
  });

  it('higher pantry coverage still wins over affinity score', () => {
    const highPantry = makeComponent({ id: 'high', name: 'High', pantryCoveragePercent: 100 });
    const lowPantryFavorite = makeComponent({ id: 'low-fav', name: 'LowFav', pantryCoveragePercent: 50 });
    const favoriteIds = new Set(['low-fav']);
    const scoresById = new Map([['low-fav', 2.0]]);
    const { getAllByTestId } = render(
      <SlotPicker
        {...defaultProps}
        components={[lowPantryFavorite, highPantry]}
        favoriteIds={favoriteIds}
        scoresById={scoresById}
      />
    );
    const options = getAllByTestId(/slot-picker-option-/);
    const ids = options.map((el) => el.props.testID.replace('slot-picker-option-', ''));
    expect(ids.indexOf('high')).toBeLessThan(ids.indexOf('low-fav'));
  });
});

describe('SlotPicker — search + custom add', () => {
  it('renders a search input', () => {
    const { getByTestId } = render(<SlotPicker {...defaultProps} />);
    expect(getByTestId('slot-picker-search-input')).toBeTruthy();
  });

  it('filters list by case-insensitive substring match on name', () => {
    const { getByTestId, queryByTestId, getAllByTestId } = render(
      <SlotPicker {...defaultProps} />
    );
    fireEvent.changeText(getByTestId('slot-picker-search-input'), 'sal');
    const options = getAllByTestId(/slot-picker-option-/);
    const ids = options.map((el) => el.props.testID.replace('slot-picker-option-', ''));
    expect(ids).toContain('salmon');
    expect(queryByTestId('slot-picker-option-tofu')).toBeNull();
    expect(queryByTestId('slot-picker-option-chicken')).toBeNull();
  });

  it('shows custom-add CTA when no results match the query', () => {
    const { getByTestId } = render(<SlotPicker {...defaultProps} />);
    fireEvent.changeText(getByTestId('slot-picker-search-input'), 'avocado');
    expect(getByTestId('slot-picker-custom-cta')).toBeTruthy();
  });

  it('does not show custom-add CTA when query is empty', () => {
    const { queryByTestId } = render(<SlotPicker {...defaultProps} />);
    expect(queryByTestId('slot-picker-custom-cta')).toBeNull();
  });

  // Build-a-Plate Phase 10 — the custom-add CTA now opens CustomItemSheet
  // instead of immediately adding a zero-macro component. The post-estimate
  // happy path is exercised in CustomItemSheet.test.tsx.
  it('does NOT immediately fire onSelect when custom CTA is pressed (opens sheet instead)', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <SlotPicker {...defaultProps} onSelect={onSelect} />
    );
    fireEvent.changeText(getByTestId('slot-picker-search-input'), 'Avocado');
    fireEvent.press(getByTestId('slot-picker-custom-cta'));
    // Zero-macros add path retired — the sheet must run an estimate first.
    expect(onSelect).not.toHaveBeenCalled();
  });
});
