// frontend/__tests__/components/today/SazonQuipCard.test.tsx
// ROADMAP 4.0 Tier J7 — Sazon daily quip (TDD).

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

const mockTodayQuip = jest.fn();
jest.mock('../../../lib/api', () => ({
  quipsApi: { today: (...args: unknown[]) => mockTodayQuip(...args) },
}));

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import SazonQuipCard from '../../../components/today/SazonQuipCard';

const proverbQuip = {
  id: 'p001',
  text: 'In Italy, the cook who waits has the best dough.',
  category: 'proverb' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<SazonQuipCard />', () => {
  it('renders nothing while loading', () => {
    mockTodayQuip.mockReturnValueOnce(new Promise(() => undefined));
    const { queryByTestId } = render(<SazonQuipCard />);
    expect(queryByTestId('sazon-quip-card')).toBeNull();
  });

  it('renders the quip after the API responds', async () => {
    mockTodayQuip.mockResolvedValueOnce({ data: { quip: proverbQuip } });
    const { findByText } = render(<SazonQuipCard />);
    expect(await findByText(proverbQuip.text)).toBeTruthy();
  });

  it('renders the category eyebrow', async () => {
    mockTodayQuip.mockResolvedValueOnce({ data: { quip: proverbQuip } });
    const { findByText } = render(<SazonQuipCard />);
    expect(await findByText(/PROVERB/i)).toBeTruthy();
  });

  it('exposes accessibilityRole="summary" + label that includes the quip text', async () => {
    mockTodayQuip.mockResolvedValueOnce({ data: { quip: proverbQuip } });
    const { findByTestId } = render(<SazonQuipCard />);
    const card = await findByTestId('sazon-quip-card');
    expect(card.props.accessibilityRole).toBe('summary');
    expect(card.props.accessibilityLabel).toContain('best dough');
  });

  it('hides silently when the API errors', async () => {
    mockTodayQuip.mockRejectedValueOnce(new Error('boom'));
    const { queryByTestId } = render(<SazonQuipCard />);
    await waitFor(() => {
      expect(queryByTestId('sazon-quip-card')).toBeNull();
    });
  });

  it('fires onPress when tapped (saves to journal — deferred)', async () => {
    mockTodayQuip.mockResolvedValueOnce({ data: { quip: proverbQuip } });
    const onPress = jest.fn();
    const { findByTestId } = render(<SazonQuipCard onPress={onPress} />);
    const card = await findByTestId('sazon-quip-card');
    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledWith(proverbQuip);
  });
});
