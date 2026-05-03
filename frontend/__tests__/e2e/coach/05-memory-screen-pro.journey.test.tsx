// frontend/__tests__/e2e/coach/05-memory-screen-pro.journey.test.tsx
//
// Journey 5 — Memory screen (Pro)
//
// Flow:
//   Profile → Coach memory screen (Pro) → grouped list renders
//   → tap edit on a memory → modal opens with existing text
//   → change text → tap Save → list updates in place

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ─── Module mocks ────────────────────────────────────────────────────────────

const mockListMemories = jest.fn();
const mockUpdateMemory = jest.fn();
const mockDeleteMemory = jest.fn();

jest.mock('../../../lib/api', () => ({
  coachApi: {
    listMemories: (...a: unknown[]) => mockListMemories(...a),
    updateMemory: (...a: unknown[]) => mockUpdateMemory(...a),
    deleteMemory: (...a: unknown[]) => mockDeleteMemory(...a),
  },
}));

jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    subscription: { tier: 'premium', isPremium: true },
    startCheckout: jest.fn(),
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../lib/coachAnalytics', () => ({ emit: jest.fn() }));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../components/mascot/Sazon', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    expressionToSazon: () => ({ variant: 'orange', motion: 'kiss', fx: [] }),
    SAZON_SIZE_PX: { tiny: 24, xsmall: 36, small: 48, medium: 96, large: 192, hero: 256 },
    default: function MockSazon() { return <Text testID="mascot">chef-kiss</Text>; },
  };
});

jest.mock('../../../components/mascot/LogoMascot', () => {
  const { View } = require('react-native');
  return function MockLogoMascot() { return <View testID="logo-mascot" />; };
});

import CoachMemoryScreen from '../../../app/profile/coach-memory';

// ─── Journey ─────────────────────────────────────────────────────────────────

const PRO_MEMORIES = [
  { id: 'p1', kind: 'preference', content: 'Loves spicy Thai', confidence: 0.92, updatedAt: '2026-05-01T00:00:00Z' },
  { id: 'g1', kind: 'goal', content: '180g protein daily', confidence: 0.88, updatedAt: '2026-05-02T00:00:00Z' },
  { id: 'c1', kind: 'constraint', content: 'Lactose intolerant', confidence: 0.99, updatedAt: '2026-05-02T00:00:00Z' },
];

describe('Journey 5 — Memory screen (Pro)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListMemories.mockResolvedValue(PRO_MEMORIES);
    mockUpdateMemory.mockImplementation((_id: string, { content }: { content: string }) =>
      Promise.resolve({ ...PRO_MEMORIES[0], content }),
    );
  });

  it('J5.1 — Pro screen loads and groups memories by kind', async () => {
    const { findByText } = render(<CoachMemoryScreen />);

    expect(await findByText('Preferences')).toBeTruthy();
    expect(await findByText('Goals')).toBeTruthy();
    expect(await findByText('Constraints')).toBeTruthy();
    expect(await findByText(/Loves spicy Thai/i)).toBeTruthy();
    expect(await findByText(/180g protein/i)).toBeTruthy();
    expect(await findByText(/Lactose intolerant/i)).toBeTruthy();
  });

  it('J5.2 — confidence score renders as a percentage pill', async () => {
    const { findByText } = render(<CoachMemoryScreen />);
    // 0.92 → "92%"
    expect(await findByText('92%')).toBeTruthy();
  });

  it('J5.3 — tapping edit opens the edit modal with existing content pre-filled', async () => {
    const { findByText, getByLabelText, getByPlaceholderText } = render(<CoachMemoryScreen />);
    await findByText(/Loves spicy Thai/i);

    fireEvent.press(getByLabelText('Edit memory: Loves spicy Thai'));

    await waitFor(() => {
      const input = getByPlaceholderText(/What should Sazon remember/i) as any;
      expect(input.props.value).toBe('Loves spicy Thai');
    });
  });

  it('J5.4 — editing content and saving updates the list in place', async () => {
    const { findByText, getByLabelText, getByPlaceholderText } = render(<CoachMemoryScreen />);
    await findByText(/Loves spicy Thai/i);

    fireEvent.press(getByLabelText('Edit memory: Loves spicy Thai'));

    const input = getByPlaceholderText(/What should Sazon remember/i);
    fireEvent.changeText(input, 'Prefers mild food now');

    await act(async () => {
      fireEvent.press(getByLabelText('Save memory'));
    });

    await waitFor(() => {
      expect(mockUpdateMemory).toHaveBeenCalledWith('p1', { content: 'Prefers mild food now' });
    });

    expect(await findByText(/Prefers mild food now/i)).toBeTruthy();
  });

  it('J5.5 — saving unchanged content closes modal without calling the API', async () => {
    const { findByText, getByLabelText, getByPlaceholderText, queryByPlaceholderText } = render(
      <CoachMemoryScreen />,
    );
    await findByText(/Loves spicy Thai/i);

    fireEvent.press(getByLabelText('Edit memory: Loves spicy Thai'));
    const input = getByPlaceholderText(/What should Sazon remember/i);

    // Don't change the text — same value.
    fireEvent.changeText(input, 'Loves spicy Thai');

    await act(async () => {
      fireEvent.press(getByLabelText('Save memory'));
    });

    expect(mockUpdateMemory).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(queryByPlaceholderText(/What should Sazon remember/i)).toBeNull();
    });
  });
});
