// frontend/__tests__/components/meal-plan/PlanIQCard.test.tsx
// ROADMAP 4.0 WK14.1 — PlanIQCard test.

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  createAnimatedComponent: (component: any) => component,
  useReducedMotion: () => false,
}));

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import PlanIQCard from '../../../components/meal-plan/PlanIQCard';

const baseSummary = {
  cuisineLean: 'Mediterranean (3 cuisines)',
  topNutrient: 'magnesium-rich',
  pantryReuseRatio: 0.67,
  carryOverCount: 2,
  rhythmTagline: 'a strong rhythm',
};

describe('PlanIQCard (WK14.1)', () => {
  it('renders all 4 stat rows when summary is provided', () => {
    const { getByTestId } = renderWithProviders(
      <PlanIQCard summary={baseSummary} />,
    );
    expect(getByTestId('plan-iq-card')).toBeTruthy();
    expect(getByTestId('plan-iq-stat-cuisine')).toBeTruthy();
    expect(getByTestId('plan-iq-stat-nutrient')).toBeTruthy();
    expect(getByTestId('plan-iq-stat-pantry')).toBeTruthy();
    expect(getByTestId('plan-iq-stat-carryover')).toBeTruthy();
  });

  it('hides the card on cold-start (summary undefined)', () => {
    const { queryByTestId } = renderWithProviders(
      <PlanIQCard summary={undefined} />,
    );
    expect(queryByTestId('plan-iq-card')).toBeNull();
  });

  it('renders cuisine lean copy', () => {
    const { getByText } = renderWithProviders(
      <PlanIQCard summary={baseSummary} />,
    );
    expect(getByText('Mediterranean (3 cuisines)')).toBeTruthy();
  });

  it('renders top nutrient copy', () => {
    const { getByText } = renderWithProviders(
      <PlanIQCard summary={baseSummary} />,
    );
    expect(getByText('magnesium-rich')).toBeTruthy();
  });

  it('renders pantry reuse as a rounded percentage', () => {
    const { getByText } = renderWithProviders(
      <PlanIQCard summary={baseSummary} />,
    );
    expect(getByText('67%')).toBeTruthy();
  });

  it('renders carry-over plays count', () => {
    const { getByText } = renderWithProviders(
      <PlanIQCard summary={baseSummary} />,
    );
    expect(getByText('2')).toBeTruthy();
  });

  it('renders the rhythm tagline (lifestyle voice)', () => {
    const { getByText } = renderWithProviders(
      <PlanIQCard summary={baseSummary} />,
    );
    expect(getByText('a strong rhythm')).toBeTruthy();
  });

  it('lifestyle voice — uses "strong rhythm" not "you achieved 67%"', () => {
    const { queryByText } = renderWithProviders(
      <PlanIQCard summary={baseSummary} />,
    );
    expect(queryByText(/you achieved/i)).toBeNull();
    expect(queryByText(/under your goal/i)).toBeNull();
    expect(queryByText(/over your goal/i)).toBeNull();
  });

  it('share button renders when onShare is provided + tap fires the handler', () => {
    const onShare = jest.fn();
    const { getByTestId } = renderWithProviders(
      <PlanIQCard summary={baseSummary} onShare={onShare} />,
    );
    fireEvent.press(getByTestId('plan-iq-share'));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('share button is hidden when onShare is not provided', () => {
    const { queryByTestId } = renderWithProviders(
      <PlanIQCard summary={baseSummary} />,
    );
    expect(queryByTestId('plan-iq-share')).toBeNull();
  });

  it('share button has accessible role + label', () => {
    const onShare = jest.fn();
    const { getByTestId } = renderWithProviders(
      <PlanIQCard summary={baseSummary} onShare={onShare} />,
    );
    const btn = getByTestId('plan-iq-share');
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityLabel).toContain('Plan IQ');
  });

  it('rounds pantry-reuse percentage correctly (0.673 → 67%)', () => {
    const { getByText } = renderWithProviders(
      <PlanIQCard summary={{ ...baseSummary, pantryReuseRatio: 0.673 }} />,
    );
    expect(getByText('67%')).toBeTruthy();
  });

  it('handles 0% pantry reuse gracefully', () => {
    const { getByText } = renderWithProviders(
      <PlanIQCard summary={{ ...baseSummary, pantryReuseRatio: 0 }} />,
    );
    expect(getByText('0%')).toBeTruthy();
  });
});
