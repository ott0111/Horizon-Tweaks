import { useState } from 'react';
import { Radio, Cpu, Sliders, Gauge, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

interface TuningProfile {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
}

const PROFILES: TuningProfile[] = [
  { id: 'max-perf', name: 'Maximum Performance', description: 'Unlock all CPU cores, disable power saving, max frequency', icon: Cpu, color: 'text-stone-300' },
  { id: 'balanced', name: 'Balanced Tuning', description: 'Optimize CPU affinity and IRQ distribution for daily use', icon: Sliders, color: 'text-stone-300' },
  { id: 'low-latency', name: 'Low Latency', description: 'Minimize interrupt handling latency, lock timer resolution', icon: Gauge, color: 'text-stone-300' },
  { id: 'power-save', name: 'Power Efficient', description: 'Reduce power draw while maintaining solid performance', icon: Radio, color: 'text-stone-300' },
];

export default function AdvancedTuning() {
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-5">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${
          notification.type === 'success' ? 'bg-stone-300/90 text-stone-950' : 'bg-rose-500/90 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {notification.message}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Radio className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Advanced Tuning</h1>
          <p className="text-xs text-white/50 mt-0.5">Ultimate — CPU affinity, IRQ tuning, power phase profiles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PROFILES.map((p) => {
          const Icon = p.icon;
          const active = activeProfile === p.id;
          return (
            <button key={p.id} onClick={() => {
              setActiveProfile(p.id);
              showNotification('success', `${p.name} profile activated`);
            }}
              className={`p-5 rounded-xl border text-left transition-all ${
                active
                  ? 'border-white/[0.06] bg-white/[0.03]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]'
              }`}
            >
              <div className={`size-10 rounded-xl ${active ? 'bg-stone-300/10' : 'bg-white/[0.04]'} flex items-center justify-center mb-3 border ${active ? 'border-white/[0.06]' : 'border-white/[0.06]'}`}>
                <Icon className={`h-5 w-5 ${p.color}`} />
              </div>
              <div className="text-base font-bold text-white mb-1">{p.name}</div>
              <div className="text-xs text-white/40">{p.description}</div>
              {active && (
                <div className="mt-3 flex items-center gap-1 text-[10px] text-stone-300">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="h-5 w-5 text-stone-300" />
          <span className="text-sm font-semibold text-white">CPU Affinity Controls</span>
        </div>
        <div className="text-xs text-white/50 mb-4">Manually configure which cores processes use. Drag to reorder priority.</div>
        <div className="space-y-2">
          {['Core 0-1 (Performance)', 'Core 2-3 (Efficiency)', 'Core 4-5 (Background)', 'Core 6-7 (IO)'].map((c, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-xs text-white/70">{c}</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((core) => (
                  <div key={core} className={`h-5 w-5 rounded flex items-center justify-center text-[8px] font-mono ${
                    core < 2 ? 'bg-stone-300/20 text-stone-300' :
                    core < 4 ? 'bg-stone-300/20 text-stone-300' :
                    core < 6 ? 'bg-stone-300/20 text-stone-300' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {core}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="h-5 w-5 text-stone-300" />
          <span className="text-sm font-semibold text-white">IRQ & Interrupt Tuning</span>
        </div>
        <div className="text-xs text-white/50 mb-3">Balance interrupt requests across CPU cores for reduced latency.</div>
        <button onClick={() => showNotification('success', 'IRQ affinity redistributed')} className="blue-button px-6">
          <Zap className="h-4 w-4" />
          Redistribute IRQs
        </button>
      </div>
    </div>
  );
}
