// Phase 8 (10Y-E): conversation export button — Pro-only, calls coachApi
// and hands the markdown to Share.share.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../lib/api', () => ({
  coachApi: {
    exportConversation: jest.fn(),
  },
}));

import ConversationExport from '../../../components/coach/ConversationExport';
import { coachApi } from '../../../lib/api';

const mockedCoachApi = coachApi as jest.Mocked<typeof coachApi>;

describe('ConversationExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Pro user sees the export button when a conversation is active', () => {
    const { getByLabelText } = render(
      <ConversationExport
        conversationId="c1"
        conversationTitle="Pesto night"
        isPremium
      />,
    );
    expect(getByLabelText(/Export conversation/i)).toBeTruthy();
  });

  it('Free user does not see the button', () => {
    const { queryByLabelText } = render(
      <ConversationExport
        conversationId="c1"
        conversationTitle="Pesto night"
        isPremium={false}
      />,
    );
    expect(queryByLabelText(/Export conversation/i)).toBeNull();
  });

  it('hides the button when no conversation is active', () => {
    const { queryByLabelText } = render(
      <ConversationExport
        conversationId={null}
        conversationTitle="Sazon Coach"
        isPremium
      />,
    );
    expect(queryByLabelText(/Export conversation/i)).toBeNull();
  });

  it('on press, fetches markdown and calls Share.share with the result', async () => {
    mockedCoachApi.exportConversation.mockResolvedValue('# Pesto night\n\n## You · ts\n\nhi');
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });

    const { getByLabelText } = render(
      <ConversationExport
        conversationId="c1"
        conversationTitle="Pesto night"
        isPremium
      />,
    );
    fireEvent.press(getByLabelText(/Export conversation/i));

    await waitFor(() => {
      expect(mockedCoachApi.exportConversation).toHaveBeenCalledWith('c1');
    });
    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledWith({
        message: '# Pesto night\n\n## You · ts\n\nhi',
        title: 'Pesto night',
      });
    });

    shareSpy.mockRestore();
  });
});
