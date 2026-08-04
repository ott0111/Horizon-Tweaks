'use client';

import Link from 'next/link';
import { TrendingUp, DollarSign, Layers, ShieldCheck, ArrowRight, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeIn, SlideUp, StaggerChildren, StaggerItem } from '@/components/MotionWrappers';

const stats = [
  { icon: TrendingUp, value: '35%', label: 'FPS <b>gain</b>', sub: '<i>In select titles</i> after full tweak pass', color: 'text-stone-300' },
  { icon: DollarSign, value: '$400+', label: '<b>Saved</b>', sub: '<i>vs. typical</i> hardware upgrades', color: 'text-stone-300' },
  { icon: Layers, value: '22+', label: '<b>Modules</b>', sub: '<i>Dashboard, tweaks,</i> network, benchmark', color: 'text-stone-300' },
  { icon: ShieldCheck, value: '100%', label: '<b>Local</b>', sub: '<i>Nothing runs</i> in the cloud', color: 'text-stone-300' },
];

interface ValuePropositionProps {
  showFull?: boolean;
}

export default function ValueProposition({ showFull = true }: ValuePropositionProps) {
  return (
    <section className="py-28 md:py-36 px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-3" />
        <div className="ambient-orb ambient-orb-4" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <FadeIn className="text-center mb-16">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25 mb-4 font-display">Smart Investment</p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-[-0.02em] mb-5">
            At a <span className="gradient-text-sky">fraction</span> of<br />
            <span className="text-white/30 italic">upgrade costs</span>
          </h2>
          <p className="text-white/55 text-base max-w-lg mx-auto leading-relaxed font-light">
            Unlock <b>meaningful performance</b> from your <i>current hardware.</i>
          </p>
        </FadeIn>

        <StaggerChildren className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <StaggerItem key={s.label}>
                <motion.div
                  className="rounded-2xl p-6 text-center border border-white/[0.06] backdrop-blur-sm"
                  style={{
                    background: 'impulse-gradient(165deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(0,0,0,0.2) 100%)',
                  }}
                  whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25 } }}
                >
                  <Icon className={`size-4 mx-auto mb-4 ${s.color} opacity-50`} />
                  <div className={`font-display text-3xl md:text-4xl font-black ${s.color} mb-1 tracking-tight`}>{s.value}</div>
                  <div className="text-sm font-bold text-white/60 mb-1" dangerouslySetInnerHTML={{ __html: s.label }} />
                  <div className="text-[11px] text-white/35 leading-snug" dangerouslySetInnerHTML={{ __html: s.sub }} />
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>

        {showFull && (
          <>
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <SlideUp delay={0.1}>
                <div className="rounded-2xl p-8 text-center border border-white/[0.06] backdrop-blur-sm" style={{ background: 'impulse-gradient(165deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.3) 100%)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/15 mb-4 font-display">Hardware upgrade</p>
                  <p className="font-display text-5xl font-black text-white/15 mb-2">$400+</p>
                  <p className="text-xs text-white/15 italic">Average market cost per component</p>
                </div>
              </SlideUp>
              <SlideUp delay={0.2}>
                <div className="rounded-2xl p-8 text-center border border-stone-300/20 backdrop-blur-sm animate-glow-pulse" style={{ background: 'impulse-gradient(165deg, rgba(214,209,202,0.08) 0%, rgba(214,209,202,0.03) 50%, rgba(0,0,0,0.2) 100%)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-300/60 mb-4 font-display">
                    <Star className="size-3 inline mr-1" />
                    Horizon Tweaks <b>Pro</b>
                  </p>
                  <p className="font-display text-5xl font-black text-white mb-2">$29.99</p>
                  <p className="text-xs text-white/55"><b>One-time</b> &middot; <i>lifetime access &mdash; no subscription</i></p>
                </div>
              </SlideUp>
            </div>

            <FadeIn delay={0.4} className="text-[11px] text-white/15 text-center mt-10 max-w-md mx-auto leading-relaxed font-mono">
              Built lightweight. Some features powered by AI.
            </FadeIn>
          </>
        )}

        {!showFull && (
          <div className="text-center">
            <Link href="/pricing" className="inline-flex items-center gap-2 text-sm font-medium text-white/55 hover:text-white/65 transition-colors">
              <b>See</b> <i>full</i> <b>comparison</b>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
