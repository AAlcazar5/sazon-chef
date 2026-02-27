// frontend/hooks/useVoiceInput.ts
// Wraps expo-speech-recognition with intent parsing for Sazon Chef voice commands.
// Gracefully degrades when native module isn't available (e.g., Expo Go).

import { useState, useCallback, useRef, useEffect } from 'react';
import { parseVoiceIntent, ParsedVoiceIntent } from '../lib/voiceIntentParser';
import * as Haptics from 'expo-haptics';

// Lazy-load expo-speech-recognition to avoid crash when native module isn't linked
let SpeechModule: any = null;
let useSpeechEvent: any = null;
let speechAvailable = false;

try {
  const mod = require('expo-speech-recognition');
  SpeechModule = mod.ExpoSpeechRecognitionModule;
  useSpeechEvent = mod.useSpeechRecognitionEvent;
  speechAvailable = true;
} catch {
  speechAvailable = false;
}

// No-op hook for when speech recognition isn't available
function useNoopEvent(_event: string, _handler: (...args: any[]) => void) {
  // Intentionally empty — native module not available
}

export interface UseVoiceInputOptions {
  /** If true, accumulates items until "done" keyword. Default: false */
  continuous?: boolean;
  /** Called when a final intent is parsed */
  onIntent?: (intent: ParsedVoiceIntent) => void;
  /** Called when listening state changes */
  onListeningChange?: (isListening: boolean) => void;
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  lastIntent: ParsedVoiceIntent | null;
  hasPermission: boolean | null;
  isAvailable: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  requestPermission: () => Promise<boolean>;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { continuous = false, onIntent, onListeningChange } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastIntent, setLastIntent] = useState<ParsedVoiceIntent | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const onIntentRef = useRef(onIntent);
  onIntentRef.current = onIntent;
  const onListeningChangeRef = useRef(onListeningChange);
  onListeningChangeRef.current = onListeningChange;

  // Use real hook or no-op depending on availability
  const useEventHook = speechAvailable ? useSpeechEvent : useNoopEvent;

  // Check availability on mount
  useEffect(() => {
    if (!speechAvailable || !SpeechModule) {
      setIsAvailable(false);
      return;
    }

    try {
      const available = SpeechModule.isRecognitionAvailable();
      setIsAvailable(available);
    } catch {
      setIsAvailable(false);
    }

    // Check existing permissions
    SpeechModule.getPermissionsAsync()
      .then((result: any) => setHasPermission(result.granted))
      .catch(() => setHasPermission(false));
  }, []);

  // Handle speech results
  useEventHook('result', (event: any) => {
    const results = event.results;
    if (!results || results.length === 0) return;

    const bestResult = results[0];
    const text = bestResult.transcript;

    if (event.isFinal) {
      setTranscript(text);
      setInterimTranscript('');

      // Check for "done" keyword in continuous mode
      if (continuous && /\b(done|that's it|that's all|finish|stop)\b/i.test(text)) {
        stopListening();
        return;
      }

      // Parse intent
      const intent = parseVoiceIntent(text);
      setLastIntent(intent);
      onIntentRef.current?.(intent);

      if (!continuous) {
        stopListening();
      }
    } else {
      setInterimTranscript(text);
    }
  });

  // Handle errors
  useEventHook('error', (event: any) => {
    console.warn('Speech recognition error:', event.error, event.message);

    if (event.error === 'not-allowed') {
      setHasPermission(false);
    }

    if (continuous && event.error === 'no-speech') return;

    setIsListening(false);
    onListeningChangeRef.current?.(false);
  });

  // Handle end
  useEventHook('end', () => {
    setIsListening(false);
    onListeningChangeRef.current?.(false);
  });

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!SpeechModule) return false;
    try {
      const result = await SpeechModule.requestPermissionsAsync();
      setHasPermission(result.granted);
      return result.granted;
    } catch {
      setHasPermission(false);
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isAvailable || !SpeechModule) {
      console.warn('Speech recognition is not available on this device');
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      setTranscript('');
      setInterimTranscript('');
      setLastIntent(null);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      SpeechModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous,
        contextualStrings: [
          'shopping list', 'add to list', 'recipe', 'find recipe',
          'chicken', 'beef', 'salmon', 'pasta', 'rice', 'vegetables',
          'breakfast', 'lunch', 'dinner', 'snack',
        ],
      });

      setIsListening(true);
      onListeningChangeRef.current?.(true);
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
    }
  }, [isAvailable, hasPermission, continuous, requestPermission]);

  const stopListening = useCallback(() => {
    if (!SpeechModule) return;
    try {
      SpeechModule.stop();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore if already stopped
    }
    setIsListening(false);
    onListeningChangeRef.current?.(false);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    lastIntent,
    hasPermission,
    isAvailable,
    startListening,
    stopListening,
    requestPermission,
  };
}
