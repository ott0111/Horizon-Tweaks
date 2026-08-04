import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Shield, ShieldCheck, ShieldAlert, Search, Zap, RotateCcw, CheckCircle, RotateCw, Settings, Cpu, Monitor, Lock, AlertTriangle } from 'lucide-react';

interface Tweak {
  id: string;
  name: string;
  description: string;
  category: string;
  risk: 'Low' | 'Medium' | 'High';
  rollbackable: boolean;
  requires_restart: boolean;
  applied?: boolean;
}

const GPU_VENDOR_TWEAKS: Record<string, string[]> = {
  NVIDIA: ['nvidia', 'reflex', 'profile inspector'],
  AMD: ['amd', 'anti-lag', 'fsr', 'radeon'],
};

const CATEGORY_ICONS: Record<string, typeof Cpu> = {
  Performance: Zap,
  CPU: Cpu,
  System: Cpu,
  Graphics: Monitor,
  Security: Lock,
};

const RISK_STYLES: Record<string, { border: string; bg: string; badge: string; icon: typeof Shield }> = {
  Low: { border: 'border-l-stone-300/60', bg: 'bg-white/[0.03]', badge: 'bg-stone-300/15 text-stone-300', icon: ShieldCheck },
  Medium: { border: 'border-l-blue-500/60', bg: 'bg-stone-300/5', badge: 'bg-stone-300/15 text-stone-300', icon: Shield },
  High: { border: 'border-l-rose-500/60', bg: 'bg-rose-500/5', badge: 'bg-rose-500/15 text-rose-400', icon: ShieldAlert },
};

