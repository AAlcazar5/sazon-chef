// 10Y entry-points: Recipe-detail "Ask the Coach about this recipe" pill.
// Verifies render, conversation creation, and route w/ seed message.

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

import AskCoachAboutRecipePill from '../../../components/coach/AskCoachAboutRecipePill';

describe('AskCoachAboutRecipePill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateConversation.mockResolvedValue({ id: 'conv_123' });
  });

  it('renders pill with copy and accessibility label', () => {
    const { getByText, getByLabelText } = render(
      <AskCoachAboutRecipePill recipeTitle="Salmon Bowl" />,
    );
    expect(getByText(/Ask the Coach about this recipe/i)).toBeTruthy();
    expect(getByLabelText(/Ask Coach about Salmon Bowl/i)).toBeTruthy();
  });

  it('creates a conversation and routes with conversationId + seedMessage on tap', async () => {
    const { getByLabelText } = render(
      <AskCoachAboutRecipePill
        recipeTitle="Salmon Bowl"
        pantryCoverage={75}
        macroFit="lunch"
      />,
    );
    fireEvent.press(getByLabelText(/Ask Coach about Salmon Bowl/i));
    await waitFor(() => {
      expect(mockCreateConversation).toHaveBeenCalledTimes(1);
    });
    const seedSent = mockCreateConversation.mock.calls[0][0] as string;
    expect(seedSent).toMatch(/Salmon Bowl/);
    expect(seedSent).toMatch(/75%/);
    expect(seedSent).toMatch(/lunch/);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
    const target = mockPush.mock.calls[0][0] as string;
    expect(target).toContain('conversationId=conv_123');
    expect(target).toContain('seedMessage=');
  });

  it('omits coverage/macro clauses when not provided', async () => {
    const { getByLabelText } = render(
      <AskCoachAboutRecipePill recipeTitle="Mystery Stew" />,
    );
    fireEvent.press(getByLabelText(/Ask Coach about Mystery Stew/i));
    await waitFor(() => expect(mockCreateConversation).toHaveBeenCalledTimes(1));
    const seedSent = mockCreateConversation.mock.calls[0][0] as string;
    expect(seedSent).toMatch(/Mystery Stew/);
    expect(seedSent).not.toMatch(/pantry coverage/i);
    expect(seedSent).not.toMatch(/fits/);
    expect(seedSent).toMatch(/ask anything/i);
  });
});
