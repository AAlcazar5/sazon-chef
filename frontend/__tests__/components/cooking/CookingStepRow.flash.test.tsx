// frontend/__tests__/components/cooking/CookingStepRow.flash.test.tsx
// ROADMAP 4.0 Tier J10 — Cooking-step sage flash (TDD).

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

const mockImpactAsync = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => false,
  };
});

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import CookingStepRow from '../../../components/cooking/CookingStepRow';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<CookingStepRow />', () => {
  it('renders the step number + text', () => {
    const { getByText } = render(
      <CookingStepRow stepNumber={1} text="Heat the oil over medium." onToggle={jest.fn()} />,
    );
    expect(getByText('Heat the oil over medium.')).toBeTruthy();
  });

  it('fires onToggle on press', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <CookingStepRow stepNumber={1} text="Heat the oil over medium." onToggle={onToggle} />,
    );
    fireEvent.press(getByTestId('cooking-step-row-1'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('fires haptic medium when transitioning to complete', () => {
    const { getByTestId, rerender } = render(
      <CookingStepRow stepNumber={1} text="step" onToggle={jest.fn()} completed={false} />,
    );
    fireEvent.press(getByTestId('cooking-step-row-1'));
    rerender(<CookingStepRow stepNumber={1} text="step" onToggle={jest.fn()} completed={true} />);
    expect(mockImpactAsync).toHaveBeenCalledWith('Medium');
  });

  it('does NOT re-fire haptic when row is tapped while already complete', () => {
    const { getByTestId } = render(
      <CookingStepRow stepNumber={1} text="step" onToggle={jest.fn()} completed={true} />,
    );
    act(() => {
      // mounting in completed state must not fire haptic
    });
    expect(mockImpactAsync).not.toHaveBeenCalled();
    fireEvent.press(getByTestId('cooking-step-row-1'));
    // after press handled by parent (unchanged props here) — still no extra haptic
    expect(mockImpactAsync).not.toHaveBeenCalled();
  });

  it('renders a checkmark when completed', () => {
    const { getByTestId } = render(
      <CookingStepRow stepNumber={1} text="step" onToggle={jest.fn()} completed={true} />,
    );
    expect(getByTestId('cooking-step-row-1-check')).toBeTruthy();
  });

  it('does NOT render a checkmark when incomplete', () => {
    const { queryByTestId } = render(
      <CookingStepRow stepNumber={1} text="step" onToggle={jest.fn()} completed={false} />,
    );
    expect(queryByTestId('cooking-step-row-1-check')).toBeNull();
  });

  it('exposes accessibilityRole + label', () => {
    const { getByTestId } = render(
      <CookingStepRow stepNumber={3} text="Stir gently." onToggle={jest.fn()} completed={false} />,
    );
    const row = getByTestId('cooking-step-row-3');
    expect(row.props.accessibilityRole).toBe('checkbox');
    expect(row.props.accessibilityState).toEqual(expect.objectContaining({ checked: false }));
    expect(row.props.accessibilityLabel).toMatch(/step 3/i);
  });
});