export default function AdvancedTweaks({ gpuVendor }: { gpuVendor?: string | null }) {
  const [tweaks, setTweaks] = useState<Tweak[]>([]);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTweaks, setSelectedTweaks] = useState<Set<string>>(new Set());
  const [appliedTweaks, setAppliedTweaks] = useState<Set<string>>(new Set());
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());
  const [unapplying, setUnapplying] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const tweaksRef = useRef(tweaks);
  tweaksRef.current = tweaks;

  useEffect(() => {
    invoke<Tweak[]>('get_advanced_tweaks').then((loadedTweaks) => {
      setTweaks(loadedTweaks);
    });
    invoke<string[]>('get_applied_tweaks').then((applied) => {
      setAppliedTweaks(new Set(applied));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const isTweakCompatible = (tweak: Tweak): boolean => {
    if (!gpuVendor) return true;
    const lowerName = tweak.name.toLowerCase();
    const lowerDesc = tweak.description.toLowerCase();
    for (const [vendor, keywords] of Object.entries(GPU_VENDOR_TWEAKS)) {
      const hasVendorKeyword = keywords.some(k => lowerName.includes(k) || lowerDesc.includes(k));
      if (hasVendorKeyword) return vendor === gpuVendor;
    }
    return true;
  };

  const filteredTweaks = tweaks
    .filter(tweak => tweak.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(tweak => filter === 'All' || tweak.category === filter)
    .filter(isTweakCompatible);

  const categories = ['All', ...new Set(tweaks.map(t => t.category))];

  const toggleTweakSelection = (id: string) => {
    const newSelected = new Set(selectedTweaks);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedTweaks(newSelected);
  };

  const selectAll = () => setSelectedTweaks(new Set(filteredTweaks.map(t => t.id)));
  const deselectAll = () => setSelectedTweaks(new Set());

  const checkHighRiskCount = (tweakIds: string[]) =>
    tweakIds.filter(id => tweaks.find(t => t.id === id)?.risk === 'High').length;

  const applyTweaks = async (ids: string[]) => {
    setApplyingIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    try {
      for (const id of ids) {
        await invoke('apply_advanced_tweak', { tweakId: id, value: 'enabled' });
        setApplyingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        setAppliedTweaks(prev => { const n = new Set(prev); n.add(id); return n; });
      }
      setNotification({ type: 'success', message: `${ids.length} tweak(s) applied successfully` });
    } catch (error) {
      const msg = typeof error === 'string' ? error : 'Failed to apply advanced tweaks';
      setNotification({ type: 'error', message: msg });
      setApplyingIds(new Set());
    }
  };

  const handleUndoSingle = async (id: string) => {
    try {
      await invoke('reset_advanced_tweak', { tweakId: id });
      setAppliedTweaks(prev => { const n = new Set(prev); n.delete(id); return n; });
      setNotification({ type: 'success', message: 'Tweak reverted' });
    } catch (error) {
      const msg = typeof error === 'string' ? error : 'Revert failed';
      setNotification({ type: 'error', message: msg });
    }
  };

  const handleApplySelected = async () => {
    const ids = Array.from(selectedTweaks);
    await applyTweaks(ids);
    setSelectedTweaks(new Set());
  };

  const handleApplySingle = async (id: string) => {
    await applyTweaks([id]);
  };

  const handleUnapplyAll = async () => {
    setUnapplying(true);
    try {
      await invoke('reset_all_tweaks');
      setAppliedTweaks(new Set());
      setNotification({ type: 'success', message: 'All tweaks reset to defaults' });
    } catch (error) {
      const msg = typeof error === 'string' ? error : 'Unapply all failed';
      setNotification({ type: 'error', message: msg });
    }
    setUnapplying(false);
  };

  return (
    <div className="space-y-5">
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
        <Settings className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Advanced Tweaks</h1>
          <p className="text-xs text-white/50 mt-0.5">Deep system-level optimizations &mdash; handle with care</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <input
            type="text"
            placeholder="Search advanced tweaks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const Icon = cat !== 'All' ? CATEGORY_ICONS[cat] : null;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === cat
                    ? 'pill-button'
                    : 'border border-white/[0.06] bg-white/[0.03] text-white/40 hover:text-white hover:border-white/[0.12]'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {cat}
                <span className={`ml-1 ${filter === cat ? 'text-white/60' : 'text-white/20'}`}>
                  {cat === 'All' ? tweaks.length : tweaks.filter(t => t.category === cat).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-3">
          <button onClick={selectAll} className="text-xs text-white/40 hover:text-white transition-colors">Select All</button>
          <span className="text-white/20">|</span>
          <button onClick={deselectAll} className="text-xs text-white/40 hover:text-white transition-colors">Deselect</button>
          {selectedTweaks.size > 0 && (
            <>
              <span className="text-white/20">|</span>
              <span className="text-xs text-stone-300 font-medium">{selectedTweaks.size} selected</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleApplySelected}
            disabled={selectedTweaks.size === 0}
            className="pill-button hover:bg-stone-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap className="h-3.5 w-3.5" />
            Apply Selected ({selectedTweaks.size})
          </button>
          <button
            onClick={handleUnapplyAll}
            disabled={unapplying}
            className="flex items-center gap-1.5 border border-rose-500/40 px-4 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
          >
            {unapplying ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Unapply All
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {filteredTweaks.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-white/50 text-sm">No advanced tweaks match your filters</p>
          </div>
        )}
        {filteredTweaks.map((tweak) => {
          const applied = appliedTweaks.has(tweak.id);
          const riskStyle = RISK_STYLES[tweak.risk];
          const RiskIcon = riskStyle.icon;
          const CatIcon = CATEGORY_ICONS[tweak.category];
          const isApplying = applyingIds.has(tweak.id);
          const isSelected = selectedTweaks.has(tweak.id);

          return (
            <div
              key={tweak.id}
              onClick={() => toggleTweakSelection(tweak.id)}
              className={`group relative overflow-hidden transition-all cursor-pointer ${
                applied
                  ? 'glass-panel border-l-stone-300/60'
                  : isSelected
                    ? 'glass-panel border-white/[0.08]'
                    : 'glass-card hover:border-white/[0.12]'
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${
                applied ? 'bg-stone-300' : isSelected ? 'bg-stone-300/60' : 'bg-transparent group-hover:bg-white/[0.08]'
              }`} />

              <div className="flex items-start gap-4 p-4">
                <div className="pt-0.5">
                  <div className={`h-5 w-5 flex items-center justify-center transition-all rounded-md border-2 ${
                    isSelected
                      ? 'bg-stone-300 border-white/[0.06]'
                      : 'border-white/[0.15] group-hover:border-white/30'
                  }`}>
                    {isSelected && <CheckCircle className="h-3.5 w-3.5 text-black" />}
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl transition-all ${
                  applied
                    ? 'bg-stone-300/10'
                    : isSelected
                      ? 'bg-white/[0.03]'
                      : 'bg-white/[0.03] group-hover:bg-white/[0.06]'
                }`}>
                  {CatIcon && <CatIcon className={`h-5 w-5 ${applied ? 'text-stone-300' : 'text-white/40'}`} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`font-semibold ${applied ? 'text-stone-300' : 'text-white'}`}>
                      {tweak.name}
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full ${riskStyle.badge}`}>
                      <RiskIcon className="h-3 w-3" />
                      {tweak.risk}
                    </span>
                    {applied && (
                      <span className="flex items-center gap-1 text-[11px] text-stone-300 font-medium bg-stone-300/10 px-2 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3" />
                        Applied
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">{tweak.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] text-white/20 font-mono">{tweak.id}</span>
                    {tweak.rollbackable && (
                      <span className="flex items-center gap-1 text-[10px] text-white/40">
                        <RotateCcw className="h-3 w-3" />
                        Rollback supported
                      </span>
                    )}
                    {tweak.requires_restart && (
                      <span className="flex items-center gap-1 text-[10px] text-stone-300/60">
                        <RotateCw className="h-3 w-3" />
                        Restart required
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {applied ? (
                    <button
                      onClick={() => handleUndoSingle(tweak.id)}
                      className="px-3.5 py-2 text-xs font-medium border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                    >
                      Undo
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApplySingle(tweak.id)}
                      disabled={isApplying}
                      className="px-3.5 py-2 text-xs font-medium pill-button disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isApplying ? (
                        <span className="flex items-center gap-1.5">
                          <RotateCw className="h-3 w-3 animate-spin" />
                          Applying
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Zap className="h-3 w-3" />
                          Apply
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
