import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Power, Search, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle, RefreshCw, Clock, Cpu, HardDrive, Shield } from 'lucide-react';

interface StartupEntry {
  name: string;
  command: string;
  location: string;
  enabled: boolean;
  publisher: string;
}

export default function StartupManager() {
  const [entries, setEntries] = useState<StartupEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try { setEntries(await invoke('get_startup_entries')); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const toggle = async (e: StartupEntry) => {
    try {
      if (e.enabled) {
        await invoke('disable_startup_entry', { name: e.name, location: e.location });
        setNotification({ type: 'success', message: `Disabled: ${e.name}` });
      } else {
        await invoke('enable_startup_entry', { name: e.name, command: e.command, location: e.location });
        setNotification({ type: 'success', message: `Enabled: ${e.name}` });
      }
      load();
    } catch (err: any) { setNotification({ type: 'error', message: `Error: ${err}` }); }
  };

  const disableAll = async () => {
    for (const e of entries.filter(e => e.enabled)) { await toggle(e); }
    load();
  };

  const filtered = entries.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
  const enabledCount = entries.filter(e => e.enabled).length;

  return (
    <div className="space-y-5">
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${
          notification.type === 'success' ? 'bg-stone-300/90 text-stone-950' : 'bg-rose-500/90 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {notification.message}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Power className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Startup Manager</h1>
          <p className="text-xs text-white/50 mt-0.5">{entries.length} entries ({enabledCount} enabled)</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={disableAll} disabled={enabledCount === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-40">
            <ToggleLeft className="h-3 w-3" /> Disable All
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] border border-white/[0.06] text-white/50 hover:text-white transition-all">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search startup entries..." className="glass-input w-full text-xs py-2 pl-9 pr-3" />
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-8 text-center">
          <RefreshCw className="h-5 w-5 text-stone-300 animate-spin mx-auto mb-2" />
          <span className="text-xs text-white/40">Loading startup entries...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Power className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-xs text-white/40">No startup entries found</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((e, i) => (
            <div key={i} className="glass-card px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{e.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                    e.enabled ? 'bg-stone-300/15 text-stone-300' : 'bg-white/[0.04] text-white/40'
                  }`}>
                    {e.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                  {e.publisher && <span className="text-[10px] text-white/40 flex items-center gap-1"><Shield className="h-2.5 w-2.5" /> {e.publisher}</span>}
                  {e.command && <span className="text-[10px] text-white/30 flex items-center gap-1"><Cpu className="h-2.5 w-2.5" /> {e.command.length > 50 ? e.command.slice(0, 50) + '...' : e.command}</span>}
                  {e.location && <span className="text-[10px] text-white/20 flex items-center gap-1"><HardDrive className="h-2.5 w-2.5" /> {e.location}</span>}
                </div>
                {e.enabled && (
                  <div className="mt-1 flex items-center gap-1 text-[9px] text-stone-300/60">
                    <Clock className="h-2.5 w-2.5" /> Starts with Windows — may impact boot time
                  </div>
                )}
              </div>
              <button onClick={() => toggle(e)} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                e.enabled
                  ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-stone-300/10 text-stone-300 hover:bg-stone-300/20'
              }`}>
                {e.enabled ? <><ToggleLeft className="h-3 w-3" /> Disable</> : <><ToggleRight className="h-3 w-3" /> Enable</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
