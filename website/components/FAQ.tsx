'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerChildren, StaggerItem } from '@/components/MotionWrappers';

const faqs = [
  {
    q: 'Is Horizon Tweaks safe for my primary PC?',
    a: 'Yes. Every change goes through the built-in rollback system with snapshot support. You can revert tweaks at any time from the Rollback panel.',
  },
  {
    q: 'Does it modify the Windows Registry?',
    a: 'Some tweaks apply registry changes, service configurations, and power plan settings — all executed locally by the desktop app.',
  },
  {
    q: 'Do you offer online PC optimization?',
    a: 'Yes. Horizon Tweaks offers both the Horizon Tweaks desktop application and live remote tuning services for clients who want hands-on optimization.',
  },
  {
    q: 'What is Impulse Benchmark?',
    a: 'The built-in benchmarking suite inside Horizon Tweaks (Pro tier). It runs CPU, memory, disk, GPU, and stress tests locally.',
  },
  {
    q: 'How do purchases work?',
    a: 'Sign in, select Free, Pro, or the service tier you want, and complete checkout while the desktop app is running. Your tier syncs instantly.',
  },
  {
    q: 'What services do you offer?',
    a: 'We offer professional tuning services including Essential Tune, Full Optimization, Network Tune, Debloat, Privacy Lock, and Full System Audit. All bookings are done through Discord.',
  },
  {
    q: 'How do I book a service?',
    a: 'Join our Discord server and open a ticket. Tell us what you need, and we will get you squared away quickly.',
  },
  {
    q: 'Can I use it on a new PC?',
    a: 'Your license is tied to your account. Install Horizon Tweaks on a new machine, sign in, and your tier follows you.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="px-6 pb-28 md:pb-36">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4">FAQ</p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-[-0.02em] mb-3">
            Questions before you dive in?
          </h2>
          <p className="text-[15px] leading-[1.7] text-zinc-300/80">
            Clear answers, transparent safety, and a path to better performance in minutes.
          </p>
        </div>

        <StaggerChildren className="space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <StaggerItem key={i}>
                <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3 backdrop-blur-xl">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-200 hover:bg-white/4"
                  >
                    <span className="text-[13px] font-semibold text-zinc-200">{faq.q}</span>
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="size-3.5 shrink-0 text-zinc-400" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <div className="border-t border-white/5 px-5 pb-4 pt-3 text-[13px] leading-[1.7] text-zinc-300/80">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>
      </div>
    </section>
  );
}
