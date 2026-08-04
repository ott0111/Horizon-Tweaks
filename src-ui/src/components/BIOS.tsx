import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Cpu, Monitor, Shield, Zap, Info, MemoryStick, HardDrive,
  Settings, CheckCircle, XCircle, RefreshCw, Sliders, Wifi,
  AlertTriangle, Clock, Disc, CircuitBoard, Usb, Globe,
  Activity, ChevronRight, Fan
} from 'lucide-react';
import CustomSelect from './CustomSelect';

interface BiosInfo {
  manufacturer: string;
  model: string;
  bios_version: string;
  bios_date: string;
  serial_number: string;
  secure_boot: string;
  tpm_status: string;
  virtualization: string;
  smbios_version: string;
  cpu_name: string;
  baseboard_version: string;
  bios_mode: string;
}

interface MemorySlot {
  bank: string;
  capacity_gb: number;
  speed_mhz: number;
  form_factor: string;
  memory_type: string;
  manufacturer: string;
  part_number: string;
}

interface CpuFeature {
  name: string;
  supported: boolean;
  description: string;
}

interface BiosSetting {
  name: string;
  category: string;
  current_value: string;
  description: string;
  modifiable: boolean;
  possible_values: string[];
}

interface StorageInfo {
  model: string;
  device_id: string;
  size_gb: number;
  media_type: string;
  interface_type: string;
  firmware: string;
  partition_count: number;
}

interface FanDevice {
  name: string;
  current_speed: number;
  max_speed: number;
  active_cooling: boolean;
  unit: string;
}

interface FanInfo {
  supported: boolean;
  fan_count: number;
  fans: FanDevice[];
  method: string;
}

interface PartialBiosData {
  info: BiosInfo | null;
  memory: MemorySlot[];
  features: CpuFeature[];
  storage: StorageInfo[];
}

// â”€â”€â”€ PHASE CONFIG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PhaseConfig {
  name: string;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  range: [number, number];
}

const PHASES: PhaseConfig[] = [
  {
    name: 'cpu',
    label: 'CPU Initialization',
    icon: Cpu,
    color: 'from-stone-300 to-stone-400',
    bgColor: 'bg-stone-300/10',
    borderColor: 'border-stone-300/25',
    textColor: 'text-stone-300',
    range: [0, 2],
  },
  {
    name: 'memory',
    label: 'Memory & DMA',
    icon: MemoryStick,
    color: 'from-stone-300 to-stone-400',
    bgColor: 'bg-stone-300/10',
    borderColor: 'border-stone-300/25',
    textColor: 'text-stone-300',
    range: [3, 5],
  },
  {
    name: 'chipset',
    label: 'Chipset & I/O',
    icon: CircuitBoard,
    color: 'from-stone-300 to-stone-400',
    bgColor: 'bg-stone-300/10',
    borderColor: 'border-stone-300/25',
    textColor: 'text-stone-300',
    range: [6, 8],
  },
  {
    name: 'storage',
    label: 'Storage & ACPI',
    icon: HardDrive,
    color: 'from-stone-300 to-stone-400',
    bgColor: 'bg-stone-300/10',
    borderColor: 'border-stone-300/25',
    textColor: 'text-stone-300',
    range: [9, 11],
  },
  {
    name: 'final',
    label: 'Finalizing',
    icon: Shield,
    color: 'from-stone-300 to-stone-400',
    bgColor: 'bg-stone-300/10',
    borderColor: 'border-stone-300/25',
    textColor: 'text-stone-300',
    range: [12, 14],
  },
];

const steps = [
  'CPU Initialization',
  'Memory Controller',
  'System Timer Check',
  'DMA Controller Check',
  'Interrupt Controller Check',
  'Keyboard Controller Ready',
  'BIOS ROM Checksum',
  'CMOS Battery Check',
  'PCI Device Enumeration',
  'SATA/NVMe Device Detection',
  'USB Controller Initialization',
  'ACPI Initialization',
  'SMBIOS Data Ready',
  'Boot Device Selection',
  'System Configuration Complete',
];

// â”€â”€â”€ MEMORY TEST GRID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MemoryTestGrid({ active }: { active: boolean }) {
  const [filledCount, setFilledCount] = useState(0);
  const cellsRef = useRef<boolean[]>(Array(64).fill(false));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      cellsRef.current = Array(64).fill(false);
      setFilledCount(0);
      return;
    }
    let idx = 0;
    intervalRef.current = setInterval(() => {
      const cells = cellsRef.current;
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
        const pos = Math.floor(Math.random() * 64);
        if (!cells[pos]) { cells[pos] = true; setFilledCount(c => c + 1); }
      }
      idx += 3;
      if (idx >= 80 && intervalRef.current) clearInterval(intervalRef.current);
    }, 180);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active]);

  const pct = Math.min((filledCount / 64) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[9px]">
        <span className="text-white/40">Memory Test</span>
        <span className="text-stone-300 font-mono">{filledCount}/64 KB</span>
      </div>
      <div className="grid grid-cols-8 gap-[2px]">
        {Array.from({ length: 64 }, (_, i) => (
          <div
            key={i}
            className={`aspect-square rounded-[2px] transition-all duration-300 ${
              i < filledCount
                ? 'bg-stone-300/40 shadow-[0_0_4px_rgba(168,85,247,0.3)]'
                : active
                ? 'bg-white/[0.03] border border-white/[0.06]'
                : 'bg-white/[0.02] border border-white/[0.04]'
            }`}
          />
        ))}
      </div>
      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-stone-300 to-stone-400 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// â”€â”€â”€ REAL-TIME CLOCK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RealtimeClock = React.memo(function RealtimeClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/30">
      <Clock className="h-2.5 w-2.5" />
      {time.toLocaleTimeString('en-US', { hour12: false })}
    </div>
  );
});

