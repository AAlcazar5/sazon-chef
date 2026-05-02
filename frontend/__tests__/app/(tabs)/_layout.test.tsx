// frontend/__tests__/app/(tabs)/_layout.test.tsx
// Group 10X Phase 7 — long-press home tab → voice composer modal.
// We factor the long-press handler + modal into a small component
// (`VoiceComposerModal`) and test it in isolation.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false, colors: { background: '#FAF7F4', text: { primary: '#111', secondary: '#666' } } }),
}));

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
  router: { push: mockPush },
}));

const mockStartListening = jest.fn();
const mockStopListening = jest.fn();
let mockVoiceState: any = {
  isListening: false,
  transcript: '',
  interimTranscript: '',
  hasPermission: true,
  isAvailable: true,
  startListening: mockStartListening,
  stopListening: mockStopListening,
  requestPermission: jest.fn().mockResolvedValue(true),
  lastIntent: null,
};

jest.mock('../../../hooks/useVoiceInput', () => ({
  useVoiceInput: () => mockVoiceState,
}));

jest.mock('../../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ label, onPress, disabled, accessibilityLabel, testID }: any) => (
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID ?? `brand-btn-${label}`}
      >
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, onPress, onLongPress, accessibilityLabel, testID }: any) => (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../../components/mascot/Sazon', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => <Text>sazon</Text>,
    expressionToSazon: (expr: string) => ({ variant: 'orange', motion: 'wobble', fx: [] }),
    SAZON_SIZE_PX: { tiny: 32, small: 48, medium: 64, large: 96, hero: 144 },
  };
});

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import VoiceComposerModal from '../../../components/home/VoiceComposerModal';

describe('VoiceComposerModal — long-press home tab voice composer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoiceState = {
      isListening: false,
      transcript: '',
      interimTranscript: '',
      hasPermission: true,
      isAvailable: true,
      startListening: mockStartListening,
      stopListening: mockStopListening,
      requestPermission: jest.fn().mockResolvedValue(true),
      lastIntent: null,
    };
  });

  it('does not render content when not visible', () => {
    const { queryByText } = render(
      <VoiceComposerModal visible={false} onClose={() => {}} />,
    );
    expect(queryByText(/Listening/i)).toBeNull();
  });

  it('renders Sazon thinking mascot when listening', () => {
    mockVoiceState.isListening = true;
    const { getByTestId } = render(
      <VoiceComposerModal visible={true} onClose={() => {}} />,
    );
    expect(getByTestId('sazon-thinking')).toBeTruthy();
  });

  it('renders Sazon copy "Listening for your plate…"', () => {
    mockVoiceState.isListening = true;
    const { getByText } = render(
      <VoiceComposerModal visible={true} onClose={() => {}} />,
    );
    // Title is split across spans (display + italic + period) — match the lead
    expect(getByText(/Listening for your/i)).toBeTruthy();
    expect(getByText('plate')).toBeTruthy();
  });

  it('starts listening when modal opens', async () => {
    render(<VoiceComposerModal visible={true} onClose={() => {}} />);
    await waitFor(() => {
      expect(mockStartListening).toHaveBeenCalled();
    });
  });

  it('on submit, calls composeFromUtterance with the transcript', async () => {
    mockComposeFromUtterance.mockResolvedValue({
      data: { plate: { id: 'composed-utterance-1' } },
    });
    const { getByPlaceholderText, getByText } = render(
      <VoiceComposerModal visible={true} onClose={() => {}} />,
    );
    const input = getByPlaceholderText(/Type your plate/i);
    fireEvent.changeText(input, 'salmon farro carrots yogurt');
    const sendBtn = getByText('Build my plate');
    await act(async () => {
      fireEvent.press(sendBtn);
    });
    expect(mockComposeFromUtterance).toHaveBeenCalledWith(
      'salmon farro carrots yogurt',
    );
  });

  it('on successful compose, navigates to /build-a-plate with composed plateId', async () => {
    mockComposeFromUtterance.mockResolvedValue({
      data: { plate: { id: 'composed-utterance-1' } },
    });
    const onClose = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <VoiceComposerModal visible={true} onClose={onClose} />,
    );
    const input = getByPlaceholderText(/Type your plate/i);
    fireEvent.changeText(input, 'salmon');
    await act(async () => {
      fireEvent.press(getByText('Build my plate'));
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/build-a-plate',
        params: { plateId: 'composed-utterance-1' },
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('handles compose error gracefully — does not navigate', async () => {
    mockComposeFromUtterance.mockRejectedValue(new Error('Network'));
    const { getByPlaceholderText, getByText } = render(
      <VoiceComposerModal visible={true} onClose={() => {}} />,
    );
    fireEvent.changeText(getByPlaceholderText(/Type your plate/i), 'salmon');
    await act(async () => {
      fireEvent.press(getByText('Build my plate'));
    });
    await waitFor(() => {
      expect(mockComposeFromUtterance).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('Build my plate does not submit with empty transcript', () => {
    const { getByText } = render(
      <VoiceComposerModal visible={true} onClose={() => {}} />,
    );
    const sendBtn = getByText('Build my plate');
    fireEvent.press(sendBtn);
    expect(mockComposeFromUtterance).not.toHaveBeenCalled();
  });
});
