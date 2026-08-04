import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, User, Mail, Crown, Save, RotateCcw, CheckCircle, AlertTriangle, Shield, MessageCircle, ShoppingCart, Check, X, Sparkles, Zap, RefreshCw, FileText, ArrowUp, ArrowDown, Download, KeyRound, Copy, ExternalLink, Globe, Camera, Palette } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTier } from '../hooks/useTier';
import { useTheme, ACCENT_PRESETS } from '../contexts/ThemeContext';
import CustomSelect from './CustomSelect';

// Primary website URL - both https://horizon-tweaks.vercel.app and
// https://impulse-optimizations.vercel.app serve the same app
const WEBSITE_URL = 'https://horizon-tweaks.vercel.app';

interface SectionProps {
  icon: typeof Settings;
  title: string;
  desc: string;
  children: React.ReactNode;
}

function SectionCard({ icon: Icon, title, desc, children }: SectionProps) {
  return (
    <div className="glass-panel p-6 md:p-7 space-y-5 relative" style={{ overflow: 'visible' }}>
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-gradient-to-br from-steel-600 to-steel-800 border border-white/[0.06] flex items-center justify-center shrink-0 shadow-neo-raised-sm">
          <Icon className="size-5 text-steel-300" />
        </div>
        <div>
          <h2 className="text-base font-bold text-steel-100">{title}</h2>
          <p className="text-xs text-steel-500 mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

interface TierCardProps {
  id: string;
  name: string;
  price: string;
  period: string;
  color: string;
  border: string;
  glow: string;
  badge: { text: string; class: string } | null;
  desc: string;
  features: { ok: boolean; text: string }[];
  isCurrentPlan: boolean;
  onBuy: (tier: string) => void;
}

function TierCard({ id, name, price, period, color, border, glow, badge, desc, features, isCurrentPlan, onBuy }: TierCardProps) {
  return (
    <div className={`relative flex flex-col rounded-xl border p-5 bg-surface-950/60 transition-all duration-300 hover:-translate-y-1 ${border} ${glow} ${isCurrentPlan ? 'ring-2 ring-blue-500/40' : ''}`}>
      {badge && (
        <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 ${badge.class} text-[9px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap`}>
          {id === 'basic' && <Sparkles className="size-2.5" />}
          {badge.text}
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-2.5 right-3 flex items-center gap-1 bg-stone-300/15 text-stone-300 text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-stone-300/20">
          <Crown className="size-2.5" />
          Current
        </div>
      )}

      <div className="mb-4">
        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${color}`}>{name}</span>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="font-bold text-3xl text-steel-100">{price}</span>
          <span className="text-[10px] text-steel-500 font-medium">{period}</span>
        </div>
        <p className="text-[11px] text-steel-500 mt-1.5 leading-relaxed">{desc}</p>
      </div>

      <ul className="text-[11px] space-y-2 mb-6 flex-1">
        {features.map((f, i) => (
          <li key={i} className={`flex items-start gap-2 ${f.ok ? 'text-steel-300' : 'text-steel-600'}`}>
            {f.ok ? (
              <Check className="size-3 mt-0.5 shrink-0 text-stone-300" />
            ) : (
              <X className="size-3 mt-0.5 shrink-0 text-steel-600" />
            )}
            {f.text}
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <div className="w-full py-2.5 rounded-xl text-[11px] font-bold bg-surface-950 border border-white/[0.06] text-steel-500 text-center cursor-default">
          Your Current Plan
        </div>
      ) : (
        <button
          onClick={() => onBuy(id)}
          className={`w-full py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-[0.98] ${
            id === 'basic'
              ? 'bg-steel-600 text-steel-200 hover:bg-steel-500 shadow-neo-raised-sm'
              : 'blue-button'
          }`}
        >
          Buy {name} — {price}
        </button>
      )}
    </div>
  );
}

const tiers = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: 'text-steel-500',
    border: 'border-white/[0.06]',
    glow: '',
    badge: null,
    desc: 'Core monitoring and safety tools included.',
    features: [
      { ok: true, text: 'Dashboard & system overview' },
      { ok: true, text: 'Utilities & documentation' },
      { ok: true, text: 'Rollback panel' },
      { ok: false, text: 'General system tweaks' },
      { ok: false, text: 'Game profiles & booster' },
      { ok: false, text: 'Network & latency tools' },
      { ok: false, text: 'Advanced tweaks' },
      { ok: false, text: 'Horizon Benchmark suite' },
      { ok: false, text: 'Horizon Chat AI' },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '$4.99',
    period: 'one-time',
    color: 'text-steel-300',
    border: 'border-steel-500/25',
    glow: 'shadow-lg shadow-steel-500/5',
    badge: { text: 'Most Popular', class: 'bg-steel-600 text-steel-200' },
    desc: 'Full gaming and network toolkit — pay once, own forever.',
    features: [
      { ok: true, text: 'Everything in Free' },
      { ok: true, text: 'General system tweaks' },
      { ok: true, text: 'Game profiles & booster' },
      { ok: true, text: 'Network optimization' },
      { ok: true, text: 'Process & startup manager' },
      { ok: true, text: 'Disk analyzer & Wi-Fi analyzer' },
      { ok: true, text: 'Display info & privacy dashboard' },
      { ok: false, text: 'Advanced tweaks' },
      { ok: false, text: 'Horizon Benchmark suite' },
      { ok: false, text: 'Horizon Chat AI' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: 'one-time',
    color: 'text-steel-200',
    border: 'border-white/[0.10]',
    glow: 'shadow-lg shadow-white/[0.03]',
    badge: { text: 'Best Value', class: 'bg-stone-300/20 text-stone-300 border border-white/[0.06]' },
    desc: 'Advanced tools for power users — no recurring fees.',
    features: [
      { ok: true, text: 'Everything in Basic' },
      { ok: true, text: 'Advanced system tweaks' },
      { ok: true, text: 'System debloating' },
      { ok: true, text: 'Horizon Benchmark suite' },
      { ok: true, text: 'Priority support' },
      { ok: false, text: 'Horizon Chat AI' },
    ],
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: '$19.99',
    period: 'one-time',
    color: 'text-stone-300',
    border: 'border-stone-300/25',
    glow: 'shadow-lg shadow-stone-300/5',
    badge: { text: 'Ultimate', class: 'bg-stone-300/20 text-stone-300 border border-stone-300/20' },
    desc: 'Every module unlocked. Lifetime access. AI-powered.',
    features: [
      { ok: true, text: 'Everything in Pro' },
      { ok: true, text: 'Horizon Benchmark suite' },
      { ok: true, text: 'Horizon Chat AI (unlimited)' },
      { ok: true, text: 'Auto Tweaker (AI-driven)' },
      { ok: true, text: 'Driver AI (AI-powered)' },
      { ok: true, text: 'Priority support & early access' },
    ],
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { tier, refreshTier } = useTier();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem('user-avatar-url') || '');
  const [avatarInput, setAvatarInput] = useState(avatarUrl);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Subscription management state
  const [subLoading, setSubLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'change' | null>(null);
  const [pendingTier, setPendingTier] = useState<string | null>(null);

  // Track previous tier for auto-detection of upgrades
  const prevTierRef = useRef(tier);
  const [purchaseDetected, setPurchaseDetected] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'uptodate' | 'error' | 'available'>('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [updateError, setUpdateError] = useState('');
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    invoke<string>('get_app_version').then(setAppVersion).catch(() => setAppVersion('2.0.0'));
    invoke<boolean>('is_admin').then(setIsAdminUser).catch(() => setIsAdminUser(false));
  }, []);

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    setUpdateInfo(null);
    setUpdateError('');
    try {
      const update = await invoke<any>('check_for_update');
      if (update) {
        setUpdateInfo(update);
        setUpdateStatus('available');
      } else {
        setUpdateStatus('uptodate');
        setTimeout(() => setUpdateStatus('idle'), 4000);
      }
    } catch (e: any) {
      console.error('Update check failed:', e);
      const msg = typeof e === 'string' ? e : e?.message || 'Unknown error';
      setUpdateError(msg);
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 6000);
    }
  };

  // Run a single refreshTier on mount so returning users see their correct tier immediately
  useEffect(() => {
    refreshTier();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect tier changes and show upgrade notification
  useEffect(() => {
    if (prevTierRef.current !== tier) {
      if ((tier === 'basic' || tier === 'pro' || tier === 'ultimate') && prevTierRef.current === 'free') {
        setPurchaseDetected(true);
        setNotification({
          type: 'success',
          message: `ðŸŽ‰ You've been upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)}! Your new features are now available.`,
        });
      }
      prevTierRef.current = tier;
    }
  }, [tier]);

  // Cleanup polling and safety timeout on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };
  }, []);

  // Auto-dismiss purchase notification after 5s
  useEffect(() => {
    if (purchaseDetected) {
      const timer = setTimeout(() => setPurchaseDetected(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [purchaseDetected]);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNotification({ type: 'error', message: 'Display name cannot be empty' });
      return;
    }
    if (trimmed.length > 32) {
      setNotification({ type: 'error', message: 'Display name must be 32 characters or fewer' });
      return;
    }
    setSaving(true);
    try {
      await invoke('update_user_profile', { userId: user?.user_id, displayName: trimmed });
      setNotification({ type: 'success', message: 'Display name updated' });
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : e?.message || 'Failed to update';
      setNotification({ type: 'error', message: msg });
    }
    setSaving(false);
  };

  const handleBuy = useCallback(async (tierId: string) => {
    const url = `${WEBSITE_URL}/pricing`;
    try {
      await invoke('open_checkout_url', { url });
    } catch {
      setNotification({ type: 'error', message: 'Could not open browser. Visit arktweaks.com/pricing to purchase.' });
      return;
    }

    // Show info message
    setNotification({
      type: 'info',
      message: `Complete your purchase in the browser, then click "Sync Purchase" below to activate your ${tierId.charAt(0).toUpperCase() + tierId.slice(1)} tier.`,
    });

    // Start auto-polling every 5 seconds to detect the purchase
    // The useEffect watching `tier` handles the notification and stops polling
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

    pollingRef.current = setInterval(async () => {
      await refreshTier();
    }, 5000);

    // Safety cutoff: stop polling after 5 minutes even if no purchase detected
    safetyTimeoutRef.current = setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      safetyTimeoutRef.current = null;
    }, 300000);
  }, [refreshTier, tier]);

  const handleCancelSubscription = useCallback(async () => {
    setSubLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`${WEBSITE_URL}/api/paypal/cancel-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user?.user_id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Cancellation failed');
      await refreshTier();
      setNotification({ type: 'success', message: 'Subscription cancelled. Downgraded to Free. You keep access until end of billing period.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setNotification({ type: 'error', message: msg });
    }
    setSubLoading(false);
    setConfirmAction(null);
  }, [user?.user_id, refreshTier]);

  const handleChangePlan = useCallback(async (newTier: string) => {
    setSubLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`${WEBSITE_URL}/api/paypal/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user?.user_id, newTier }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Plan change failed');

      await refreshTier();

      if (data.approvalUrl) {
        try {
          await invoke('open_checkout_url', { url: data.approvalUrl });
        } catch {
          // ignore — user can approve from their PayPal dashboard
        }
        setNotification({
          type: 'success',
          message: `Plan changed to ${newTier === 'basic' ? 'Basic' : newTier === 'pro' ? 'Pro' : 'Ultimate'}! A PayPal approval tab has opened — please complete it there.`,
        });
      } else {
        setNotification({
          type: 'success',
          message: `Plan changed to ${newTier === 'basic' ? 'Basic' : newTier === 'pro' ? 'Pro' : 'Ultimate'}! Changes applied immediately.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setNotification({ type: 'error', message: msg });
    }
    setSubLoading(false);
    setConfirmAction(null);
    setPendingTier(null);
  }, [user?.user_id, refreshTier]);

  const handleSyncPurchase = useCallback(async () => {
    setIsSyncing(true);
    setNotification(null);
    try {
      const updated = await refreshTier();
      if (updated) {
        setNotification({ type: 'success', message: `âœ… Purchase synced! You're now on the ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan.` });
      } else {
        setNotification({ type: 'error', message: 'No purchase detected. Make sure you completed checkout on the website.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to sync. Try again or contact support on Discord.' });
    }
    setIsSyncing(false);
  }, [refreshTier, tier]);

  const tierLabel = tier || 'free';
  const tierColors: Record<string, string> = {
    admin: 'bg-red-500/10 border border-red-500/20 text-red-400',
    ultimate: 'bg-stone-300/10 border border-stone-300/20 text-stone-300',
    pro: 'bg-steel-500/20 border border-steel-400/20 text-steel-200',
    basic: 'bg-steel-600/20 border border-steel-500/20 text-steel-300',
    free: 'bg-steel-700/30 border border-white/[0.06] text-steel-500',
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl text-sm font-medium animate-in slide-in-from-top-2 ${
          notification.type === 'success'
            ? 'bg-stone-300/15 text-stone-300 border border-white/[0.08]'
            : notification.type === 'info'
              ? 'bg-stone-300/15 text-stone-200 border border-stone-300/25'
              : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="size-5 shrink-0" /> :
           notification.type === 'info' ? <RefreshCw className="size-5 shrink-0" /> :
           <AlertTriangle className="size-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="size-12 rounded-xl bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shrink-0 shadow-neo-raised border border-white/[0.06]">
          <Settings className="size-6 text-steel-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-steel-100">Settings</h1>
          <p className="text-sm text-steel-500 mt-0.5">Manage your account and app preferences</p>
        </div>
      </div>

      {/* Profile */}
      <SectionCard icon={User} title="Profile" desc="Your display name appears in Horizon Tweaks.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="size-20 rounded-full border-2 border-stone-300/30 object-cover mb-2" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="size-20 rounded-full bg-gradient-to-br from-stone-300/20 to-stone-400/5 border-2 border-stone-300/20 flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-stone-300">{(user?.display_name || user?.email || '?')[0].toUpperCase()}</span>
              </div>
            )}
            <span className="text-[10px] text-white/30">Profile Picture</span>
          </div>
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                <User className="size-3.5" />
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setNotification(null); }}
                maxLength={32}
                placeholder="Your name"
                className="glass-input"
              />
              <p className="text-xs text-white/40 mt-1.5">{displayName.length}/32 characters</p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                <Mail className="size-3.5" />
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="glass-input text-white/40 cursor-not-allowed opacity-60"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
                <Camera className="size-3.5" />
                Profile Picture URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={avatarInput}
                  onChange={e => setAvatarInput(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="glass-input flex-1"
                />
                <button
                  onClick={() => {
                    setAvatarUrl(avatarInput);
                    localStorage.setItem('user-avatar-url', avatarInput);
                    setNotification({ type: 'success', message: 'Profile picture updated' });
                  }}
                  disabled={avatarInput === avatarUrl}
                  className="pill-button disabled:opacity-40 shrink-0"
                >
                  <Save className="size-3.5" />
                  Set
                </button>
              </div>
              <p className="text-[10px] text-white/30 mt-1">Paste a direct link to your profile image (PNG, JPG, etc.)</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || displayName.trim() === (user?.display_name || '')}
          className="pill-button disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <RotateCcw className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </SectionCard>

      {/* Language & Locale */}
      <LanguageSection />

      {/* Appearance */}
      <AppearanceSection />

      {/* License Key */}
      <LicenseKeyCard user={user} />

      {/* Shop */}
      <SectionCard icon={ShoppingCart} title="Shop" desc="Purchase tiers and unlock all features of Horizon Tweaks.">
        {/* Current Plan + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Crown className={`size-7 ${tierLabel === 'ultimate' ? 'text-stone-300' : tierLabel === 'pro' ? 'text-stone-300' : tierLabel === 'basic' ? 'text-stone-300' : 'text-white/30'}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${tierColors[tierLabel] || tierColors.free}`}>
                  {tierLabel === 'free' ? 'Free' : tierLabel === 'basic' ? 'Basic' : tierLabel === 'pro' ? 'Pro' : tierLabel === 'ultimate' ? 'Ultimate' : 'Admin'}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                {tierLabel === 'free' ? 'Core monitoring and safety tools' :
                 tierLabel === 'basic' ? 'Full gaming and network toolkit' :
                 tierLabel === 'pro' ? 'Advanced tools for power users' :
                 tierLabel === 'ultimate' ? 'Every module unlocked' :
                 'Full administrative access'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {tierLabel === 'free' ? (
              <>
                <button
                  onClick={() => invoke('open_checkout_url', { url: `${WEBSITE_URL}/api/download-latest` })}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-steel-600 text-steel-200 hover:bg-steel-500 transition-all active:scale-[0.98] shadow-neo-raised-sm"
                >
                  <Download className="size-3.5" />
                  Download Free
                </button>
                <button
                  onClick={() => handleBuy('basic')}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-stone-300/30 text-stone-300 hover:bg-stone-300/10 transition-all active:scale-[0.98]"
                >
                  <Zap className="size-3.5" />
                  View Plans
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSyncPurchase}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-steel-700/30 border border-white/[0.06] text-steel-300 hover:bg-steel-600/30 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </button>
                {tierLabel === 'basic' && (
                  <button
                    onClick={() => { setConfirmAction('change'); setPendingTier('pro'); }}
                    disabled={subLoading}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-stone-300/10 border border-stone-300/20 text-stone-300 hover:bg-stone-300/20 transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    <ArrowUp className="size-3.5" />
                    Upgrade
                  </button>
                )}
                {(tierLabel === 'ultimate' || tierLabel === 'pro' || tierLabel === 'basic') && (
                  <a
                    href="https://discord.gg/ssQXKzA2HU"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium border border-white/[0.09] text-white/55 hover:text-white/70 hover:border-white/[0.15] transition-all"
                  >
                    <MessageCircle className="size-3.5" />
                    Support
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {/* Plan Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Compare Plans</h3>
            <span className="text-[10px] text-white/40">One-time &middot; Lifetime access</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((t) => (
              <TierCard key={t.id} {...t} isCurrentPlan={t.id === tierLabel} onBuy={handleBuy} />
            ))}
          </div>
        </div>

        {/* Payment + Terms compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-stone-300" />
              <span className="text-xs font-semibold text-white">Accepted Payments</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/60">Credit / Debit Card</span>
              <span className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/60">PayPal</span>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed">
              Processed securely through Stripe &amp; PayPal. Your tier syncs automatically after purchase.
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-white/40" />
              <span className="text-xs font-semibold text-white">Terms</span>
            </div>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2 text-[11px] text-white/50">
                <span className="size-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
                One-time purchase — pay once, use forever. No recurring fees.
              </li>
              <li className="flex items-start gap-2 text-[11px] text-white/50">
                <span className="size-1 rounded-full bg-white/20 mt-1.5 shrink-0" />
                Need help? Join our <a href="https://discord.gg/ssQXKzA2HU" target="_blank" rel="noopener noreferrer" className="text-stone-300 hover:underline">Discord</a> — we respond within hours
              </li>
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* About */}
      <SectionCard icon={Shield} title="About" desc="App version and system information.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-steel-700/30 border border-white/[0.06] rounded-xl p-4">
            <div className="text-xs text-steel-500 mb-1">Version</div>
            <div className="text-sm font-semibold text-steel-200">{appVersion || '2.0.0'}</div>
          </div>
          <div className="bg-steel-700/30 border border-white/[0.06] rounded-xl p-4">
            <div className="text-xs text-steel-500 mb-1">Platform</div>
            <div className="text-sm font-semibold text-steel-200">Windows 10/11</div>
          </div>
          <div className="bg-steel-700/30 border border-white/[0.06] rounded-xl p-4">
            <div className="text-xs text-steel-500 mb-1">Copyright</div>
            <div className="text-sm font-semibold text-steel-200">Horizon Tweaks &copy; {new Date().getFullYear()}</div>
          </div>
        </div>
        <button
          onClick={handleCheckUpdate}
          disabled={updateStatus === 'checking'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 bg-steel-700/30 border border-white/[0.06] hover:bg-steel-600/30 text-steel-500 hover:text-steel-300 disabled:opacity-50"
        >
          <Download className="size-3.5" />
          {updateStatus === 'checking' ? 'Checking...' :
           updateStatus === 'uptodate' ? 'Up to date' :
           updateStatus === 'available' ? `Update v${updateInfo?.version} available` :
           updateStatus === 'error' ? updateError || 'Check failed' :
           'Check for Updates'}
        </button>
        {!isAdminUser && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-300/10 border border-stone-300/20">
            <Shield className="size-5 text-stone-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-200 font-medium">Running with limited permissions</p>
              <p className="text-[10px] text-stone-400/70">Some features require administrator access</p>
            </div>
            <button
              onClick={async () => {
                try {
                  await invoke('restart_as_admin');
                } catch {}
              }}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-stone-300/20 text-stone-200 hover:bg-stone-300/30 transition-all border border-stone-300/20"
            >
              Restart as Admin
            </button>
          </div>
        )}
      </SectionCard>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setConfirmAction(null); setPendingTier(null); }}}>
          <div className="bg-[#0d1117] border border-white/[0.08] rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              {confirmAction === 'cancel' ? 'Cancel Subscription' : `Switch to ${pendingTier === 'basic' ? 'Basic' : pendingTier === 'pro' ? 'Pro' : 'Ultimate'}`}
            </h3>
            <p className="text-xs text-white/50 mb-5">
              {confirmAction === 'cancel' ? (
                'Your subscription will be cancelled immediately. You\'ll keep access to paid features until the end of this billing period, then be downgraded to Free.'
              ) : pendingTier === 'basic' ? (
                'Your tier will be set to Basic. Your features will match Basic level access.'
              ) : pendingTier === 'pro' ? (
                'Your tier will be set to Pro. You\'ll get full Pro access.'
              ) : (
                'Your tier will be set to Ultimate. You\'ll get full Ultimate access.'
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmAction(null); setPendingTier(null); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium border border-white/[0.08] text-white/50 hover:text-white hover:border-white/15 transition-all"
              >
                Keep Current Plan
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'cancel') handleCancelSubscription();
                  else if (pendingTier) handleChangePlan(pendingTier);
                }}
                disabled={subLoading}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 ${
                  confirmAction === 'cancel'
                    ? 'bg-red-600 hover:bg-red-500'
                    : pendingTier === 'basic'
                      ? 'bg-stone-600 hover:bg-stone-300'
                      : pendingTier === 'pro'
                        ? 'bg-stone-600 hover:bg-stone-300'
                        : 'bg-stone-600 hover:bg-stone-300'
                }`}
              >
                {subLoading ? 'Processing...' : confirmAction === 'cancel' ? 'Yes, Cancel' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discord */}
      <SectionCard icon={MessageCircle} title="Join Our Community" desc="Connect with us on Discord for support, updates, and partnership opportunities.">
        <p className="text-xs text-steel-400 leading-relaxed mb-3">
          Need help with a purchase, want to cancel, or just want to chat? Join our Discord server. Our team is active daily and typically responds within a few hours.
        </p>
        <a
          href="https://discord.gg/ssQXKzA2HU"
          target="_blank"
          rel="noopener noreferrer"
          className="pill-button inline-flex items-center gap-2 w-fit"
        >
          <MessageCircle className="size-4" />
          Join Our Community
        </a>
      </SectionCard>
    </div>
  );
}

/* ─── Appearance Section ────────────────────────────── */
function AppearanceSection() {
  const { accentColor, setAccentColor } = useTheme();

  return (
    <SectionCard icon={Palette} title="Appearance" desc="Customize the accent color used across the interface.">
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
          <Palette className="size-3.5" />
          Accent Color
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.color}
              onClick={() => setAccentColor(preset.color)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 border ${
                accentColor === preset.color
                  ? 'border-white/20 bg-white/[0.06] shadow-lg'
                  : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'
              }`}
              title={preset.name}
            >
              <div
                className={`size-8 rounded-full border-2 transition-all duration-200 relative ${accentColor === preset.color ? 'ring-2 ring-white/30' : ''}`}
                style={{
                  backgroundColor: preset.color,
                  borderColor: accentColor === preset.color ? 'white' : 'rgba(255,255,255,0.1)',
                  boxShadow: accentColor === preset.color ? `0 0 12px ${preset.color}40` : 'none',
                }}
              >
                {accentColor === preset.color && (
                  <Check className="absolute inset-0 m-auto size-4 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                )}
              </div>
              <span className="text-[10px] text-white/40 font-medium">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
          Custom Color
        </label>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="size-10 rounded-xl cursor-pointer border-2 border-white/10 hover:border-white/20 transition-all bg-transparent"
              style={{ backgroundColor: accentColor }}
            />
          </div>
          <input
            type="text"
            value={accentColor}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9a-fA-F]{6}$/.test(val)) setAccentColor(val);
            }}
            placeholder="#d4a843"
            className="glass-input flex-1 text-sm font-mono uppercase"
          />
        </div>
        <p className="text-[10px] text-white/30 mt-2">Pick any color or enter a hex code. Changes apply instantly across the entire UI.</p>
      </div>
    </SectionCard>
  );
}

