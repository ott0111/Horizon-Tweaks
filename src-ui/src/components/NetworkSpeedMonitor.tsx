import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Activity, Download, Upload, Wifi, RefreshCw, TrendingUp, Globe, Zap } from 'lucide-react';

interface NetworkSpeed {
  download_mbps: number;
  upload_mbps: number;
  download_bytes: number;
  upload_bytes: number;
  adapter_name: string;
  connection_type: string;
}

interface SpeedSample {
  timestamp: number;
  download: number;
  upload: number;
}

const HISTORY_KEY = 'horizon-speed-history';

function loadHistory(): SpeedSample[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveHistory(samples: SpeedSample[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(samples.slice(-200)));
  } catch {}
}

export default function NetworkSpeedMonitor() {
  const [currentSpeed, setCurrentSpeed] = useState<NetworkSpeed | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [history, setHistory] = useState<SpeedSample[]>(loadHistory);
  const [peakDownload, setPeakDownload] = useState(0);
  const [peakUpload, setPeakUpload] = useState(0);
  const [avgDownload, setAvgDownload] = useState(0);
  const [avgUpload, setAvgUpload] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const measureSpeed = useCallback(async () => {
    setMeasuring(true);
    try {
      const speed = await invoke<NetworkSpeed>('get_network_speed');
      setCurrentSpeed(speed);
      const sample: SpeedSample = {
        timestamp: Date.now(),
        download: speed.download_mbps,
        upload: speed.upload_mbps,
      };
      setHistory(prev => {
        const next = [...prev, sample].slice(-200);
        const dlAvg = next.reduce((a, s) => a + s.download, 0) / next.length;
        const ulAvg = next.reduce((a, s) => a + s.upload, 0) / next.length;
        setAvgDownload(dlAvg);
        setAvgUpload(ulAvg);
        setPeakDownload(p => Math.max(p, speed.download_mbps));
        setPeakUpload(p => Math.max(p, speed.upload_mbps));
        saveHistory(next);
        return next;
      });
    } catch (e) {
      console.error('Speed test failed:', e);
    }
    setMeasuring(false);
  }, []);

  useEffect(() => {
    measureSpeed();
    const interval = setInterval(measureSpeed, 30000);
    return () => clearInterval(interval);
  }, [measureSpeed]);

  // Handle canvas resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      // Trigger redraw by updating a dummy state
      setHistory(prev => [...prev]);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Draw the graph on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || history.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 8, right: 12, bottom: 20, left: 45 };
    const graphW = w - padding.left - padding.right;
    const graphH = h - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Find max value
    const maxVal = Math.max(
      ...history.map(s => s.download),
      ...history.map(s => s.upload),
      10
    ) * 1.2;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      const val = maxVal - (maxVal / 4) * i;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${val.toFixed(0)}`, padding.left - 6, y + 3);
    }

    // Unit label
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '8px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Mbps', padding.left - 6, padding.top - 2);

    // Draw download line
    ctx.beginPath();
    ctx.strokeStyle = '#8b95a5';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    history.forEach((sample, i) => {
      const x = padding.left + (i / (history.length - 1)) * graphW;
      const y = padding.top + graphH - (sample.download / maxVal) * graphH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Download fill
    const dlGrad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    dlGrad.addColorStop(0, 'rgba(139, 149, 165, 0.15)');
    dlGrad.addColorStop(1, 'rgba(139, 149, 165, 0.01)');
    ctx.fillStyle = dlGrad;
    ctx.lineTo(padding.left + graphW, h - padding.bottom);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Draw upload line
    ctx.beginPath();
    ctx.strokeStyle = '#6b7585';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    history.forEach((sample, i) => {
      const x = padding.left + (i / (history.length - 1)) * graphW;
      const y = padding.top + graphH - (sample.upload / maxVal) * graphH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Latest value dots
    if (history.length > 0) {
      const last = history[history.length - 1];
      const x = padding.left + graphW;
      
      const dlY = padding.top + graphH - (last.download / maxVal) * graphH;
      ctx.beginPath();
      ctx.arc(x, dlY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#8b95a5';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, dlY, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(139, 149, 165, 0.2)';
      ctx.fill();

      const ulY = padding.top + graphH - (last.upload / maxVal) * graphH;
      ctx.beginPath();
      ctx.arc(x, ulY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#6b7585';
      ctx.fill();
    }

    // X-axis time labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '8px Inter, sans-serif';
    ctx.textAlign = 'center';
    const labelCount = Math.min(history.length, 6);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (history.length - 1));
      const x = padding.left + (idx / (history.length - 1)) * graphW;
      const time = new Date(history[idx].timestamp);
      ctx.fillText(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), x, h - 4);
    }
  }, [history]);

  const speedColor = (mbps: number) => {
    if (mbps > 100) return 'text-steel-200';
    if (mbps > 50) return 'text-steel-300';
    if (mbps > 20) return 'text-steel-400';
    return 'text-steel-500';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised border border-white/[0.06]">
            <Activity className="size-5 text-steel-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-steel-100">Network Speed</h1>
            <p className="text-xs text-steel-500 mt-0.5">Live throughput monitoring &amp; speed testing</p>
          </div>
        </div>
        <button
          onClick={measureSpeed}
          disabled={measuring}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-br from-steel-600 to-steel-700 border border-white/[0.06] text-steel-200 hover:from-steel-500 hover:to-steel-600 transition-all shadow-neo-raised-sm disabled:opacity-50"
        >
          {measuring ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Zap className="size-3.5" />
          )}
          {measuring ? 'Testing...' : 'Speed Test'}
        </button>
      </div>

      {/* Speed Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Download className="size-3.5 text-chrome" />
            <span className="text-[10px] text-steel-500 font-medium">Download</span>
          </div>
          <div className={`text-2xl font-bold font-mono ${speedColor(currentSpeed?.download_mbps || 0)}`}>
            {currentSpeed?.download_mbps.toFixed(1) || '—'}
            <span className="text-xs text-steel-500 ml-1">Mbps</span>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="size-3.5 text-steel-400" />
            <span className="text-[10px] text-steel-500 font-medium">Upload (est.)</span>
          </div>
          <div className={`text-2xl font-bold font-mono ${speedColor(currentSpeed?.upload_mbps || 0)}`}>
            {currentSpeed?.upload_mbps.toFixed(1) || '—'}
            <span className="text-xs text-steel-500 ml-1">Mbps</span>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="size-3.5 text-steel-400" />
            <span className="text-[10px] text-steel-500 font-medium">Peak Download</span>
          </div>
          <div className="text-2xl font-bold font-mono text-steel-300">
            {peakDownload.toFixed(1)}
            <span className="text-xs text-steel-500 ml-1">Mbps</span>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="size-3.5 text-steel-400" />
            <span className="text-[10px] text-steel-500 font-medium">Adapter</span>
          </div>
          <div className="text-sm font-semibold text-steel-300 truncate">
            {currentSpeed?.adapter_name || '—'}
          </div>
          <div className="text-[9px] text-steel-600 mt-0.5">{currentSpeed?.connection_type || ''}</div>
        </div>
      </div>

      {/* Throughput Graph */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wifi className="size-4 text-steel-400" />
            <span className="text-sm font-semibold text-steel-200">Throughput History</span>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-chrome rounded" />
              <span className="text-steel-500">Download ({avgDownload.toFixed(1)} avg)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-steel-500 rounded" style={{ borderBottom: '1px dashed #6b7585' }} />
              <span className="text-steel-500">Upload ({avgUpload.toFixed(1)} avg)</span>
            </span>
          </div>
        </div>
        <div ref={containerRef} className="h-48 w-full">
          {history.length < 2 ? (
            <div className="flex items-center justify-center h-full text-steel-600 text-xs">
              <RefreshCw className="size-4 animate-spin mr-2" />
              Running initial speed test...
            </div>
          ) : (
            <canvas ref={canvasRef} className="w-full h-full" />
          )}
        </div>
      </div>

      {/* Speed History Log */}
      {history.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="size-4 text-steel-400" />
            <span className="text-sm font-semibold text-steel-200">Speed History</span>
            <span className="text-[9px] text-steel-600 ml-auto">{history.length} samples</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
            {[...history].reverse().slice(0, 20).map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] py-1 px-2 rounded-md bg-white/[0.02]">
                <span className="text-steel-500 font-mono w-20">
                  {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-steel-300 font-mono">↓ {s.download.toFixed(1)} Mbps</span>
                <span className="text-steel-500 font-mono">↑ {s.upload.toFixed(1)} Mbps</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Info */}
      {currentSpeed && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="size-4 text-steel-400" />
            <span className="text-sm font-semibold text-steel-200">Connection Details</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-steel-600">Adapter</span>
              <p className="text-steel-300 font-medium mt-0.5">{currentSpeed.adapter_name}</p>
            </div>
            <div>
              <span className="text-steel-600">Type</span>
              <p className="text-steel-300 font-medium mt-0.5">{currentSpeed.connection_type}</p>
            </div>
            <div>
              <span className="text-steel-600">Total Downloaded</span>
              <p className="text-steel-300 font-medium mt-0.5">{(currentSpeed.download_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB</p>
            </div>
            <div>
              <span className="text-steel-600">Total Uploaded</span>
              <p className="text-steel-300 font-medium mt-0.5">{(currentSpeed.upload_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
