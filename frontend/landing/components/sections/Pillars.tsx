'use client';

import { motion } from 'framer-motion';
import { Compass, Heart, Sparkles, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fadeUp, springSnappy, stagger, viewportOnce } from '@/lib/motion';

interface Pillar {
  icon: LucideIcon;
  title: string;
  body: string;
  bg: string;
  iconBg: string;
  iconColor: string;
}

const PILLARS: Pillar[] = [
  {
    icon: User,
    title: 'Hypersonalization',
    body:
      'No two users see the same thing. Today’s hero, your slot picks, even the recipe titles bend to who’s looking.',
    bg: 'bg-pastel-peach',
    iconBg: 'bg-brand-500',
    iconColor: 'text-white',
  },
  {
    icon: Sparkles,
    title: 'Adaptive iteration',
    body:
      'Every save, swap, rating, and skip teaches Sazon what you love. Smarter today than yesterday.',
    bg: 'bg-pastel-sage',
    iconBg: 'bg-accent-basil',
    iconColor: 'text-white',
  },
  {
    icon: Compass,
    title: 'Discovery, not optimization',
    body:
      'Today’s plate hit 18 ingredients. Top mineral: magnesium. Curiosity, not a verdict.',
    bg: 'bg-pastel-lavender',
    iconBg: 'bg-surface-ink',
    iconColor: 'text-white',
  },
  {
    icon: Heart,
    title: 'Joy obsession',
    body:
      'Every cook earns a peak moment — chef-kiss, sparkle, witty line. The screenshot you send to a friend.',
    bg: 'bg-pastel-golden',
    iconBg: 'bg-accent-saffron',
    iconColor: 'text-white',
  },
];

export function Pillars() {
  return (
    <section id="how" className="relative bg-screen-warm py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
          className="mb-14 max-w-2xl"
        >
          <motion.span
            variants={fadeUp}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700"
          >
            Four principles
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-3 font-display text-4xl leading-tight tracking-tight text-surface-ink md:text-5xl"
          >
            What makes Sazon different.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
          className="grid gap-5 md:grid-cols-2 md:gap-6"
        >
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <motion.article
                key={p.title}
                variants={fadeUp}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={springSnappy}
                className={`group relative overflow-hidden rounded-card ${p.bg} p-7 shadow-soft transition-shadow hover:shadow-lift md:p-9`}
              >
                <div
                  className={`mb-5 inline-grid h-12 w-12 place-items-center rounded-pill ${p.iconBg} shadow-soft`}
                >
                  <Icon className={`h-6 w-6 ${p.iconColor}`} aria-hidden />
                </div>
                <h3 className="font-display text-2xl tracking-tight text-surface-ink md:text-3xl">
                  {p.title}
                </h3>
                <p className="mt-3 text-base text-surface-ink/75 md:text-lg">{p.body}</p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
