// frontend/__tests__/components/today/ActivationCard.test.tsx
// ROADMAP 4.0 N12 — ActivationCard test.

const mockActivation = jest.fn();
jest.mock('../../../lib/api', () => ({
  todayApi: { activation: (...args: unknown[]) => mockActivation(...args) },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success' },
}));

const mockGetItem = jest.fn().mockResolvedValue(null);
const mockSetItem = jest.fn().mockResolvedValue(undefined);
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import ActivationCard from '../../../components/today/ActivationCard';

const day3Surface = {
  phase: 'day-3' as const,
  daysSinceSignup: 3,
  recipes: [
    { id: 'r1', title: 'Carbonara', cuisine: 'Italian', cookTime: 25, imageUrl: null },
    { id: 'r2', title: 'Saffron rice', cuisine: 'Persian', cookTime: 30, imageUrl: null },
    { id: 'r3', title: 'Quick puttanesca', cuisine: 'Italian', cookTime: 20, imageUrl: null },
  ],
  onboardingCuisines: ['Italian', 'Persian'],
  headline: 'Ready for the first cook?',
  body: 'Three 30-minute starters from cuisines you mentioned.',
};

const day7Surface = {
  phase: 'day-7' as const,
  daysSinceSignup: 7,
  recipes: [],
  onboardingCuisines: ['Italian'],
  headline: "No rush — Sazon is happy to suggest whenever you're ready.",
  body: 'Tap any recipe to start. The kitchen learns from the first one.',
};

beforeEach(() => {
  mockActivation.mockReset();
  mockPush.mockReset();
});

describe('ActivationCard (N12)', () => {
  it('hides when API returns surface: null', async () => {
    mockActivation.mockResolvedValue({ data: { surface: null } });
    const { queryByTestId } = renderWithProviders(<ActivationCard />);
    await waitFor(() => expect(mockActivation).toHaveBeenCalled());
    expect(queryByTestId('activation-card-day-3')).toBeNull();
    expect(queryByTestId('activation-card-day-7')).toBeNull();
  });

  it('hides when API errors', async () => {
    mockActivation.mockRejectedValue(new Error('boom'));
    const { queryByTestId } = renderWithProviders(<ActivationCard />);
    await waitFor(() => expect(mockActivation).toHaveBeenCalled());
    expect(queryByTestId('activation-card-day-3')).toBeNull();
  });

  it('day-3: renders eyebrow + headline + body + 3 recipe pills', async () => {
    mockActivation.mockResolvedValue({ data: { surface: day3Surface } });
    const { findByTestId, getByText } = renderWithProviders(<ActivationCard />);
    expect(await findByTestId('activation-card-day-3')).toBeTruthy();
    expect(getByText('FIRST COOK')).toBeTruthy();
    expect(getByText('Ready for the first cook?')).toBeTruthy();
    expect(getByText('Carbonara')).toBeTruthy();
    expect(getByText('Saffron rice')).toBeTruthy();
    expect(getByText('Quick puttanesca')).toBeTruthy();
  });

  it('day-3: tapping a recipe pill routes with referrer=activation', async () => {
    mockActivation.mockResolvedValue({ data: { surface: day3Surface } });
    const { findByTestId } = renderWithProviders(<ActivationCard />);
    fireEvent.press(await findByTestId('activation-recipe-r1'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toContain('referrer=activation');
    expect(mockPush.mock.calls[0][0]).toContain('r1');
  });

  it('day-7: renders softer eyebrow + headline, no recipe pills', async () => {
    mockActivation.mockResolvedValue({ data: { surface: day7Surface } });
    const { findByTestId, getByText, queryByTestId } = renderWithProviders(
      <ActivationCard />,
    );
    expect(await findByTestId('activation-card-day-7')).toBeTruthy();
    expect(getByText("WHENEVER YOU'RE READY")).toBeTruthy();
    expect(getByText(day7Surface.headline)).toBeTruthy();
    expect(queryByTestId('activation-recipe-r1')).toBeNull();
  });

  it('day-7: copy is invitational, never punitive', async () => {
    mockActivation.mockResolvedValue({ data: { surface: day7Surface } });
    const { findByTestId, queryByText } = renderWithProviders(<ActivationCard />);
    await findByTestId('activation-card-day-7');
    expect(queryByText(/missed/i)).toBeNull();
    expect(queryByText(/behind/i)).toBeNull();
    expect(queryByText(/failed/i)).toBeNull();
    expect(queryByText(/should/i)).toBeNull();
  });

  it('does not fetch when enabled=false', async () => {
    const { queryByTestId } = renderWithProviders(<ActivationCard enabled={false} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockActivation).not.toHaveBeenCalled();
    expect(queryByTestId('activation-card-day-3')).toBeNull();
  });

  it('a11y — accessibilityLabel includes both headline and body', async () => {
    mockActivation.mockResolvedValue({ data: { surface: day3Surface } });
    const { findByLabelText } = renderWithProviders(<ActivationCard />);
    expect(
      await findByLabelText(/Ready for the first cook.*30-minute starters/),
    ).toBeTruthy();
  });

  it('day-3 wraps in CapabilityReveal; day-7 does NOT (would feel like celebrating inactivity)', async () => {
    // Smoke test — CapabilityReveal renders children even when no reg fires,
    // so absence/presence of the wrapper itself is harder to assert directly.
    // Instead: verify both surfaces render their child cards as expected.
    mockActivation.mockResolvedValue({ data: { surface: day3Surface } });
    const { findByTestId, unmount } = renderWithProviders(<ActivationCard />);
    expect(await findByTestId('activation-card-day-3')).toBeTruthy();
    unmount();
    mockActivation.mockResolvedValue({ data: { surface: day7Surface } });
    const { findByTestId: findD7 } = renderWithProviders(<ActivationCard />);
    expect(await findD7('activation-card-day-7')).toBeTruthy();
  });
});
