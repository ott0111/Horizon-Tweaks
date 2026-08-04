'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';
import { FadeIn } from '@/components/MotionWrappers';

interface DownloadCTAProps {
  compact?: boolean;
}

export default function DownloadCTA({ compact }: DownloadCTAProps) {
  return (
    <section className={`px-6 ${compact ? 'py-20' : 'py-28 md:py-36'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="gradient-border rounded-3xl overflow-hidden">
          <div className="relative rounded-3xl p-10 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 hero-glow pointer-events-none opacity-30" />

            <div className="relative">
              <FadeIn>
                <h2 className="font-display text-3xl md:text-5xl font-extrabold text-white tracking-[-0.02em] mb-5">
                  Ready to unlock
                  <br />
                  <span className="text-white/45">your full performance?</span>
                </h2>
              </FadeIn>

              <FadeIn delay={0.1}>
                <p className="text-white/55 text-sm max-w-md mx-auto mb-10 leading-relaxed font-light">
                  Use the desktop app for DIY control, or book a live tuning session for hands-on optimization.
                </p>
              </FadeIn>

              <FadeIn delay={0.2}>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/download"
                    className="pill-button text-sm px-8 py-3.5"
                  >
                    <Download className="size-4" />
                    Get Horizon Tweaks
                  </Link>
                  <Link
                    href="/services"
                    className="text-sm font-medium text-white/55 hover:text-white/65 transition-colors duration-300"
                  >
                    Explore services &rsaquo;
                  </Link>
                </div>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="text-[10px] text-white/15 mt-10 uppercase tracking-[0.2em]">
                  Windows 10 / 11 x64 only
                </p>
              </FadeIn>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
