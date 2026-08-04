'use client';

import { Code2, Crown, Shield, Users, Target, Zap, ShieldCheck, Globe, ArrowRight, Download, Wrench } from 'lucide-react';
import Link from 'next/link';
import { FadeIn, SlideUp, StaggerChildren, StaggerItem } from '@/components/MotionWrappers';

const team = [
  {
    name: 'Alexander',
    role: 'Developer & Owner',
    icon: Code2,
    color: '#d6d1ca',
    gradient: 'from-stone-300/20 to-stone-400/20',
    borderGradient: 'from-stone-300/40 to-stone-400/40',
    badges: ['Developer', 'Owner'],
    desc: 'Architect of the core engine. Built the optimization framework from scratch.',
  },
  {
    name: 'Yeezy',
    role: 'Owner',
    icon: Crown,
    color: '#d6d1ca',
    gradient: 'from-stone-300/20 to-stone-400/20',
    borderGradient: 'from-stone-300/40 to-stone-400/40',
    badges: ['Owner'],
    desc: 'Strategic vision and product direction. Drives Impulse forward.',
  },
];

const values = [
  {
    icon: Zap,
    title: 'Performance First',
    desc: 'Every optimization is engineered to extract maximum performance without compromising stability.',
  },
  {
    icon: ShieldCheck,
    title: 'Safety & Reliability',
    desc: 'All tweaks are tested extensively. Built-in rollback ensures you can always revert changes.',
  },
  {
    icon: Target,
    title: 'Precision Engineering',
    desc: 'Fine-grained control over every system setting. Nothing is left to chance.',
  },
  {
    icon: Globe,
    title: 'Accessible to Everyone',
    desc: 'Professional-grade optimization in an intuitive interface. No degree required.',
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
        </div>

        <div className="max-w-6xl mx-auto relative space-y-32">

          {/* Mission */}
          <FadeIn className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-medium text-white/35 mb-5 tracking-wide">
              <Target className="size-3" />
              Our Mission
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-extrabold text-white mb-8 tracking-[-0.03em]">
              About{' '}
              <span className="gradient-text">Horizon Tweaks</span>
            </h1>
            <p className="text-white/65 max-w-2xl mx-auto text-base md:text-lg leading-relaxed font-light">
              To provide the most advanced, safe, and efficient system optimizations in the industry, making technical perfection accessible to everyone.
            </p>
            <p className="text-white/55 max-w-xl mx-auto text-sm leading-relaxed mt-4 font-light">
              Built from the ground up to eliminate the complexity of Windows performance tuning.
            </p>
          </FadeIn>

          {/* Values */}
          <SlideUp>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-display font-extrabold text-white mb-4 tracking-[-0.02em]">What We Stand For</h2>
              <p className="text-white/55 text-sm max-w-md mx-auto font-light">Four pillars that guide every decision.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {values.map((v, i) => {
                const Icon = v.icon;
                return (
                  <div key={v.title} className="glass-card card-3d rounded-2xl p-6 text-center liquid-shine">
                    <div className="inline-flex size-11 rounded-xl bg-white/[0.05] border border-white/[0.04] items-center justify-center mb-4">
                      <Icon className="size-4.5 text-accent/50" />
                    </div>
                    <h3 className="text-[13px] font-bold text-white/80 mb-2">{v.title}</h3>
                    <p className="text-[11px] text-white/55 leading-relaxed">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </SlideUp>

          {/* Team */}
          <SlideUp>
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-medium text-white/35 mb-5 tracking-wide">
                <Users className="size-3" />
                Our Team
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-extrabold text-white mb-4 tracking-[-0.02em]">Meet the People Behind Impulse</h2>
              <p className="text-white/55 text-sm max-w-md mx-auto font-light">A small team with a big mission.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {team.map((member, i) => {
                const Icon = member.icon;
                return (
                  <div key={member.name} className="group card-3d-deep">
                    <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6 overflow-hidden">
                      {/* Subtle gradient glow */}
                      <div
                        className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                        style={{ background: `radial-gradient(circle, ${member.color}15, transparent)` }}
                      />

                      <div className="relative flex items-start gap-4">
                        <div
                          className="size-12 rounded-xl flex items-center justify-center shrink-0 border"
                          style={{
                            background: `impulse-gradient(135deg, ${member.color}10, ${member.color}05)`,
                            borderColor: `${member.color}15`,
                          }}
                        >
                          <Icon className="size-5" style={{ color: member.color }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-white/90 mb-0.5">{member.name}</h3>
                          <p className="text-[11px] font-medium mb-2" style={{ color: `${member.color}90` }}>
                            {member.role}
                          </p>
                          <p className="text-[11px] text-white/55 leading-relaxed">{member.desc}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-white/[0.04]">
                        {member.badges.map((badge) => (
                          <span
                            key={badge}
                            className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/[0.04] text-white/45 uppercase tracking-wider"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SlideUp>

          {/* CTA */}
          <FadeIn className="text-center">
            <div className="gradient-border rounded-3xl inline-block">
              <div className="glass-panel rounded-3xl px-12 py-14">
                <h2 className="text-2xl font-display font-extrabold text-white mb-3 tracking-tight">Ready to Optimize?</h2>
                <p className="text-sm text-white/55 mb-8 font-light">Join thousands of users who trust Impulse.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/download" className="pill-button text-sm">
                    <Download className="size-4" />
                    Get Horizon Tweaks
                  </Link>
                  <Link href="/pricing" className="text-sm font-medium text-white/55 hover:text-white/65 transition-colors inline-flex items-center gap-1.5">
                    <Wrench className="size-3.5" />
                    View pricing
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>

        </div>
      </section>
    </>
  );
}
