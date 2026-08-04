'use client';

import { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import ClientDate from '@/components/ClientDate';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Crown, Save, Loader2, ShoppingCart, Check, X, ExternalLink, MessageCircle, Shield, FileText, AlertTriangle, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const tierLabels: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: 'text-white/65 bg-white/[0.05]' },
  standard: { label: 'Standard', color: 'text-accent bg-accent/10' },
  pro: { label: 'Pro', color: 'text-pro bg-pro/10' },
  ultimate: { label: 'Ultimate', color: 'text-gold bg-gold/10' },
};

const tierFeatures: Record<string, { text: string; ok: boolean }[]> = {
  free: [
    { text: 'Dashboard & system overview', ok: true },
    { text: 'Utilities & documentation', ok: true },
    { text: 'Rollback panel', ok: false },
    { text: 'General system tweaks', ok: true },
    { text: 'Game profiles & booster', ok: false },
    { text: 'Network & latency tools', ok: false },
    { text: 'Advanced tweaks', ok: false },
    { text: 'Horizon Benchmark suite', ok: false },
    { text: 'Horizon Chat', ok: false },
    { text: 'Auto Tweaker', ok: false },
    { text: 'Driver AI', ok: false },
  ],
  standard: [
    { text: 'Everything in Free', ok: true },
    { text: 'General system tweaks', ok: true },
    { text: 'Game profiles & booster', ok: true },
    { text: 'Network optimization', ok: true },
    { text: 'Process & startup manager', ok: true },
    { text: 'Disk analyzer & Wi-Fi analyzer', ok: true },
    { text: 'Display info & privacy dashboard', ok: true },
    { text: 'Advanced tweaks', ok: false },
    { text: 'Horizon Benchmark suite', ok: false },
    { text: 'Horizon Chat', ok: false },
    { text: 'Auto Tweaker', ok: false },
    { text: 'Driver AI', ok: false },
  ],
  pro: [
    { text: 'Everything in Standard', ok: true },
    { text: 'Advanced system tweaks', ok: true },
    { text: 'System debloating', ok: true },
    { text: 'Horizon Benchmark suite', ok: true },
    { text: 'FPS Predictor (AI)', ok: true },
    { text: 'Priority support', ok: true },
    { text: 'Horizon Chat', ok: false },
    { text: 'Auto Tweaker', ok: false },
    { text: 'Driver AI', ok: false },
  ],
  ultimate: [
    { text: 'Everything in Pro', ok: true },
    { text: 'Horizon Chat (unlimited)', ok: true },
    { text: 'Auto Tweaker (AI-driven)', ok: true },
    { text: 'Driver AI (AI-powered)', ok: true },
    { text: 'All future modules & updates', ok: true },
    { text: 'Exclusive beta features', ok: true },
    { text: 'Priority support & early access', ok: true },
    { text: 'Extended telemetry & analytics', ok: true },
    { text: 'Custom profile sync across devices', ok: true },
  ],
};

// Map tier -> what they can switch to
const tierUpgradeMap: Record<string, string | null> = {
  free: 'basic',
  basic: 'pro',
  pro: 'ultimate',
  ultimate: null,
};

const tierDowngradeMap: Record<string, string | null> = {
  free: null,
  basic: 'free',
  pro: 'basic',
  ultimate: 'pro',
};

type ConfirmAction = 'cancel' | 'change' | null;

