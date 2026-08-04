'use client';

import Link from 'next/link';
import { ArrowRight, Cpu, Layers, ShieldCheck, Download, Sparkles, Wifi, KeyRound, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { StaggerChildren, StaggerItem } from '@/components/MotionWrappers';

const cards = [
  {
    href: '/download',
    icon: Download,
    title: 'Impulse Free',
    desc: 'Start with the core toolbox for instant performance tuning and rollback support.',
    features: ['Quick optimization', 'Rollback support', 'Windows 10/11 ready'],
    price: 'Free',
    accent: 'text-zinc-200',
  },
  {
    href: '/pricing',
    icon: Sparkles,
    title: 'Impulse Pro',
    desc: 'Unlock deeper modules, benchmarking, and premium tuning workflows.',
    features: ['Benchmark suite', 'Advanced modules', 'Priority support'],
    price: 'From $14.99/mo',
    accent: 'text-white',
  },
  {
    href: '/services',
    icon: Wrench,
    title: 'Manual Optimization',
    desc: 'Book a live service for hands-on tuning, debloat, and game performance fixes.',
    features: ['Discord bookings', 'Hands-on support', 'Custom tuning plans'],
    price: 'From $25',
    accent: 'text-zinc-200',
  },
  {
    href: '/platform',
    icon: Wifi,
    title: 'Network Optimization',
    desc: 'Reduce ping, stabilize routing, and clean up network-related bottlenecks.',
    features: ['Ping tuning', 'Network cleanup', 'Latency improvements'],
    price: 'Included',
    accent: 'text-zinc-200',
  },
  {
    href: '/pricing',
    icon: KeyRound,
    title: 'License Keys',
    desc: 'Activate premium access instantly with a simple, secure license flow.',
    features: ['Fast activation', 'Instant tier unlock', 'Secure checkout'],
    price: 'One-time access',
    accent: 'text-zinc-200',
  },
  {
    href: '/features',
    icon: Layers,
    title: 'All Modules',
    desc: 'Browse the full library of module-based tweaks for gaming, privacy, and speed.',
    features: ['22+ modules', 'Live rollback', 'Zero cloud dependency'],
    price: 'Explore',
    accent: 'text-zinc-200',
  },
];

export default function HomeHighlights() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl mb-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-4">Products</p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-[-0.02em] mb-4">
            Choose the path that fits your setup.
          </h2>
          <p className="text-[15px] leading-[1.7] text-zinc-300/80">
            From instant DIY tweaks to hands-on optimization, every product is designed to feel fast, clear, and trustworthy.
          </p>
        </div>

        <StaggerChildren className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <StaggerItem key={card.href}>
                <motion.div
                  whileHover={{ y: -7, scale: 1.01, transition: { duration: 0.2 } }}
                  className="group h-full rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl shadow-[0_12px_60px_-24px_rgba(0,0,0,0.7)]"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.05]">
                      <Icon className={`size-5 ${card.accent}`} />
                    </div>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      {card.price}
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-semibold text-white mb-2">{card.title}</h3>
                  <p className="text-[14px] leading-[1.7] text-zinc-300/80 mb-5">{card.desc}</p>

                  <ul className="space-y-2 text-[13px] text-zinc-400 mb-6">
                    {card.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <ShieldCheck className="size-3.5 text-zinc-200" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={card.href}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-200 transition-colors duration-300 hover:text-white"
                  >
                    Explore
                    <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>
      </div>
    </section>
  );
}
