// frontend/__tests__/components/home/NewToYouSection.test.tsx
// Group 11 Phase 5 — "New to you" component tests.

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

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: ({ testID, ...rest }: any) => <View testID={testID ?? 'recipe-image'} {...rest} />,
  };
});

const mockGetNewToYou = jest.fn();
jest.mock('../../../lib/api', () => ({
  recipeApi: {
    getNewToYou: (...args: any[]) => mockGetNewToYou(...args),
  },
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NewToYouSection, type NewToYouFeed } from '../../../components/home/NewToYouSection';

const baseProps = {
  isDark: false,
  userFeedback: {},
  feedbackLoading: null,
  onRecipePress: jest.fn(),
  onRecipeLongPress: jest.fn(),
  onLike: jest.fn(),
  onDislike: jest.fn(),
  onSave: jest.fn(),
};

const sampleFeed: NewToYouFeed = {
  isColdStart: false,
  sourceCuisines: ['Thai', 'Mexican'],
  adjacentCuisines: ['Vietnamese', 'Burmese'],
  recipes: [
    {
      id: 'r1',
      title: 'Vietnamese Pho',
      cuisine: 'Vietnamese',
      personalizationReason: 'Because you cooked Thai',
      sourceCuisine: 'Thai',
      cookTime: 30,
      calories: 420,
    } as any,
    {
      id: 'r2',
      title: 'Burmese Khao Soi',
      cuisine: 'Burmese',
      personalizationReason: 'Because you cooked Thai',
      sourceCuisine: 'Thai',
      cookTime: 35,
      calories: 510,
    } as any,
  ],
};

describe('NewToYouSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when the feed is empty', async () => {
    const empty: NewToYouFeed = {
      recipes: [],
      isColdStart: true,
      sourceCuisines: [],
      adjacentCuisines: [],
    };
    const { queryByLabelText } = render(
      <NewToYouSection {...baseProps} feedOverride={empty} />,
    );
    expect(queryByLabelText(/New to you/i)).toBeNull();
  });

  it('renders the warm-start subtitle and each recipe card with reason', async () => {
    const { findByLabelText, getByText, getAllByLabelText } = render(
      <NewToYouSection {...baseProps} feedOverride={sampleFeed} />,
    );

    // Both recipes rendered
    expect(getByText('Vietnamese Pho')).toBeTruthy();
    expect(getByText('Burmese Khao Soi')).toBeTruthy();

    // Personalization reason surfaced (both recipes share the same reason
    // text in the fixture, so getAllByLabelText returns both rendered rows).
    const matched = getAllByLabelText(/Reason: Because you cooked Thai/);
    expect(matched.length).toBe(2);

    // Section accessible
    await findByLabelText('New to you — personalized cuisine recommendations');
  });

  it('renders cold-start subtitle when isColdStart=true', async () => {
    const cold: NewToYouFeed = {
      ...sampleFeed,
      isColdStart: true,
      sourceCuisines: ['Thai', 'Persian'],
    };
    const { getByText } = render(
      <NewToYouSection {...baseProps} feedOverride={cold} />,
    );
    expect(getByText(/From your onboarding picks/i)).toBeTruthy();
  });

  it('fetches the feed via recipeApi.getNewToYou when no override is provided', async () => {
    mockGetNewToYou.mockResolvedValueOnce({ data: sampleFeed });
    const { findByText } = render(<NewToYouSection {...baseProps} />);

    await waitFor(() => expect(mockGetNewToYou).toHaveBeenCalledWith({ limit: 8 }));
    await findByText('Vietnamese Pho');
  });

  it('renders nothing when the API call fails', async () => {
    mockGetNewToYou.mockRejectedValueOnce(new Error('network'));
    const { queryByText } = render(<NewToYouSection {...baseProps} />);
    await waitFor(() => expect(mockGetNewToYou).toHaveBeenCalled());
    // Wait one tick for the error state to settle, then verify no recipes shown
    await waitFor(() => {
      expect(queryByText('Vietnamese Pho')).toBeNull();
    });
  });
});
