'use client';

import { Monitor, RotateCcw, FlaskConical, RefreshCw, HeadphonesIcon, Shield, Lock, MessageCircle, CreditCard } from 'lucide-react';
import { FadeIn, StaggerChildren, StaggerItem } from '@/components/MotionWrappers';
import { motion } from 'framer-motion';

const pillars = [
  {
    icon: Monitor,
    title: 'Windows 10 & 11 Ready',
    desc: 'Built for modern x64 systems with a focused, reliable experience from first launch.',
  },
  {
    icon: RotateCcw,
    title: 'Safe & Reversible',
    desc: 'Every tweak is paired with rollback options so you can restore your system with confidence.',
  },
  {
    icon: FlaskConical,
    title: 'Proven Modules',
    desc: '22+ performance modules cover debloat, services, networking, benchmarks, and game tuning.',
  },
  {
    icon: RefreshCw,
    title: 'Lifetime Updates',
    desc: 'Stay current with ongoing improvements, new modules, and quality-of-life refinements.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Discord Support',
    desc: 'Get answers quickly through our active support channel for purchases and troubleshooting.',
  },
  {
    icon: CreditCard,
    title: 'Secure Payments',
    desc: 'Checkout is simple, secure, and designed to feel premium from the first click.',
  },
];

export default function TrustSection() {
  return (
    <section className="px-6 py-24 md:py-32 border-y border-white/[0.06] relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-3" />
      </div>
      <div className="max-w-6xl mx-auto relative">
        <FadeIn className="max-w-3xl mb-14">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4">Built on Trust</p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-[-0.02em] mb-4">
            Premium tools, local execution, and zero guesswork.
          </h2>
          <p className="text-[15px] leading-[1.7] text-zinc-300/80">
            Every experience is designed to feel safe, transparent, and professional from setup through daily use.
          </p>
        </FadeIn>

        <StaggerChildren className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <StaggerItem key={pillar.title}>
                <motion.div
                  className="group rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl"
                  whileHover={{ y: -6, scale: 1.01, transition: { duration: 0.2 } }}
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.05]">
                    <Icon className="size-4 text-zinc-200" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white mb-2">{pillar.title}</h3>
                  <p className="text-[14px] leading-[1.7] text-zinc-300/80">{pillar.desc}</p>
                </motion.div>
              </StaggerItem>
            );
          })}

          <StaggerItem>
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl md:col-span-2 xl:col-span-1">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.05]">
                <Lock className="size-4 text-zinc-200" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">Restore Point Protection</h3>
              <p className="text-[14px] leading-[1.7] text-zinc-300/80">
                Safety-first defaults keep your system protected, and our rollback flow makes reverting changes feel effortless.
              </p>
            </div>
          </StaggerItem>
        </StaggerChildren>
      </div>
    </section>
  );
}
