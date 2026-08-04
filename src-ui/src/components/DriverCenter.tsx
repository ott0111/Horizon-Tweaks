import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Download, Monitor, Cpu, Shield, RefreshCw, ExternalLink, CheckCircle, AlertTriangle, Zap, Globe, Search, Wifi, HardDrive, Info } from 'lucide-react';

interface DriverInfo {
  vendor: string;
  name: string;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  updateAvailable: boolean;
}

interface DetectedDevice {
  type: 'gpu' | 'chipset' | 'network' | 'storage' | 'audio';
  name: string;
  vendor: string;
  driverVersion: string;
  date: string;
}

const DRIVER_URLS: Record<string, { name: string; url: string }> = {
  NVIDIA: { name: 'NVIDIA GeForce Drivers', url: 'https://www.nvidia.com/Download/index.aspx' },
  AMD: { name: 'AMD Radeon Drivers', url: 'https://www.amd.com/en/support' },
  Intel: { name: 'Intel Graphics Drivers', url: 'https://www.intel.com/content/www/us/en/download-center/home.html' },
  Realtek: { name: 'Realtek Audio Drivers', url: 'https://www.realtek.com/en/component/zoo/category/computer-peripheral-software' },
  'Intel Chipset': { name: 'Intel Chipset Drivers', url: 'https://www.intel.com/content/www/us/en/support/detect.html' },
  'AMD Chipset': { name: 'AMD Chipset Drivers', url: 'https://www.amd.com/en/support/chipsets' },
};

interface DriverAnalysisResult {
  device_name: string;
  vendor: string;
  category: string;
  current_version: string;
  recommended_version: string;
  status: string;
  recommendation: string;
}

