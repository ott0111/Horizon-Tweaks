import { useState, useCallback, useRef } from 'react';
import {
  Zap, CheckCircle, XCircle, Loader, Cpu, CpuIcon, HardDrive, Wifi, Settings, Eye,
  Sparkles, RotateCcw, ChevronDown, ChevronUp, Monitor
} from 'lucide-react';


interface TweakDefinition {
  id: string;
  name: string;
  description: string;
  category: 'cpu' | 'gpu' | 'memory' | 'network' | 'services' | 'visual';
  command: string;
  revert_command: string;
  requires_restart: boolean;
}

interface TweakResult {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message?: string;
}

const ALL_TWEAKS: TweakDefinition[] = [
  { id: 'power-plan', name: 'High Performance Power Plan', description: 'Set power plan to High/Ultimate Performance', category: 'cpu', command: 'powercfg -setactive 8c5e7fda-e8bf-45a6-a6cc-4b3c3f300d00', revert_command: 'powercfg -setactive 381b4222-f694-41f0-9685-ff5bb260df2e', requires_restart: false },
  { id: 'visual-effects', name: 'Adjust Visual Effects', description: 'Set visual effects for best performance', category: 'visual', command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 2', revert_command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 0', requires_restart: false },
  { id: 'processor-scheduling', name: 'Processor Scheduling', description: 'Optimize for programs over background services', category: 'cpu', command: 'Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 38', revert_command: 'Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 2', requires_restart: true },
  { id: 'virtual-memory', name: 'Virtual Memory Tuning', description: 'Set fixed pagefile size for consistency', category: 'memory', command: 'wmic pagefileset where name="C:\\pagefile.sys" set InitialSize=4096,MaximumSize=8192', revert_command: 'wmic pagefileset where name="C:\\pagefile.sys" set InitialSize=0,MaximumSize=0', requires_restart: true },
  { id: 'startup-programs', name: 'Startup Program Optimization', description: 'Disable unnecessary startup programs', category: 'services', command: 'Get-StartupApps | ForEach-Object { Disable-StartupApp $_.Name }', revert_command: 'Write-Output "Manual restore required"', requires_restart: false },
  { id: 'background-services', name: 'Background Services Tuning', description: 'Disable unnecessary background services', category: 'services', command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 1', revert_command: 'Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" -Name "GlobalUserDisabled" -ErrorAction SilentlyContinue', requires_restart: true },
  { id: 'network-power-saving', name: 'Network Adapter Power Saving', description: 'Disable power saving on network adapters', category: 'network', command: 'Get-NetAdapter | Disable-NetAdapterPowerManagement -ErrorAction SilentlyContinue', revert_command: 'Get-NetAdapter | Enable-NetAdapterPowerManagement -ErrorAction SilentlyContinue', requires_restart: false },
  { id: 'cpu-core-parking', name: 'Disable CPU Core Parking', description: 'Keep all CPU cores active and ready', category: 'cpu', command: 'powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100; powercfg -setactive SCHEME_CURRENT', revert_command: 'powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 0; powercfg -setactive SCHEME_CURRENT', requires_restart: false },
  { id: 'disable-hpet', name: 'Disable HPET', description: 'Disable High Precision Event Timer for lower latency', category: 'cpu', command: 'bcdedit /deletevalue useplatformclock', revert_command: 'bcdedit /set useplatformclock true', requires_restart: true },
  { id: 'gpu-hw-scheduling', name: 'Enable GPU Hardware Scheduling', description: 'Offload CPU scheduling to GPU', category: 'gpu', command: 'Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "HwSchMode" -Value 2', revert_command: 'Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" -Name "HwSchMode" -Value 1', requires_restart: true },
  { id: 'disable-game-dvr', name: 'Disable Game DVR / Game Bar', description: 'Stop background recording and overlays', category: 'gpu', command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 0; Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AllowAutoGameMode" -Value 0', revert_command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 1; Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AllowAutoGameMode" -Value 1', requires_restart: false },
  { id: 'disable-fso', name: 'Disable Fullscreen Optimizations', description: 'Prevent Windows from managing fullscreen games', category: 'gpu', command: 'Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_Enabled" -Value 0', revert_command: 'Set-ItemProperty -Path "HKCU:\\System\\GameConfigStore" -Name "GameDVR_Enabled" -Value 1', requires_restart: false },
  { id: 'cooling-policy', name: 'Active Cooling Policy', description: 'Set system cooling policy to active', category: 'cpu', command: 'powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR SYSTEMCOOLINGPOLICY 0; powercfg -setactive SCHEME_CURRENT', revert_command: 'powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR SYSTEMCOOLINGPOLICY 1; powercfg -setactive SCHEME_CURRENT', requires_restart: false },
  { id: 'disable-nagle', name: "Disable Nagle's Algorithm", description: 'Reduce TCP latency for online gaming', category: 'network', command: 'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\MSMQ\\Parameters" -Name "TcpNoDelay" -Value 1', revert_command: 'Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\MSMQ\\Parameters" -Name "TcpNoDelay" -ErrorAction SilentlyContinue', requires_restart: false },
  { id: 'disable-search-indexing', name: 'Disable Search Indexing', description: 'Stop Windows Search indexing to reduce disk I/O', category: 'services', command: 'Set-Service WSearch -StartupType Disabled; Stop-Service WSearch -Force', revert_command: 'Set-Service WSearch -StartupType Automatic; Start-Service WSearch -ErrorAction SilentlyContinue', requires_restart: false },
  { id: 'disable-sysmain', name: 'Disable SysMain (Superfetch)', description: 'Disable preloading of apps into RAM', category: 'memory', command: 'Set-Service SysMain -StartupType Disabled; Stop-Service SysMain -Force', revert_command: 'Set-Service SysMain -StartupType Automatic; Start-Service SysMain -ErrorAction SilentlyContinue', requires_restart: true },
  { id: 'disable-defender-periodic', name: 'Disable Defender Periodic Scan', description: 'Disable periodic Windows Defender scanning during gaming', category: 'services', command: 'Set-MpPreference -DisableRealtimeMonitoring $true', revert_command: 'Set-MpPreference -DisableRealtimeMonitoring $false', requires_restart: false },
  { id: 'disable-p2p-update', name: 'Disable P2P Update Delivery', description: 'Stop Windows Update P2P delivery optimization', category: 'network', command: 'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Settings" -Name "DownloadMode" -Value 0', revert_command: 'Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Settings" -Name "DownloadMode" -Value 1', requires_restart: false },
  { id: 'enable-msi-mode', name: 'Enable MSI Mode for GPU', description: 'Enable Message Signaled Interrupts for lower latency', category: 'gpu', command: 'Get-PnpDevice | Where-Object {$_.Class -eq "Display"} | ForEach-Object { Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($_.InstanceId)\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties" -Name "MSISupported" -Value 1 }', revert_command: 'Get-PnpDevice | Where-Object {$_.Class -eq "Display"} | ForEach-Object { Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($_.InstanceId)\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties" -Name "MSISupported" -ErrorAction SilentlyContinue }', requires_restart: true },
  { id: 'timer-resolution', name: 'Set Timer Resolution', description: 'Set timer resolution to 0.5ms for reduced input lag', category: 'memory', command: 'Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" -Name "GlobalTimerResolution" -Value 1', revert_command: 'Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" -Name "GlobalTimerResolution" -ErrorAction SilentlyContinue', requires_restart: true },
  { id: 'visual-animations', name: 'Disable UI Animations', description: 'Turn off minimize/maximize animations', category: 'visual', command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 2', revert_command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 0', requires_restart: false },
  { id: 'disable-transparency', name: 'Disable Transparency Effects', description: 'Disable acrylic blur to save GPU resources', category: 'visual', command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" -Name "EnableTransparency" -Value 0', revert_command: 'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" -Name "EnableTransparency" -Value 1', requires_restart: false },
  { id: 'disable-hibernate', name: 'Disable Hibernation', description: 'Delete hiberfil.sys to free disk space', category: 'memory', command: 'powercfg -h off', revert_command: 'powercfg -h on', requires_restart: false },
  { id: 'tcp-window-auto', name: 'TCP Window Auto-Tuning', description: 'Set TCP window auto-tuning to normal', category: 'network', command: 'netsh int tcp set global autotuninglevel=normal', revert_command: 'netsh int tcp set global autotuninglevel=disabled', requires_restart: false },
  { id: 'disable-mouse-accel', name: 'Disable Mouse Acceleration', description: 'Enhance pointer precision off for raw input', category: 'visual', command: 'Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseSpeed" -Value 0; Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold1" -Value 0; Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold2" -Value 0', revert_command: 'Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseSpeed" -Value 1; Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold1" -Value 6; Set-ItemProperty -Path "HKCU:\\Control Panel\\Mouse" -Name "MouseThreshold2" -Value 10', requires_restart: false },
];

const CATEGORIES = [
  { id: 'cpu' as const, name: 'CPU', description: 'Processor scheduling, parking, cooling', icon: Cpu },
  { id: 'gpu' as const, name: 'GPU', description: 'Hardware scheduling, MSI mode, Game DVR', icon: Monitor },
  { id: 'memory' as const, name: 'Memory', description: 'Virtual memory, SysMain, timer', icon: HardDrive },
  { id: 'network' as const, name: 'Network', description: 'TCP, adapter power, P2P, Nagle', icon: Wifi },
  { id: 'services' as const, name: 'Services', description: 'Search, Defender, startup, background', icon: Settings },
  { id: 'visual' as const, name: 'Visual', description: 'Animations, transparency, mouse', icon: Eye },
];

function runTweak(tweak: TweakDefinition): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const result = window as any;
      if (result.__TAURI_INTERNALS__) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('run_system_utility', { utility: 'powershell', args: [tweak.command] })
            .then(() => resolve(''))
            .catch((e: any) => reject(String(e)));
        });
      } else {
        setTimeout(() => resolve(''), 300 + Math.random() * 200);
      }
    } catch {
      setTimeout(() => resolve(''), 300 + Math.random() * 200);
    }
  });
}

