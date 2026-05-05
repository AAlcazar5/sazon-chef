// frontend/__tests__/components/cooking/PostCookRating.bloom.test.tsx
// ROADMAP 4.0 Tier J9 — 5-star bloom (TDD).

const mockNotificationAsync = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: (...args: unknown[]) => mockNotificationAsync(...args),
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
import PostCookRating from '../../../components/cooking/PostCookRating';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<PostCookRating /> — 5-star bloom (J9)', () => {
  it('renders 5 tappable stars', () => {
    const { getByTestId } = render(<PostCookRating onSubmit={jest.fn()} />);
    expect(getByTestId('post-cook-star-1')).toBeTruthy();
    expect(getByTestId('post-cook-star-2')).toBeTruthy();
    expect(getByTestId('post-cook-star-3')).toBeTruthy();
    expect(getByTestId('post-cook-star-4')).toBeTruthy();
    expect(getByTestId('post-cook-star-5')).toBeTruthy();
  });

  it('calls onSubmit with stars=4 + taste="liked" on 4-star tap (no bloom)', () => {
    const onSubmit = jest.fn();
    const { getByTestId, queryByText } = render(<PostCookRating onSubmit={onSubmit} />);
    fireEvent.press(getByTestId('post-cook-star-4'));
    expect(onSubmit).toHaveBeenCalledWith({ stars: 4, taste: 'liked' });
    // Bloom collapse copy not present
    expect(queryByText(/loved it/i)).toBeNull();
  });

  it('calls onSubmit with stars=5 + taste="loved" on 5-star tap', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(<PostCookRating onSubmit={onSubmit} />);
    fireEvent.press(getByTestId('post-cook-star-5'));
    expect(onSubmit).toHaveBeenCalledWith({ stars: 5, taste: 'loved' });
  });

  it('collapses to "Loved it" copy after 5-star tap', () => {
    const { getByTestId, getByText } = render(<PostCookRating onSubmit={jest.fn()} />);
    fireEvent.press(getByTestId('post-cook-star-5'));
    expect(getByText(/loved it/i)).toBeTruthy();
    expect(getByText(/find you more/i)).toBeTruthy();
  });

  it('does NOT collapse to "Loved it" copy on 1–4 star tap', () => {
    const { getByTestId, queryByText } = render(<PostCookRating onSubmit={jest.fn()} />);
    fireEvent.press(getByTestId('post-cook-star-3'));
    expect(queryByText(/loved it/i)).toBeNull();
  });

  it('fires haptic success ONCE on 5-star tap', () => {
    const { getByTestId } = render(<PostCookRating onSubmit={jest.fn()} />);
    fireEvent.press(getByTestId('post-cook-star-5'));
    expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockNotificationAsync).toHaveBeenCalledWith('Success');
  });

  it('does NOT fire haptic success on 1–4 star tap', () => {
    const { getByTestId } = render(<PostCookRating onSubmit={jest.fn()} />);
    fireEvent.press(getByTestId('post-cook-star-2'));
    expect(mockNotificationAsync).not.toHaveBeenCalled();
  });

  it('exposes accessibility labels per star', () => {
    const { getByTestId } = render(<PostCookRating onSubmit={jest.fn()} />);
    const star5 = getByTestId('post-cook-star-5');
    expect(star5.props.accessibilityRole).toBe('button');
    expect(star5.props.accessibilityLabel).toMatch(/5 star/i);
  });
});
