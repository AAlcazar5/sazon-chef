// frontend/__tests__/components/recipe/BeveragePairingSlot.test.tsx
// ROADMAP 4.0 Tier J17.3 — Beverage pairing slot (TDD).

const mockHaptic = jest.fn();

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
  impactAsync: (...args: unknown[]) => mockHaptic(...args),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BeveragePairingSlot from '../../../components/recipe/BeveragePairingSlot';

beforeEach(() => {
  mockHaptic.mockReset();
});

describe('<BeveragePairingSlot />', () => {
  it('renders one chip per pairing', () => {
    const { getByText } = render(
      <BeveragePairingSlot
        cuisine="japanese"
        pairings={['green tea', 'genmaicha']}
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('green tea')).toBeTruthy();
    expect(getByText('genmaicha')).toBeTruthy();
  });

  it('renders nothing when the pairings array is empty', () => {
    const { queryByTestId } = render(
      <BeveragePairingSlot cuisine="japanese" pairings={[]} onSelect={jest.fn()} />,
    );
    expect(queryByTestId('beverage-pairing-slot')).toBeNull();
  });

  it('fires onSelect with the tapped pairing', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <BeveragePairingSlot
        cuisine="japanese"
        pairings={['green tea', 'genmaicha']}
        onSelect={onSelect}
      />,
    );
    fireEvent.press(getByText('genmaicha'));
    expect(onSelect).toHaveBeenCalledWith('genmaicha');
  });

  it('fires haptic feedback on selection', () => {
    const { getByText } = render(
      <BeveragePairingSlot
        cuisine="japanese"
        pairings={['green tea', 'genmaicha']}
        onSelect={jest.fn()}
      />,
    );
    fireEvent.press(getByText('green tea'));
    expect(mockHaptic).toHaveBeenCalled();
  });
});
