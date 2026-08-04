import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Activity, Monitor, HardDrive, Trash2, Cpu, Gauge, Thermometer, Clock, PictureInPicture, Zap, CheckCircle, Target, Heart } from 'lucide-react';
import { useTier } from '../hooks/useTier';
interface Metrics {
  cpu_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  gpu_percent: number;
  cpu_temp_celsius: number;
  gpu_temp_celsius: number;
  timestamp_ms: number;
}

interface GpuDevice {
  name: string;
  vendor: string;
  vram_gb: number;
  driver_version: string;
}

interface DriveInfo {
  letter: string;
  label: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  usage_percent: number;
  drive_type: string;
}

const MiniSparkline = React.memo(function MiniSparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const max = useMemo(() => Math.max(...data, 1), [data]);
  if (data.length < 2) return null;
  return (
    <div className="flex items-end gap-[1px]" style={{ height }}>
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 transition-all duration-200"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: v > 0 ? '3px' : '0' }}
        />
      ))}
    </div>
  );
});

export default function Dashboard({ data, onPopOut }: { data: any; onPopOut: () => void }) {
  const { checkTier } = useTier();
  const canPopOut = checkTier('pro');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [gpus, setGpus] = useState<GpuDevice[]>([]);
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [cleaning, setCleaning] = useState<string | null>(null);
  const [cleanResult, setCleanResult] = useState<string | null>(null);
  const [appliedTweaks, setAppliedTweaks] = useState<string[]>([]);

  const historyRef = useRef<{ cpu: number[]; ram: number[]; gpu: number[]; cpuTemp: number[]; gpuTemp: number[] }>({ cpu: [], ram: [], gpu: [], cpuTemp: [], gpuTemp: [] });

  // Compute health score from metrics
  const healthScore = useMemo(() => {
    if (!metrics) return 75;
    const cpuScore = Math.max(0, 100 - metrics.cpu_percent);
    const ramPct = metrics.ram_total_gb > 0 ? (metrics.ram_used_gb / metrics.ram_total_gb) * 100 : 50;
    const ramScore = Math.max(0, 100 - ramPct);
    const gpuScore = Math.max(0, 100 - metrics.gpu_percent);
    const tempScore = metrics.cpu_temp_celsius > 0 ? Math.max(0, 100 - metrics.cpu_temp_celsius) : 80;
    return Math.round(cpuScore * 0.35 + ramScore * 0.25 + gpuScore * 0.25 + tempScore * 0.15);
  }, [metrics]);

  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Poor';
  const healthColor = healthScore >= 80 ? '#8b95a5' : healthScore >= 60 ? '#a8b2c4' : healthScore >= 40 ? '#38bdf8' : '#c45050';

  useEffect(() => {
    invoke<GpuDevice[]>('get_all_gpus').then(setGpus).catch(() => {});
    invoke<DriveInfo[]>('get_all_drives').then(setDrives).catch(() => {});
    invoke<string[]>('get_applied_tweaks').then(setAppliedTweaks).catch(() => {});
  }, []);

  const hasGpuTemp = metrics && (metrics.gpu_temp_celsius || 0) > 0;

  const handleMetricsUpdate = useCallback((e: { payload: Metrics }) => {
    const m = e.payload;
    setMetrics(m);
    const h = historyRef.current;
    h.cpu.push(m.cpu_percent); if (h.cpu.length > 60) h.cpu.shift();
    h.ram.push(m.ram_used_gb); if (h.ram.length > 60) h.ram.shift();
    h.gpu.push(m.gpu_percent); if (h.gpu.length > 60) h.gpu.shift();
    if ((m.cpu_temp_celsius || 0) > 0) { h.cpuTemp.push(m.cpu_temp_celsius); if (h.cpuTemp.length > 60) h.cpuTemp.shift(); }
    if ((m.gpu_temp_celsius || 0) > 0) { h.gpuTemp.push(m.gpu_temp_celsius); if (h.gpuTemp.length > 60) h.gpuTemp.shift(); }
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        await invoke('subscribe_metrics');
        unlisten = await listen<Metrics>('metrics-update', handleMetricsUpdate);
      } catch {}
    })();
    return () => unlisten?.();
  }, [handleMetricsUpdate]);

  const cleanStorage = async (letter: string) => {
    setCleaning(letter); setCleanResult(null);
    try {
      await invoke('clean_drive', { driveLetter: letter });
      setCleanResult(`Cleaned ${letter}`);
      setDrives(await invoke<DriveInfo[]>('get_all_drives'));
    } catch (e: any) { setCleanResult(`Failed: ${e}`); }
    setCleaning(null);
  };

  if (!data) return null;

  const sysInfo = data;
  const getDriveColor = (pct: number) => pct > 90 ? 'text-red-400' : pct > 70 ? 'text-stone-300' : 'text-steel-300';
  const getDriveIcon = (type: string) => type === 'NVMe' ? 'M.2' : type === 'SSD' ? 'SSD' : type === 'HDD' ? 'HDD' : type;
  const hist = historyRef.current;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised border border-white/[0.06]">
            <Target className="size-5 text-steel-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-steel-100">System Dashboard</h1>
            <p className="text-xs text-steel-500 mt-0.5">Real-time performance monitoring</p>
          </div>
        </div>
        {canPopOut && (
          <button
            onClick={async () => {
              try { await invoke('open_popout'); } catch {}
              onPopOut();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-br from-stone-300/10 to-stone-400/10 border border-stone-300/15 text-stone-200 hover:from-stone-300/20 hover:to-stone-400/20 hover:border-stone-300/25 transition-all shadow-lg shadow-black/10"
          >
            <PictureInPicture className="size-3.5" />
            Pop-out Mode
          </button>
        )}
      </div>

      {/* System Health Score Gauge */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-5">
          {/* Circular SVG Gauge */}
          <div className="relative shrink-0">
            <svg width="90" height="90" viewBox="0 0 90 90">
              {/* Background circle */}
              <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
              {/* Score impulse */}
              <circle
                cx="45" cy="45" r="38" fill="none"
                stroke={healthColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(healthScore / 100) * 238.76} 238.76`}
                transform="rotate(-90 45 45)"
                style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.8s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-mono" style={{ color: healthColor }}>{healthScore}</span>
              <span className="text-[8px] text-steel-500 font-medium">/ 100</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="size-4 text-steel-400" />
              <span className="text-sm font-semibold text-steel-200">System Health</span>
              <span className="text-[9px] px-2 py-0.5 rounded-md border border-white/[0.06] font-medium"
                style={{ color: healthColor, backgroundColor: `${healthColor}15` }}>
                {healthLabel}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'CPU', value: metrics ? `${metrics.cpu_percent.toFixed(0)}%` : '—', good: (metrics?.cpu_percent ?? 50) < 70 },
                { label: 'RAM', value: metrics ? `${((metrics.ram_used_gb / Math.max(metrics.ram_total_gb, 1)) * 100).toFixed(0)}%` : '—', good: metrics ? (metrics.ram_used_gb / Math.max(metrics.ram_total_gb, 1)) < 0.8 : true },
                { label: 'GPU', value: metrics ? `${metrics.gpu_percent.toFixed(0)}%` : '—', good: (metrics?.gpu_percent ?? 50) < 80 },
                { label: 'Temp', value: metrics && metrics.cpu_temp_celsius > 0 ? `${metrics.cpu_temp_celsius.toFixed(0)}°C` : 'N/A', good: (metrics?.cpu_temp_celsius ?? 0) < 70 },
              ].map(({ label, value, good }) => (
                <div key={label} className="text-center">
                  <span className="text-[9px] text-steel-500 block mb-0.5">{label}</span>
                  <span className={`text-sm font-bold font-mono ${good ? 'text-steel-200' : 'text-stone-300'}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row with Sparklines */}
      <div className={`grid grid-cols-1 gap-3 ${hasGpuTemp ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-steel-500 font-medium">CPU Usage</span>
            <span className="text-lg font-bold font-mono text-steel-100">{metrics ? metrics.cpu_percent.toFixed(1) : (sysInfo?.cpu_usage || 0)}<span className="text-xs text-steel-500">%</span></span>
          </div>
          <MiniSparkline data={hist.cpu} color="#8b95a5" />
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-steel-500 font-medium">Memory</span>
            <span className="text-lg font-bold font-mono text-steel-100">{metrics ? metrics.ram_used_gb.toFixed(1) : (sysInfo?.memory_usage || 0)}<span className="text-xs text-steel-500">GB</span></span>
          </div>
          <MiniSparkline data={hist.ram} color="#a8b2c4" />
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-steel-500 font-medium">GPU Usage</span>
            <span className="text-lg font-bold font-mono text-steel-100">{metrics ? metrics.gpu_percent.toFixed(1) : (sysInfo?.gpu_usage || 0)}<span className="text-xs text-steel-500">%</span></span>
          </div>
          <MiniSparkline data={hist.gpu} color="#6b7585" />
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-steel-500 font-medium">CPU Temp</span>
            <span className="text-lg font-bold font-mono text-steel-100">
              {metrics && metrics.cpu_temp_celsius > 0 ? `${metrics.cpu_temp_celsius.toFixed(0)}°` : <span className="text-steel-600">N/A</span>}
            </span>
          </div>
          {metrics && metrics.cpu_temp_celsius > 0 && (
            <MiniSparkline data={hist.cpuTemp} color={metrics.cpu_temp_celsius > 80 ? '#c45050' : metrics.cpu_temp_celsius > 60 ? '#38bdf8' : '#8b95a5'} />
          )}
        </div>
        {/* GPU Temp - only shown when available */}
        {hasGpuTemp && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-steel-500 font-medium">GPU Temp</span>
              <span className="text-lg font-bold font-mono text-steel-100">
                {(metrics?.gpu_temp_celsius || 0) > 0 ? `${(metrics?.gpu_temp_celsius || 0).toFixed(0)}°` : <span className="text-steel-600">N/A</span>}
              </span>
            </div>
            {(metrics?.gpu_temp_celsius || 0) > 0 && (
              <MiniSparkline data={hist.gpuTemp} color={(metrics?.gpu_temp_celsius || 0) > 85 ? '#c45050' : (metrics?.gpu_temp_celsius || 0) > 65 ? '#38bdf8' : '#6b7585'} />
            )}
          </div>
        )}
      </div>

      {/* Applied Tweaks Card */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised-sm border border-white/[0.06]">
              <CheckCircle className="h-5 w-5 text-steel-300" />
            </div>
            <div>
              <span className="text-sm font-semibold text-steel-200">Applied Tweaks</span>
              <p className="text-[10px] text-steel-500">Currently active optimizations</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-steel-200">{appliedTweaks.length}</span>
            <span className="text-xs text-steel-500 ml-1">tweaks</span>
          </div>
        </div>
        {appliedTweaks.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {appliedTweaks.map((id) => (
              <span key={id} className="text-[9px] px-2 py-0.5 rounded-md bg-steel-700/30 border border-white/[0.04] text-steel-300">
                {id.replace(/^(gt-|advanced-)/, '').replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Info */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-7 rounded-lg bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised-sm border border-white/[0.05]">
              <Activity className="h-3.5 w-3.5 text-steel-300" />
            </div>
            <span className="text-sm font-semibold text-steel-200">System</span>
          </div>
          <div className="space-y-2.5 text-xs">
            {[
              ['CPU', sysInfo?.cpu_name || 'Loading...'],
              ['RAM', metrics ? `${metrics.ram_total_gb.toFixed(1)} GB` : `${sysInfo?.total_memory_gb || 16} GB`],
              ['OS', sysInfo?.os_name || 'Loading...'],
              ['Health', { v: sysInfo?.overall_health || 'Good', color: sysInfo?.overall_health === 'Good' || sysInfo?.overall_health === 'Excellent' ? 'text-steel-300' : 'text-stone-300' }],
            ].map(([k, val]: any) => (
              <div key={k} className="flex justify-between border-b border-white/[0.04] pb-2 last:border-0">
                <span className="text-steel-500">{k}</span>
                <span className={`font-medium text-steel-200 text-right truncate ml-2 ${val.color || ''}`}>{val.v || val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* GPUs */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-7 rounded-lg bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised-sm border border-white/[0.05]">
              <Monitor className="h-3.5 w-3.5 text-steel-300" />
            </div>
            <span className="text-sm font-semibold text-steel-200">{gpus.length > 1 ? `GPUs (${gpus.length})` : 'GPU'}</span>
          </div>
          <div className="space-y-2">
            {gpus.length === 0 ? (
              <p className="text-steel-500 text-xs">Detecting...</p>
            ) : gpus.map((gpu, i) => (
              <div key={i} className="glass-card p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Cpu className="h-3.5 w-3.5 text-steel-400 shrink-0" />
                    <span className="text-xs text-steel-200 truncate">{gpu.name}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md shrink-0 ml-1 ${
                    gpu.vendor === 'NVIDIA' ? 'bg-steel-600/20 border border-steel-500/20 text-steel-300' :
                    gpu.vendor === 'AMD' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                    gpu.vendor === 'Intel' ? 'bg-stone-300/10 border border-stone-300/20 text-stone-300' : 'bg-white/[0.04] border border-white/[0.05] text-steel-500'
                  }`}>{gpu.vendor}</span>
                </div>
                <div className="flex gap-3 text-[9px] text-steel-500">
                  {gpu.vram_gb > 0 && <span>VRAM: {gpu.vram_gb} GB</span>}
                  <span>Driver: {gpu.driver_version}</span>
                </div>
                {metrics && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-chrome transition-all" style={{ width: `${metrics.gpu_percent}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-chrome">{metrics.gpu_percent.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Storage Health */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-7 rounded-lg bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised-sm border border-white/[0.05]">
            <HardDrive className="h-3.5 w-3.5 text-steel-300" />
          </div>
          <span className="text-sm font-semibold text-steel-200">Storage Health</span>
        </div>
        <div className="space-y-2">
          {drives.length === 0 ? (
            <p className="text-steel-500 text-xs">Detecting drives...</p>
          ) : drives.map((drive, i) => (
            <div key={i} className="flex items-center gap-3 p-3 glass-card">
              <div className="size-10 rounded-xl bg-gradient-to-br from-steel-700/50 to-steel-800/50 border border-white/[0.05] flex items-center justify-center shrink-0 shadow-neo-raised-sm">
                <span className="text-base font-bold text-steel-200">{drive.letter.replace(':', '')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-steel-200">{drive.label || drive.letter}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04] text-steel-500">{getDriveIcon(drive.drive_type)}</span>
                  </div>
                  <span className={`text-xs font-medium ${getDriveColor(drive.usage_percent)}`}>{drive.used_gb.toFixed(1)} / {drive.total_gb.toFixed(1)} GB</span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden mb-1">
                  <div className={`h-full rounded-full transition-all ${drive.usage_percent > 90 ? 'bg-red-500' : drive.usage_percent > 70 ? 'bg-stone-300' : 'bg-steel-400'}`}
                    style={{ width: `${Math.min(drive.usage_percent, 100)}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-steel-500">
                  <span>{drive.free_gb.toFixed(1)} GB free</span>
                  <span>{drive.usage_percent.toFixed(0)}% used</span>
                </div>
              </div>
              <button
                onClick={() => cleanStorage(drive.letter)}
                disabled={cleaning !== null}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-medium bg-steel-700/30 border border-white/[0.05] text-steel-300 hover:bg-steel-600/30 hover:border-white/[0.08] transition-all disabled:opacity-50 shadow-neo-raised-sm"
              >
                <Trash2 className="h-3 w-3" />
                {cleaning === drive.letter ? 'Clean...' : 'Clean'}
              </button>
            </div>
          ))}
        </div>
        {cleanResult && <div className="mt-3 text-xs text-steel-300">{cleanResult}</div>}
      </div>
    </div>
  );
}
