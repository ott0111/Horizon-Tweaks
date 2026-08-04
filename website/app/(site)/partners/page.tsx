'use client';

import { MessageCircle, Handshake } from 'lucide-react';
import Link from 'next/link';
import { FadeIn, SlideUp } from '@/components/MotionWrappers';

export default function PartnersPage() {
  return (
    <>
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-stone-300/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-stone-300/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-6xl mx-auto relative space-y-24">

          {/* Hero */}
          <FadeIn className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.09] text-xs text-white/65 mb-4">
              <Handshake className="size-3" />
              Partnerships
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold text-white mb-6 tracking-tight">
              Partner With{' '}
              <span className="gradient-text">Horizon Tweaks</span>
            </h1>
            <p className="text-white/80 max-w-3xl mx-auto text-base md:text-lg leading-relaxed font-medium">
              We're always looking to collaborate with creators, developers, and brands who share our passion for performance.
            </p>
          </FadeIn>

          {/* Discord CTA */}
          <SlideUp className="text-center glass-panel p-10 max-w-2xl mx-auto">
            <h2 className="text-xl font-display font-bold text-white mb-3">Let&apos;s Work Together</h2>
            <p className="text-sm text-white/55 mb-6">
              Whether you&apos;re interested in partnerships or booking optimization services, join our Discord server to get started.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="https://discord.gg/ssQXKzA2HU"
                target="_blank"
                rel="noopener noreferrer"
                className="pill-button text-sm font-semibold"
              >
                <MessageCircle className="size-4" />
                Join Our Discord
              </Link>
              <Link
                href="/services"
                className="text-sm font-medium text-white/55 hover:text-white/60 transition-colors inline-flex items-center gap-1.5"
              >
                View services
              </Link>
            </div>
          </SlideUp>

        </div>
      </section>
    </>
  );
}
