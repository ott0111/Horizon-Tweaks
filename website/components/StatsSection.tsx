'use client';

import { ArrowRight, Gauge, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { FadeIn, StaggerChildren, StaggerItem } from '@/components/MotionWrappers';

const stats = [
  { label: 'Latency reduction', value: '18%', icon: Zap },
  { label: 'Background noise removed', value: '37%', icon: ShieldCheck },
  { label: 'Setup time', value: '< 5 min', icon: Gauge },
  { label: 'Improvement quality', value: 'Premium', icon: Sparkles },
];

export default function StatsSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="max-w-6xl mx-auto rounded-4xl border border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_60%)] p-8 md:p-12">
        <FadeIn className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4">Performance</p>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-[-0.02em] mb-4">
              Refined for smoother play and calmer systems.
            </h2>
            <p className="text-[15px] leading-[1.7] text-zinc-300/80">
              The toolkit focuses on the changes that matter most: less interference, faster response, and a cleaner experience from the first launch.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm font-medium text-zinc-200/90">
            Built for modern systems
            <ArrowRight className="size-4" />
          </div>
        </FadeIn>

        <StaggerChildren className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <StaggerItem key={stat.label}>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
                  <div className="mb-4 inline-flex rounded-full border border-white/8 bg-white/5 p-2.5 text-zinc-100">
                    <Icon className="size-4" />
                  </div>
                  <div className="text-3xl font-semibold tracking-[-0.02em] text-white">{stat.value}</div>
                  <div className="mt-2 text-sm text-zinc-400">{stat.label}</div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>
      </div>
    </section>
  );
}
