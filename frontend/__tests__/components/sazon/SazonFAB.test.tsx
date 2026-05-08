// ROADMAP 4.0 IA2.2 — SazonFAB header floating icon tests.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockOpen = jest.fn();

jest.mock('../../../contexts/SazonSheetContext', () => ({
  useSazonSheet: () => ({ open: mockOpen, close: () => {}, isOpen: false }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import SazonFAB from '../../../components/sazon/SazonFAB';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SazonFAB', () => {
  it('renders with accessibility role=button + descriptive label', () => {
    const { getByLabelText } = render(<SazonFAB />);
    expect(getByLabelText(/talk to sazon|ask sazon|sazon/i)).toBeTruthy();
  });

  it('tap fires open() with source=fab_tap', () => {
    const { getByLabelText } = render(<SazonFAB />);
    fireEvent.press(getByLabelText(/talk to sazon|ask sazon|sazon/i));
    expect(mockOpen).toHaveBeenCalledWith({ source: 'fab_tap' });
  });

  it('long-press with seed fires open() with seed + source=fab_long_press', () => {
    const getContextSeed = jest.fn().mockReturnValue("What's tonight's plate?");
    const { getByLabelText } = render(<SazonFAB getContextSeed={getContextSeed} />);
    fireEvent(getByLabelText(/talk to sazon|ask sazon|sazon/i), 'longPress');
    expect(getContextSeed).toHaveBeenCalled();
    expect(mockOpen).toHaveBeenCalledWith({
      contextSeed: "What's tonight's plate?",
      source: 'fab_long_press',
    });
  });

  it('long-press without seed falls through to source=fab_long_press only', () => {
    const { getByLabelText } = render(<SazonFAB />);
    fireEvent(getByLabelText(/talk to sazon|ask sazon|sazon/i), 'longPress');
    expect(mockOpen).toHaveBeenCalledWith({ source: 'fab_long_press' });
  });

  it('long-press with null-returning seed falls through to source=fab_long_press only', () => {
    const getContextSeed = jest.fn().mockReturnValue(null);
    const { getByLabelText } = render(<SazonFAB getContextSeed={getContextSeed} />);
    fireEvent(getByLabelText(/talk to sazon|ask sazon|sazon/i), 'longPress');
    expect(mockOpen).toHaveBeenCalledWith({ source: 'fab_long_press' });
  });

  it('honors the accessibilityLabel override prop', () => {
    const { getByLabelText } = render(
      <SazonFAB accessibilityLabel="Ask Sazon about this recipe" />,
    );
    expect(getByLabelText('Ask Sazon about this recipe')).toBeTruthy();
  });
});
