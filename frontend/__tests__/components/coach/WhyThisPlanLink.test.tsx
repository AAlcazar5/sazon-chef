// 10Y entry-points: Meal-plan "Why this plan?" link.
// Verifies render + conversation creation + route with seed.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

const mockCreateConversation = jest.fn();
jest.mock('../../../lib/api', () => ({
  coachApi: {
    createConversation: (...args: unknown[]) => mockCreateConversation(...args),
  },
}));

import WhyThisPlanLink from '../../../components/coach/WhyThisPlanLink';

describe('WhyThisPlanLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateConversation.mockResolvedValue({ id: 'conv_456' });
  });

  it('renders the link copy', () => {
    const { getByText } = render(
      <WhyThisPlanLink mealTitles={['Salmon Bowl', 'Greek Salad']} goalPhase="cut" />,
    );
    expect(getByText(/Why this plan\?/i)).toBeTruthy();
  });

  it('creates a conversation with goal phase + meal titles in seed and routes', async () => {
    const { getByLabelText } = render(
      <WhyThisPlanLink mealTitles={['Salmon Bowl', 'Greek Salad']} goalPhase="cut" />,
    );
    fireEvent.press(getByLabelText(/Why this plan/i));
    await waitFor(() => expect(mockCreateConversation).toHaveBeenCalledTimes(1));
    const seedSent = mockCreateConversation.mock.calls[0][0] as string;
    expect(seedSent).toMatch(/cut/i);
    expect(seedSent).toMatch(/Salmon Bowl/);
    expect(seedSent).toMatch(/Greek Salad/);
    expect(seedSent).toMatch(/Why these for me/i);

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    const target = mockPush.mock.calls[0][0] as string;
    expect(target).toContain('conversationId=conv_456');
    expect(target).toContain('seedMessage=');
  });

  it('falls back to "maintain" when goalPhase missing', async () => {
    const { getByLabelText } = render(
      <WhyThisPlanLink mealTitles={['Toast']} />,
    );
    fireEvent.press(getByLabelText(/Why this plan/i));
    await waitFor(() => expect(mockCreateConversation).toHaveBeenCalledTimes(1));
    const seedSent = mockCreateConversation.mock.calls[0][0] as string;
    expect(seedSent).toMatch(/maintain/i);
  });
});
