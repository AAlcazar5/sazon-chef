// frontend/__tests__/components/profile/ProfileSheet.test.tsx
// ROADMAP 4.0 Tier A0-b — ProfileSheet (TDD).

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
import ProfileSheet from '../../../components/profile/ProfileSheet';

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  displayName: 'Alex',
  isPremium: false,
  onOpenFullProfile: jest.fn(),
  onOpenJourney: jest.fn(),
  onOpenMemory: jest.fn(),
  onSignOut: jest.fn(),
};

describe('<ProfileSheet />', () => {
  it('renders nothing when not visible', () => {
    const { queryByTestId } = render(<ProfileSheet {...baseProps} visible={false} />);
    expect(queryByTestId('profile-sheet')).toBeNull();
  });

  it('renders the header with display name when visible', () => {
    const { getByText } = render(<ProfileSheet {...baseProps} displayName="Alex" />);
    expect(getByText('Alex')).toBeTruthy();
  });

  it('shows a Pro badge when isPremium is true', () => {
    const { getByText } = render(<ProfileSheet {...baseProps} isPremium={true} />);
    expect(getByText(/Sazon Membership/i)).toBeTruthy();
  });

  it('shows a Free badge when isPremium is false', () => {
    const { getByText } = render(<ProfileSheet {...baseProps} isPremium={false} />);
    expect(getByText(/Free/i)).toBeTruthy();
  });

  it('renders the three distinct menu rows (no duplicates)', () => {
    // Tier A0-b cleanup: deleted four rows that all routed to the same
    // /(tabs)/profile screen with a no-op `?focus=` param. Remaining rows
    // each go somewhere distinct: Journey → Kitchen tab, Memory → coach-
    // memory screen, Full profile → /(tabs)/profile.
    const { getByTestId, queryByTestId } = render(<ProfileSheet {...baseProps} />);
    expect(getByTestId('profile-sheet-row-journey')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-memory')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-full-profile')).toBeTruthy();
    // Removed rows must not regress.
    expect(queryByTestId('profile-sheet-row-macros')).toBeNull();
    expect(queryByTestId('profile-sheet-row-notifications')).toBeNull();
    expect(queryByTestId('profile-sheet-row-appearance')).toBeNull();
    expect(queryByTestId('profile-sheet-row-account')).toBeNull();
  });

  it('fires the three remaining row callbacks', () => {
    const onOpenJourney = jest.fn();
    const onOpenMemory = jest.fn();
    const onOpenFullProfile = jest.fn();
    const { getByTestId } = render(
      <ProfileSheet
        {...baseProps}
        onOpenJourney={onOpenJourney}
        onOpenMemory={onOpenMemory}
        onOpenFullProfile={onOpenFullProfile}
      />
    );
    fireEvent.press(getByTestId('profile-sheet-row-journey'));
    expect(onOpenJourney).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('profile-sheet-row-memory'));
    expect(onOpenMemory).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('profile-sheet-row-full-profile'));
    expect(onOpenFullProfile).toHaveBeenCalledTimes(1);
  });

  it('fires onSignOut when sign-out tapped', () => {
    const onSignOut = jest.fn();
    const { getByTestId } = render(<ProfileSheet {...baseProps} onSignOut={onSignOut} />);
    fireEvent.press(getByTestId('profile-sheet-sign-out'));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('fires onClose when close button tapped', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ProfileSheet {...baseProps} onClose={onClose} />);
    fireEvent.press(getByTestId('profile-sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exposes accessibilityRole="menu" on the rows container', () => {
    const { getByTestId } = render(<ProfileSheet {...baseProps} />);
    expect(getByTestId('profile-sheet-menu').props.accessibilityRole).toBe('menu');
  });
});
