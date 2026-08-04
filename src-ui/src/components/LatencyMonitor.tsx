import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Activity, Wifi, Globe, Signal, AlertTriangle, TrendingUp, Clock, BarChart3, Target, Zap, History, RefreshCw } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface PingResult {
  host: string;
  latency_ms: number;
  packet_loss: number;
  timings: number[];
}

interface PingHistoryEntry {
  host: string;
  latency_ms: number;
  packet_loss: number;
  jitter: number;
  timestamp: number;
}

const PRESET_HOSTS = [
  { host: '8.8.8.8', label: 'Google DNS', region: 'Global' },
  { host: '1.1.1.1', label: 'Cloudflare DNS', region: 'Global' },
  { host: 'google.com', label: 'Google', region: 'Global' },
  { host: 'localhost', label: 'Localhost', region: 'Local' },
  { host: 'discord.gg', label: 'Discord', region: 'Voice' },
  { host: 'na.leagueoflegends.com', label: 'League', region: 'EUW' },
];

const GAME_SERVERS: Record<string, { host: string; region: string }> = {
  'Valorant': { host: 'na1.val.net', region: 'NA' },
  'CS2': { host: 'store.steampowered.com', region: 'Global' },
  'Fortnite': { host: 'epicgames.com', region: 'Global' },
  'Apex Legends': { host: 'ea.com', region: 'Global' },
  'League of Legends': { host: 'na.leagueoflegends.com', region: 'NA' },
  'Overwatch 2': { host: 'playoverwatch.com', region: 'Global' },
};

function computeJitter(timings: number[]): number {
  if (timings.length < 2) return 0;
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  return Math.sqrt(timings.reduce((a, b) => a + (b - avg) ** 2, 0) / timings.length);
}

