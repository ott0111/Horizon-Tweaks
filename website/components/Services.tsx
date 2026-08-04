'use client';

import { Cpu, Zap, Gauge, Monitor, Shield, HardDrive, ArrowRight, Network, Eye, Search, Rocket, Crown, Disc, Music, Video, RefreshCw, MonitorSmartphone, Layout, Laptop, Mouse, Target, Database, AlertTriangle, Thermometer, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { StaggerChildren, StaggerItem, FadeIn } from '@/components/MotionWrappers';

const DISCORD_URL = 'https://discord.gg/ssQXKzA2HU';

const coreServices = [
  {
    name: 'Essential Tune',
    price: '$25',
    desc: 'Quick Windows cleanup and basic performance tuning. The right starting point for most setups.',
    features: [
      'Disabling Windows tracking & telemetry',
      'Disabling unnecessary services & startup items',
      'NVIDIA / AMD GPU settings for performance',
      'Network adapter settings (Ethernet / Wi-Fi)',
      'Basic power plan optimization',
    ],
    icon: Zap,
    color: 'text-accent',
    border: 'border-accent/15',
    glow: 'shadow-[0_0_80px_-16px_rgba(0,163,255,0.15)]',
  },
  {
    name: 'Full Optimization',
    price: '$45',
    desc: 'Deep system optimization with custom GPU drivers, BIOS tuning, and debloat. Built for players who want more.',
    badge: 'Most Popular',
    features: [
      'Everything in Essential Tune',
      'Custom debloated GPU driver (NVIDIA / AMD)',
      'In-depth network adapter tuning',
      'Custom power plan & disable power saving',
      'Extensive BIOS settings optimization',
      'Windows debloat & bloatware removal',
      'Privacy hardening & telemetry blocking',
    ],
    icon: Rocket,
    color: 'text-accent',
    border: 'border-accent/15',
    glow: 'shadow-[0_0_80px_-16px_rgba(168,85,247,0.15)]',
    badgeColor: 'bg-accent text-white',
  },
  {
    name: 'Network Tune',
    price: '$15',
    desc: 'Dedicated network stack tuning for lower latency and stable connections.',
    features: [
      'TCP/UDP buffer & window size tuning',
      'Network adapter offload configuration',
      'DNS optimization & caching',
      'Wi-Fi channel & frequency band optimization',
      'Latency baseline test',
    ],
    icon: Network,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'Debloat',
    price: '$15',
    desc: 'Remove bloatware, telemetry, and background tasks eating your resources.',
    features: [
      'Removal of pre-installed Windows apps',
      'Disabling telemetry & data collection',
      'Killing unnecessary background tasks',
      'Disabling Cortana & search indexing',
      'Startup optimization & cleanup',
    ],
    icon: HardDrive,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'Privacy Lock',
    price: '$10',
    desc: 'Lock down Windows privacy settings and disable invasive tracking.',
    features: [
      'Disable Windows advertising ID',
      'Block telemetry endpoints via hosts file',
      'Disable activity history & timeline',
      'Lock down app permissions & camera/mic access',
      'Privacy dashboard review & report',
    ],
    icon: Eye,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'Full System Audit',
    price: '$65',
    desc: 'Complete top-to-bottom system analysis. Hardware, BIOS, drivers, storage, network, thermals — full report delivered.',
    badge: 'Comprehensive',
    features: [
      'Full hardware & software inventory',
      'BIOS settings review & optimization',
      'Driver audit & update recommendations',
      'Storage health & performance analysis',
      'Network speed & latency baseline',
      'Thermal & power delivery assessment',
      'Full written optimization report',
    ],
    icon: Search,
    color: 'text-accent',
    border: 'border-accent/15',
    glow: 'shadow-[0_0_80px_-16px_rgba(168,85,247,0.1)]',
    badgeColor: 'bg-accent/80 text-white',
  },
  {
    name: 'Storage Optimization',
    price: '$20',
    desc: 'Analyze and optimize storage drives for faster load times and better performance.',
    features: [
      'SSD/HDD health & S.M.A.R.T. analysis',
      'Disk fragmentation analysis (HDD)',
      'TRIM verification & optimization (SSD)',
      'Large file identification & cleanup',
      'Windows storage sense configuration',
      'Pagefile & prefetch optimization',
    ],
    icon: Disc,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'Audio Optimization',
    price: '$15',
    desc: 'Tune audio stack for lower latency, better clarity, and reduced interference.',
    features: [
      'Audio driver update & configuration',
      'Disable audio enhancements & spatial sound',
      'Sample rate & bit depth optimization',
      'Disable exclusive mode (fix mic issues)',
      'Eliminate audio crackling & popping',
      'Mic noise suppression setup',
    ],
    icon: Music,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'Stream Optimization',
    price: '$25',
    desc: 'Configure your system for smooth streaming — OBS/streamlabs settings, GPU encoder tuning, priority management.',
    features: [
      'OBS/Streamlabs performance settings',
      'GPU encoder (NVENC/AMF) optimization',
      'Process priority & affinity tuning',
      'Network QoS & bandwidth reservation',
      'Audio routing & filter setup',
      'Stream overlay & performance metrics',
    ],
    icon: Video,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'Laptop Tune-Up',
    price: '$20',
    desc: 'Full optimization suite tailored specifically for laptops. Thermal-aware, battery-conscious, performance-focused.',
    features: [
      'Power plan optimization (plugged & battery)',
      'Thermal throttling diagnosis & mitigation',
      'GPU switching configuration (iGPU/dGPU)',
      'Fan curve & cooling profile setup',
      'Battery health & charging optimization',
      'Chassis-aware BIOS settings (when available)',
    ],
    icon: Laptop,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'Dual-Boot Setup',
    price: '$30',
    desc: 'Set up a dual-boot configuration (Windows + Linux) with proper partitioning and bootloader.',
    features: [
      'Partition layout planning & creation',
      'Linux distribution installation',
      'GRUB bootloader configuration',
      'GRUB theme & timeout customization',
      'Time sync fix (Windows/Linux dual boot)',
      'Shared data partition setup',
    ],
    icon: Layout,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'VM Performance Setup',
    price: '$25',
    desc: 'Configure Windows for virtual machine workloads — Hyper-V, VMware, or VirtualBox optimization.',
    features: [
      'Hyper-V / VMware / VirtualBox config',
      'CPU core & memory allocation tuning',
      'Storage passthrough optimization',
      'Network bridge & NAT configuration',
      'GPU passthrough (if supported)',
    ],
    icon: MonitorSmartphone,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'Clean Install + Full Tune',
    price: '$80',
    desc: 'Fresh Windows install with every optimization pre-applied. The ultimate clean-slate setup.',
    badge: 'Ultimate',
    features: [
      'Windows 10/11 clean installation',
      'Driver installation & verification',
      'All Essential Tune optimizations',
      'Full Optimization tuning suite',
      'Debloat & privacy hardening',
      'Network, storage & audio optimization',
      'GPU overclock & undervolt',
      'Complete system backed up & restored',
    ],
    icon: RefreshCw,
    color: 'text-accent',
    border: 'border-accent/15',
    glow: 'shadow-[0_0_80px_-16px_rgba(168,85,247,0.15)]',
    badgeColor: 'bg-accent text-white',
  },
  {
    name: 'GPU Undervolt',
    price: '$15',
    desc: 'Reduce GPU power draw and temperatures while maintaining stock performance. Lower noise, longer lifespan.',
    features: [
      'Voltage/frequency curve tuning (MSI AB)',
      'Power limit & thermal target optimization',
      'Per-game undervolt profiles',
      'Temperature & power draw baseline report',
      'Stability validation with Furmark & gaming',
    ],
    icon: Thermometer,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'Input Latency Reduction',
    price: '$20',
    desc: 'Minimize input lag across your entire peripheral stack. USB, mouse, keyboard, and display pipeline tuning.',
    features: [
      'USB polling rate optimization (1000 Hz+)',
      'Mouse acceleration & pointer precision tuning',
      'Keyboard repeat rate & interrupt optimization',
      'Display pipeline latency reduction',
      'Game-specific input config (raw input, buffer)',
    ],
    icon: Mouse,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'Competitive Gaming Package',
    price: '$35',
    desc: 'Everything tuned for competitive and esports gaming. Maximum FPS, lowest latency, zero distractions.',
    badge: 'Esports Ready',
    features: [
      'Game-specific profiles (Valorant, CS2, Fortnite)',
      'Input latency reduction stack',
      'Network QoS & game traffic prioritization',
      'Windows visual effects & DWM disabling',
      'Process priority & CPU affinity tuning',
      'Pre-game launch checklist & hotkey setup',
    ],
    icon: Target,
    color: 'text-accent',
    border: 'border-accent/15',
    glow: 'shadow-[0_0_80px_-16px_rgba(0,163,255,0.1)]',
    badgeColor: 'bg-accent text-black',
  },
  {
    name: 'Data Backup & Migration',
    price: '$20',
    desc: 'Full system backup, data cloning, or migration to a new drive. Your data stays safe.',
    features: [
      'Full system image creation (Macrium/Veeam)',
      'Drive-to-drive cloning (SSD upgrade)',
      'File backup & restore verification',
      'Automated backup schedule setup',
      'Cloud backup configuration (OneDrive/GDrive)',
    ],
    icon: Database,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'BIOS Recovery & Flash',
    price: '$25',
    desc: 'BIOS update, rollback, or recovery from a bricked state. Modded BIOS installation when applicable.',
    features: [
      'BIOS backup & version identification',
      'Safe BIOS flash with rollback plan',
      'BIOS mod installation (AGESA, ReBar, etc.)',
      'Recovery from failed/corrupted flash',
      'Optimal BIOS settings post-flash',
    ],
    icon: Shield,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
  {
    name: 'Emergency Troubleshooting',
    price: '$20',
    desc: 'System won\'t boot? BSODs? Random crashes? Full diagnosis and fix — get you back online fast.',
    features: [
      'BSOD analysis & minidump review',
      'Boot failure diagnosis & repair',
      'Driver conflict identification & rollback',
      'Memory & storage health testing',
      'Event log deep-dive & error resolution',
    ],
    icon: AlertTriangle,
    color: 'text-accent',
    border: 'border-accent/10',
    glow: '',
  },
];

const overclockServices = [
  {
    name: 'CPU Overclock',
    price: '$25',
    features: [
      'Stable voltage curves & tested thermals',
      'Hours of stress-testing for stability',
      'Custom OC profile saved to your BIOS',
      'Push your processor beyond stock clocks',
    ],
    icon: Cpu,
  },
  {
    name: 'RAM Overclock',
    price: '$40',
    features: [
      'Tighter memory timings',
      'Higher frequencies (XMP / EXPO tuning)',
      'Tuned to your specific kit & motherboard',
      'Hours of stability testing',
    ],
    icon: Gauge,
  },
  {
    name: 'CPU + RAM Bundle',
    price: '$55',
    badge: 'Bundle',
    features: [
      'Full CPU tuning suite',
      'Full RAM tuning suite',
      'Bundled discount vs. buying separately',
      'Maximum platform performance',
    ],
    icon: Cpu,
  },
  {
    name: 'GPU Overclock',
    price: '$15',
    features: [
      'Core frequency tuning',
      'Memory frequency tuning',
      'Custom fan curve',
      'Undervolt where applicable',
    ],
    icon: Monitor,
  },
  {
    name: 'Full Overclock',
    price: '$75',
    badge: 'Best Value',
    features: [
      'CPU, RAM, and GPU all tuned together',
      'Maximum overall performance',
      'All clocks dialed in to safe limits',
      'Best value of all overclock options',
    ],
    icon: Crown,
  },
];

export default function Services() {
  return (
    <section className="pb-32 md:pb-40 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Payment Methods */}
        <FadeIn>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16 text-[11px] text-white/35">
            <span className="uppercase tracking-[0.2em] font-medium mr-2">Accepted Payments</span>
            {['PayPal', 'Cash App', 'Credit / Debit', 'Stripe', 'Amazon Pay', 'Klarna'].map((method) => (
              <span key={method} className="px-3 py-1 rounded-full border border-white/[0.09] bg-white/[0.08]">
                {method}
              </span>
            ))}
          </div>
        </FadeIn>

        {/* Core Optimization Services */}
        <FadeIn>
          <div className="mb-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-[-0.02em] mb-2">
              Optimization Services
            </h2>
            <p className="text-white/55 text-sm">Manual, hardware-specific tuning built for your exact setup.</p>
          </div>
        </FadeIn>

        <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-20">
          {coreServices.map((service) => {
            const Icon = service.icon;
            return (
              <StaggerItem key={service.name}>
                <motion.div
                  className={`relative flex flex-col rounded-2xl border p-7 glass-panel card-3d ${service.border} ${service.glow} h-full`}
                  whileHover={{ y: -6, rotateX: 2, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } }}
                  style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
                >
                  {service.badge && (
                    <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 ${service.badgeColor || 'bg-accent text-black'} text-[9px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full`}>
                      {service.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`size-10 rounded-xl bg-white/[0.05] border border-white/[0.09] flex items-center justify-center ${service.color}`}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-white">{service.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-2xl font-extrabold text-white">{service.price}</span>
                        <span className="text-[11px] text-white/55">USD</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-white/45 mb-5 leading-relaxed">{service.desc}</p>

                  <ul className="text-[13px] space-y-2.5 mb-6 flex-1">
                    {service.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-white/45">
                        <span className="size-1 rounded-full bg-accent/60 mt-1.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={DISCORD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group w-full py-3 rounded-xl text-xs font-semibold transition-all duration-300 pill-button justify-center flex items-center gap-2"
                  >
                    Book Now
                    <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>

        {/* Overclocking Services */}
        <FadeIn>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Gauge className="size-6 text-accent" />
              <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-[-0.02em]">
                Overclocking Services
              </h2>
            </div>
            <p className="text-white/55 text-sm">Hardware-level tuning, available standalone or bundled.</p>
          </div>
        </FadeIn>

        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {overclockServices.slice(0, 3).map((service) => {
            const Icon = service.icon;
            return (
              <StaggerItem key={service.name}>
                <motion.div
                  className="relative flex flex-col rounded-2xl border border-white/[0.09] p-6 glass-panel card-3d h-full"
                  whileHover={{ y: -6, rotateX: 2, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } }}
                  style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
                >
                  {service.badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-black text-[9px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full">
                      {service.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-9 rounded-lg bg-white/[0.05] border border-white/[0.09] flex items-center justify-center text-accent">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-white">{service.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-xl font-extrabold text-white">{service.price}</span>
                        <span className="text-[10px] text-white/55">USD</span>
                      </div>
                    </div>
                  </div>

                  <ul className="text-[12px] space-y-2 mb-5 flex-1">
                    {service.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/55">
                        <span className="size-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={DISCORD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group w-full py-3 rounded-xl text-xs font-semibold transition-all duration-300 pill-button justify-center flex items-center gap-2"
                  >
                    Book Now
                    <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>

        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-20">
          {overclockServices.slice(3).map((service) => {
            const Icon = service.icon;
            return (
              <StaggerItem key={service.name}>
                <motion.div
                  className={`relative flex flex-col rounded-2xl border p-6 glass-panel card-3d ${
                    service.badge === 'Best Value'
                      ? 'border-accent/15 shadow-[0_0_80px_-16px_rgba(0,163,255,0.15)]'
                      : 'border-white/[0.09]'
                  } h-full`}
                  whileHover={{ y: -6, rotateX: 2, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } }}
                  style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
                >
                  {service.badge && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-black text-[9px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full">
                      {service.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-9 rounded-lg bg-white/[0.05] border border-white/[0.09] flex items-center justify-center text-accent">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-white">{service.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-xl font-extrabold text-white">{service.price}</span>
                        <span className="text-[10px] text-white/55">USD</span>
                      </div>
                    </div>
                  </div>

                  <ul className="text-[12px] space-y-2 mb-5 flex-1">
                    {service.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/55">
                        <span className="size-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={DISCORD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group w-full py-3 rounded-xl text-xs font-semibold transition-all duration-300 pill-button justify-center flex items-center gap-2"
                  >
                    Book Now
                    <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerChildren>

        {/* Discord CTA */}
        <FadeIn>
          <div className="gradient-border rounded-3xl overflow-hidden">
            <div className="relative rounded-3xl p-10 md:p-14 text-center overflow-hidden">
              <div className="absolute inset-0 hero-glow pointer-events-none opacity-20" />
              <div className="relative">
                <h3 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-[-0.02em] mb-3">
                  Ready to Get Started?
                </h3>
                <p className="text-white/55 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                  All bookings are handled through our Discord server. Open a ticket, tell us what you need, and we&apos;ll get you squared away.
                </p>
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pill-button text-sm px-8 py-3.5 inline-flex items-center gap-2"
                >
                  Join Discord & Book
                  <ArrowRight className="size-4" />
                </a>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
