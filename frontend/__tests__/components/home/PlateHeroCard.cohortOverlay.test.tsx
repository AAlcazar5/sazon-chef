// frontend/__tests__/components/home/PlateHeroCard.cohortOverlay.test.tsx
// ROADMAP 4.0 HX2.3 — Friend cohort overlay on Today's hero.

const mockGetFriendCohort = jest.fn();
jest.mock('../../../lib/api', () => ({
  recipeApi: {
    getFriendCohort: (...args: unknown[]) => mockGetFriendCohort(...args),
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success' },
}));

import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import HeroCohortOverlay from '../../../components/home/HeroCohortOverlay';

beforeEach(() => {
  mockGetFriendCohort.mockReset();
});

const member = (firstName: string, daysAgo = 1) => ({
  userId: `u-${firstName}`,
  firstName,
  cookedAt: new Date(Date.now() - daysAgo * 86400_000).toISOString(),
});

describe('HX2.3 — HeroCohortOverlay', () => {
  it('renders avatar cluster + named copy when ≥2 friends cooked within window', async () => {
    mockGetFriendCohort.mockResolvedValueOnce({
      data: {
        members: [member('Marcus', 1), member('Lina', 3), member('Toby', 5)],
        totalCount: 3,
        identityRedacted: false,
      },
    });
    const { findByText, findByTestId } = renderWithProviders(
      <HeroCohortOverlay recipeId="r1" />,
    );
    expect(await findByTestId('hero-cohort-overlay')).toBeTruthy();
    // Names a single friend explicitly + counts the rest.
    expect(await findByText(/marcus.*\+\s*2.*others?/i)).toBeTruthy();
  });

  it('uses singular "other" when exactly 2 friends cooked', async () => {
    mockGetFriendCohort.mockResolvedValueOnce({
      data: {
        members: [member('Marcus'), member('Lina')],
        totalCount: 2,
        identityRedacted: false,
      },
    });
    const { findByText } = renderWithProviders(<HeroCohortOverlay recipeId="r1" />);
    // "Marcus + 1 other made this this week"
    expect(await findByText(/marcus.*\+\s*1\s*other\b/i)).toBeTruthy();
  });

  it('hides when only 1 friend cooked (below threshold)', async () => {
    mockGetFriendCohort.mockResolvedValueOnce({
      data: {
        members: [member('Marcus')],
        totalCount: 1,
        identityRedacted: false,
      },
    });
    const { queryByTestId } = renderWithProviders(<HeroCohortOverlay recipeId="r1" />);
    await waitFor(() => expect(mockGetFriendCohort).toHaveBeenCalled());
    expect(queryByTestId('hero-cohort-overlay')).toBeNull();
  });

  it('hides when no friends cooked', async () => {
    mockGetFriendCohort.mockResolvedValueOnce({
      data: { members: [], totalCount: 0, identityRedacted: false },
    });
    const { queryByTestId } = renderWithProviders(<HeroCohortOverlay recipeId="r1" />);
    await waitFor(() => expect(mockGetFriendCohort).toHaveBeenCalled());
    expect(queryByTestId('hero-cohort-overlay')).toBeNull();
  });

  it('respects identity redaction — uses opaque "N friends" copy when names hidden', async () => {
    mockGetFriendCohort.mockResolvedValueOnce({
      data: {
        members: [
          { userId: 'u1', firstName: '', cookedAt: new Date().toISOString() },
          { userId: 'u2', firstName: '', cookedAt: new Date().toISOString() },
        ],
        totalCount: 2,
        identityRedacted: true,
      },
    });
    const { findByText, queryByText } = renderWithProviders(
      <HeroCohortOverlay recipeId="r1" />,
    );
    expect(await findByText(/2\s*friends?\s*made\s*this/i)).toBeTruthy();
    // No first name should appear (since none were provided + redaction is true)
    expect(queryByText(/marcus|lina|toby/i)).toBeNull();
  });

  it('hides on null/undefined recipeId without fetching', () => {
    const { queryByTestId } = renderWithProviders(<HeroCohortOverlay recipeId={null} />);
    expect(queryByTestId('hero-cohort-overlay')).toBeNull();
    expect(mockGetFriendCohort).not.toHaveBeenCalled();
  });

  it('hides on api error', async () => {
    mockGetFriendCohort.mockRejectedValue(new Error('boom'));
    const { queryByTestId } = renderWithProviders(<HeroCohortOverlay recipeId="r1" />);
    await waitFor(() => expect(mockGetFriendCohort).toHaveBeenCalled());
    expect(queryByTestId('hero-cohort-overlay')).toBeNull();
  });

  it('a11y: overlay announces summary content', async () => {
    mockGetFriendCohort.mockResolvedValueOnce({
      data: {
        members: [member('Marcus'), member('Lina')],
        totalCount: 2,
        identityRedacted: false,
      },
    });
    const { findByTestId } = renderWithProviders(<HeroCohortOverlay recipeId="r1" />);
    const root = await findByTestId('hero-cohort-overlay');
    expect(root.props.accessibilityRole).toBe('summary');
    expect(root.props.accessibilityLabel).toMatch(/marcus/i);
  });

  it('default windowDays passes 14 to api', async () => {
    mockGetFriendCohort.mockResolvedValueOnce({
      data: { members: [], totalCount: 0, identityRedacted: false },
    });
    renderWithProviders(<HeroCohortOverlay recipeId="r1" />);
    await waitFor(() => expect(mockGetFriendCohort).toHaveBeenCalled());
    expect(mockGetFriendCohort).toHaveBeenCalledWith('r1', 14);
  });
});
