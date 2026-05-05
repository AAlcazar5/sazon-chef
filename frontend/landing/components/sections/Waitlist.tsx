'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

const CUISINES = [
  { label: 'Italian', emoji: '🇮🇹' },
  { label: 'Mexican', emoji: '🌮' },
  { label: 'Korean', emoji: '🇰🇷' },
  { label: 'Japanese', emoji: '🍣' },
  { label: 'Persian', emoji: '🌹' },
  { label: 'Thai', emoji: '🌶️' },
  { label: 'Indian', emoji: '🇮🇳' },
  { label: 'Mediterranean', emoji: '🫒' },
  { label: 'French', emoji: '🥖' },
  { label: 'Vietnamese', emoji: '🍜' },
  { label: 'Lebanese', emoji: '🧆' },
  { label: 'Caribbean', emoji: '🌴' },
];

const MACRO_GOALS = [
  { label: 'Lighter', value: 'lighter' },
  { label: 'Strong + lean', value: 'strong_lean' },
  { label: 'Flavor-first, balanced', value: 'flavor_balanced' },
  { label: 'Discovery mode', value: 'discovery' },
];

const DIETARY = ['Gluten', 'Dairy', 'Nuts', 'Shellfish', 'Pork', 'Eggs', 'None'];

export function Waitlist() {
  const [email, setEmail] = useState('');
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [macroGoal, setMacroGoal] = useState<string | null>(null);
  const [dietary, setDietary] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const toggleDiet = (d: string) => {
    setDietary((prev) => {
      if (d === 'None') return prev.includes('None') ? [] : ['None'];
      const next = prev.filter((x) => x !== 'None');
      return next.includes(d) ? next.filter((x) => x !== d) : [...next, d];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          topCuisine: cuisine,
          macroGoal,
          dietary,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        setStatus('error');
        setErrorMsg(json.error ?? 'Something went sideways. Mind trying again?');
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Couldn’t reach the server. Check your connection?');
    }
  };

  if (status === 'success') {
    return (
      <section
        id="waitlist"
        className="relative bg-screen-warm py-24 md:py-32"
        aria-live="polite"
      >
        <div className="mx-auto max-w-2xl px-6 md:px-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-sheet bg-surface-cream p-10 text-center shadow-lift"
          >
            <motion.div
              initial={{ rotate: -8, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14 }}
              className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-pill bg-pastel-peach shadow-soft"
            >
              <img
                src="/mascot/sazon-logo.svg"
                alt="Sazon mascot welcoming you"
                className="h-16 w-16"
              />
            </motion.div>
            <h2 className="font-display text-4xl tracking-tight text-surface-ink">
              Welcome.
            </h2>
            <p className="mt-3 text-lg text-surface-ink/70">
              Sazon&rsquo;s already learning. We&rsquo;ll email you the moment your seat
              opens — and your day-1 feed will already know what you like.
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" className="relative bg-screen-warm py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 md:px-10">
        <motion.form
          onSubmit={handleSubmit}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
          className="rounded-sheet bg-surface-cream p-8 shadow-lift md:p-12"
        >
          <motion.div variants={fadeUp} className="mb-8 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              Early access
            </span>
            <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-surface-ink md:text-5xl">
              Get 30 days free Premium at launch.
            </h2>
            <p className="mt-4 text-base text-surface-ink/70 md:text-lg">
              Tell us a little about how you eat — we&rsquo;ll seed your day-1 feed
              before you even open the app.
            </p>
          </motion.div>

          <motion.fieldset variants={fadeUp} className="mb-7">
            <legend className="mb-3 text-sm font-semibold text-surface-ink">
              Top cuisine
            </legend>
            <div className="flex flex-wrap gap-2">
              {CUISINES.map((c) => (
                <Chip
                  key={c.label}
                  label={c.label}
                  emoji={c.emoji}
                  selected={cuisine === c.label}
                  onSelect={() => setCuisine(cuisine === c.label ? null : c.label)}
                />
              ))}
            </div>
          </motion.fieldset>

          <motion.fieldset variants={fadeUp} className="mb-7">
            <legend className="mb-3 text-sm font-semibold text-surface-ink">
              How you want to eat
            </legend>
            <div className="flex flex-wrap gap-2">
              {MACRO_GOALS.map((g) => (
                <Chip
                  key={g.value}
                  label={g.label}
                  selected={macroGoal === g.value}
                  onSelect={() =>
                    setMacroGoal(macroGoal === g.value ? null : g.value)
                  }
                />
              ))}
            </div>
          </motion.fieldset>

          <motion.fieldset variants={fadeUp} className="mb-7">
            <legend className="mb-3 text-sm font-semibold text-surface-ink">
              Anything to avoid
            </legend>
            <div className="flex flex-wrap gap-2">
              {DIETARY.map((d) => (
                <Chip
                  key={d}
                  label={d}
                  selected={dietary.includes(d)}
                  onSelect={() => toggleDiet(d)}
                />
              ))}
            </div>
          </motion.fieldset>

          <motion.div variants={fadeUp} className="mb-2">
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-surface-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@kitchen.com"
              className="w-full rounded-pill border border-surface-ink/10 bg-white px-6 py-4 text-base text-surface-ink shadow-soft outline-none transition-shadow focus:border-brand-300 focus:shadow-glow"
            />
          </motion.div>

          {status === 'error' ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="mt-3 text-sm text-accent-paprika"
            >
              {errorMsg}
            </motion.p>
          ) : null}

          <motion.button
            variants={fadeUp}
            type="submit"
            disabled={status === 'submitting' || !email}
            whileHover={status === 'submitting' ? undefined : { scale: 1.02 }}
            whileTap={status === 'submitting' ? undefined : { scale: 0.97 }}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-brand-gradient px-7 py-4 text-base font-semibold text-white shadow-lift transition-opacity disabled:opacity-60"
          >
            {status === 'submitting' ? (
              <>Saving your seat…</>
            ) : (
              <>
                Save my seat
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex items-center justify-center gap-4 opacity-60"
          >
            <div className="flex items-center gap-2 rounded-pill bg-surface-ink/5 px-4 py-2 text-xs font-medium text-surface-ink/70">
              <Check className="h-3.5 w-3.5" />
              App Store
              <span className="text-[10px] uppercase tracking-widest">Coming</span>
            </div>
            <div className="flex items-center gap-2 rounded-pill bg-surface-ink/5 px-4 py-2 text-xs font-medium text-surface-ink/70">
              <Check className="h-3.5 w-3.5" />
              Google Play
              <span className="text-[10px] uppercase tracking-widest">Coming</span>
            </div>
          </motion.div>
        </motion.form>
      </div>
    </section>
  );
}
