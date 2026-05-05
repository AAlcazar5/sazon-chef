// frontend/__tests__/components/ui/FilterRow.test.tsx
// ROADMAP 4.0 — FilterRow (Today + Kitchen) TDD.

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

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FilterRow, { type FilterChipDef } from '../../../components/ui/FilterRow';

const sampleChips: FilterChipDef[] = [
  { id: 'quick', label: 'Quick', emoji: '⚡' },
  { id: 'high_protein', label: 'High Protein', emoji: '💪' },
  { id: 'low_cal', label: 'Low Cal', emoji: '🥗' },
  { id: 'meal_prep', label: 'Meal Prep', emoji: '🍱' },
];

describe('FilterRow', () => {
  it('renders the Filters button on the left', () => {
    const { getByLabelText } = render(
      <FilterRow
        chips={sampleChips}
        activeChipIds={[]}
        onChipToggle={() => {}}
        onAdvancedFilterPress={() => {}}
      />,
    );
    expect(getByLabelText(/Open advanced filters/i)).toBeTruthy();
  });

  it('renders each chip on the right', () => {
    const { getByLabelText } = render(
      <FilterRow
        chips={sampleChips}
        activeChipIds={[]}
        onChipToggle={() => {}}
        onAdvancedFilterPress={() => {}}
      />,
    );
    expect(getByLabelText(/Quick filter/i)).toBeTruthy();
    expect(getByLabelText(/High Protein filter/i)).toBeTruthy();
    expect(getByLabelText(/Low Cal filter/i)).toBeTruthy();
    expect(getByLabelText(/Meal Prep filter/i)).toBeTruthy();
  });

  it('fires onAdvancedFilterPress when the left button is tapped', () => {
    const onAdvanced = jest.fn();
    const { getByLabelText } = render(
      <FilterRow
        chips={sampleChips}
        activeChipIds={[]}
        onChipToggle={() => {}}
        onAdvancedFilterPress={onAdvanced}
      />,
    );
    fireEvent.press(getByLabelText(/Open advanced filters/i));
    expect(onAdvanced).toHaveBeenCalledTimes(1);
  });

  it('fires onChipToggle with the chip id when a chip is pressed', () => {
    const onToggle = jest.fn();
    const { getByLabelText } = render(
      <FilterRow
        chips={sampleChips}
        activeChipIds={[]}
        onChipToggle={onToggle}
        onAdvancedFilterPress={() => {}}
      />,
    );
    fireEvent.press(getByLabelText(/High Protein filter/i));
    expect(onToggle).toHaveBeenCalledWith('high_protein');
  });

  it('shows active count badge when filters are active', () => {
    const { getByText } = render(
      <FilterRow
        chips={sampleChips}
        activeChipIds={['quick', 'high_protein']}
        onChipToggle={() => {}}
        onAdvancedFilterPress={() => {}}
        activeAdvancedCount={3}
      />,
    );
    expect(getByText('3')).toBeTruthy();
  });

  it('hides the active count badge when no advanced filters are active', () => {
    const { queryByText } = render(
      <FilterRow
        chips={sampleChips}
        activeChipIds={['quick']}
        onChipToggle={() => {}}
        onAdvancedFilterPress={() => {}}
        activeAdvancedCount={0}
      />,
    );
    expect(queryByText('0')).toBeNull();
  });

  it('marks active chips via testID suffix', () => {
    const { getByTestId } = render(
      <FilterRow
        chips={sampleChips}
        activeChipIds={['quick']}
        onChipToggle={() => {}}
        onAdvancedFilterPress={() => {}}
      />,
    );
    expect(getByTestId('filter-row-chip-quick-active')).toBeTruthy();
    expect(getByTestId('filter-row-chip-high_protein')).toBeTruthy();
  });
});
