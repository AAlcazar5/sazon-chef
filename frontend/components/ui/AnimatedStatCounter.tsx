// frontend/components/ui/AnimatedStatCounter.tsx
// Animated number that counts up from 0 to the target value on mount

import { useEffect, useRef, useState } from 'react';
import { Text, TextStyle } from 'react-native';

interface AnimatedStatCounterProps {
  value: number;
  /** Duration in ms */
  duration?: number;
  /** Optional suffix like "%" or "g" */
  suffix?: string;
  style?: TextStyle;
  testID?: string;
}

export default function AnimatedStatCounter({
  value,
  duration = 800,
  suffix,
  style,
  testID,
}: AnimatedStatCounterProps) {
  const [displayed, setDisplayed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === 0) {
      setDisplayed(0);
      return;
    }

    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - (startTimeRef.current ?? 0);
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * value));

      if (progress < 1) {
        rafRef.current = setTimeout(tick, 16);
      }
    };

    rafRef.current = setTimeout(tick, 16);
    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [value, duration]);

  return <Text style={style} testID={testID}>{displayed}{suffix ?? ''}</Text>;
}