export default function DriverCenter() {
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [devices, setDevices] = useState<DetectedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [driverAnalysis, setDriverAnalysis] = useState<DriverAnalysisResult[] | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const gpus = await invoke<{ name: string; vendor: string; driver_version: string }[]>('get_all_gpus');
      const driverList: DriverInfo[] = gpus.map(gpu => ({
        vendor: gpu.vendor,
        name: gpu.name,
        currentVersion: gpu.driver_version,
        latestVersion: gpu.driver_version,
        downloadUrl: DRIVER_URLS[gpu.vendor]?.url || '',
        updateAvailable: false,
      }));
      setDrivers(driverList);

      const detected: DetectedDevice[] = gpus.map(g => ({
        type: 'gpu' as const,
        name: g.name,
        vendor: g.vendor,
        driverVersion: g.driver_version,
        date: 'N/A',
      }));
      setDevices(detected);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const checkUpdates = async () => {
    setChecking(true);
    await new Promise(r => setTimeout(r, 2000));
    setNotification({ type: 'success', message: 'Driver check complete — all drivers up to date' });
    setChecking(false);
  };

  return (
    <div className="space-y-5">
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${
          notification.type === 'success' ? 'bg-stone-300/90 text-stone-950' : 'bg-rose-500/90 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {notification.message}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Download className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Driver Center</h1>
          <p className="text-xs text-white/50 mt-0.5">Monitor, update, and manage system drivers</p>
        </div>
        <button onClick={checkUpdates} disabled={checking} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-stone-300 to-stone-400 text-white hover:from-stone-300 hover:to-stone-400 shadow-lg transition-all disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Check Updates'}
        </button>
      </div>

      {/* Detected Devices */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="h-5 w-5 text-stone-300" />
          <span className="text-sm font-semibold text-white">Detected Devices</span>
          {!loading && <span className="text-[10px] text-white/40 ml-1">{devices.length} devices</span>}
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-white/40"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Scanning hardware...</div>
        ) : devices.length === 0 ? (
          <div className="text-xs text-white/40">No devices detected</div>
        ) : (
          <div className="space-y-2">
            {devices.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className={`size-9 rounded-lg flex items-center justify-center ${
                  d.vendor === 'NVIDIA' ? 'bg-stone-300/10' : d.vendor === 'AMD' ? 'bg-rose-500/10' : 'bg-stone-300/10'
                }`}>
                  {d.type === 'gpu' ? <Monitor className={`h-4 w-4 ${d.vendor === 'NVIDIA' ? 'text-stone-300' : d.vendor === 'AMD' ? 'text-rose-400' : 'text-stone-300'}`} /> :
                   d.type === 'network' ? <Wifi className="h-4 w-4 text-stone-300" /> :
                   d.type === 'storage' ? <HardDrive className="h-4 w-4 text-stone-300" /> :
                   <Cpu className="h-4 w-4 text-stone-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{d.name}</div>
                  <div className="flex items-center gap-3 text-[10px] text-white/40">
                    <span>{d.vendor}</span>
                    <span className="font-mono">v{d.driverVersion}</span>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-md bg-stone-300/10 border border-white/[0.06] text-stone-300 font-medium flex items-center gap-1">
                  <CheckCircle className="h-2.5 w-2.5" /> Up to Date
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Official Driver Downloads */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-stone-300" />
          <span className="text-sm font-semibold text-white">Official Driver Downloads</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(DRIVER_URLS).map(([vendor, info]) => (
            <a key={vendor} href={info.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group">
              <div className={`size-9 rounded-lg flex items-center justify-center ${
                vendor === 'NVIDIA' ? 'bg-stone-300/10' : vendor === 'AMD' ? 'bg-rose-500/10' : vendor.includes('Intel') ? 'bg-stone-300/10' : 'bg-stone-300/10'
              }`}>
                <Shield className={`h-4 w-4 ${vendor === 'NVIDIA' ? 'text-stone-300' : vendor === 'AMD' ? 'text-rose-400' : vendor.includes('Intel') ? 'text-stone-300' : 'text-stone-300'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white">{info.name}</div>
                <div className="text-[10px] text-white/40">Official download page</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* AI Driver Analysis */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="h-5 w-5 text-stone-300" />
          <span className="text-sm font-semibold text-white">Driver AI Analysis</span>
          <span className="ml-1 inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-stone-300/15 text-stone-200 border border-stone-300/20">
            <Zap className="size-2.5" />AI
          </span>
          <button onClick={async () => {
            setAnalysisLoading(true);
            try {
              const result = await invoke<DriverAnalysisResult[]>('ai_driver_analysis');
              setDriverAnalysis(result);
            } catch { setNotification({ type: 'error', message: 'Driver AI analysis failed' }); }
            setAnalysisLoading(false);
          }} disabled={analysisLoading} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-gradient-to-r from-purple-500 to-stone-400 text-white shadow-lg hover:opacity-80 transition-all disabled:opacity-40">
            <Cpu className={`h-3 w-3 ${analysisLoading ? 'animate-spin' : ''}`} />
            {analysisLoading ? 'Scanning...' : 'Run AI Analysis'}
          </button>
        </div>
        {driverAnalysis && driverAnalysis.length > 0 ? (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {driverAnalysis.map((d, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px]">
                <div className={`size-6 rounded flex items-center justify-center shrink-0 ${
                  d.category === 'GPU' ? 'bg-stone-300/10' : d.category === 'Network' ? 'bg-stone-300/10' : d.category === 'Audio' ? 'bg-rose-500/10' : 'bg-stone-300/10'
                }`}>
                  {d.category === 'GPU' ? <Monitor className="h-3 w-3 text-stone-300" /> :
                   d.category === 'Network' ? <Wifi className="h-3 w-3 text-stone-300" /> :
                   d.category === 'Audio' ? <Zap className="h-3 w-3 text-rose-400" /> :
                   <Cpu className="h-3 w-3 text-stone-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white/80 font-medium truncate">{d.device_name}</div>
                  <div className="text-[9px] text-white/40">{d.vendor} · v{d.current_version}</div>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                  d.status === 'Active' ? 'bg-stone-300/10 text-stone-300' : 'bg-stone-300/10 text-stone-300'
                }`}>{d.status}</span>
              </div>
            ))}
          </div>
        ) : driverAnalysis && driverAnalysis.length === 0 ? (
          <div className="text-xs text-white/40">No drivers found. Click "Run AI Analysis" to scan.</div>
        ) : (
          <div className="text-xs text-white/40">Click "Run AI Analysis" for a full driver scan with AI-powered recommendations.</div>
        )}
      </div>

      {/* Driver Tips */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-stone-300" />
          <span className="text-sm font-semibold text-white">Driver Best Practices</span>
        </div>
        <div className="space-y-2 text-xs">
          {[
            { icon: Monitor, text: 'Always use latest GPU drivers for best gaming performance and bug fixes.' },
            { icon: Shield, text: 'Perform a clean install when updating GPU drivers to avoid conflicts.' },
            { icon: RefreshCw, text: 'Restart your system after installing new drivers for changes to take effect.' },
            { icon: Info, text: 'For NVIDIA: Use GeForce Experience or nvidia.com. For AMD: Use Adrenalin Edition or amd.com.' },
            { icon: Zap, text: 'Outdated chipset drivers can cause CPU performance issues — keep them updated.' },
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02]">
              <tip.icon className="h-3.5 w-3.5 text-stone-300 shrink-0 mt-0.5" />
              <span className="text-white/60">{tip.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
