'use client';

import Link from 'next/link';
import { Download, Monitor, CheckCircle2, ArrowRight, Wrench, Bot } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ClientDate from '@/components/ClientDate';

const steps = [
  'Download and install Horizon Tweaks on your Windows 10/11 x64 PC.',
  'Sign in with the same account you use on this website.',
  'Choose a tier on the pricing page — keep the app running during checkout.',
  'Your tier syncs instantly. Restart any locked modules if needed.',
];

function Requirement({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-white/40 text-[11px] block mb-0.5">{label}</span>
      <span className="text-white/80 font-medium">{value}</span>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <>
      <PageHeader
        eyebrow="Get Started"
        title={<>Download <span className="gradient-text">Horizon Tweaks</span></>}
        description="The desktop app is required for all optimizations. Everything runs locally on your machine — built from the ground up to be lightweight and efficient. No bloat, no unnecessary processes."
      />

      <section className="pb-24 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="gradient-border rounded-2xl overflow-hidden">
            <div className="glass-panel rounded-2xl p-8 md:p-10 text-center">
              <Monitor className="size-12 text-accent mx-auto mb-5" />
              <h2 className="font-display text-xl font-bold text-white mb-2">Windows Desktop App</h2>
              <p className="text-sm text-white/65 mb-8 max-w-md mx-auto">
                Horizon Tweaks does not offer online PC optimization. All tweaks, benchmarks, and tools run inside Horizon Tweaks on your PC.
              </p>
              <a
                href="/api/download-latest"
                className="inline-flex items-center gap-2.5 bg-accent text-black font-bold px-8 py-3.5 rounded-xl text-sm hover:bg-accent/90 transition-colors"
              >
                <Download className="size-4" />
                Download Free Installer
              </a>
              <p className="text-[11px] text-white/55 mt-4">
                v<ClientDate /> &middot; Windows 10 / 11 x64 &middot; Latest release from GitHub
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 md:p-8">
            <h3 className="font-display font-bold text-white text-sm mb-5">How to get started</h3>
            <ol className="space-y-4">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                  <span className="size-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="glass-panel rounded-2xl p-6 md:p-8">
            <h3 className="font-display font-bold text-white text-sm mb-5">Minimum System Requirements</h3>
            <div className="grid grid-cols-2 gap-4">
              <Requirement label="OS" value="Windows 10 / 11 (64-bit)" />
              <Requirement label="CPU" value="Dual-core 1.5 GHz or higher" />
              <Requirement label="RAM" value="2 GB (4 GB recommended)" />
              <Requirement label="Storage" value="200 MB available space" />
              <Requirement label="GPU" value="DirectX 11 compatible" />
              <Requirement label="Internet" value="Required for license activation" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass-panel rounded-2xl p-5">
              <CheckCircle2 className="size-5 text-accent mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Free tier included</h4>
              <p className="text-xs text-white/55">Dashboard, utilities, docs, and rollback — no purchase needed.</p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <CheckCircle2 className="size-5 text-accent mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">Upgrade anytime</h4>
              <p className="text-xs text-white/55">Standard ($14.99), Pro ($29.99), Ultimate ($59.99) — one-time purchase.</p>
            </div>
          </div>

          <div className="text-center pt-4 space-y-3">
            <p className="text-xs text-white/40 flex items-center justify-center gap-1.5">
              <Bot className="size-3" />
              Some features powered by AI for the most accurate performance analysis
            </p>
            <Link href="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
              View pricing tiers
              <ArrowRight className="size-4" />
            </Link>
            <div>
              <Link href="/services" className="inline-flex items-center gap-2 text-sm text-white/45 hover:text-white/65 transition-colors">
                <Wrench className="size-3.5" />
                Or explore expert tuning services
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
