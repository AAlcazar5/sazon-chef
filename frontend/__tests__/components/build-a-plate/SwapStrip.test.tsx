// frontend/__tests__/components/build-a-plate/SwapStrip.test.tsx
// Group 10X Phase 2 — SwapStrip component tests.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import SwapStrip from '../../../components/build-a-plate/SwapStrip';
import type { MealComponent } from '../../../lib/api';
import * as Haptics from 'expo-haptics';

const makeComponent = (overrides: Partial<MealComponent>): MealComponent => ({
  id: 'c1',
  slot: 'base',
  name: 'Farro',
  defaultPortionGrams: 100,
  caloriesPerPortion: 200,
  proteinG: 7,
  carbsG: 35,
  fatG: 1,
  fiberG: 5,
  cuisineTags: [],
  dietaryTags: ['vegan'],
  cookMethodHint: 'simmer',
  pantryIngredientNames: ['farro'],
  pantryCoveragePercent: 100,
  ...overrides,
});

const BROWN_RICE = makeComponent({ id: 'brown-rice', name: 'Brown Rice', pantryCoveragePercent: 90, caloriesPerPortion: 212, proteinG: 5 });
const QUINOA = makeComponent({ id: 'quinoa', name: 'Quinoa', pantryCoveragePercent: 70, caloriesPerPortion: 222, proteinG: 8 });
const COUSCOUS = makeComponent({ id: 'couscous', name: 'Couscous', pantryCoveragePercent: 50, caloriesPerPortion: 176, proteinG: 6 });
const BULGUR = makeComponent({ id: 'bulgur', name: 'Bulgur', pantryCoveragePercent: 40, caloriesPerPortion: 151, proteinG: 6 });

const CURRENT = makeComponent({ id: 'farro', name: 'Farro', pantryCoveragePercent: 100, caloriesPerPortion: 200, proteinG: 7 });

describe('SwapStrip', () => {
  it('renders top 3 alternatives sorted by pantry coverage descending', () => {
    const { getByTestId, queryByTestId } = render(
      <SwapStrip
        alternatives={[COUSCOUS, BULGUR, BROWN_RICE, QUINOA]}
        current={CURRENT}
        onSwap={jest.fn()}
        testID="swap-strip"
      />,
    );

    expect(getByTestId('swap-chip-brown-rice')).toBeTruthy();
    expect(getByTestId('swap-chip-quinoa')).toBeTruthy();
    expect(getByTestId('swap-chip-couscous')).toBeTruthy();
    expect(queryByTestId('swap-chip-bulgur')).toBeNull();
  });

  it('tap triggers onSwap with the componentId and fires light haptic', async () => {
    const onSwap = jest.fn();
    const { getByTestId } = render(
      <SwapStrip
        alternatives={[BROWN_RICE, QUINOA, COUSCOUS]}
        current={CURRENT}
        onSwap={onSwap}
        testID="swap-strip"
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('swap-chip-brown-rice'));
    });

    expect(onSwap).toHaveBeenCalledWith('brown-rice');
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it('long-press shows macro delta tooltip with cal and protein delta', async () => {
    const { getByTestId } = render(
      <SwapStrip
        alternatives={[BROWN_RICE, QUINOA, COUSCOUS]}
        current={CURRENT}
        onSwap={jest.fn()}
        testID="swap-strip"
      />,
    );

    await act(async () => {
      fireEvent(getByTestId('swap-chip-brown-rice'), 'longPress');
    });

    await waitFor(() => {
      expect(getByTestId('macro-delta-tooltip')).toBeTruthy();
    });

    const tooltip = getByTestId('macro-delta-tooltip');
    expect(tooltip).toBeTruthy();
  });

  it('macro delta tooltip shows correct cal delta', async () => {
    const { getByTestId, getByText } = render(
      <SwapStrip
        alternatives={[BROWN_RICE, QUINOA, COUSCOUS]}
        current={CURRENT}
        onSwap={jest.fn()}
        testID="swap-strip"
      />,
    );

    await act(async () => {
      fireEvent(getByTestId('swap-chip-brown-rice'), 'longPress');
    });

    await waitFor(() => {
      expect(getByTestId('macro-delta-tooltip')).toBeTruthy();
    });

    // Brown Rice: 212 cal, 5g protein. Farro: 200 cal, 7g protein. Delta: +12 cal, -2g protein
    expect(getByText(/\+12 cal/)).toBeTruthy();
    expect(getByText(/–2g protein/)).toBeTruthy();
  });

  it('renders nothing when alternatives list is empty', () => {
    const { queryByTestId } = render(
      <SwapStrip
        alternatives={[]}
        current={CURRENT}
        onSwap={jest.fn()}
        testID="swap-strip"
      />,
    );

    expect(queryByTestId('swap-strip')).toBeNull();
  });
});
