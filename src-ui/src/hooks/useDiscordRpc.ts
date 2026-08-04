import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

const VIEW_LABELS: Record<string, { details: string; state: string; largeText: string }> = {
  dashboard: {
    details: 'System Dashboard',
    state: 'Monitoring CPU, RAM & GPU in real-time',
    largeText: 'Horizon Tweaks v1.1 — System Health: Active',
  },
  'general-tweaks': {
    details: 'General Tweaks',
    state: 'Optimizing system performance settings',
    largeText: 'Power plans, visual effects & memory management',
  },
  'advanced-tweaks': {
    details: 'Advanced Tweaks',
    state: 'Deep system-level tuning & registry edits',
    largeText: 'Kernel tweaks, timer resolution & prefetch tuning',
  },
  bios: {
    details: 'BIOS Interface',
    state: 'Viewing hardware-level BIOS configuration',
    largeText: 'Boot order, virtualization & chipset settings',
  },
  debloating: {
    details: 'Debloating Windows',
    state: 'Removing pre-installed bloatware & telemetry',
    largeText: 'Cortana, OneDrive, Edge bloat & app removal',
  },
  networking: {
    details: 'Network Optimization',
    state: 'Tweaking TCP/IP stack & DNS settings',
    largeText: 'Nagle algorithm, MTU, DNS & buffer tuning',
  },
  'game-profiles': {
    details: 'Game Profiles',
    state: 'Configuring per-game optimization profiles',
    largeText: 'GPU scheduling, process priority & affinity',
  },
  'process-manager': {
    details: 'Process Manager',
    state: 'Monitoring & managing running processes',
    largeText: 'CPU/memory usage per process with priority control',
  },
  'startup-manager': {
    details: 'Startup Manager',
    state: 'Controlling boot startup entries',
    largeText: 'Registry & task scheduler startup items',
  },
  'disk-analyzer': {
    details: 'Disk Analyzer',
    state: 'Scanning storage usage & folder sizes',
    largeText: 'Finding large files & cleaning disk space',
  },
  'latency-monitor': {
    details: 'Latency Monitor',
    state: 'Measuring network ping & packet loss',
    largeText: 'Continuous ping tests with jitter analysis',
  },
  benchmark: {
    details: 'Benchmark Suite',
    state: 'Running hardware performance tests',
    largeText: 'CPU, memory, disk, GPU & compression benchmarks',
  },
  'game-booster': {
    details: 'Game Booster',
    state: 'Maximizing FPS with system resource allocation',
    largeText: 'Disabling background services & freeing RAM',
  },
  'wifi-analyzer': {
    details: 'Wi-Fi Analyzer',
    state: 'Scanning wireless networks & signal strength',
    largeText: 'Channel optimization & network discovery',
  },
  privacy: {
    details: 'Privacy Dashboard',
    state: 'Managing Windows privacy & telemetry settings',
    largeText: 'Telemetry, camera, mic & location controls',
  },
  display: {
    details: 'Display Information',
    state: 'Viewing monitor & GPU display configuration',
    largeText: 'Resolution, refresh rate & color settings',
  },
  utilities: {
    details: 'System Utilities',
    state: 'Accessing system repair & cleanup tools',
    largeText: 'SFC, DISM, disk cleanup & temp file removal',
  },
  rollback: {
    details: 'Rollback Panel',
    state: 'Managing system restore points & snapshots',
    largeText: 'Undo tweaks with point-in-time snapshots',
  },
  documentation: {
    details: 'Documentation',
    state: 'Reading the Horizon Tweaks user guide',
    largeText: 'Feature explanations & tweak descriptions',
  },
  'admin-panel': {
    details: 'Admin Panel',
    state: 'Managing users & administrative settings',
    largeText: 'User roles, tier management & system admin',
  },
  feedback: {
    details: 'Feedback',
    state: 'Sending feedback to the Impulse team',
    largeText: 'Bug reports, feature requests & suggestions',
  },
  settings: {
    details: 'Settings',
    state: 'Configuring Horizon Tweaks preferences',
    largeText: 'Theme, startup behavior & app configuration',
  },
  'network-speed': {
    details: 'Speed Test',
    state: 'Testing download & upload bandwidth',
    largeText: 'Real-time throughput measurement via HTTP',
  },
  'game-predict': {
    details: 'FPS Predictor',
    state: 'Estimating in-game frame rates',
    largeText: 'GPU/CPU bottleneck analysis per title',
  },
  'driver-center': {
    details: 'Driver Center',
    state: 'Checking & updating device drivers',
    largeText: 'GPU, audio, network & chipset driver status',
  },
};

export function useDiscordRpc(view: string) {
  useEffect(() => {
    invoke('init_discord_rpc').catch(() => {});
    return () => { invoke('shutdown_discord_rpc').catch(() => {}); };
  }, []);

  useEffect(() => {
    const labels = VIEW_LABELS[view] || {
      details: view.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      state: 'Horizon Tweaks — Power User Toolkit',
      largeText: 'Horizon Tweaks v1.1',
    };
    invoke('update_discord_presence', {
      details: labels.details,
      stateStr: labels.state,
      largeImageText: labels.largeText,
    }).catch(() => {});
  }, [view]);
}