// â”€â”€â”€ CIRCUIT GRID BACKGROUND â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CircuitBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 animate-[circuit-pulse_4s_ease-in-out_infinite]"
        style={{
          backgroundImage: `
            impulse-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            impulse-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      {/* Larger grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            impulse-gradient(rgba(255,255,255,0.008) 1px, transparent 1px),
            impulse-gradient(90deg, rgba(255,255,255,0.008) 1px, transparent 1px)
          `,
          backgroundSize: '192px 192px',
        }}
      />
      {/* Scan line */}
      <div
        className="absolute inset-0 animate-[scanline_8s_linear_infinite]"
        style={{
          background: 'impulse-gradient(180deg, transparent 0%, rgba(52,211,153,0.03) 50%, transparent 100%)',
          height: '40%',
          width: '100%',
        }}
      />
      {/* Ambient glows */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-stone-300/3 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-stone-300/3 rounded-full blur-3xl" />
    </div>
  );
}

// â”€â”€â”€ COMPLETION SUMMARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CompletionSummary({ partialData, onDismiss }: { partialData: PartialBiosData; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [showCount, setShowCount] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setInterval(() => {
      setShowCount(prev => {
        if (prev >= 5) { clearInterval(t); return prev; }
        return prev + 1;
      });
    }, 300);
    return () => clearInterval(t);
  }, []);

  const items = [
    { label: 'CPU', value: partialData.info?.cpu_name || 'Detected', icon: Cpu, color: 'text-stone-300' },
    { label: 'Memory', value: partialData.memory.length > 0 ? `${partialData.memory.reduce((s, m) => s + m.capacity_gb, 0).toFixed(1)} GB` : 'Detected', icon: MemoryStick, color: 'text-stone-300' },
    { label: 'Storage', value: partialData.storage.length > 0 ? `${partialData.storage.length} device(s)` : 'Detected', icon: HardDrive, color: 'text-stone-300' },
    { label: 'BIOS', value: partialData.info?.bios_version || 'Current', icon: Monitor, color: 'text-stone-300' },
    { label: 'Secure Boot', value: partialData.info?.secure_boot || 'N/A', icon: Shield, color: partialData.info?.secure_boot === 'Enabled' ? 'text-green-400' : 'text-stone-300' },
  ];

  return (
    <div
      className={`flex flex-col items-center justify-center h-full min-h-[500px] transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="w-full max-w-lg glass-panel p-6 shadow-xl shadow-black/40 border-white/[0.06]">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/[0.06]">
          <div className="size-10 rounded-xl bg-stone-300/10 border border-white/[0.06] flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-stone-300" />
          </div>
          <div>
            <div className="text-base font-bold text-white">POST Complete</div>
            <div className="text-[10px] text-white/40">System diagnostics passed — loading interface</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {items.map((item, i) => {
            const Icon = item.icon;
            const show = showCount > i;
            return (
              <div
                key={item.label}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all duration-500 ${
                  show ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                }`}
              >
                <Icon className={`h-4 w-4 ${item.color} shrink-0`} />
                <div className="min-w-0">
                  <div className="text-[8px] text-white/30 uppercase tracking-wider">{item.label}</div>
                  <div className={`text-[11px] font-medium truncate ${item.color}`}>{item.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onDismiss}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-300/90 text-stone-950 text-xs font-bold hover:bg-stone-300 transition-all active:scale-[0.98] shadow-lg shadow-black/20"
        >
          <Zap className="h-4 w-4" />
          Enter BIOS Interface
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="text-[8px] text-white/20 text-center mt-3">
          Press any key to continue · System ready in {Math.max(0, 5 - showCount)}s
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ BIOS LOADING (REDESIGNED) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function BiosLoading({
  statuses,
  partialData,
  onComplete,
}: {
  statuses: string[];
  partialData: PartialBiosData;
  onComplete: () => void;
}) {
  const displaySteps = 12;
  const [showSummary, setShowSummary] = useState(false);
  const progressPct = Math.min((statuses.length / displaySteps) * 100, 100);
  const isComplete = statuses.length > displaySteps;

  // Determine current phase
  const currentStepIdx = Math.min(statuses.length - 1, steps.length - 1);
  const currentPhase = PHASES.find(
    (p) => currentStepIdx >= p.range[0] && currentStepIdx <= p.range[1]
  ) || PHASES[0];

  // Show summary when complete
  useEffect(() => {
    if (isComplete) {
      const t = setTimeout(() => setShowSummary(true), 400);
      return () => clearTimeout(t);
    }
  }, [isComplete]);

  // Handle transitioning to main UI
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  if (showSummary) {
    return <CompletionSummary partialData={partialData} onDismiss={handleComplete} />;
  }

  const getPhaseForStep = (stepIdx: number) =>
    PHASES.find((p) => stepIdx >= p.range[0] && stepIdx <= p.range[1]) || PHASES[0];

  const isPhaseActive = (phase: PhaseConfig) =>
    currentStepIdx >= phase.range[0] && currentStepIdx <= phase.range[1];

  const isPhaseComplete = (phase: PhaseConfig) =>
    currentStepIdx > phase.range[1];

  return (
    <div className="relative h-full min-h-[500px] overflow-hidden">
      <CircuitBackground />

      <div className="relative z-10 flex flex-col h-full p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.06] shrink-0 animate-[fadeIn_0.4s_ease-out]">
          <div className="size-9 rounded-xl bg-stone-300/10 border border-white/[0.06] flex items-center justify-center">
            <Monitor className="h-4 w-4 text-stone-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Horizon Tweaks Optimization BIOS v2.0.0</span>
              <span className="text-[9px] text-white/20 font-mono hidden sm:inline">BUILD 2026</span>
            </div>
            <div className="text-[10px] text-white/30">AMI UEFI POST — Hardware Initialization</div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {!isComplete && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-stone-300/80">
                <span className="inline-block w-1.5 h-1.5 bg-stone-300 rounded-full animate-ping" />
                {currentPhase?.label || 'Initializing'}
              </div>
            )}
            <RealtimeClock />
          </div>
        </div>

        {/* Main content grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          {/* LEFT: POST Steps */}
          <div className="lg:col-span-2 space-y-2 overflow-y-auto min-h-0">
            {/* Phase badges */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PHASES.map((phase) => {
                const active = isPhaseActive(phase);
                const complete = isPhaseComplete(phase);
                const PhaseIcon = phase.icon;
                return (
                  <div
                    key={phase.name}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-300 ${
                      active
                        ? `${phase.bgColor} ${phase.borderColor} shadow-lg`
                        : complete
                        ? `${phase.bgColor} ${phase.borderColor} opacity-60`
                        : 'border-white/[0.04] bg-white/[0.02] opacity-40'
                    }`}
                  >
                    <PhaseIcon
                      className={`h-3 w-3 ${
                        active ? phase.textColor : complete ? phase.textColor : 'text-white/30'
                      } ${active ? 'animate-pulse' : ''}`}
                    />
                    <span
                      className={`text-[9px] font-medium ${
                        active ? phase.textColor : complete ? 'text-white/50' : 'text-white/30'
                      }`}
                    >
                      {phase.label}
                    </span>
                    {active && (
                      <span className={`text-[8px] ${phase.textColor} font-mono animate-pulse`}>
                        ›
                      </span>
                    )}
                    {complete && (
                      <CheckCircle className={`h-2.5 w-2.5 ${phase.textColor}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Steps list */}
            <div className="space-y-[2px]">
              {steps.slice(0, displaySteps).map((s, i) => {
                const completed = i < statuses.length;
                const active = i === statuses.length - 1 && i < steps.length - 1;
                const phase = getPhaseForStep(i);
                const PhaseStepIcon = phase.icon;

                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-300 ${
                      active
                        ? 'bg-white/[0.04] border border-white/[0.08] shadow-sm'
                        : completed && !active
                        ? 'bg-white/[0.015] border border-white/[0.04]'
                        : 'border border-transparent'
                    } ${active ? 'animate-[phase-enter_0.3s_ease-out]' : ''}`}
                  >
                    {/* Status icon */}
                    <span
                      className={`shrink-0 size-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                        completed
                          ? `${phase.bgColor} ${phase.textColor}`
                          : 'bg-white/[0.03]'
                      }`}
                    >
                      {completed ? (
                        active ? (
                          <span className={`h-2 w-2 rounded-full ${phase.textColor} bg-current animate-ping`} />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
                      )}
                    </span>

                    {/* Step icon */}
                    <PhaseStepIcon
                      className={`h-3 w-3 shrink-0 ${
                        completed
                          ? phase.textColor
                          : 'text-white/15'
                      }`}
                    />

                    {/* Step text */}
                    <span
                      className={`font-mono text-[10px] flex-1 truncate ${
                        completed
                          ? active
                            ? `${phase.textColor} font-medium`
                            : 'text-white/60'
                          : 'text-white/15'
                      }`}
                    >
                      {s}
                    </span>

                    {/* Step number */}
                    {completed && (
                      <span className="text-[8px] text-white/20 font-mono shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    )}

                    {/* Active cursor */}
                    {active && (
                      <span className={`text-xs font-mono ${phase.textColor} animate-pulse`}>_</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Hardware Detection Panel */}
          <div className="space-y-3">
            {/* Current phase detail */}
            {currentPhase && (
              <div className="animate-[fadeIn_0.3s_ease-out]">
                <div className="glass-panel p-3 space-y-2 border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className={`size-7 rounded-lg ${currentPhase.bgColor} border ${currentPhase.borderColor} flex items-center justify-center`}>
                      <currentPhase.icon className={`h-3.5 w-3.5 ${currentPhase.textColor}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold text-white truncate">{currentPhase.label}</div>
                      <div className="text-[8px] text-white/30">
                        Step {currentStepIdx + 1} of {steps.length}
                      </div>
                    </div>
                    <div className={`ml-auto text-[18px] font-bold font-mono ${currentPhase.textColor}`}>
                      {Math.round(progressPct)}
                      <span className="text-[9px] text-white/30">%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${currentPhase.color} rounded-full transition-all duration-200 relative`}
                      style={{ width: `${progressPct}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[shimmer_2s_infinite] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Detected Hardware */}
            <div className="glass-panel p-3 space-y-2 border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-[9px] text-white/30 uppercase tracking-wider mb-1">
                <Activity className="h-3 w-3" />
                Detected Hardware
              </div>
              <div className="space-y-1.5">
                {[
                  {
                    icon: Cpu,
                    label: 'CPU',
                    value: partialData.info?.cpu_name || 'Detecting...',
                    color: 'text-stone-300',
                    active: currentPhase?.name === 'cpu',
                  },
                  {
                    icon: MemoryStick,
                    label: 'Memory',
                    value: partialData.info
                      ? `${partialData.memory.reduce((s, m) => s + m.capacity_gb, 0).toFixed(1)} GB`
                      : 'Detecting...',
                    color: 'text-stone-300',
                    active: currentPhase?.name === 'memory',
                  },
                  {
                    icon: HardDrive,
                    label: 'Storage',
                    value: partialData.storage.length > 0
                      ? `${partialData.storage[0]?.model?.slice(0, 30) || 'Drive'}...`
                      : 'Scanning...',
                    color: 'text-stone-300',
                    active: currentPhase?.name === 'storage',
                  },
                  {
                    icon: Shield,
                    label: 'Security',
                    value: partialData.info?.secure_boot
                      ? `Secure Boot: ${partialData.info.secure_boot}`
                      : 'Checking...',
                    color: partialData.info?.secure_boot === 'Enabled' ? 'text-green-400' : 'text-stone-300',
                    active: currentPhase?.name === 'final',
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] transition-all duration-300 ${
                        item.active ? 'bg-white/[0.04] border border-white/[0.06]' : 'border border-transparent'
                      }`}
                    >
                      <Icon className={`h-3 w-3 ${item.color} shrink-0`} />
                      <span className="text-white/40 shrink-0">{item.label}</span>
                      <span className={`text-white/70 truncate flex-1 text-right ${item.color} ${
                        item.value === 'Detecting...' || item.value === 'Scanning...' || item.value === 'Checking...'
                          ? 'animate-pulse'
                          : ''
                      }`}>
                        {item.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Memory Test Visualization */}
            <MemoryTestGrid active={currentPhase?.name === 'memory' || false} />

            {/* Status Log */}
            <div className="glass-panel p-3 border-white/[0.06]">
              <div className="text-[8px] text-white/20 font-mono leading-4 h-16 overflow-hidden relative">
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#1f2937] to-transparent pointer-events-none" />
                {statuses.slice(-6).map((_, i) => (
                  <div key={i} className="animate-[count-up_0.2s_ease-out]">
                    <span className="text-stone-300/50">[</span>
                    <span className="text-stone-300/70">OK</span>
                    <span className="text-stone-300/50">]</span>{' '}
                    <span className="text-white/30">{steps[Math.max(0, statuses.length - 6 + i)] || '...'}</span>
                  </div>
                ))}
                {statuses.length <= displaySteps && (
                  <div className="flex items-center gap-1">
                    <span className="text-stone-300/50">[</span>
                    <span className="text-stone-300 animate-pulse">&gt;&gt;</span>
                    <span className="text-stone-300/50">]</span>{' '}
                    <span className="text-stone-300/70 animate-pulse">Processing...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Progress bar + hints */}
        <div className="shrink-0 mt-3 pt-3 border-t border-white/[0.06] space-y-2 animate-[fadeIn_0.5s_ease-out]">
          {/* Progress bar */}
          <div>
            <div className="relative h-2.5 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.06]">
              {/* Ambient glow */}
              <div
                className={`absolute inset-0 opacity-15 blur-md bg-gradient-to-r ${currentPhase?.color || 'from-stone-300 to-stone-400'}`}
                style={{ width: `${progressPct}%` }}
              />
              {/* Fill */}
              <div
                className={`h-full bg-gradient-to-r ${currentPhase?.color || 'from-stone-300 to-stone-400'} transition-all duration-200 relative rounded-full`}
                style={{ width: `${progressPct}%` }}
              >
                {/* Sheen */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite] rounded-full" />
                {/* Leading dot */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.4)]" />
              </div>
              {/* Tick marks */}
              {[25, 50, 75].map((tick) => (
                <div
                  key={tick}
                  className="absolute top-0 bottom-0 w-px bg-white/[0.06]"
                  style={{ left: `${tick}%` }}
                />
              ))}
            </div>
          </div>

          {/* Status & hints */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {statuses.length <= displaySteps ? (
                <span className="text-[10px] text-stone-300/70 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 bg-stone-300 rounded-full animate-pulse" />
                  POST sequence — {statuses.length}/{displaySteps} checks passed
                </span>
              ) : (
                <span className="text-[10px] text-stone-300 flex items-center gap-1.5">
                  <CheckCircle className="h-3 w-3" />
                  POST completed — loading interface
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[8px] text-white/20">
              <span>DEL: Setup</span>
              <span className="hidden sm:inline">TAB: POST</span>
              <span className="hidden sm:inline">ESC: Skip</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ MAIN BIOS COMPONENT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function BIOS() {
  const [info, setInfo] = useState<BiosInfo | null>(null);
  const [memory, setMemory] = useState<MemorySlot[]>([]);
  const [features, setFeatures] = useState<CpuFeature[]>([]);
  const [settings, setSettings] = useState<BiosSetting[]>([]);
  const [storage, setStorage] = useState<StorageInfo[]>([]);
  const [fanInfo, setFanInfo] = useState<FanInfo | null>(null);
  const [fanPolicy, setFanPolicy] = useState<string>('balanced');
  const [loading, setLoading] = useState(true);
  const [dragSpeed, setDragSpeed] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPolicy, setDragPolicy] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<string[]>([]);
  const [editResult, setEditResult] = useState<string | null>(null);
  const [partialData, setPartialData] = useState<PartialBiosData>({
    info: null,
    memory: [],
    features: [],
    storage: [],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadStatus([]);
    setPartialData({ info: null, memory: [], features: [], storage: [] });

    // Start step simulation
    const stepPromise = new Promise<void>((resolve) => {
      let n = 0;
      const tick = setInterval(() => {
        n++;
        setLoadStatus((prev) => [...prev, `step-${n}`]);
        if (n >= 12) {
          clearInterval(tick);
          resolve();
        }
      }, 120);
    });

    // Fire all invokes in parallel, updating partial data as they resolve
    invoke<BiosInfo>('get_bios_info')
      .then((result) => {
        setInfo(result);
        setPartialData((prev) => ({ ...prev, info: result }));
      })
      .catch(() => setInfo(null));

    invoke<MemorySlot[]>('get_memory_slots')
      .then((result) => {
        setMemory(result);
        setPartialData((prev) => ({ ...prev, memory: result }));
      })
      .catch(() => setMemory([]));

    invoke<CpuFeature[]>('get_cpu_features')
      .then((result) => {
        setFeatures(result);
        setPartialData((prev) => ({ ...prev, features: result }));
      })
      .catch(() => setFeatures([]));

    invoke<BiosSetting[]>('get_bios_settings')
      .then(setSettings)
      .catch(() => setSettings([]));

    invoke<StorageInfo[]>('get_storage_info')
      .then((result) => {
        setStorage(result);
        setPartialData((prev) => ({ ...prev, storage: result }));
      })
      .catch(() => setStorage([]));

    invoke<FanInfo>('get_fan_info')
      .then(setFanInfo)
      .catch(() => setFanInfo(null));

    await stepPromise;

    // Mark complete
    setLoadStatus(Array.from({ length: 13 }, (_, i) => `done-${i}`));

    // Wait for summary screen interaction instead of auto-dismissing
    // The summary screen's "Enter BIOS Interface" button will set loading to false
  }, []);

  const handleLoadingComplete = useCallback(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const changeSetting = async (name: string, value: string) => {
    try {
      await invoke('set_bios_setting', { name, value });
      setEditResult(`"${name}" set to "${value}"`);
      loadData();
    } catch (e: any) {
      setEditResult(`Failed: ${e}`);
    }
  };

  if (loading) {
    return (
      <BiosLoading
        statuses={loadStatus}
        partialData={partialData}
        onComplete={handleLoadingComplete}
      />
    );
  }

  const hasInfo = info !== null;
  const hasMemory = memory.length > 0;
  const hasFeatures = features.length > 0;
  const hasSettings = settings.length > 0;
  const hasStorage = storage.length > 0;
  const hasFanInfo = fanInfo !== null && fanInfo.supported && fanInfo.fans.length > 0 && fanInfo.fans.some(f => f.current_speed > 0);

  if (!hasInfo && !hasMemory && !hasFeatures && !hasSettings && !hasStorage) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <XCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-white/40">No BIOS data available.</p>
        <button onClick={loadData} className="text-xs text-stone-300 hover:underline flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised border border-white/[0.06]">
          <Monitor className="size-5 text-steel-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-steel-100">BIOS Interface</h1>
          <p className="text-xs text-steel-500 mt-0.5">View and modify BIOS/UEFI settings from Windows</p>
        </div>
        <button onClick={loadData} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] border border-white/[0.06] text-steel-400 hover:text-steel-200 hover:bg-white/[0.06] transition-all">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Quick Stats Row */}
      {hasInfo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Manufacturer', value: info!.manufacturer, sub: info!.model },
            { label: 'BIOS Version', value: info!.bios_version, sub: info!.bios_date },
            { label: 'Secure Boot', value: info!.secure_boot, color: info!.secure_boot === 'Enabled' ? 'text-steel-200' : 'text-stone-300' },
            { label: 'Virtualization', value: info!.virtualization, color: info!.virtualization === 'Supported' ? 'text-steel-200' : 'text-stone-300' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3">
              <div className="text-[9px] text-steel-600 uppercase tracking-wider font-semibold mb-1">{s.label}</div>
              <div className="flex items-center justify-between gap-2">
                <div className={`text-sm font-bold font-mono text-steel-200 truncate ${s.color || ''}`}>{s.value}</div>
                {s.label === 'BIOS Version' && (
                  <button
                    onClick={() => { alert('BIOS update check coming soon!'); }}
                    className="blue-button text-[9px] px-2 py-0.5 shrink-0 whitespace-nowrap"
                  >
                    Check for BIOS Update
                  </button>
                )}
              </div>
              {s.sub && <div className="text-[9px] text-steel-600 truncate mt-0.5">{s.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {editResult && (
        <div className={`flex items-center gap-2 border px-3 py-2 text-xs ${
          editResult.startsWith('Failed') ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-green-500/20 bg-green-500/10 text-green-400'
        }`}>
          {editResult.startsWith('Failed') ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
          {editResult}
          <button onClick={() => setEditResult(null)} className="ml-auto text-white/50 hover:text-white">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {hasInfo && (
          <div className="border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-stone-300" />
              <span className="text-sm font-semibold text-white">System Information</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Manufacturer', info!.manufacturer],
                ['Model', info!.model],
                ['Baseboard', info!.baseboard_version],
                ['CPU', info!.cpu_name],
                ['BIOS Version', info!.bios_version],
                ['BIOS Date', info!.bios_date],
                ['BIOS Mode', info!.bios_mode],
                ['SMBIOS', info!.smbios_version],
                ['Serial', info!.serial_number],
                ['Secure Boot', { v: info!.secure_boot, color: info!.secure_boot === 'Enabled' ? 'text-green-400' : info!.secure_boot === 'Disabled' ? 'text-stone-300' : 'text-white/50' }],
                ['TPM', { v: info!.tpm_status, color: info!.tpm_status === 'Ready' ? 'text-green-400' : 'text-stone-300' }],
                ['Virtualization', { v: info!.virtualization, color: info!.virtualization === 'Supported' ? 'text-green-400' : 'text-stone-300' }],
              ].map(([k, val]: any) => (
                <div key={k} className="border border-white/[0.06] bg-white/[0.03] p-2">
                  <div className="text-white/50 mb-0.5 truncate">{k}</div>
                  <div className={`font-medium truncate ${val.color || ''}`}>{val.v || val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasStorage && (
          <div className="border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="h-4 w-4 text-stone-300" />
              <span className="text-sm font-semibold text-white">Storage Devices</span>
            </div>
            <div className="space-y-2 text-xs">
              {storage.map((d, i) => (
                <div key={i} className="border border-white/[0.06] bg-white/[0.03] p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium truncate flex-1">{d.model}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 font-mono ${
                      d.media_type.includes('SSD') || d.media_type === 'SSD (NVMe)'
                        ? 'bg-stone-900/40 text-stone-300'
                        : d.media_type === 'SSD'
                        ? 'bg-stone-900/40 text-stone-300'
                        : 'bg-stone-900/40 text-stone-300'
                    }`}>{d.media_type}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-white/50 text-[10px]">
                    <span>{d.size_gb.toFixed(1)} GB</span>
                    <span>{d.interface_type}</span>
                    <span>{d.firmware}</span>
                    <span>{d.partition_count} partition(s)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasMemory && (
        <div className="border border-white/[0.06] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <MemoryStick className="h-4 w-4 text-stone-300" />
            <span className="text-sm font-semibold text-white">Memory &mdash; {memory.length} slot(s)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {memory.map((m, i) => (
              <div key={i} className="border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="text-white/50 text-[10px] mb-1">{m.bank || `Slot ${i+1}`}</div>
                <div className="text-white font-medium">{m.capacity_gb} GB {m.memory_type}-{m.speed_mhz}</div>
                <div className="text-white/50 text-[10px] mt-1">{m.manufacturer} &middot; {m.part_number || m.form_factor}</div>
              </div>
            ))}
          </div>
          {memory.length > 0 && (
            <div className="mt-2 text-[10px] text-white/50">
              Total: {memory.reduce((s, m) => s + m.capacity_gb, 0).toFixed(1)} GB installed
              &middot; Config: {memory.map(m => `${m.capacity_gb}GB`).join(' + ')}
            </div>
          )}
        </div>
      )}

      {hasFeatures && (
        <div className="border border-white/[0.06] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="h-4 w-4 text-stone-300" />
            <span className="text-sm font-semibold text-white">CPU Features ({features.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {features.map((f, i) => (
              <div key={i} className="border border-white/[0.06] bg-white/[0.03] p-2">
                <div className="text-white/50 text-[10px] mb-0.5">{f.name}</div>
                <div className={`font-medium text-[11px] ${f.supported ? 'text-green-400' : 'text-stone-300'}`}>
                  {f.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasFanInfo && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-gradient-to-br from-stone-300/20 to-stone-400/20 border border-stone-300/20 flex items-center justify-center">
                <Fan className="size-4 text-stone-300" />
              </div>
              <div>
                <span className="text-sm font-semibold text-steel-100">Fan Control</span>
                <span className="text-[9px] text-steel-500 ml-2 font-mono">{fanInfo!.method}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {['silent', 'balanced', 'performance'].map((p) => (
                <button
                  key={p}
                  onClick={async () => {
                    try {
                      await invoke('set_fan_policy', { level: p });
                      setFanPolicy(p);
                      setEditResult(`Fan policy: ${p}`);
                    } catch (err: any) {
                      setEditResult(`Failed: ${err}`);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-semibold border transition-all capitalize ${
                    fanPolicy === p
                      ? p === 'silent'
                        ? 'bg-stone-200/15 border-stone-200/30 text-stone-200 shadow-sm shadow-stone-200/10'
                        : p === 'balanced'
                        ? 'bg-stone-300/15 border-stone-300/30 text-stone-300 shadow-sm shadow-stone-300/10'
                        : 'bg-stone-300/25 border-stone-300/40 text-stone-400 shadow-sm shadow-stone-300/15'
                      : 'bg-white/[0.03] border-white/[0.06] text-steel-500 hover:text-steel-300 hover:bg-white/[0.05]'
                  }`}
                >{p}</button>
              ))}
            </div>
          </div>

          {fanInfo!.fans.length > 0 ? (
            <div className="space-y-4">
              {fanInfo!.fans.map((fan, i) => {
                const displaySpeed = isDragging && dragSpeed !== null ? dragSpeed : fan.current_speed;
                const displayPolicy = dragPolicy ?? fanPolicy;

                const getColor = (speed: number) => {
                  if (speed <= 20) return 'from-stone-200 to-stone-400';
                  if (speed <= 66) return 'from-stone-300 to-stone-400';
                  return 'from-stone-300 to-stone-400';
                };

                const getThumbColor = () => {
                  if (displaySpeed <= 20) return 'border-stone-200 shadow-stone-200/30';
                  if (displaySpeed <= 66) return 'border-stone-300 shadow-stone-300/30';
                  return 'border-stone-300 shadow-stone-300/30';
                };

                return (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                    {/* Fan header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`size-8 rounded-lg flex items-center justify-center ${
                          displaySpeed <= 20 ? 'bg-stone-200/10' : displaySpeed <= 66 ? 'bg-stone-300/10' : 'bg-stone-300/20'
                        }`}>
                          <Fan className={`size-4 ${
                            displaySpeed <= 20 ? 'text-stone-200' : displaySpeed <= 66 ? 'text-stone-300' : 'text-stone-400'
                          }`} />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-steel-100">{fan.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`inline-block size-1.5 rounded-full ${fan.active_cooling ? 'bg-stone-300' : 'bg-stone-300'}`} />
                            <span className="text-[9px] text-steel-500">{fan.active_cooling ? 'Active' : 'Passive'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xl font-bold font-mono ${
                          displaySpeed <= 20 ? 'text-stone-200' : displaySpeed <= 66 ? 'text-stone-300' : 'text-stone-400'
                        }`}>{displaySpeed}<span className="text-xs text-steel-500 ml-0.5">%</span></span>
                      </div>
                    </div>

                    {/* Slider */}
                    <div className="relative pt-6 pb-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={displaySpeed}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setDragSpeed(val);
                          setIsDragging(true);
                          if (val <= 20) setDragPolicy('silent');
                          else if (val <= 66) setDragPolicy('balanced');
                          else setDragPolicy('performance');
                        }}
                        onMouseUp={async () => {
                          if (dragSpeed === null) return;
                          const val = dragSpeed;
                          let pol = 'balanced';
                          if (val <= 20) pol = 'silent';
                          else if (val <= 66) pol = 'balanced';
                          else pol = 'performance';
                          try {
                            await invoke('set_fan_policy', { level: pol });
                            setFanPolicy(pol);
                            setEditResult(`Fan speed set to ${val}% (${pol})`);
                          } catch (err: any) {
                            setEditResult(`Failed: ${err}`);
                          } finally {
                            setIsDragging(false);
                            setDragSpeed(null);
                            setDragPolicy(null);
                          }
                        }}
                        onTouchEnd={async () => {
                          if (dragSpeed === null) return;
                          const val = dragSpeed;
                          let pol = 'balanced';
                          if (val <= 20) pol = 'silent';
                          else if (val <= 66) pol = 'balanced';
                          else pol = 'performance';
                          try {
                            await invoke('set_fan_policy', { level: pol });
                            setFanPolicy(pol);
                            setEditResult(`Fan speed set to ${val}% (${pol})`);
                          } catch (err: any) {
                            setEditResult(`Failed: ${err}`);
                          } finally {
                            setIsDragging(false);
                            setDragSpeed(null);
                            setDragPolicy(null);
                          }
                        }}
                        className="w-full appearance-none h-1.5 rounded-full bg-white/[0.06] outline-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-stone-300 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-all
                          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-stone-300"
                        style={{
                          background: `impulse-gradient(to right, ${displaySpeed <= 20 ? '#e8e2db' : displaySpeed <= 66 ? '#d6d1ca' : '#d6d1ca'}, ${displaySpeed <= 20 ? '#e8e2db' : displaySpeed <= 66 ? '#d6d1ca' : '#d6d1ca'}) ${displaySpeed}%, rgba(255,255,255,0.06) ${displaySpeed}%)`,
                        }}
                      />

                      {/* Zone labels */}
                      <div className="flex justify-between mt-1.5">
                        <span className={`text-[7px] font-medium ${displayPolicy === 'silent' ? 'text-stone-200' : 'text-steel-600'}`}>SILENT</span>
                        <span className={`text-[7px] font-medium ${displayPolicy === 'balanced' ? 'text-stone-300' : 'text-steel-600'}`}>BALANCED</span>
                        <span className={`text-[7px] font-medium ${displayPolicy === 'performance' ? 'text-stone-400' : 'text-steel-600'}`}>PERFORMANCE</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[10px] text-steel-500 py-6 text-center border border-dashed border-white/[0.06] rounded-xl">
              <Fan className="size-6 text-steel-600 mx-auto mb-2" />
              No individual fan data available. Use the policy quick buttons above.
            </div>
          )}

          {/* Policy bar legend */}
          <div className="relative mt-4 h-2 bg-white/[0.04] rounded-full overflow-hidden">
            <div className="absolute inset-0 flex">
              <div className="h-full w-[20%] bg-gradient-to-r from-stone-200/20 to-stone-400/10" />
              <div className="h-full w-[47%] bg-gradient-to-r from-stone-300/15 to-stone-400/10" />
              <div className="h-full w-[33%] bg-gradient-to-r from-stone-300/25 to-stone-400/10" />
            </div>
            <div className="absolute inset-0 flex items-center justify-around px-2">
              <span className={`text-[7px] font-mono ${fanPolicy === 'silent' ? 'text-stone-200' : 'text-white/20'}`}>SILENT</span>
              <span className={`text-[7px] font-mono ${fanPolicy === 'balanced' ? 'text-stone-300' : 'text-white/20'}`}>BALANCED</span>
              <span className={`text-[7px] font-mono ${fanPolicy === 'performance' ? 'text-stone-400' : 'text-white/20'}`}>PERF</span>
            </div>
          </div>
        </div>
      )}

      {hasSettings && (
        <div className="border border-white/[0.06] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="h-4 w-4 text-stone-300" />
            <span className="text-sm font-semibold text-white">System Settings ({settings.length})</span>
          </div>
          <div className="space-y-1 text-xs">
            {settings.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{s.name}</span>
                    <span className={`text-[9px] uppercase px-1 ${
                      s.category === 'CPU' ? 'text-stone-300 bg-stone-900/20' :
                      s.category === 'Memory' ? 'text-stone-300 bg-purple-900/20' :
                      s.category === 'Power' ? 'text-stone-300 bg-stone-900/20' :
                      s.category === 'Security' ? 'text-rose-400 bg-rose-900/20' :
                      s.category === 'Boot' ? 'text-stone-300 bg-stone-900/20' :
                      s.category === 'USB' ? 'text-stone-300 bg-stone-900/20' :
                      s.category === 'Network' ? 'text-stone-300 bg-stone-300/20' :
                      'text-white/50 bg-card-700'
                    }`}>{s.category}</span>
                  </div>
                  <div className="text-white/50 text-[10px] mt-0.5">{s.description}</div>
                </div>
                <div className="shrink-0">
                  {s.modifiable ? (
                    <CustomSelect
                      value={s.current_value}
                      onChange={(v) => changeSetting(s.name, v)}
                      options={s.possible_values.map((v) => ({
                        value: v,
                        label: v,
                      }))}
                      className="min-w-[130px]"
                    />
                  ) : (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      s.current_value === 'Enabled' || s.current_value === 'Ready' || s.current_value === 'Available'
                        ? 'bg-steel-700/30 text-steel-300 border border-white/[0.04]'
                        : s.current_value === 'Disabled' || s.current_value === 'Not available'
                        ? 'bg-stone-300/10 text-stone-300 border border-stone-300/20'
                        : 'bg-white/[0.04] text-steel-400 border border-white/[0.05]'
                    }`}>
                      {s.current_value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-stone-300">
            <AlertTriangle className="h-3 w-3" /> Some changes require admin rights or a reboot
          </div>
        </div>
      )}
    </div>
  );
}
