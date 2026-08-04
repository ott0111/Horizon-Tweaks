import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Shield, Search, Users, MessageSquare, BarChart3, RefreshCw, XCircle, CheckCircle, Filter, Ban, Percent, Plus, CreditCard, Activity, TrendingUp, TrendingDown, DollarSign, UserPlus, UserMinus, Clock, Eye, ChevronDown, ChevronUp, Download, ArrowUpRight, ArrowDownRight, KeyRound, Copy, Cpu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CustomSelect from './CustomSelect';

interface LogEntry { id?: string; user_id: string; log_type: string; source: string; message: string; stack?: string; timestamp: string; }
interface UserProfile { user_id: string; email: string; display_name: string; tier: string; created_at: string; suspended: boolean; }
interface FeedbackEntry { id?: string; user_id: string; subject: string; message: string; rating?: number; timestamp: string; resolved: boolean; }
interface DiscountCode { id?: string; code: string; discount_percent: number; max_uses: number; current_uses: number; created_by: string; created_at: string; expires_at?: string; active: boolean; description: string; }
interface DiscountUsage { id?: string; code: string; user_id: string; tier: string; original_amount: number; discount_amount: number; final_amount: number; subscription_id?: string; timestamp: string; }
interface Subscription { id?: string; uid: string; tier: string; status: string; provider?: string; created_at: string; updated_at: string; }
interface BusinessStats { total_users: number; tier_counts: Record<string, number>; total_logs: number; total_feedback: number; }

type Tab = 'overview' | 'users' | 'subscriptions' | 'logs' | 'feedback' | 'discounts' | 'license-keys';

const OLD_TIER_MAP: Record<string, string> = {
  prime: 'basic',
  apex: 'ultimate',
  isPrime: 'basic',
  isApex: 'ultimate',
  free: 'free',
  basic: 'basic',
  pro: 'pro',
  ultimate: 'ultimate',
  admin: 'admin',
};

const TIER_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  free: { bg: 'bg-white/[0.04]', text: 'text-steel-400', border: 'border-white/[0.06]', label: 'Free' },
  basic: { bg: 'bg-white/[0.06]', text: 'text-steel-300', border: 'border-white/[0.08]', label: 'Basic' },
  pro: { bg: 'bg-steel-600/15', text: 'text-steel-300', border: 'border-steel-500/20', label: 'Pro' },
  ultimate: { bg: 'bg-stone-300/10', text: 'text-stone-300', border: 'border-stone-300/20', label: 'Ultimate' },
  admin: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'Admin' },
};

function TierBadge({ tier }: { tier: string }) {
  const s = TIER_STYLES[tier] || TIER_STYLES.free;
  return <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${s.bg} ${s.text} border ${s.border}`}>{s.label}</span>;
}

function StatCard({ label, value, change, icon: Icon, color = 'text-steel-200' }: { label: string; value: string | number; change?: number; icon: any; color?: string }) {
  const isPositive = change !== undefined && change >= 0;
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] text-steel-600 uppercase tracking-wider font-semibold">{label}</span>
        <Icon className="size-3.5 text-steel-500" />
      </div>
      <div className="text-2xl font-bold font-mono text-steel-100">{value}</div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-[9px] font-medium ${isPositive ? 'text-steel-300' : 'text-red-400'}`}>
          {isPositive ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
          {Math.abs(change)}% from last period
        </div>
      )}
    </div>
  );
}

function MiniBarChart({ data, color = '#8b95a5', height = 48 }: { data: number[]; color?: string; height?: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm transition-all duration-300" style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: v > 0 ? '2px' : '0' }} />
      ))}
    </div>
  );
}

