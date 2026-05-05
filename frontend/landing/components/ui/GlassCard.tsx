import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'dark' | 'light';
}

export function GlassCard({ children, className = '', variant = 'dark' }: GlassCardProps) {
  const base = variant === 'dark' ? 'glass text-white' : 'glass-light text-surface-ink';
  return (
    <div className={`${base} rounded-card shadow-lift ${className}`}>{children}</div>
  );
}