export default function SettingsPanel() {
  const { user, userTier, loading, setAuthOpen, refreshUser, refreshTier } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Subscription management state
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');
  const [subSuccess, setSubSuccess] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [pendingTier, setPendingTier] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto glass-panel rounded-2xl p-8 text-center">
        <User className="size-10 text-white/55 mx-auto mb-4" />
        <h2 className="font-display text-lg font-bold text-white mb-2">Sign in required</h2>
        <p className="text-sm text-white/65 mb-6">Sign in to manage your account and display name.</p>
        <button
          onClick={() => setAuthOpen(true)}
          className="pill-button text-sm font-semibold"
        >
          Sign In
        </button>
      </div>
    );
  }

  const tier = tierLabels[userTier] || tierLabels.free;
  const canUpgrade = tierUpgradeMap[userTier];
  const canDowngrade = userTier === 'ultimate' ? 'pro' : userTier === 'pro' ? 'basic' : userTier === 'basic' ? 'cancel' : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const trimmed = displayName.trim();
    if (!trimmed) {
      setError('Display name cannot be empty.');
      return;
    }
    if (trimmed.length > 32) {
      setError('Display name must be 32 characters or fewer.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      await refreshUser();
      setSuccess('Display name updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update display name.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Subscription Actions ----

  const handleCancelSubscription = async () => {
    if (!user?.uid) return;
    setSubLoading(true);
    setSubError('');
    setSubSuccess('');
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Cancellation failed');
      setSubSuccess(data.message || 'Subscription cancelled. You can still access paid features until the end of this billing period.');
      await refreshTier();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setSubError(msg);
    } finally {
      setSubLoading(false);
      setConfirmAction(null);
    }
  };

  const handleChangePlan = async (newTier: string) => {
    if (!user?.uid) return;
    setSubLoading(true);
    setSubError('');
    setSubSuccess('');
    try {
      const res = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, newTier }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Plan change failed');

      if (data.approvalUrl) {
        window.open(data.approvalUrl, '_blank', 'noopener,noreferrer');
      }

      setSubSuccess(
        data.message ||
        `Plan changed! ${
          data.approvalUrl
            ? 'PayPal needs your approval to confirm. A new tab has opened — please complete the approval there.'
            : 'Changes will apply shortly.'
        }`
      );
      await refreshTier();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setSubError(msg);
    } finally {
      setSubLoading(false);
      setConfirmAction(null);
      setPendingTier(null);
    }
  };

  // Confirmation dialog
  const renderConfirmDialog = () => {
    if (!confirmAction) return null;

    const isCancel = confirmAction === 'cancel';
    const targetTier = pendingTier;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setConfirmAction(null); setPendingTier(null); }}}>
        <div className="bg-surface-900 border border-surface-700/80 rounded-2xl w-full max-w-sm p-6 md:p-7 relative shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-1">
            {isCancel ? 'Cancel Subscription' : `Switch to ${targetTier === 'basic' ? 'Basic' : targetTier === 'pro' ? 'Pro' : 'Ultimate'}`}
          </h3>
          <p className="text-xs text-surface-400 mb-5">
            {isCancel ? (
              'Your tier will be changed as requested. Changes apply immediately.'
            ) : pendingTier === 'basic' ? (
              'Your tier will be set to Standard. Your features will match Standard level access.'
            ) : pendingTier === 'pro' ? (
              'Your tier will be set to Pro. You\'ll get full Pro access.'
            ) : (
              'Your tier will be set to Ultimate. You\'ll get full Ultimate access.'
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { setConfirmAction(null); setPendingTier(null); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium border border-surface-700/60 text-surface-400 hover:text-surface-200 hover:border-surface-500 transition-all"
            >
              Keep Current Plan
            </button>
            <button
              onClick={() => {
                if (isCancel) handleCancelSubscription();
                else if (targetTier) handleChangePlan(targetTier);
              }}
              disabled={subLoading}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 ${
                isCancel
                  ? 'bg-red-600 hover:bg-red-500'
                  : targetTier === 'basic'
                    ? 'bg-accent text-black hover:bg-accent-dark'
                    : targetTier === 'pro'
                      ? 'bg-white text-black hover:bg-white/90'
                      : 'bg-gold text-black hover:bg-gold/90'
              }`}
            >
              {subLoading ? 'Processing...' : isCancel ? 'Yes, Cancel' : 'Confirm Change'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Profile */}
      <div className="glass-panel rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-lg font-bold text-white mb-1">Profile</h2>
        <p className="text-xs text-white/55 mb-6">Your display name appears in Horizon Tweaks and on this site.</p>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-white/55 uppercase tracking-wider mb-1.5">
              <User className="size-3" />
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setError(''); setSuccess(''); }}
              maxLength={32}
              placeholder="Your name"
              className="glass-input"
            />
            <p className="text-[10px] text-white/55 mt-1.5">{displayName.length}/32 characters</p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-white/55 uppercase tracking-wider mb-1.5">
              <Mail className="size-3" />
              Email
            </label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="glass-input text-white/55 cursor-not-allowed opacity-60"
            />
            <p className="text-[10px] text-white/55 mt-1.5">Email cannot be changed here.</p>
          </div>

          {error && (
            <div className="border border-red-800/50 bg-red-900/15 px-3 py-2 rounded-lg text-xs text-red-400">{error}</div>
          )}
          {success && (
            <div className="border border-accent/30 bg-accent/10 px-3 py-2 rounded-lg text-xs text-accent">{success}</div>
          )}

          <button
            type="submit"
            disabled={saving || displayName.trim() === (user.displayName || '')}
            className="pill-button text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#34d399] disabled:scale-100"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Subscription */}
      <div className="glass-panel rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-lg font-bold text-white mb-1">Subscription</h2>
        <p className="text-xs text-white/55 mb-4">Your current Horizon Tweaks tier.</p>

        {/* Current plan badge */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Crown className="size-4 text-accent" />
            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${tier.color}`}>
              {tier.label}
            </span>
          </div>
          {userTier === 'free' && (
            <Link href="/pricing" className="text-xs font-semibold text-accent hover:underline">
              Upgrade tier
            </Link>
          )}
        </div>

        {/* Subscription management for paid users */}
        {(userTier === 'basic' || userTier === 'pro' || userTier === 'ultimate') && (
          <>
            <div className="border-t border-white/[0.09] pt-4 mt-2 space-y-3">
              <p className="text-[10px] font-semibold text-white/55 uppercase tracking-wider">Manage Plan</p>

              {/* Upgrade/Downgrade buttons */}
              <div className="space-y-2">
                  {userTier === 'basic' && (
                  <button
                    onClick={() => { setConfirmAction('change'); setPendingTier('pro'); }}
                    disabled={subLoading}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-pro/10 border border-pro/20 text-pro hover:bg-pro/20 transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowUp className="size-4" />
                      <span className="text-xs font-semibold">Upgrade to Pro — $29.99 one-time</span>
                    </div>
                    <span className="text-[10px] text-pro/70">Lifetime access</span>
                  </button>
                )}

                {userTier === 'pro' && (
                  <button
                    onClick={() => { setConfirmAction('change'); setPendingTier('ultimate'); }}
                    disabled={subLoading}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowUp className="size-4" />
                      <span className="text-xs font-semibold">Upgrade to Ultimate — $59.99 one-time</span>
                    </div>
                    <span className="text-[10px] text-accent/70">Lifetime access</span>
                  </button>
                )}

                {userTier === 'ultimate' && (
                  <button
                    onClick={() => { setConfirmAction('change'); setPendingTier('pro'); }}
                    disabled={subLoading}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-pro/10 border border-pro/20 text-pro hover:bg-pro/20 transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowDown className="size-4" />
                      <span className="text-xs font-semibold">Downgrade to Pro</span>
                    </div>
                    <span className="text-[10px] text-pro/70">Changes apply immediately</span>
                  </button>
                )}

                {userTier === 'pro' && (
                  <button
                    onClick={() => { setConfirmAction('change'); setPendingTier('basic'); }}
                    disabled={subLoading}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowDown className="size-4" />
                      <span className="text-xs font-semibold">Downgrade to Standard</span>
                    </div>
                    <span className="text-[10px] text-accent/70">Changes apply immediately</span>
                  </button>
                )}

                {/* Contact support for changes */}
                <a
                  href="https://discord.gg/ssQXKzA2HU"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/[0.09] text-white/55 hover:text-white/70 hover:border-white/[0.15] transition-all"
                >
                  <MessageCircle className="size-4" />
                  <span className="text-xs font-semibold">Need help? Contact support on Discord</span>
                </a>
              </div>

              {/* Subscription action messages */}
              {subError && (
                <div className="border border-red-800/50 bg-red-900/15 px-3 py-2 rounded-lg text-xs text-red-400">{subError}</div>
              )}
              {subSuccess && (
                <div className="border border-accent/30 bg-accent/10 px-3 py-2 rounded-lg text-xs text-accent">{subSuccess}</div>
              )}
              {subLoading && (
                <div className="flex items-center gap-2 text-xs text-white/65">
                  <Loader2 className="size-3.5 animate-spin" />
                  Processing...
                </div>
              )}
            </div>
          </>
        )}

        {/* Sync button for free tier users who just purchased */}
        {userTier === 'free' && (
          <button
            onClick={async () => {
              setSubLoading(true);
              await refreshTier();
              setSubLoading(false);
            }}
            disabled={subLoading}
            className="mt-3 flex items-center gap-2 text-xs text-accent hover:underline"
          >
            <RefreshCw className={`size-3.5 ${subLoading ? 'animate-spin' : ''}`} />
            {subLoading ? 'Checking...' : 'Sync purchase'}
          </button>
        )}
      </div>

      {/* Shop Section */}
      <div className="glass-panel rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart className="size-5 text-accent" />
          <h2 className="font-display text-lg font-bold text-white">Shop</h2>
        </div>
        <p className="text-xs text-white/55 mb-5">Purchase tiers and unlock all Horizon Tweaks features.</p>

        {/* Current Plan */}
        <div className="flex items-center gap-3 bg-white/[0.05] border border-white/[0.09] rounded-xl px-4 py-3 mb-5">
          <Crown className={`size-5 ${userTier === 'ultimate' ? 'text-stone-300' : userTier === 'pro' ? 'text-stone-300' : userTier === 'basic' ? 'text-stone-300' : 'text-white/55'}`} />
          <div>
            <span className="text-[10px] text-white/55">Current Plan</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase ${tier.color}`}>{tier.label}</span>
              {userTier === 'free' && (
                <Link href="/pricing" className="text-[10px] font-semibold text-accent hover:underline">
                  View pricing
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Quick Plan Compare */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {['basic', 'pro', 'ultimate'].map((tierId) => {
            const isCurrent = userTier === tierId;
            const features = tierFeatures[tierId] || [];
            return (
              <div key={tierId} className={`relative border rounded-xl p-4 ${isCurrent ? 'border-accent/30 bg-accent/[0.02]' : 'border-white/[0.09] bg-white/[0.08]'}`}>
                {isCurrent && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">Current</span>
                )}
                <span className={`text-xs font-bold ${tierId === 'basic' ? 'text-accent' : tierId === 'pro' ? 'text-pro' : 'text-accent'}`}>
                  {tierId === 'basic' ? 'Basic — $14.99' : tierId === 'pro' ? 'Pro — $29.99' : 'Ultimate — $59.99'}
                </span>
                <span className="text-[10px] text-white/55 ml-1.5">one-time</span>
                <ul className="mt-3 space-y-1.5">
                  {features.slice(0, 5).map((f, i) => (
                    <li key={i} className={`flex items-start gap-1.5 text-[10px] ${f.ok ? 'text-white/60' : 'text-white/45'}`}>
                      {f.ok ? (
                        <Check className="size-3 mt-0.5 shrink-0 text-accent" />
                      ) : (
                        <X className="size-3 mt-0.5 shrink-0 text-white/45" />
                      )}
                      {f.text}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Link
                    href="/pricing"
                    className={`mt-4 w-full py-2 rounded-lg text-[10px] font-bold text-center block transition-all ${
                      tierId === 'basic'
                        ? 'bg-accent text-black hover:bg-accent-dark'
                        : tierId === 'pro'
                          ? 'bg-white text-black hover:bg-white/90'
                          : 'bg-gold text-black hover:bg-gold/90'
                    }`}
                  >
                    Buy {tierId === 'basic' ? 'Basic' : tierId === 'pro' ? 'Pro' : 'Ultimate'} — {tierId === 'basic' ? '$14.99' : tierId === 'pro' ? '$29.99' : '$59.99'}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Terms & Cancellation */}
        <div className="space-y-2.5 bg-white/[0.08] border border-white/[0.09] rounded-xl p-4">
          <div className="flex items-center gap-1.5">
            <Shield className="size-3.5 text-white/55" />
            <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Terms &amp; Cancellation</span>
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] text-white/55 leading-relaxed">
              <strong className="text-white/65">One-time purchase.</strong> Standard ($14.99), Pro ($29.99), and Ultimate ($59.99) — pay once, use forever. No recurring fees.
            </p>
            <p className="text-[10px] text-white/55 leading-relaxed">
              <strong className="text-white/65">Account-bound license.</strong> Your tier follows your account across devices.
            </p>
            <p className="text-[10px] text-white/55 leading-relaxed">
              <strong className="text-white/65">Need help?</strong> Contact us on Discord — we respond within 24 hours.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
            <MessageCircle className="size-3 text-white/45" />
            <a href="https://discord.gg/ssQXKzA2HU" target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent hover:underline">
              Join Discord for support
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="flex items-center gap-1.5 mt-4">
          <FileText className="size-3 text-white/45" />
          <span className="text-[9px] text-white/45">&copy; <ClientDate /> Horizon Tweaks. All rights reserved.</span>
        </div>
      </div>

      {/* Confirmation dialog overlay */}
      {renderConfirmDialog()}
    </div>
  );
}
