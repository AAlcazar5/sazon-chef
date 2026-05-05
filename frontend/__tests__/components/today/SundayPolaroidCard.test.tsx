// frontend/__tests__/components/today/SundayPolaroidCard.test.tsx
// ROADMAP 4.0 Tier J4 — Sunday Polaroid drop (TDD).

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

const mockShareAsync = jest.fn();
const mockIsAvailableAsync = jest.fn().mockResolvedValue(true);
jest.mock('expo-sharing', () => ({
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
  isAvailableAsync: () => mockIsAvailableAsync(),
}));

const mockCapture = jest.fn().mockResolvedValue('file:///tmp/polaroid.png');
jest.mock('react-native-view-shot', () => ({
  captureRef: (...args: unknown[]) => mockCapture(...args),
}));

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
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SundayPolaroidCard from '../../../components/today/SundayPolaroidCard';

const sundayRecap = {
  topCuisine: 'Persian',
  topMineral: 'magnesium',
  discovery: 'You tried sumac for the first time.',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockShareAsync.mockReset();
});

describe('<SundayPolaroidCard />', () => {
  it('renders nothing when today is not Sunday', () => {
    const monday = new Date('2026-05-04T12:00:00Z'); // Monday
    mockGetItem.mockResolvedValueOnce(null);
    const { queryByTestId } = render(
      <SundayPolaroidCard recap={sundayRecap} now={monday} />,
    );
    expect(queryByTestId('sunday-polaroid-card')).toBeNull();
  });

  it('renders the Polaroid on Sunday', async () => {
    const sunday = new Date('2026-05-03T10:00:00Z'); // Sunday
    mockGetItem.mockResolvedValueOnce(null);
    const { findByTestId, getByText } = render(
      <SundayPolaroidCard recap={sundayRecap} now={sunday} />,
    );
    expect(await findByTestId('sunday-polaroid-card')).toBeTruthy();
    expect(getByText(/Persian/)).toBeTruthy();
    expect(getByText(/magnesium/i)).toBeTruthy();
  });

  it('hides when storage records dismissed-this-week', async () => {
    const sunday = new Date('2026-05-03T10:00:00Z');
    mockGetItem.mockResolvedValueOnce('2026-05-03'); // ISO Sunday already dismissed
    const { queryByTestId } = render(
      <SundayPolaroidCard recap={sundayRecap} now={sunday} />,
    );
    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalled();
    });
    expect(queryByTestId('sunday-polaroid-card')).toBeNull();
  });

  it('share button captures + invokes Sharing.shareAsync', async () => {
    const sunday = new Date('2026-05-03T10:00:00Z');
    mockGetItem.mockResolvedValueOnce(null);
    const { findByTestId } = render(
      <SundayPolaroidCard recap={sundayRecap} now={sunday} />,
    );
    const shareBtn = await findByTestId('sunday-polaroid-share');
    fireEvent.press(shareBtn);
    await waitFor(() => {
      expect(mockCapture).toHaveBeenCalled();
      expect(mockShareAsync).toHaveBeenCalledWith(
        'file:///tmp/polaroid.png',
        expect.any(Object),
      );
    });
  });

  it('dismiss button records this Sunday and hides the card', async () => {
    const sunday = new Date('2026-05-03T10:00:00Z');
    mockGetItem.mockResolvedValueOnce(null);
    const { findByTestId, queryByTestId } = render(
      <SundayPolaroidCard recap={sundayRecap} now={sunday} />,
    );
    const dismissBtn = await findByTestId('sunday-polaroid-dismiss');
    fireEvent.press(dismissBtn);
    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalled();
    });
    const [, value] = mockSetItem.mock.calls[0];
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await waitFor(() => {
      expect(queryByTestId('sunday-polaroid-card')).toBeNull();
    });
  });

  it('exposes accessibilityRole + label on the card', async () => {
    const sunday = new Date('2026-05-03T10:00:00Z');
    mockGetItem.mockResolvedValueOnce(null);
    const { findByTestId } = render(
      <SundayPolaroidCard recap={sundayRecap} now={sunday} />,
    );
    const card = await findByTestId('sunday-polaroid-card');
    expect(card.props.accessibilityRole).toBe('summary');
    expect(card.props.accessibilityLabel).toMatch(/Persian/);
  });
});
