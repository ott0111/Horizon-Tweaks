import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Cpu, MemoryStick, HardDrive, Archive, Monitor, Play, RotateCcw, Gauge, CheckCircle, ChevronDown, ChevronUp, BarChart3, TrendingUp, Info, Server, Activity, Clock, AlertTriangle, Lightbulb, Copy, Layers, Flame, Database, Sparkles, Shield } from 'lucide-react';

interface BenchmarkResult {
  score: number;
  label: string;
  duration_ms: number;
  description: string;
}

type HistoryEntry = { score: number; time: number };

const STAGES: Record<string, string[]> = {
  cpu: ['Compiling .NET...', 'Single-core prime sieve (500K)...', 'SHA-256 crypto (10K×4KB)...', 'Multi-core parallel primes...', 'Matrix multiply (200×200)...', 'Final score...'],
  memory: ['Compiling .NET...', 'Warmup pass...', '512MB copy bandwidth...', '512MB write bandwidth...', '512MB read bandwidth...', 'Random access latency...', 'Final score...'],
  disk: ['Generating 50MB test data...', 'Sequential write...', 'Sequential read...', 'Cleanup & score...'],
  compression: ['Compiling .NET...', '100MB GZip compress...', '100MB GZip decompress...', 'Final score...'],
  gpu: ['Compiling .NET...', 'Querying GPU info...', '500×500 matrix compute (×3)...', 'Final score...'],
  randomio: ['Compiling .NET...', 'Create 100MB test file...', '5K random 4K reads...', '5K random 4K writes...', 'Cleanup & score...'],
  singlecore: ['Compiling .NET...', 'Prime sieve (1M) single-thread...', 'Matrix multiply (250×250)...', 'Final score...'],
  multicore: ['Compiling .NET...', 'Parallel prime sieve (1M)...', 'Final score...'],
  cpustress: ['Compiling .NET...', 'Sustained multi-core load (15s)...', 'Monitoring thermals...', 'Final score...'],
  gpustress: ['Compiling .NET...', 'Sustained GPU compute (15s)...', 'Querying GPU clocks...', 'Final score...'],
};

type BenchCategory = 'core' | 'io' | 'stress';

interface BenchDef {
  id: string;
  name: string;
  desc: string;
  icon: any;
  cmd: string;
  maxScore: number;
  category: BenchCategory;
}

const BENCHES: BenchDef[] = [
  { id: 'cpu', name: 'CPU', desc: 'Primes, SHA-256, matrix, parallel — .NET compiled', icon: Cpu, cmd: 'run_cpu_benchmark', maxScore: 100000, category: 'core' },
  { id: 'singlecore', name: 'Single-Core', desc: 'Prime sieve 1M + matrix 250×250 — 1 thread', icon: Cpu, cmd: 'run_singlecore_cpu', maxScore: 50000, category: 'core' },
  { id: 'multicore', name: 'Multi-Core', desc: 'Parallel prime sieve 1M — all threads', icon: Layers, cmd: 'run_multicore_cpu', maxScore: 80000, category: 'core' },
  { id: 'memory', name: 'Memory', desc: '512MB copy/write/read bandwidth + latency', icon: MemoryStick, cmd: 'run_memory_benchmark', maxScore: 80000, category: 'io' },
  { id: 'disk', name: 'Disk', desc: '50MB sequential write+read on C:', icon: HardDrive, cmd: 'run_disk_benchmark', maxScore: 10000, category: 'io' },
  { id: 'compression', name: 'Compression', desc: '100MB GZip compress+decompress', icon: Archive, cmd: 'run_compression_benchmark', maxScore: 10000, category: 'io' },
  { id: 'randomio', name: 'Random I/O', desc: '2K random 4K reads+writes on C:', icon: Database, cmd: 'run_random_io_benchmark', maxScore: 6000, category: 'io' },
  { id: 'gpu', name: 'GPU Compute', desc: '500×500 matrix (3×) + GPU info from WMI', icon: Monitor, cmd: 'run_gpu_benchmark', maxScore: 20000, category: 'stress' },
  { id: 'cpustress', name: 'CPU Stress', desc: 'Sustained multi-core load for 15s', icon: Flame, cmd: 'run_cpu_stress_test', maxScore: 60000, category: 'stress' },
  { id: 'gpustress', name: 'GPU Stress', desc: 'Sustained GPU compute (400×400) 15s', icon: Flame, cmd: 'run_gpu_stress_test', maxScore: 15000, category: 'stress' },
];

