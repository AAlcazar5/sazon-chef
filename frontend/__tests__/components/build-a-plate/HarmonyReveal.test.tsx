// frontend/__tests__/components/build-a-plate/HarmonyReveal.test.tsx
// ROADMAP 4.0 Tier J3 — Build-a-Plate harmony reveal (TDD).

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
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
import { render, fireEvent } from '@testing-library/react-native';
import HarmonyReveal from '../../../components/build-a-plate/HarmonyReveal';
import type { HarmonySignal } from '../../../components/build-a-plate/HarmonyReveal';

const fourSlotMix: HarmonySignal = {
  slotsFilled: 4,
  totalSlots: 4,
  macroFit: 0.92,
  cuisines: ['Persian', 'Lebanese', 'Greek'],
  textures: ['crispy', 'creamy', 'fresh'],
  colors: ['red', 'green', 'gold'],
};

const partialMix: HarmonySignal = {
  slotsFilled: 3,
  totalSlots: 4,
  macroFit: 0.92,
  cuisines: ['Persian', 'Lebanese', 'Greek'],
  textures: ['crispy', 'creamy', 'fresh'],
  colors: ['red', 'green', 'gold'],
};

const lowFitMix: HarmonySignal = {
  slotsFilled: 4,
  totalSlots: 4,
  macroFit: 0.6,
  cuisines: ['Persian', 'Lebanese', 'Greek'],
  textures: ['crispy', 'creamy', 'fresh'],
  colors: ['red', 'green', 'gold'],
};

const monocultureMix: HarmonySignal = {
  slotsFilled: 4,
  totalSlots: 4,
  macroFit: 0.92,
  cuisines: ['Persian', 'Persian'],
  textures: ['crispy', 'crispy'],
  colors: ['red', 'red'],
};

describe('<HarmonyReveal />', () => {
  it('renders the reveal when 4/4 slots + macroFit ≥0.85 + diversity ≥3', () => {
    const { getByTestId } = render(
      <HarmonyReveal signal={fourSlotMix} onSaveCombo={jest.fn()} />,
    );
    expect(getByTestId('harmony-reveal')).toBeTruthy();
  });

  it('does NOT render on a partial plate (3 of 4 slots)', () => {
    const { queryByTestId } = render(
      <HarmonyReveal signal={partialMix} onSaveCombo={jest.fn()} />,
    );
    expect(queryByTestId('harmony-reveal')).toBeNull();
  });

  it('does NOT render when macroFit < 0.85', () => {
    const { queryByTestId } = render(
      <HarmonyReveal signal={lowFitMix} onSaveCombo={jest.fn()} />,
    );
    expect(queryByTestId('harmony-reveal')).toBeNull();
  });

  it('does NOT render on a monoculture plate (no diversity ≥3)', () => {
    const { queryByTestId } = render(
      <HarmonyReveal signal={monocultureMix} onSaveCombo={jest.fn()} />,
    );
    expect(queryByTestId('harmony-reveal')).toBeNull();
  });

  it('exposes a "Save this combo" chip that fires onSaveCombo', () => {
    const onSaveCombo = jest.fn();
    const { getByTestId } = render(
      <HarmonyReveal signal={fourSlotMix} onSaveCombo={onSaveCombo} />,
    );
    fireEvent.press(getByTestId('harmony-save-chip'));
    expect(onSaveCombo).toHaveBeenCalledTimes(1);
  });

  it('renders a Sazon line celebrating the plate', () => {
    const { getAllByText } = render(
      <HarmonyReveal signal={fourSlotMix} onSaveCombo={jest.fn()} />,
    );
    // The line should reference balance / harmony / beautiful — invitational, not numeric
    expect(getAllByText(/beautiful|harmony|balance/i).length).toBeGreaterThan(0);
  });

  it('exposes a11y role + label', () => {
    const { getByTestId } = render(
      <HarmonyReveal signal={fourSlotMix} onSaveCombo={jest.fn()} />,
    );
    const reveal = getByTestId('harmony-reveal');
    expect(reveal.props.accessibilityRole).toBe('summary');
    expect(reveal.props.accessibilityLabel).toMatch(/(beautiful|harmony|balance)/i);
  });
});
