// frontend/__tests__/components/build-a-plate/VariantChips.test.tsx
// Group 10X Phase 6 — Variant chips ("Roasted • Steamed • Raw • Pickled") with compatibility hints.

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
import VariantChips from '../../../components/build-a-plate/VariantChips';
import type { ComponentVariant } from '../../../components/build-a-plate/VariantChips';

const ROASTED: ComponentVariant = {
  id: 'v1',
  variantKey: 'roasted',
  label: 'Roasted',
  compatibilityScore: 0.9,
};

const STEAMED: ComponentVariant = {
  id: 'v2',
  variantKey: 'steamed',
  label: 'Steamed',
  compatibilityScore: 0.7,
};

const RAW: ComponentVariant = {
  id: 'v3',
  variantKey: 'raw',
  label: 'Raw',
  compatibilityScore: 0.4,
  hint: 'Most people pair raw carrots with creamy sauces — yogurt sauce works',
};

describe('VariantChips', () => {
  it('renders nothing when variants list is empty', () => {
    const { queryByTestId } = render(
      <VariantChips
        variants={[]}
        onSelect={jest.fn()}
        testID="variant-chips"
      />,
    );
    expect(queryByTestId('variant-chips')).toBeNull();
  });

  it('renders chips in compatibility order (highest first)', () => {
    const { getAllByTestId } = render(
      <VariantChips
        variants={[RAW, ROASTED, STEAMED]}
        onSelect={jest.fn()}
        testID="variant-chips"
      />,
    );
    const chips = getAllByTestId(/variant-chip-/);
    // Sorted: roasted (0.9), steamed (0.7), raw (0.4)
    expect(chips[0].props.testID).toBe('variant-chip-roasted');
    expect(chips[1].props.testID).toBe('variant-chip-steamed');
    expect(chips[2].props.testID).toBe('variant-chip-raw');
  });

  it('pre-selects the highest-compat variant when no value provided', () => {
    const { getByTestId } = render(
      <VariantChips
        variants={[RAW, ROASTED, STEAMED]}
        onSelect={jest.fn()}
        testID="variant-chips"
      />,
    );
    const top = getByTestId('variant-chip-roasted');
    expect(top.props.accessibilityLabel).toMatch(/selected/i);
  });

  it('shows hint banner after selecting a low-compat variant', async () => {
    const { getByTestId } = render(
      <VariantChips
        variants={[ROASTED, STEAMED, RAW]}
        onSelect={jest.fn()}
        testID="variant-chips"
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('variant-chip-raw'));
    });

    await waitFor(() => {
      expect(getByTestId('variant-chips-hint')).toBeTruthy();
    });
  });

  it('calls onSelect with the chosen variant', async () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <VariantChips
        variants={[ROASTED, STEAMED, RAW]}
        onSelect={onSelect}
        testID="variant-chips"
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('variant-chip-steamed'));
    });

    expect(onSelect).toHaveBeenCalledWith(STEAMED);
  });
});
