// frontend/__tests__/components/build-a-plate/PlatePreview.test.tsx
// Group 10X Phase 1 — plate preview component tests.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, colors: {} }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import PlatePreview from '../../../components/build-a-plate/PlatePreview';

const baseTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  cost: 0,
  pantryCoveragePercent: 0,
};

describe('PlatePreview', () => {
  it('renders concentric ring container', () => {
    const { getByTestId } = render(
      <PlatePreview totals={baseTotals} slotsFilled={{}} testID="preview" />,
    );
    expect(getByTestId('plate-preview-rings')).toBeTruthy();
  });

  it('renders all four macro pills', () => {
    const { getByTestId } = render(
      <PlatePreview totals={baseTotals} slotsFilled={{}} testID="preview" />,
    );
    expect(getByTestId('macro-pill-protein')).toBeTruthy();
    expect(getByTestId('macro-pill-carbs')).toBeTruthy();
    expect(getByTestId('macro-pill-fat')).toBeTruthy();
    expect(getByTestId('macro-pill-calories')).toBeTruthy();
  });

  it('reflects updated macro values when totals change', () => {
    const { getByLabelText, rerender } = render(
      <PlatePreview totals={baseTotals} slotsFilled={{}} testID="preview" />,
    );
    expect(getByLabelText('P 0 g')).toBeTruthy();

    rerender(
      <PlatePreview
        totals={{ calories: 420, protein: 35, carbs: 40, fat: 18, fiber: 6, cost: 0, pantryCoveragePercent: 75 }}
        slotsFilled={{ protein: true, base: true }}
        testID="preview"
      />,
    );
    expect(getByLabelText('P 35 g')).toBeTruthy();
    expect(getByLabelText('Cal 420')).toBeTruthy();
  });

  it('renders pantry coverage ring with percentage', () => {
    const { getByTestId, getByText } = render(
      <PlatePreview
        totals={{ ...baseTotals, pantryCoveragePercent: 60 }}
        slotsFilled={{ protein: true }}
        testID="preview"
      />,
    );
    expect(getByTestId('pantry-coverage-ring')).toBeTruthy();
    expect(getByText('60%')).toBeTruthy();
  });
});
