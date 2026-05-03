// Phase 6 (10Y-C): Header pill above coach messages — only renders when Pro
// has at least one memory. Pure presentation; caller decides visibility.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import CoachMemoryHeaderPill from '../../../components/coach/CoachMemoryHeaderPill';

describe('CoachMemoryHeaderPill', () => {
  it('renders pill with N notes when count > 0', () => {
    const { getByText } = render(
      <CoachMemoryHeaderPill count={3} onPress={() => {}} />,
    );
    expect(getByText(/remembers/i)).toBeTruthy();
    expect(getByText(/3 notes/i)).toBeTruthy();
  });

  it('uses singular "1 note" when count is 1', () => {
    const { getByText } = render(
      <CoachMemoryHeaderPill count={1} onPress={() => {}} />,
    );
    expect(getByText(/1 note(?!s)/i)).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <CoachMemoryHeaderPill count={5} onPress={onPress} />,
    );
    fireEvent.press(getByLabelText(/Sazon remembers/i));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('returns null when count === 0', () => {
    const { toJSON } = render(
      <CoachMemoryHeaderPill count={0} onPress={() => {}} />,
    );
    expect(toJSON()).toBeNull();
  });
});
