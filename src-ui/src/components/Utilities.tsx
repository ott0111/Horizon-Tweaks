import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Wrench, Shield, HardDrive, Monitor, Terminal, Play, RotateCcw, Trash2,
  Globe, Zap, Cpu, Battery, Info, Activity, Network, Disc,
  Server, Hash, Search, Layers, Wifi, Lock, Eye, AlertTriangle,
  FolderOpen, Power, Database, Radio, Bug, FileText, Map,
  CheckCircle
} from 'lucide-react';

interface UtilityResult {
  success: boolean;
  output: string;
}

interface ToolDef {
  id: string;
  name: string;
  desc: string;
  icon: any;
  group: string;
  warning?: string;
}

const TOOLS: ToolDef[] = [
  // ---- System Repair ----
  { id: 'sfc', name: 'System File Checker', desc: 'Scans and repairs corrupted Windows system files', icon: Shield, group: 'System Repair' },
  { id: 'dism', name: 'DISM Restore Health', desc: 'Repairs Windows system image and component store', icon: Monitor, group: 'System Repair' },
  { id: 'chkdsk', name: 'Check Disk', desc: 'Scans C: drive for file system errors and bad sectors', icon: HardDrive, group: 'System Repair' },
  { id: 'cleanmgr', name: 'Disk Cleanup', desc: 'Launches built-in Disk Cleanup utility (sagerun:1)', icon: Disc, group: 'System Repair', warning: 'Runs in background' },

  // ---- Network ----
  { id: 'flushdns', name: 'Flush DNS Cache', desc: 'Clears DNS resolver cache to fix name resolution issues', icon: Globe, group: 'Network' },
  { id: 'netsh_winsock', name: 'Reset Winsock', desc: 'Resets Winsock catalog to fix network connectivity', icon: Network, group: 'Network', warning: 'Reboot may be needed' },
  { id: 'netsh_tcpip', name: 'Reset TCP/IP Stack', desc: 'Resets TCP/IP stack to default configuration', icon: Network, group: 'Network', warning: 'Reboot may be needed' },
  { id: 'ipconfig_release', name: 'Release IP', desc: 'Releases current DHCP IP address', icon: Globe, group: 'Network', warning: 'May lose connection' },
  { id: 'ipconfig_renew', name: 'Renew IP', desc: 'Renews DHCP IP address with the server', icon: Globe, group: 'Network' },
  { id: 'ping_google', name: 'Ping Google DNS', desc: 'Pings 8.8.8.8 four times to test connectivity', icon: Activity, group: 'Network' },
  { id: 'ping_cloudflare', name: 'Ping Cloudflare DNS', desc: 'Pings 1.1.1.1 four times to test connectivity', icon: Activity, group: 'Network' },
  { id: 'tracert', name: 'Traceroute', desc: 'Traces route to 8.8.8.8 (max 10 hops)', icon: Hash, group: 'Network' },
  { id: 'pathping', name: 'PathPing', desc: 'Combines ping and traceroute to 8.8.8.8', icon: Hash, group: 'Network' },
  { id: 'dns_cache_view', name: 'DNS Cache Viewer', desc: 'Displays all cached DNS entries', icon: Search, group: 'Network' },
  { id: 'route_table', name: 'Route Table', desc: 'Shows IPv4 routing table', icon: Map, group: 'Network' },

  // ---- Power ----
  { id: 'powercfg_energy', name: 'Energy Report', desc: 'Generates power efficiency report to TEMP folder', icon: Battery, group: 'Power' },
  { id: 'powercfg_battery', name: 'Battery Report', desc: 'Generates battery health report to TEMP folder', icon: Battery, group: 'Power' },
  { id: 'powercfg_hibernate_off', name: 'Disable Hibernate', desc: 'Turns off hibernation to free disk space', icon: Zap, group: 'Power' },
  { id: 'powercfg_hibernate_on', name: 'Enable Hibernate', desc: 'Turns on hibernation mode', icon: Battery, group: 'Power' },
  { id: 'power_schemes', name: 'Power Schemes', desc: 'Lists all available power schemes', icon: Power, group: 'Power' },

  // ---- System Info ----
  { id: 'systeminfo', name: 'System Information', desc: 'Displays OS, CPU, RAM, BIOS information', icon: Info, group: 'System Info' },
  { id: 'driverquery', name: 'Driver List', desc: 'Lists all installed device drivers', icon: Server, group: 'System Info' },
  { id: 'tasklist', name: 'Running Processes', desc: 'Lists all running processes with details', icon: Activity, group: 'System Info' },
  { id: 'netstat', name: 'Network Connections', desc: 'Shows all active TCP/UDP connections', icon: Network, group: 'System Info' },
  { id: 'wmic_os', name: 'OS Details', desc: 'Detailed OS information via WMI', icon: Info, group: 'System Info' },
  { id: 'wmic_cpu', name: 'CPU Details', desc: 'Detailed processor information via WMI', icon: Cpu, group: 'System Info' },
  { id: 'wmic_memory', name: 'Memory Details', desc: 'Detailed physical memory info via WMI', icon: Layers, group: 'System Info' },
  { id: 'wmic_disk', name: 'Disk Details', desc: 'Detailed disk drive info via WMI', icon: HardDrive, group: 'System Info' },
  { id: 'wmic_gpu', name: 'GPU Details', desc: 'Detailed graphics card info via WMI', icon: Monitor, group: 'System Info' },
  { id: 'systeminfo_uptime', name: 'System Uptime', desc: 'Shows how long the system has been running', icon: Activity, group: 'System Info' },
  { id: 'startup_programs', name: 'Startup Programs', desc: 'Lists programs that run at startup', icon: Power, group: 'System Info' },
  { id: 'services_status', name: 'Services Status', desc: 'Shows all running Windows services', icon: Server, group: 'System Info' },

  // ---- Maintenance ----
  { id: 'gpupdate', name: 'Update Group Policy', desc: 'Forces a refresh of all group policies', icon: Shield, group: 'Maintenance' },
  { id: 'defrag', name: 'Optimize C: Drive', desc: 'Runs defrag/optimization on C: drive', icon: Disc, group: 'Maintenance', warning: 'May take a while' },
  { id: 'vssadmin', name: 'Shadow Copies', desc: 'Lists all Volume Shadow Copy snapshots', icon: Layers, group: 'Maintenance' },
  { id: 'bcdedit', name: 'Boot Config', desc: 'Displays boot configuration entries', icon: Zap, group: 'Maintenance' },
  { id: 'fsutil', name: 'File System Info', desc: 'Shows drives and file system statistics', icon: HardDrive, group: 'Maintenance' },
  { id: 'chkntfs', name: 'NTFS Boot Check', desc: 'Shows whether C: is scheduled for chkdsk at boot', icon: Search, group: 'Maintenance' },
  { id: 'cipher', name: 'Wipe Free Space', desc: 'Overwrites deleted file data on C: free space', icon: Trash2, group: 'Maintenance', warning: 'Background, may be slow' },
  { id: 'msinfo', name: 'Full System Report', desc: 'Generates complete msinfo32 report to TEMP', icon: Info, group: 'Maintenance' },
  { id: 'defrag_status', name: 'Drive Optimization Status', desc: 'Shows current optimization status of all drives', icon: Disc, group: 'Maintenance' },
  { id: 'chkdsk_status', name: 'Check Disk Status', desc: 'Shows if C: drive needs checking', icon: Search, group: 'Maintenance' },
  { id: 'temp_files_size', name: 'Temp Files Size', desc: 'Measures how much space TEMP folder uses', icon: HardDrive, group: 'Maintenance' },
  { id: 'registry_backup', name: 'Registry Backup', desc: 'Exports SOFTWARE hive to TEMP folder', icon: Database, group: 'Maintenance', warning: 'Creates large file' },

  // ---- Extra -----
  { id: 'powercfg_sleep_study', name: 'Sleep Study Report', desc: 'Generates sleep/resume diagnostic report', icon: Battery, group: 'Power' },
  { id: 'powercfg_last_wake', name: 'Last Wake Source', desc: 'Shows what woke the PC from sleep', icon: Zap, group: 'Power' },
  { id: 'powercfg_devices_wake', name: 'Wake-enabled Devices', desc: 'Lists devices that can wake the PC', icon: Zap, group: 'Power' },
  { id: 'netsh_wlan_show', name: 'Wi-Fi Profiles', desc: 'Lists all saved Wi-Fi network profiles', icon: Wifi, group: 'Network' },
  { id: 'netsh_wlan_show_interfaces', name: 'Wi-Fi Interface Info', desc: 'Shows Wi-Fi adapter details and signal', icon: Radio, group: 'Network' },
  { id: 'ping_local', name: 'Ping Localhost', desc: 'Pings 127.0.0.1 to test TCP/IP stack', icon: Activity, group: 'Network' },
  { id: 'ipconfig_all', name: 'Full IP Config', desc: 'Shows all IP configuration details', icon: Globe, group: 'Network' },
  { id: 'battery_health', name: 'Battery Health', desc: 'Shows design vs full charge capacity', icon: Battery, group: 'Power' },
  { id: 'windows_activation', name: 'Windows Activation', desc: 'Checks if Windows is activated', icon: Lock, group: 'System Info' },
  { id: 'bitlocker_status', name: 'BitLocker Status', desc: 'Checks BitLocker encryption status', icon: Lock, group: 'System Info' },
  { id: 'power_plan_details', name: 'Power Plan Details', desc: 'Shows detailed power plan settings', icon: Power, group: 'Power' },
  { id: 'event_log_errors', name: 'Recent Errors', desc: 'Last 24h system errors from Event Log', icon: AlertTriangle, group: 'System Info' },
  { id: 'process_detail', name: 'Top Processes', desc: 'Top 20 processes by memory usage', icon: Activity, group: 'System Info' },
  { id: 'firewall_status', name: 'Firewall Status', desc: 'Shows Windows Firewall profile status', icon: Shield, group: 'Network' },
  { id: 'disk_partitions', name: 'Disk Partitions', desc: 'Lists all disk partitions on the system', icon: HardDrive, group: 'System Info' },
  { id: 'wifi_password', name: 'Wi-Fi Passwords', desc: 'Shows saved Wi-Fi passwords (admin)', icon: Lock, group: 'Network', warning: 'Shows passwords in plain text' },
  { id: 'open_ports', name: 'Open Ports', desc: 'Shows all listening TCP ports', icon: Radio, group: 'Network' },
  { id: 'powercfg_full_battery', name: 'Full Battery Report', desc: 'Complete battery health report to TEMP', icon: Battery, group: 'Power' },
];

