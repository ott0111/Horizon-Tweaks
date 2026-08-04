import { useState, useEffect } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { Shield, Search, RotateCcw, Trash2, Zap, Package, CheckCircle, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface App {
  id: string;
  name: string;
  version: string;
  size: string;
  installed_on: string;
  publisher?: string;
  type: 'desktop' | 'store';
  icon_path?: string;
}

export default function Debloating() {
  const [apps, setApps] = useState<App[]>([]);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [appType, setAppType] = useState<'desktop' | 'store'>('desktop');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [loading, setLoading] = useState(false);
  const [cleaningTemp, setCleaningTemp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { loadApps(); }, [appType]);
  useEffect(() => { if (notification) { const t = setTimeout(() => setNotification(null), 4000); return () => clearTimeout(t); } }, [notification]);

  useEffect(() => {
    invoke<boolean>('is_admin').then(setIsAdmin).catch(() => setIsAdmin(false));
  }, []);

  const restartAsAdmin = async () => {
    try { await invoke('restart_as_admin'); } catch {}
  };

  const loadApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<App[]>(appType === 'desktop' ? 'get_installed_desktop_apps' : 'get_installed_store_apps');
      setApps(result);
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to load applications';
      setError(msg);
      if (msg.toLowerCase().includes('access') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('unauthorized')) {
        setError('Access denied. Store apps require Administrator privileges to list. Click "Restart as Admin" below.');
      }
    } finally { setLoading(false); }
  };

  const filteredApps = apps
    .filter(app => app.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return parseFloat(a.size) - parseFloat(b.size);
      return new Date(a.installed_on).getTime() - new Date(b.installed_on).getTime();
    });

  const toggleAppSelection = (id: string) => {
    const newSelected = new Set(selectedApps);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedApps(newSelected);
  };

  const uninstallSelected = async () => {
    if (selectedApps.size === 0) return;
    try {
      await invoke('uninstall_apps', { appIds: Array.from(selectedApps) });
      setNotification({ type: 'success', message: `${selectedApps.size} app(s) uninstalled` });
      setSelectedApps(new Set()); loadApps();
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : 'Uninstall failed';
      setNotification({ type: 'error', message: msg });
    }
  };

  const autoDebloat = async () => {
    try {
      await invoke('auto_debloat');
      setNotification({ type: 'success', message: 'Auto debloat completed' });
      loadApps();
    } catch (err: any) {
      setNotification({ type: 'error', message: typeof err === 'string' ? err : 'Auto debloat failed' });
    }
  };

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
        <Shield className="h-8 w-8 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Debloater</h1>
          <p className="text-xs text-white/50 mt-0.5">Remove unwanted apps and reclaim system resources</p>
        </div>
        <button onClick={loadApps} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] border border-white/[0.06] text-white/50 hover:text-white transition-colors">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {!isAdmin && appType === 'store' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
          <Shield className="h-4 w-4 text-rose-400 shrink-0" />
          <span className="text-rose-300 flex-1">Administrator rights required to list Store apps.</span>
          <button onClick={restartAsAdmin} className="px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-colors text-[10px] font-medium">
            Restart as Admin
          </button>
        </div>
      )}

      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
            <input type="text" placeholder="Search applications..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="glass-input w-full text-xs" />
          </div>
          <CustomSelect value={sortBy} onChange={(v) => setSortBy(v as any)} options={[
            { value: 'name', label: 'Sort by Name' }, { value: 'size', label: 'Sort by Size' }, { value: 'date', label: 'Sort by Date' },
          ]} className="w-36" />
          <div className="flex rounded-lg border border-white/[0.06] overflow-hidden">
            <button onClick={() => setAppType('desktop')} className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${appType === 'desktop' ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-white/50 hover:text-white'}`}>Desktop</button>
            <button onClick={() => setAppType('store')} className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${appType === 'store' ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-white/50 hover:text-white'}`}>Store</button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-3 text-xs">
            <button onClick={() => setSelectedApps(new Set(filteredApps.map(a => a.id)))} className="text-white/40 hover:text-white">Select All</button>
            <span className="text-white/10">|</span>
            <button onClick={() => setSelectedApps(new Set())} className="text-white/40 hover:text-white">Deselect</button>
            {selectedApps.size > 0 && <span className="px-2 py-0.5 rounded-full bg-stone-300/15 text-stone-300 text-[10px] font-medium">{selectedApps.size} selected</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={uninstallSelected} disabled={selectedApps.size === 0} className="pill-button text-xs disabled:opacity-40">
              <Trash2 className="h-3.5 w-3.5" /> Uninstall ({selectedApps.size})
            </button>
            <button onClick={autoDebloat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-400 transition-all shadow-lg">
              <Zap className="h-3.5 w-3.5" /> Auto Debloat
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[9px] font-semibold text-white/30 uppercase tracking-wider bg-white/[0.02] border-b border-white/[0.06]">
          <div className="col-span-1"></div>
          <div className="col-span-5">Name</div>
          <div className="col-span-3">Size</div>
          <div className="col-span-3">Installed</div>
        </div>

        {error && !loading ? (
          <div className="p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto mb-2" />
            <p className="text-xs text-rose-400/80">{error}</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <button onClick={loadApps} className="px-3 py-1.5 rounded-lg text-[10px] font-medium border border-white/[0.06] text-white/50 hover:text-white transition-all">
                <RefreshCw className="h-3 w-3 inline mr-1" /> Retry
              </button>
              {error.toLowerCase().includes('admin') && (
                <button onClick={restartAsAdmin} className="pill-button text-[10px]">
                  <Shield className="h-3 w-3 inline mr-1" /> Restart as Admin
                </button>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="p-8 text-center"><RefreshCw className="h-5 w-5 text-stone-300 animate-spin mx-auto mb-2" /><span className="text-xs text-white/40">Loading...</span></div>
        ) : filteredApps.length === 0 ? (
          <div className="p-8 text-center text-xs text-white/40">No applications found</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredApps.map((app) => (
              <div key={app.id} onClick={() => toggleAppSelection(app.id)}
                className={`group cursor-pointer px-4 py-2.5 transition-colors ${selectedApps.has(app.id) ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}`}>
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-1">
                    <div className={`h-4 w-4 flex items-center justify-center rounded border-2 transition-all ${selectedApps.has(app.id) ? 'bg-stone-300 border-white/[0.06]' : 'border-white/[0.15] group-hover:border-white/30'}`}>
                      {selectedApps.has(app.id) && <CheckCircle className="h-3 w-3 text-black" />}
                    </div>
                  </div>
                  <div className="col-span-5 flex items-center gap-2.5">
                    {app.icon_path ? (
                      <img src={convertFileSrc(app.icon_path)} alt={app.name} className="h-7 w-7 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : <div className="h-7 w-7 rounded-lg bg-white/[0.04] flex items-center justify-center"><Package className="h-3.5 w-3.5 text-white/40" /></div>}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">{app.name}</div>
                      <div className="flex gap-2 text-[9px] text-white/40">
                        {app.version && <span>{app.version}</span>}
                        {app.publisher && <span className="text-white/20">{app.publisher}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3 text-[10px] text-white/50">{app.size}</div>
                  <div className="col-span-3 text-[10px] text-white/40">{app.installed_on}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-stone-300" />
          <span className="text-sm font-semibold text-white">Tips</span>
        </div>
        <div className="space-y-1 text-[10px] text-white/50">
          <p>• Desktop apps show installed Win32 applications. Store apps require admin rights to list.</p>
          <p>• Auto Debloat removes known bloatware — safe for most users, review before applying.</p>
          <p>• Some system components may require a restart after removal.</p>
        </div>
      </div>
    </div>
  );
}
