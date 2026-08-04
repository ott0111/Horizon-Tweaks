import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Network, Globe, Zap, Wifi, RefreshCw, CheckCircle, XCircle,
  Activity, Wrench, Server, ToggleLeft, ToggleRight,
  Router, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import CustomSelect from './CustomSelect';

interface DnsProvider {
  name: string;
  primary: string;
  secondary: string;
}

interface NetworkSetting {
  id: string;
  name: string;
  description: string;
  current_value: string;
  recommended_value: string;
  category: string;
}

interface NetworkOptimizationResult {
  success: boolean;
  message: string;
  settings_changed: string[];
}

interface NetworkAdapter {
  name: string;
  interface_description: string;
  ip_addresses: string[];
  mac_address: string;
  link_speed: string;
  status: string;
  adapter_type: string;
  dhcp_enabled: string;
}

interface TcpToggle {
  id: string;
  name: string;
  desc: string;
  enabled: boolean;
  onValue: string;
  offValue: string;
}

export default function Networking() {
  const [providers, setProviders] = useState<DnsProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [dnsStatus, setDnsStatus] = useState<'idle' | 'applying' | 'done' | 'error'>('idle');
  const [dnsMessage, setDnsMessage] = useState('');
  const [currentDns, setCurrentDns] = useState<string[]>([]);
  const [settings, setSettings] = useState<NetworkSetting[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [optResult, setOptResult] = useState<NetworkOptimizationResult | null>(null);
  const [flushing, setFlushing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [adapters, setAdapters] = useState<NetworkAdapter[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdapters, setShowAdapters] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadingAdapters, setLoadingAdapters] = useState(false);
  const [adapterError, setAdapterError] = useState('');

  const [networkProfile, setNetworkProfile] = useState('Unknown');
  const [profileChanging, setProfileChanging] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [tcpToggles, setTcpToggles] = useState<TcpToggle[]>([
    { id: 'tcp_auto_tuning', name: 'TCP Auto-Tuning', desc: 'Auto-negotiates TCP receive window size', enabled: true, onValue: 'normal', offValue: 'disabled' },
    { id: 'rss', name: 'Receive Side Scaling', desc: 'Distributes network processing across CPU cores', enabled: true, onValue: 'enabled', offValue: 'disabled' },
    { id: 'chimney', name: 'TCP Chimney Offload', desc: 'Offloads TCP processing to network adapter', enabled: false, onValue: 'enabled', offValue: 'disabled' },
    { id: 'netdma', name: 'NetDMA', desc: 'Direct Memory Access for network data', enabled: true, onValue: 'enabled', offValue: 'disabled' },
    { id: 'ecn', name: 'Explicit Congestion Notification', desc: 'Network congestion signaling', enabled: true, onValue: 'enabled', offValue: 'disabled' },
    { id: 'timestamps', name: 'TCP Timestamps', desc: 'TCP timestamp option for RTT calculation', enabled: false, onValue: 'enabled', offValue: 'disabled' },
    { id: 'nagle', name: 'Nagle\'s Algorithm', desc: 'Disables Nagle for lower latency (gaming)', enabled: true, onValue: 'disabled', offValue: 'enabled' },
  ]);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const loadSettings = async () => {
    if (settings.length > 0) return;
    setLoadingSettings(true);
    try { setSettings(await invoke('get_network_settings')); } catch {}
    setLoadingSettings(false);
  };

  const loadAdapters = async () => {
    if (adapters.length > 0) return;
    setLoadingAdapters(true);
    setAdapterError('');
    try {
      const result = await invoke<NetworkAdapter[]>('get_network_adapters');
      setAdapters(result);
    } catch (e: any) {
      setAdapterError(String(e));
    }
    setLoadingAdapters(false);
  };

  useEffect(() => {
    (async () => {
      try { setProviders(await invoke('get_dns_providers')); } catch {}
      try { setCurrentDns(await invoke('get_current_dns')); } catch {}
      try { setNetworkProfile(await invoke('get_network_profile')); } catch {}
      setLoadingData(false);
    })();
  }, []);

  const applyDns = async () => {
    const prov = providers.find(p => p.name === selectedProvider);
    if (!prov) return;
    setDnsStatus('applying');
    try {
      const msg = await invoke<string>('set_dns', { primary: prov.primary, secondary: prov.secondary });
      setDnsMessage(msg);
      setDnsStatus('done');
      const updated = await invoke<string[]>('get_current_dns');
      setCurrentDns(updated);
    } catch (e: any) {
      setDnsMessage(String(e));
      setDnsStatus('error');
    }
  };

  const optimizeNetwork = async () => {
    if (settings.length === 0) await loadSettings();
    setOptimizing(true);
    try {
      const result = await invoke<NetworkOptimizationResult>('apply_network_optimizations', { settings: [] });
      setOptResult(result);
    } catch (e: any) {
      setOptResult({ success: false, message: String(e), settings_changed: [] });
    }
    setOptimizing(false);
  };

  const flushDns = async () => {
    setFlushing(true);
    try {
      await invoke('flush_dns');
      setNotification({ type: 'success', message: 'DNS cache flushed' });
    } catch (e: any) {
      setNotification({ type: 'error', message: `Error: ${e}` });
    }
    setFlushing(false);
  };

  const resetWinsock = async () => {
    setResetting(true);
    try {
      await invoke('reset_winsock');
      setNotification({ type: 'success', message: 'Winsock reset (reboot may be needed)' });
    } catch (e: any) {
      setNotification({ type: 'error', message: `Error: ${e}` });
    }
    setResetting(false);
  };

  const toggleTcp = async (idx: number) => {
    const t = tcpToggles[idx];
    const newEnabled = !t.enabled;
    const value = newEnabled ? t.onValue : t.offValue;
    try {
      await invoke('set_tcp_setting', { setting: t.id, value });
      const updated = [...tcpToggles];
      updated[idx] = { ...t, enabled: newEnabled };
      setTcpToggles(updated);
      setNotification({ type: 'success', message: `${t.name}: ${newEnabled ? 'Optimized' : 'Default'}` });
    } catch (e: any) {
      setNotification({ type: 'error', message: `Failed: ${e}` });
    }
  };

  const changeProfile = async (profile: string) => {
    setProfileChanging(true);
    try {
      await invoke('set_network_profile', { profile });
      setNetworkProfile(profile);
      setNotification({ type: 'success', message: `Network profile set to ${profile}` });
    } catch (e: any) {
      setNotification({ type: 'error', message: `Failed: ${e}` });
    }
    setProfileChanging(false);
  };

  const toggleAdaptersSection = async () => {
    const willShow = !showAdapters;
    setShowAdapters(willShow);
    if (willShow && adapters.length === 0) {
      loadAdapters(); // Fire-and-forget: show section immediately, load in background
    }
  };

  const toggleSettingsSection = async () => {
    const willShow = !showSettings;
    setShowSettings(willShow);
    if (willShow && settings.length === 0) {
      loadSettings(); // Fire-and-forget: show section immediately, load in background
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-stone-300" />
      </div>
    );
  }

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
        <Network className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Network Optimizer</h1>
          <p className="text-xs text-white/50 mt-0.5">Tune DNS, TCP, adapter settings &amp; diagnostics</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <button onClick={toggleAdaptersSection} className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.05] transition-colors">
          <Router className="h-5 w-5 text-stone-300" />
          <span className="text-sm font-semibold text-white">Network Adapters</span>
          <span className="ml-auto text-white/50">
            {loadingAdapters ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : showAdapters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>
        {showAdapters && (
          <div className="px-4 pb-4 space-y-2">
            {loadingAdapters && <div className="text-xs text-white/50 text-center py-2">Loading adapters...</div>}
            {!loadingAdapters && adapterError && (
              <div className="flex items-center gap-2 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{adapterError}</span>
              </div>
            )}
            {!loadingAdapters && !adapterError && adapters.length === 0 && <div className="text-[11px] text-white/50">No adapters found.</div>}
            {adapters.map((a, i) => (
              <div key={i} className="glass-card p-3 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${a.status === 'Up' ? 'bg-stone-300' : 'bg-rose-400'}`} />
                    <span className="font-medium text-white">{a.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/50">{a.adapter_type}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      a.status === 'Up' ? 'bg-stone-300/15 text-stone-300' : 'bg-rose-500/15 text-rose-400'
                    }`}>{a.status}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-white/50 mt-1">
                  <div className="truncate">
                    <span className="text-white/20">IP:</span> {a.ip_addresses[0] || 'N/A'}
                  </div>
                  <div className="truncate">
                    <span className="text-white/20">MAC:</span> {a.mac_address}
                  </div>
                  <div className="truncate">
                    <span className="text-white/20">Speed:</span> {a.link_speed}
                  </div>
                  <div className="truncate">
                    <span className="text-white/20">DHCP:</span> {a.dhcp_enabled}
                  </div>
                </div>
                <div className="text-[9px] text-white/20 mt-1 truncate">{a.interface_description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-stone-300" />
            <span className="text-sm font-semibold text-white">DNS Provider</span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1">
              <CustomSelect
                placeholder="Select DNS provider"
                options={providers.map(p => ({ value: p.name, label: p.name }))}
                value={selectedProvider}
                onChange={setSelectedProvider}
              />
            </div>
            <button
              onClick={applyDns}
              disabled={!selectedProvider || dnsStatus === 'applying'}
              className="pill-button"
            >
              {dnsStatus === 'applying' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              Apply
            </button>
            <button
              onClick={() => { setSelectedProvider(''); setDnsStatus('idle'); setDnsMessage(''); }}
              className="pill-button bg-white/[0.06] text-white/60 hover:bg-white/[0.1]"
            >
              Reset
            </button>
          </div>
          {selectedProvider && (() => {
            const prov = providers.find(p => p.name === selectedProvider);
            return prov ? (
              <div className="mt-1 text-[10px] text-white/50 font-mono">
                Primary: {prov.primary} &nbsp; Secondary: {prov.secondary}
              </div>
            ) : null;
          })()}
          {currentDns.length > 0 && (
            <div className="mt-1 text-[10px] text-white/50 space-y-0.5">
              {currentDns.map((d, i) => <div key={i}>{d}</div>)}
            </div>
          )}
          {dnsStatus === 'done' && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-stone-300">
              <CheckCircle className="h-3 w-3" /> {dnsMessage}
            </div>
          )}
          {dnsStatus === 'error' && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-rose-400">
              <XCircle className="h-3 w-3" /> {dnsMessage}
            </div>
          )}
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-stone-300" />
            <span className="text-sm font-semibold text-white">Quick Actions</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={flushDns} disabled={flushing} className="pill-button">
              {flushing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Flush DNS
            </button>
            <button onClick={resetWinsock} disabled={resetting} className="pill-button">
              {resetting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />}
              Reset Winsock
            </button>
            <button onClick={optimizeNetwork} disabled={optimizing} className="pill-button">
              {optimizing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
              {optimizing ? 'Applying...' : 'TCP Optimize'}
            </button>
            <button onClick={toggleSettingsSection} disabled={loadingSettings} className="pill-button">
              {loadingSettings ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Server className="h-3 w-3" />}
              {showSettings ? 'Hide Settings' : 'Show Settings'}
            </button>
          </div>

          <div className="border-t border-white/[0.06] pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-3.5 w-3.5 text-stone-300" />
              <span className="text-[11px] font-medium text-white">Network Profile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-[11px] font-mono px-2.5 py-1 rounded-full ${
                networkProfile === 'Private' ? 'bg-stone-300/15 text-stone-300' :
                networkProfile === 'Public' ? 'bg-stone-300/15 text-stone-300' :
                'bg-white/[0.06] text-white/50'
              }`}>{networkProfile}</div>
              <CustomSelect
                value={networkProfile}
                onChange={changeProfile}
                options={[
                  { value: 'Public', label: 'Public' },
                  { value: 'Private', label: 'Private' },
                ]}
                className="min-w-[100px]"
              />
              {profileChanging && <RefreshCw className="h-3 w-3 animate-spin text-stone-300" />}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <ToggleLeft className="h-4 w-4 text-stone-300" />
            <span className="text-sm font-semibold text-white">TCP Settings</span>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {tcpToggles.map((t, i) => (
              <div key={t.id} className="flex items-center justify-between py-2 px-2 border-b border-white/[0.06] last:border-0 text-xs rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium">{t.name}</div>
                  <div className="text-[10px] text-white/50 mt-0.5">{t.desc}</div>
                </div>
                <button
                  onClick={() => toggleTcp(i)}
                  className={`ml-3 shrink-0 flex items-center gap-1.5 rounded-lg px-4 py-2 text-[11px] font-semibold transition-all duration-200 min-w-[100px] justify-center ${
                    t.enabled
                      ? 'bg-stone-300/15 text-stone-300 border border-white/[0.06] shadow-sm shadow-black/20'
                      : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] border border-white/[0.06]'
                  }`}
                >
                  {t.enabled ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  {t.enabled ? 'Optimized' : 'Default'}
                </button>
              </div>
            ))}
          </div>
          {optResult && (
            <div className={`mt-3 text-[11px] ${optResult.success ? 'text-stone-300' : 'text-rose-400'}`}>
              <div className="flex items-center gap-1 mb-1">
                {optResult.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {optResult.message}
              </div>
              {optResult.settings_changed.length > 0 && (
                <div className="text-white/50 text-[10px] space-y-0.5">
                  {optResult.settings_changed.map(s => <div key={s} className="font-mono">&middot; {s}</div>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showSettings && settings.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-4 w-4 text-stone-300" />
            <span className="text-sm font-semibold text-white">Network Optimization Settings ({settings.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {settings.map(s => (
              <div key={s.id} className="glass-card p-2 text-xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-medium text-white truncate">{s.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono shrink-0 ml-1 ${
                    s.current_value == s.recommended_value
                      ? 'bg-stone-300/15 text-stone-300'
                      : 'bg-stone-300/15 text-stone-300'
                  }`}>{s.current_value}</span>
                </div>
                <div className="text-[9px] text-white/50 line-clamp-2">{s.description}</div>
                <div className="text-[9px] text-white/20 mt-0.5">Recommended: <span className="text-stone-300">{s.recommended_value}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showSettings && loadingSettings && (
        <div className="glass-card p-4 text-center">
          <RefreshCw className="h-4 w-4 animate-spin text-stone-300 inline-block mr-2" />
          <span className="text-xs text-white/50">Loading settings...</span>
        </div>
      )}
    </div>
  );
}
