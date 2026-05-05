// frontend/__tests__/components/celebrations/FirstCuisineStamp.test.tsx
// ROADMAP 4.0 Tier J2 — First-cook-of-cuisine passport stamp (TDD).

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

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  return {
    ...Reanimated,
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => false,
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FirstCuisineStamp from '../../../components/celebrations/FirstCuisineStamp';

describe('<FirstCuisineStamp />', () => {
  it('renders nothing when isFirstCook is false', () => {
    const { queryByTestId } = render(
      <FirstCuisineStamp
        isFirstCook={false}
        cuisine="Persian"
        cuisinesCookedCount={3}
        totalCuisinesAvailable={134}
        onPress={jest.fn()}
      />,
    );
    expect(queryByTestId('first-cuisine-stamp')).toBeNull();
  });

  it('renders the cuisine title and "first" copy when isFirstCook is true', () => {
    const { getByTestId, getByText, getAllByText } = render(
      <FirstCuisineStamp
        isFirstCook
        cuisine="Persian"
        cuisinesCookedCount={1}
        totalCuisinesAvailable={134}
        onPress={jest.fn()}
      />,
    );
    expect(getByTestId('first-cuisine-stamp')).toBeTruthy();
    expect(getByText(/Persian/i)).toBeTruthy();
    expect(getAllByText(/first/i).length).toBeGreaterThan(0);
  });

  it('shows the running cuisine fraction (N / total)', () => {
    const { getByText } = render(
      <FirstCuisineStamp
        isFirstCook
        cuisine="Persian"
        cuisinesCookedCount={5}
        totalCuisinesAvailable={134}
        onPress={jest.fn()}
      />,
    );
    expect(getByText(/5/)).toBeTruthy();
    expect(getByText(/134/)).toBeTruthy();
  });

  it('fires onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <FirstCuisineStamp
        isFirstCook
        cuisine="Persian"
        cuisinesCookedCount={1}
        totalCuisinesAvailable={134}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByTestId('first-cuisine-stamp'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes accessibilityRole + label', () => {
    const { getByTestId } = render(
      <FirstCuisineStamp
        isFirstCook
        cuisine="Persian"
        cuisinesCookedCount={1}
        totalCuisinesAvailable={134}
        onPress={jest.fn()}
      />,
    );
    const stamp = getByTestId('first-cuisine-stamp');
    expect(stamp.props.accessibilityRole).toBe('button');
    expect(stamp.props.accessibilityLabel).toMatch(/Persian/i);
    expect(stamp.props.accessibilityLabel).toMatch(/first/i);
  });

  it('handles missing cuisine gracefully (renders null)', () => {
    const { queryByTestId } = render(
      <FirstCuisineStamp
        isFirstCook
        cuisine=""
        cuisinesCookedCount={1}
        totalCuisinesAvailable={134}
        onPress={jest.fn()}
      />,
    );
    expect(queryByTestId('first-cuisine-stamp')).toBeNull();
  });
});