const GROUP_ICONS: Record<string, any> = {
  'System Repair': Shield,
  'Network': Globe,
  'Power': Battery,
  'System Info': Info,
  'Maintenance': Wrench,
};

function groupTools(tools: ToolDef[]): Record<string, ToolDef[]> {
  const groups: Record<string, ToolDef[]> = {};
  for (const t of tools) {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(t);
  }
  return groups;
}

export default function Utilities() {
  const [running, setRunning] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const runTool = async (toolId: string) => {
    setRunning(toolId);
    try {
      const result = await invoke<UtilityResult>('run_system_utility', { tool: toolId });
      setOutputs(prev => ({ ...prev, [toolId]: result.output }));
      setNotification({ type: 'success', message: `${TOOLS.find(t => t.id === toolId)?.name || toolId} completed` });
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : e?.message || 'Tool failed';
      setOutputs(prev => ({ ...prev, [toolId]: `Error: ${e}` }));
      setNotification({ type: 'error', message: msg });
    }
    setRunning(null);
  };

  const groups = groupTools(TOOLS);
  const groupOrder = ['System Repair', 'Network', 'Power', 'System Info', 'Maintenance'];

  return (
    <div className="space-y-6">
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
        <Wrench className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">System Utilities</h1>
          <p className="text-xs text-white/50 mt-0.5">{TOOLS.length} tools across diagnostics, repair, network &amp; maintenance</p>
        </div>
      </div>

      {groupOrder.map(groupName => {
        const tools = groups[groupName];
        if (!tools) return null;
        const GroupIcon = GROUP_ICONS[groupName] || Wrench;
        return (
          <div key={groupName}>
            <div className="flex items-center gap-2 mb-3">
              <GroupIcon className="h-4 w-4 text-stone-300" />
              <h2 className="text-sm font-semibold text-white">{groupName}</h2>
              <span className="text-[10px] text-white/50">({tools.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isRunning = running === tool.id;
                return (
                  <div key={tool.id} className="glass-card p-2.5 space-y-1.5 hover:border-white/[0.12] transition-colors">
                    <div className="flex items-start gap-2">
                      <div className="glass-card p-1 shrink-0 mt-0.5">
                        <Icon className="h-3.5 w-3.5 text-stone-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[11px] text-white truncate">{tool.name}</div>
                        <div className="text-[9px] text-white/50 leading-tight line-clamp-2">{tool.desc}</div>
                        {tool.warning && (
                          <div className="text-[8px] text-stone-300 mt-0.5">{tool.warning}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => runTool(tool.id)}
                      disabled={isRunning}
                      className="pill-button w-full"
                    >
                      {isRunning ? (
                        <RotateCcw className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <Play className="h-2.5 w-2.5" />
                      )}
                      {isRunning ? 'Running...' : 'Run'}
                    </button>
                    {outputs[tool.id] && (
                      <div>
                        <button
                          onClick={() => setOutputs(prev => { const n = { ...prev }; delete n[tool.id]; return n; })}
                          className="text-[8px] text-white/50 hover:text-white"
                        >
                          Clear
                        </button>
                        <pre className="glass-card p-1 text-[8px] text-white/40 font-mono max-h-24 overflow-y-auto whitespace-pre-wrap break-all">
                          {outputs[tool.id]}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
