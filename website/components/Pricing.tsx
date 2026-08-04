'use client';

import { Check, Crown, Zap, Sparkles, Star, Activity, Keyboard, Cpu, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { StaggerChildren, StaggerItem } from '@/components/MotionWrappers';

interface PricingProps {
  userTier: string;
  onBuy: (tier: string) => void;
}

interface Feature {
  ok: boolean;
  text: string;
  ai?: boolean;
}

interface Tier {
  id: string;
  name: string;
  price: string;
  period: string;
  color: string;
  border: string;
  glow: string;
  badge: { text: string; class: string } | null;
  desc: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  features: Feature[];
}

const tiers: Tier[] = [
  {
    id: 'free',
    name: 'Free Edition',
    price: '$0',
    period: '· one-time',
    color: 'text-stone-300',
    border: 'border-white/[0.06]',
    glow: '',
    badge: null,
    desc: 'Start free, upgrade anytime. <span class="text-white/40 italic">No commitment.</span>',
    icon: Sparkles,
    iconBg: 'bg-stone-300/10',
    iconColor: 'text-stone-300',
    features: [
      { ok: true, text: 'Dashboard & <b>system overview</b>' },
      { ok: true, text: '<b>Basic cleanup</b> tools' },
      { ok: true, text: '<b>Restore point</b> creation' },
      { ok: true, text: '<i>Limited</i> safe tweaks' },
      { ok: true, text: 'Performance <b>monitoring</b>' },
      { ok: false, text: 'Startup manager' },
      { ok: false, text: '<b>Gaming profiles</b>' },
      { ok: false, text: 'Advanced debloating' },
    ],
  },
  {
    id: 'basic',
    name: 'Basic License',
    price: '$14.99',
    period: '· one-time',
    color: 'text-stone-300',
    border: 'border-stone-300/20',
    glow: 'shadow-[0_0_80px_-12px_rgba(96,165,250,0.15)]',
    badge: { text: 'Popular', class: 'bg-stone-300 text-black' },
    desc: '<b>Simple performance boost</b> for <i>everyday users.</i>',
    icon: Zap,
    iconBg: 'bg-stone-300/10',
    iconColor: 'text-stone-300',
    features: [
      { ok: true, text: '<b>Everything</b> in Free' },
      { ok: true, text: '<b>Extended cleanup</b> tools' },
      { ok: true, text: '<b>Startup manager</b>' },
      { ok: true, text: '<i>Additional</i> safe tweaks' },
      { ok: true, text: '<b>Simple performance</b> presets' },
      { ok: false, text: '<b>Full</b> optimization suite' },
      { ok: false, text: 'Gaming profiles' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro License',
    price: '$29.99',
    period: '· one-time',
    color: 'text-stone-300',
    border: 'border-stone-300/25',
    glow: 'shadow-[0_0_100px_-16px_rgba(147,197,253,0.2)]',
    badge: { text: '\u2605 Best Seller \u2605', class: 'bg-gradient-to-r from-stone-300 to-stone-400 text-black font-black tracking-wider' },
    desc: '<b>Full performance + gaming suite.</b> <i>This is the one.</i>',
    icon: Star,
    iconBg: 'bg-stone-300/10',
    iconColor: 'text-stone-300',
    features: [
      { ok: true, text: '<b>Everything</b> in Standard' },
      { ok: true, text: '<b>Full Windows</b> optimization suite' },
      { ok: true, text: '<b>Gaming performance</b> profiles' },
      { ok: true, text: '<b>Network optimization</b> tools' },
      { ok: true, text: '<b>Privacy hardening</b> features' },
      { ok: true, text: '<b>Advanced</b> cleanup system' },
      { ok: true, text: '<b>Automated backups</b> + <b>one-click rollback</b>' },
      { ok: true, text: '<b>Priority updates</b>' },
      { ok: false, text: 'Experimental engine' },
    ],
  },
  {
    id: 'ultimate',
    name: 'Ultimate License',
    price: '$59.99',
    period: '· one-time',
    color: 'text-stone-300',
    border: 'border-stone-300/25',
    glow: 'shadow-[0_0_120px_-16px_rgba(96,165,250,0.2)]',
    badge: { text: '\u26A1 Power User', class: 'bg-gradient-to-r from-stone-300 to-stone-400 text-black font-black tracking-wider' },
    desc: '<b>Advanced control.</b> <i>Automation.</i> <b>Early access.</b>',
    icon: Crown,
    iconBg: 'bg-stone-300/10',
    iconColor: 'text-stone-300',
    features: [
      { ok: true, text: '<b>Everything</b> in <b>Pro</b>' },
      { ok: true, text: '<b>Advanced automation</b> tools', ai: true },
      { ok: true, text: '<b>Experimental optimization</b> engine', ai: true },
      { ok: true, text: '<b>AI Driver recommendations</b>', ai: true },
      { ok: true, text: '<b>Early access</b> features' },
      { ok: true, text: '<b>Advanced tuning</b> profiles' },
      { ok: true, text: '<b>Priority support</b>' },
      { ok: true, text: '<i>Streamer & enthusiast</i> tools' },
    ],
  },
];

interface App {
  id: string;
  name: string;
  price: string;
  color: string;
  border: string;
  glow: string;
  desc: string;
  icon: any;
  iconBg: string;
  iconColor: string;
  features: string[];
}

const standaloneApps: App[] = [
  {
    id: 'impulse-ping',
    name: 'Horizon Ping',
    price: '$17.99',
    color: 'text-stone-300',
    border: 'border-stone-300/20',
    glow: 'shadow-[0_0_80px_-12px_rgba(147,197,253,0.12)]',
    desc: 'Network optimization tool',
    icon: Activity,
    iconBg: 'bg-stone-300/10',
    iconColor: 'text-stone-300',
    features: [
      'Network optimization tool',
      'Latency testing and monitoring',
      'Routing diagnostics',
      'Gaming-focused ping improvements',
    ],
  },
  {
    id: 'impulse-keyboard',
    name: 'Horizon Keyboard',
    price: '$12.99',
    color: 'text-stone-300',
    border: 'border-stone-300/20',
    glow: 'shadow-[0_0_80px_-12px_rgba(96,165,250,0.12)]',
    desc: 'Input optimization tool',
    icon: Keyboard,
    iconBg: 'bg-stone-300/10',
    iconColor: 'text-stone-300',
    features: [
      'Macro system',
      'Input optimization tools',
      'Keybind profiles',
      'Gaming presets',
    ],
  },
];

interface Bundle {
  id: string;
  name: string;
  price: string;
  color: string;
  border: string;
  glow: string;
  badge: { text: string; class: string } | null;
  desc: string;
  includes: string[];
  buttonClass: string;
}

const bundles: Bundle[] = [
  {
    id: 'bundle-starter',
    name: 'Starter Bundle',
    price: '$29.99',
    color: 'text-stone-300',
    border: 'border-stone-300/25',
    glow: 'shadow-[0_0_100px_-16px_rgba(214,209,202,0.12)]',
    badge: null,
    desc: 'Entry gaming bundle',
    includes: [
      'Horizon Tweaks (Standard)',
      'Horizon Ping',
    ],
    buttonClass: 'bg-gradient-to-r from-stone-300 to-stone-500 text-black hover:from-stone-200 hover:to-stone-400 shadow-lg shadow-black/30',
  },
  {
    id: 'bundle-gaming',
    name: 'Gaming Bundle',
    price: '$44.99',
    color: 'text-stone-300',
    border: 'border-stone-300/25',
    glow: 'shadow-[0_0_120px_-16px_rgba(147,197,253,0.2)]',
    badge: { text: '\u2605 Best Value \u2605', class: 'bg-gradient-to-r from-stone-300 to-stone-400 text-black font-black tracking-wider' },
    desc: 'Complete performance upgrade pack',
    includes: [
      'Horizon Tweaks (Pro)',
      'Horizon Ping',
      'Horizon Keyboard',
    ],
    buttonClass: 'bg-gradient-to-r from-stone-300 to-stone-400 text-black hover:from-stone-300 hover:to-stone-400 shadow-lg shadow-black/30 font-black tracking-[0.15em]',
  },
  {
    id: 'bundle-ultimate',
    name: 'Ultimate Bundle',
    price: '$89.99',
    color: 'text-stone-300',
    border: 'border-stone-300/25',
    glow: 'shadow-[0_0_120px_-16px_rgba(96,165,250,0.2)]',
    badge: { text: 'Premium', class: 'bg-gradient-to-r from-stone-300 to-stone-400 text-black font-black tracking-wider' },
    desc: 'All-inclusive premium package',
    includes: [
      'All software (Ultimate tier)',
      'One remote optimization session',
      'Priority support',
    ],
    buttonClass: 'bg-gradient-to-r from-stone-300 to-stone-400 text-black hover:from-stone-300 hover:to-stone-400 shadow-lg shadow-black/30 font-black tracking-[0.15em]',
  },
];

export default function Pricing({ userTier, onBuy }: PricingProps) {
  return (
    <section className="pb-32 md:pb-40 px-6 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-4" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* ── Section 1: Horizon Tweaks ── */}
        <div className="text-center mb-12">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25 mb-3 block font-display">
            Horizon Tweaks
          </span>
          <h3 className="text-2xl md:text-3xl font-display font-black text-white">
            Choose your <span className="gradient-text-sky">edition</span>
          </h3>
          <p className="text-sm text-white/40 mt-2">One-time purchase &mdash; lifetime access</p>
        </div>

        <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch mb-20">
          {tiers.map((tier) => {
            const isCurrentPlan = userTier === tier.id;
            const Icon = tier.icon;

            return (
              <StaggerItem key={tier.id}>
                <motion.div
                  className={`relative flex flex-col rounded-3xl border p-7 ${tier.border} ${tier.glow} ${isCurrentPlan ? 'ring-2 ring-white/20' : ''} backdrop-blur-sm`}
                  style={{
                    background: 'impulse-gradient(165deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.3) 100%)',
                  }}
                  whileHover={{ y: -8, scale: 1.01, transition: { duration: 0.3 } }}
                >
                  {tier.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${tier.badge.class} text-[9px] font-bold uppercase tracking-[0.15em] px-4 py-1 rounded-full shadow-lg`}>
                      {tier.badge.text}
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4 flex items-center gap-1 bg-white/10 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-white/15 backdrop-blur-sm">
                      <Crown className="size-2.5" />
                      Current
                    </div>
                  )}

                  <div className="mb-6">
                    <div className={`size-10 rounded-2xl ${tier.iconBg} border ${tier.border} flex items-center justify-center mb-4`}>
                      <Icon className={`size-5 ${tier.iconColor}`} />
                    </div>
                    <span className={`text-[11px] font-black uppercase tracking-[0.25em] ${tier.color}`}>
                      {tier.name}
                    </span>
                    <div className="flex items-baseline gap-1 mt-4">
                      <span className="font-display text-5xl font-black text-white tracking-tight">{tier.price}</span>
                      <span className="text-xs text-white/40 font-medium italic">{tier.period}</span>
                    </div>
                    <p
                      className="text-xs text-white/50 mt-3 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: tier.desc }}
                    />
                  </div>

                  <ul className="text-[12px] space-y-3 mb-8 flex-1">
                    {tier.features.map((f, i) => (
                      <li key={i} className={`flex items-start gap-2.5 ${f.ok ? 'text-white/70' : 'text-white/25'}`}>
                        {f.ok ? (
                          <div className={`size-4 rounded-full ${tier.iconBg} flex items-center justify-center mt-0.5 shrink-0`}>
                            <Check className={`size-2.5 ${tier.iconColor}`} />
                          </div>
                        ) : (
                          <div className="size-4 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mt-0.5 shrink-0">
                            <div className="size-2 rounded-full bg-white/[0.05]" />
                          </div>
                        )}
                        <span dangerouslySetInnerHTML={{ __html: f.text }} />
                        {f.ai && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-stone-300/15 text-stone-200 border border-stone-300/20">
                            <Bot className="size-2.5" />
                            AI
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <div className="w-full py-3.5 rounded-2xl text-xs font-bold text-white/40 text-center cursor-default border border-white/[0.06] backdrop-blur-sm uppercase tracking-wider">
                      Current Plan
                    </div>
                  ) : (
                    <motion.button
                      onClick={() => tier.id === 'free' ? window.location.href = '/api/download-latest' : onBuy(tier.id)}
                      className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                        tier.id === 'free'
                          ? 'border border-white/[0.12] text-white/50 hover:text-white/70 hover:border-white/[0.2] backdrop-blur-sm'
                          : tier.id === 'basic'
                            ? 'bg-gradient-to-r from-stone-300 to-stone-500 text-white hover:from-stone-300 hover:to-stone-400 shadow-lg shadow-black/30'
                            : tier.id === 'pro'
                              ? 'bg-gradient-to-r from-stone-300 to-stone-400 text-black hover:from-stone-300 hover:to-stone-400 shadow-lg shadow-black/30 font-black tracking-[0.15em]'
                              : 'bg-gradient-to-r from-stone-300 to-stone-400 text-black hover:from-stone-300 hover:to-stone-400 shadow-lg shadow-black/30 font-black tracking-[0.15em]'
                      }`}
                      whileHover={tier.id !== 'free' ? { scale: 1.03 } : {}}
                      whileTap={tier.id !== 'free' ? { scale: 0.97 } : {}}
                    >
                      {tier.id === 'free' ? 'Download Free' : `Get ${tier.name.split(' ')[0]}`}
                    </motion.button>
                  )}
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>

        {/* ── Section 2: Standalone Apps ── */}
        <div className="text-center mb-12">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25 mb-3 block font-display">
            Standalone Apps
          </span>
          <h3 className="text-2xl md:text-3xl font-display font-black text-white">
            Individual tools &mdash; <span className="gradient-text-blue">buy only what you need</span>
          </h3>
          <p className="text-sm text-white/40 mt-2">Each sold separately &middot; One-time purchase</p>
        </div>

        <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch mb-20">
          {standaloneApps.map((app) => {
            const Icon = app.icon;
            return (
              <StaggerItem key={app.id}>
                <motion.div
                  className={`relative flex flex-col rounded-3xl border p-7 ${app.border} ${app.glow} backdrop-blur-sm`}
                  style={{
                    background: 'impulse-gradient(165deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.3) 100%)',
                  }}
                  whileHover={{ y: -8, scale: 1.01, transition: { duration: 0.3 } }}
                >
                  <div className="mb-6">
                    <div className={`size-12 rounded-2xl ${app.iconBg} border ${app.border} flex items-center justify-center mb-4`}>
                      <Icon className={`size-6 ${app.iconColor}`} />
                    </div>
                    <span className={`text-[13px] font-black uppercase tracking-[0.25em] ${app.color}`}>
                      {app.name}
                    </span>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="font-display text-4xl font-black text-white tracking-tight">{app.price}</span>
                      <span className="text-xs text-white/40 font-medium italic">&middot; one-time</span>
                    </div>
                    <p className="text-xs text-white/50 mt-2 leading-relaxed">{app.desc}</p>
                  </div>

                  <ul className="text-[12px] space-y-3 mb-8 flex-1">
                    {app.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-white/70">
                        <div className={`size-4 rounded-full ${app.iconBg} flex items-center justify-center mt-0.5 shrink-0`}>
                          <Check className={`size-2.5 ${app.iconColor}`} />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    onClick={() => onBuy(app.id)}
                    className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                      app.id === 'impulse-ping'
                        ? 'bg-gradient-to-r from-stone-300 to-stone-400 text-black hover:from-stone-300 hover:to-stone-400 shadow-lg shadow-black/30 font-black tracking-[0.15em]'
                        : 'bg-gradient-to-r from-stone-300 to-stone-500 text-white hover:from-stone-300 hover:to-stone-400 shadow-lg shadow-black/30'
                    }`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Buy Now
                  </motion.button>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>

        {/* ── Section 3: Bundles ── */}
        <div className="text-center mb-12">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/25 mb-3 block font-display">
            Bundles
          </span>
          <h3 className="text-2xl md:text-3xl font-display font-black text-white">
            Best value &mdash; <span className="gradient-text-sky">get the complete setup</span>
          </h3>
          <p className="text-sm text-white/40 mt-2">Save more when you bundle</p>
        </div>

        <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch mb-20">
          {bundles.map((bundle) => (
            <StaggerItem key={bundle.id}>
              <motion.div
                className={`relative flex flex-col rounded-3xl border-2 p-8 ${bundle.border} ${bundle.glow} backdrop-blur-sm`}
                style={{
                  background: 'impulse-gradient(165deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.025) 50%, rgba(0,0,0,0.35) 100%)',
                }}
                whileHover={{ y: -10, scale: 1.02, transition: { duration: 0.3 } }}
              >
                {bundle.badge && (
                  <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 ${bundle.badge.class} text-[10px] font-bold uppercase tracking-[0.15em] px-5 py-1.5 rounded-full shadow-lg`}>
                    {bundle.badge.text}
                  </div>
                )}

                <div className="mb-6 mt-2">
                  <span className={`text-[14px] font-black uppercase tracking-[0.25em] ${bundle.color}`}>
                    {bundle.name}
                  </span>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="font-display text-5xl font-black text-white tracking-tight">{bundle.price}</span>
                    <span className="text-xs text-white/40 font-medium italic">&middot; one-time</span>
                  </div>
                  <p className="text-xs text-white/50 mt-3 leading-relaxed">{bundle.desc}</p>
                </div>

                <div className="mb-8 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3 font-display">Includes</p>
                  <ul className="text-[12px] space-y-2.5">
                    {bundle.includes.map((item, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-white/80">
                        <Check className={`size-3.5 ${bundle.color}`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <motion.button
                  onClick={() => onBuy(bundle.id)}
                  className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${bundle.buttonClass}`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Get Bundle
                </motion.button>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerChildren>

        <p className="text-[11px] text-white/20 text-center mt-8 font-mono">
          Purchases sync through the Horizon Tweaks desktop app. Keep the app running during checkout.
        </p>
      </div>
    </section>
  );
}
