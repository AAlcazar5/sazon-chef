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
  onOpenMacros: jest.fn(),
  onOpenJourney: jest.fn(),
  onOpenMemory: jest.fn(),
  onOpenNotifications: jest.fn(),
  onOpenAppearance: jest.fn(),
  onOpenAccount: jest.fn(),
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

  it('renders all menu items', () => {
    const { getByTestId } = render(<ProfileSheet {...baseProps} />);
    expect(getByTestId('profile-sheet-row-macros')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-journey')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-memory')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-notifications')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-appearance')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-account')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-full-profile')).toBeTruthy();
  });

  it('routes "Open full profile" to onOpenFullProfile', () => {
    const onOpenFullProfile = jest.fn();
    const { getByTestId } = render(
      <ProfileSheet {...baseProps} onOpenFullProfile={onOpenFullProfile} />
    );
    fireEvent.press(getByTestId('profile-sheet-row-full-profile'));
    expect(onOpenFullProfile).toHaveBeenCalledTimes(1);
  });

  it('fires individual menu callbacks', () => {
    const onOpenMacros = jest.fn();
    const onOpenJourney = jest.fn();
    const { getByTestId } = render(
      <ProfileSheet
        {...baseProps}
        onOpenMacros={onOpenMacros}
        onOpenJourney={onOpenJourney}
      />
    );
    fireEvent.press(getByTestId('profile-sheet-row-macros'));
    expect(onOpenMacros).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('profile-sheet-row-journey'));
    expect(onOpenJourney).toHaveBeenCalledTimes(1);
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
