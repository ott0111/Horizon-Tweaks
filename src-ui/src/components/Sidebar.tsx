import { useState, useEffect } from 'react';
import {
  Activity, LogOut, MessageSquare, ShieldCheck, Construction, Cog,
  ChevronLeft, ChevronRight, Camera, Wifi, Gamepad2, Cpu, Shield,
  Sliders, Wrench, Zap, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTier } from '../hooks/useTier';
import { getFeaturesByCategory } from '../features/FeatureRegistry';
import type { FeatureDefinition } from '../features/FeatureRegistry';
import { invoke } from '@tauri-apps/api/core';

const CATEGORY_META: Record<string, { label: string; icon: any }> = {
  optimization: { label: 'Optimization', icon: Zap },
  analysis: { label: 'Analysis', icon: Activity },
  system: { label: 'System', icon: Cpu },
  documentation: { label: 'Docs', icon: Wrench },
  ai: { label: 'AI', icon: Sparkles },
};

const HARDCODED = ['dashboard', 'settings', 'feedback', 'admin-panel'];

export default function Sidebar({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const { user, logout, isAdmin } = useAuth();
  const { tier } = useTier();
  const [showComingSoon, setShowComingSoon] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState('');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem('user-avatar-url') || '');
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [avatarInput, setAvatarInput] = useState(avatarUrl);

  useEffect(() => {
    invoke<string>('get_app_version').then(setAppVersion).catch(() => setAppVersion('2.0.0'));
  }, []);
  useEffect(() => { localStorage.setItem('sidebar-collapsed', String(collapsed)); }, [collapsed]);

  const handleLogout = async () => { await logout(); };
  const handleNav = (id: string) => {
    if (id === 'game-profiles') { setShowComingSoon('Game Profiles'); return; }
    onChange(id);
  };

  const featuresByCat: Record<string, FeatureDefinition[]> = {};
  const catKeys = Object.keys(CATEGORY_META);
  for (const cat of catKeys) {
    const items = getFeaturesByCategory(cat).filter(f => !HARDCODED.includes(f.id) && f.standalone !== false);
    if (items.length > 0) featuresByCat[cat] = items;
  }

  const sidebarWidth = collapsed ? 'w-[60px]' : 'w-60';

  return (
    <aside className={`flex h-full flex-col border-r border-white/[0.05] bg-surface-950/90 backdrop-blur-sm ${sidebarWidth}`} style={{ transition: 'width 0.25s ease' }}>
      {showComingSoon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(10,11,14,0.8)' }} onClick={() => setShowComingSoon(null)}>
          <div className="glass-panel max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="size-12 rounded-xl bg-gradient-to-br from-steel-700 to-steel-800 flex items-center justify-center mx-auto mb-3 border border-white/[0.06]">
              <Construction className="size-5 text-steel-300" />
            </div>
            <h3 className="text-lg font-bold text-steel-100 mb-1">Under Development</h3>
            <p className="text-xs text-steel-400 mb-5">{showComingSoon} is coming soon.</p>
            <button onClick={() => setShowComingSoon(null)} className="pill-button w-full">Got it</button>
          </div>
        </div>
      )}

      <div className={`flex items-center border-b border-white/[0.05] ${collapsed ? 'flex-col px-2 py-3 gap-2 justify-center' : 'px-4 py-4 gap-3'}`}>
        {!collapsed ? (
          <>
            <img src="/app-icon.png" alt="Horizon Tweaks" className="size-10" />
            <div>
              <span className="text-base font-bold tracking-tight text-white font-display">Horizon Tweaks</span>
              <span className="text-[10px] text-steel-500 block -mt-0.5 font-medium">Tweaks</span>
            </div>
          </>
        ) : (
          <img src="/app-icon.png" alt="Horizon Tweaks" className="size-7" />
        )}
        <button onClick={() => setCollapsed(!collapsed)} className={`${collapsed ? 'mt-1' : 'ml-auto'} p-1 rounded-lg text-steel-500 hover:text-steel-300 hover:bg-white/[0.05] transition-all`}>
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      </div>

      {user && (
        <div className={`border-b border-white/[0.05] ${collapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
          <div className={`flex ${collapsed ? 'flex-col items-center' : 'items-center gap-2'}`}>
            <div className="relative group shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.display_name} className={`${collapsed ? 'size-8' : 'size-9'} rounded-full border-2 border-stone-300/30 object-cover`} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className={`${collapsed ? 'size-8' : 'size-9'} rounded-full bg-gradient-to-br from-stone-300/20 to-stone-400/5 border-2 border-stone-300/20 flex items-center justify-center`}>
                  <span className="text-sm font-bold text-stone-300 font-display">{(user.display_name || user.email || '?')[0].toUpperCase()}</span>
                </div>
              )}
              <button onClick={() => { setEditingAvatar(true); setAvatarInput(avatarUrl); }} className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="size-3 text-white" />
              </button>
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-steel-200 truncate">{user.display_name}</div>
                <div className={`text-[8px] font-semibold uppercase px-1 py-0.5 rounded mt-0.5 inline-block ${
                  tier === 'admin' ? 'bg-red-500/10 text-red-400' :
                  tier === 'ultimate' ? 'bg-stone-300/10 text-stone-300' :
                  tier === 'pro' ? 'bg-steel-600/20 text-steel-400' :
                  tier === 'basic' ? 'bg-white/[0.06] text-steel-500' :
                  'bg-white/[0.04] text-steel-500'
                }`}>{tier}</div>
              </div>
            )}
          </div>
          {editingAvatar && (
            <div className="mt-2 flex gap-1">
              <input type="text" value={avatarInput} onChange={(e) => setAvatarInput(e.target.value)} placeholder="Paste image URL..." className="flex-1 text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-steel-200 outline-none focus:border-stone-300/30" autoFocus />
              <button onClick={() => { setAvatarUrl(avatarInput); localStorage.setItem('user-avatar-url', avatarInput); setEditingAvatar(false); }} className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-stone-300/20 text-stone-300 hover:bg-stone-300/30">Save</button>
              <button onClick={() => setEditingAvatar(false)} className="px-2 py-1 text-[10px] rounded-lg bg-white/[0.04] text-steel-500 hover:text-steel-300">Cancel</button>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 h-0 min-h-0 overflow-y-auto pt-2 px-1.5 space-y-0.5">
        {isAdmin && (
          <NavItem icon={ShieldCheck} label="Admin Panel" id="admin-panel" active={active} collapsed={collapsed} onChange={onChange} color="#f43f5e" />
        )}

        <NavItem icon={Activity} label="Dashboard" id="dashboard" active={active} collapsed={collapsed} onChange={onChange} />

        {Object.entries(featuresByCat).map(([cat, items]) => {
          const meta = CATEGORY_META[cat];
          const CatIcon = meta?.icon || Wrench;
          return (
            <div key={cat} className="pt-2">
              {!collapsed && (
                <div className="flex items-center gap-1.5 px-3 py-1.5">
                  <CatIcon className="size-3 text-stone-300/60" />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-300/50">{meta?.label || cat}</span>
                </div>
              )}
              {items.map(item => (
                <NavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  id={item.id}
                  active={active}
                  collapsed={collapsed}
                  onChange={handleNav}
                />
              ))}
            </div>
          );
        })}

        <div className="pt-2">
          {!collapsed && (
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <Cog className="size-3 text-stone-300/60" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-300/50">App</span>
            </div>
          )}
          <NavItem icon={Cog} label="Settings" id="settings" active={active} collapsed={collapsed} onChange={onChange} />
          <NavItem icon={MessageSquare} label="Feedback" id="feedback" active={active} collapsed={collapsed} onChange={onChange} />
        </div>
      </nav>

      <div className={`border-t border-white/[0.05] px-2 pt-1 pb-2 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        <button onClick={handleLogout} className={`flex w-full items-center gap-2 ${collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'} text-[11px] font-medium rounded-lg text-steel-500 hover:text-red-400 hover:bg-red-500/10 transition-all`}>
          <LogOut className="size-3.5" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        {!collapsed && <div className="px-3 pt-1 text-[9px] text-steel-600">v{appVersion || '2.0.0'}</div>}
      </div>
    </aside>
  );
}

function NavItem({ icon: Icon, label, id, active, collapsed, onChange, color }: {
  icon: any; label: string; id: string; active: string; collapsed: boolean; onChange: (id: string) => void; color?: string;
}) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onChange(id)}
      className={`flex w-full items-center gap-2 ${collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'} text-[11px] font-medium rounded-lg transition-all ${
        isActive
          ? 'bg-white/[0.06] text-white border border-white/[0.06]'
          : 'text-steel-500 hover:bg-white/[0.03] hover:text-steel-300'
      }`}
    >
      <Icon className="size-3.5 shrink-0" style={color ? { color } : {}} />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}
