'use client';

import { motion } from 'framer-motion';
import { springSnappy } from '@/lib/motion';

interface ChipProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  emoji?: string;
}

export function Chip({ label, selected, onSelect, emoji }: ChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={springSnappy}
      aria-pressed={selected}
      className={[
        'inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium transition-colors',
        selected
          ? 'bg-brand-gradient text-white shadow-soft'
          : 'bg-surface-linen text-surface-ink/80 hover:bg-pastel-peach/60',
      ].join(' ')}
    >
      {emoji ? <span aria-hidden>{emoji}</span> : null}
      {label}
    </motion.button>
  );
}
