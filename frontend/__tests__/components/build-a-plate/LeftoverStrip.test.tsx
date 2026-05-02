// frontend/__tests__/components/build-a-plate/LeftoverStrip.test.tsx
// Group 10X Phase 6 — "From last night" sage strip in slot picker.

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
import { render, fireEvent, act } from '@testing-library/react-native';
import LeftoverStrip from '../../../components/build-a-plate/LeftoverStrip';
import type { LeftoverInventoryItem } from '../../../components/build-a-plate/LeftoverStrip';

const SALMON_LEFTOVER: LeftoverInventoryItem = {
  id: 'l1',
  componentId: 'salmon',
  slot: 'protein',
  name: 'Pan-seared Salmon',
  portionsRemaining: 1,
};

const FARRO_LEFTOVER: LeftoverInventoryItem = {
  id: 'l2',
  componentId: 'farro',
  slot: 'base',
  name: 'Cooked Farro',
  portionsRemaining: 2,
};

describe('LeftoverStrip', () => {
  it('renders nothing when leftovers list is empty', () => {
    const { queryByTestId } = render(
      <LeftoverStrip
        leftovers={[]}
        onSelect={jest.fn()}
        testID="leftover-strip"
      />,
    );
    expect(queryByTestId('leftover-strip')).toBeNull();
  });

  it('renders sage-tinted card with "From last night" eyebrow when leftovers > 0', () => {
    const { getByTestId, getByText } = render(
      <LeftoverStrip
        leftovers={[SALMON_LEFTOVER]}
        onSelect={jest.fn()}
        testID="leftover-strip"
      />,
    );
    expect(getByTestId('leftover-strip')).toBeTruthy();
    expect(getByText(/From last night/i)).toBeTruthy();
    expect(getByTestId('leftover-card-l1')).toBeTruthy();
  });

  it('renders one card per leftover', () => {
    const { getByTestId } = render(
      <LeftoverStrip
        leftovers={[SALMON_LEFTOVER, FARRO_LEFTOVER]}
        onSelect={jest.fn()}
        testID="leftover-strip"
      />,
    );
    expect(getByTestId('leftover-card-l1')).toBeTruthy();
    expect(getByTestId('leftover-card-l2')).toBeTruthy();
  });

  it('calls onSelect with leftover when card is tapped', async () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <LeftoverStrip
        leftovers={[SALMON_LEFTOVER]}
        onSelect={onSelect}
        testID="leftover-strip"
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('leftover-card-l1'));
    });

    expect(onSelect).toHaveBeenCalledWith(SALMON_LEFTOVER);
  });
});
