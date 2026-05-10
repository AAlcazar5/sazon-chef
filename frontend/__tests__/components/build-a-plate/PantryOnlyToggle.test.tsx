// frontend/__tests__/components/build-a-plate/PantryOnlyToggle.test.tsx
// Group 10X — clearer ON/OFF affordance for "Cook with what I have."

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, colors: { background: '#FAF7F4' } }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PantryOnlyToggle from '../../../components/build-a-plate/PantryOnlyToggle';

describe('<PantryOnlyToggle />', () => {
  it('renders the locked label "Cook with what I have"', () => {
    const { getByText } = render(<PantryOnlyToggle active={false} onToggle={jest.fn()} />);
    expect(getByText(/Cook with what I have/i)).toBeTruthy();
  });

  it('swaps the icon variant between off and on states', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <PantryOnlyToggle active={false} onToggle={jest.fn()} testID="pantry-toggle" />,
    );
    expect(getByTestId('pantry-toggle-icon-off')).toBeTruthy();
    expect(queryByTestId('pantry-toggle-icon-on')).toBeNull();

    rerender(<PantryOnlyToggle active={true} onToggle={jest.fn()} testID="pantry-toggle" />);
    expect(getByTestId('pantry-toggle-icon-on')).toBeTruthy();
    expect(queryByTestId('pantry-toggle-icon-off')).toBeNull();
  });

  it('renders a checkmark badge only when active', () => {
    const { queryByTestId, rerender } = render(
      <PantryOnlyToggle active={false} onToggle={jest.fn()} testID="pantry-toggle" />,
    );
    expect(queryByTestId('pantry-toggle-check')).toBeNull();

    rerender(<PantryOnlyToggle active={true} onToggle={jest.fn()} testID="pantry-toggle" />);
    expect(queryByTestId('pantry-toggle-check')).toBeTruthy();
  });

  it('exposes the on/off state to assistive tech', () => {
    const { getByTestId, rerender } = render(
      <PantryOnlyToggle active={false} onToggle={jest.fn()} testID="pantry-toggle" />,
    );
    expect(getByTestId('pantry-toggle').props.accessibilityState).toEqual({ selected: false });
    expect(getByTestId('pantry-toggle').props.accessibilityLabel).toMatch(/off/i);

    rerender(<PantryOnlyToggle active={true} onToggle={jest.fn()} testID="pantry-toggle" />);
    expect(getByTestId('pantry-toggle').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('pantry-toggle').props.accessibilityLabel).toMatch(/on/i);
  });

  it('fires onToggle on press', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <PantryOnlyToggle active={false} onToggle={onToggle} testID="pantry-toggle" />,
    );
    fireEvent.press(getByTestId('pantry-toggle'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
