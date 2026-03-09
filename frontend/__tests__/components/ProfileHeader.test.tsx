// frontend/__tests__/components/ProfileHeader.test.tsx
// Phase 4: ProfileHeader — username, animated stats, premium badge

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProfileHeader from '../../components/profile/ProfileHeader';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('../../components/ui/FrostedHeader', () => {
  return function MockFrostedHeader({ children }: any) {
    const { View } = require('react-native');
    return <View>{children}</View>;
  };
});

jest.mock('../../components/ui/Icon', () => {
  const { Text } = require('react-native');
  return function MockIcon({ accessibilityLabel }: any) {
    return <Text>{accessibilityLabel || 'icon'}</Text>;
  };
});

jest.mock('../../components/ui/AnimatedStatCounter', () => {
  const { Text } = require('react-native');
  return function MockAnimatedStatCounter({ value, testID }: any) {
    return <Text testID={testID}>{String(value)}</Text>;
  };
});

jest.mock('../../components/ui/ShimmerBadge', () => {
  const { Text } = require('react-native');
  return function MockShimmerBadge({ label, testID }: any) {
    return <Text testID={testID}>{label}</Text>;
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeProfile = (overrides: any = {}) => ({
  id: 'user-1',
  name: 'Alex Chef',
  email: 'alex@example.com',
  ...overrides,
});

const defaultProps = {
  profile: makeProfile(),
  profilePicture: null,
  uploadingPicture: false,
  onChangeProfilePicture: jest.fn(),
  onSaveName: jest.fn().mockResolvedValue(true),
};

const withStats = {
  ...defaultProps,
  stats: { savedRecipes: 42, mealHistory: 18, mealPlans: 7 },
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ProfileHeader', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the user name', () => {
    const { getByText } = render(<ProfileHeader {...defaultProps} />);
    expect(getByText('Alex Chef')).toBeTruthy();
  });

  it('renders the user email', () => {
    const { getByText } = render(<ProfileHeader {...defaultProps} />);
    expect(getByText('alex@example.com')).toBeTruthy();
  });

  it('renders avatar initials when no profile picture', () => {
    const { getByText } = render(<ProfileHeader {...defaultProps} />);
    expect(getByText('AC')).toBeTruthy();
  });

  it('renders stats counters when stats prop is provided', () => {
    const { getByTestId } = render(<ProfileHeader {...withStats} />);
    expect(getByTestId('stat-saved-recipes')).toBeTruthy();
    expect(getByTestId('stat-meals-cooked')).toBeTruthy();
    expect(getByTestId('stat-meal-plans')).toBeTruthy();
  });

  it('stats show correct values', () => {
    const { getByTestId } = render(<ProfileHeader {...withStats} />);
    expect(getByTestId('stat-saved-recipes').props.children).toBe('42');
    expect(getByTestId('stat-meals-cooked').props.children).toBe('18');
    expect(getByTestId('stat-meal-plans').props.children).toBe('7');
  });

  it('does not render stats when stats prop is absent', () => {
    const { queryByTestId } = render(<ProfileHeader {...defaultProps} />);
    expect(queryByTestId('stat-saved-recipes')).toBeNull();
  });

  it('renders premium badge when isPremium=true', () => {
    const { getByTestId } = render(
      <ProfileHeader {...defaultProps} isPremium={true} />
    );
    expect(getByTestId('premium-badge')).toBeTruthy();
  });

  it('does not render premium badge when isPremium=false', () => {
    const { queryByTestId } = render(
      <ProfileHeader {...defaultProps} isPremium={false} />
    );
    expect(queryByTestId('premium-badge')).toBeNull();
  });

  it('opens edit name modal when edit button is pressed', () => {
    const { getAllByText, getByText } = render(<ProfileHeader {...defaultProps} />);
    fireEvent.press(getByText('Edit name'));
    expect(getByText('Edit Name')).toBeTruthy();
  });

  it('calls onSaveName when save button is pressed in modal', async () => {
    const onSaveName = jest.fn().mockResolvedValue(true);
    const { getByText, getByPlaceholderText } = render(
      <ProfileHeader {...defaultProps} onSaveName={onSaveName} />
    );
    fireEvent.press(getByText('Edit name'));
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'New Name');
    fireEvent.press(getByText('Save'));
    expect(onSaveName).toHaveBeenCalledWith('New Name');
  });

  it('calls onChangeProfilePicture when avatar is tapped', () => {
    const onChangeProfilePicture = jest.fn();
    const { getByText } = render(
      <ProfileHeader {...defaultProps} onChangeProfilePicture={onChangeProfilePicture} />
    );
    // The avatar TouchableOpacity contains the initials text
    fireEvent.press(getByText('AC'));
    expect(onChangeProfilePicture).toHaveBeenCalled();
  });
});
