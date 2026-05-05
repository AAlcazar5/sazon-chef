// frontend/__tests__/components/home/EditorialGreeting.firstOfDay.test.tsx
// ROADMAP 4.0 Tier J11 — First-of-day greeting moment (TDD).
//
// The model talks back even when the user hasn't asked. On the first foreground
// per local date, render a personalized greeting note that references last
// night's cuisine + a cuisine-adjacency suggestion for tonight. Subsequent
// renders the same local date collapse to nothing.

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

const mockSuggestAdjacent = jest.fn();
jest.mock('../../../lib/cuisineAdjacencySuggestion', () => ({
  suggestAdjacentCuisine: (...args: unknown[]) => mockSuggestAdjacent(...args),
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
import { render, waitFor } from '@testing-library/react-native';
import FirstOfDayNote from '../../../components/home/FirstOfDayNote';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockSuggestAdjacent.mockReset();
});

describe('<FirstOfDayNote /> — J11 first-of-day greeting', () => {
  it('renders the personalized note on first foreground of the day', async () => {
    mockGetItem.mockResolvedValueOnce(null); // never seen before
    mockSuggestAdjacent.mockReturnValueOnce('Lebanese');
    const { findByText } = render(<FirstOfDayNote lastCookCuisine="Persian" />);
    expect(await findByText(/Persian/)).toBeTruthy();
    expect(await findByText(/Lebanese/)).toBeTruthy();
  });

  it('persists todays date on first render', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockSuggestAdjacent.mockReturnValueOnce('Lebanese');
    render(<FirstOfDayNote lastCookCuisine="Persian" />);
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalled();
    });
    const [, value] = mockSetItem.mock.calls[0];
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/); // ISO date string
  });

  it('renders nothing when storage already records todays date', async () => {
    const today = new Date();
    const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    mockGetItem.mockResolvedValueOnce(isoToday);
    mockSuggestAdjacent.mockReturnValueOnce('Lebanese');
    const { queryByTestId } = render(<FirstOfDayNote lastCookCuisine="Persian" />);
    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalled();
    });
    expect(queryByTestId('first-of-day-note')).toBeNull();
  });

  it('renders nothing when lastCookCuisine is missing', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    const { queryByTestId } = render(<FirstOfDayNote lastCookCuisine="" />);
    await waitFor(() => undefined);
    expect(queryByTestId('first-of-day-note')).toBeNull();
  });

  it('renders nothing when adjacency returns null', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockSuggestAdjacent.mockReturnValueOnce(null);
    const { queryByTestId } = render(<FirstOfDayNote lastCookCuisine="Persian" />);
    await waitFor(() => {
      expect(mockSuggestAdjacent).toHaveBeenCalled();
    });
    expect(queryByTestId('first-of-day-note')).toBeNull();
  });

  it('exposes a11y role + label including the suggested cuisine', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockSuggestAdjacent.mockReturnValueOnce('Lebanese');
    const { findByTestId } = render(<FirstOfDayNote lastCookCuisine="Persian" />);
    const note = await findByTestId('first-of-day-note');
    expect(note.props.accessibilityRole).toBe('summary');
    expect(note.props.accessibilityLabel).toMatch(/Lebanese/i);
  });
});
