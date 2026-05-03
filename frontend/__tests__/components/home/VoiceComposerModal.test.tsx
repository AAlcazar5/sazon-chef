// frontend/__tests__/components/home/VoiceComposerModal.test.tsx
// Group 10X Phase 7 — voice composer modal tests.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const mockComposeFromUtterance = jest.fn();
jest.mock('../../../lib/api', () => ({
  composedPlateApi: {
    composeFromUtterance: (...args: any[]) => mockComposeFromUtterance(...args),
  },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockStartListening = jest.fn();
const mockStopListening = jest.fn();
let mockVoiceState: any = {
  interimTranscript: '',
  transcript: '',
  startListening: mockStartListening,
  stopListening: mockStopListening,
};
jest.mock('../../../hooks/useVoiceInput', () => ({
  useVoiceInput: () => mockVoiceState,
}));

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import VoiceComposerModal from '../../../components/home/VoiceComposerModal';

beforeEach(() => {
  jest.clearAllMocks();
  mockVoiceState = {
    interimTranscript: '',
    transcript: '',
    startListening: mockStartListening,
    stopListening: mockStopListening,
  };
  mockStartListening.mockResolvedValue(undefined);
});

describe('VoiceComposerModal', () => {
  it('renders nothing when not visible', () => {
    render(<VoiceComposerModal visible={false} onClose={jest.fn()} />);
    expect(screen.queryByTestId('voice-composer-modal')).toBeNull();
  });

  it('renders the sheet + auto-starts listening when opened', async () => {
    render(<VoiceComposerModal visible onClose={jest.fn()} />);
    expect(screen.getByTestId('voice-composer-modal')).toBeTruthy();
    await waitFor(() => expect(mockStartListening).toHaveBeenCalledTimes(1));
  });

  it('mirrors interim transcript into the text input', async () => {
    mockVoiceState.interimTranscript = 'salmon farro yogurt';
    render(<VoiceComposerModal visible onClose={jest.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('voice-composer-input').props.value).toBe('salmon farro yogurt'),
    );
  });

  it('submits, navigates to composer with returned plateId, and closes', async () => {
    mockComposeFromUtterance.mockResolvedValueOnce({ data: { plate: { id: 'plate-123' } } });
    const onClose = jest.fn();
    render(<VoiceComposerModal visible onClose={onClose} />);
    fireEvent.changeText(screen.getByTestId('voice-composer-input'), 'salmon farro yogurt');
    fireEvent.press(screen.getByTestId('voice-composer-submit'));
    await waitFor(() => expect(mockComposeFromUtterance).toHaveBeenCalledWith('salmon farro yogurt'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/build-a-plate',
      params: { plateId: 'plate-123' },
    });
  });

  it('shows a Sazon-friendly error when API rejects', async () => {
    mockComposeFromUtterance.mockRejectedValueOnce(new Error('network'));
    render(<VoiceComposerModal visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('voice-composer-input'), 'salmon');
    fireEvent.press(screen.getByTestId('voice-composer-submit'));
    await waitFor(() => expect(screen.getByTestId('voice-composer-error')).toBeTruthy());
    expect(screen.getByTestId('voice-composer-error').props.children).toMatch(/Sazon/);
  });

  it('shows error when API returns no plate id', async () => {
    mockComposeFromUtterance.mockResolvedValueOnce({ data: { plate: null } });
    render(<VoiceComposerModal visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('voice-composer-input'), 'salmon');
    fireEvent.press(screen.getByTestId('voice-composer-submit'));
    await waitFor(() => expect(screen.getByTestId('voice-composer-error')).toBeTruthy());
  });

  it('does not submit empty input', () => {
    render(<VoiceComposerModal visible onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('voice-composer-submit'));
    expect(mockComposeFromUtterance).not.toHaveBeenCalled();
  });

  it('caps utterance to 500 chars before submit', async () => {
    mockComposeFromUtterance.mockResolvedValueOnce({ data: { plate: { id: 'p' } } });
    const longText = 'a'.repeat(900);
    render(<VoiceComposerModal visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByTestId('voice-composer-input'), longText);
    fireEvent.press(screen.getByTestId('voice-composer-submit'));
    await waitFor(() => {
      const arg = mockComposeFromUtterance.mock.calls[0][0];
      expect(arg.length).toBeLessThanOrEqual(500);
    });
  });

  it('close button stops listening + clears state + calls onClose', () => {
    const onClose = jest.fn();
    render(<VoiceComposerModal visible onClose={onClose} />);
    fireEvent.press(screen.getByTestId('voice-composer-close'));
    expect(mockStopListening).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
