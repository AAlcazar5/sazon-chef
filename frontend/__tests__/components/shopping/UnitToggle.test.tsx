// frontend/__tests__/components/shopping/UnitToggle.test.tsx
// TDD: Task 4 — imperial ↔ metric toggle (display-only)

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// Mock AsyncStorage — use jest.mock with require() to avoid hoisting issues
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// Access mock after module mock is registered
import AsyncStorage from '@react-native-async-storage/async-storage';
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHapticTouchableOpacity(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

import UnitToggle from '../../../components/shopping/UnitToggle';

describe('UnitToggle', () => {
  const onToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null); // default: imperial
  });

  it('renders with imperial label by default', async () => {
    const { getByText } = render(<UnitToggle onToggle={onToggle} />);
    await waitFor(() => {
      expect(getByText('oz / cups')).toBeTruthy();
    });
  });

  it('switches to metric when tapped', async () => {
    const { getByText, queryByText } = render(<UnitToggle onToggle={onToggle} />);
    await waitFor(() => expect(getByText('oz / cups')).toBeTruthy());
    fireEvent.press(getByText('oz / cups'));
    await waitFor(() => {
      expect(getByText('ml / g')).toBeTruthy();
    });
  });

  it('switches back to imperial when tapped again', async () => {
    const { getByText } = render(<UnitToggle onToggle={onToggle} />);
    await waitFor(() => expect(getByText('oz / cups')).toBeTruthy());
    fireEvent.press(getByText('oz / cups'));
    await waitFor(() => expect(getByText('ml / g')).toBeTruthy());
    fireEvent.press(getByText('ml / g'));
    await waitFor(() => expect(getByText('oz / cups')).toBeTruthy());
  });

  it('calls onToggle with new system when toggled', async () => {
    const { getByText } = render(<UnitToggle onToggle={onToggle} />);
    await waitFor(() => expect(getByText('oz / cups')).toBeTruthy());
    fireEvent.press(getByText('oz / cups'));
    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith('metric');
    });
  });

  it('persists preference to AsyncStorage on toggle', async () => {
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    const { getByText } = render(<UnitToggle onToggle={onToggle} />);
    await waitFor(() => expect(getByText('oz / cups')).toBeTruthy());
    fireEvent.press(getByText('oz / cups'));
    await waitFor(() => {
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'shoppingList.unitSystem',
        'metric'
      );
    });
  });

  it('restores persisted metric preference on remount', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('metric');
    const { getByText } = render(<UnitToggle onToggle={onToggle} />);
    await waitFor(() => {
      expect(getByText('ml / g')).toBeTruthy();
    });
  });

  it('has accessibilityLabel on the toggle button', async () => {
    const { getByLabelText } = render(<UnitToggle onToggle={onToggle} />);
    await waitFor(() => {
      expect(getByLabelText('Toggle unit system')).toBeTruthy();
    });
  });
});
