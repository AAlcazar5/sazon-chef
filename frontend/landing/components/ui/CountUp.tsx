'use client';

import { animate, useInView, useMotionValue, useTransform } from 'framer-motion';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { easeOutQuart } from '@/lib/motion';

interface CountUpProps {
  to: number;
  durationMs?: number;
  format?: (value: number) => string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  to,
  durationMs = 1600,
  format,
  suffix = '',
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const value = useMotionValue(0);
  const display = useTransform(value, (latest) => {
    const v = Math.round(latest);
    return format ? format(v) : v.toLocaleString();
  });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(value, to, {
      duration: durationMs / 1000,
      ease: easeOutQuart,
    });
    return () => controls.stop();
  }, [inView, to, durationMs, value]);

  return (
    <span ref={ref} className={className}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}
