'use client';

import Link from 'next/link';
import { Download, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeIn, SlideUp } from '@/components/MotionWrappers';

const trustPoints = ['Trusted by competitive gamers', 'Safe & reversible tweaks', 'No subscriptions required'];
const featurePills = ['22+ Modules', 'Net Optimizer', 'Impulse Benchmark', 'Game Profiles', 'Debloater', 'FPS Predictor', 'Driver Center', 'License Keys'];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden">
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-20" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
        <div className="ambient-orb ambient-orb-4" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.11),transparent_50%)] opacity-70" />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-white/20 blur-[0.5px]"
            style={{
              top: `${12 + i * 9}%`,
              left: `${12 + (i % 4) * 18}%`,
              animation: `float ${5 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-[860px] mx-auto relative text-center py-24 md:py-32">
        <FadeIn delay={0.15}>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-1.5 text-[11px] font-medium text-zinc-200/85 mb-10 tracking-[0.18em] uppercase backdrop-blur-sm shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
            <span className="size-1.5 rounded-full bg-zinc-200 animate-pulse-glow" />
            Desktop App &middot; Built Lightweight &middot; Windows 10 / 11 &middot; AI-assisted workflows
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <motion.img
            src="/app-icon.png"
            alt="Horizon Tweaks"
            className="size-28 md:size-36 mx-auto mb-12 drop-shadow-[0_0_60px_rgba(255,255,255,0.12)]"
            initial={{ scale: 0.8, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.3, type: 'spring', stiffness: 100 }}
          />
        </FadeIn>

        <FadeIn delay={0.35}>
          <h1 className="font-display text-[3.25rem] sm:text-[5rem] md:text-[6.3rem] lg:text-[7.25rem] font-black text-white leading-[0.92] tracking-[-0.04em] mb-8">
            <span className="block">Performance</span>
            <span className="gradient-text block mt-2">Redefined</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.5}>
          <p className="text-[17px] sm:text-[18px] leading-[1.7] text-zinc-200/90 max-w-[760px] mx-auto mb-10 font-light">
            Professional Windows optimization built for gamers, creators, and power users. Increase FPS, reduce latency, and eliminate unnecessary system overhead.
          </p>
        </FadeIn>

        <FadeIn delay={0.6}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/download"
              className="pill-button text-sm px-10 py-4 border-white/15 hover:border-white/30"
            >
              <Download className="size-4" />
              <b>Download</b> <i>Free</i>
            </Link>
            <a
              href="https://discord.gg/ssQXKzA2HU"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/3 px-5 py-3.5 text-sm font-semibold text-zinc-200/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/8 hover:text-white"
            >
              <b>Book</b> <i>a service</i>
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={0.7}>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-300/85">
            {trustPoints.map((point) => (
              <div key={point} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/3 px-3.5 py-2 backdrop-blur-sm">
                <Zap className="size-3.5 text-zinc-200" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </FadeIn>

        <SlideUp delay={0.85}>
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-3 gap-y-3 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-300/70">
            {featurePills.map((text, i) => (
              <motion.span
                key={text}
                className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/3 px-3.5 py-2 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.95 + i * 0.08, duration: 0.5 }}
              >
                <span className="size-1.5 rounded-full bg-zinc-200/80" />
                {text}
              </motion.span>
            ))}
          </div>
        </SlideUp>

        <FadeIn delay={1.1}>
          <Link href="/platform" className="inline-flex mt-16 text-zinc-400 hover:text-white transition-colors duration-500 animate-float">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
            </svg>
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}
