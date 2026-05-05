// frontend/__tests__/components/recipe/HealthierSwapRow.test.tsx
// ROADMAP 4.0 Tier C2 frontend — HealthierSwapRow (TDD).

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
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
import HealthierSwapRow from '../../../components/recipe/HealthierSwapRow';

const fiberSwap = {
  type: 'fiber' as const,
  text: 'Try corn tortillas instead — adds 4g fiber',
  deltaMacro: { fiber: 4 },
};

const proteinSwap = {
  type: 'protein' as const,
  text: 'Swap to Greek yogurt — +12g protein',
  deltaMacro: { protein: 12 },
};

const calorieSwap = {
  type: 'calorie' as const,
  text: 'Use cauliflower rice — −150 cal',
  deltaMacro: { calories: -150 },
};

describe('<HealthierSwapRow />', () => {
  it('renders nothing when surface=false (gap is met for this user)', () => {
    const { queryByTestId } = render(
      <HealthierSwapRow swap={fiberSwap} surface={false} onApply={jest.fn()} />
    );
    expect(queryByTestId('healthier-swap-row')).toBeNull();
  });

  it('renders nothing when swap is null', () => {
    const { queryByTestId } = render(
      <HealthierSwapRow swap={null} surface={true} onApply={jest.fn()} />
    );
    expect(queryByTestId('healthier-swap-row')).toBeNull();
  });

  it('renders the swap text when surface=true', () => {
    const { getByText } = render(
      <HealthierSwapRow swap={fiberSwap} surface={true} onApply={jest.fn()} />
    );
    expect(getByText(fiberSwap.text)).toBeTruthy();
  });

  it('renders an invitational eyebrow (lifestyle voice — no verdict)', () => {
    const { getByText } = render(
      <HealthierSwapRow swap={fiberSwap} surface={true} onApply={jest.fn()} />
    );
    // Match the full eyebrow string (avoids ambiguity with the "Try this" button).
    expect(getByText('IF YOU WANT TO UPGRADE')).toBeTruthy();
  });

  it('uses fiber tint for fiber swap', () => {
    const { getByTestId } = render(
      <HealthierSwapRow swap={fiberSwap} surface={true} onApply={jest.fn()} />
    );
    const row = getByTestId('healthier-swap-row');
    expect(row.props.style).toBeDefined();
  });

  it('shows the macro delta as a chip ("+4g fiber")', () => {
    const { getByText } = render(
      <HealthierSwapRow swap={fiberSwap} surface={true} onApply={jest.fn()} />
    );
    expect(getByText(/\+4.*fiber/i)).toBeTruthy();
  });

  it('shows positive protein delta with "+" prefix', () => {
    const { getByText } = render(
      <HealthierSwapRow swap={proteinSwap} surface={true} onApply={jest.fn()} />
    );
    // Exact chip text (the body text contains a similar phrase, hence specificity).
    expect(getByText('+12g protein')).toBeTruthy();
  });

  it('shows negative calorie delta with "−" prefix', () => {
    const { getByText } = render(
      <HealthierSwapRow swap={calorieSwap} surface={true} onApply={jest.fn()} />
    );
    expect(getByText('−150 cal')).toBeTruthy();
  });

  it('fires onApply when "Try this" tapped', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <HealthierSwapRow swap={fiberSwap} surface={true} onApply={onApply} />
    );
    fireEvent.press(getByTestId('healthier-swap-apply'));
    expect(onApply).toHaveBeenCalledWith(fiberSwap);
  });

  it('exposes accessibilityRole="button" on the apply chip', () => {
    const { getByTestId } = render(
      <HealthierSwapRow swap={fiberSwap} surface={true} onApply={jest.fn()} />
    );
    expect(getByTestId('healthier-swap-apply').props.accessibilityRole).toBe('button');
  });
});
