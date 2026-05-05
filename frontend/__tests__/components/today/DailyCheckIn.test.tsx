// frontend/__tests__/components/today/DailyCheckIn.test.tsx
// ROADMAP 4.0 Tier C7 frontend — DailyCheckIn (TDD).

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

const mockUpsert = jest.fn();
jest.mock('../../../lib/api', () => ({
  dailyCheckInApi: {
    upsert: (...args: unknown[]) => mockUpsert(...args),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DailyCheckIn from '../../../components/today/DailyCheckIn';

beforeEach(() => {
  jest.clearAllMocks();
  mockUpsert.mockResolvedValue({ data: { ok: true } });
});

describe('<DailyCheckIn />', () => {
  it('renders nothing when not visible', () => {
    const { queryByTestId } = render(<DailyCheckIn visible={false} onClose={jest.fn()} />);
    expect(queryByTestId('daily-check-in')).toBeNull();
  });

  it('renders the prompt + 5 emoji hunger options when visible', () => {
    const { getByTestId } = render(<DailyCheckIn visible={true} onClose={jest.fn()} />);
    expect(getByTestId('daily-check-in')).toBeTruthy();
    for (let i = 1; i <= 5; i++) {
      expect(getByTestId(`hunger-option-${i}`)).toBeTruthy();
    }
  });

  it('renders a free-text reflection input', () => {
    const { getByTestId } = render(<DailyCheckIn visible={true} onClose={jest.fn()} />);
    expect(getByTestId('reflection-input')).toBeTruthy();
  });

  it('skip button closes without saving', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<DailyCheckIn visible={true} onClose={onClose} />);
    fireEvent.press(getByTestId('daily-check-in-skip'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('save persists hungerNow + reflection + closes', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<DailyCheckIn visible={true} onClose={onClose} />);
    fireEvent.press(getByTestId('hunger-option-3'));
    fireEvent.changeText(getByTestId('reflection-input'), 'felt great after the salmon');
    fireEvent.press(getByTestId('daily-check-in-save'));

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });
    const args = mockUpsert.mock.calls[0][0];
    expect(args.hungerNow).toBe(3);
    expect(args.reflectionText).toBe('felt great after the salmon');
    expect(typeof args.date).toBe('string');
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('save still works with reflection only (no Likert selection)', async () => {
    const { getByTestId } = render(<DailyCheckIn visible={true} onClose={jest.fn()} />);
    fireEvent.changeText(getByTestId('reflection-input'), 'felt fine');
    fireEvent.press(getByTestId('daily-check-in-save'));
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });
    const args = mockUpsert.mock.calls[0][0];
    expect(args.reflectionText).toBe('felt fine');
    expect(args.hungerNow).toBeUndefined();
  });

  it('save button still closes when API call errors (non-blocking UX)', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('network'));
    const onClose = jest.fn();
    const { getByTestId } = render(<DailyCheckIn visible={true} onClose={onClose} />);
    fireEvent.press(getByTestId('hunger-option-2'));
    fireEvent.press(getByTestId('daily-check-in-save'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('reflection input enforces a 500-char limit', () => {
    const { getByTestId } = render(<DailyCheckIn visible={true} onClose={jest.fn()} />);
    expect(getByTestId('reflection-input').props.maxLength).toBe(500);
  });
});
