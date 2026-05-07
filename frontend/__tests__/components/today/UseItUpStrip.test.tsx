// frontend/__tests__/components/today/UseItUpStrip.test.tsx
// ROADMAP 4.0 IG4.3 — UseItUpStrip Today surface test.

import { findVoiceViolation } from '../../__fixtures__/bannedVocabularyCorpus';

const mockGetExpiring = jest.fn();
jest.mock('../../../lib/api', () => ({
  pantryApi: {
    getExpiring: (...args: unknown[]) => mockGetExpiring(...args),
  },
}));

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
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

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import UseItUpStrip from '../../../components/today/UseItUpStrip';

const item = (over: Partial<any> = {}) => ({
  id: 'p1',
  name: 'cilantro',
  category: 'herbs',
  quantity: null,
  unit: null,
  daysUntilExpiry: 1,
  expiresAt: new Date().toISOString(),
  expirySource: 'fallback',
  prompt: "cilantro's been quiet — fancy putting it to work?",
  ...over,
});

beforeEach(() => {
  mockGetExpiring.mockReset();
  mockRouterPush.mockReset();
});

describe('UseItUpStrip (IG4.3)', () => {
  it('hides silently when API returns no items', async () => {
    mockGetExpiring.mockResolvedValue({ data: { items: [] } });
    const { queryByTestId } = renderWithProviders(<UseItUpStrip />);
    await waitFor(() => expect(mockGetExpiring).toHaveBeenCalled());
    expect(queryByTestId('use-it-up-strip')).toBeNull();
  });

  it('hides silently when API errors', async () => {
    mockGetExpiring.mockRejectedValue(new Error('boom'));
    const { queryByTestId } = renderWithProviders(<UseItUpStrip />);
    await waitFor(() => expect(mockGetExpiring).toHaveBeenCalled());
    expect(queryByTestId('use-it-up-strip')).toBeNull();
  });

  it('renders when there are expiring items', async () => {
    mockGetExpiring.mockResolvedValue({
      data: {
        items: [
          item({ id: 'p1', name: 'cilantro', daysUntilExpiry: 1 }),
          item({ id: 'p2', name: 'arugula', daysUntilExpiry: 2 }),
        ],
      },
    });
    const { findByTestId } = renderWithProviders(<UseItUpStrip />);
    expect(await findByTestId('use-it-up-strip')).toBeTruthy();
  });

  it('renders the most-urgent item first as the headline + ≤3 pills', async () => {
    mockGetExpiring.mockResolvedValue({
      data: {
        items: [
          item({ id: 'p1', name: 'cilantro' }),
          item({ id: 'p2', name: 'arugula' }),
          item({ id: 'p3', name: 'spinach' }),
          item({ id: 'p4', name: 'tomato' }),
        ],
      },
    });
    const { findByTestId, queryByTestId } = renderWithProviders(<UseItUpStrip />);
    await findByTestId('use-it-up-strip');
    expect(queryByTestId('use-it-up-pill-p1')).toBeTruthy();
    expect(queryByTestId('use-it-up-pill-p2')).toBeTruthy();
    expect(queryByTestId('use-it-up-pill-p3')).toBeTruthy();
    expect(queryByTestId('use-it-up-pill-p4')).toBeNull();
  });

  it('headline uses server-provided prompt verbatim (no inline templates)', async () => {
    const customPrompt = 'arugula could use a moment in the pan tonight.';
    mockGetExpiring.mockResolvedValue({
      data: {
        items: [item({ id: 'p1', name: 'arugula', prompt: customPrompt })],
      },
    });
    const { findByText } = renderWithProviders(<UseItUpStrip />);
    expect(await findByText(customPrompt)).toBeTruthy();
  });

  it('lifestyle voice — server prompt passes the banned-vocab guard', async () => {
    const prompt = "cilantro's been quiet — fancy putting it to work?";
    mockGetExpiring.mockResolvedValue({
      data: {
        items: [item({ name: 'cilantro', prompt })],
      },
    });
    const { findByText } = renderWithProviders(<UseItUpStrip />);
    const headlineNode = await findByText(prompt);
    expect(headlineNode).toBeTruthy();
    // Validate the actual rendered prompt string against the corpus.
    expect(findVoiceViolation(prompt, { allow: ['brand'] })).toBeNull();
  });

  it('tap on a pill fires onPress with the ordered expiring names', async () => {
    const onPress = jest.fn();
    mockGetExpiring.mockResolvedValue({
      data: {
        items: [item({ id: 'p1', name: 'cilantro' }), item({ id: 'p2', name: 'arugula' })],
      },
    });
    const { findByTestId } = renderWithProviders(<UseItUpStrip onPress={onPress} />);
    fireEvent.press(await findByTestId('use-it-up-pill-p1'));
    expect(onPress).toHaveBeenCalledWith(['cilantro', 'arugula']);
  });

  it('default tap routes to ?craving=<most-urgent> when no onPress provided', async () => {
    mockGetExpiring.mockResolvedValue({
      data: { items: [item({ id: 'p1', name: 'cilantro' })] },
    });
    const { findByTestId } = renderWithProviders(<UseItUpStrip />);
    fireEvent.press(await findByTestId('use-it-up-pill-p1'));
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    expect(mockRouterPush.mock.calls[0][0]).toContain('craving=cilantro');
  });

  it('does not fetch when enabled=false', async () => {
    const { queryByTestId } = renderWithProviders(<UseItUpStrip enabled={false} />);
    // Wait one tick to confirm no fetch
    await new Promise((r) => setTimeout(r, 0));
    expect(mockGetExpiring).not.toHaveBeenCalled();
    expect(queryByTestId('use-it-up-strip')).toBeNull();
  });

  it('passes withinDays prop through to the API call', async () => {
    mockGetExpiring.mockResolvedValue({ data: { items: [] } });
    renderWithProviders(<UseItUpStrip withinDays={7} />);
    await waitFor(() => expect(mockGetExpiring).toHaveBeenCalledWith(7));
  });
});
