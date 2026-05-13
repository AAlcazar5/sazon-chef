// P4 retention — taste-cohort pill smoke + auto-hide.

const mockGetCohort = jest.fn();
jest.mock('../../../lib/api/recipe', () => ({
  recipeApi: { getTasteCohort: (...args: unknown[]) => mockGetCohort(...args) },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import TasteCohortPill from '../../../components/recipe/TasteCohortPill';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<TasteCohortPill />', () => {
  it('renders the pill when cookerCount is ≥1 and cohortLabel is present', async () => {
    mockGetCohort.mockResolvedValue({ data: { cookerCount: 7, cohortLabel: 'Persian' } });
    const { findByTestId } = render(<TasteCohortPill recipeId="r1" />);
    const pill = await findByTestId('taste-cohort-pill');
    expect(pill.props.accessibilityLabel).toContain('7');
  });

  it('renders nothing when cookerCount is zero', async () => {
    mockGetCohort.mockResolvedValue({ data: { cookerCount: 0, cohortLabel: null } });
    const { queryByTestId } = render(<TasteCohortPill recipeId="r1" />);
    await waitFor(() => expect(mockGetCohort).toHaveBeenCalled());
    expect(queryByTestId('taste-cohort-pill')).toBeNull();
  });

  it('renders nothing when the API errors', async () => {
    mockGetCohort.mockRejectedValue(new Error('network'));
    const { queryByTestId } = render(<TasteCohortPill recipeId="r1" />);
    await waitFor(() => expect(mockGetCohort).toHaveBeenCalled());
    expect(queryByTestId('taste-cohort-pill')).toBeNull();
  });
});
