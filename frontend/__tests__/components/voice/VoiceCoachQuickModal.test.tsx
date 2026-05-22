// Y-Siri-1 (founder Telegram 2026-05-22) — voice-to-coach modal tests.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
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
  isListening: false,
  isAvailable: true,
  startListening: mockStartListening,
  stopListening: mockStopListening,
};
jest.mock('../../../hooks/useVoiceInput', () => ({
  useVoiceInput: () => mockVoiceState,
}));

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import VoiceCoachQuickModal from '../../../components/voice/VoiceCoachQuickModal';

beforeEach(() => {
  jest.clearAllMocks();
  mockVoiceState = {
    interimTranscript: '',
    transcript: '',
    isListening: false,
    isAvailable: true,
    startListening: mockStartListening,
    stopListening: mockStopListening,
  };
  mockStartListening.mockResolvedValue(undefined);
});

describe('VoiceCoachQuickModal', () => {
  it('renders nothing when not visible', () => {
    render(<VoiceCoachQuickModal visible={false} onClose={jest.fn()} />);
    expect(screen.queryByTestId('voice-coach-quick-modal')).toBeNull();
  });

  it('renders the sheet + auto-starts listening when opened', async () => {
    render(<VoiceCoachQuickModal visible onClose={jest.fn()} />);
    expect(screen.getByTestId('voice-coach-quick-modal')).toBeTruthy();
    await waitFor(() => expect(mockStartListening).toHaveBeenCalledTimes(1));
  });

  it('a11y label set on the modal', () => {
    render(<VoiceCoachQuickModal visible onClose={jest.fn()} />);
    expect(screen.getByLabelText('Voice to Sazon')).toBeTruthy();
  });

  it('Close button stops listening + closes', () => {
    const onClose = jest.fn();
    render(<VoiceCoachQuickModal visible onClose={onClose} />);
    fireEvent.press(screen.getByTestId('voice-coach-close'));
    expect(mockStopListening).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('typing into the input + submitting routes to coach with seedMessage', async () => {
    render(<VoiceCoachQuickModal visible onClose={jest.fn()} />);
    const input = screen.getByTestId('voice-coach-input');
    fireEvent.changeText(input, 'carbonara recipe');
    fireEvent.press(screen.getByTestId('voice-coach-submit'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/coach',
      params: { seedMessage: 'carbonara recipe' },
    });
  });

  it('forwards originScreen as a hidden context hint on submit', async () => {
    render(
      <VoiceCoachQuickModal visible onClose={jest.fn()} originScreen="kitchen" />,
    );
    const input = screen.getByTestId('voice-coach-input');
    fireEvent.changeText(input, 'sushi');
    fireEvent.press(screen.getByTestId('voice-coach-submit'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/coach',
      params: { seedMessage: 'sushi', originScreen: 'kitchen' },
    });
  });

  it('Submit is disabled while text is empty', () => {
    render(<VoiceCoachQuickModal visible onClose={jest.fn()} />);
    const submit = screen.getByTestId('voice-coach-submit');
    expect(submit.props.accessibilityState?.disabled).toBe(true);
  });

  it('renders the interim transcript live while listening', () => {
    mockVoiceState = {
      ...mockVoiceState,
      interimTranscript: 'looking for ramen',
      isListening: true,
    };
    render(<VoiceCoachQuickModal visible onClose={jest.fn()} />);
    expect(screen.getByDisplayValue('looking for ramen')).toBeTruthy();
  });

  it('trims + length-caps the spoken text before routing', async () => {
    const longInput = ' ' + 'a'.repeat(600) + '  ';
    render(<VoiceCoachQuickModal visible onClose={jest.fn()} />);
    const input = screen.getByTestId('voice-coach-input');
    fireEvent.changeText(input, longInput);
    fireEvent.press(screen.getByTestId('voice-coach-submit'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const params = (mockPush.mock.calls[0][0] as { params: { seedMessage: string } }).params;
    expect(params.seedMessage.length).toBeLessThanOrEqual(500);
    expect(params.seedMessage.startsWith(' ')).toBe(false);
    expect(params.seedMessage.endsWith(' ')).toBe(false);
  });
});
