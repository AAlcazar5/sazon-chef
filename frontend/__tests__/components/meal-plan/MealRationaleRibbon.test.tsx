// frontend/__tests__/components/meal-plan/MealRationaleRibbon.test.tsx
// ROADMAP 4.0 WK8.1 — MealRationaleRibbon test.

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  createAnimatedComponent: (component: any) => component,
  useReducedMotion: () => false,
}));

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import MealRationaleRibbon from '../../../components/meal-plan/MealRationaleRibbon';

describe('MealRationaleRibbon (WK8.1)', () => {
  it('renders the rationale line', () => {
    const { getByText } = renderWithProviders(
      <MealRationaleRibbon rationale="uses Sunday's chili · Mediterranean vibe" />,
    );
    expect(getByText("uses Sunday's chili · Mediterranean vibe")).toBeTruthy();
  });

  it('returns null when rationale is empty', () => {
    const { queryByTestId } = renderWithProviders(
      <MealRationaleRibbon rationale="" />,
    );
    expect(queryByTestId('meal-rationale-ribbon')).toBeNull();
  });

  it('tap expands the rationale block', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <MealRationaleRibbon rationale="leans into magnesium" />,
    );
    expect(queryByTestId('meal-rationale-expanded')).toBeNull();
    fireEvent.press(getByTestId('meal-rationale-ribbon'));
    expect(getByTestId('meal-rationale-expanded')).toBeTruthy();
  });

  it('expanded block shows the longer-form copy when provided', () => {
    const { getByTestId, getByText } = renderWithProviders(
      <MealRationaleRibbon
        rationale="leans into magnesium"
        expanded="This week leans into magnesium — pumpkin seeds, dark chocolate, leafy greens."
      />,
    );
    fireEvent.press(getByTestId('meal-rationale-ribbon'));
    expect(getByText(/pumpkin seeds, dark chocolate/)).toBeTruthy();
  });

  it('falls back to the short rationale when no expanded form is provided', () => {
    const { getByTestId, getAllByText } = renderWithProviders(
      <MealRationaleRibbon rationale="leans into magnesium" />,
    );
    fireEvent.press(getByTestId('meal-rationale-ribbon'));
    expect(getAllByText('leans into magnesium').length).toBeGreaterThanOrEqual(2);
  });

  it('a11y — has button role + descriptive label', () => {
    const { getByTestId } = renderWithProviders(
      <MealRationaleRibbon rationale="uses Sunday's chili" />,
    );
    const ribbon = getByTestId('meal-rationale-ribbon');
    expect(ribbon.props.accessibilityRole).toBe('button');
    expect(ribbon.props.accessibilityLabel).toContain("uses Sunday's chili");
  });

  it('uses italic styling on the rationale line', () => {
    const { getByText } = renderWithProviders(
      <MealRationaleRibbon rationale="leans into iron" />,
    );
    const line = getByText('leans into iron');
    const flat = Array.isArray(line.props.style)
      ? Object.assign({}, ...line.props.style.filter(Boolean))
      : line.props.style;
    expect(flat.fontStyle).toBe('italic');
  });

  it('respects dark mode (renders without crashing in dark context)', () => {
    const { getByTestId } = renderWithProviders(
      <MealRationaleRibbon rationale="uses Sunday's chili" />,
    );
    expect(getByTestId('meal-rationale-ribbon')).toBeTruthy();
  });
});
