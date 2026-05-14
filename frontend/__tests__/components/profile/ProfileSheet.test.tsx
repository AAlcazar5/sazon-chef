// frontend/__tests__/components/profile/ProfileSheet.test.tsx
// ROADMAP 4.0 Tier A0-b — ProfileSheet (TDD).

const mockToggleTheme = jest.fn();
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
    toggleTheme: mockToggleTheme,
    setThemeMode: jest.fn(),
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

// BottomSheetScrollView reaches into the parent BottomSheet's internal
// context. In standalone unit tests we render ProfileSheet without that
// parent, so swap it for a plain ScrollView with the same props.
jest.mock('@gorhom/bottom-sheet', () => {
  const { ScrollView } = require('react-native');
  return { BottomSheetScrollView: ScrollView };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProfileSheet from '../../../components/profile/ProfileSheet';

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  displayName: 'Alex',
  isPremium: false,
  onOpenJourney: jest.fn(),
  onOpenMemory: jest.fn(),
  onOpenMembership: jest.fn(),
  onOpenPreferences: jest.fn(),
  onOpenPantry: jest.fn(),
  onOpenNotifications: jest.fn(),
  onOpenHelp: jest.fn(),
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

  it('renders all seven nav rows without the retired Profile row', () => {
    const { getByTestId, queryByTestId } = render(<ProfileSheet {...baseProps} />);
    expect(getByTestId('profile-sheet-row-journey')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-memory')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-membership')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-preferences')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-pantry')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-notifications')).toBeTruthy();
    expect(getByTestId('profile-sheet-row-help')).toBeTruthy();
    // Removed rows must not regress.
    expect(queryByTestId('profile-sheet-row-full-profile')).toBeNull();
    expect(queryByTestId('profile-sheet-row-macros')).toBeNull();
    expect(queryByTestId('profile-sheet-row-appearance')).toBeNull();
    expect(queryByTestId('profile-sheet-row-account')).toBeNull();
  });

  it('fires each nav row callback with the right handler', () => {
    const onOpenJourney = jest.fn();
    const onOpenMemory = jest.fn();
    const onOpenMembership = jest.fn();
    const onOpenPreferences = jest.fn();
    const onOpenPantry = jest.fn();
    const onOpenNotifications = jest.fn();
    const onOpenHelp = jest.fn();
    const { getByTestId } = render(
      <ProfileSheet
        {...baseProps}
        onOpenJourney={onOpenJourney}
        onOpenMemory={onOpenMemory}
        onOpenMembership={onOpenMembership}
        onOpenPreferences={onOpenPreferences}
        onOpenPantry={onOpenPantry}
        onOpenNotifications={onOpenNotifications}
        onOpenHelp={onOpenHelp}
      />
    );
    fireEvent.press(getByTestId('profile-sheet-row-journey'));
    expect(onOpenJourney).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('profile-sheet-row-memory'));
    expect(onOpenMemory).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('profile-sheet-row-membership'));
    expect(onOpenMembership).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('profile-sheet-row-preferences'));
    expect(onOpenPreferences).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('profile-sheet-row-pantry'));
    expect(onOpenPantry).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('profile-sheet-row-notifications'));
    expect(onOpenNotifications).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('profile-sheet-row-help'));
    expect(onOpenHelp).toHaveBeenCalledTimes(1);
  });

  it('membership row copy adapts to premium state', () => {
    const free = render(<ProfileSheet {...baseProps} isPremium={false} />);
    expect(free.getByText(/Upgrade to Sazon Membership/i)).toBeTruthy();

    const pro = render(<ProfileSheet {...baseProps} isPremium={true} />);
    expect(pro.getByText(/Manage your subscription/i)).toBeTruthy();
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

  describe('dark-mode toggle', () => {
    beforeEach(() => {
      mockToggleTheme.mockClear();
    });

    it('renders the dark-mode row + switch', () => {
      const { getByTestId } = render(<ProfileSheet {...baseProps} />);
      expect(getByTestId('profile-sheet-row-dark-mode')).toBeTruthy();
      expect(getByTestId('profile-sheet-dark-mode-switch')).toBeTruthy();
    });

    it('switch reflects the current theme (off when light)', () => {
      const { getByTestId } = render(<ProfileSheet {...baseProps} />);
      expect(getByTestId('profile-sheet-dark-mode-switch').props.value).toBe(false);
    });

    it('row exposes accessibilityRole="switch"', () => {
      const { getByTestId } = render(<ProfileSheet {...baseProps} />);
      // The shared HapticTouchableOpacity wrapper owns accessibilityState
      // (it sets { disabled }); the checked state is carried by the Switch
      // child. The role is what the screen reader announces for the row.
      expect(getByTestId('profile-sheet-row-dark-mode').props.accessibilityRole).toBe('switch');
    });

    it('tapping the row calls toggleTheme', () => {
      const { getByTestId } = render(<ProfileSheet {...baseProps} />);
      fireEvent.press(getByTestId('profile-sheet-row-dark-mode'));
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('flipping the switch calls toggleTheme', () => {
      const { getByTestId } = render(<ProfileSheet {...baseProps} />);
      fireEvent(getByTestId('profile-sheet-dark-mode-switch'), 'valueChange', true);
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });
  });
});
