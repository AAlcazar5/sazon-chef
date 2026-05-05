// frontend/hooks/useVoicePlayback.ts
// Voice playback hook: Edge neural TTS via expo-av, with expo-speech fallback.

import { useRef, useState, useCallback, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Speech from 'expo-speech';
import { synthesize, EDGE_VOICES, clearTtsCache, type EdgeVoiceId } from '../lib/edgeTts';

type PlaybackEngine = 'edge' | 'system';

interface VoicePlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  engine: PlaybackEngine;
}

interface VoicePlaybackControls {
  speak: (text: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seekBack: (seconds: number) => Promise<void>;
  setRate: (rate: number) => void;
  setVoice: (voice: string) => void;
}

export function useVoicePlayback(): VoicePlaybackState & VoicePlaybackControls {
  const [state, setState] = useState<VoicePlaybackState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    positionMs: 0,
    durationMs: 0,
    engine: 'edge',
  });

  const soundRef = useRef<Audio.Sound | null>(null);
  const rateRef = useRef(1.0);
  const voiceRef = useRef<string>(EDGE_VOICES.aria);
  const mountedRef = useRef(true);

  // Track position via status updates
  const onPlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!mountedRef.current) return;
    if (!status.isLoaded) return;
    setState((prev) => ({
      ...prev,
      isPlaying: status.isPlaying,
      isPaused: status.isLoaded && !status.isPlaying && (status.positionMillis ?? 0) > 0 && !status.didJustFinish,
      positionMs: status.positionMillis ?? 0,
      durationMs: status.durationMillis ?? 0,
    }));
    if (status.didJustFinish) {
      setState((prev) => ({ ...prev, isPlaying: false, isPaused: false }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
      Speech.stop();
      clearTtsCache();
    };
  }, []);

  const unloadSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  };

  const speak = useCallback(async (text: string) => {
    await unloadSound();
    Speech.stop();
    if (!mountedRef.current) return;

    setState((prev) => ({ ...prev, isLoading: true, isPlaying: false, isPaused: false, positionMs: 0, durationMs: 0 }));

    try {
      // Try Edge neural TTS
      const filePath = await synthesize(text, voiceRef.current, rateRef.current);
      if (!mountedRef.current) return;

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: filePath },
        { shouldPlay: true, rate: 1.0, shouldCorrectPitch: true },
        onPlaybackStatus,
      );
      soundRef.current = sound;
      if (!mountedRef.current) {
        await sound.unloadAsync();
        return;
      }
      setState((prev) => ({ ...prev, isLoading: false, isPlaying: true, engine: 'edge' }));
    } catch {
      // Fallback to system TTS
      if (!mountedRef.current) return;
      setState((prev) => ({ ...prev, isLoading: false, isPlaying: true, engine: 'system' }));
      Speech.speak(text, {
        rate: rateRef.current,
        pitch: 1.0,
        onDone: () => {
          if (mountedRef.current) {
            setState((prev) => ({ ...prev, isPlaying: false, isPaused: false }));
          }
        },
        onStopped: () => {
          if (mountedRef.current) {
            setState((prev) => ({ ...prev, isPlaying: false, isPaused: false }));
          }
        },
      });
    }
  }, [onPlaybackStatus]);

  const pause = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
    } else {
      // System TTS fallback
      try { await Speech.pause(); } catch { await Speech.stop(); }
    }
    setState((prev) => ({ ...prev, isPlaying: false, isPaused: true }));
  }, []);

  const resume = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.playAsync();
    } else {
      try { await Speech.resume(); } catch {}
    }
    setState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));
  }, []);

  const stop = useCallback(async () => {
    await unloadSound();
    Speech.stop();
    setState((prev) => ({ ...prev, isPlaying: false, isPaused: false, positionMs: 0 }));
  }, []);

  const seekBack = useCallback(async (seconds: number) => {
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        const newPos = Math.max(0, (status.positionMillis ?? 0) - seconds * 1000);
        await soundRef.current.setPositionAsync(newPos);
        if (!status.isPlaying) {
          await soundRef.current.playAsync();
        }
      }
    }
    setState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));
  }, []);

  const setRate = useCallback((rate: number) => {
    rateRef.current = rate;
    // If edge audio is loaded, adjust playback rate live
    if (soundRef.current) {
      soundRef.current.setRateAsync(rate, true).catch(() => {});
    }
  }, []);

  const setVoice = useCallback((voice: string) => {
    voiceRef.current = voice;
  }, []);

  return {
    ...state,
    speak,
    pause,
    resume,
    stop,
    seekBack,
    setRate,
    setVoice,
  };
}
