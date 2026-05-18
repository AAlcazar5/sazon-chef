// W-D P1/D-6 — LogAClaudeCookSheet. Ingest a cook done "with help
// elsewhere" so memory still accumulates (§9a). Invisible-AI: copy never
// names AI/Claude. cookApi mocked.

jest.mock('../../../lib/api/cook', () => ({
  cookApi: { logCookEvent: jest.fn() },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LogAClaudeCookSheet from '../../../components/cook/LogAClaudeCookSheet';
import { cookApi } from '../../../lib/api/cook';

const logCookEvent = cookApi.logCookEvent as jest.Mock;

beforeEach(() => {
  logCookEvent.mockReset();
  logCookEvent.mockResolvedValue({ id: 'ce-1' });
});

describe('LogAClaudeCookSheet', () => {
  it('logs a made_it event sourced "elsewhere" + note, then onLogged + onClose', async () => {
    const onClose = jest.fn();
    const onLogged = jest.fn();
    const { getByText, getByLabelText } = render(
      <LogAClaudeCookSheet visible onClose={onClose} onLogged={onLogged} />,
    );
    fireEvent.changeText(
      getByLabelText('Optional note about what you cooked'),
      'Thai green curry',
    );
    fireEvent.press(getByText('Log this cook'));

    await waitFor(() => expect(logCookEvent).toHaveBeenCalledTimes(1));
    expect(logCookEvent).toHaveBeenCalledWith({
      type: 'made_it',
      payload: { source: 'elsewhere', note: 'Thai green curry' },
    });
    await waitFor(() => expect(onLogged).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits an empty note from the payload', async () => {
    const { getByText } = render(
      <LogAClaudeCookSheet visible onClose={jest.fn()} />,
    );
    fireEvent.press(getByText('Log this cook'));
    await waitFor(() => expect(logCookEvent).toHaveBeenCalled());
    expect(logCookEvent).toHaveBeenCalledWith({
      type: 'made_it',
      payload: { source: 'elsewhere' },
    });
  });

  it('a failure does not throw — shows Sazon-voice hint, never "Error:"', async () => {
    logCookEvent.mockRejectedValueOnce(new Error('HTTP_500'));
    const onClose = jest.fn();
    const { getByText, queryByText } = render(
      <LogAClaudeCookSheet visible onClose={onClose} />,
    );
    fireEvent.press(getByText('Log this cook'));
    await waitFor(() =>
      expect(getByText(/give it another tap/i)).toBeTruthy(),
    );
    expect(queryByText(/Error:|HTTP_500/)).toBeNull();
    expect(onClose).not.toHaveBeenCalled(); // stays open to retry
  });

  it('copy never names AI/Claude (invisible-AI §9c)', () => {
    const { queryByText } = render(
      <LogAClaudeCookSheet visible onClose={jest.fn()} />,
    );
    expect(queryByText(/\bAI\b|Claude|chatbot|assistant/i)).toBeNull();
    expect(queryByText(/with help elsewhere/i)).toBeTruthy();
  });
});
