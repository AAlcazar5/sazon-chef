'use client';

import { motion } from 'framer-motion';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

const MOMENTS = [
  {
    emoji: '👨‍🍳',
    title: 'Plated.',
    body: 'Persian Saffron Rice Bowl. Cook complete — chef-kiss earned.',
    tint: 'from-pastel-peach to-pastel-blush',
  },
  {
    emoji: '🌶️',
    title: 'Sazon nudge.',
    body: 'You haven’t had Korean in 11 days. Bibimbap?',
    tint: 'from-pastel-sage to-pastel-sky',
  },
  {
    emoji: '✨',
    title: 'Discovery.',
    body: 'Today’s plate hit 18 ingredients. Top mineral: magnesium.',
    tint: 'from-pastel-lavender to-pastel-golden',
  },
];

export function PeakMoments() {
  return (
    <section className="relative overflow-hidden bg-surface-cream py-24 md:py-32">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(232,112,79,0.08),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
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
            Joy bar
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-3 font-display text-4xl leading-tight tracking-tight text-surface-ink md:text-5xl"
          >
            Designed peak moments.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-xl text-lg text-surface-ink/70"
          >
            Utility is the floor. Delight is the bar. Every screen earns a moment worth
            sending to a friend.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
          className="grid gap-6 md:grid-cols-3"
        >
          {MOMENTS.map((m, i) => (
            <motion.figure
              key={m.title}
              variants={fadeUp}
              whileHover={{ y: -6, rotate: i % 2 === 0 ? -1 : 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className={`group relative overflow-hidden rounded-card bg-gradient-to-br ${m.tint} p-7 shadow-soft transition-shadow hover:shadow-lift`}
            >
              <div className="absolute -right-6 -top-6 text-8xl opacity-30 transition-transform group-hover:scale-110">
                {m.emoji}
              </div>
              <div className="relative">
                <div className="mb-6 grid h-14 w-14 place-items-center rounded-pill bg-white/70 text-3xl shadow-soft">
                  {m.emoji}
                </div>
                <figcaption>
                  <h3 className="font-display text-2xl tracking-tight text-surface-ink">
                    {m.title}
                  </h3>
                  <p className="mt-2 text-base text-surface-ink/75">{m.body}</p>
                </figcaption>
              </div>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
