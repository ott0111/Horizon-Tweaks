'use client';

import { ReactNode } from 'react';
import { FadeIn } from '@/components/MotionWrappers';

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  compact?: boolean;
}

export default function PageHeader({ eyebrow, title, description, compact }: PageHeaderProps) {
  return (
    <section className={`relative px-6 overflow-hidden ${compact ? 'pt-28 pb-12' : 'pt-32 pb-16 md:pt-36 md:pb-20'}`}>
      <div className="absolute inset-0 hero-glow pointer-events-none opacity-40" />
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-30" />
      <div className="max-w-4xl mx-auto relative text-center">
        <FadeIn>
          {eyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35 mb-4">{eyebrow}</p>
          )}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-[-0.03em] mb-5">
            {title}
          </h1>
          {description && (
            <p className="text-white/45 text-base max-w-xl mx-auto leading-relaxed font-light">{description}</p>
          )}
        </FadeIn>
      </div>
    </section>
  );
}
