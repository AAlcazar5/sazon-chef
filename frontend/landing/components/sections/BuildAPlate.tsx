'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CountUp } from '@/components/ui/CountUp';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

interface SlotOption {
  emoji: string;
  label: string;
  color: string;
}

const PROTEIN: SlotOption[] = [
  { emoji: '🍗', label: 'Glazed bites', color: 'bg-pastel-peach' },
  { emoji: '🐟', label: 'Miso salmon', color: 'bg-pastel-blush' },
  { emoji: '🫘', label: 'Spiced lentils', color: 'bg-pastel-golden' },
];
const CARB: SlotOption[] = [
  { emoji: '🍚', label: 'Saffron rice', color: 'bg-pastel-golden' },
  { emoji: '🍞', label: 'Sourdough', color: 'bg-pastel-peach' },
  { emoji: '🍝', label: 'Orzo', color: 'bg-pastel-sage' },
];
const VEG: SlotOption[] = [
  { emoji: '🥗', label: 'Charred kale', color: 'bg-pastel-sage' },
  { emoji: '🥒', label: 'Smashed cukes', color: 'bg-pastel-sky' },
  { emoji: '🍆', label: 'Miso eggplant', color: 'bg-pastel-lavender' },
];

function Slot({ options, label, delay }: { options: SlotOption[]; label: string; delay: number }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % options.length), 2500);
    return () => clearInterval(t);
  }, [options.length]);
  const opt = options[idx];

  return (
    <motion.div
      variants={fadeUp}
      transition={{ delay }}
      className="flex flex-col items-center gap-3"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-ink/60">
        {label}
      </span>
      <div className="relative h-36 w-36 md:h-40 md:w-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={opt.label}
            initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.95, rotate: 4 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute inset-0 grid place-items-center rounded-card ${opt.color} text-6xl shadow-soft`}
          >
            {opt.emoji}
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait">
        <motion.span
          key={opt.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium text-surface-ink"
        >
          {opt.label}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

export function BuildAPlate() {
  return (
    <section
      id="engine"
      className="relative overflow-hidden py-24 md:py-32"
      style={{
        background:
          'linear-gradient(135deg, #FFD9C4 0%, #C8DCC4 100%)',
      }}
    >
      <div
        aria-hidden
        className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-pastel-blush blur-3xl opacity-50"
      />
      <div
        aria-hidden
        className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-pastel-lavender blur-3xl opacity-50"
      />

      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
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
            Flagship feature
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-3 font-display text-4xl leading-tight tracking-tight text-surface-ink md:text-5xl"
          >
            Build a plate that&rsquo;s <em className="not-italic text-brand-700">yours</em>.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-xl text-lg text-surface-ink/75"
          >
            Pick one of each. Sazon sweats the rest — your taste, your pantry, your week.
            Plate ready in 4 taps.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
          className="relative rounded-sheet bg-white/55 p-8 shadow-lift backdrop-blur-md md:p-12"
        >
          <div className="grid grid-cols-3 gap-6 md:gap-10">
            <Slot options={PROTEIN} label="Protein" delay={0} />
            <Slot options={CARB} label="Carb" delay={0.15} />
            <Slot options={VEG} label="Veg" delay={0.3} />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={viewportOnce}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="absolute -top-3 left-8 inline-flex items-center gap-1.5 rounded-pill bg-surface-ink px-3 py-1.5 text-xs font-medium text-white shadow-lift md:left-16"
          >
            <Sparkles className="h-3.5 w-3.5 text-pastel-peach" />
            What if? Try miso salmon
          </motion.div>

          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-surface-ink/10 pt-6 text-center md:grid-cols-4">
            <div>
              <div className="font-display text-3xl text-surface-ink">
                <CountUp to={612} />
              </div>
              <div className="text-xs uppercase tracking-widest text-surface-ink/60">
                kcal
              </div>
            </div>
            <div>
              <div className="font-display text-3xl text-surface-ink">
                <CountUp to={48} suffix="g" />
              </div>
              <div className="text-xs uppercase tracking-widest text-surface-ink/60">
                protein
              </div>
            </div>
            <div>
              <div className="font-display text-3xl text-surface-ink">
                <CountUp to={18} />
              </div>
              <div className="text-xs uppercase tracking-widest text-surface-ink/60">
                ingredients
              </div>
            </div>
            <div className="hidden md:block">
              <div className="font-display text-3xl text-surface-ink">Mg</div>
              <div className="text-xs uppercase tracking-widest text-surface-ink/60">
                top mineral
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
