// frontend/__tests__/components/recipe/SwapTracking.test.tsx
// ROADMAP 4.0 IG6.1 — swap-tap fires the ingredient-events POST.

const mockRecordSwap = jest.fn();
jest.mock('../../../lib/api', () => ({
  ingredientEventApi: {
    recordSwap: (...args: unknown[]) => mockRecordSwap(...args),
  },
  recipeApi: {
    getIngredientSwaps: jest.fn().mockResolvedValue({ data: { swaps: [] } }),
  },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../../components/ui/AnimatedActivityIndicator', () => () => null);
jest.mock('../../../components/ui/BottomSheet', () => ({ children, visible }: any) =>
  visible ? <>{children}</> : null,
);
jest.mock('moti', () => ({ MotiView: ({ children }: any) => <>{children}</> }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success' },
}));

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import IngredientSwapSheet from '../../../components/recipe/IngredientSwapSheet';

beforeEach(() => {
  mockRecordSwap.mockReset();
  mockRecordSwap.mockResolvedValue({ data: { persisted: 2 } });
});

const setupWithSwaps = (swaps: any[]) => {
  const api = require('../../../lib/api');
  api.recipeApi.getIngredientSwaps = jest
    .fn()
    .mockResolvedValue({ data: { swaps } });
};

describe('IngredientSwapSheet swap-tracking (IG6.1)', () => {
  it('tapping a swap fires recordSwap with originalName + swapTargetName', async () => {
    setupWithSwaps([
      {
        alternative: 'lentils',
        macroDelta: {},
        flavorNote: 'Hearty plant protein',
      },
    ]);
    const onSelectSwap = jest.fn();
    const { findByLabelText } = renderWithProviders(
      <IngredientSwapSheet
        visible={true}
        ingredient="chickpeas"
        isDark={false}
        onClose={jest.fn()}
        onSelectSwap={onSelectSwap}
        recipeId="r-stew"
      />,
    );
    const swapButton = await findByLabelText('Swap with lentils');
    fireEvent.press(swapButton);
    await waitFor(() => {
      expect(mockRecordSwap).toHaveBeenCalledWith({
        originalName: 'chickpeas',
        swapTargetName: 'lentils',
        recipeId: 'r-stew',
      });
    });
    // The original handler still fires
    expect(onSelectSwap).toHaveBeenCalledTimes(1);
    expect(onSelectSwap.mock.calls[0][0].alternative).toBe('lentils');
  });

  it('does not throw if recordSwap rejects (best-effort telemetry)', async () => {
    mockRecordSwap.mockRejectedValueOnce(new Error('network down'));
    setupWithSwaps([
      {
        alternative: 'lentils',
        macroDelta: {},
        flavorNote: 'Hearty',
      },
    ]);
    const onSelectSwap = jest.fn();
    const { findByLabelText } = renderWithProviders(
      <IngredientSwapSheet
        visible={true}
        ingredient="chickpeas"
        isDark={false}
        onClose={jest.fn()}
        onSelectSwap={onSelectSwap}
      />,
    );
    const swapButton = await findByLabelText('Swap with lentils');
    expect(() => fireEvent.press(swapButton)).not.toThrow();
    // Original handler still fires
    expect(onSelectSwap).toHaveBeenCalledTimes(1);
  });

  it('does not fetch swaps when ingredient is empty (so swap list never renders → no recordSwap fires)', async () => {
    setupWithSwaps([
      {
        alternative: 'lentils',
        macroDelta: {},
        flavorNote: 'Hearty',
      },
    ]);
    const onSelectSwap = jest.fn();
    const { queryByLabelText } = renderWithProviders(
      <IngredientSwapSheet
        visible={true}
        ingredient=""
        isDark={false}
        onClose={jest.fn()}
        onSelectSwap={onSelectSwap}
      />,
    );
    // No swap rows, no recordSwap call.
    expect(queryByLabelText('Swap with lentils')).toBeNull();
    expect(mockRecordSwap).not.toHaveBeenCalled();
  });

  it('omits recipeId when not provided', async () => {
    setupWithSwaps([
      {
        alternative: 'lentils',
        macroDelta: {},
        flavorNote: 'Hearty',
      },
    ]);
    const { findByLabelText } = renderWithProviders(
      <IngredientSwapSheet
        visible={true}
        ingredient="chickpeas"
        isDark={false}
        onClose={jest.fn()}
        onSelectSwap={jest.fn()}
      />,
    );
    const swapButton = await findByLabelText('Swap with lentils');
    fireEvent.press(swapButton);
    await waitFor(() => expect(mockRecordSwap).toHaveBeenCalled());
    const args = mockRecordSwap.mock.calls[0][0];
    expect(args.recipeId).toBeUndefined();
  });
});
