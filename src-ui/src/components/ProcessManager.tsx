import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Activity, Search, XCircle, Pause, Play, AlertTriangle, CheckCircle } from 'lucide-react';

interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_mb: number;
  status: string;
}

type SortKey = 'name' | 'cpu_percent' | 'memory_mb';
type SortDir = 'asc' | 'desc';

const cpuBarColor = (cpu: number) => cpu < 30 ? 'bg-stone-300' : cpu < 70 ? 'bg-stone-300' : 'bg-red-500';

const ProcessRow = React.memo(function ProcessRow({ p, idx, maxMemory, onKill, onSuspend, onResume }: {
  p: ProcessInfo; idx: number; maxMemory: number;
  onKill: (pid: number, name: string) => void;
  onSuspend: (pid: number, name: string) => void;
  onResume: (pid: number, name: string) => void;
}) {
  return (
    <div key={p.pid} className={`grid grid-cols-[1fr_140px_140px_100px_120px] gap-2 items-center px-3 py-1.5 text-xs border-b border-white/[0.06] transition-colors hover:bg-white/[0.04] ${idx % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
      <div className="truncate text-white">{p.name}</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${cpuBarColor(p.cpu_percent)}`} style={{ width: `${Math.min(p.cpu_percent, 100)}%` }} />
        </div>
        <span className="font-mono text-white/40 shrink-0 w-12 text-right">{p.cpu_percent.toFixed(1)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-stone-300 rounded-full" style={{ width: `${(p.memory_mb / maxMemory) * 100}%` }} />
        </div>
        <span className="font-mono text-white/40 shrink-0 w-16 text-right">{p.memory_mb.toFixed(0)} MB</span>
      </div>
      <div className="text-center">
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${p.status === 'Running' ? 'bg-stone-900/40 text-stone-300' : 'bg-stone-900/40 text-stone-200'}`}>
          {p.status}
        </span>
      </div>
      <div className="flex justify-end gap-1">
        <button onClick={() => onKill(p.pid, p.name)} className="inline-flex items-center justify-center gap-1 rounded-full bg-red-900/40 text-red-400 text-[9px] px-2 py-0.5 hover:bg-red-900/60 transition-colors"><XCircle className="h-2.5 w-2.5" /> Kill</button>
        <button onClick={() => onSuspend(p.pid, p.name)} className="inline-flex items-center justify-center gap-1 rounded-full bg-stone-900/40 text-stone-200 text-[9px] px-2 py-0.5 hover:bg-stone-900/60 transition-colors"><Pause className="h-2.5 w-2.5" /></button>
        <button onClick={() => onResume(p.pid, p.name)} className="inline-flex items-center justify-center gap-1 rounded-full bg-stone-900/40 text-stone-300 text-[9px] px-2 py-0.5 hover:bg-stone-900/60 transition-colors"><Play className="h-2.5 w-2.5" /></button>
      </div>
    </div>
  );
});

export default function ProcessManager() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('memory_mb');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchProcesses = useCallback(async () => {
    try { setProcesses(await invoke('get_processes')); } catch {}
  }, []);

  useEffect(() => { fetchProcesses(); const i = setInterval(fetchProcesses, 3000); return () => clearInterval(i); }, [fetchProcesses]);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const doAction = useCallback(async (action: string, pid: number, name: string) => {
    if (action === 'kill' && !confirm(`Kill ${name} (PID: ${pid})?`)) return;
    try {
      const msg = await invoke(`${action}_process`, { pid });
      setNotification({ type: 'success', message: `${name}: ${msg}` });
    } catch (e: any) { setNotification({ type: 'error', message: `Failed: ${e}` }); }
  }, []);

  const onKill = useCallback((pid: number, name: string) => doAction('kill', pid, name), [doAction]);
  const onSuspend = useCallback((pid: number, name: string) => doAction('suspend', pid, name), [doAction]);
  const onResume = useCallback((pid: number, name: string) => doAction('resume', pid, name), [doAction]);

  const toggleSort = useCallback((k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  }, [sortKey]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return processes
      .filter(p => p.name.toLowerCase().includes(s))
      .sort((a, b) => {
        const m = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'name') return a.name.localeCompare(b.name) * m;
        return ((a[sortKey] as number) - (b[sortKey] as number)) * m;
      });
  }, [processes, search, sortKey, sortDir]);

  const totalCpu = useMemo(() => filtered.reduce((s, p) => s + p.cpu_percent, 0), [filtered]);
  const totalMemory = useMemo(() => filtered.reduce((s, p) => s + p.memory_mb, 0), [filtered]);
  const maxMemory = useMemo(() => Math.max(...filtered.map(p => p.memory_mb), 1), [filtered]);

  const running = useMemo(() => filtered.filter(p => p.status === 'Running'), [filtered]);
  const notResponding = useMemo(() => filtered.filter(p => p.status !== 'Running'), [filtered]);

  const visibleRunning = showAll ? running : running.slice(0, 30);
  const visibleNotResponding = showAll ? notResponding : notResponding.slice(0, 20);

  const sortIcon = (k: SortKey) => (
    <span className={`inline-block ml-1 ${sortKey === k ? 'text-stone-300' : 'text-white/20'}`}>
      {sortKey === k ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : '\u25BC'}
    </span>
  );

  const needsShowAll = !showAll && (running.length > 30 || notResponding.length > 20);

  return (
    <div className="space-y-4">
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${
          notification.type === 'success'
            ? 'bg-stone-300/90 text-stone-950'
            : 'bg-rose-500/90 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {notification.message}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Activity className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Process Manager</h1>
          <p className="text-xs text-white/50 mt-0.5">{filtered.length} processes &middot; Live updates every 3s</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by name..."
            className="glass-input w-full text-xs py-1.5 pl-9 pr-3"
          />
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <div className="glass-card px-3 py-2">
          <span className="text-white/50">Total CPU: </span>
          <span className="font-mono text-white font-semibold">{totalCpu.toFixed(1)}%</span>
        </div>
        <div className="glass-card px-3 py-2">
          <span className="text-white/50">Total Memory: </span>
          <span className="font-mono text-white font-semibold">{totalMemory.toFixed(0)} MB</span>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_140px_100px_120px] gap-2 text-[10px] font-semibold text-white/50 uppercase tracking-wider px-3 py-2 border-b border-white/[0.06] bg-white/[0.03]">
          <button onClick={() => toggleSort('name')} className="text-left">Name {sortIcon('name')}</button>
          <button onClick={() => toggleSort('cpu_percent')} className="text-right">CPU {sortIcon('cpu_percent')}</button>
          <button onClick={() => toggleSort('memory_mb')} className="text-right">Memory {sortIcon('memory_mb')}</button>
          <div className="text-center">Status</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="max-h-[65vh] overflow-y-auto">
          {visibleRunning.length > 0 && (
            <>
              <div className="sticky top-0 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold text-stone-300 border-b border-white/[0.06] z-10">
                Running ({running.length}) &middot; CPU: {totalCpu.toFixed(1)}% &middot; Memory: {totalMemory.toFixed(0)} MB
              </div>
              {visibleRunning.map((p, i) => (
                <ProcessRow key={p.pid} p={p} idx={i} maxMemory={maxMemory} onKill={onKill} onSuspend={onSuspend} onResume={onResume} />
              ))}
            </>
          )}
          {visibleNotResponding.length > 0 && (
            <>
              <div className="sticky top-0 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold text-stone-300 border-b border-white/[0.06] z-10">
                Not Responding ({notResponding.length}) &middot; CPU: {notResponding.reduce((s, p) => s + p.cpu_percent, 0).toFixed(1)}% &middot; Memory: {notResponding.reduce((s, p) => s + p.memory_mb, 0).toFixed(0)} MB
              </div>
              {visibleNotResponding.map((p, i) => (
                <ProcessRow key={p.pid} p={p} idx={i} maxMemory={maxMemory} onKill={onKill} onSuspend={onSuspend} onResume={onResume} />
              ))}
            </>
          )}
        </div>
      </div>

      {needsShowAll && (
        <button onClick={() => setShowAll(true)} className="text-xs text-steel-400 hover:text-steel-200 transition-colors">
          Show all {filtered.length} processes...
        </button>
      )}
    </div>
  );
}
