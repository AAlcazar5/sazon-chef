'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useRef } from 'react';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const veilOpacity = useTransform(scrollYProgress, [0, 1], [1, 1.4]);
  const headlineScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);

  return (
    <section
      ref={ref}
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-surface-ink"
      aria-label="Sazon hero"
    >
      <motion.div
        aria-hidden
        style={{ y: videoY }}
        className="absolute inset-0 h-[120%] w-full"
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-poster.jpg"
          className="h-full w-full object-cover"
        >
          <source src="/hero-loop.mp4" type="video/mp4" />
        </video>
      </motion.div>

      <motion.div
        aria-hidden
        style={{ opacity: veilOpacity }}
        className="absolute inset-0 bg-hero-veil"
      />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 pt-6 md:px-10 md:pt-8">
        <a href="#top" className="flex items-center gap-2 text-white">
          <span className="grid h-10 w-10 place-items-center rounded-pill bg-white/10 shadow-soft glass">
            <img
              src="/mascot/sazon-logo.svg"
              alt=""
              aria-hidden
              className="h-7 w-7"
            />
          </span>
          <span className="font-display text-2xl tracking-tight">Sazon</span>
        </a>

        <nav className="hidden items-center gap-1 rounded-pill px-2 py-2 text-sm text-white/90 md:flex glass">
          <a className="rounded-pill px-4 py-1.5 hover:bg-white/10" href="#how">
            How it works
          </a>
          <a className="rounded-pill px-4 py-1.5 hover:bg-white/10" href="#engine">
            Personalization
          </a>
          <a className="rounded-pill px-4 py-1.5 hover:bg-white/10" href="#waitlist">
            Waitlist
          </a>
        </nav>

        <a
          href="#waitlist"
          className="inline-flex items-center gap-2 rounded-pill bg-white px-5 py-2.5 text-sm font-semibold text-surface-ink shadow-soft transition-transform hover:scale-[1.02] active:scale-[0.97]"
        >
          Get early access
          <ArrowRight className="h-4 w-4" />
        </a>
      </header>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ scale: headlineScale }}
        className="relative z-10 mx-auto flex h-[calc(100%-80px)] max-w-5xl flex-col items-start justify-center px-6 md:px-10"
      >
        <motion.span
          variants={fadeUp}
          className="mb-5 inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/90 glass"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-pastel-peach" />
          Past the spreadsheet
        </motion.span>

        <motion.h1
          variants={fadeUp}
          className="text-balance font-display text-5xl leading-[0.95] tracking-tight text-white md:text-7xl lg:text-[88px]"
        >
          Eat the world. <em className="not-italic text-pastel-peach">Live well.</em>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-xl text-balance text-lg text-white/85 md:text-xl"
        >
          The cooking app for people past the spreadsheet. Real food, made for{' '}
          <em className="not-italic text-pastel-peach">you</em>, from everywhere — with
          everything you want to know about it.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-3">
          <a
            href="#waitlist"
            className="group inline-flex items-center gap-2 rounded-pill bg-brand-gradient px-7 py-4 text-base font-semibold text-white shadow-lift transition-transform hover:scale-[1.02] active:scale-[0.97]"
          >
            Join the waitlist
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#engine"
            className="inline-flex items-center gap-2 rounded-pill border border-white/30 px-7 py-4 text-base font-medium text-white transition-colors hover:bg-white/10"
          >
            See how it learns
          </a>
        </motion.div>

        <motion.ul
          variants={fadeUp}
          className="mt-10 flex flex-wrap items-center gap-2 text-xs font-medium text-white/85"
        >
          {['141 cuisines', '4,700+ recipes', 'iOS + Android'].map((label) => (
            <li
              key={label}
              className="rounded-pill px-3.5 py-1.5 glass"
            >
              {label}
            </li>
          ))}
        </motion.ul>

        <motion.a
          href="#anti"
          variants={fadeUp}
          aria-label="Scroll to next section"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 hover:text-white md:bottom-10"
        >
          <ChevronDown className="h-6 w-6 animate-bounce" />
        </motion.a>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={fadeUp}
      />
    </section>
  );
}
