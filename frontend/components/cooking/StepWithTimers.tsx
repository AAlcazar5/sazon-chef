// frontend/components/cooking/StepWithTimers.tsx
//
// Tier Y-2 — renders a recipe step with the duration(s) turned into an
// inline tappable timer chip, exactly where they sit in the prose
// (Claude's "▶ 30:00" mid-sentence). Parsing is the existing
// timerExtraction (extractTimerSpans) — only minute/hour/second
// durations become chips, so "400°F" / "1-inch" stay plain text by
// construction. Haptic-on-done mirrors CookingModeTimers.

import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import {
  extractTimerSpans,
  formatCountdown,
} from '../../utils/timerExtraction';
import { Brand } from '../../constants/tokens';

interface InlineTimerChipProps {
  minutes: number;
  label: string;
  accent: string;
}

function InlineTimerChip({ minutes, label, accent }: InlineTimerChipProps) {
  const total = minutes * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && !done) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            setDone(true);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, done]);

  const onPress = () => {
    if (done) {
      setRemaining(total);
      setDone(false);
      setRunning(false);
      return;
    }
    setRunning((r) => !r);
  };

  const face = done
    ? '✓ done'
    : `${running ? '⏸' : '▶'} ${formatCountdown(remaining)}`;

  return (
    <Text
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${minutes} minute ${label.toLowerCase()} timer`}
      style={[styles.chip, { color: accent }]}
    >
      {` ${face} `}
    </Text>
  );
}

export default function StepWithTimers({ text }: { text: string }) {
  const { theme } = useTheme();
  const accent = theme === 'dark' ? Brand.dark.base : Brand.light.base;
  const spans = extractTimerSpans(text);

  if (spans.length === 0) {
    return <Text style={styles.body}>{text}</Text>;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  spans.forEach((s, i) => {
    if (s.index > cursor) {
      parts.push(text.slice(cursor, s.index));
    }
    parts.push(
      <InlineTimerChip
        key={`t-${i}`}
        minutes={s.minutes}
        label={s.label}
        accent={accent}
      />,
    );
    cursor = s.index + s.length;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <Text style={styles.body}>{parts}</Text>;
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 15 * 1.5, color: '#1F2937' },
  chip: { fontWeight: '700' },
});
