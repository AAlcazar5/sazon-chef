// frontend/__tests__/components/home/SurpriseMeModal.roulette.test.tsx
// ROADMAP 4.0 Tier J8 — Surprise-Me roulette reveal (TDD).

const mockSelectionAsync = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: (...args: unknown[]) => mockSelectionAsync(...args),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const mockTrack = jest.fn();
jest.mock('../../../hooks/useSurfaceTracking', () => ({
  useSurfaceTracking: () => ({
    track: (...args: unknown[]) => mockTrack(...args),
    flush: jest.fn(),
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => false,
  };
});

import React from 'react';
import { render, act } from '@testing-library/react-native';
import SurpriseRouletteOverlay from '../../../components/home/SurpriseRouletteOverlay';

const chosen = {
  id: 'r1',
  title: 'Persian rice bowl',
  imageUrl: 'https://example.com/x.jpg',
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('<SurpriseRouletteOverlay />', () => {
  it('renders a card placeholder while the roulette spins', () => {
    const { getByTestId } = render(
      <SurpriseRouletteOverlay
        visible
        chosenRecipe={chosen}
        onSettle={jest.fn()}
      />,
    );
    expect(getByTestId('roulette-card')).toBeTruthy();
  });

  it('settles on the chosen recipe by ~2s', () => {
    const onSettle = jest.fn();
    const { getByText } = render(
      <SurpriseRouletteOverlay
        visible
        chosenRecipe={chosen}
        onSettle={onSettle}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(2100);
    });
    expect(onSettle).toHaveBeenCalledTimes(1);
    expect(getByText(/Persian rice bowl/)).toBeTruthy();
  });

  it('fires haptic ticks during the spin', () => {
    render(
      <SurpriseRouletteOverlay
        visible
        chosenRecipe={chosen}
        onSettle={jest.fn()}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(2100);
    });
    expect(mockSelectionAsync).toHaveBeenCalled();
    expect(mockSelectionAsync.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('emits a surprise_me_roulette surface event on settle', () => {
    render(
      <SurpriseRouletteOverlay
        visible
        chosenRecipe={chosen}
        onSettle={jest.fn()}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(2100);
    });
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: 'surprise_me_roulette',
        action: 'tap',
        recipeId: 'r1',
      }),
    );
  });

  it('renders nothing when visible=false', () => {
    const { queryByTestId } = render(
      <SurpriseRouletteOverlay
        visible={false}
        chosenRecipe={chosen}
        onSettle={jest.fn()}
      />,
    );
    expect(queryByTestId('roulette-card')).toBeNull();
  });
});
