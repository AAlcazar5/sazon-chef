// frontend/__tests__/components/kitchen/KitchenModeBar.test.tsx
// ROADMAP 4.0 Tier A3-a — KitchenModeBar (TDD).
//
// Top-of-screen 5-pill nav per `plans/ia-spec.md` Tab 3 (Saved · Collections ·
// Discover · Journey · Stories).

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import KitchenModeBar, { KITCHEN_MODES } from '../../../components/kitchen/KitchenModeBar';

describe('<KitchenModeBar />', () => {
  it('exports the 5 IA-spec modes in order', () => {
    expect(KITCHEN_MODES.map((m) => m.id)).toEqual([
      'saved',
      'collections',
      'discover',
      'journey',
      'stories',
    ]);
  });

  it('renders all 5 mode pills', () => {
    const { getByLabelText } = render(
      <KitchenModeBar activeMode="saved" onChange={() => {}} />,
    );
    expect(getByLabelText(/Saved view mode/i)).toBeTruthy();
    expect(getByLabelText(/Collections view mode/i)).toBeTruthy();
    expect(getByLabelText(/Discover view mode/i)).toBeTruthy();
    expect(getByLabelText(/Journey view mode/i)).toBeTruthy();
    expect(getByLabelText(/Stories view mode/i)).toBeTruthy();
  });

  it('marks the active mode pill via testID suffix', () => {
    const { getByTestId } = render(
      <KitchenModeBar activeMode="discover" onChange={() => {}} />,
    );
    expect(getByTestId('kitchen-mode-discover-active')).toBeTruthy();
  });

  it('non-active modes have a non-active testID', () => {
    const { getByTestId } = render(
      <KitchenModeBar activeMode="discover" onChange={() => {}} />,
    );
    expect(getByTestId('kitchen-mode-saved')).toBeTruthy();
  });

  it('fires onChange with the mode id when a pill is pressed', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <KitchenModeBar activeMode="saved" onChange={onChange} />,
    );
    fireEvent.press(getByLabelText(/Stories view mode/i));
    expect(onChange).toHaveBeenCalledWith('stories');
  });

  it('does not refire onChange when the same mode is tapped', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <KitchenModeBar activeMode="saved" onChange={onChange} />,
    );
    fireEvent.press(getByLabelText(/Saved view mode/i));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders user-facing labels', () => {
    const { getByText } = render(
      <KitchenModeBar activeMode="saved" onChange={() => {}} />,
    );
    expect(getByText('Saved')).toBeTruthy();
    expect(getByText('Collections')).toBeTruthy();
    expect(getByText('Discover')).toBeTruthy();
    expect(getByText('Journey')).toBeTruthy();
    expect(getByText('Stories')).toBeTruthy();
  });
});
