// frontend/__tests__/components/build-a-plate/NutrientBadge.test.tsx
// Group 10X Phase 9 — Sage badge ("⚡ +8g fiber") on components that fill the user's top nutrient gap.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import NutrientBadge from '../../../components/build-a-plate/NutrientBadge';

describe('NutrientBadge', () => {
  it('renders nothing when no top gap is provided', () => {
    const { queryByTestId } = render(
      <NutrientBadge
        topGap={null}
        amountForGap={5}
        testID="nutrient-badge"
      />,
    );
    expect(queryByTestId('nutrient-badge')).toBeNull();
  });

  it('renders nothing when amountForGap is 0', () => {
    const { queryByTestId } = render(
      <NutrientBadge
        topGap="fiberG"
        amountForGap={0}
        testID="nutrient-badge"
      />,
    );
    expect(queryByTestId('nutrient-badge')).toBeNull();
  });

  it('renders fiber badge when component fills fiber gap', () => {
    const { getByTestId, getByText } = render(
      <NutrientBadge
        topGap="fiberG"
        amountForGap={8}
        testID="nutrient-badge"
      />,
    );
    expect(getByTestId('nutrient-badge')).toBeTruthy();
    expect(getByText(/\+8g fiber/i)).toBeTruthy();
  });

  it('renders iron badge when topGap is ironMg', () => {
    const { getByText } = render(
      <NutrientBadge
        topGap="ironMg"
        amountForGap={4}
        testID="nutrient-badge"
      />,
    );
    expect(getByText(/\+4mg iron/i)).toBeTruthy();
  });

  it('renders omega-3 badge with correct unit', () => {
    const { getByText } = render(
      <NutrientBadge
        topGap="omega3G"
        amountForGap={1}
        testID="nutrient-badge"
      />,
    );
    expect(getByText(/\+1g omega-3/i)).toBeTruthy();
  });
});