function getQualityTier(ms: number, loss: number): { label: string; color: string; bgColor: string; desc: string } {
  if (loss >= 50) return { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', desc: 'High packet loss — connection unusable' };
  if (ms < 15) return { label: 'LAN Quality', color: 'text-steel-200', bgColor: 'bg-steel-600/20 border-steel-500/20', desc: 'LAN-level latency — ideal for all gaming' };
  if (ms < 30) return { label: 'Excellent', color: 'text-steel-200', bgColor: 'bg-steel-600/20 border-steel-500/20', desc: 'Suitable for competitive esports' };
  if (ms < 50) return { label: 'Good', color: 'text-steel-300', bgColor: 'bg-steel-700/20 border-steel-600/20', desc: 'Good for online gaming & streaming' };
  if (ms < 80) return { label: 'Fair', color: 'text-stone-300', bgColor: 'bg-stone-300/10 border-stone-300/20', desc: 'Acceptable for casual gaming' };
  if (ms < 150) return { label: 'Poor', color: 'text-stone-300', bgColor: 'bg-stone-300/10 border-stone-300/20', desc: 'Noticeable lag — browsing only' };
  return { label: 'Very Poor', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', desc: 'Unusable for real-time applications' };
}

export default function LatencyMonitor() {
  const [host, setHost] = useState('8.8.8.8');
  const [pinging, setPinging] = useState(false);
  const [result, setResult] = useState<PingResult | null>(null);
  const [pingCount, setPingCount] = useState(10);
  const [continuousMode, setContinuousMode] = useState(false);
  const [history, setHistory] = useState<PingHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const continuousRef = useRef(false);

  const doPing = useCallback(async (targetHost?: string, count?: number) => {
    setPinging(true);
    try {
      const res = await invoke<PingResult>('ping_host_continuous', { host: targetHost || host, count: count || pingCount });
      setResult(res);
      const jitter = computeJitter(res.timings);
      setHistory(prev => [...prev, { host: res.host, latency_ms: res.latency_ms, packet_loss: res.packet_loss, jitter, timestamp: Date.now() }].slice(-50));
    } catch {}
    setPinging(false);
  }, [host, pingCount]);

  const startContinuous = useCallback(() => {
    continuousRef.current = true;
    setContinuousMode(true);
    const loop = async () => {
      while (continuousRef.current) {
        await doPing();
        await new Promise(r => setTimeout(r, 3000));
      }
    };
    loop();
  }, [doPing]);

  const stopContinuous = () => {
    continuousRef.current = false;
    setContinuousMode(false);
  };

  useEffect(() => () => { continuousRef.current = false; }, []);

  const avgLat = result && result.timings.length > 0 ? result.timings.reduce((a, b) => a + b, 0) / result.timings.length : 0;
  const jitter = result ? computeJitter(result.timings) : 0;
  const quality = result ? getQualityTier(result.latency_ms, result.packet_loss) : null;
  const maxTiming = result ? Math.max(...result.timings, 1) : 1;

  // Percentile calculations
  const p95 = result?.timings ? [...result.timings].sort((a, b) => a - b)[Math.floor(result.timings.length * 0.95)] || 0 : 0;
  const p99 = result?.timings ? [...result.timings].sort((a, b) => a - b)[Math.floor(result.timings.length * 0.99)] || 0 : 0;

  // Gaming suitability
  const gamingRating = avgLat < 20 ? 'Esports Ready' : avgLat < 40 ? 'Competitive OK' : avgLat < 80 ? 'Casual OK' : avgLat < 120 ? 'High Latency' : 'Unplayable';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised border border-white/[0.06]">
          <Activity className="size-5 text-steel-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-steel-100">Latency Monitor</h1>
          <p className="text-xs text-steel-500 mt-0.5">Advanced network diagnostics & gaming latency analysis</p>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Target className="size-4 text-steel-400" />
          <span className="text-sm font-semibold text-steel-200">Target Configuration</span>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[9px] text-steel-600 uppercase tracking-wider font-semibold mb-1 block">Host / IP</label>
            <input type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="Host or IP" className="w-full glass-input" />
          </div>
          <div className="w-24">
            <label className="text-[9px] text-steel-600 uppercase tracking-wider font-semibold mb-1 block">Packets</label>
            <CustomSelect
              value={String(pingCount)}
              onChange={v => setPingCount(Number(v))}
              options={[5, 10, 20, 50, 100].map(n => ({ value: String(n), label: String(n) }))}
            />
          </div>
          <button onClick={() => doPing()} disabled={pinging || continuousMode} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-br from-steel-600 to-steel-700 border border-white/[0.06] text-steel-200 hover:from-steel-500 hover:to-steel-600 transition-all shadow-neo-raised-sm disabled:opacity-50">
            {pinging ? <Signal className="size-3.5 animate-pulse" /> : <Globe className="size-3.5" />}
            {pinging ? 'Pinging...' : 'Ping'}
          </button>
          {!continuousMode ? (
            <button onClick={startContinuous} disabled={pinging} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.04] border border-white/[0.06] text-steel-400 hover:bg-white/[0.06] hover:text-steel-300 transition-all disabled:opacity-50">
              <RefreshCw className="size-3.5" /> Continuous
            </button>
          ) : (
            <button onClick={stopContinuous} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
              <span className="size-2 bg-red-400 rounded-full animate-pulse" /> Stop
            </button>
          )}
        </div>

        {/* Presets */}
        <div>
          <label className="text-[9px] text-steel-600 uppercase tracking-wider font-semibold mb-1.5 block">Quick Targets</label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_HOSTS.map(p => (
              <button key={p.host} onClick={() => { setHost(p.host); doPing(p.host); }} disabled={pinging || continuousMode}
                className={`text-[9px] px-2.5 py-1.5 rounded-lg border transition-all ${host === p.host ? 'bg-steel-600/20 border-steel-500/30 text-steel-200' : 'border-white/[0.06] text-steel-500 hover:text-steel-300 hover:border-white/[0.1]'}`}>
                <span className="font-medium">{p.label}</span>
                <span className="text-steel-600 ml-1">{p.region}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Game Servers */}
        <div>
          <label className="text-[9px] text-steel-600 uppercase tracking-wider font-semibold mb-1.5 block">Game Servers</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(GAME_SERVERS).map(([game, srv]) => (
              <button key={game} onClick={() => { setHost(srv.host); doPing(srv.host); }} disabled={pinging || continuousMode}
                className="text-[9px] px-2.5 py-1.5 rounded-lg border border-white/[0.06] text-steel-500 hover:text-steel-300 hover:border-white/[0.1] transition-all">
                <span className="font-medium">{game}</span>
                <span className="text-steel-600 ml-1">{srv.region}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Quality Badge */}
          {quality && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${quality.bgColor}`}>
              <div className={`size-10 rounded-lg flex items-center justify-center ${quality.bgColor}`}>
                <Zap className={`size-5 ${quality.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${quality.color}`}>{quality.label}</span>
                  <span className="text-[9px] text-steel-500">to {result.host}</span>
                </div>
                <p className="text-[10px] text-steel-500">{quality.desc}</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-steel-500">Gaming Rating</div>
                <div className={`text-sm font-bold ${avgLat < 40 ? 'text-steel-200' : avgLat < 80 ? 'text-stone-300' : 'text-red-400'}`}>{gamingRating}</div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Latency', value: `${result.latency_ms.toFixed(1)}`, unit: 'ms', color: result.latency_ms < 30 ? 'text-steel-200' : result.latency_ms < 80 ? 'text-stone-300' : 'text-red-400' },
              { label: 'Jitter', value: `${jitter.toFixed(1)}`, unit: 'ms', color: jitter < 5 ? 'text-steel-200' : jitter < 15 ? 'text-stone-300' : 'text-red-400' },
              { label: 'P95', value: `${p95.toFixed(1)}`, unit: 'ms', color: p95 < 50 ? 'text-steel-200' : p95 < 100 ? 'text-stone-300' : 'text-red-400' },
              { label: 'Packet Loss', value: `${result.packet_loss.toFixed(0)}`, unit: '%', color: result.packet_loss === 0 ? 'text-steel-200' : result.packet_loss < 5 ? 'text-stone-300' : 'text-red-400' },
              { label: 'Packets', value: `${result.timings.length}`, unit: 'sent', color: 'text-steel-200' },
            ].map(s => (
              <div key={s.label} className="glass-card p-3">
                <div className="text-[9px] text-steel-600 uppercase tracking-wider font-semibold">{s.label}</div>
                <div className={`text-xl font-bold font-mono mt-0.5 ${s.color}`}>
                  {s.value}<span className="text-xs text-steel-600 ml-0.5 font-normal">{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Ping Timings Bar Chart */}
          {result.timings.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-steel-400" />
                  <span className="text-sm font-semibold text-steel-200">Packet Timing Distribution</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-steel-500">
                  <span>Min: {Math.min(...result.timings).toFixed(1)} ms</span>
                  <span>Avg: {avgLat.toFixed(1)} ms</span>
                  <span>Max: {Math.max(...result.timings).toFixed(1)} ms</span>
                </div>
              </div>
              <div className="flex items-end gap-[2px] h-36">
                {result.timings.map((t, i) => {
                  const h = maxTiming > 0 ? (t / maxTiming) * 100 : 0;
                  const color = t < 20 ? '#8b95a5' : t < 50 ? '#a8b2c4' : t < 100 ? '#d4a853' : '#c45050';
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                      <div className="text-[7px] text-steel-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{t.toFixed(0)}</div>
                      <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max(h, 2)}%`, backgroundColor: color, minHeight: '2px' }} />
                      <div className="text-[6px] text-steel-700">{i + 1}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sparkline SVG */}
          {result.timings.length > 1 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="size-4 text-steel-400" />
                <span className="text-sm font-semibold text-steel-200">Latency Trend</span>
              </div>
              {(() => {
                const minT = Math.min(...result.timings);
                const maxT = Math.max(...result.timings);
                const range = maxT - minT || 1;
                const scaled = result.timings.map((t, i) => ({
                  x: (i / (result.timings.length - 1)) * 100,
                  y: 100 - ((t - minT) / range) * 100,
                  value: t,
                }));
                const points = scaled.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
                const areaPoints = `0,100 ${points} 100,100`;
                return (
                  <div>
                    <svg viewBox="0 0 100 100" className="w-full h-28" preserveAspectRatio="none">
                      <polygon points={areaPoints} fill="rgba(139,149,165,0.08)" />
                      <polyline points={points} fill="none" stroke="#8b95a5" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      {scaled.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={p.value < 20 ? '#8b95a5' : p.value < 50 ? '#a8b2c4' : p.value < 100 ? '#d4a853' : '#c45050'} />
                      ))}
                    </svg>
                    <div className="flex justify-between text-[8px] text-steel-600 mt-1">
                      <span>Packet 1</span>
                      <span>Packet {result.timings.length}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Quality Classification */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="size-4 text-steel-400" />
              <span className="text-sm font-semibold text-steel-200">Gaming Suitability Guide</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {[
                { range: '<15ms', label: 'LAN Quality', use: 'Local server', color: 'text-steel-200' },
                { range: '<30ms', label: 'Esports', use: 'CS2, Valorant', color: 'text-steel-200' },
                { range: '30-50ms', label: 'Competitive', use: 'Apex, Fortnite', color: 'text-steel-300' },
                { range: '50-80ms', label: 'Casual', use: 'LoL, MMOs', color: 'text-stone-300' },
                { range: '80-150ms', label: 'High Latency', use: 'Turn-based', color: 'text-stone-300' },
                { range: '>150ms', label: 'Unplayable', use: 'Not recommended', color: 'text-red-400' },
              ].map((q, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                  <div className={`text-xs font-bold font-mono ${q.color}`}>{q.range}</div>
                  <div className="text-[9px] text-steel-400 font-medium mt-0.5">{q.label}</div>
                  <div className="text-[8px] text-steel-600">{q.use}</div>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          {history.length > 1 && (
            <div className="glass-card p-4">
              <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 w-full">
                <History className="size-4 text-steel-400" />
                <span className="text-sm font-semibold text-steel-200">Ping History</span>
                <span className="text-[9px] text-steel-600 ml-1">{history.length} entries</span>
                {showHistory ? <span className="ml-auto text-steel-500 text-xs">&#9650;</span> : <span className="ml-auto text-steel-500 text-xs">&#9660;</span>}
              </button>
              {showHistory && (
                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                  {history.slice().reverse().map((h, i) => (
                    <div key={i} className="flex items-center gap-3 text-[10px] py-1.5 border-b border-white/[0.03] last:border-0">
                      <Clock className="size-2.5 text-steel-600" />
                      <span className="text-steel-500 w-20 font-mono">{new Date(h.timestamp).toLocaleTimeString()}</span>
                      <span className="text-steel-400 flex-1 truncate">{h.host}</span>
                      <span className={`font-mono font-semibold w-16 text-right ${h.latency_ms < 30 ? 'text-steel-200' : h.latency_ms < 80 ? 'text-stone-300' : 'text-red-400'}`}>{h.latency_ms.toFixed(1)} ms</span>
                      <span className="text-steel-600 w-12 text-right">J:{h.jitter.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
