'use client';

import { useState } from 'react';
import { ChevronDown, Wrench, Key, Zap, Network, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { FadeIn } from '@/components/MotionWrappers';

const sections = [
  {
    icon: Wrench,
    title: 'Installation Issues',
    color: '#e8e2db',
    items: [
      {
        q: "App won't install",
        a: 'Ensure you have Windows 10/11 x64. Try running the installer as Administrator.',
      },
      {
        q: "Installer says 'Windows protected your PC'",
        a: "Click 'More info' then 'Run anyway'. This is a false positive from the unsigned installer.",
      },
      {
        q: 'Missing DLL or runtime errors',
        a: "Install the latest Visual C++ Redistributable from Microsoft's website.",
      },
    ],
  },
  {
    icon: Key,
    title: 'Account & Licensing',
    color: '#d6d1ca',
    items: [
      {
        q: 'License key not working',
        a: 'Go to Settings > License in the desktop app and enter your key exactly as shown in your email.',
      },
      {
        q: 'Tier not syncing after purchase',
        a: 'Restart the desktop app fully. If it still doesn\'t sync, sign out and sign back in.',
      },
      {
        q: "Can't sign in",
        a: "Ensure you're using the same account you purchased with. Try resetting your password.",
      },
    ],
  },
  {
    icon: Zap,
    title: 'Performance Issues',
    color: '#d6d1ca',
    items: [
      {
        q: 'No FPS improvement after tweaks',
        a: 'Some tweaks require a restart. Apply tweaks, restart your PC, then test.',
      },
      {
        q: 'App crashes when applying tweaks',
        a: 'Restore from the Rollback panel. Try applying tweaks one at a time to identify the problematic one.',
      },
      {
        q: "Benchmark won't run",
        a: 'Close other GPU-intensive apps. Update your GPU drivers. Try running as Administrator.',
      },
    ],
  },
  {
    icon: Network,
    title: 'Network Tools',
    color: '#d6d1ca',
    items: [
      {
        q: 'Network Optimizer not working',
        a: 'Run the app as Administrator. Network tweaks require admin privileges.',
      },
      {
        q: 'Speed test shows wrong results',
        a: 'Close other applications using the network. Try a wired connection.',
      },
    ],
  },
  {
    icon: HelpCircle,
    title: 'General',
    color: '#d6d1ca',
    items: [
      {
        q: 'App feels slow',
        a: 'This is normal on first launch while data is collected. Performance improves after the initial scan.',
      },
      {
        q: 'How to completely uninstall Horizon Tweaks',
        a: 'Run the uninstaller from the Start Menu, then delete %AppData%\\Horizon Tweaks for clean removal.',
      },
      {
        q: 'Where are logs stored?',
        a: 'Logs are at %AppData%\\Horizon Tweaks\\logs. Share these with support for debugging.',
      },
    ],
  },
];

export default function TroubleshootingPage() {
  const [openSections, setOpenSections] = useState<Record<string, number | null>>({});

  const toggle = (sectionTitle: string, index: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionTitle]: prev[sectionTitle] === index ? null : index,
    }));
  };

  return (
    <>
      <PageHeader
        eyebrow="Help Center"
        title="Troubleshooting Guide"
        description="Common issues and their solutions for Horizon Tweaks."
      />

      <section className="pb-24 px-4">
        <div className="max-w-3xl mx-auto space-y-10">
          {sections.map((section, si) => {
            const Icon = section.icon;
            return (
              <FadeIn key={section.title} delay={si * 0.05}>
                <div className="glass-panel rounded-2xl p-6 md:p-8 border-white/[0.06]">
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="size-10 rounded-xl flex items-center justify-center border"
                      style={{
                        background: `${section.color}15`,
                        borderColor: `${section.color}20`,
                      }}
                    >
                      <Icon className="size-4.5" style={{ color: section.color }} />
                    </div>
                    <h2 className="font-display text-base font-bold text-white">{section.title}</h2>
                  </div>

                  <div className="space-y-1">
                    {section.items.map((item, ii) => {
                      const isOpen = openSections[section.title] === ii;
                      return (
                        <div
                          key={item.q}
                          className="rounded-xl border border-white/[0.04] overflow-hidden"
                        >
                          <button
                            onClick={() => toggle(section.title, ii)}
                            className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-white/[0.015] transition-colors duration-200"
                          >
                            <span className="text-[13px] font-medium text-white/60">{item.q}</span>
                            <motion.div
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="size-3.5 text-white/35 shrink-0" />
                            </motion.div>
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                              >
                                <div className="px-5 pb-4 text-[13px] text-white/55 leading-relaxed border-t border-white/[0.03] pt-3">
                                  {item.a}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>
    </>
  );
}
