import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  HardDrive, FolderOpen, File, ArrowLeft, Search, RotateCcw, Trash2, RefreshCw,
  FileText, FileImage, FileVideo, FileAudio, AlertTriangle, PieChart, BarChart3, Gauge, CheckCircle
} from 'lucide-react';

interface DiskItem {
  path: string;
  name: string;
  size_gb: number;
  free_gb: number;
  is_folder: boolean;
  item_count: number;
}

interface FileTypeCategory {
  key: string;
  label: string;
  icon: any;
  barColor: string;
  iconColor: string;
  keywords: RegExp;
}

const FILE_CATEGORIES: FileTypeCategory[] = [
  { key: 'documents', label: 'Documents', icon: FileText, barColor: 'bg-stone-300', iconColor: 'text-stone-300', keywords: /doc|document|pdf|word|excel|ppt|text|note|\.(doc|docx|pdf|xls|xlsx|ppt|pptx|txt|md|rtf)$/i },
  { key: 'images', label: 'Images', icon: FileImage, barColor: 'bg-pink-500', iconColor: 'text-pink-400', keywords: /img|image|picture|photo|pic|screenshot|\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i },
  { key: 'videos', label: 'Videos', icon: FileVideo, barColor: 'bg-stone-300', iconColor: 'text-stone-300', keywords: /video|vid|movie|film|record|clip|\.(mp4|avi|mkv|mov|wmv|flv)$/i },
  { key: 'music', label: 'Music', icon: FileAudio, barColor: 'bg-stone-300', iconColor: 'text-stone-300', keywords: /music|audio|song|mp3|podcast|\.(mp3|flac|wav|aac|ogg|wma)$/i },
  { key: 'other', label: 'Other', icon: File, barColor: 'bg-gray-500', iconColor: 'text-gray-400', keywords: /.*/ },
];

