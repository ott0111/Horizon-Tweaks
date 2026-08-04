import { useState } from 'react';
import { Mic, Radio, Monitor, Volume2, Headphones, Settings, CheckCircle, AlertTriangle, Zap } from 'lucide-react';

export default function StreamerTools() {
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const setStreamerMode = (mode: string) => {
    showNotification('success', `Streamer mode: ${mode} activated`);
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
        <Mic className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Streamer Tools</h1>
          <p className="text-xs text-white/50 mt-0.5">Ultimate — Optimize your stream setup</p>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="h-5 w-5 text-stone-300" />
          <span className="text-sm font-semibold text-white">Streamer Mode</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'gaming', label: 'Gaming Focus', desc: 'Prioritize game performance over stream encoding', icon: Monitor },
            { id: 'streaming', label: 'Streaming Focus', desc: 'Balance game perf with high-quality stream encoding', icon: Headphones },
            { id: 'recording', label: 'Recording Optimized', desc: 'Maximize recording quality with minimal game impact', icon: Volume2 },
            { id: 'low-latency', label: 'Low Latency Mode', desc: 'Minimize audio/video latency for competitive streaming', icon: Settings },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setStreamerMode(m.id)}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all text-left"
              >
                <Icon className="h-5 w-5 text-stone-300 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white">{m.label}</div>
                  <div className="text-[10px] text-white/40">{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mic className="h-5 w-5 text-stone-300" />
          <span className="text-sm font-semibold text-white">Audio Optimization</span>
        </div>
        <div className="space-y-3">
          {[
            { id: 'bitrate', label: 'Optimize Audio Bitrate', desc: 'Set audio to best quality for streaming (320kbps)' },
            { id: 'exclusive', label: 'Exclusive Mode', desc: 'Enable exclusive device control for lower latency' },
            { id: 'noise', label: 'Noise Suppression', desc: 'Enable system-wide noise suppression' },
          ].map((opt) => (
            <button key={opt.id} onClick={() => showNotification('success', `${opt.label} applied`)}
              className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
            >
              <div>
                <div className="text-sm text-white/80">{opt.label}</div>
                <div className="text-[10px] text-white/40">{opt.desc}</div>
              </div>
              <Zap className="h-4 w-4 text-stone-300" />
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="h-5 w-5 text-stone-300" />
          <span className="text-sm font-semibold text-white">Overlay & Display</span>
        </div>
        <div className="text-xs text-white/50 mb-3">
          Optimize display capture and overlay rendering for streaming applications (OBS, Streamlabs, XSplit).
        </div>
        <button onClick={() => showNotification('success', 'Capture optimization applied')}
          className="blue-button px-6">
          <Zap className="h-4 w-4" />
          Optimize Display Capture
        </button>
      </div>
    </div>
  );
}
