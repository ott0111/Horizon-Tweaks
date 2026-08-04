'use client';

import PageHeader from '@/components/PageHeader';
import { FadeIn, SlideUp } from '@/components/MotionWrappers';
import { CheckCircle2, Wrench, Telescope } from 'lucide-react';

const sections = [
  {
    icon: CheckCircle2,
    title: `What We've Done`,
    color: '#e8e2db',
    items: [
      'Built the Horizon Tweaks desktop app from the ground up with modular architecture',
      '25+ optimization modules: Dashboard, Tweaks, Network, Debloating, Benchmark, Game Booster, Macro Tools, Auto Tweaker, FPS Booster, and more',
      'In-app documentation system that adapts to your tier',
      'License key system supporting multiple apps and tiers',
      'Standalone app architecture — Horizon Ping and Horizon Keyboard planned',
      'AI-powered FPS Predictor with physics-based calculation engine',
      'Auto Tweaker with smart hardware detection',
      'Windows 10/11 full compatibility',
      'One-time purchase pricing with no subscriptions',
      'Firebase integration for secure license management',
      'PayPal payment processing',
      'Professional website with troubleshooting guides and roadmap',
    ],
  },
  {
    icon: Wrench,
    title: `What We're Building`,
    color: '#d6d1ca',
    items: [
      'Custom AI model training — currently powered by API keys, but we are actively working on training a custom model on curated, high-quality datasets',
      'Our custom model will be cheaper to run than most local and online alternatives while delivering better performance for our specific use case',
      'Enhanced game detection and automatic profile application',
      'Cloud sync for settings and profiles across devices',
      'Horizon Ping — standalone network latency testing tool',
      'Horizon Keyboard — standalone macro and input optimization tool',

      'Automated driver management system',
      'Plugin SDK for third-party modules',
    ],
  },
  {
    icon: Telescope,
    title: 'Vision',
    color: '#d6d1ca',
    items: [
      `If we are satisfied with our custom AI model's performance in Horizon Tweaks, we plan to release it to the general public`,
      'This could lead to the creation of our own AI lab dedicated to gaming performance optimization',
      'Benchmark leaderboards and community features',
      'Advanced telemetry dashboard for power users',
      'Remote optimization session support',
    ],
  },
];

export default function RoadmapPage() {
  return (
    <>
      <PageHeader
        eyebrow="The Journey"
        title={<>Roadmap</>}
        description={`What we've built, what we're building, and what we dream of. Nothing here is promised \u2014 the developer will try their best.`}
      />

      <section className="pb-24 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <SlideUp key={section.title} delay={i * 0.15}>
                <div className="glass-panel rounded-2xl p-6 md:p-8 relative border-white/[0.06]">
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div
                      className="size-12 rounded-xl flex items-center justify-center shrink-0 border hidden sm:flex"
                      style={{
                        background: `${section.color}15`,
                        borderColor: `${section.color}20`,
                      }}
                    >
                      <Icon className="size-5" style={{ color: section.color }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-lg font-bold text-white mb-1">{section.title}</h2>

                      <ul className="mt-4 space-y-2.5">
                        {section.items.map((item) => (
                          <li key={item} className="flex items-start gap-2.5 text-sm text-white/55">
                            <span
                              className="size-1.5 rounded-full mt-2 shrink-0"
                              style={{ background: section.color }}
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </SlideUp>
            );
          })}

          <FadeIn>
            <div className="glass-panel rounded-2xl p-6 border-white/[0.04]">
              <p className="text-xs text-white/40 leading-relaxed text-center">
                This roadmap is for informational purposes only. The developer will try their best to make these features a reality, but nothing is guaranteed. Features, timelines, and plans are subject to change based on feasibility, resources, and priorities.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