const CATEGORY_LABELS: Record<BenchCategory, { label: string; icon: any; color: string; desc: string }> = {
  core: { label: 'Core Performance', icon: Cpu, color: 'text-steel-200', desc: 'CPU processing power — single & multi-threaded' },
  io: { label: 'Memory & Storage', icon: HardDrive, color: 'text-steel-300', desc: 'Bandwidth, latency, and I/O throughput' },
  stress: { label: 'GPU & Stress Tests', icon: Flame, color: 'text-stone-300', desc: 'Sustained loads and GPU compute' },
};

const REFERENCE_TABLES: Record<string, { range: string; description: string; color: string }[]> = {
  cpu: [
    { range: '>60K', description: 'i9-14900K / Ryzen 9 7950X', color: 'text-steel-200' },
    { range: '30-60K', description: 'i7-14700K / Ryzen 7 7800X3D', color: 'text-steel-300' },
    { range: '15-30K', description: 'i5-14600K / Ryzen 5 7600X', color: 'text-steel-400' },
    { range: '7-15K', description: 'i3 / Ryzen 3 / mobile', color: 'text-stone-300' },
    { range: '<7K', description: 'Low performance', color: 'text-red-400' },
  ],
  memory: [
    { range: '>55000', description: 'DDR5-8400+ / DDR5-8000 XMP', color: 'text-steel-200' },
    { range: '35000-55000', description: 'DDR5-7200 / DDR5-6400', color: 'text-steel-300' },
    { range: '20000-35000', description: 'DDR5-6000 / DDR5-5600', color: 'text-steel-400' },
    { range: '10000-20000', description: 'DDR5-4800 / DDR4-3600', color: 'text-stone-300' },
    { range: '5000-10000', description: 'DDR4-3200 / DDR4-2666', color: 'text-stone-300' },
    { range: '<5000', description: 'DDR4-2400 or below', color: 'text-red-400' },
  ],
  disk: [
    { range: '>5000', description: 'NVMe PCIe 4.0/5.0', color: 'text-steel-200' },
    { range: '2500-5000', description: 'NVMe PCIe 3.0', color: 'text-steel-300' },
    { range: '800-2500', description: 'SATA SSD', color: 'text-stone-300' },
    { range: '<800', description: 'HDD', color: 'text-red-400' },
  ],
  compression: [
    { range: '>5000', description: 'Excellent — high-end desktop', color: 'text-steel-200' },
    { range: '3000-5000', description: 'Good — modern CPU', color: 'text-steel-300' },
    { range: '1500-3000', description: 'Average', color: 'text-stone-300' },
    { range: '<1500', description: 'Low', color: 'text-red-400' },
  ],
  gpu: [
    { range: '>10000', description: 'High-end desktop / workstation', color: 'text-steel-200' },
    { range: '5000-10000', description: 'Mid-range / previous gen', color: 'text-steel-300' },
    { range: '2000-5000', description: 'Budget / integrated', color: 'text-stone-300' },
    { range: '<2000', description: 'Entry-level / older iGPU', color: 'text-red-400' },
  ],
  randomio: [
    { range: '>3000', description: 'NVMe — excellent random I/O', color: 'text-steel-200' },
    { range: '1500-3000', description: 'Good — modern SSD', color: 'text-steel-300' },
    { range: '700-1500', description: 'Average — SATA / older SSD', color: 'text-stone-300' },
    { range: '<700', description: 'HDD — very slow random I/O', color: 'text-red-400' },
  ],
  singlecore: [
    { range: '>30K', description: 'Excellent — high IPC (e.g. i9-14900K)', color: 'text-steel-200' },
    { range: '15-30K', description: 'Good — modern i5/Ryzen 5', color: 'text-steel-300' },
    { range: '7-15K', description: 'Average — older gen / mobile', color: 'text-stone-300' },
    { range: '<7K', description: 'Low single-thread perf', color: 'text-red-400' },
  ],
  multicore: [
    { range: '>50K', description: 'Excellent — 16+ cores', color: 'text-steel-200' },
    { range: '25-50K', description: 'High — 8-12 cores', color: 'text-steel-200' },
    { range: '10-25K', description: 'Good — 6-8 cores', color: 'text-steel-300' },
    { range: '4-10K', description: 'Average — 4 cores', color: 'text-stone-300' },
    { range: '<4K', description: 'Low core count / old CPU', color: 'text-red-400' },
  ],
  cpustress: [
    { range: '>30K', description: 'Excellent thermal headroom', color: 'text-steel-200' },
    { range: '15-30K', description: 'Good sustained perf', color: 'text-steel-300' },
    { range: '6-15K', description: 'Average — some throttling', color: 'text-stone-300' },
    { range: '<6K', description: 'Throttling under load', color: 'text-red-400' },
  ],
  gpustress: [
    { range: '>8K', description: 'Excellent compute throughput', color: 'text-steel-200' },
    { range: '4-8K', description: 'Good — mid-range GPU', color: 'text-steel-300' },
    { range: '1.5-4K', description: 'Average — integrated / older', color: 'text-stone-300' },
    { range: '<1.5K', description: 'Low — iGPU / very old', color: 'text-red-400' },
  ],
};

