// frontend/__tests__/components/coach/SazonHeader.test.tsx
// ROADMAP 4.0 — SazonHeader (TDD).

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('../../../components/profile/ProfileAvatarButton', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: function MockProfileAvatarButton() {
      return ReactLib.createElement(View, { testID: 'profile-avatar-button' });
    },
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SazonHeader from '../../../components/coach/SazonHeader';

describe('SazonHeader', () => {
  it('renders the editorial Sazon title', () => {
    const { getByText } = render(<SazonHeader />);
    expect(getByText(/Sa/)).toBeTruthy();
    expect(getByText(/zon/)).toBeTruthy();
  });

  it('renders the ProfileAvatarButton in the right slot', () => {
    const { getByTestId } = render(<SazonHeader />);
    expect(getByTestId('profile-avatar-button')).toBeTruthy();
  });

  it('renders the new-conversation button when handler provided', () => {
    const onNew = jest.fn();
    const { getByTestId } = render(<SazonHeader onNewConversation={onNew} />);
    expect(getByTestId('sazon-header-new-conversation')).toBeTruthy();
  });

  it('hides the new-conversation button when no handler is provided', () => {
    const { queryByTestId } = render(<SazonHeader />);
    expect(queryByTestId('sazon-header-new-conversation')).toBeNull();
  });

  it('fires onNewConversation when the new-conversation button is pressed', () => {
    const onNew = jest.fn();
    const { getByTestId } = render(<SazonHeader onNewConversation={onNew} />);
    fireEvent.press(getByTestId('sazon-header-new-conversation'));
    expect(onNew).toHaveBeenCalledTimes(1);
  });
});