/* ─── Language & Locale Section ───────────────────────── */
const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', font: 'Inter' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol', dir: 'ltr', font: 'Inter' },
  { code: 'fr', name: 'French', nativeName: 'Francais', dir: 'ltr', font: 'Inter' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr', font: 'Inter' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugues', dir: 'ltr', font: 'Inter' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr', font: 'Inter' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr', font: 'Inter' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr', font: 'Inter' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr', font: 'Inter' },
  { code: 'tr', name: 'Turkish', nativeName: 'Turkce', dir: 'ltr', font: 'Inter' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr', font: 'Noto Sans JP' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr', font: 'Noto Sans KR' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr', font: 'Noto Sans SC' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', dir: 'ltr', font: 'Noto Sans TC' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', font: 'Noto Sans Arabic' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', font: 'Noto Sans Devanagari' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', dir: 'ltr', font: 'Noto Sans Thai' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tieng Viet', dir: 'ltr', font: 'Inter' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', dir: 'ltr', font: 'Inter' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', dir: 'ltr', font: 'Inter' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', dir: 'ltr', font: 'Inter' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', dir: 'ltr', font: 'Inter' },
  { code: 'cs', name: 'Czech', nativeName: 'Cestina', dir: 'ltr', font: 'Inter' },
  { code: 'ro', name: 'Romanian', nativeName: 'Romana', dir: 'ltr', font: 'Inter' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', dir: 'ltr', font: 'Inter' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr', font: 'Inter' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr', font: 'Inter' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr', font: 'Inter' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', dir: 'ltr', font: 'Inter' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycanca', dir: 'ltr', font: 'Inter' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl', font: 'Noto Sans Arabic' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', dir: 'rtl', font: 'Noto Sans Arabic' },
  { code: 'ckb', name: 'Sorani Kurdish', nativeName: 'سۆرانی', dir: 'rtl', font: 'Noto Sans Arabic' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr', font: 'Noto Sans Bengali' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr', font: 'Inter' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', dir: 'ltr', font: 'Noto Sans Devanagari' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', dir: 'ltr', font: 'Noto Sans Sinhala' },
  { code: 'my', name: 'Myanmar', nativeName: 'မြန်မာ', dir: 'ltr', font: 'Noto Sans Myanmar' },
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', dir: 'ltr', font: 'Noto Sans Khmer' },
  { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ', dir: 'ltr', font: 'Noto Sans Lao' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', dir: 'ltr', font: 'Noto Sans Georgian' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', dir: 'ltr', font: 'Noto Sans Armenian' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', dir: 'rtl', font: 'Noto Sans Hebrew' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', dir: 'rtl', font: 'Noto Sans Arabic' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', dir: 'ltr', font: 'Inter' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', dir: 'ltr', font: 'Inter' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', dir: 'ltr', font: 'Inter' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', dir: 'ltr', font: 'Inter' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', dir: 'ltr', font: 'Inter' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', dir: 'ltr', font: 'Inter' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', dir: 'ltr', font: 'Inter' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', dir: 'ltr', font: 'Inter' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', dir: 'ltr', font: 'Inter' },
];

