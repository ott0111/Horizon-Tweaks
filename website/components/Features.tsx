'use client';

import {
  Gauge, Monitor, Cpu, Trash2, Gamepad2, Zap, Network, HardDrive,
  Wifi, Eye, RotateCcw, BarChart3, Wrench, Activity, Sliders, Settings,
  Download, Target, Power, Sparkles, Shield, Bot, Brain, Mic, Microscope, MessageSquare,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { StaggerChildren, StaggerItem } from '@/components/MotionWrappers';

const features = [
  { icon: Activity, title: 'Dashboard', desc: '<b>Real-time</b> CPU, GPU, memory & disk overview with <b>health scoring</b>.', tier: 'Free', bold: false },
  { icon: Brain, title: 'Horizon Chat', desc: '<b>AI-powered assistant</b> for Windows optimization tips, tweak recommendations & <i>system analysis</i>.', tier: 'Ultimate', bold: true, ai: true },
  { icon: Sparkles, title: 'Auto Tweaker', desc: '<b>AI-driven</b> one-click automatic system optimization — applies 20+ tweaks intelligently.', tier: 'Ultimate', bold: true, ai: true },
  { icon: Zap, title: 'FPS Booster', desc: '<b>One-click FPS boost:</b> power plan, game mode, GPU tuning, process priority.', tier: 'Free', bold: true },
  { icon: Sliders, title: 'General Tweaks', desc: '<b>Essential performance</b> tweaks — power plan, services, visual effects & more.', tier: 'Free', bold: true },
  { icon: Wrench, title: 'Utilities', desc: '<b>System utilities:</b> disk cleanup, temp files, system info, admin tools.', tier: 'Free', bold: false },
  { icon: Cpu, title: 'Input Delay', desc: '<b>Optimize input latency,</b> mouse responsiveness, and timer resolution.', tier: 'Free', bold: false },
  { icon: Gauge, title: 'Net Optimizer', desc: '<b>TCP tuning, DNS optimization,</b> adapter power saving, latency reduction.', tier: 'Free', bold: false },
  { icon: Zap, title: 'Macro Tools', desc: '<b>Record, save, and play</b> keyboard macros for competitive gaming.', tier: 'Free', bold: false },
  { icon: Zap, title: 'Speed Test', desc: '<b>Real-time</b> network speed test — download, upload, latency, jitter.', tier: 'Free', bold: false },
  { icon: Download, title: 'Driver Center', desc: '<b>Auto-detect</b> GPU drivers, check versions, official download links.', tier: 'Free', bold: false },
  { icon: MessageSquare, title: 'Feedback', desc: '<b>Share feedback</b> and suggestions to help improve the app.', tier: 'Free', bold: false },
  { icon: Settings, title: 'Settings', desc: '<b>Account settings,</b> theme customization, and app preferences.', tier: 'Free', bold: false },
  { icon: Network, title: 'Network Stack', desc: '<b>TCP/UDP stack tuning</b> & network <i>optimization presets</i>.', tier: 'Standard', bold: false },
  { icon: Gamepad2, title: 'Game Profiles', desc: '<b>Per-game optimization</b> profiles with auto-detection of installed games.', tier: 'Standard', bold: true },
  { icon: Cpu, title: 'Process Manager', desc: '<b>View & manage</b> running processes, suspend, terminate.', tier: 'Standard', bold: false },
  { icon: Power, title: 'Startup Manager', desc: '<b>Control startup</b> programs, measure boot impact, disable items.', tier: 'Standard', bold: false },
  { icon: HardDrive, title: 'Disk Analyzer', desc: '<b>Visualize</b> disk usage, file type breakdown, find large folders, cleanup.', tier: 'Standard', bold: false },
  { icon: Gauge, title: 'Latency Monitor', desc: '<b>DPC & interrupt</b> latency tracking with per-driver breakdown.', tier: 'Standard', bold: false },
  { icon: Wifi, title: 'Wi-Fi Analyzer', desc: '<b>Scan channels,</b> signal strength, find the <i>best connection</i>.', tier: 'Standard', bold: false },
  { icon: Eye, title: 'Privacy Dashboard', desc: '<b>See & disable</b> invasive telemetry, tracking & data collection.', tier: 'Standard', bold: false },
  { icon: Monitor, title: 'Display Info', desc: 'Monitor <b>EDID data,</b> refresh rates, color depth & timings.', tier: 'Standard', bold: false },
  { icon: Gamepad2, title: 'Game Booster', desc: '<b>One-click boost:</b> kill background tasks, free resources for gaming.', tier: 'Standard', bold: true },
  { icon: Target, title: 'FPS Predictor', desc: '<b>AI-powered</b> game performance prediction with <b>95%+ accuracy</b>. Supports 30+ titles with custom settings.', tier: 'Pro', bold: false, ai: true },
  { icon: BarChart3, title: 'Benchmark Suite', desc: '<b>Full CPU, GPU, memory, disk</b> & <i>stress test suite</i> — 10 professional benchmarks.', tier: 'Pro', bold: true },
  { icon: Shield, title: 'Debloating', desc: '<b>Remove bloatware,</b> telemetry & unnecessary Windows <i>services</i>.', tier: 'Pro', bold: true },
  { icon: RotateCcw, title: 'Rollback Panel', desc: '<b>Revert any</b> applied tweak with <i>one click</i> using saved snapshots.', tier: 'Pro', bold: false },
  { icon: Settings, title: 'Advanced Tweaks', desc: '<b>Deep system tuning:</b> GPU driver settings, registry hacks, memory optimization.', tier: 'Ultimate', bold: true },
  { icon: Mic, title: 'Streamer Tools', desc: '<b>Streaming optimizations,</b> audio latency tuning, OBS integration, overlay management.', tier: 'Ultimate', bold: true },

  { icon: Bot, title: 'Auto Tweaker AI', desc: '<b>Experimental optimization engine</b> uses AI to learn your system and apply optimal settings automatically.', tier: 'Ultimate', bold: true, ai: true },
  { icon: Download, title: 'Driver AI', desc: '<b>AI-powered driver recommendations</b> — intelligently detects outdated drivers and suggests optimal versions.', tier: 'Ultimate', bold: true, ai: true },
];

const tierColors: Record<string, string> = {
  Free: 'text-stone-300 bg-stone-300/10 border-stone-300/20',
  Standard: 'text-stone-300 bg-stone-300/10 border-stone-300/15',
  Pro: 'text-stone-300 bg-stone-300/10 border-stone-300/15',
  Ultimate: 'text-stone-300 bg-stone-300/10 border-stone-300/15',
};

export default function Features() {
  return (
    <section className="pb-32 md:pb-40 px-6 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-3" />
      </div>
      <div className="max-w-6xl mx-auto relative">
        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <StaggerItem key={f.title}>
                <motion.div
                  className="group rounded-2xl p-5 border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12]"
                  style={{
                    background: 'impulse-gradient(165deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(0,0,0,0.2) 100%)',
                  }}
                  whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="size-9 rounded-xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center group-hover:border-white/[0.12] group-hover:bg-white/[0.08] transition-all duration-300">
                      <Icon className="size-4 text-white/40 group-hover:text-white/60 transition-colors duration-300" />
                    </div>
                    <span className={`text-[8px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-md border ${tierColors[f.tier] || 'text-white/40 bg-white/[0.05] border-white/[0.06]'}`}>
                      {f.tier}
                    </span>
                  </div>
                  <h3 className={`font-display font-bold text-white/80 text-[13px] mb-1.5 ${f.bold ? 'text-white/95' : ''}`}>
                    {f.title}
                    {f.ai && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-stone-300/15 text-stone-200 border border-stone-300/20">
                        <Bot className="size-2.5" />
                        AI
                      </span>
                    )}
                  </h3>
                  <p
                    className="text-[11px] text-white/50 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: f.desc }}
                  />
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>
      </div>
    </section>
  );
}
