// frontend/__tests__/components/meal-plan/PantryInlineStrip.expiry.test.tsx
// ROADMAP 4.0 Tier J12 — Pantry-care framing (TDD).

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    isDark: false,
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PantryInlineStrip from '../../../components/meal-plan/PantryInlineStrip';

describe('<PantryInlineStrip /> — J12 expiry care framing', () => {
  it('renders the original "X expiring" copy when no soonestExpiringName provided', () => {
    const { getByText, queryByTestId } = render(
      <PantryInlineStrip
        itemCount={5}
        expiringSoonCount={2}
        onPress={jest.fn()}
      />,
    );
    expect(getByText(/2 expiring/)).toBeTruthy();
    expect(queryByTestId('pantry-care-cta')).toBeNull();
  });

  it('renders care-toned invitation copy when soonestExpiringName is provided', () => {
    const { getByText, queryByText } = render(
      <PantryInlineStrip
        itemCount={5}
        expiringSoonCount={2}
        soonestExpiringName="cilantro"
        onPress={jest.fn()}
        onUseExpiring={jest.fn()}
      />,
    );
    // J12 invitation copy mentions the ingredient name and is care-toned
    expect(getByText(/cilantro/i)).toBeTruthy();
    expect(getByText(/wants to be in something/i)).toBeTruthy();
    // No "expiring soon" verdict-tone copy when in care mode
    expect(queryByText(/expiring/i)).toBeNull();
  });

  it('exposes a "show me a recipe" CTA when in care mode', () => {
    const onUseExpiring = jest.fn();
    const { getByTestId } = render(
      <PantryInlineStrip
        itemCount={5}
        expiringSoonCount={2}
        soonestExpiringName="cilantro"
        onPress={jest.fn()}
        onUseExpiring={onUseExpiring}
      />,
    );
    fireEvent.press(getByTestId('pantry-care-cta'));
    expect(onUseExpiring).toHaveBeenCalledWith('cilantro');
  });

  it('falls back to the original copy when soonestExpiringName is empty', () => {
    const { getByText } = render(
      <PantryInlineStrip
        itemCount={5}
        expiringSoonCount={2}
        soonestExpiringName=""
        onPress={jest.fn()}
      />,
    );
    expect(getByText(/2 expiring/)).toBeTruthy();
  });

  it('does not render the care CTA when expiringSoonCount=0 even if name provided', () => {
    const { queryByTestId } = render(
      <PantryInlineStrip
        itemCount={5}
        expiringSoonCount={0}
        soonestExpiringName="cilantro"
        onPress={jest.fn()}
        onUseExpiring={jest.fn()}
      />,
    );
    expect(queryByTestId('pantry-care-cta')).toBeNull();
  });

  it('care-mode a11y label uses the invitation phrasing', () => {
    const { getByTestId } = render(
      <PantryInlineStrip
        itemCount={5}
        expiringSoonCount={2}
        soonestExpiringName="cilantro"
        onPress={jest.fn()}
        onUseExpiring={jest.fn()}
      />,
    );
    const strip = getByTestId('pantry-inline-strip');
    expect(strip.props.accessibilityLabel).toMatch(/cilantro/i);
    expect(strip.props.accessibilityLabel).not.toMatch(/expiring/i);
  });
});
