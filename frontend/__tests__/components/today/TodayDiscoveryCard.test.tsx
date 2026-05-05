// frontend/__tests__/components/today/TodayDiscoveryCard.test.tsx
// ROADMAP 4.0 Tier A1-c — Today rotating discovery card (TDD).

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

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TodayDiscoveryCard from '../../../components/today/TodayDiscoveryCard';

const ingredientTip = {
  id: 'tip-turmeric',
  category: 'pairing' as const,
  title: 'Turmeric + black pepper',
  body: 'Black pepper increases curcumin absorption ~2,000×.',
};

const culturalTip = {
  id: 'tip-persian-rice',
  category: 'technique' as const,
  title: 'Why Persians fluff rice',
  body: 'Tahdig depends on a long, undisturbed final steam.',
};

describe('<TodayDiscoveryCard />', () => {
  it('renders nothing when tip is null', () => {
    const { queryByTestId } = render(<TodayDiscoveryCard tip={null} onPress={jest.fn()} />);
    expect(queryByTestId('today-discovery-card')).toBeNull();
  });

  it('renders the tip title and body when provided', () => {
    const { getByText } = render(<TodayDiscoveryCard tip={ingredientTip} onPress={jest.fn()} />);
    expect(getByText(ingredientTip.title)).toBeTruthy();
    expect(getByText(ingredientTip.body)).toBeTruthy();
  });

  it('shows category-specific eyebrow', () => {
    const { getByText: getByTextA } = render(
      <TodayDiscoveryCard tip={ingredientTip} onPress={jest.fn()} />
    );
    expect(getByTextA(/PAIRING/i)).toBeTruthy();
    const { getByText: getByTextB } = render(
      <TodayDiscoveryCard tip={culturalTip} onPress={jest.fn()} />
    );
    expect(getByTextB(/TECHNIQUE/i)).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<TodayDiscoveryCard tip={ingredientTip} onPress={onPress} />);
    fireEvent.press(getByTestId('today-discovery-card'));
    expect(onPress).toHaveBeenCalledWith(ingredientTip.id);
  });

  it('exposes accessibilityRole="button" + label', () => {
    const { getByTestId } = render(<TodayDiscoveryCard tip={ingredientTip} onPress={jest.fn()} />);
    const card = getByTestId('today-discovery-card');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toContain('Turmeric');
  });

  it('renders different tips on re-render with a new tip prop', () => {
    const onPress = jest.fn();
    const { getByText, rerender, queryByText } = render(
      <TodayDiscoveryCard tip={ingredientTip} onPress={onPress} />
    );
    expect(getByText(ingredientTip.title)).toBeTruthy();
    rerender(<TodayDiscoveryCard tip={culturalTip} onPress={onPress} />);
    expect(getByText(culturalTip.title)).toBeTruthy();
    expect(queryByText(ingredientTip.title)).toBeNull();
  });
});
