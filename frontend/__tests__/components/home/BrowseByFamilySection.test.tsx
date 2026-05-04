// frontend/__tests__/components/home/BrowseByFamilySection.test.tsx
// Group 11 Phase 5 — "Browse by Region" component tests.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const mockGetBrowseByFamily = jest.fn();
jest.mock('../../../lib/api', () => ({
  recipeApi: {
    getBrowseByFamily: (...args: any[]) => mockGetBrowseByFamily(...args),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  BrowseByFamilySection,
  type FamilyEntry,
} from '../../../components/home/BrowseByFamilySection';

const sampleFamilies: FamilyEntry[] = [
  {
    family: 'Latin American',
    cuisines: ['Mexican', 'Salvadorean', 'Peruvian', 'Cuban', 'Brazilian'],
    affinityScore: 4,
    exploredCuisines: ['Mexican'],
    isExplored: true,
    hasNewForYou: false,
  },
  {
    family: 'East & Southeast Asian',
    cuisines: ['Thai', 'Vietnamese', 'Burmese', 'Lao'],
    affinityScore: 0,
    exploredCuisines: [],
    isExplored: false,
    hasNewForYou: true,
  },
  {
    family: 'European — Nordic',
    cuisines: ['Swedish', 'Danish', 'Norwegian', 'Finnish'],
    affinityScore: 0,
    exploredCuisines: [],
    isExplored: false,
    hasNewForYou: false,
  },
];

describe('BrowseByFamilySection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when the families list is empty', () => {
    const { queryByLabelText } = render(
      <BrowseByFamilySection
        isDark={false}
        onFamilyPress={jest.fn()}
        familiesOverride={[]}
      />,
    );
    expect(queryByLabelText(/Browse by region/i)).toBeNull();
  });

  it('renders one card per family with the cuisine list', () => {
    const { getByText, getByTestId } = render(
      <BrowseByFamilySection
        isDark={false}
        onFamilyPress={jest.fn()}
        familiesOverride={sampleFamilies}
      />,
    );

    expect(getByText('Latin American')).toBeTruthy();
    expect(getByText('East & Southeast Asian')).toBeTruthy();
    expect(getByText('European — Nordic')).toBeTruthy();

    // Each family has a testID-tagged card
    expect(getByTestId('family-card-Latin American')).toBeTruthy();
    expect(getByTestId('family-card-East & Southeast Asian')).toBeTruthy();
  });

  it('shows a "New for you" badge only on families with hasNewForYou=true', () => {
    const { getByTestId, queryByTestId } = render(
      <BrowseByFamilySection
        isDark={false}
        onFamilyPress={jest.fn()}
        familiesOverride={sampleFamilies}
      />,
    );

    expect(getByTestId('new-for-you-badge-East & Southeast Asian')).toBeTruthy();
    expect(queryByTestId('new-for-you-badge-Latin American')).toBeNull();
    expect(queryByTestId('new-for-you-badge-European — Nordic')).toBeNull();
  });

  it('shows "N cooked" on explored families', () => {
    const { getByText } = render(
      <BrowseByFamilySection
        isDark={false}
        onFamilyPress={jest.fn()}
        familiesOverride={sampleFamilies}
      />,
    );
    expect(getByText('1 cooked')).toBeTruthy();
  });

  it('fires onFamilyPress with the entry when a card is tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <BrowseByFamilySection
        isDark={false}
        onFamilyPress={onPress}
        familiesOverride={sampleFamilies}
      />,
    );

    fireEvent.press(getByTestId('family-card-Latin American'));
    expect(onPress).toHaveBeenCalledWith(
      expect.objectContaining({ family: 'Latin American' }),
    );
  });

  it('fetches families from the API when no override is provided', async () => {
    mockGetBrowseByFamily.mockResolvedValueOnce({ data: { families: sampleFamilies } });
    const { findByText } = render(
      <BrowseByFamilySection isDark={false} onFamilyPress={jest.fn()} />,
    );

    await waitFor(() => expect(mockGetBrowseByFamily).toHaveBeenCalled());
    await findByText('Latin American');
  });
});
