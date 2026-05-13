// P4 retention — cook-pattern card smoke + match-day rendering.

const mockCookPattern = jest.fn();
jest.mock('../../../lib/api/today', () => ({
  todayApi: { cookPattern: (...args: unknown[]) => mockCookPattern(...args) },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return TouchableOpacity;
});

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import CookPatternCard from '../../../components/today/CookPatternCard';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<CookPatternCard />', () => {
  it('renders when today matches the user\'s dominant cook day', async () => {
    mockCookPattern.mockResolvedValue({
      data: { matchesToday: true, dayName: 'Tuesday', totalCooks: 18 },
    });
    const { findByTestId } = render(<CookPatternCard />);
    const card = await findByTestId('cook-pattern-card');
    expect(card.props.accessibilityLabel).toContain('Tuesday');
  });

  it('renders nothing when today does NOT match the pattern', async () => {
    mockCookPattern.mockResolvedValue({
      data: { matchesToday: false, dayName: 'Tuesday', totalCooks: 18 },
    });
    const { queryByTestId } = render(<CookPatternCard />);
    await waitFor(() => expect(mockCookPattern).toHaveBeenCalled());
    expect(queryByTestId('cook-pattern-card')).toBeNull();
  });

  it('renders nothing when no pattern was detected', async () => {
    mockCookPattern.mockResolvedValue({
      data: { matchesToday: false, dayName: null, totalCooks: 2 },
    });
    const { queryByTestId } = render(<CookPatternCard />);
    await waitFor(() => expect(mockCookPattern).toHaveBeenCalled());
    expect(queryByTestId('cook-pattern-card')).toBeNull();
  });

  it('renders nothing when the API errors', async () => {
    mockCookPattern.mockRejectedValue(new Error('network'));
    const { queryByTestId } = render(<CookPatternCard />);
    await waitFor(() => expect(mockCookPattern).toHaveBeenCalled());
    expect(queryByTestId('cook-pattern-card')).toBeNull();
  });

  it('fires onPress when tapped', async () => {
    mockCookPattern.mockResolvedValue({
      data: { matchesToday: true, dayName: 'Wednesday', totalCooks: 22 },
    });
    const onPress = jest.fn();
    const { findByTestId } = render(<CookPatternCard onPress={onPress} />);
    const card = await findByTestId('cook-pattern-card');
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalled();
  });
});