function parseMetrics(desc: string): { metrics: { label: string; value: string }[]; rating: string } {
  const parts = desc.split(' | ').map(s => s.trim());
  if (parts.length < 2) return { metrics: [{ label: 'Info', value: desc }], rating: '' };
  const ratings = ['Excellent', 'High', 'Good', 'Average', 'Low'];
  let rating = '';
  let metricsParts = parts;
  for (let i = parts.length - 1; i >= 0; i--) {
    const val = parts[i].includes(':') ? parts[i].split(':').pop()!.trim() : parts[i];
    if (ratings.includes(val)) { rating = val; metricsParts = parts.slice(0, i); break; }
  }
  const metrics = metricsParts.map(p => {
    const sep = p.indexOf(':');
    return sep > 0 ? { label: p.slice(0, sep).trim(), value: p.slice(sep + 1).trim() } : { label: '', value: p };
  });
  return { metrics, rating };
}

function ratingBadge(rating: string): { text: string; color: string; bg: string } {
  if (['Excellent', 'High'].includes(rating)) return { text: rating, color: 'text-steel-200', bg: 'bg-steel-600/20 border-steel-500/30' };
  if (['Good'].includes(rating)) return { text: rating, color: 'text-steel-300', bg: 'bg-steel-600/15 border-steel-500/20' };
  if (['Average'].includes(rating)) return { text: rating, color: 'text-stone-300', bg: 'bg-stone-300/10 border-stone-300/20' };
  return { text: rating, color: 'text-red-400', bg: 'bg-red-900/30 border-red-700/50' };
}

function extractSubscores(metrics: { label: string; value: string }[]): { label: string; val: number; pct: number }[] {
  const out: { label: string; val: number; pct: number }[] = [];
  for (const m of metrics) {
    const num = parseFloat(m.value);
    if (!isNaN(num)) out.push({ label: m.label.split(' ')[0], val: num, pct: 0 });
  }
  const max = Math.max(...out.map(o => o.val), 1);
  out.forEach(o => o.pct = (o.val / max) * 100);
  return out;
}

