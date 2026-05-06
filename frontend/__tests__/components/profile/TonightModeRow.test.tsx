// frontend/__tests__/components/profile/TonightModeRow.test.tsx
// ROADMAP 4.0 T3.1 — profile sheet "Tonight mode" toggle row.

jest.mock('../../../global.css', () => ({}));

const mockPut = jest.fn();
jest.mock('../../../lib/api', () => ({
  apiClient: { put: (...args: any[]) => mockPut(...args) },
}));

const asyncStore: Record<string, string | null> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) => Promise.resolve(asyncStore[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      asyncStore[k] = v;
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      delete asyncStore[k];
      return Promise.resolve();
    }),
  },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return ({ children, ...props }: any) => (
    <TouchableOpacity {...props}>{children}</TouchableOpacity>
  );
});

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TonightModeRow from '../../../components/profile/TonightModeRow';

describe('<TonightModeRow />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
  });

  it('renders nothing when env flag is off', () => {
    const { queryByText } = render(<TonightModeRow flagOn={false} initialEnabled={false} />);
    expect(queryByText(/Tonight mode/i)).toBeNull();
  });

  it('renders the row + descriptor when flag is on', () => {
    const { getByText } = render(<TonightModeRow flagOn={true} initialEnabled={false} />);
    expect(getByText(/Tonight mode/i)).toBeTruthy();
    expect(getByText(/Sazon picks dinner/i)).toBeTruthy();
  });

  it('toggle calls PUT /api/user/tonight-mode and updates pref optimistically', async () => {
    mockPut.mockResolvedValue({ data: { tonightModeEnabled: true } });
    const { getByTestId } = render(<TonightModeRow flagOn={true} initialEnabled={false} />);
    fireEvent.press(getByTestId('tonight-mode-toggle'));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith('/user/tonight-mode', { enabled: true });
    });
    await waitFor(() => {
      expect(asyncStore['tonight_mode_pref_enabled']).toBe('1');
    });
  });

  it('rolls back optimistic update on API failure', async () => {
    mockPut.mockRejectedValueOnce(new Error('network'));
    const { getByTestId, queryByText } = render(
      <TonightModeRow flagOn={true} initialEnabled={false} />
    );
    fireEvent.press(getByTestId('tonight-mode-toggle'));
    await waitFor(() => {
      // After rollback the AsyncStorage key should not be set to '1'.
      expect(asyncStore['tonight_mode_pref_enabled']).not.toBe('1');
    });
    // No banned vocab in error display.
    expect(queryByText(/error/i)).toBeNull();
    expect(queryByText(/failed/i)).toBeNull();
  });
});
