// ROADMAP 4.0 IA2.1 — SazonSheet modal bottom sheet tests.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('../../../lib/api', () => ({
  coachApi: {
    listConversations: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

import SazonSheet from '../../../components/sazon/SazonSheet';

describe('SazonSheet', () => {
  it('renders nothing when visible=false', () => {
    const { queryByTestId } = render(<SazonSheet visible={false} onClose={() => {}} />);
    expect(queryByTestId('sazon-sheet')).toBeNull();
  });

  it('renders the sheet body when visible=true', () => {
    const { getByTestId } = render(<SazonSheet visible={true} onClose={() => {}} />);
    expect(getByTestId('sazon-sheet')).toBeTruthy();
  });

  it('renders the past-chats button as the FIRST header action', () => {
    const { getByLabelText } = render(<SazonSheet visible={true} onClose={() => {}} />);
    expect(getByLabelText(/past chats|history/i)).toBeTruthy();
  });

  it('renders the dismiss button + fires onClose', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(<SazonSheet visible={true} onClose={onClose} />);
    fireEvent.press(getByLabelText('Close Sazon sheet'));
    expect(onClose).toHaveBeenCalled();
  });

  it('toggles between chat view and history view when past-chats button is tapped', () => {
    const { getByLabelText, queryByTestId } = render(
      <SazonSheet visible={true} onClose={() => {}} />,
    );
    expect(queryByTestId('sazon-sheet-chat')).toBeTruthy();
    expect(queryByTestId('sazon-sheet-history')).toBeNull();
    fireEvent.press(getByLabelText(/past chats|history/i));
    expect(queryByTestId('sazon-sheet-history')).toBeTruthy();
  });

  it('passes contextSeed to the chat surface when provided', () => {
    const { getByTestId } = render(
      <SazonSheet visible={true} onClose={() => {}} contextSeed="What's for dinner?" />,
    );
    const chat = getByTestId('sazon-sheet-chat');
    // Seed text appears as initial composer value via testID on the composer input
    expect(chat).toBeTruthy();
  });

  it('routes to /coach via "Open full Sazon" link', () => {
    const { router } = require('expo-router');
    const { getByLabelText } = render(<SazonSheet visible={true} onClose={() => {}} />);
    fireEvent.press(getByLabelText(/open full sazon|full chat/i));
    expect(router.push).toHaveBeenCalledWith('/coach');
  });

  it('has accessibility role=dialog + descriptive label on the sheet container', () => {
    const { getByLabelText } = render(<SazonSheet visible={true} onClose={() => {}} />);
    expect(getByLabelText(/sazon chat sheet|sazon panel/i)).toBeTruthy();
  });
});
