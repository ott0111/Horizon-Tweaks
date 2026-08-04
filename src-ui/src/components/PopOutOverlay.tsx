import { useEffect, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  X, Cpu, MemoryStick, Monitor, Thermometer, ArrowLeftRight, Activity,
  Lock, Unlock, Gauge, Network, Zap, Wifi, Signal
} from 'lucide-react';

interface Metrics {
  cpu_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  gpu_percent: number;
  gpu_vram_used_gb: number;
  cpu_temp_celsius: number;
  timestamp_ms: number;
  cpu_freq_mhz?: number;
  gpu_freq_mhz?: number;
  network_download_mbps?: number;
  network_upload_mbps?: number;
  fps?: number;
}

interface HistoryEntry { cpu: number; gpu: number; ram: number; temp: number }
const MAX_HISTORY = 30;

function Sparkline({ data, color, height = 14 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const w = 40;
  const max = Math.max(...data, 5);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - (v / max) * height}`).join(' ');
  return (
    <svg width={w} height={height} className="shrink-0" style={{ opacity: 0.5 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatRow({ icon, label, value, unit, pct, color, history }: {
  icon: React.ReactNode; label: string; value: number; unit: string; pct: number;
  color: string; history?: number[];
}) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03] transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <div className="size-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}12` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[8px] text-white/35 font-semibold uppercase tracking-wider font-grotesk">{label}</span>
          <span className="font-mono text-[11px] font-bold text-white tabular-nums">
            {value.toFixed(unit === 'GB' ? 1 : 0)}
            <span className="text-white/30 text-[8px] ml-0.5">{unit}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(pct, 100)}%`, background: `impulse-gradient(90deg, ${color}88, ${color})` }} />
          </div>
          {history && <Sparkline data={history} color={color} />}
        </div>
      </div>
    </div>
  );
}

export default function PopOutOverlay({ onClose }: { onClose: () => void }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [closing, setClosing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const historyRef = useRef<HistoryEntry[]>([]);
  const maxRef = useRef({ cpu: 0, ramPct: 0, gpu: 0, temp: 0 });

  const handleUpdate = useCallback((e: { payload: Metrics }) => {
    const m = e.payload;
    setMetrics(m);
    const rp = m.ram_total_gb > 0 ? (m.ram_used_gb / m.ram_total_gb) * 100 : 0;
    historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), { cpu: m.cpu_percent, gpu: m.gpu_percent, ram: rp, temp: m.cpu_temp_celsius }];
    maxRef.current = {
      cpu: Math.max(maxRef.current.cpu, m.cpu_percent),
      ramPct: Math.max(maxRef.current.ramPct, rp),
      gpu: Math.max(maxRef.current.gpu, m.gpu_percent),
      temp: Math.max(maxRef.current.temp, m.cpu_temp_celsius),
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try { const i = await invoke<Metrics>('get_metrics'); if (i) handleUpdate({ payload: i }); } catch {}
      try { await invoke('subscribe_metrics'); } catch {}
      try { unlisten = await listen<Metrics>('metrics-update', handleUpdate); } catch {}
    })();
    return () => { unlisten?.(); };
  }, [handleUpdate]);

  const cpu = metrics?.cpu_percent ?? 0;
  const ramUsed = metrics?.ram_used_gb ?? 0;
  const ramTotal = metrics?.ram_total_gb ?? 0;
  const ramPct = ramTotal > 0 ? (ramUsed / ramTotal) * 100 : 0;
  const gpu = metrics?.gpu_percent ?? 0;
  const temp = metrics?.cpu_temp_celsius ?? 0;
  const fps = metrics?.fps;
  const netDown = metrics?.network_download_mbps;
  const netUp = metrics?.network_upload_mbps;
  const history = historyRef.current;

  const getColor = (p: number) => p > 85 ? '#f43f5e' : p > 60 ? '#d6d1ca' : '#fbbf24';

  const returnToApp = async () => {
    setClosing(true);
    try { await invoke('return_to_app'); } catch {}
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'impulse-gradient(160deg, #050608 0%, #0a1628 50%, #050608 100%)' }}>
      <div data-tauri-drag-region className="flex items-center justify-between px-2.5 py-1.5 shrink-0 cursor-grab active:cursor-grabbing border-b border-white/[0.04]"
        style={{ background: 'impulse-gradient(90deg, rgba(245,158,11,0.06) 0%, transparent 50%, rgba(14,165,233,0.04) 100%)' }}>
        <div data-tauri-drag-region className="flex items-center gap-1.5">
          <div className="size-4 rounded bg-gradient-to-br from-stone-300/20 to-stone-400/15 flex items-center justify-center border border-stone-300/15">
            <Activity className="size-2.5 text-stone-300" />
          </div>
          <span className="text-[8px] font-bold text-white/30 tracking-[0.15em] uppercase font-grotesk">Horizon Overlay</span>
        </div>
        <div className="flex items-center gap-0.5">
          {fps !== undefined && fps > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-300/10 border border-white/[0.06] text-[8px] font-bold text-stone-300 font-mono mr-1">
              <Zap className="size-2" />{fps.toFixed(0)}
            </span>
          )}
          <button onClick={() => setExpanded(!expanded)} className="size-4 flex items-center justify-center rounded text-white/20 hover:text-stone-300 hover:bg-stone-300/10 transition-all" title={expanded ? 'Compact' : 'Extended'}>
            <Gauge className="size-2.5" />
          </button>
          <button onClick={() => setLocked(!locked)} className={`size-4 flex items-center justify-center rounded transition-all ${locked ? 'text-stone-300 bg-stone-300/10' : 'text-white/20 hover:text-white/40 hover:bg-white/[0.05]'}`} title={locked ? 'Unlock' : 'Lock'}>
            {locked ? <Lock className="size-2.5" /> : <Unlock className="size-2.5" />}
          </button>
          {!locked && (
            <>
              <div className="w-px h-3 bg-white/[0.06]" />
              <button onClick={returnToApp} className="size-4 flex items-center justify-center rounded text-white/20 hover:text-stone-300 hover:bg-stone-300/10 transition-all" title="Return">
                <ArrowLeftRight className="size-2.5" />
              </button>
              <button onClick={returnToApp} className="size-4 flex items-center justify-center rounded text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                <X className="size-2.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 p-1.5 flex flex-col overflow-hidden">
        <StatRow icon={<Cpu className="size-2.5 text-stone-300" />} label="CPU" value={cpu} unit="%" pct={cpu} color={getColor(cpu)} history={history.map(h => h.cpu)} />
        <StatRow icon={<MemoryStick className="size-2.5 text-stone-300" />} label="RAM" value={ramUsed} unit="GB" pct={ramPct} color={getColor(ramPct)} history={history.map(h => h.ram)} />
        <StatRow icon={<Monitor className="size-2.5 text-stone-300" />} label="GPU" value={gpu} unit="%" pct={gpu} color={getColor(gpu)} history={history.map(h => h.gpu)} />
        {temp > 0 && (
          <StatRow icon={<Thermometer className="size-2.5 text-stone-300" />} label="TMP" value={temp} unit="°C" pct={(temp / 100) * 100} color={temp > 80 ? '#f43f5e' : temp > 60 ? '#d6d1ca' : '#fbbf24'} history={history.map(h => h.temp)} />
        )}
        {expanded && netDown !== undefined && netUp !== undefined && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03] transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div className="size-6 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(168,85,247,0.1)' }}>
              <Wifi className="size-2.5 text-stone-300" />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[8px] text-white/35 font-semibold uppercase tracking-wider font-grotesk">NET</span>
              <div className="flex items-center gap-1.5 text-[9px] font-mono">
                <span className="text-stone-300/60">↓{netDown.toFixed(1)}</span>
                <span className="text-white/15">/</span>
                <span className="text-rose-400/60">↑{netUp.toFixed(1)}</span>
                <span className="text-white/20 text-[7px]">Mbps</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-2.5 py-1 border-t border-white/[0.04] flex items-center justify-between text-[7px] text-white/15 shrink-0 font-mono">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1"><span className="size-1 rounded-full bg-stone-300/50" />Mx CPU {maxRef.current.cpu.toFixed(0)}%</span>
          <span className="flex items-center gap-1"><span className="size-1 rounded-full bg-stone-300/50" />Mx RAM {maxRef.current.ramPct.toFixed(0)}%</span>
        </div>
        <span>{ramTotal.toFixed(0)}GB</span>
      </div>
    </div>
  );
}
