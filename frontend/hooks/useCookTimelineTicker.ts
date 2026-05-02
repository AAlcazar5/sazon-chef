// frontend/hooks/useCookTimelineTicker.ts
// Group 10X Phase 3 — real-time cook ticker for the Gantt timeline screen.

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

interface TickerState {
  activeMinute: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  slip: (minutes: number) => void;
}

export default function useCookTimelineTicker(): TickerState {
  const [activeMinute, setActiveMinute] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const startedAtRef = useRef<number | null>(null);
  const pausedMinuteRef = useRef<number>(0);
  const slipMinutesRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    startedAtRef.current = Date.now() - pausedMinuteRef.current * 60000;
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
    setActiveMinute((current) => {
      pausedMinuteRef.current = current;
      return current;
    });
    clearTick();
  }, [clearTick]);

  const slip = useCallback((minutes: number) => {
    slipMinutesRef.current += minutes;
    setActiveMinute((current) => current + minutes);
    pausedMinuteRef.current += minutes;
    if (startedAtRef.current !== null) {
      startedAtRef.current -= minutes * 60000;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)?.catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedMs = startedAtRef.current !== null ? now - startedAtRef.current : 0;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      setActiveMinute(elapsedMinutes);
    }, 1000);

    return clearTick;
  }, [isRunning, clearTick]);

  return { activeMinute, isRunning, start, pause, slip };
}
