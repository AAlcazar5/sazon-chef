// frontend/__tests__/components/build-a-plate/SubstitutionBanner.test.tsx
// Group 10X Phase 8 — Substitution banner when a shared plate has missing pantry items.

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
import SubstitutionBanner from '../../../components/build-a-plate/SubstitutionBanner';

describe('SubstitutionBanner', () => {
  it('renders nothing when substitutionsCount is 0', () => {
    const { queryByTestId } = render(
      <SubstitutionBanner
        substitutionsCount={0}
        onShowOriginal={jest.fn()}
        testID="sub-banner"
      />,
    );
    expect(queryByTestId('sub-banner')).toBeNull();
  });

  it('renders sage banner when substitutionsCount > 0', () => {
    const { getByTestId, getByText } = render(
      <SubstitutionBanner
        substitutionsCount={2}
        onShowOriginal={jest.fn()}
        testID="sub-banner"
      />,
    );
    expect(getByTestId('sub-banner')).toBeTruthy();
    expect(getByText(/Missing 2 from your pantry/i)).toBeTruthy();
  });

  it('renders singular copy for one substitution', () => {
    const { getByText } = render(
      <SubstitutionBanner
        substitutionsCount={1}
        onShowOriginal={jest.fn()}
        testID="sub-banner"
      />,
    );
    expect(getByText(/Missing 1 from your pantry/i)).toBeTruthy();
  });

  it('calls onShowOriginal when "Show original" is tapped', async () => {
    const onShow = jest.fn();
    const { getByTestId } = render(
      <SubstitutionBanner
        substitutionsCount={2}
        onShowOriginal={onShow}
        testID="sub-banner"
      />,
    );

    await act(async () => {
      fireEvent.press(getByTestId('sub-banner-show-original'));
    });

    expect(onShow).toHaveBeenCalled();
  });
});