function FunnelChart({ stages }: { stages: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...stages.map(s => s.value), 1);
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const convRate = i > 0 ? stages[i - 1].value > 0 ? Math.round((s.value / stages[i - 1].value) * 100) : 0 : 100;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-[9px] text-steel-500 w-20 text-right shrink-0">{s.label}</span>
            <div className="flex-1 h-6 bg-white/[0.03] rounded-md overflow-hidden relative">
              <div className="h-full rounded-md transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: s.color }} />
              <span className="absolute inset-0 flex items-center px-2 text-[9px] font-mono text-steel-200 font-medium">{s.value.toLocaleString()}</span>
            </div>
            {i > 0 && <span className="text-[8px] text-steel-600 w-10 text-right shrink-0">{convRate}%</span>}
          </div>
        );
      })}
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: typeof Shield }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'logs', label: 'Logs', icon: Filter },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'discounts', label: 'Discounts', icon: Percent },
  { id: 'license-keys', label: 'License Keys', icon: KeyRound },
];

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('overview');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [discountUsage, setDiscountUsage] = useState<DiscountUsage[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState({ logType: '', source: '', userId: '' });
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [logSources, setLogSources] = useState<string[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [l, u, f, s, du, subs] = await Promise.all([
        invoke<LogEntry[]>('admin_get_logs', {}),
        invoke<UserProfile[]>('admin_get_users'),
        invoke<FeedbackEntry[]>('admin_get_feedback'),
        invoke<BusinessStats>('admin_get_stats'),
        invoke<DiscountUsage[]>('admin_get_discount_usage').catch(() => [] as DiscountUsage[]),
        invoke<Subscription[]>('admin_get_subscriptions').catch(() => [] as Subscription[]),
      ]);
      setLogs(l); setLogSources([...new Set(l.map(log => log.source).filter(Boolean))]);
      setUsers(u); setFeedback(f); setStats(s); setDiscountUsage(du); setSubscriptions(subs);
    } catch (e: any) { setError(typeof e === 'string' ? e : e?.message || 'Failed to load admin data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateTier = async (userId: string, newTier: string) => {
    try { await invoke('admin_update_user_tier', { userId, tier: newTier }); setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, tier: newTier } : u)); fetchAll(); }
    catch (e: any) { setError(typeof e === 'string' ? e : e?.message || 'Failed to update tier'); }
  };
  const resolveFeedback = async (feedbackId: string) => {
    try { await invoke('admin_mark_feedback_resolved', { feedbackId }); setFeedback(prev => prev.map(f => f.id === feedbackId ? { ...f, resolved: true } : f)); }
    catch (e: any) { setError(typeof e === 'string' ? e : e?.message || 'Failed to resolve feedback'); }
  };
  const suspendUser = async (userId: string, suspended: boolean) => {
    try { await invoke('admin_suspend_user', { userId, suspended }); setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, suspended } : u)); }
    catch (e: any) { setError(typeof e === 'string' ? e : e?.message || 'Failed to suspend user'); }
  };

  // Normalize old tier names in stats
  const normalizedTierCounts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [t, c] of Object.entries(stats?.tier_counts || {})) {
      const mapped = OLD_TIER_MAP[t] || 'free';
      result[mapped] = (result[mapped] || 0) + c;
    }
    return result;
  }, [stats?.tier_counts]);

  const normalizeTier = (t: string) => OLD_TIER_MAP[t] || 'free';

  // Computed analytics
  const activeSubs = useMemo(() => subscriptions.filter(s => s.status === 'ACTIVE' || s.status === 'active'), [subscriptions]);
  const revenue = useMemo(() => discountUsage.reduce((sum, d) => sum + d.final_amount, 0), [discountUsage]);
  const totalSaved = useMemo(() => discountUsage.reduce((sum, d) => sum + d.discount_amount, 0), [discountUsage]);
  const unresolvedFeedback = useMemo(() => feedback.filter(f => !f.resolved), [feedback]);
  const suspendedUsers = useMemo(() => users.filter(u => u.suspended), [users]);
  const avgRating = useMemo(() => { const rated = feedback.filter(f => f.rating); return rated.length > 0 ? (rated.reduce((s, f) => s + (f.rating || 0), 0) / rated.length).toFixed(1) : '—'; }, [feedback]);

  // Engagement data (simulated from real data)
  const dailySignups = useMemo(() => {
    const last7 = Array(7).fill(0);
    users.forEach(u => {
      if (u.created_at) {
        const d = new Date(u.created_at);
        const dayIdx = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (dayIdx >= 0 && dayIdx < 7) last7[6 - dayIdx]++;
      }
    });
    return last7;
  }, [users]);

  const filteredLogs = logs.filter(l => {
    if (logFilter.logType && l.log_type !== logFilter.logType) return false;
    if (logFilter.source && l.source !== logFilter.source) return false;
    if (logFilter.userId && !l.user_id.toLowerCase().includes(logFilter.userId.toLowerCase())) return false;
    return true;
  });

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.email.toLowerCase().includes(q) || u.display_name.toLowerCase().includes(q) || u.user_id.toLowerCase().includes(q);
  });

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'logs', label: 'Logs', icon: Filter },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare },
    { id: 'discounts', label: 'Discounts', icon: Percent },
    { id: 'license-keys', label: 'License Keys', icon: KeyRound },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised border border-white/[0.06]">
            <Shield className="size-5 text-steel-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-steel-100">Admin Dashboard</h1>
            <p className="text-xs text-steel-500 mt-0.5">SaaS analytics, user management & system monitoring</p>
          </div>
        </div>
        <button onClick={fetchAll} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] border border-white/[0.06] text-steel-400 hover:text-steel-200 hover:bg-white/[0.06] transition-all disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.02] rounded-xl border border-white/[0.04]">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all duration-200 ${tab === t.id ? 'bg-white/[0.06] text-steel-200 shadow-neo-raised-sm border border-white/[0.06]' : 'text-steel-600 hover:text-steel-400'}`}>
              <Icon className="h-3 w-3" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* === OVERVIEW TAB === */}
      {tab === 'overview' && stats && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Users" value={stats.total_users} change={12} icon={Users} />
            <StatCard label="Active Subs" value={activeSubs.length} change={8} icon={CreditCard} />
            <StatCard label="Revenue" value={`$${revenue.toFixed(0)}`} change={15} icon={DollarSign} />
            <StatCard label="Total Saved" value={`$${totalSaved.toFixed(0)}`} icon={TrendingDown} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Avg Rating" value={avgRating} icon={Eye} />
            <StatCard label="Unresolved" value={unresolvedFeedback.length} icon={MessageSquare} />
            <StatCard label="Suspended" value={suspendedUsers.length} icon={Ban} />
            <StatCard label="Error Logs" value={logs.filter(l => l.log_type === 'error').length} icon={Activity} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Signups */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-steel-200">User Signups (7 Days)</span>
                <span className="text-[9px] text-steel-600 font-mono">{dailySignups.reduce((a, b) => a + b, 0)} total</span>
              </div>
              <MiniBarChart data={dailySignups} color="#8b95a5" height={64} />
              <div className="flex justify-between text-[8px] text-steel-600 mt-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
              </div>
            </div>

            {/* Tier Distribution */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-steel-200">Tier Distribution</span>
              </div>
              <div className="space-y-2">
                {['free', 'basic', 'pro', 'ultimate', 'admin'].filter(t => (normalizedTierCounts[t] || 0) > 0).map(t => {
                  const c = normalizedTierCounts[t] || 0;
                  const s = TIER_STYLES[t] || TIER_STYLES.free;
                  const pct = stats.total_users > 0 ? Math.round((c / stats.total_users) * 100) : 0;
                  return (
                    <div key={t} className="flex items-center gap-2">
                      <span className={`text-[9px] font-medium w-12 capitalize ${s.text}`}>{t}</span>
                      <div className="flex-1 h-4 bg-white/[0.03] rounded-md overflow-hidden">
                        <div className="h-full rounded-md transition-all duration-700" style={{ width: `${pct}%`, background: t === 'ultimate' ? 'impulse-gradient(90deg, #d6d1ca88, #d6d1ca)' : t === 'admin' ? 'impulse-gradient(90deg, #f43f5e88, #f43f5e)' : 'rgba(148,163,184,0.3)' }} />
                      </div>
                      <span className="text-[9px] font-mono text-steel-400 w-8 text-right">{c}</span>
                      <span className="text-[8px] text-steel-600 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Subscription Funnel */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="size-4 text-steel-400" />
              <span className="text-xs font-semibold text-steel-200">Subscription Funnel</span>
            </div>
            <FunnelChart stages={[
              { label: 'Total Users', value: stats.total_users, color: '#4b5563' },
              { label: 'Free Tier', value: normalizedTierCounts.free || 0, color: '#6b7280' },
              { label: 'Standard', value: normalizedTierCounts.standard || 0, color: '#7e8a98' },
              { label: 'Pro', value: normalizedTierCounts.pro || 0, color: '#8b95a5' },
              { label: 'Ultimate', value: normalizedTierCounts.ultimate || 0, color: '#a8b2c4' },
              { label: 'Active Subs', value: activeSubs.length, color: '#c4cdd8' },
            ]} />
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="size-4 text-steel-400" />
              <span className="text-xs font-semibold text-steel-200">Recent Activity</span>
            </div>
            <div className="space-y-1.5">
              {logs.slice(0, 8).map((log, i) => (
                <div key={log.id || i} className="flex items-center gap-3 py-1.5 border-b border-white/[0.03] last:border-0 text-[10px]">
                  <span className={`font-semibold w-16 ${log.log_type === 'error' ? 'text-red-400' : log.log_type === 'tamper' ? 'text-stone-300' : 'text-steel-400'}`}>{log.log_type.toUpperCase()}</span>
                  <span className="text-steel-500 w-20 truncate">[{log.source}]</span>
                  <span className="text-steel-300 flex-1 truncate">{log.message}</span>
                  <span className="text-steel-600 shrink-0">{log.timestamp}</span>
                </div>
              ))}
              {logs.length === 0 && <p className="text-xs text-steel-600 text-center py-4">No activity yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* === USERS TAB === */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-steel-500" />
              <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." className="w-full pl-8 pr-3 py-2 text-xs bg-white/[0.03] border border-white/[0.06] rounded-xl text-steel-200 placeholder-steel-600 focus:outline-none focus:border-steel-500/40" />
            </div>
            <span className="text-[10px] text-steel-500">{filteredUsers.length} users</span>
          </div>
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.02] text-[9px] font-semibold text-steel-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3 border-b border-white/[0.04]">Email</th>
                  <th className="text-left p-3 border-b border-white/[0.04]">Name</th>
                  <th className="text-left p-3 border-b border-white/[0.04]">Tier</th>
                  <th className="text-center p-3 border-b border-white/[0.04]">Status</th>
                  <th className="text-center p-3 border-b border-white/[0.04]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredUsers.map(u => (
                  <tr key={u.user_id} className="hover:bg-white/[0.02] cursor-pointer" onClick={() => setSelectedUser(u)}>
                    <td className="p-3 text-steel-200">{u.email}</td>
                    <td className="p-3 text-steel-400">{u.display_name}</td>
                    <td className="p-3"><TierBadge tier={normalizeTier(u.tier)} /></td>
                    <td className="p-3 text-center">
                      {u.suspended ? <span className="text-[9px] font-semibold text-red-400">Suspended</span> : <span className="text-[9px] font-semibold text-steel-300">Active</span>}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {['free', 'basic', 'pro', 'ultimate', 'admin'].map(t => (
                          <button key={t} onClick={(e) => { e.stopPropagation(); updateTier(u.user_id, t); }} disabled={normalizeTier(u.tier) === t} className={`px-1.5 py-0.5 text-[8px] font-medium uppercase rounded border transition-colors ${normalizeTier(u.tier) === t ? 'border-steel-500/30 text-steel-300 bg-steel-600/10' : 'border-white/[0.06] text-steel-600 hover:text-steel-400'}`}>{t}</button>
                        ))}
                        <div className="w-px h-3 bg-white/[0.06] mx-0.5" />
                        <button onClick={(e) => { e.stopPropagation(); suspendUser(u.user_id, !u.suspended); }} className={`px-1.5 py-0.5 text-[8px] font-medium uppercase rounded border transition-colors ${u.suspended ? 'border-steel-600/30 text-steel-300 hover:bg-steel-600/10' : 'border-red-500/20 text-red-400/60 hover:bg-red-500/10'}`}>
                          <Ban className="inline size-2 mr-0.5" />{u.suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm('Permanently delete this user account? This cannot be undone.')) return;
                          try {
                            await invoke('admin_delete_user', { userId: u.user_id });
                            setUsers(prev => prev.filter(x => x.user_id !== u.user_id));
                            fetchAll(); // Refresh stats
                          } catch (e: any) {
                            setError(typeof e === 'string' ? e : e?.message || 'Failed to delete user');
                          }
                        }} className="px-1.5 py-0.5 text-[8px] font-medium uppercase rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors" title="Permanently delete">
                          <XCircle className="inline size-2 mr-0.5" />Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-steel-600">No users found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === SUBSCRIPTIONS TAB === */}
      {tab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Active" value={activeSubs.length} icon={CheckCircle} />
            <StatCard label="Cancelled" value={subscriptions.filter(s => s.status === 'CANCELLED' || s.status === 'cancelled').length} icon={XCircle} />
            <StatCard label="MRR" value={`$${(activeSubs.length * 9.99).toFixed(0)}`} icon={DollarSign} />
          </div>
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.02] text-[9px] font-semibold text-steel-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3 border-b border-white/[0.04]">User</th>
                  <th className="text-center p-3 border-b border-white/[0.04]">Plan</th>
                  <th className="text-center p-3 border-b border-white/[0.04]">Status</th>
                  <th className="text-center p-3 border-b border-white/[0.04]">Provider</th>
                  <th className="text-left p-3 border-b border-white/[0.04]">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {subscriptions.slice().reverse().map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="p-3 text-steel-300 font-mono text-[10px] truncate max-w-[140px]">{s.uid}</td>
                    <td className="p-3 text-center"><TierBadge tier={s.tier} /></td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-md ${s.status === 'ACTIVE' || s.status === 'active' ? 'bg-steel-600/15 text-steel-300 border border-steel-500/20' : 'bg-red-500/10 text-red-400/70 border border-red-500/15'}`}>{s.status}</span>
                    </td>
                    <td className="p-3 text-center text-[10px] text-steel-500">{s.provider || '—'}</td>
                    <td className="p-3 text-[10px] text-steel-500">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {subscriptions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-steel-600">No subscriptions</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === LOGS TAB === */}
      {tab === 'logs' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <CustomSelect
              value={logFilter.logType}
              onChange={v => setLogFilter(f => ({ ...f, logType: v }))}
              options={[
                { value: '', label: 'All Types' },
                { value: 'error', label: 'Error' },
                { value: 'warning', label: 'Warning' },
                { value: 'tamper', label: 'Tamper' },
              ]}
              className="min-w-[120px]"
            />
            <CustomSelect
              value={logFilter.source}
              onChange={v => setLogFilter(f => ({ ...f, source: v }))}
              options={[
                { value: '', label: 'All Sources' },
                ...logSources.map(s => ({ value: s, label: s })),
              ]}
              className="min-w-[140px]"
            />
            <input type="text" value={logFilter.userId} onChange={e => setLogFilter(f => ({ ...f, userId: e.target.value }))} placeholder="Filter by user ID..." className="px-2.5 py-1.5 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-steel-300 placeholder-steel-600 focus:outline-none flex-1 min-w-[160px]" />
            <span className="text-[10px] text-steel-600 self-center">{filteredLogs.length} entries</span>
          </div>
          <div className="glass-card max-h-[500px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <p className="p-6 text-center text-steel-600 text-xs">No logs match filters</p>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {filteredLogs.slice(0, 200).map((log, i) => (
                  <div key={log.id || i} className="px-3 py-2 text-[10px] hover:bg-white/[0.01]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-semibold ${log.log_type === 'error' ? 'text-red-400' : log.log_type === 'tamper' ? 'text-stone-300' : 'text-steel-400'}`}>{log.log_type.toUpperCase()}</span>
                      <span className="text-steel-500">[{log.source}]</span>
                      <span className="text-steel-600 ml-auto font-mono">{log.timestamp}</span>
                    </div>
                    <p className="text-steel-300 truncate">{log.message}</p>
                    {log.user_id && <p className="text-steel-600 mt-0.5 font-mono">User: {log.user_id}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === FEEDBACK TAB === */}
      {tab === 'feedback' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[10px] text-steel-500">
            <span>{feedback.length} total</span>
            <span className="text-stone-300">{unresolvedFeedback.length} unresolved</span>
            <span className="text-steel-300">Avg rating: {avgRating}</span>
          </div>
          {feedback.length === 0 ? (
            <div className="glass-card p-8 text-center text-steel-600 text-xs">No feedback submitted yet</div>
          ) : (
            feedback.slice().reverse().map(f => (
              <div key={f.id} className={`glass-card p-4 ${f.resolved ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-steel-200">{f.subject}</span>
                      {f.rating && <span className="text-[10px] text-steel-400">{'★'.repeat(Math.min(f.rating, 5))}</span>}
                      {f.resolved && <span className="text-[9px] text-steel-400 flex items-center gap-0.5"><CheckCircle className="size-2.5" /> Resolved</span>}
                    </div>
                    <p className="text-[10px] text-steel-500 mb-1.5">{f.message}</p>
                    <div className="flex items-center gap-2 text-[9px] text-steel-600">
                      <span className="font-mono">{f.user_id}</span>
                      <span>·</span>
                      <span>{f.timestamp}</span>
                    </div>
                  </div>
                  {!f.resolved && f.id && (
                    <button onClick={() => resolveFeedback(f.id!)} className="shrink-0 flex items-center gap-1 px-2 py-1 text-[9px] border border-steel-600/30 text-steel-400 rounded-lg hover:bg-white/[0.04] transition-colors">
                      <CheckCircle className="size-2.5" /> Resolve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* === DISCOUNTS TAB === */}
      {tab === 'discounts' && (
        <DiscountsTab discountUsage={discountUsage} />
      )}

      {/* === LICENSE KEYS TAB === */}
      {tab === 'license-keys' && (
        <LicenseKeysTab />
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="w-full max-w-lg glass-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-steel-600/15 border border-steel-500/20 flex items-center justify-center"><Users className="h-5 w-5 text-steel-300" /></div>
                <div><h2 className="text-sm font-bold text-steel-100">User Details</h2><p className="text-[10px] text-steel-500">Full profile information</p></div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-steel-500 hover:text-steel-300 text-lg leading-none">&times;</button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]"><p className="text-[9px] text-steel-600 uppercase font-semibold mb-1">User ID</p><p className="text-steel-300 font-mono text-[10px] break-all">{selectedUser.user_id}</p></div>
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]"><p className="text-[9px] text-steel-600 uppercase font-semibold mb-1">Created</p><p className="text-steel-400">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '—'}</p></div>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]"><p className="text-[9px] text-steel-600 uppercase font-semibold mb-1">Email</p><p className="text-steel-200">{selectedUser.email}</p></div>
              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]"><p className="text-[9px] text-steel-600 uppercase font-semibold mb-1">Display Name</p><p className="text-steel-200">{selectedUser.display_name || '—'}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]"><p className="text-[9px] text-steel-600 uppercase font-semibold mb-1">Tier</p><TierBadge tier={selectedUser.tier} /></div>
                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]"><p className="text-[9px] text-steel-600 uppercase font-semibold mb-1">Status</p>{selectedUser.suspended ? <span className="text-[10px] font-semibold text-red-400">Suspended</span> : <span className="text-[10px] font-semibold text-steel-300">Active</span>}</div>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <p className="text-[9px] text-steel-600 uppercase font-semibold mb-2">Recent Activity</p>
                {logs.filter(l => l.user_id === selectedUser.user_id).slice(0, 5).length === 0 ? <p className="text-steel-600 text-[10px]">No log entries</p> : (
                  <div className="space-y-1">
                    {logs.filter(l => l.user_id === selectedUser.user_id).slice(0, 5).map((log, i) => (
                      <div key={i} className="flex items-center gap-2 text-[9px]">
                        <span className={`font-semibold w-12 ${log.log_type === 'error' ? 'text-red-400' : log.log_type === 'tamper' ? 'text-stone-300' : 'text-steel-400'}`}>{log.log_type}</span>
                        <span className="text-steel-500 truncate flex-1">{log.message}</span>
                        <span className="text-steel-600">{log.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-4 pt-3 border-t border-white/[0.04]">
              <button onClick={() => setSelectedUser(null)} className="px-3 py-1.5 text-[10px] text-steel-400 hover:text-steel-200 border border-white/[0.06] rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── License Keys Sub-Tab ─── */
function LicenseKeysTab() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createCount, setCreateCount] = useState(10);
  const [createApp, setCreateApp] = useState('optimizer');
  const [createTier, setCreateTier] = useState('basic');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [appFilter, setAppFilter] = useState<string>('');

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<any[]>('admin_list_license_keys');
      setKeys(result || []);
    } catch (e: any) {
      setError(typeof e === 'string' ? e : 'Failed to load license keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const createBatch = async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('admin_create_license_key_batch', {
        count: createCount,
        app: createApp,
        tier: createApp === 'optimizer' ? createTier : null,
        createdBy: user?.email || 'admin',
      });
      setShowCreate(false);
      loadKeys();
    } catch (e: any) {
      setError(typeof e === 'string' ? e : 'Failed to create keys');
    } finally {
      setLoading(false);
    }
  };

  const reactivateKey = async (key: string) => {
    try {
      await invoke('admin_reactivate_license_key', { key });
      loadKeys();
    } catch (e: any) {
      setError(typeof e === 'string' ? e : 'Failed to reactivate key');
    }
  };

  const revokeKey = async (key: string) => {
    try {
      await invoke('admin_revoke_license_key', { key });
      loadKeys();
    } catch (e: any) {
      setError(typeof e === 'string' ? e : 'Failed to revoke key');
    }
  };

  const deleteKey = async (key: string) => {
    if (!confirm('Permanently delete this license key?')) return;
    try {
      await invoke('admin_delete_license_key', { key });
      loadKeys();
    } catch (e: any) {
      setError(typeof e === 'string' ? e : 'Failed to delete key');
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const appOptions = [
    { value: 'optimizer', label: 'Horizon Tweaks', group: 'Desktop Apps', color: 'text-stone-300' },
    { value: 'impulse-ping', label: 'Horizon Ping', group: 'Desktop Apps', color: 'text-stone-300' },
    { value: 'impulse-keyboard', label: 'Horizon Keyboard', group: 'Desktop Apps', color: 'text-stone-300' },
  ];

  const tierOptions = [
    { value: 'basic', label: 'Basic', color: 'border-white/[0.08] text-steel-300' },
    { value: 'pro', label: 'Pro', color: 'border-steel-500/30 text-steel-300' },
    { value: 'ultimate', label: 'Ultimate', color: 'border-stone-300/30 text-stone-300' },
  ];

  const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
    available: { bg: 'bg-steel-600/15', text: 'text-steel-300', border: 'border-steel-500/20' },
    assigned: { bg: 'bg-stone-300/10', text: 'text-stone-300', border: 'border-stone-300/20' },
    used: { bg: 'bg-stone-300/10', text: 'text-stone-300', border: 'border-stone-300/20' },
    revoked: { bg: 'bg-red-500/10', text: 'text-red-400/70', border: 'border-red-500/15' },
  };

  const filteredKeys = appFilter ? keys.filter(k => (k.app || 'optimizer') === appFilter) : keys;

  // Per-app stats
  const perAppStats = useMemo(() => {
    const stats: Record<string, { total: number; available: number; used: number; revoked: number }> = {};
    keys.forEach(k => {
      const app = k.app || 'optimizer';
      if (!stats[app]) stats[app] = { total: 0, available: 0, used: 0, revoked: 0 };
      stats[app].total++;
      if (k.status === 'available') stats[app].available++;
      else if (k.status === 'used') stats[app].used++;
      else if (k.status === 'revoked') stats[app].revoked++;
    });
    return stats;
  }, [keys]);

  const appLabel = (a: string) => appOptions.find(o => o.value === a)?.label || a;

  return (
    <div className="space-y-4">
      {/* Stats per app */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(perAppStats).map(([app, st]) => (
          <div key={app} className="glass-card px-3 py-2 flex items-center gap-3">
            <span className="text-[9px] font-semibold text-steel-400">{appLabel(app)}</span>
            <div className="flex items-center gap-2 text-[9px]">
              <span className="text-steel-300">{st.total} total</span>
              <span className="text-steel-500">·</span>
              <span className="text-steel-300">{st.available} avail</span>
              <span className="text-steel-500">·</span>
              <span className="text-stone-300">{st.used} used</span>
              <span className="text-steel-500">·</span>
              <span className="text-red-400/70">{st.revoked} rev</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-steel-500">
          <KeyRound className="size-3.5" />
          <span>{filteredKeys.length} keys{appFilter ? ` (${appLabel(appFilter)})` : ''}</span>
          <span className="text-steel-600">·</span>
          <span className="text-steel-300">{filteredKeys.filter(k => k.status === 'available').length} available</span>
          <span className="text-steel-600">·</span>
          <span className="text-stone-300">{filteredKeys.filter(k => k.status === 'used').length} used</span>
          <span className="text-steel-600">·</span>
          <span className="text-red-400/70">{filteredKeys.filter(k => k.status === 'revoked').length} revoked</span>

          {/* App filter */}
          <CustomSelect
            value={appFilter}
            onChange={v => setAppFilter(v)}
            options={[
              { value: '', label: 'All Apps' },
              ...appOptions,
            ]}
            className="ml-2 min-w-[120px]"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={loadKeys} disabled={loading} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] border border-white/[0.06] rounded-lg text-steel-500 hover:text-steel-300">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold bg-steel-600 text-white rounded-lg hover:bg-steel-500 transition-colors">
            <Plus className="h-3 w-3" /> Generate Keys
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300">&times;</button>
        </div>
      )}

      {showCreate && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-steel-200">Generate License Keys</h3>
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-[9px] text-steel-500 uppercase font-semibold tracking-wider mb-1 block">Count</label>
              <input
                type="number"
                value={createCount}
                onChange={e => setCreateCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                min={1}
                max={100}
                className="w-20 px-2.5 py-1.5 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-steel-200 focus:outline-none"
              />
            </div>
            <CustomSelect
              value={createApp}
              onChange={v => setCreateApp(v)}
              options={appOptions}
              className="min-w-[120px]"
            />
            {createApp === 'optimizer' && (
              <CustomSelect
                value={createTier}
                onChange={v => setCreateTier(v)}
                options={tierOptions}
                className="min-w-[90px]"
              />
            )}
            <button
              onClick={createBatch}
              disabled={loading}
              className="blue-button px-4 py-1.5 text-[10px] disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-[10px] text-steel-500 hover:text-steel-300 border border-white/[0.06] rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead className="bg-white/[0.02] text-[9px] font-semibold text-steel-500 uppercase tracking-wider">
            <tr>
              <th className="text-left p-3 border-b border-white/[0.04]">License Key</th>
              <th className="text-center p-3 border-b border-white/[0.04]">App</th>
              <th className="text-center p-3 border-b border-white/[0.04]">Tier</th>
              <th className="text-center p-3 border-b border-white/[0.04]">Status</th>
              <th className="text-left p-3 border-b border-white/[0.04]">Assigned To</th>
              <th className="text-center p-3 border-b border-white/[0.04]">Created</th>
              <th className="text-center p-3 border-b border-white/[0.04] min-w-[120px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filteredKeys.slice().reverse().map((k: any) => {
              const ss = statusStyles[k.status] || statusStyles.available;
              const canReactivate = k.status === 'used' || k.status === 'assigned' || k.status === 'revoked';
              const appName = appOptions.find(o => o.value === (k.app || 'optimizer'));
              return (
                <tr key={k.key} className={`hover:bg-white/[0.02] ${(k.status === 'used' || k.status === 'revoked') ? 'opacity-60' : ''}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono font-semibold text-steel-200 text-[10px] tracking-wider">{k.key}</code>
                      <button
                        onClick={() => handleCopyKey(k.key)}
                        className="p-1 rounded text-steel-600 hover:text-steel-400 transition-colors"
                        title="Copy key"
                      >
                        <Copy className="size-2.5" />
                      </button>
                      {copiedKey === k.key && (
                        <span className="text-[8px] text-stone-300">Copied!</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-[9px] font-medium ${appName?.color || 'text-steel-400'}`}>
                      {appName?.label || k.app || 'Optimizer'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {k.tier ? <TierBadge tier={k.tier} /> : <span className="text-steel-600">—</span>}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-md ${ss.bg} ${ss.text} border ${ss.border}`}>
                      {k.status}
                    </span>
                  </td>
                  <td className="p-3 text-steel-500 max-w-[140px] truncate">
                    {k.assignedEmail || k.assignedTo || '—'}
                  </td>
                  <td className="p-3 text-center text-steel-500">
                    {k.createdAt ? new Date(k.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {canReactivate ? (
                        <button onClick={() => reactivateKey(k.key)} className="px-1.5 py-0.5 text-[8px] font-medium rounded border border-white/[0.06] text-stone-300 hover:bg-stone-300/10 transition-colors" title="Reactivate">
                          ↻
                        </button>
                      ) : (
                        <span className="text-[8px] text-steel-600">—</span>
                      )}
                      <button onClick={() => revokeKey(k.key)} className="px-1.5 py-0.5 text-[8px] font-medium rounded border border-stone-300/20 text-stone-300 hover:bg-stone-300/10 transition-colors" title="Revoke">
                        ⊘
                      </button>
                      <button onClick={() => deleteKey(k.key)} className="px-1.5 py-0.5 text-[8px] font-medium rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors" title="Permanently delete">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredKeys.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-steel-600">
                  No license keys found{appFilter ? ` for ${appLabel(appFilter)}` : ''}. Generate some above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Discount Codes Sub-Tab ─── */
function DiscountsTab({ discountUsage }: { discountUsage: DiscountUsage[] }) {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', discountPercent: 15, maxUses: 100, description: '', expiresAt: '' });
  const [creating, setCreating] = useState(false);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    try { setCodes(await invoke<DiscountCode[]>('admin_list_discount_codes')); }
    catch { setError('Failed to load discount codes'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadCodes(); }, [loadCodes]);

  const toggleCode = async (id: string, active: boolean) => {
    try { await invoke('admin_toggle_discount_code', { codeId: id, active }); setCodes(prev => prev.map(c => c.id === id ? { ...c, active } : c)); }
    catch { setError('Failed to toggle code'); }
  };
  const createCode = async () => {
    if (!newCode.code.trim()) { setError('Code name is required'); return; }
    if (newCode.discountPercent < 1 || newCode.discountPercent > 100) { setError('Discount must be 1-100'); return; }
    if (newCode.maxUses < 1) { setError('Max uses must be at least 1'); return; }
    setCreating(true);
    setError(null);
    try {
      let expiresAt = newCode.expiresAt || null;
      if (expiresAt) expiresAt = new Date(expiresAt + 'T23:59:59Z').toISOString();
      await invoke('admin_create_discount_code', { code: newCode.code.toUpperCase(), discountPercent: newCode.discountPercent, maxUses: newCode.maxUses, description: newCode.description || `${newCode.discountPercent}% off`, createdBy: 'admin', expiresAt });
      setShowCreate(false); setNewCode({ code: '', discountPercent: 15, maxUses: 100, description: '', expiresAt: '' }); loadCodes();
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : e?.message || 'Unknown error';
      setError(msg);
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-steel-500">
          <Percent className="size-3.5" /> <span>{codes.length} codes</span>
        </div>
        <div className="flex gap-2">
          <button onClick={loadCodes} disabled={loading} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] border border-white/[0.06] rounded-lg text-steel-500 hover:text-steel-300">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold bg-steel-600 text-white rounded-lg hover:bg-steel-500 transition-colors">
            <Plus className="h-3 w-3" /> New Code
          </button>
        </div>
      </div>

      {error && <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">{error}</div>}
      {showCreate && (
        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] font-semibold text-steel-500 uppercase tracking-wider">Create Discount Code</span>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-[9px] text-steel-500 mb-0.5">Code Name</label>
              <input type="text" value={newCode.code} onChange={e => setNewCode(n => ({ ...n, code: e.target.value.toUpperCase() }))} placeholder="SUMMER25" className="w-full px-2.5 py-1.5 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-steel-200 placeholder-steel-600 font-mono uppercase focus:outline-none" />
            </div>
            <div>
              <label className="block text-[9px] text-steel-500 mb-0.5">% Off</label>
              <input type="number" value={newCode.discountPercent} onChange={e => setNewCode(n => ({ ...n, discountPercent: parseInt(e.target.value) || 0 }))} className="w-16 px-2.5 py-1.5 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-steel-200 focus:outline-none" min={1} max={100} />
            </div>
            <div>
              <label className="block text-[9px] text-steel-500 mb-0.5">Max Uses</label>
              <input type="number" value={newCode.maxUses} onChange={e => setNewCode(n => ({ ...n, maxUses: parseInt(e.target.value) || 1 }))} className="w-20 px-2.5 py-1.5 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-steel-200 focus:outline-none" min={1} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[9px] text-steel-500 mb-0.5">Description (optional)</label>
              <input type="text" value={newCode.description} onChange={e => setNewCode(n => ({ ...n, description: e.target.value }))} placeholder="Seasonal promotion" className="w-full px-2.5 py-1.5 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-steel-200 placeholder-steel-600 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[9px] text-steel-500 mb-0.5">Expires (optional)</label>
              <input type="date" value={newCode.expiresAt} onChange={e => setNewCode(n => ({ ...n, expiresAt: e.target.value }))} className="w-36 px-2.5 py-1.5 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-steel-200 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={createCode} disabled={creating} className="px-3 py-1.5 text-[10px] font-semibold bg-steel-600 text-white rounded-lg hover:bg-steel-500 disabled:opacity-50">{creating ? 'Creating...' : 'Create Code'}</button>
            <button onClick={() => { setShowCreate(false); setError(null); }} className="px-3 py-1.5 text-[10px] text-steel-500 hover:text-steel-300 border border-white/[0.06] rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead className="bg-white/[0.02] text-[9px] font-semibold text-steel-500 uppercase tracking-wider">
            <tr>
              <th className="text-left p-3 border-b border-white/[0.04]">Code</th>
              <th className="text-center p-3 border-b border-white/[0.04]">Discount</th>
              <th className="text-center p-3 border-b border-white/[0.04]">Uses</th>
              <th className="text-left p-3 border-b border-white/[0.04]">Description</th>
              <th className="text-center p-3 border-b border-white/[0.04]">Expires</th>
              <th className="text-center p-3 border-b border-white/[0.04]">Status</th>
              <th className="text-center p-3 border-b border-white/[0.04]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {codes.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.02]">
                <td className="p-3 font-mono font-semibold text-steel-200">{c.code}</td>
                <td className="p-3 text-center text-steel-300 font-bold">{c.discount_percent}%</td>
                <td className="p-3 text-center"><span className={c.current_uses >= c.max_uses ? 'text-red-400' : 'text-steel-400'}>{c.current_uses}/{c.max_uses}</span></td>
                <td className="p-3 text-steel-500 max-w-[200px] truncate">{c.description}</td>
                <td className="p-3 text-center text-steel-500">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                <td className="p-3 text-center"><span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-md ${c.active ? 'bg-steel-600/15 text-steel-300 border border-steel-500/20' : 'bg-red-500/10 text-red-400/60 border border-red-500/15'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                <td className="p-3 text-center">
                  {c.id && <button onClick={() => toggleCode(c.id!, !c.active)} className={`px-2 py-0.5 text-[9px] font-medium rounded-lg border transition-colors ${c.active ? 'border-red-500/20 text-red-400/60 hover:bg-red-500/10' : 'border-steel-600/30 text-steel-400 hover:bg-steel-600/10'}`}>{c.active ? 'Deactivate' : 'Activate'}</button>}
                </td>
              </tr>
            ))}
            {codes.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-steel-600">No discount codes created yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
