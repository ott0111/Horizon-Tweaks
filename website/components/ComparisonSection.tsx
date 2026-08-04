'use client';

import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeIn, StaggerChildren, StaggerItem } from '@/components/MotionWrappers';

const rows = [
  ['Background services', '❌', '✅'],
  ['Registry optimization', '❌', '✅'],
  ['Network tuning', '❌', '✅'],
  ['FPS optimization', '❌', '✅'],
  ['Restore points', '❌', '✅'],
  ['Game profiles', '❌', '✅'],
];

export default function ComparisonSection() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        <FadeIn className="max-w-3xl mb-12">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4">Comparison</p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-[-0.02em] mb-4">
            Default Windows vs. a tuned setup.
          </h2>
          <p className="text-[15px] leading-[1.7] text-zinc-300/80">
            The difference is not cosmetic. It shows up in responsiveness, network stability, and how much background noise your system carries.
          </p>
        </FadeIn>

        <StaggerChildren className="overflow-hidden rounded-3xl border border-white/8 bg-white/3 backdrop-blur-xl">
          <div className="grid grid-cols-[1.4fr_1fr_1fr] border-b border-white/5 bg-white/4 px-4 py-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            <span>Feature</span>
            <span>Default Windows</span>
            <span>Horizon Tweaks</span>
          </div>

          {rows.map(([feature, defaultValue, boostValue]) => (
            <StaggerItem key={feature}>
              <motion.div
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                className="grid grid-cols-[1.4fr_1fr_1fr] items-center px-4 py-4 text-sm text-zinc-300/80 border-t border-white/5"
              >
                <span className="font-medium text-zinc-200">{feature}</span>
                <span className="flex items-center gap-2 text-zinc-400">
                  <X className="size-4 text-zinc-500" />
                  {defaultValue}
                </span>
                <span className="flex items-center gap-2 text-zinc-200">
                  <Check className="size-4 text-zinc-100" />
                  {boostValue}
                </span>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
