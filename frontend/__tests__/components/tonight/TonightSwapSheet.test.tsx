// frontend/__tests__/components/tonight/TonightSwapSheet.test.tsx
// ROADMAP 4.0 T2.2 — bottom sheet that surfaces 3 alternatives.

jest.mock('../../../global.css', () => ({}));

const mockHapticTrigger = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: mockHapticTrigger,
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return ({ children, onPress, ...props }: any) => (
    <TouchableOpacity
      {...props}
      onPress={() => {
        const haptics = require('expo-haptics');
        haptics.impactAsync && haptics.impactAsync('light');
        onPress && onPress();
      }}
    >
      {children}
    </TouchableOpacity>
  );
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TonightSwapSheet from '../../../components/tonight/TonightSwapSheet';

const fixtures = [
  { id: 'r1', title: 'Carbonara', cuisine: 'italian', cookTime: 20, imageUrl: 'a.png' },
  { id: 'r2', title: 'Bibimbap', cuisine: 'korean', cookTime: 25, imageUrl: 'b.png' },
  { id: 'r3', title: 'Tagine', cuisine: 'moroccan', cookTime: 35, imageUrl: 'c.png' },
];

describe('<TonightSwapSheet />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders 3 alternative cards', () => {
    const { getByText } = render(
      <TonightSwapSheet
        visible={true}
        alternatives={fixtures as any}
        onSwap={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(getByText('Carbonara')).toBeTruthy();
    expect(getByText('Bibimbap')).toBeTruthy();
    expect(getByText('Tagine')).toBeTruthy();
  });

  it('tap on a card fires onSwap with the recipe id', () => {
    const onSwap = jest.fn();
    const { getByTestId } = render(
      <TonightSwapSheet
        visible={true}
        alternatives={fixtures as any}
        onSwap={onSwap}
        onDismiss={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('tonight-swap-card-r2'));
    expect(onSwap).toHaveBeenCalledWith('r2');
  });

  it('tap fires haptic feedback', () => {
    const { getByTestId } = render(
      <TonightSwapSheet
        visible={true}
        alternatives={fixtures as any}
        onSwap={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('tonight-swap-card-r1'));
    expect(mockHapticTrigger).toHaveBeenCalled();
  });

  it('backdrop press dismisses', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <TonightSwapSheet
        visible={true}
        alternatives={fixtures as any}
        onSwap={jest.fn()}
        onDismiss={onDismiss}
      />
    );
    fireEvent.press(getByTestId('tonight-swap-backdrop'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders accessibility labels for every alternative', () => {
    const { getByLabelText } = render(
      <TonightSwapSheet
        visible={true}
        alternatives={fixtures as any}
        onSwap={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(getByLabelText(/Swap to Carbonara/i)).toBeTruthy();
    expect(getByLabelText(/Swap to Bibimbap/i)).toBeTruthy();
    expect(getByLabelText(/Swap to Tagine/i)).toBeTruthy();
  });

  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <TonightSwapSheet
        visible={false}
        alternatives={fixtures as any}
        onSwap={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(queryByText('Carbonara')).toBeNull();
  });
});
