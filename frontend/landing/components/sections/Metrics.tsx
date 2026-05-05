'use client';

import { motion } from 'framer-motion';
import { CountUp } from '@/components/ui/CountUp';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

const METRICS = [
  { value: 141, suffix: '', caption: 'cuisines tracked' },
  { value: 4735, suffix: '+', caption: 'recipes ranked nightly' },
  { value: 18, suffix: '', caption: 'avg ingredient diversity per plate' },
  { value: 97, suffix: '%', caption: 'of week-1 cookers still cook in week 4' },
];

export function Metrics() {
  return (
    <section className="relative overflow-hidden bg-surface-ink py-24 text-surface-cream md:py-32">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(232,112,79,0.18),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(91,138,74,0.16),transparent_55%)]"
      />

      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
          className="mb-16 max-w-2xl"
        >
          <motion.span
            variants={fadeUp}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-pastel-peach"
          >
            The engine
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-3 font-display text-4xl leading-tight tracking-tight text-surface-cream md:text-5xl"
          >
            It learns.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-xl text-lg text-surface-cream/70"
          >
            Real-time signal from every cook, save, swap, rating, and skip — re-ranking
            tomorrow&rsquo;s feed every night.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
          className="grid gap-10 md:grid-cols-4 md:gap-6"
        >
          {METRICS.map((m) => (
            <motion.div key={m.caption} variants={fadeUp} className="text-left">
              <div className="font-display text-6xl leading-none text-surface-cream md:text-7xl">
                <CountUp to={m.value} suffix={m.suffix} />
              </div>
              <p className="mt-3 text-sm text-surface-cream/65 md:text-base">
                {m.caption}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.svg
          viewBox="0 0 1200 200"
          className="mt-20 h-32 w-full md:h-40"
          aria-hidden
        >
          <defs>
            <linearGradient id="lineGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#E8704F" />
              <stop offset="100%" stopColor="#F5DEA0" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 0 170 C 200 165, 350 140, 500 110 S 850 60, 1200 30"
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.circle
            cx="1200"
            cy="30"
            r="6"
            fill="#F5DEA0"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportOnce}
            transition={{ delay: 1.5 }}
          />
        </motion.svg>
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-surface-cream/45">
          Recommendation accuracy &mdash; week 1 → week 12
        </p>
      </div>
    </section>
  );
}
