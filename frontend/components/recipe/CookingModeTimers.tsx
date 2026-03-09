// frontend/components/recipe/CookingModeTimers.tsx
// Horizontal scrollable row of active cooking timers

import { View, Text, ScrollView, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import { formatCountdown } from '../../utils/timerExtraction';

export interface CookingTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
  completed: boolean;
}

interface CookingModeTimersProps {
  timers: CookingTimer[];
  onTick: (id: string) => void;
  onToggle: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function CookingModeTimers({
  timers,
  onTick,
  onToggle,
  onDismiss,
}: CookingModeTimersProps) {
  const intervalRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Manage per-timer intervals
  useEffect(() => {
    timers.forEach((timer) => {
      if (timer.running && !timer.completed && !intervalRefs.current[timer.id]) {
        intervalRefs.current[timer.id] = setInterval(() => {
          onTick(timer.id);
        }, 1000);
      } else if ((!timer.running || timer.completed) && intervalRefs.current[timer.id]) {
        clearInterval(intervalRefs.current[timer.id]);
        delete intervalRefs.current[timer.id];
      }
    });

    // Clear intervals for removed timers
    const activeIds = new Set(timers.map((t) => t.id));
    Object.keys(intervalRefs.current).forEach((id) => {
      if (!activeIds.has(id)) {
        clearInterval(intervalRefs.current[id]);
        delete intervalRefs.current[id];
      }
    });
  }, [timers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
    };
  }, []);

  // Fire haptic on timer completion
  const prevCompletedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    timers.forEach((timer) => {
      if (timer.completed && !prevCompletedRef.current.has(timer.id)) {
        prevCompletedRef.current.add(timer.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
  }, [timers]);

  const activeTimers = timers.filter((t) => !t.completed);
  const completedTimers = timers.filter((t) => t.completed);
  const allTimers = [...completedTimers, ...activeTimers]; // Completed first so they're visible

  if (timers.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      className="flex-grow-0"
    >
      {allTimers.map((timer) => (
        <TimerCard
          key={timer.id}
          timer={timer}
          onToggle={() => onToggle(timer.id)}
          onDismiss={() => onDismiss(timer.id)}
        />
      ))}
    </ScrollView>
  );
}

interface TimerCardProps {
  timer: CookingTimer;
  onToggle: () => void;
  onDismiss: () => void;
}

function TimerCard({ timer, onToggle, onDismiss }: TimerCardProps) {
  const progress = 1 - timer.remainingSeconds / timer.totalSeconds;

  // Animated progress bar width (0–100%)
  const progressAnim = useRef(new Animated.Value(progress * 100)).current;

  // Pulsing border scale for running timers
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Card entrance scale spring
  const entranceScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.spring(entranceScale, { toValue: 1, friction: 6, tension: 200, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress * 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  useEffect(() => {
    if (timer.running && !timer.completed) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timer.running, timer.completed]);

  return (
    <Animated.View
      className="rounded-2xl p-3 min-w-24 items-center"
      style={{
        backgroundColor: timer.completed
          ? '#16A34A' // green-600
          : timer.running
          ? '#1E293B' // slate-800
          : '#374151', // gray-700
        borderWidth: 1,
        borderColor: timer.completed
          ? '#22C55E'
          : timer.running
          ? '#F97316'
          : '#4B5563',
        transform: [{ scale: pulseAnim }, { scale: entranceScale }],
      }}
    >
      {/* Label */}
      <Text
        className="text-xs font-semibold mb-1 text-center"
        style={{ color: timer.completed ? '#BBF7D0' : '#D1D5DB' }}
        numberOfLines={1}
      >
        {timer.label}
      </Text>

      {/* Countdown or Done */}
      {timer.completed ? (
        <Text className="text-2xl">✅</Text>
      ) : (
        <Text
          className="text-xl font-bold font-mono"
          style={{ color: timer.remainingSeconds <= 60 && timer.running ? '#FCA5A5' : '#FFFFFF' }}
        >
          {formatCountdown(timer.remainingSeconds)}
        </Text>
      )}

      {/* Progress bar */}
      {/* Animated progress bar */}
      {!timer.completed && (
        <View className="w-full h-1.5 bg-gray-600 rounded-full mt-2 overflow-hidden">
          <Animated.View
            className="h-full rounded-full"
            style={{
              width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              backgroundColor: timer.running
                ? timer.remainingSeconds <= 60 ? '#EF4444' : '#F97316'
                : '#6B7280',
            }}
          />
        </View>
      )}

      {/* Controls */}
      <View className="flex-row mt-2 gap-2">
        {!timer.completed && (
          <HapticTouchableOpacity onPress={onToggle} hapticStyle="light" className="p-1">
            <Ionicons name={timer.running ? 'pause-circle' : 'play-circle'} size={18} color="#FFFFFF" />
          </HapticTouchableOpacity>
        )}
        <HapticTouchableOpacity onPress={onDismiss} hapticStyle="light" className="p-1">
          <Icon name={Icons.CLOSE} size={14} color="#9CA3AF" />
        </HapticTouchableOpacity>
      </View>
    </Animated.View>
  );
}
