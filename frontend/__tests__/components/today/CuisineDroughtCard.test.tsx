// P1 retention — Today drought card smoke + auto-hide tests.

const mockDrought = jest.fn();
jest.mock('../../../lib/api/today', () => ({
  todayApi: { drought: (...args: unknown[]) => mockDrought(...args) },
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
import CuisineDroughtCard from '../../../components/today/CuisineDroughtCard';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<CuisineDroughtCard />', () => {
  it('renders the drought card when the API returns a cuisine', async () => {
    mockDrought.mockResolvedValue({ data: { cuisine: 'Persian', daysSince: 9 } });
    const { findByTestId } = render(<CuisineDroughtCard />);
    const card = await findByTestId('cuisine-drought-card');
    expect(card.props.accessibilityLabel).toContain('Persian');
    expect(card.props.accessibilityLabel).toContain('9 days');
  });

  it('renders nothing when the API returns null cuisine', async () => {
    mockDrought.mockResolvedValue({ data: { cuisine: null, daysSince: null } });
    const { queryByTestId } = render(<CuisineDroughtCard />);
    await waitFor(() => expect(mockDrought).toHaveBeenCalled());
    expect(queryByTestId('cuisine-drought-card')).toBeNull();
  });

  it('renders nothing when the API errors', async () => {
    mockDrought.mockRejectedValue(new Error('network'));
    const { queryByTestId } = render(<CuisineDroughtCard />);
    await waitFor(() => expect(mockDrought).toHaveBeenCalled());
    expect(queryByTestId('cuisine-drought-card')).toBeNull();
  });

  it('fires onPress with the title-cased cuisine when tapped', async () => {
    mockDrought.mockResolvedValue({ data: { cuisine: 'persian', daysSince: 9 } });
    const onPress = jest.fn();
    const { findByTestId } = render(<CuisineDroughtCard onPress={onPress} />);
    const card = await findByTestId('cuisine-drought-card');
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledWith('Persian');
  });
});
