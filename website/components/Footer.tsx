'use client';

import Link from 'next/link';
import { FadeIn } from '@/components/MotionWrappers';

const footerLinks = [
  { href: '/platform', label: 'Platform' },
  { href: '/features', label: 'Features' },
  { href: '/services', label: 'Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/download', label: 'Download' },
  { href: '/settings', label: 'Settings' },
];

const legalLinks = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/6 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img src="/app-icon.png" alt="Horizon Tweaks" className="size-4 opacity-60 transition-opacity group-hover:opacity-80" />
              <span className="text-[13px] font-medium text-zinc-200">Horizon Tweaks</span>
              <span className="ml-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">App &amp; Services</span>
            </Link>

            <nav className="flex flex-wrap items-center justify-center gap-5 text-[12px] text-zinc-400">
              {footerLinks.map((link) => (
                <Link key={link.href} href={link.href} className="transition-colors duration-200 hover:text-zinc-200">
                  {link.label}
                </Link>
              ))}
              <span className="text-white/8">|</span>
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href} className="transition-colors duration-200 hover:text-zinc-200">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-6 text-center">
            <a
              href="https://discord.gg/ssQXKzA2HU"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[11px] text-zinc-400 transition-colors duration-300 hover:text-zinc-200"
            >
              <span className="size-1.5 rounded-full bg-zinc-300/70" />
              All bookings are done through Discord — Join our server to get started
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 md:flex-row">
            <p className="text-[11px] text-zinc-500">&copy; 2026 Horizon Tweaks. All rights reserved.</p>
            <p className="text-[11px] text-zinc-600">Rust &middot; Tauri &middot; React &middot; Next.js</p>
          </div>
        </FadeIn>
      </div>
    </footer>
  );
}