function SubScoreChart({ items }: { items: { label: string; val: number; pct: number }[] }) {
  if (items.length === 0) return null;
  const barColors = ['#8b95a5', '#a8b2c4', '#d4a843', '#6b7585', '#9aa5b8', '#b8c2d4'];
  return (
    <div className="space-y-1 mt-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-[9px]">
          <span className="text-steel-500 w-14 text-right shrink-0 truncate">{item.label}</span>
          <div className="flex-1 h-2.5 bg-steel-700/30 rounded-sm overflow-hidden">
            <div className="h-full rounded-sm transition-all duration-700" style={{ width: `${item.pct}%`, backgroundColor: barColors[i % barColors.length] }} />
          </div>
          <span className="font-mono text-steel-500 w-16 text-right shrink-0">{item.val.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

function BenchmarkHistory({ hist, currentScore }: { hist: HistoryEntry[]; currentScore: number }) {
  if (hist.length < 2) return null;
  const prev = hist[hist.length - 2];
  const diff = currentScore - prev.score;
  const pctChange = prev.score > 0 ? (diff / prev.score) * 100 : 0;
  const isUp = diff >= 0;
  const max = Math.max(...hist.map(e => e.score), 1);
  const w = 80, h = 24;
  const pts = hist.map((e, i) => `${(i / (hist.length - 1)) * w},${h - (e.score / max) * h}`).join(' ');
  return (
    <div className="border-t border-white/[0.06] pt-1.5 mt-0.5">
      <div className="flex items-center gap-1 text-[8px] text-steel-500 mb-1">
        <TrendingUp className="h-2.5 w-2.5" /> History ({hist.length} runs)
      </div>
      <div className="flex items-center gap-3 text-[9px]">
        <div className={`flex items-center gap-0.5 font-mono font-semibold ${isUp ? 'text-steel-300' : 'text-red-400'}`}>
          {isUp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {Math.abs(pctChange).toFixed(1)}%
        </div>
        <svg width={w} height={h} className="shrink-0 ml-auto">
          <polyline points={pts} fill="none" stroke="#8b95a5" strokeWidth="1.5" />
          {hist.map((e, i) => (
            <circle key={i} cx={(i / (hist.length - 1)) * w} cy={h - (e.score / max) * h} r="1.5" fill="#8b95a5" />
          ))}
        </svg>
      </div>
    </div>
  );
}

function getPercentile(score: number, max: number): number {
  const pct = (score / max) * 100;
  return Math.min(Math.round(pct), 99);
}

function getOverallGrade(totalScore: number): { label: string; color: string; bg: string; icon: any; gradient: string; tips: string[] } {
  if (totalScore > 350000) return {
    label: 'Excellent', color: 'text-steel-200', bg: 'bg-steel-500/15 border-steel-400/30', icon: Sparkles,
    gradient: 'from-steel-500/15 to-steel-700/15',
    tips: ['Your system is a powerhouse. Consider stress testing for sustained workloads.', 'Ensure cooling handles extended loads.', 'Driver updates may unlock marginal gains.']
  };
  if (totalScore > 200000) return {
    label: 'Good', color: 'text-steel-300', bg: 'bg-steel-500/10 border-steel-400/20', icon: Shield,
    gradient: 'from-steel-500/10 to-steel-700/10',
    tips: ['Solid all-around performance.', 'Close background apps during gaming.', 'Check for BIOS/firmware updates.']
  };
  if (totalScore > 100000) return {
    label: 'Average', color: 'text-stone-300', bg: 'bg-stone-300/10 border-stone-300/20', icon: Activity,
    gradient: 'from-stone-300/10 to-stone-900/10',
    tips: ['Apply performance tweaks from General Tweaks.', 'Check for thermal throttling.', 'Consider upgrading RAM or storage.']
  };
  return {
    label: 'Needs Attention', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: AlertTriangle,
    gradient: 'from-red-500/15 to-rose-700/15',
    tips: ['Run Disk Cleanup and System File Checker.', 'Disable unnecessary startup programs.', 'Consider hardware upgrades for significant gains.']
  };
}

function SystemInfoCard() {
  const [info, setInfo] = useState<any>(null);
  useEffect(() => {
    Promise.all([
      invoke<any>('get_system_status_basic').catch(() => ({ cpu_name: 'Unknown', total_memory_gb: 0, os_name: 'Unknown' })),
      invoke<any>('get_gpu_info').catch(() => ({ gpu_name: 'Unknown' })),
    ]).then(([basic, gpu]) => {
      setInfo({ ...basic, gpu_name: gpu.gpu_name || 'Unknown GPU' });
    });
  }, []);
  if (!info) return (
    <div className="glass-panel p-4 animate-pulse">
      <div className="h-4 bg-white/[0.06] rounded w-32 mb-3" />
      <div className="grid grid-cols-4 gap-3"><div className="h-8 bg-white/[0.04] rounded" /><div className="h-8 bg-white/[0.04] rounded" /><div className="h-8 bg-white/[0.04] rounded" /><div className="h-8 bg-white/[0.04] rounded" /></div>
    </div>
  );
  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Server className="h-4 w-4 text-steel-400" />
        <span className="text-xs font-semibold text-steel-200 uppercase tracking-wider">System Overview</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
        {[
          { label: 'CPU', value: info.cpu_name, icon: Cpu },
          { label: 'GPU', value: info.gpu_name, icon: Monitor },
          { label: 'RAM', value: `${info.total_memory_gb} GB`, icon: MemoryStick },
          { label: 'OS', value: info.os_name, icon: Info },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-steel-700/30 border border-white/[0.06]">
            <item.icon className="h-3.5 w-3.5 text-steel-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-[8px] text-steel-500 uppercase">{item.label}</div>
              <div className="text-steel-300 font-medium truncate">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Benchmark() {
  const [results, setResults] = useState<Record<string, BenchmarkResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [showRef, setShowRef] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setStageIdx(i => (i + 1) % (STAGES[running]?.length || 1));
      }, 2200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setStageIdx(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  const run = async (bench: string, cmd: string) => {
    setRunning(bench);
    try {
      const result = await invoke<BenchmarkResult>(cmd,
        bench === 'disk' || bench === 'randomio' ? { path: 'C:\\' } : {});
      setResults(p => ({ ...p, [bench]: result }));
      setHistory(p => {
        const arr = p[bench] || [];
        return { ...p, [bench]: [...arr, { score: result.score, time: Date.now() }].slice(-10) };
      });
      setCompletedCount(c => c + 1);
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : e?.message || `${bench} benchmark failed`;
      setNotification({ type: 'error', message: msg });
    }
    setRunning(null);
  };

  const runAll = async () => {
    setRunningAll(true);
    setCompletedCount(0);
    abortRef.current = false;
    for (const b of BENCHES) {
      if (abortRef.current) break;
      await run(b.id, b.cmd);
    }
    if (!abortRef.current) {
      setNotification({ type: 'success', message: 'All benchmarks completed!' });
    }
    setRunningAll(false);
  };

  const totalScore = Object.values(results).reduce((s, r) => s + r.score, 0);
  const grade = Object.keys(results).length >= 3 ? getOverallGrade(totalScore) : null;

  const scoreColor = (score: number, max: number) => {
    const pct = score / max;
    return pct > 0.7 ? 'text-steel-200' : pct > 0.4 ? 'text-steel-300' : pct > 0.2 ? 'text-stone-300' : 'text-red-400';
  };

  const copyResults = useCallback(() => {
    const lines = ['Horizon Tweaks — Benchmark Results', '\u2550'.repeat(40), ''];
    if (grade) lines.push(`Overall: ${totalScore.toFixed(0)} pts (${grade.label})`, '');
    for (const b of BENCHES) {
      const r = results[b.id];
      if (r) lines.push(`${b.name}: ${r.score.toFixed(0)} pts — ${(r.duration_ms / 1000).toFixed(1)}s`);
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setNotification({ type: 'success', message: 'Results copied to clipboard!' });
    }).catch(() => {});
  }, [results, totalScore, grade]);

  const categories: BenchCategory[] = ['core', 'io', 'stress'];

  return (
    <div className="space-y-5">
      {/* Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${
          notification.type === 'success' ? 'bg-steel-600/90 text-steel-100 border border-steel-500/20' : 'bg-red-500/90 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4 text-stone-300" /> : <AlertTriangle className="h-4 w-4" />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised border border-white/[0.06]">
            <Gauge className="h-5 w-5 text-steel-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-steel-100">Benchmark Suite</h1>
            <p className="text-xs text-steel-500 mt-0.5">{BENCHES.length} compiled .NET tests with sub-score analysis & reference comparisons</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(results).length > 0 && (
            <button onClick={copyResults} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-steel-700/30 border border-white/[0.06] text-steel-500 hover:text-steel-300 hover:bg-steel-600/30 transition-all shadow-neo-raised-sm" title="Copy results">
              <Copy className="h-3.5 w-3.5" /> Export
            </button>
          )}
          <button onClick={runAll} disabled={runningAll || running !== null} className="blue-button disabled:opacity-40 disabled:cursor-not-allowed">
            {runningAll ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {runningAll ? `Running... ${completedCount}/${BENCHES.length}` : 'Run All Benchmarks'}
          </button>
        </div>
      </div>

      {/* Overall progress bar for Run All */}
      {runningAll && (
        <div className="glass-panel p-3">
          <div className="flex items-center justify-between text-[10px] text-steel-500 mb-1.5">
            <span>Running benchmarks...</span>
            <span className="font-mono text-steel-400">{completedCount}/{BENCHES.length} complete</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-stone-300 to-stone-400 rounded-full transition-all duration-500" style={{ width: `${(completedCount / BENCHES.length) * 100}%` }} />
          </div>
        </div>
      )}

      <SystemInfoCard />

      {/* Overall Score Card */}
      {grade && (
        <div className={`rounded-2xl border ${grade.bg} bg-gradient-to-br ${grade.gradient} p-5`}>
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shrink-0">
              <grade.icon className={`h-7 w-7 ${grade.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Overall System Score</div>
                  <div className={`text-4xl font-bold font-mono ${grade.color}`}>
                    {totalScore.toLocaleString()}
                    <span className="text-sm text-white/40 ml-1.5 font-normal">pts</span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${grade.bg} ${grade.color}`}>
                  {grade.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[9px] mb-2">
                {BENCHES.map(b => {
                  const r = results[b.id];
                  if (!r) return null;
                  const pct = getPercentile(r.score, b.maxScore);
                  return (
                    <div key={b.id} className="flex items-center gap-1.5">
                      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${pct > 70 ? 'bg-stone-300' : pct > 40 ? 'bg-stone-300' : pct > 20 ? 'bg-stone-300' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-white/30 w-14 shrink-0 truncate">{b.name}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-start gap-1.5 text-[9px] text-white/40">
                <Lightbulb className="h-3 w-3 text-stone-300 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {grade.tips.map((tip, i) => <div key={i}>{tip}</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Sections */}
      {categories.map(cat => {
        const catInfo = CATEGORY_LABELS[cat];
        const catBenches = BENCHES.filter(b => b.category === cat);
        const catScore = catBenches.reduce((s, b) => s + (results[b.id]?.score ?? 0), 0);
        const CatIcon = catInfo.icon;

        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CatIcon className={`h-4 w-4 ${catInfo.color}`} />
                <span className="text-sm font-bold text-steel-200">{catInfo.label}</span>
                <span className="text-[9px] text-steel-500">{catInfo.desc}</span>
              </div>
              {catScore > 0 && (
                <span className="text-[10px] font-mono text-steel-500">Subtotal: <span className={catInfo.color}>{catScore.toLocaleString()}</span> pts</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {catBenches.map(b => {
                const Icon = b.icon;
                const res = results[b.id];
                const isRunning = running === b.id;
                const refOpen = showRef[b.id] || false;
                const hist = history[b.id] || [];
                const pct = res ? getPercentile(res.score, b.maxScore) : 0;

                return (
                  <div key={b.id} className={`rounded-2xl border transition-all duration-300 ${isRunning ? 'border-stone-300/40 bg-stone-300/[0.03] shadow-lg shadow-stone-300/5' : 'glass-card'} p-4 flex flex-col gap-2`}>
                    {/* Card header */}
                    <div className="flex items-center gap-2">
                      <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${isRunning ? 'bg-stone-300/10 border border-stone-300/20' : 'bg-steel-700/30 border border-white/[0.06]'}`}>
                        <Icon className={`h-3.5 w-3.5 ${isRunning ? 'text-stone-300 animate-pulse' : 'text-steel-500'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-steel-200">{b.name}</span>
                        <p className="text-[8px] text-steel-500 truncate">{b.desc}</p>
                      </div>
                    </div>

                    {/* Running state */}
                    {isRunning && (
                      <div className="space-y-1.5">
                        <div className="h-1.5 bg-steel-700/30 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-stone-300 to-stone-400 rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-stone-300">
                          <RotateCcw className="h-2.5 w-2.5 animate-spin shrink-0" />
                          <span className="truncate">{STAGES[b.id]?.[stageIdx] || 'Running...'}</span>
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    {res && !isRunning && (() => {
                      const { metrics, rating } = parseMetrics(res.description);
                      const badge = rating ? ratingBadge(rating) : null;
                      const subs = extractSubscores(metrics);
                      return (
                        <div className="space-y-1.5">
                          {/* Score row */}
                          <div className="flex items-center gap-2">
                            <div className={`text-xl font-bold font-mono ${scoreColor(res.score, b.maxScore)}`}>
                              {res.score.toLocaleString()}
                              <span className="text-[9px] text-steel-500 ml-1 font-normal">pts</span>
                            </div>
                            {badge && (
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${badge.bg} ${badge.color} font-medium`}>{badge.text}</span>
                            )}
                            <span className="text-[8px] text-steel-600 flex items-center gap-0.5 ml-auto">
                              <Clock className="h-2 w-2" />{(res.duration_ms / 1000).toFixed(1)}s
                            </span>
                          </div>

                          {/* Percentile bar */}
                          <div className="flex items-center gap-2 text-[8px]">
                            <span className="text-steel-500 w-14 shrink-0">Percentile</span>
                            <div className="flex-1 h-1.5 bg-steel-700/30 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${pct > 70 ? 'bg-steel-300' : pct > 40 ? 'bg-steel-400' : pct > 20 ? 'bg-stone-300' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`font-mono font-semibold w-8 text-right ${pct > 70 ? 'text-steel-200' : pct > 40 ? 'text-steel-300' : pct > 20 ? 'text-stone-300' : 'text-red-400'}`}>{pct}%</span>
                          </div>

                          {/* Metrics */}
                          <div className="space-y-0.5">
                            {metrics.filter(m => m.value !== '0' && m.value !== '0 MB/s' && m.value !== '0 ms').map((m, i) => (
                              <div key={i} className="flex items-center justify-between text-[9px]">
                                <span className="text-steel-500">{m.label}</span>
                                <span className="text-steel-300 font-mono font-medium">{m.value}</span>
                              </div>
                            ))}
                          </div>

                          {/* Sub-scores */}
                          {subs.length > 1 && (
                            <div className="border-t border-white/[0.06] pt-1.5">
                              <div className="flex items-center gap-1 text-[8px] text-steel-500 mb-1">
                                <BarChart3 className="h-2.5 w-2.5" /> Sub-score breakdown
                              </div>
                              <SubScoreChart items={subs} />
                            </div>
                          )}

                          {/* Reference comparison */}
                          <button onClick={() => setShowRef(p => ({ ...p, [b.id]: !p[b.id] }))} className="flex items-center gap-1 text-[8px] text-steel-500 hover:text-steel-300 transition-colors">
                            {refOpen ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                            What this score means
                          </button>
                          {refOpen && (
                            <div className="border border-white/[0.06] bg-steel-700/20 rounded-lg p-2 space-y-1">
                              {REFERENCE_TABLES[b.id]?.map((ref, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-[8px]">
                                  <span className={`font-mono font-semibold shrink-0 ${ref.color}`}>{ref.range}</span>
                                  <span className="text-steel-500">{ref.description}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {hist.length > 1 && <BenchmarkHistory hist={hist} currentScore={res.score} />}
                        </div>
                      );
                    })()}

                    {/* Run button */}
                    <button
                      onClick={() => run(b.id, b.cmd)}
                      disabled={isRunning || runningAll}
                      className="mt-auto flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-steel-600 to-steel-700 text-steel-200 text-[11px] font-semibold px-3 py-1.5 hover:from-steel-500 hover:to-steel-600 active:scale-[0.98] transition-all disabled:opacity-40 shadow-neo-raised-sm border border-white/[0.06]"
                    >
                      {isRunning ? <RotateCcw className="h-3 w-3 animate-spin" /> : res ? <RotateCcw className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      {isRunning ? 'Running...' : res ? 'Re-run' : 'Run Test'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