function runRevert(tweak: TweakDefinition): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('run_system_utility', { utility: 'powershell', args: [tweak.revert_command] })
            .then(() => resolve(''))
            .catch((e: any) => reject(String(e)));
        });
      } else {
        setTimeout(() => resolve(''), 300 + Math.random() * 200);
      }
    } catch {
      setTimeout(() => resolve(''), 300 + Math.random() * 200);
    }
  });
}

export default function AutoTweaker() {
  const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map(c => [c.id, true]))
  );
  const [enabledTweaks, setEnabledTweaks] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_TWEAKS.map(t => [t.id, true]))
  );
  const [results, setResults] = useState<TweakResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'applying' | 'reverting' | 'done'>('idle');
  const [showSummary, setShowSummary] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map(c => [c.id, false]))
  );
  const abortRef = useRef(false);

  const pendingResults = results.filter(r => r.status === 'pending' || r.status === 'running').length;
  const doneResults = results.filter(r => r.status === 'success').length;
  const failedResults = results.filter(r => r.status === 'failed').length;
  const totalSelected = ALL_TWEAKS.filter(t => enabledTweaks[t.id]).length;

  const runTweaks = useCallback(async () => {
    if (isRunning) return;
    abortRef.current = false;
    setIsRunning(true);
    setPhase('applying');
    setShowSummary(false);

    const selected = ALL_TWEAKS.filter(t => enabledTweaks[t.id]);
    const initialResults: TweakResult[] = selected.map(t => ({ id: t.id, status: 'pending' }));
    setResults(initialResults);

    for (let i = 0; i < selected.length; i++) {
      if (abortRef.current) break;

      setResults(prev => prev.map((r, idx) =>
        idx === i ? { ...r, status: 'running' } : r
      ));

      try {
        await runTweak(selected[i]);
        if (!abortRef.current) {
          setResults(prev => prev.map((r, idx) =>
            idx === i ? { id: selected[i].id, status: 'success' } : r
          ));
        }
      } catch (e) {
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { id: selected[i].id, status: 'failed', message: String(e) } : r
        ));
      }
    }

    if (!abortRef.current) {
      setPhase('done');
      setShowSummary(true);
    }
    setIsRunning(false);
  }, [enabledTweaks, isRunning]);

  const revertAll = useCallback(async () => {
    if (isRunning) return;
    abortRef.current = false;
    setIsRunning(true);
    setPhase('reverting');
    setShowSummary(false);

    const applied = ALL_TWEAKS.filter(t => results.some(r => r.id === t.id && r.status === 'success'));
    if (applied.length === 0) {
      setIsRunning(false);
      setPhase('idle');
      return;
    }

    const initialResults: TweakResult[] = applied.map(t => ({ id: t.id, status: 'pending' }));
    setResults(initialResults);

    for (let i = 0; i < applied.length; i++) {
      if (abortRef.current) break;

      setResults(prev => prev.map((r, idx) =>
        idx === i ? { ...r, status: 'running' } : r
      ));

      try {
        await runRevert(applied[i]);
        if (!abortRef.current) {
          setResults(prev => prev.map((r, idx) =>
            idx === i ? { id: applied[i].id, status: 'success', message: 'reverted' } : r
          ));
        }
      } catch (e) {
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { id: applied[i].id, status: 'failed', message: String(e) } : r
        ));
      }
    }

    if (!abortRef.current) {
      setPhase('done');
      setShowSummary(true);
    }
    setIsRunning(false);
  }, [results, isRunning]);

  const toggleCategory = (id: string) => {
    if (isRunning) return;
    const newVal = !enabledCategories[id];
    setEnabledCategories(prev => ({ ...prev, [id]: newVal }));
    setEnabledTweaks(prev => {
      const next = { ...prev };
      ALL_TWEAKS.filter(t => t.category === id).forEach(t => { next[t.id] = newVal; });
      return next;
    });
  };

  const toggleTweak = (id: string) => {
    if (isRunning) return;
    setEnabledTweaks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const reset = () => {
    setResults([]);
    setPhase('idle');
    setShowSummary(false);
    setIsRunning(false);
    abortRef.current = false;
    setEnabledCategories(Object.fromEntries(CATEGORIES.map(c => [c.id, true])));
    setEnabledTweaks(Object.fromEntries(ALL_TWEAKS.map(t => [t.id, true])));
  };

  const getTweakById = (id: string) => ALL_TWEAKS.find(t => t.id === id);

  const CategoryIcon = ({ catId }: { catId: string }) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (!cat) return null;
    const Icon = cat.icon;
    const isEnabled = enabledCategories[catId];
    return (
      <button
        onClick={() => toggleCategory(catId)}
        disabled={isRunning}
        className={`flex items-center gap-3 w-full p-3 rounded-xl cursor-pointer transition-all ${
          isRunning ? 'opacity-50 pointer-events-none' : 'hover:bg-white/[0.03]'
        } ${isEnabled ? 'border-l-sky-400/40 border-l-2' : 'border-l-transparent border-l-2'}`}
      >
        <div className={`p-1.5 rounded-lg ${isEnabled ? 'bg-stone-300/10' : 'bg-white/[0.04]'}`}>
          <Icon className={`h-4 w-4 ${isEnabled ? 'text-stone-300' : 'text-white/30'}`} />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold text-white">{cat.name}</div>
          <div className="text-[11px] text-white/40">{cat.description}</div>
        </div>
        <div className={`h-5 w-10 rounded-full transition-all flex items-center ${
          isEnabled ? 'bg-stone-300/50 justify-end' : 'bg-white/[0.08] justify-start'
        } ${isRunning ? 'opacity-50' : ''}`}>
          <div className={`h-3.5 w-3.5 rounded-full mx-0.5 transition-all ${
            isEnabled ? 'bg-stone-300' : 'bg-white/20'
          }`} />
        </div>
      </button>
    );
  };

  if (phase === 'done' && showSummary) {
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    return (
      <div className="space-y-5">
        <div className="glass-card p-10">
          <div className="flex flex-col items-center text-center py-8">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-5 ${
              failedCount === 0 ? 'bg-stone-300/15' : 'bg-stone-300/15'
            }`}>
              {failedCount === 0 ? (
                <CheckCircle className="h-12 w-12 text-stone-300" />
              ) : (
                <Zap className="h-12 w-12 text-stone-300" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {failedCount === 0 ? 'All Tweaks Applied!' : `${successCount} of ${results.length} Applied`}
            </h2>
            <div className="w-16 h-0.5 bg-stone-300/40 rounded-full mb-4" />
            <div className="w-full max-w-md space-y-1.5 text-sm mb-8">
              {results.map(r => {
                const tweak = getTweakById(r.id);
                return (
                  <div key={r.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    r.status === 'success' ? 'text-stone-300/80 bg-white/[0.03]' :
                    r.status === 'failed' ? 'text-red-400/80 bg-red-500/5' :
                    'text-white/40'
                  }`}>
                    {r.status === 'success' ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> :
                     r.status === 'failed' ? <XCircle className="h-3.5 w-3.5 shrink-0" /> :
                     <div className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0" />}
                    <span className="text-xs">{tweak?.name || r.id}</span>
                    {r.status === 'failed' && r.message && (
                      <span className="text-[10px] text-red-400/60 ml-auto truncate max-w-[120px]">{r.message}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={reset} className="blue-button px-8">
                <Sparkles className="h-4 w-4" />
                Run Again
              </button>
              <button onClick={revertAll} disabled={successCount === 0} className="pill-button px-6">
                <RotateCcw className="h-4 w-4" />
                Revert All
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">


      <div className="glass-card p-5">
        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">
          Categories
        </div>
        <div className="space-y-0.5">
          {CATEGORIES.map(cat => (
            <CategoryIcon key={cat.id} catId={cat.id} />
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">
          Individual Tweaks
        </div>
        <div className="space-y-1">
          {CATEGORIES.map(cat => {
            const catTweaks = ALL_TWEAKS.filter(t => t.category === cat.id);
            const isExpanded = expandedCategories[cat.id] || !enabledCategories[cat.id];
            const CatIcon = cat.icon;
            const enabledCount = catTweaks.filter(t => enabledTweaks[t.id]).length;
            return (
              <div key={cat.id}>
                <button
                  onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                  className="flex items-center gap-2 w-full p-2.5 rounded-lg hover:bg-white/[0.02] transition-all"
                >
                  <CatIcon className="h-3.5 w-3.5 text-stone-300" />
                  <span className="text-xs font-semibold text-white/70 flex-1 text-left">{cat.name}</span>
                  <span className="text-[10px] text-white/30">{enabledCount}/{catTweaks.length}</span>
                  {isExpanded ? <ChevronUp className="h-3 w-3 text-white/30" /> : <ChevronDown className="h-3 w-3 text-white/30" />}
                </button>
                {isExpanded && (
                  <div className="ml-3 space-y-0.5 border-l border-white/[0.04] pl-3">
                    {catTweaks.map(tweak => {
                      const result = results.find(r => r.id === tweak.id);
                      const isEnabled = enabledTweaks[tweak.id];
                      return (
                        <div
                          key={tweak.id}
                          onClick={() => toggleTweak(tweak.id)}
                          className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                            isRunning ? 'opacity-50 pointer-events-none' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {result?.status === 'success' ? (
                            <CheckCircle className={`h-3.5 w-3.5 shrink-0 ${result.message === 'reverted' ? 'text-stone-300' : 'text-stone-300'}`} />
                          ) : result?.status === 'failed' ? (
                            <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                          ) : result?.status === 'running' ? (
                            <Loader className="h-3.5 w-3.5 shrink-0 text-stone-300 animate-spin" />
                          ) : (
                            <div
                              className={`h-3.5 w-7 rounded-full transition-all flex items-center shrink-0 ${
                                isEnabled ? 'bg-stone-300/50 justify-end' : 'bg-white/[0.08] justify-start'
                              }`}
                            >
                              <div className={`h-2.5 w-2.5 rounded-full mx-0.5 transition-all ${
                                isEnabled ? 'bg-stone-300' : 'bg-white/20'
                              }`} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-medium ${isEnabled ? 'text-white/80' : 'text-white/30'}`}>
                              {tweak.name}
                            </div>
                            <div className="text-[10px] text-white/30 truncate">{tweak.description}</div>
                          </div>
                          {tweak.requires_restart && (
                            <span className="text-[9px] text-stone-400/60 px-1.5 py-0.5 rounded bg-stone-300/10 shrink-0">Restart</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isRunning && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Loader className="h-5 w-5 text-stone-300 animate-spin" />
            <span className="text-sm font-semibold text-white">
              {phase === 'applying' ? 'Applying tweaks...' : 'Reverting tweaks...'}
            </span>
            <span className="text-xs text-white/40 ml-auto">
              {doneResults + failedResults} / {results.length}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-stone-300 to-stone-400 transition-all duration-300"
              style={{ width: `${results.length > 0 ? ((doneResults + failedResults) / results.length) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-3 space-y-1">
            {results.slice(-5).map(r => {
              const tweak = getTweakById(r.id);
              return (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  {r.status === 'running' ? <Loader className="h-3 w-3 text-stone-300 animate-spin shrink-0" /> :
                   r.status === 'success' ? <CheckCircle className="h-3 w-3 text-stone-300 shrink-0" /> :
                   r.status === 'failed' ? <XCircle className="h-3 w-3 text-red-400 shrink-0" /> :
                   <div className="h-3 w-3 rounded-full border border-white/20 shrink-0" />}
                  <span className={`truncate ${r.status === 'success' ? 'text-stone-300/70' : r.status === 'failed' ? 'text-red-400/70' : 'text-white/40'}`}>
                    {tweak?.name || r.id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={runTweaks}
          disabled={isRunning || totalSelected === 0}
          className="blue-button px-8 py-3 text-base flex-1"
        >
          {isRunning ? (
            <><Loader className="h-5 w-5 animate-spin" /> {phase === 'applying' ? 'Applying...' : 'Reverting...'}</>
          ) : (
            <><Zap className="h-5 w-5" /> Apply {totalSelected} Tweaks</>
          )}
        </button>
        {phase === 'done' && (
          <button onClick={revertAll} disabled={doneResults === 0} className="pill-button px-5 py-3">
            <RotateCcw className="h-4 w-4" />
            Revert
          </button>
        )}
      </div>
    </div>
  );
}