export default function DiskAnalyzer() {
  const [drives, setDrives] = useState<DiskItem[]>([]);
  const [items, setItems] = useState<DiskItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'drives' | 'scan'>('drives');
  const [cleanupMsg, setCleanupMsg] = useState('');
  const abortRef = useRef(false);

  const loadDrives = useCallback(async () => {
    setLoading(true);
    try { setDrives(await invoke('get_drive_sizes')); } catch {}
    setLoading(false);
  }, []);

  const scanPath = async (path: string) => {
    abortRef.current = false;
    setLoading(true);
    setItems([]);
    setCurrentPath(path);
    setView('scan');
    try {
      const result = await invoke<DiskItem[]>('scan_disk_folders', { path });
      if (!abortRef.current) setItems(result);
    } catch {}
    if (!abortRef.current) setLoading(false);
  };

  const cancelScan = () => { abortRef.current = true; setLoading(false); };

  const cleanTempFiles = async () => {
    try {
      await invoke('clean_temp_files');
      setCleanupMsg('Temporary files cleaned successfully');
      setTimeout(() => setCleanupMsg(''), 3000);
    } catch {
      setCleanupMsg('Failed to clean temp files');
    }
  };

  const cleanDrive = async (drivePath: string) => {
    try {
      await invoke('clean_drive', { driveLetter: drivePath[0] });
      setCleanupMsg(`Disk cleanup completed for ${drivePath}`);
      setTimeout(() => setCleanupMsg(''), 3000);
    } catch {
      setCleanupMsg(`Failed to clean ${drivePath}`);
    }
  };

  useEffect(() => { if (drives.length === 0) loadDrives(); }, []);

  const categorizeItems = (items: DiskItem[]) => {
    const sizes: Record<string, number> = { documents: 0, images: 0, videos: 0, music: 0, other: 0 };
    items.forEach(item => {
      const name = item.name.toLowerCase();
      let matched = false;
      for (const cat of FILE_CATEGORIES) {
        if (cat.key === 'other') continue;
        if (cat.keywords.test(name)) { sizes[cat.key] += item.size_gb; matched = true; break; }
      }
      if (!matched) sizes.other += item.size_gb;
    });
    return sizes;
  };

  const getLargestFolders = (items: DiskItem[]) => {
    return items.filter(item => item.is_folder).sort((a, b) => b.size_gb - a.size_gb).slice(0, 10);
  };

  const totalSize = items.reduce((s, i) => s + i.size_gb, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <HardDrive className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Disk Analyzer</h1>
          <p className="text-xs text-white/50 mt-0.5">
            {view === 'drives' ? 'Select a drive to analyze' : `Scanning: ${currentPath}`}
          </p>
        </div>
        {view === 'scan' && (
          <button onClick={() => { setView('drives'); loadDrives(); }} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] border border-white/[0.08] text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
        )}
        <button onClick={cleanTempFiles} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] border border-stone-300/30 text-stone-300 hover:bg-stone-300/10 transition-colors">
          <Trash2 className="h-3 w-3" /> Clean Temp
        </button>
      </div>

      {cleanupMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-300/10 border border-white/[0.06] text-xs text-stone-300">
          <CheckCircle className="h-3.5 w-3.5 shrink-0" /> {cleanupMsg}
          <button onClick={() => setCleanupMsg('')} className="ml-auto text-white/30 hover:text-white">&times;</button>
        </div>
      )}

      {view === 'drives' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {drives.map((d, i) => {
            const used = d.size_gb - d.free_gb;
            const pct = d.size_gb > 0 ? (used / d.size_gb) * 100 : 0;
            return (
              <button key={i} onClick={() => scanPath(d.path + '\\')}
                className="glass-card p-5 text-left hover:border-white/[0.08] transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <HardDrive className="h-6 w-6 text-stone-300" />
                  <div>
                    <div className="text-sm font-bold text-white">{d.name || d.path}</div>
                    <div className="text-[10px] text-white/40">{d.size_gb.toFixed(1)} GB total</div>
                  </div>
                </div>
                <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full transition-all ${
                    pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-stone-300' : 'bg-stone-300'
                  }`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">{used.toFixed(1)} GB used</span>
                  <span className="text-white/40">{d.free_gb.toFixed(1)} GB free</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-stone-300/30 rounded-full" style={{ width: `${Math.min(100 - pct, 100)}%` }} />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); cleanDrive(d.path); }}
                    className="text-[9px] px-2 py-0.5 rounded bg-white/[0.04] text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                    Clean
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {items.length > 0 && totalSize > 0 && (() => {
            const sizes = categorizeItems(items);
            const total = Object.values(sizes).reduce((a, b) => a + b, 0) || 1;
            return (
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="h-4 w-4 text-stone-300" />
                  <span className="text-sm font-semibold text-white">File Type Distribution</span>
                  <span className="text-[10px] text-white/40 ml-1">{total.toFixed(1)} GB total</span>
                </div>
                <div className="h-5 bg-white/[0.06] rounded-full overflow-hidden flex mb-3">
                  {FILE_CATEGORIES.map(cat => {
                    const pct = (sizes[cat.key] / total) * 100;
                    return pct > 0 ? (
                      <div key={cat.key} className={`${cat.barColor} h-full transition-all relative`}
                        style={{ width: `${pct}%` }}
                        title={`${cat.label}: ${sizes[cat.key].toFixed(2)} GB (${pct.toFixed(1)}%)`}>
                        {pct > 10 && <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold">{pct.toFixed(0)}%</span>}
                      </div>
                    ) : null;
                  })}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {FILE_CATEGORIES.map(cat => {
                    const CatIcon = cat.icon;
                    const pct = (sizes[cat.key] / total) * 100;
                    return (
                      <div key={cat.key} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <CatIcon className={`h-3.5 w-3.5 shrink-0 ${cat.iconColor}`} />
                        <div className="min-w-0">
                          <div className="text-[10px] text-white/60 truncate">{cat.label}</div>
                          <div className="text-[9px] font-mono text-white/30">{sizes[cat.key].toFixed(1)} GB ({pct.toFixed(0)}%)</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="flex items-center justify-between text-[10px] text-white/50 px-1">
            <span className="font-mono text-white/30 truncate max-w-[300px]">{currentPath}</span>
            <span className="text-white/40">{items.length} items</span>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_60px_70px] gap-2 text-[9px] font-semibold text-white/30 uppercase tracking-wider px-4 py-2.5 bg-white/[0.02]">
              <div>Name</div><div className="text-right">Size</div><div className="text-right">Items</div><div className="text-right"></div>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-[50vh] overflow-y-auto">
              {items.map((item, i) => (
                <button key={i} onClick={() => item.is_folder ? scanPath(item.path) : null}
                  className={`grid grid-cols-[1fr_80px_60px_70px] gap-2 items-center w-full px-4 py-2 text-xs text-left transition-colors ${
                    i % 2 === 0 ? 'bg-white/[0.01]' : ''
                  } hover:bg-white/[0.03] ${item.is_folder ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {item.is_folder ? <FolderOpen className="h-3.5 w-3.5 text-stone-300 shrink-0" /> : <File className="h-3.5 w-3.5 text-stone-300 shrink-0" />}
                    <span className="truncate text-white/80">{item.name}</span>
                  </div>
                  <div className="text-right font-mono text-white/40 text-[10px]">{item.size_gb.toFixed(2)} GB</div>
                  <div className="text-right text-white/40">{item.is_folder ? item.item_count : '\u2014'}</div>
                  <div className="text-right">
                    {item.is_folder && (
                      <button onClick={(e) => { e.stopPropagation(); setCleanupMsg(`"${item.name}" uses ${item.size_gb.toFixed(2)} GB — review and delete unnecessary files.`); }}
                        className="px-1.5 py-0.5 rounded text-[8px] bg-white/[0.04] text-white/40 hover:bg-stone-300/20 hover:text-stone-300 transition-colors">
                        <Trash2 className="h-2.5 w-2.5 inline" />
                      </button>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {items.length > 0 && (() => {
            const largest = getLargestFolders(items);
            if (largest.length === 0) return null;
            return (
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-stone-300" />
                  <span className="text-sm font-semibold text-white">Top 10 Largest Folders</span>
                </div>
                <div className="space-y-2">
                  {largest.map((item, i) => {
                    const pct = totalSize > 0 ? (item.size_gb / totalSize) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <span className="text-white/20 w-5 text-right shrink-0 font-mono">#{i + 1}</span>
                        <FolderOpen className="h-3.5 w-3.5 text-stone-300 shrink-0" />
                        <button onClick={() => scanPath(item.path)} className="truncate text-white/70 hover:text-stone-300 flex-1 text-left">{item.name}</button>
                        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden w-24 shrink-0">
                          <div className="h-full bg-gradient-to-r from-stone-300 to-stone-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="font-mono text-white/50 shrink-0 w-16 text-right text-[10px]">{item.size_gb.toFixed(2)} GB</span>
                        <span className="text-white/30 text-[9px] shrink-0 w-10 text-right">({pct.toFixed(0)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-10">
          <RefreshCw className="h-6 w-6 text-stone-300 animate-spin" />
          <span className="text-xs text-stone-300/80">{view === 'drives' ? 'Loading drives...' : 'Scanning...'}</span>
          <div className="w-48 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-stone-300 rounded-full animate-loading-pulse" />
          </div>
          {view === 'scan' && <button onClick={cancelScan} className="text-[9px] text-rose-400 hover:text-rose-300">Cancel</button>}
        </div>
      )}
    </div>
  );
}
