'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Key, CheckCircle, XCircle, Loader2, Copy, Cpu, Wifi, Keyboard, Monitor } from 'lucide-react';

interface AppCard {
  id: string;
  name: string;
  icon: any;
  description: string;
  unlocked: boolean;
  tier?: string;
}

const ALL_APPS: Omit<AppCard, 'unlocked'>[] = [
  { id: 'optimizer', name: 'Horizon Tweaks', icon: Cpu, description: 'System optimization and performance tuning' },
  { id: 'impulse-ping', name: 'Horizon Ping', icon: Wifi, description: 'Network latency monitoring and ping optimization' },
  { id: 'impulse-keyboard', name: 'Horizon Keyboard', icon: Keyboard, description: 'Custom macro programming and key mapping' },
];

export default function LicensePage() {
  const { user, userTier, loading: authLoading, setAuthOpen } = useAuth();
  const [keyInput, setKeyInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; app?: string; tier?: string } | null>(null);
  const [apps, setApps] = useState<AppCard[]>(ALL_APPS.map(a => ({ ...a, unlocked: false })));
  const [loadingApps, setLoadingApps] = useState(false);
  const [keys, setKeys] = useState<Array<{ key: string; app: string; tier?: string; status: string }>>([]);

  const loadUserKeys = async () => {
    if (!user) return;
    setLoadingApps(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/license-keys/my-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (data.success && data.keys) {
        setKeys(data.keys);

        const appAccess: Record<string, boolean> = {};
        const appTier: Record<string, string> = {};
        data.keys.forEach((k: any) => {
          const a = k.app || 'optimizer';
          if (k.status === 'used' || k.status === 'assigned') {
            appAccess[a] = true;
            if (k.tier) appTier[a] = k.tier;
          }
        });

        // Optimizer is unlocked if user has a paid tier or an optimizer key
        if (userTier && userTier !== 'free') {
          appAccess['optimizer'] = true;
          appTier['optimizer'] = userTier;
        }

        setApps(prev => prev.map(a => ({
          ...a,
          unlocked: !!appAccess[a.id],
          tier: appTier[a.id],
        })));
      }
    } catch {
      // ignore
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserKeys();
    }
  }, [user, userTier]);

  const handleRedeem = async () => {
    if (!keyInput.trim() || !user) return;

    setRedeeming(true);
    setResult(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/license-keys/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, key: keyInput.trim().toUpperCase() }),
      });
      const data = await res.json();
      setResult({
        success: data.success,
        message: data.error || data.message || (data.success ? 'Key redeemed successfully!' : 'An error occurred.'),
        app: data.app,
        tier: data.tier,
      });

      if (data.success) {
        setKeyInput('');
        loadUserKeys();
      }
    } catch (err: unknown) {
      setResult({ success: false, message: 'Failed to connect. Please try again.' });
    } finally {
      setRedeeming(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-24">
        <div className="glass-panel max-w-md w-full p-8 md:p-10 text-center">
          <Key className="size-12 text-accent mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-white mb-2">Sign in required</h1>
          <p className="text-sm text-white/55 mb-6">Sign in to redeem or view your license keys.</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="pill-button text-sm font-semibold"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-32 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
           <div className="size-16 rounded-2xl bg-gradient-to-br from-stone-300/20 to-stone-400/5 border border-stone-300/10 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(214,209,202,0.1)]">
             <Key className="size-7 text-stone-300" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">Your License Keys</h1>
          <p className="text-sm text-white/55 max-w-md mx-auto">
            View your licensed apps and redeem new license keys.
          </p>
        </div>

        {/* Redeem License Key */}
        <div className="glass-panel p-6 md:p-8">
          <h2 className="text-sm font-bold text-white mb-1">Redeem a License Key</h2>
          <p className="text-xs text-white/55 mb-5">
            Enter the license key you received via email to unlock an app or upgrade your tier.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
              className="glass-input flex-1 font-mono text-sm text-stone-300 tracking-wider uppercase"
              disabled={redeeming}
              maxLength={24}
            />
            <button
              onClick={handleRedeem}
              disabled={redeeming || !keyInput.trim()}
              className="pill-button-gold text-xs px-5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {redeeming ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {redeeming ? 'Redeeming...' : 'Redeem'}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className={`mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl border ${
              result.success
                ? 'border-stone-300/30 bg-stone-300/5 text-stone-300'
                : 'border-red-800/50 bg-red-900/15 text-red-400'
            }`}>
              {result.success ? (
                <CheckCircle className="size-4 mt-0.5 shrink-0 text-stone-300" />
              ) : (
                <XCircle className="size-4 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="text-xs font-medium">{result.message}</p>
                {result.success && result.tier && (
                  <p className="text-[10px] mt-1 opacity-70">
                    Tier: {result.tier === 'ultimate' ? 'Ultimate' : result.tier === 'pro' ? 'Pro' : result.tier === 'basic' ? 'Basic' : result.tier === 'standard' ? 'Basic' : result.tier}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 text-[10px] text-white/45 leading-relaxed space-y-1">
            <p>• Keys are one-time use only and tied to your account.</p>
            <p>• After redemption, access is synced to the desktop app automatically.</p>
            <p>• Purchase keys for any app from the <a href="/pricing" className="text-accent hover:underline">pricing page</a>.</p>
          </div>
        </div>

        {/* App Cards */}
        <div>
          <h2 className="text-sm font-bold text-white mb-4">Your Apps</h2>
          {loadingApps ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 text-accent animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apps.map((app) => {
                const Icon = app.icon;
                return (
                  <div
                    key={app.id}
                    className={`glass-panel p-5 transition-all duration-300 ${
                      app.unlocked
                        ? 'border-stone-300/20 bg-gradient-to-br from-stone-300/5 to-transparent'
                        : 'opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`size-12 rounded-xl flex items-center justify-center ${
                        app.unlocked
                          ? 'bg-stone-300/10 border border-stone-300/20 text-stone-300'
                          : 'bg-white/[0.04] border border-white/[0.06] text-white/30'
                      }`}>
                        <Icon className="size-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white">{app.name}</h3>
                          {app.unlocked && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-300/10 text-stone-300 border border-stone-300/20">
                              Unlocked
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/45">{app.description}</p>
                        {app.tier && (
                          <p className="text-[10px] text-accent mt-1 font-medium capitalize">{app.tier}</p>
                        )}
                        {!app.unlocked && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-[10px] text-white/35">Locked</span>
                            <div className="size-1.5 rounded-full bg-white/20" />
                            <span className="text-[10px] text-white/35">Redeem a key above</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Keys Summary */}
        {keys.length > 0 && (
          <div className="glass-panel p-5">
            <h3 className="text-xs font-bold text-white mb-3">Redeemed Keys</h3>
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.key} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <code className="text-[11px] font-mono font-semibold text-stone-300 tracking-wider flex-1">{k.key}</code>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                    k.app === 'optimizer' ? 'text-accent bg-accent/10' : 'text-steel-300 bg-white/[0.06]'
                  }`}>
                    {k.app === 'optimizer' ? 'Optimizer' : k.app}
                  </span>
                  {k.tier && <span className="text-[9px] text-white/45 capitalize">{k.tier}</span>}
                  <span className={`text-[9px] ${k.status === 'used' ? 'text-stone-300' : 'text-white/35'}`}>
                    {k.status}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(k.key)}
                    className="p-1 rounded text-white/35 hover:text-white/65 transition-colors"
                    title="Copy key"
                  >
                    <Copy className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Need Help */}
        <div className="glass-panel p-5 text-center">
          <p className="text-xs text-white/55">
            Need help?{' '}
            <a href="https://discord.gg/ssQXKzA2HU" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Contact us on Discord
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
