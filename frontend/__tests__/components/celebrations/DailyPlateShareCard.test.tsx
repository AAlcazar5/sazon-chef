// frontend/__tests__/components/celebrations/DailyPlateShareCard.test.tsx
// ROADMAP 4.0 Tier J15 — Share-able discovery rings card (TDD).
// Sourced from .context/decisions/accepted/P-003-share-able-discovery-rings.md.

const mockShareAsync = jest.fn();
const mockIsAvailableAsync = jest.fn().mockResolvedValue(true);
jest.mock('expo-sharing', () => ({
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
  isAvailableAsync: () => mockIsAvailableAsync(),
}));

const mockCapture = jest.fn().mockResolvedValue('file:///tmp/daily-plate.png');
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
import DailyPlateShareCard from '../../../components/celebrations/DailyPlateShareCard';

const samplePlate = {
  ingredientCount: 18,
  topMinerals: ['magnesium', 'iron', 'zinc'],
  dishNames: ['Khoresh Fesenjan', 'Shirazi Salad'],
  userFirstName: 'Alex',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockShareAsync.mockReset().mockResolvedValue(undefined);
  mockIsAvailableAsync.mockReset().mockResolvedValue(true);
  mockCapture.mockReset().mockResolvedValue('file:///tmp/daily-plate.png');
});

describe('<DailyPlateShareCard />', () => {
  it('renders rings + ingredient count + top mineral + dish names + Sazon mascot signature', () => {
    const { getByTestId, getByText } = render(
      <DailyPlateShareCard
        ingredientCount={samplePlate.ingredientCount}
        topMinerals={samplePlate.topMinerals}
        dishNames={samplePlate.dishNames}
      />,
    );

    expect(getByTestId('daily-plate-share-card')).toBeTruthy();
    expect(getByTestId('daily-plate-share-card-rings')).toBeTruthy();
    expect(getByText(/18/)).toBeTruthy();
    expect(getByText(/magnesium/i)).toBeTruthy();
    expect(getByText(/Khoresh Fesenjan/i)).toBeTruthy();
    expect(getByText(/Sazon/i)).toBeTruthy();
  });

  it('is anonymous-by-default — does not render the user first name', () => {
    const { queryByText } = render(
      <DailyPlateShareCard
        ingredientCount={samplePlate.ingredientCount}
        topMinerals={samplePlate.topMinerals}
        dishNames={samplePlate.dishNames}
        userFirstName={samplePlate.userFirstName}
      />,
    );
    expect(queryByText(/Alex/)).toBeNull();
  });

  it('shows the user first name when the identity toggle is flipped on', () => {
    const { getByTestId, getByText, queryByText } = render(
      <DailyPlateShareCard
        ingredientCount={samplePlate.ingredientCount}
        topMinerals={samplePlate.topMinerals}
        dishNames={samplePlate.dishNames}
        userFirstName={samplePlate.userFirstName}
      />,
    );
    expect(queryByText(/Alex/)).toBeNull();

    fireEvent.press(getByTestId('daily-plate-share-card-identity-toggle'));
    expect(getByText(/Alex/)).toBeTruthy();
  });

  it('captures the card and calls Sharing.shareAsync with the image URI when Share is tapped', async () => {
    const { getByTestId } = render(
      <DailyPlateShareCard
        ingredientCount={samplePlate.ingredientCount}
        topMinerals={samplePlate.topMinerals}
        dishNames={samplePlate.dishNames}
      />,
    );

    fireEvent.press(getByTestId('daily-plate-share-card-share'));

    await waitFor(() => {
      expect(mockCapture).toHaveBeenCalledTimes(1);
      expect(mockShareAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///tmp/daily-plate.png',
      expect.objectContaining({ mimeType: 'image/png' }),
    );
  });

  it('exposes an accessibility label that describes the breadth', () => {
    const { getByTestId } = render(
      <DailyPlateShareCard
        ingredientCount={samplePlate.ingredientCount}
        topMinerals={samplePlate.topMinerals}
        dishNames={samplePlate.dishNames}
      />,
    );
    const card = getByTestId('daily-plate-share-card');
    expect(card.props.accessibilityRole).toBe('summary');
    expect(card.props.accessibilityLabel).toMatch(/18/);
    expect(card.props.accessibilityLabel).toMatch(/magnesium/i);
    expect(card.props.accessibilityLabel).toMatch(/today/i);
  });

  it('regression — share copy contains no banned vocabulary from brand-voice.md', () => {
    const { getByTestId } = render(
      <DailyPlateShareCard
        ingredientCount={samplePlate.ingredientCount}
        topMinerals={samplePlate.topMinerals}
        dishNames={samplePlate.dishNames}
      />,
    );
    const card = getByTestId('daily-plate-share-card');
    const banned = ['track', 'goal', 'macro', 'cut', 'bulk', 'maintain', 'crush', 'optimize'];

    const collectText = (node: { props?: Record<string, unknown>; children?: unknown }): string => {
      const a11y = node.props?.accessibilityLabel;
      const accumulator: string[] = [];
      if (typeof a11y === 'string') accumulator.push(a11y);
      const visit = (val: unknown): void => {
        if (val == null) return;
        if (typeof val === 'string' || typeof val === 'number') {
          accumulator.push(String(val));
          return;
        }
        if (Array.isArray(val)) {
          val.forEach(visit);
          return;
        }
        if (typeof val === 'object') {
          const obj = val as { children?: unknown; props?: Record<string, unknown> };
          if (obj.props) visit(obj.props.children);
          if (obj.children) visit(obj.children);
        }
      };
      visit(node);
      return accumulator.join(' ').toLowerCase();
    };

    const allText = collectText(card);
    for (const word of banned) {
      expect(allText).not.toContain(word);
    }
  });

  it('renders nothing when there are no dishes (empty cook day)', () => {
    const { queryByTestId } = render(
      <DailyPlateShareCard
        ingredientCount={0}
        topMinerals={[]}
        dishNames={[]}
      />,
    );
    expect(queryByTestId('daily-plate-share-card')).toBeNull();
  });

  it('handles a single mineral (no comma list) without breaking', () => {
    const { getByText } = render(
      <DailyPlateShareCard
        ingredientCount={6}
        topMinerals={['iron']}
        dishNames={['Lentil Stew']}
      />,
    );
    expect(getByText(/iron/i)).toBeTruthy();
  });
});
