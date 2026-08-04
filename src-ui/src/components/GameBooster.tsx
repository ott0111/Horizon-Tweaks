import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Gamepad2, Zap, CheckCircle, XCircle, Trash2, RotateCcw, RefreshCw, MemoryStick, Activity } from 'lucide-react';

interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_mb: number;
  status: string;
}

const KILLABLE_KEYWORDS = [
  'chrome', 'firefox', 'edge', 'microsoftedge', 'spotify', 'discord', 'slack', 'teams',
  'outlook', 'word', 'excel', 'powerpoint', 'onenote', 'photoshop', 'illustrator',
  'premiere', 'afterfx', 'aftereffects', 'vscode', 'code', 'notepad++', 'sublime',
  'sublime_text', 'postman', 'docker', 'node', 'npm', 'python', 'java', 'javaw',
  'msbuild', 'devenv', 'winrar', '7zip', '7z', 'vlc', 'obs', 'obs64', 'streamlabs',
  'streamlabsobs', 'browser', 'skype', 'zoom', 'webex', 'telegram', 'whatsapp',
  'thunderbird', 'foxit', 'acrobat', 'acrobatreader', 'ccleaner', 'malwarebytes',
  'calculator', 'calendar', 'alarms', 'camera', 'sticky', 'snipping', 'notepad',
  'paint', 'windowsstore', 'store', 'feedback', 'gethelp', 'xbox', 'solitaire',
  'music', 'groove', 'movies', 'tv', 'photos', 'office', 'winword', 'mspaint',
  'iexplore', 'iexplorer', 'brave', 'opera', 'tor', 'signal', 'slack', 'msedge',
  'chrome', 'chromium', 'vivaldi', 'whatsapp', 'textsecure', 'thunderbird',
  'openoffice', 'libreoffice', 'scribus', 'inkscape', 'gimp', 'krita', 'blender',
  'steam', 'epic', 'epicgames', 'gog', 'ubisoft', 'origin', 'battle', 'battlenet',
  'curse', 'twitch', 'teamspeak', 'discord', 'mumble', 'ventrilo', 'pidgin',
  'transmission', 'utorrent', 'bittorrent', 'deluge', 'qbittorrent',
  'lastpass', 'keepass', '1password', 'bitwarden', 'adguard', 'ublock',
  'avg', 'avast', 'norton', 'mcafee', 'kaspersky', 'bitdefender', 'defender',
  'searchui', 'searchapp', 'startmenuexperience', 'shellexperience',
];

export default function GameBooster() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [active, setActive] = useState(false);
  const [freedMB, setFreedMB] = useState(0);
  const [msg, setMsg] = useState('');

  const fetch = useCallback(async () => {
    try {
      const all = await invoke<ProcessInfo[]>('get_processes');
      setProcesses(all.filter(p => KILLABLE_KEYWORDS.some(k => p.name.toLowerCase().includes(k))));
    } catch {}
  }, []);

  useEffect(() => { fetch(); const i = setInterval(fetch, 5000); return () => clearInterval(i); }, [fetch]);

  useEffect(() => {
    const pids = new Set<number>();
    processes.forEach(p => pids.add(p.pid));
    setChecked(pids);
  }, [processes]);

  const toggleProcess = (pid: number) => {
    setChecked(p => { const n = new Set(p); n.has(pid) ? n.delete(pid) : n.add(pid); return n; });
  };

  const killSelected = async () => {
    let freed = 0; let count = 0;
    for (const pid of checked) {
      const p = processes.find(pr => pr.pid === pid);
      try { await invoke('kill_process', { pid }); freed += p?.memory_mb || 0; count++; } catch {}
    }
    setFreedMB(p => p + freed);
    setMsg(`Killed ${count} process(es), freed ~${freed.toFixed(0)} MB`);
    setTimeout(() => fetch(), 500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Gamepad2 className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Game Booster</h1>
          <p className="text-xs text-white/50 mt-0.5">Free up resources for maximum gaming performance</p>
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 border border-green-500/20 bg-green-500/10 px-4 py-2 text-xs text-green-400">
          <CheckCircle className="h-3 w-3" /> {msg}
          <button onClick={() => setMsg('')} className="ml-auto text-white/50">&times;</button>
        </div>
      )}

      <div className="flex items-center justify-between border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="flex items-center gap-3">
          <Zap className={`h-8 w-8 ${active ? 'text-stone-300 animate-pulse' : 'text-white/50'}`} />
          <div>
            <div className="text-sm font-semibold text-white">Game Mode</div>
            <div className="text-[10px] text-white/50">{active ? 'Active &mdash; background processes killed' : 'Inactive'}</div>
          </div>
        </div>
        <button
          onClick={() => { setActive(!active); if (!active) killSelected(); }}
          className={`px-5 py-2 text-xs font-medium transition-colors ${active ? 'bg-stone-900/40 text-stone-300 border border-white/[0.12]' : 'pill-button'}`}
        >
          {active ? 'Deactivate' : 'Activate Game Mode'}
        </button>
      </div>

      {freedMB > 0 && (
        <div className="border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 text-xs">
            <MemoryStick className="h-4 w-4 text-stone-300" />
            <span className="text-white font-medium">Memory Freed This Session:</span>
            <span className="text-stone-300 font-mono font-bold">{freedMB.toFixed(0)} MB</span>
          </div>
        </div>
      )}

      <div className="border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-stone-300" />
            <span className="text-sm font-semibold text-white">Killable Processes ({processes.length})</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { const n = new Set<number>(); processes.forEach(p => n.add(p.pid)); setChecked(n); }} className="text-[9px] border border-white/[0.12] px-2 py-1 text-white/50 hover:text-white">Select All</button>
            <button onClick={() => setChecked(new Set())} className="text-[9px] border border-white/[0.12] px-2 py-1 text-white/50 hover:text-white">Deselect</button>
            <button onClick={killSelected} className="flex items-center gap-1 bg-red-900/40 text-red-400 px-2 py-1 text-[10px] hover:bg-red-900/60"><Trash2 className="h-2.5 w-2.5" /> Kill</button>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {processes.map(p => (
            <label key={p.pid} className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-white/[0.03] cursor-pointer border-b border-white/[0.06]/50 last:border-0">
              <input type="checkbox" checked={checked.has(p.pid)} onChange={() => toggleProcess(p.pid)} className="accent-pulse" />
              <span className="flex-1 text-white truncate">{p.name}</span>
              <span className="text-white/50 font-mono text-[10px] w-16 text-right">{p.memory_mb.toFixed(0)} MB</span>
              <span className="text-white/50 font-mono text-[10px] w-12 text-right">{p.cpu_percent.toFixed(1)}%</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
