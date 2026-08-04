import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Monitor, RefreshCw, Maximize2, Palette, Sun, Radio, CheckCircle, AlertTriangle } from 'lucide-react';

interface DisplayMonitor {
  name: string;
  resolution: string;
  refresh_rate_hz: number;
  bit_depth: number;
  is_primary: boolean;
  adapter: string;
  hdr_enabled: boolean;
}

export default function DisplayInfo() {
  const [monitors, setMonitors] = useState<DisplayMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const load = async () => {
    setLoading(true);
    try {
      const m = await invoke<DisplayMonitor[]>('get_display_info');
      setMonitors(m);
      setNotification({ type: 'success', message: `Found ${m.length} monitor(s)` });
    } catch (e: any) {
      setNotification({ type: 'error', message: e.toString() });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      {/* Toast notification */}
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="h-7 w-7 text-stone-300" />
          <div>
            <h1 className="text-2xl font-bold text-white">Display Info</h1>
            <p className="text-xs text-white/50 mt-0.5">Connected monitors, resolutions, refresh rates</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="pill-button">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-white/50 text-xs">Loading display information...</div>
      ) : monitors.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center p-8 gap-2">
          <Monitor className="h-8 w-8 text-white/50" />
          <p className="text-sm text-white/40">No monitors detected</p>
          <p className="text-xs text-white/50 mt-1">Connect a display and click Refresh</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {monitors.map((m, i) => (
            <div key={i} className={`glass-card p-4 ${m.is_primary ? 'border-white/[0.12]' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="h-4 w-4 text-stone-300" />
                <span className="text-sm font-semibold text-white">{m.name}</span>
                {m.is_primary && <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-stone-300/10 text-stone-300">Primary</span>}
              </div>
              <div className="glass-panel p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Resolution', m.resolution, Maximize2],
                    ['Refresh Rate', `${m.refresh_rate_hz.toFixed(m.refresh_rate_hz === Math.round(m.refresh_rate_hz) ? 0 : 1)} Hz`, RefreshCw],
                    ['Bit Depth', `${m.bit_depth}-bit`, Palette],
                    ['HDR', m.hdr_enabled ? 'Enabled' : 'Disabled', Sun],
                    ['GPU Adapter', m.adapter, Radio],
                  ].map(([label, value, Icon]) => (
                    <div key={label as string} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0" />
                      <Icon className="h-3 w-3 text-white/50 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-white/50">{label as string}</div>
                        <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/[0.04] text-white/80 truncate max-w-[120px]">{value as string}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
