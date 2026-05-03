// Phase 6 (10Y-C): Coach memory screen — Pro-only CRUD over Sazon's long-term notes.

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockListMemories = jest.fn();
const mockUpdateMemory = jest.fn();
const mockDeleteMemory = jest.fn();

jest.mock('../../../lib/api', () => ({
  coachApi: {
    listMemories: (...args: unknown[]) => mockListMemories(...args),
    updateMemory: (...args: unknown[]) => mockUpdateMemory(...args),
    deleteMemory: (...args: unknown[]) => mockDeleteMemory(...args),
  },
}));

const mockUseSubscription = jest.fn();
jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../lib/coachAnalytics', () => ({
  emit: jest.fn(),
}));

import CoachMemoryScreen from '../../../app/profile/coach-memory';

describe('CoachMemoryScreen', () => {
  beforeEach(() => {
    mockListMemories.mockReset();
    mockUpdateMemory.mockReset();
    mockDeleteMemory.mockReset();
    mockUseSubscription.mockReset();
  });

  it('renders Pro upsell + paywall sheet for free users', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'free', isPremium: false },
      startCheckout: jest.fn(),
    });
    const { findByText } = render(<CoachMemoryScreen />);
    expect(await findByText(/Pro feature/i)).toBeTruthy();
    expect(mockListMemories).not.toHaveBeenCalled();
  });

  it('shows empty state with curious mascot when Pro has no memories', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'premium', isPremium: true },
      startCheckout: jest.fn(),
    });
    mockListMemories.mockResolvedValue([]);
    const { findByText } = render(<CoachMemoryScreen />);
    expect(await findByText(/keep chatting/i)).toBeTruthy();
  });

  it('renders grouped list and supports delete', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'premium', isPremium: true },
      startCheckout: jest.fn(),
    });
    const memories = [
      { id: 'a1', kind: 'preference', content: 'Loves spicy food', confidence: 0.85, updatedAt: '2026-05-01T00:00:00Z' },
      { id: 'g1', kind: 'goal', content: '180g protein daily', confidence: 0.9, updatedAt: '2026-05-02T00:00:00Z' },
    ];
    mockListMemories.mockResolvedValue(memories);
    mockDeleteMemory.mockResolvedValue(undefined);

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      const destructive = (buttons ?? []).find(b => b.style === 'destructive');
      destructive?.onPress?.();
    });

    const { findByText, getByLabelText } = render(<CoachMemoryScreen />);
    expect(await findByText(/Loves spicy food/i)).toBeTruthy();
    expect(await findByText(/180g protein/i)).toBeTruthy();

    fireEvent.press(getByLabelText(/Delete memory: Loves spicy food/i));
    await waitFor(() => expect(mockDeleteMemory).toHaveBeenCalledWith('a1'));

    alertSpy.mockRestore();
  });

  it('edits a memory via the edit modal and updates the list', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'premium', isPremium: true },
      startCheckout: jest.fn(),
    });
    const memory = {
      id: 'a1',
      kind: 'preference',
      content: 'Loves spicy food',
      confidence: 0.85,
      updatedAt: '2026-05-01T00:00:00Z',
    };
    mockListMemories.mockResolvedValue([memory]);
    mockUpdateMemory.mockResolvedValue({ ...memory, content: 'Mild only' });

    const { findByText, getByLabelText, getByPlaceholderText } = render(
      <CoachMemoryScreen />,
    );
    expect(await findByText(/Loves spicy food/i)).toBeTruthy();

    fireEvent.press(getByLabelText(/Edit memory: Loves spicy food/i));
    const input = getByPlaceholderText(/What should Sazon remember/i);
    fireEvent.changeText(input, 'Mild only');
    await act(async () => {
      fireEvent.press(getByLabelText(/Save memory/i));
    });

    expect(mockUpdateMemory).toHaveBeenCalledWith('a1', { content: 'Mild only' });
    expect(await findByText(/Mild only/i)).toBeTruthy();
  });
});
