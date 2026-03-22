// frontend/components/ui/AnimatedStatCounter.tsx
// Animated number that counts up from 0 to the target value on mount
// Also exported as CountingNumber for 9-Blind Spots consistency

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text, TextStyle } from 'react-native';

interface AnimatedStatCounterProps {
  value: number;
  /** Duration in ms (default 800) */
  duration?: number;
  /** Optional prefix like "$" */
  prefix?: string;
  /** Optional suffix like "%" or "g" */
  suffix?: string;
  /** Stagger delay in ms before animation starts (for sequential counters) */
  delay?: number;
  /** Number of decimal places (default 0) */
  decimals?: number;
  style?: TextStyle;
  testID?: string;
}

export default function AnimatedStatCounter({
  value,
  duration = 800,
  prefix,
  suffix,
  delay = 0,
  decimals = 0,
  style,
  testID,
}: AnimatedStatCounterProps) {
  const [displayed, setDisplayed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion || value === 0) {
      setDisplayed(value);
      return;
    }

    const startAnimation = () => {
      startTimeRef.current = Date.now();

      const tick = () => {
        const elapsed = Date.now() - (startTimeRef.current ?? 0);
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const factor = Math.pow(10, decimals);
        setDisplayed(Math.round(eased * value * factor) / factor);

        if (progress < 1) {
          rafRef.current = setTimeout(tick, 16);
        }
      };

      rafRef.current = setTimeout(tick, 16);
    };

    if (delay > 0) {
      delayRef.current = setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }

    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
      if (delayRef.current) clearTimeout(delayRef.current);
    };
  }, [value, duration, delay, decimals, reduceMotion]);

  const formatted = decimals > 0 ? displayed.toFixed(decimals) : String(displayed);

  return (
    <Text style={style} testID={testID} accessibilityLabel={`${prefix ?? ''}${value}${suffix ?? ''}`}>
      {prefix ?? ''}{formatted}{suffix ?? ''}
    </Text>
  );
}

// Alias for roadmap naming convention
export const CountingNumber = AnimatedStatCounter;
