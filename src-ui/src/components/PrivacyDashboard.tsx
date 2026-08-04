import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Shield, ShieldCheck, ShieldOff, ToggleLeft, ToggleRight, AlertTriangle, Eye, EyeOff, Lock, CheckCircle, X } from 'lucide-react';

interface PrivacySetting {
  name: string;
  enabled: boolean;
  description: string;
  key: string;
  type: string;
}

export default function PrivacyDashboard() {
  const [settings, setSettings] = useState<PrivacySetting[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const load = async () => {
    try {
      setSettings(await invoke<PrivacySetting[]>('get_privacy_settings'));
    } catch (e: any) {
      setNotification({ type: 'error', message: `Failed to load settings: ${e}` });
    }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (s: PrivacySetting) => {
    const newVal = s.enabled ? '0' : '1';
    try {
      await invoke('set_privacy_setting', { key: s.key, value: newVal, regType: s.type });
      setNotification({ type: 'success', message: `${s.name}: ${s.enabled ? 'Disabled' : 'Enabled'}` });
      load();
    } catch (e: any) {
      setNotification({ type: 'error', message: `Failed: ${e}` });
    }
  };

  const enabledCount = settings.filter(s => s.enabled).length;

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

      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Privacy Dashboard</h1>
          <p className="text-xs text-white/50 mt-0.5">{enabledCount}/{settings.length} privacy features active</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {settings.map((s, i) => (
          <div key={i} className="glass-card flex items-center justify-between px-3 py-2.5 text-xs gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {s.enabled ? <EyeOff className="h-3.5 w-3.5 text-stone-300" /> : <Eye className="h-3.5 w-3.5 text-stone-300" />}
                <span className="font-medium text-white">{s.name}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${s.enabled ? 'bg-stone-900/40 text-stone-300' : 'bg-stone-900/40 text-stone-200'}`}>{s.enabled ? 'Blocked' : 'Allowed'}</span>
              </div>
              <div className="text-[10px] text-white/50 mt-0.5 ml-5">{s.description}</div>
            </div>
            <button
              onClick={() => toggle(s)}
              className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-medium transition-colors ${
                s.enabled
                  ? 'bg-stone-900/40 text-stone-200 hover:bg-stone-900/60'
                  : 'bg-stone-900/40 text-stone-300 hover:bg-stone-900/60'
              }`}
            >
              {s.enabled ? <><ToggleLeft className="h-3 w-3" /> Allow</> : <><ToggleRight className="h-3 w-3" /> Block</>}
            </button>
          </div>
        ))}
      </div>

      <div className="glass-panel p-3">
        <div className="flex items-center gap-2 text-stone-300 font-medium text-xs mb-1">
          <AlertTriangle className="h-3.5 w-3.5" /> Privacy Notice
        </div>
        <p className="text-white/50 text-[10px]">Blocking some telemetry may affect Windows features like search suggestions, updates, and app recommendations. Changes apply system-wide.</p>
      </div>
    </div>
  );
}