function LanguageSection() {
  const [selectedLang, setSelectedLang] = useState(() => {
    return localStorage.getItem('app-locale') || 'en';
  });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const handleLanguageChange = async (code: string) => {
    setSaving(true);
    const lang = LANGUAGES.find(l => l.code === code);
    if (lang) {
      localStorage.setItem('app-locale', code);
      localStorage.setItem('app-locale-dir', lang.dir);
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = code;
      setNotification({ type: 'success', message: `Language set to ${lang.nativeName}. UI will fully update on next restart.` });
    }
    setSelectedLang(code);
    setSaving(false);
  };

  const currentLang = LANGUAGES.find(l => l.code === selectedLang);

  return (
    <SectionCard icon={Globe} title="Language & Region" desc="Choose your preferred language and text direction.">
      {notification && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium ${
          notification.type === 'success'
            ? 'bg-stone-300/10 text-stone-300 border border-white/[0.06]'
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
          {notification.message}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">
            <Globe className="size-3.5" />
            Language
          </label>
          <CustomSelect
            value={selectedLang}
            onChange={handleLanguageChange}
            options={LANGUAGES.map(l => ({
              value: l.code,
              label: `${l.nativeName} (${l.name})`,
            }))}
            placeholder="Select language"
            searchable
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">Text Direction</label>
          <div className="flex items-center gap-2 mt-1.5">
            <div className={`px-3 py-2 rounded-xl text-xs font-mono border ${
              currentLang?.dir === 'rtl'
                ? 'bg-stone-300/10 border-stone-300/20 text-stone-300'
                : 'bg-white/[0.04] border-white/[0.06] text-steel-300'
            }`}>
              {currentLang?.dir === 'rtl' ? 'Right-to-Left (RTL)' : 'Left-to-Right (LTR)'}
            </div>
            {saving && <RefreshCw className="size-3.5 animate-spin text-stone-300" />}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-white/30">
        Full language support including RTL layout, localized fonts, and translated UI elements will be available in the next major update.
      </p>
    </SectionCard>
  );
}

/* ─── License Key Card ─────────────────────────────────── */
function LicenseKeyCard({ user }: { user: any }) {
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [licenseTier, setLicenseTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchKey = useCallback(async () => {
    if (!user?.id_token) return;
    setLoading(true);
    try {
      const res = await fetch(`${WEBSITE_URL}/api/license-keys/my-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: user.id_token }),
      });
      const data = await res.json();
      if (data.success && data.key) {
        setLicenseKey(data.key);
        setLicenseTier(data.tier);
      } else {
        setLicenseKey(null);
      }
    } catch {
      setLicenseKey(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchKey(); }, [fetchKey]);

  const handleCopy = () => {
    if (licenseKey) {
      navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="glass-panel p-6 md:p-7 space-y-5">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-stone-300/10 border border-stone-300/20 flex items-center justify-center shrink-0">
          <KeyRound className="size-5 text-stone-300" />
        </div>
        <div>
          <h2 className="text-base font-bold text-steel-100">License Key</h2>
          <p className="text-xs text-steel-500 mt-0.5">Your unique license key tied to this account.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-white/50">
          <RefreshCw className="size-3.5 animate-spin" />
          Looking up your license key...
        </div>
      ) : licenseKey ? (
        <div>
          <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5">
            <code className="flex-1 text-sm font-mono font-bold text-stone-300 tracking-wider">{licenseKey}</code>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg border border-white/[0.06] text-white/50 hover:text-white/70 hover:bg-white/[0.04] transition-all"
              title="Copy key"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
          {copied && (
            <p className="text-[10px] text-stone-300 mt-1.5">Copied to clipboard!</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] text-white/40">Status:</span>
            {licenseTier && (
              <span className="text-[10px] font-semibold text-stone-300 uppercase">{licenseTier}</span>
            )}
            <a
              href={`${WEBSITE_URL}/license`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-[10px] text-stone-300 hover:underline"
            >
              View on website <ExternalLink className="size-2.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="text-xs text-white/40">
          <p>No license key assigned yet. Purchase a subscription to get one.</p>
          <p className="mt-1 text-[10px] text-white/30">Keys are automatically assigned when you buy Standard, Pro, or Ultimate.</p>
        </div>
      )}
    </div>
  );
}
