import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ShieldAlert, Shield, AlertTriangle, ArrowRight, X } from 'lucide-react';

const DISMISS_KEY = 'horizon_admin_prompt_dismissed';

export default function AdminPrompt() {
  const [notAdmin, setNotAdmin] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    invoke<boolean>('is_admin')
      .then((admin) => {
        if (!admin && !localStorage.getItem(DISMISS_KEY)) {
          setNotAdmin(true);
        }
      })
      .catch(() => setNotAdmin(false));
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, 'true'); } catch {}
  };

  if (!notAdmin || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-panel max-w-sm w-full p-8 text-center shadow-spatial-lg animate-[fadeIn_0.3s_ease-out]">
        {/* Icon */}
        <div className="size-16 rounded-2xl bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center mx-auto mb-5 shadow-neo-raised border border-white/[0.06]">
          <ShieldAlert className="size-8 text-steel-300" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-steel-100 mb-2">Administrator Required</h3>
        <p className="text-sm text-steel-400 mb-6 leading-relaxed">
          Horizon Tweaks needs administrator privileges to apply system tweaks and optimizations. Without admin access, most features will not function.
        </p>

        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-stone-300/10 to-stone-500/5 border border-stone-300/20 mb-6 text-left">
          <AlertTriangle className="size-5 text-stone-300 shrink-0 mt-0.5" />
          <div className="text-xs text-stone-200/80 leading-relaxed">
            <span className="text-stone-200 font-semibold">Some features will be restricted</span> without admin privileges:
            <ul className="mt-2 space-y-1 text-stone-200/60">
              <li>• System tweaks</li>
              <li>• Debloating & UWP removal</li>
              <li>• Power & service management</li>
              <li>• Gaming mode optimizations</li>
            </ul>
          </div>
        </div>

        {/* Restart button */}
        <button
          onClick={() => {
            setRestarting(true);
            invoke('restart_as_admin').catch(() => setRestarting(false));
          }}
          disabled={restarting}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold w-full mb-3 bg-gradient-to-r from-steel-600 to-steel-700 border border-white/[0.06] text-steel-100 hover:from-steel-500 hover:to-steel-600 hover:border-white/[0.1] transition-all duration-300 shadow-neo-raised hover:shadow-neo-hover disabled:opacity-50"
        >
          {restarting ? (
            <div className="size-4 border-2 border-steel-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Shield className="size-4" />
          )}
          {restarting ? 'Restarting...' : 'Restart as Administrator'}
        </button>

        {/* Skip / Continue without admin button */}
        <button
          onClick={handleDismiss}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border border-steel-600/40 text-steel-300 hover:text-white hover:bg-steel-700/30 hover:border-steel-500/50 transition-all duration-200"
        >
          <X className="size-4" />
          Continue without admin
        </button>
        <p className="text-[10px] text-steel-600 mt-3 leading-relaxed">
          You can restart as admin later from Settings if needed.
        </p>
      </div>
    </div>
  );
}
