import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Wifi, WifiOff, RotateCcw, Radio, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface WifiNetwork {
  ssid: string;
  signal_percent: number;
  channel: number;
  security: string;
  bssid: string;
}

export default function WifiAnalyzer() {
  const { user } = useAuth();
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const scan = async () => {
    setScanning(true);
    try {
      const result = await invoke<WifiNetwork[]>('scan_wifi_networks');
      setNetworks(result);
      setNotification({ type: 'success', message: `Found ${result.length} network(s)` });
    } catch (e: any) {
      const msg = String(e);
      setNotification({ type: 'error', message: msg });
      invoke('log_frontend_error', {
        user_id: user?.user_id || '',
        source: 'wifi-analyzer',
        message: msg,
        stack: '',
      }).catch(() => {});
    }
    setScanning(false);
  };

  const signalBars = (pct: number) => {
    const filled = pct > 80 ? 5 : pct > 60 ? 4 : pct > 40 ? 3 : pct > 20 ? 2 : 1;
    return (
      <div className="flex items-end gap-0.5 h-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`w-1 ${i <= filled ? 'bg-stone-300' : 'bg-white/[0.06]'}`} style={{ height: `${(i / 5) * 100}%` }} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toast notification */}
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
        <Wifi className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Wi-Fi Analyzer</h1>
          <p className="text-xs text-white/50 mt-0.5">{networks.length} networks found</p>
        </div>
        <button onClick={scan} disabled={scanning} className="ml-auto pill-button">
          {scanning ? <RotateCcw className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />}
          {scanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {!networks.length && !scanning && (
        <div className="glass-card flex flex-col items-center justify-center h-48 gap-3">
          <WifiOff className="h-8 w-8 text-white/50" />
          <p className="text-xs text-white/50">Click Scan to find nearby Wi-Fi networks</p>
        </div>
      )}

      <div className="space-y-1.5">
        {networks.map((n, i) => (
          <div key={i} className="glass-card p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-stone-300" />
                <span className="font-semibold text-white">{n.ssid}</span>
              </div>
              {signalBars(n.signal_percent)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-white/50">
              <span>Signal: <span className={`font-mono ${n.signal_percent > 60 ? 'text-stone-300' : n.signal_percent > 30 ? 'text-stone-300' : 'text-red-400'}`}>{n.signal_percent}%</span></span>
              <span>Channel: <span className="font-mono text-white/40">{n.channel}</span></span>
              <span>Security: <span className="font-mono text-white/40">{n.security}</span></span>
              <span className="text-[9px] text-white/20 truncate">BSSID: {n.bssid}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
