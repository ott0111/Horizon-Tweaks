'use client';

import { Quote } from 'lucide-react';
import { FadeIn, StaggerChildren, StaggerItem } from '@/components/MotionWrappers';

const testimonials = [
  {
    quote: 'The interface feels premium and the results are obvious the moment I launch the app.',
    name: 'Mason R.',
    role: 'Competitive gamer',
  },
  {
    quote: 'It turned a noisy setup into something much calmer and more responsive without feeling invasive.',
    name: 'Jules P.',
    role: 'Streamer',
  },
  {
    quote: 'The flow is simple, the modules make sense, and the impact feels real from day one.',
    name: 'Ari T.',
    role: 'Creator',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="max-w-6xl mx-auto">
        <FadeIn className="max-w-3xl mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4">Testimonials</p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-[-0.02em] mb-4">
            Trusted by players who care about polish.
          </h2>
          <p className="text-[15px] leading-[1.7] text-zinc-300/80">
            Users consistently describe the experience as clean, effective, and thoughtfully designed.
          </p>
        </FadeIn>

        <StaggerChildren className="grid gap-4 lg:grid-cols-3">
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
              <div className="rounded-3xl border border-white/8 bg-white/4 p-6">
                <Quote className="size-5 text-zinc-400 mb-4" />
                <p className="text-[15px] leading-[1.7] text-zinc-200/90">“{t.quote}”</p>
                <div className="mt-6">
                  <div className="font-semibold text-white">{t.name}</div>
                  <div className="text-sm text-zinc-400">{t.role}</div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
