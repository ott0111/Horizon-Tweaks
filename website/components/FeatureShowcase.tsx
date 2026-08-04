'use client';

import { useState } from 'react';
import { Cpu, Network, Gamepad2, Shield, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const categories = [
  {
    id: 'system',
    label: 'System',
    tag: 'SYSTEM',
    icon: Cpu,
    title: 'System Tweaks',
    description:
      'Deep-level Windows tuning with snapshot rollback. General and advanced tweak catalogs, startup management, and process control.',
    highlights: ['General & advanced tweak engine', 'Startup & process managers', 'Automatic rollback points', 'Disk analyzer & cleanup'],
    accent: 'text-accent',
  },
  {
    id: 'network',
    label: 'Graphics & Network',
    tag: 'GPU / NET',
    icon: Network,
    title: 'GPU & Network',
    description:
      'Fine-tune your network stack for lower latency and analyze Wi-Fi channels. Display info with EDID data, refresh rates, and monitor timings.',
    highlights: ['Network stack optimization', 'Real-time latency monitor (DPC)', 'Wi-Fi analyzer & channel scan', 'Display EDID & refresh data'],
    accent: 'text-accent',
  },
  {
    id: 'gaming',
    label: 'Gaming Suite',
    tag: 'GAMING',
    icon: Gamepad2,
    title: 'Game Booster & Profiles',
    description:
      'One-click Game Booster kills background tasks and sets power plans. Per-game optimization profiles detect installed titles and apply targeted changes.',
    highlights: ['One-click Game Booster', 'Per-game profile system', 'Background task cleanup', 'Power plan optimization'],
    accent: 'text-white',
  },
  {
    id: 'privacy',
    label: 'Cleanup & Privacy',
    tag: 'DEBLOAT',
    icon: Shield,
    title: 'Debloat & Privacy',
    description:
      'Remove pre-installed bloatware, disable telemetry, and clean unnecessary services. Privacy dashboard gives you a clear view of what Windows is tracking.',
    highlights: ['Windows debloating suite', 'Telemetry & service removal', 'Privacy dashboard', 'Disk analyzer for cleanup'],
    accent: 'text-accent',
  },
  {
    id: 'benchmark',
    label: 'Benchmark Suite',
    tag: 'BENCHMARK',
    icon: Gauge,
    title: 'Benchmark Suite',
    description:
      'Built-in benchmarking for CPU, memory, disk, GPU, compression, and stress tests. Track scores over time and compare against reference hardware.',
    highlights: ['10 benchmark categories', 'Score history & trends', 'Hardware reference tables', 'Before/after tweak comparison'],
    accent: 'text-accent',
  },
];

export default function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const current = categories[active];
  const Icon = current.icon;

  return (
    <section className="pb-32 md:pb-40 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-center gap-1.5 mb-12">
          {categories.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-full text-[11px] font-medium tracking-wide transition-all duration-300 ${
                active === i
                  ? 'bg-white text-black'
                  : 'text-white/55 hover:text-white/65 hover:bg-white/[0.05]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="gradient-border rounded-3xl overflow-hidden">
          <div className="rounded-3xl p-8 md:p-12 lg:p-14">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${current.accent}`}>{current.tag}</span>
                    <span className="text-white/10">/</span>
                    <span className="text-[10px] text-white/15 font-mono">{String(active + 1).padStart(2, '0')} / {String(categories.length).padStart(2, '0')}</span>
                  </div>
                  <h3 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-5">{current.title}</h3>
                  <p className="text-white/45 text-sm md:text-base leading-relaxed mb-8">{current.description}</p>
                  <ul className="space-y-3">
                    {current.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-3 text-sm text-white/55">
                        <span className={`size-1 rounded-full shrink-0 ${current.accent.replace('text-', 'bg-')} opacity-50`} />
                        {h}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>

              <div className="relative flex items-center justify-center min-h-[300px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.03 }}
                    transition={{ duration: 0.3 }}
                    className="relative glass-panel rounded-2xl p-10 w-full max-w-sm mx-auto text-center"
                  >
                    <div className="size-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-white/[0.05] border border-white/[0.04]">
                      <Icon className={`size-7 ${current.accent} opacity-60`} />
                    </div>
                    <p className="font-display text-lg font-bold text-white mb-1">{current.label}</p>
                    <p className="text-[11px] text-white/35">Runs locally on your machine</p>
                    <div className="mt-6 pt-5 border-t border-white/[0.04] flex items-center justify-center gap-2 text-[9px] text-white/15 uppercase tracking-[0.2em]">
                      Horizon Tweaks Desktop
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
