'use client';

import { motion } from 'framer-motion';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

export function AntiPositioning() {
  return (
    <section id="anti" className="relative bg-surface-cream py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-2 md:gap-16 md:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
          className="relative"
        >
          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-card bg-surface-linen p-8 shadow-soft"
          >
            <div aria-hidden className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="relative space-y-3 font-mono text-sm text-surface-ink/60">
              <div className="flex justify-between">
                <span>Calories</span>
                <span>1,847 / 1,900</span>
              </div>
              <div className="flex justify-between">
                <span>Protein</span>
                <span>142g / 150g</span>
              </div>
              <div className="flex justify-between">
                <span>Carbs</span>
                <span>198g / 200g</span>
              </div>
              <div className="flex justify-between">
                <span>Fat</span>
                <span>62g / 65g</span>
              </div>
              <div className="mt-4 h-1 w-full rounded-pill bg-surface-ink/10">
                <div className="h-full w-[97%] rounded-pill bg-surface-ink/30" />
              </div>
              <p className="text-xs uppercase tracking-widest text-surface-ink/40">
                You&rsquo;re 53 cal under target.
              </p>
            </div>

            <motion.svg
              viewBox="0 0 400 280"
              className="absolute inset-0 h-full w-full"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              viewport={viewportOnce}
              aria-hidden
            >
              <motion.line
                x1="20"
                y1="40"
                x2="380"
                y2="240"
                stroke="#D9442B"
                strokeWidth="6"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
                viewport={viewportOnce}
              />
            </motion.svg>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-5 text-sm uppercase tracking-[0.2em] text-surface-ink/55"
          >
            Not another diet app.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
          className="flex flex-col justify-center"
        >
          <motion.div
            variants={fadeUp}
            className="relative aspect-[4/5] overflow-hidden rounded-card bg-pastel-peach shadow-lift"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(232,112,79,0.4),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(91,138,74,0.35),transparent_55%)]"
            />
            <div className="absolute inset-0 grid place-items-center text-7xl">🥘</div>
            <div className="absolute bottom-5 left-5 right-5 rounded-card glass-light p-4">
              <p className="font-display text-2xl text-surface-ink">Persian fesenjan</p>
              <p className="text-sm text-surface-ink/70">
                Pomegranate, walnut, slow-braised chicken — tonight&rsquo;s pick for{' '}
                <em className="text-brand-700">you</em>.
              </p>
            </div>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="mt-8 font-display text-4xl leading-tight tracking-tight text-surface-ink md:text-5xl"
          >
            This is dinner.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-4 max-w-md text-lg text-surface-ink/70"
          >
            You graduated from optimization. Sazon learns what you actually want to eat
            — and helps you cook it.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
