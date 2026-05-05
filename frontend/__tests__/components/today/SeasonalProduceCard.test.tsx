// frontend/__tests__/components/today/SeasonalProduceCard.test.tsx
// ROADMAP 4.0 F6 — Seasonal awareness Today card.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import SeasonalProduceCard from '../../../components/today/SeasonalProduceCard';

describe('<SeasonalProduceCard />', () => {
  it('renders the card with an in-season eyebrow', () => {
    const { getByText } = render(
      <SeasonalProduceCard asOfDate={new Date(2026, 6, 4, 12, 0, 0)} />,
    );
    expect(getByText('IN SEASON')).toBeTruthy();
  });

  it('renders the day-1 July pick (tomatoes)', () => {
    const { getByText } = render(
      <SeasonalProduceCard asOfDate={new Date(2026, 6, 1, 12, 0, 0)} />,
    );
    expect(getByText('tomatoes')).toBeTruthy();
    expect(getByText(/eat them raw/i)).toBeTruthy();
  });

  it('rotates day-by-day inside the same month', () => {
    const day1 = render(
      <SeasonalProduceCard asOfDate={new Date(2026, 6, 1, 12, 0, 0)} />,
    );
    const day2 = render(
      <SeasonalProduceCard asOfDate={new Date(2026, 6, 2, 12, 0, 0)} />,
    );
    const name1 = day1.getByTestId('seasonal-produce-name').children[0];
    const name2 = day2.getByTestId('seasonal-produce-name').children[0];
    expect(name1).not.toBe(name2);
  });

  it('exposes the in-season ingredient via accessibilityLabel', () => {
    const { getByLabelText } = render(
      <SeasonalProduceCard asOfDate={new Date(2026, 6, 1, 12, 0, 0)} />,
    );
    expect(getByLabelText(/In season: tomatoes/i)).toBeTruthy();
  });
});
