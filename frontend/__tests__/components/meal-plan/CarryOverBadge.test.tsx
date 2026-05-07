// frontend/__tests__/components/meal-plan/CarryOverBadge.test.tsx
// ROADMAP 4.0 WK2.2 — CarryOverBadge tests (TDD).

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  createAnimatedComponent: (component: any) => component,
  useReducedMotion: () => false,
}));

jest.mock('moti', () => {
  const { View } = require('react-native');
  return { MotiView: ({ children, ...rest }: any) => <View {...rest}>{children}</View> };
});

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import CarryOverBadge from '../../../components/meal-plan/CarryOverBadge';

const baseChain = {
  recipeName: "Sunday's chili",
  cookOnDay: '2026-05-10',
  eatOnDays: ['2026-05-11', '2026-05-12'],
};

describe('CarryOverBadge (WK2.2)', () => {
  it('renders the badge on the cook day', () => {
    const { getByTestId } = renderWithProviders(
      <CarryOverBadge chain={baseChain} role="cook" />,
    );
    expect(getByTestId('carry-over-badge')).toBeTruthy();
  });

  it('renders the badge on a leftover day', () => {
    const { getByTestId } = renderWithProviders(
      <CarryOverBadge chain={baseChain} role="leftover" />,
    );
    expect(getByTestId('carry-over-badge')).toBeTruthy();
  });

  it('lifestyle copy on cook day mentions double-duty / cook-once-eat-twice', () => {
    const { getByTestId } = renderWithProviders(
      <CarryOverBadge chain={baseChain} role="cook" />,
    );
    const label = getByTestId('carry-over-badge').props.accessibilityLabel ?? '';
    expect(/(double-duty|cook once|eat twice|carries over)/i.test(label)).toBe(true);
  });

  it('lifestyle copy on leftover day references the source cook day', () => {
    const { getByText } = renderWithProviders(
      <CarryOverBadge chain={baseChain} role="leftover" />,
    );
    expect(getByText(/Sunday's chili/i)).toBeTruthy();
  });

  it('does not use banned vocabulary (no "leftover" as user-facing word, no "warning")', () => {
    const { getByTestId } = renderWithProviders(
      <CarryOverBadge chain={baseChain} role="cook" />,
    );
    const label = getByTestId('carry-over-badge').props.accessibilityLabel ?? '';
    // "Leftover" is fine internally but the user-facing voice should lean on "pulls double-duty"
    // or "cook once, eat twice" — verify the label is not generic/clinical.
    expect(/under your goal|target|warning|error/i.test(label)).toBe(false);
  });

  it('tap opens the chain detail (expanded view)', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <CarryOverBadge chain={baseChain} role="cook" />,
    );
    expect(queryByTestId('carry-over-chain-detail')).toBeNull();
    fireEvent.press(getByTestId('carry-over-badge'));
    expect(getByTestId('carry-over-chain-detail')).toBeTruthy();
  });

  it('chain detail lists the cook day + each eat day', () => {
    const { getByTestId, getAllByTestId } = renderWithProviders(
      <CarryOverBadge chain={baseChain} role="cook" />,
    );
    fireEvent.press(getByTestId('carry-over-badge'));
    const dayRows = getAllByTestId(/^carry-over-day-/);
    expect(dayRows.length).toBe(3); // 1 cook + 2 eat
  });

  it('uncouple button fires onUncouple with the day being uncoupled', () => {
    const onUncouple = jest.fn();
    const { getByTestId } = renderWithProviders(
      <CarryOverBadge
        chain={baseChain}
        role="leftover"
        currentDay="2026-05-11"
        onUncouple={onUncouple}
      />,
    );
    fireEvent.press(getByTestId('carry-over-badge'));
    fireEvent.press(getByTestId('carry-over-uncouple'));
    expect(onUncouple).toHaveBeenCalledWith('2026-05-11');
  });

  it('omits uncouple button when onUncouple is not provided', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <CarryOverBadge chain={baseChain} role="leftover" />,
    );
    fireEvent.press(getByTestId('carry-over-badge'));
    expect(queryByTestId('carry-over-uncouple')).toBeNull();
  });

  it('a11y — badge has accessibilityRole=button + label', () => {
    const { getByTestId } = renderWithProviders(
      <CarryOverBadge chain={baseChain} role="cook" />,
    );
    const badge = getByTestId('carry-over-badge');
    expect(badge.props.accessibilityRole).toBe('button');
    expect(typeof badge.props.accessibilityLabel).toBe('string');
    expect((badge.props.accessibilityLabel as string).length).toBeGreaterThan(0);
  });

  it('renders without crashing when eatOnDays is empty (degenerate input)', () => {
    const { getByTestId } = renderWithProviders(
      <CarryOverBadge
        chain={{ ...baseChain, eatOnDays: [] }}
        role="cook"
      />,
    );
    expect(getByTestId('carry-over-badge')).toBeTruthy();
  });
});
