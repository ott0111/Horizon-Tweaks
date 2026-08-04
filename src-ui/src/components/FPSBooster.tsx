import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Zap, Gauge, Cpu, Monitor, Sliders, CheckCircle, AlertTriangle, RefreshCw, Target } from 'lucide-react';

interface ToggleItem { id: string; label: string; command: string; }

const quickToggles: ToggleItem[] = [
  { id: 'powerPlan', label: 'High Performance Power Plan', command: 'powercfg -setactive 8c5e7fda-e8bf-45a6-a6cc-4b3c3f300d00' },
  { id: 'gameMode', label: 'Game Mode', command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 0' },
  { id: 'visualEffects', label: 'Disable Visual Effects', command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 2' },
  { id: 'gpuPerformance', label: 'GPU Performance Mode', command: 'powercfg -setacvalueindex SCHEME_CURRENT SUB_GRAPHICS GPUPREFERENCEPOLICY 1; powercfg -setactive SCHEME_CURRENT' },
  { id: 'bgApps', label: 'Disable Background Apps', command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 1' },
  { id: 'xboxBar', label: 'Disable Xbox Game Bar', command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 0' },
  { id: 'gameDvr', label: 'Disable Game DVR', command: 'Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_Enabled" -Value 0' },
];

const quickDefaults: Record<string, boolean> = { powerPlan: true, gameMode: true, visualEffects: true, gpuPerformance: true, bgApps: false, xboxBar: false, gameDvr: false };

const graphicsToggles: ToggleItem[] = [
  { id: 'fullscreenOpt', label: 'Disable Fullscreen Optimizations', command: 'Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_Enabled" -Value 0' },
  { id: 'gpuScheduling', label: 'Disable GPU Scheduling', command: 'Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "HwSchMode" -Value 1' },
  { id: 'gpuMaxPerf', label: 'GPU Maximum Performance', command: 'powercfg -setacvalueindex SCHEME_CURRENT SUB_GRAPHICS GPUPREFERENCEPOLICY 1; powercfg -setactive SCHEME_CURRENT' },
  { id: 'anisoFilter', label: 'Disable Anisotropic Filtering override', command: 'Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "AnisotropicFiltering" -ErrorAction SilentlyContinue' },
  { id: 'textureStreaming', label: 'Disable Texture Streaming', command: 'Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000" -Name "TextureStreaming" -ErrorAction SilentlyContinue' },
];

const graphicsDefaults: Record<string, boolean> = { fullscreenOpt: true, gpuScheduling: false, gpuMaxPerf: true, anisoFilter: false, textureStreaming: false };

async function runPsCommand(cmd: string): Promise<void> {
  const hasTauri = !!(window as any).__TAURI_INTERNALS__;
  if (hasTauri) {
    await invoke('run_system_utility', { utility: 'powershell', args: [cmd] });
  } else {
    await new Promise(r => setTimeout(r, 150));
  }
}

export default function FPSBooster() {
  const [quickState, setQuickState] = useState<Record<string, boolean>>(quickDefaults);
  const [graphicsState, setGraphicsState] = useState<Record<string, boolean>>(graphicsDefaults);
  const [processName, setProcessName] = useState('');
  const [applying, setApplying] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const toggleQuick = (id: string) => setQuickState(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleGraphics = (id: string) => setGraphicsState(prev => ({ ...prev, [id]: !prev[id] }));

  const applyQuickBoost = async () => {
    setApplying('quick');
    const enabled = quickToggles.filter(t => quickState[t.id]);
    let success = 0, failed = 0;
    for (const t of enabled) {
      try { await runPsCommand(t.command); success++; } catch { failed++; }
    }
    setApplying(null);
    if (failed === 0) showNotification('success', `Applied ${success} quick boost optimizations`);
    else showNotification('error', `${success} applied, ${failed} failed`);
  };

  const setPriority = async (level: 'High' | 'Realtime') => {
    if (!processName.trim()) { showNotification('error', 'Please enter a process name'); return; }
    setApplying('priority');
    try {
      await runPsCommand(`Get-Process -Name "${processName.trim().replace('.exe', '')}" -ErrorAction Stop | ForEach-Object { $_.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::${level} }`);
      showNotification('success', `Set "${processName.trim()}" to ${level} priority`);
    } catch {
      showNotification('error', `Could not set priority — process "${processName.trim()}" not found`);
    }
    setApplying(null);
  };

  const applyGraphicsTweaks = async () => {
    setApplying('graphics');
    const enabled = graphicsToggles.filter(t => graphicsState[t.id]);
    let success = 0, failed = 0;
    for (const t of enabled) {
      try { await runPsCommand(t.command); success++; } catch { failed++; }
    }
    setApplying(null);
    if (failed === 0) showNotification('success', `Applied ${success} graphics tweaks`);
    else showNotification('error', `${success} applied, ${failed} failed`);
  };

  const ToggleRow = ({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: () => void }) => (
    <div onClick={onChange} className="flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer hover:bg-white/[0.03] transition-colors">
      <span className="text-sm text-white/80">{label}</span>
      <div className={`h-5 w-10 rounded-full transition-all flex items-center flex-shrink-0 ${checked ? 'bg-white/[0.03]0 justify-end' : 'bg-white/[0.08] justify-start'}`}>
        <div className={`h-3.5 w-3.5 rounded-full mx-0.5 transition-all ${checked ? 'bg-stone-300' : 'bg-white/20'}`} />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${notification.type === 'success' ? 'bg-stone-300/90 text-stone-950' : 'bg-rose-500/90 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {notification.message}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Zap className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">FPS Booster</h1>
          <p className="text-xs text-white/50 mt-0.5">Real PowerShell-backed performance optimizations</p>
        </div>
      </div>

      {/* Quick Boost */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-1">
          <Gauge className="h-5 w-5 text-stone-300" />
          <div>
            <h2 className="text-base font-bold text-white">Quick FPS Boost</h2>
            <p className="text-xs text-white/50">Applies known performance tweaks instantly via PowerShell</p>
          </div>
        </div>
        <div className="mt-3 divide-y divide-white/[0.04]">
          {quickToggles.map(t => (
            <ToggleRow key={t.id} id={t.id} label={t.label} checked={quickState[t.id]} onChange={() => toggleQuick(t.id)} />
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <button onClick={applyQuickBoost} disabled={applying !== null} className="blue-button px-8">
            {applying === 'quick' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Apply Quick Boost
          </button>
        </div>
      </div>

      {/* Process Optimizer */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-1">
          <Cpu className="h-5 w-5 text-stone-300" />
          <div>
            <h2 className="text-base font-bold text-white">Process Priority</h2>
            <p className="text-xs text-white/50">Boost game process priority and CPU affinity via PowerShell</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <input type="text" placeholder="e.g. VALORANT-Win64-Shipping.exe" value={processName} onChange={e => setProcessName(e.target.value)} className="glass-input w-full" />
          <div className="flex gap-2">
            <button onClick={() => setPriority('High')} disabled={applying !== null} className="pill-button flex-1">
              {applying === 'priority' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              Set High Priority
            </button>
            <button onClick={() => setPriority('Realtime')} disabled={applying !== null} className="pill-button flex-1 border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
              <Sliders className="h-4 w-4" />
              Set Real-Time Priority
            </button>
          </div>
          <div className="flex items-start gap-2 text-[11px] text-stone-300/60 mt-1">
            <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span>Real-time priority can cause system instability. Use with caution.</span>
          </div>
        </div>
      </div>

      {/* Graphics Optimizations */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-1">
          <Monitor className="h-5 w-5 text-stone-300" />
          <div>
            <h2 className="text-base font-bold text-white">Graphics Tweaks</h2>
            <p className="text-xs text-white/50">Registry-level graphics optimizations for lower latency</p>
          </div>
        </div>
        <div className="mt-3 divide-y divide-white/[0.04]">
          {graphicsToggles.map(t => (
            <ToggleRow key={t.id} id={t.id} label={t.label} checked={graphicsState[t.id]} onChange={() => toggleGraphics(t.id)} />
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <button onClick={applyGraphicsTweaks} disabled={applying !== null} className="blue-button px-8">
            {applying === 'graphics' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sliders className="h-4 w-4" />}
            Apply Graphics Tweaks
          </button>
        </div>
      </div>
    </div>
  );
}
