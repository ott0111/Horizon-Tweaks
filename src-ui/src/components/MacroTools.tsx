import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Keyboard, MousePointer2, Zap, Plus, Save, Upload, Download, Trash2, Play, Square,
  GripVertical, Settings, Copy, CheckCircle, XCircle, AlertTriangle, Edit3, Mic,
  RotateCcw, ChevronDown, ChevronUp, Loader
} from 'lucide-react';


interface MacroEvent {
  event_type: string;
  key: string | null;
  x: number | null;
  y: number | null;
  duration_ms: number;
}

interface SavedMacro {
  id: string;
  name: string;
  keybind: string;
  sequence: MacroEvent[];
  loop_count: number;
  delay_between: number;
  created_at: string;
}

let macroIdCounter = 0;
function genId() { return `macro-${++macroIdCounter}-${Date.now()}`; }

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if ((window as any).__TAURI_INTERNALS__) {
    try {
      const mod = await import('@tauri-apps/api/core');
      return await mod.invoke<T>(cmd, args);
    } catch {
      throw new Error(`Tauri invoke failed: ${cmd}`);
    }
  }
  throw new Error('Not in Tauri environment');
}

export default function MacroTools() {
  const [macros, setMacros] = useState<SavedMacro[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordedEvents, setRecordedEvents] = useState<MacroEvent[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editKeybind, setEditKeybind] = useState('');
  const [editLoop, setEditLoop] = useState(1);
  const [editDelay, setEditDelay] = useState(50);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKeybind, setNewKeybind] = useState('');
  const [newLoop, setNewLoop] = useState(1);
  const [newDelay, setNewDelay] = useState(50);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedMacro, setExpandedMacro] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    loadMacros();
  }, []);

  useEffect(() => {
    if (recording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 100);
      }, 100);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [recording]);

  const loadMacros = async () => {
    try {
      const saved = await invokeTauri<SavedMacro[]>('load_macros');
      setMacros(saved || []);
    } catch {
      const stored = localStorage.getItem('horizon-macros');
      if (stored) {
        try { setMacros(JSON.parse(stored)); }
        catch { setMacros([]); }
      }
    }
  };

  const persistMacros = async (updated: SavedMacro[]) => {
    setMacros(updated);
    localStorage.setItem('horizon-macros', JSON.stringify(updated));
    try {
      for (const m of updated) {
        await invokeTauri('save_macro', { name: m.id, keybind: m.keybind, sequence: m.sequence });
      }
    } catch { }
  };

  const startRecording = () => {
    setRecordedEvents([]);
    setRecording(true);
    setShowNewForm(false);
    try {
      invokeTauri('start_macro_recording');
    } catch { }
    showToast('Recording... Ctrl+click to stop');
  };

  const stopRecording = async () => {
    setRecording(false);
    try {
      const events = await invokeTauri<MacroEvent[]>('stop_macro_recording');
      setRecordedEvents(events || []);
    } catch {
      setRecordedEvents([]);
    }
    if (recordedEvents.length > 0 || true) {
      setShowNewForm(true);
      setNewName(`Macro ${macros.length + 1}`);
      setNewKeybind('F' + (6 + macros.length));
    }
  };

  const handleRecordToggle = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const saveNewMacro = async () => {
    if (!newName.trim()) { showToast('Enter a name'); return; }
    const macro: SavedMacro = {
      id: genId(),
      name: newName.trim(),
      keybind: newKeybind.trim() || 'None',
      sequence: recordedEvents,
      loop_count: Math.max(1, newLoop),
      delay_between: Math.max(0, newDelay),
      created_at: new Date().toISOString(),
    };
    const updated = [...macros, macro];
    await persistMacros(updated);
    setShowNewForm(false);
    setNewName('');
    setNewKeybind('');
    setRecordedEvents([]);
    showToast(`Macro "${macro.name}" saved`);
  };

  const updateMacro = async (id: string) => {
    const updated = macros.map(m => {
      if (m.id !== id) return m;
      return {
        ...m,
        name: editName.trim() || m.name,
        keybind: editKeybind.trim() || m.keybind,
        loop_count: Math.max(1, editLoop),
        delay_between: Math.max(0, editDelay),
      };
    });
    await persistMacros(updated);
    setEditingId(null);
    showToast('Macro updated');
  };

  const deleteMacro = async (id: string) => {
    const updated = macros.filter(m => m.id !== id);
    await persistMacros(updated);
    try { await invokeTauri('delete_macro', { name: id }); } catch { }
    showToast('Macro deleted');
  };

  const playMacro = async (macro: SavedMacro) => {
    if (playingId) return;
    setPlayingId(macro.id);
    try {
      await invokeTauri('play_macro', { name: macro.id });
    } catch {
      for (let loop = 0; loop < macro.loop_count; loop++) {
        for (const event of macro.sequence) {
          await new Promise(r => setTimeout(r, event.duration_ms + macro.delay_between));
        }
      }
    }
    setPlayingId(null);
  };

  const exportMacro = async (macro: SavedMacro) => {
    const blob = new Blob([JSON.stringify(macro, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${macro.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported "${macro.name}"`);
  };

  const importMacro = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const macro = JSON.parse(text) as SavedMacro;
        if (!macro.id || !macro.sequence) throw new Error('Invalid format');
        macro.id = genId();
        const updated = [...macros, macro];
        await persistMacros(updated);
        showToast(`Imported "${macro.name}"`);
      } catch {
        showToast('Invalid macro file');
      }
    };
    input.click();
  };

  const duplicateMacro = async (macro: SavedMacro) => {
    const dup: SavedMacro = {
      ...macro,
      id: genId(),
      name: `${macro.name} (copy)`,
      created_at: new Date().toISOString(),
    };
    const updated = [...macros, dup];
    await persistMacros(updated);
    showToast(`Duplicated as "${dup.name}"`);
  };

  const moveMacro = async (from: number, to: number) => {
    if (to < 0 || to >= macros.length) return;
    const updated = [...macros];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    await persistMacros(updated);
  };

  const formatDuration = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    return `${mins}:${String(secs % 60).padStart(2, '0')}.${String(Math.floor((ms % 1000) / 100))}`;
  };

  const totalDuration = (macro: SavedMacro) => {
    return macro.sequence.reduce((sum, e) => sum + e.duration_ms, 0) * macro.loop_count;
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium bg-stone-300/90 text-white transition-all">
          <Zap className="h-4 w-4" />
          {toast}
        </div>
      )}



      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleRecordToggle}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            recording
              ? 'bg-red-500/80 text-white shadow-lg shadow-red-500/20 animate-pulse'
              : 'blue-button'
          }`}
        >
          {recording ? (
            <><Square className="h-4 w-4" /> Stop Recording ({formatDuration(recordingDuration)})</>
          ) : (
            <><Mic className="h-4 w-4" /> Record Macro</>
          )}
        </button>
        <button onClick={importMacro} className="pill-button flex items-center gap-2">
          <Download className="h-4 w-4" />
          Import
        </button>
      </div>

      {showNewForm && recordedEvents.length > 0 && !recording && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-stone-300" />
            <span className="text-sm font-semibold text-white">Save Recorded Macro</span>
            <span className="text-[10px] text-white/40 ml-auto">{recordedEvents.length} events</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="glass-input w-full mt-1 text-sm"
                placeholder="Macro name"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Keybind</label>
              <input
                value={newKeybind}
                onChange={e => setNewKeybind(e.target.value)}
                className="glass-input w-full mt-1 text-sm"
                placeholder="e.g. F6"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Loop Count</label>
              <input
                type="number"
                min={1}
                max={999}
                value={newLoop}
                onChange={e => setNewLoop(Number(e.target.value))}
                className="glass-input w-full mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider">Delay (ms)</label>
              <input
                type="number"
                min={0}
                max={5000}
                value={newDelay}
                onChange={e => setNewDelay(Number(e.target.value))}
                className="glass-input w-full mt-1 text-sm"
              />
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {recordedEvents.slice(0, 20).map((ev, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-white/50 px-2 py-1">
                <span className="text-white/20 w-6 shrink-0">#{i + 1}</span>
                <span className="text-stone-300/70">{ev.event_type}</span>
                {ev.key && <span className="text-white/70 font-mono">{ev.key}</span>}
                {ev.x != null && <span className="text-white/40">({ev.x},{ev.y})</span>}
                <span className="text-white/20 ml-auto">{ev.duration_ms}ms</span>
              </div>
            ))}
            {recordedEvents.length > 20 && (
              <div className="text-[10px] text-white/30 text-center py-1">+{recordedEvents.length - 20} more events</div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={saveNewMacro} className="blue-button px-6 py-2 text-sm flex-1">
              <Save className="h-4 w-4" />
              Save Macro
            </button>
            <button onClick={() => { setShowNewForm(false); setRecordedEvents([]); }} className="pill-button px-4 py-2">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {macros.length === 0 && !showNewForm && (
          <div className="glass-card p-10 text-center">
            <Keyboard className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/40">No macros saved yet</p>
            <p className="text-xs text-white/20 mt-1">Click "Record Macro" to create one</p>
          </div>
        )}

        {macros.map((macro, index) => {
          const isPlaying = playingId === macro.id;
          const isEditing = editingId === macro.id;
          const isExpanded = expandedMacro === macro.id;
          const duration = totalDuration(macro);

          return (
            <div
              key={macro.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
              onDragEnd={() => {
                if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
                  moveMacro(dragIndex, dragOverIndex);
                }
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              className={`glass-card p-4 transition-all ${
                dragOverIndex === index ? 'border-stone-300/40 scale-[1.01]' : ''
              } ${isPlaying ? 'border-white/[0.08] shadow-black/20' : ''}`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider">Name</label>
                      <input value={editName} onChange={e => setEditName(e.target.value)} className="glass-input w-full mt-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider">Keybind</label>
                      <input value={editKeybind} onChange={e => setEditKeybind(e.target.value)} className="glass-input w-full mt-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider">Loop Count</label>
                      <input type="number" min={1} value={editLoop} onChange={e => setEditLoop(Number(e.target.value))} className="glass-input w-full mt-1 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider">Delay (ms)</label>
                      <input type="number" min={0} value={editDelay} onChange={e => setEditDelay(Number(e.target.value))} className="glass-input w-full mt-1 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateMacro(macro.id)} className="blue-button px-4 py-1.5 text-xs">
                      <CheckCircle className="h-3.5 w-3.5" /> Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="pill-button px-4 py-1.5 text-xs">
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="text-white/20 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/[0.03]">
                      <MousePointer2 className="h-4 w-4 text-white/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{macro.name}</span>
                        {macro.keybind !== 'None' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md bg-stone-300/10 text-stone-300 border border-stone-300/15">
                            {macro.keybind}
                          </span>
                        )}
                        {isPlaying && (
                          <span className="flex items-center gap-1 text-[10px] text-stone-300">
                            <Loader className="h-3 w-3 animate-spin" /> Playing
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/30 mt-0.5">
                        <span>{macro.sequence.length} events</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span>{macro.loop_count}x loop</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span>~{formatDuration(duration)}</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[9px]">{new Date(macro.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => playMacro(macro)} disabled={isPlaying} className="pill-button p-2" title="Play">
                        {isPlaying ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => {
                        setEditingId(macro.id);
                        setEditName(macro.name);
                        setEditKeybind(macro.keybind);
                        setEditLoop(macro.loop_count);
                        setEditDelay(macro.delay_between);
                      }} className="pill-button p-2" title="Edit">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setExpandedMacro(isExpanded ? null : macro.id)}
                        className="pill-button p-2"
                        title="Details"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => exportMacro(macro)} className="pill-button p-2" title="Export">
                        <Upload className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => duplicateMacro(macro)} className="pill-button p-2" title="Duplicate">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMacro(macro.id)}
                        className="pill-button p-2 hover:border-red-400/20 hover:bg-red-500/5"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-400/60" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <div className="text-[10px] text-white/30 mb-2">Event Sequence ({macro.sequence.length} total)</div>
                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {macro.sequence.slice(0, 50).map((ev, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] text-white/50 px-2 py-1 rounded hover:bg-white/[0.02]">
                            <span className="text-white/15 w-5 shrink-0">#{i + 1}</span>
                            <span className="text-stone-300/60 w-20 shrink-0">{ev.event_type}</span>
                            {ev.key && <span className="text-white/70 font-mono text-[10px]">{ev.key}</span>}
                            {ev.x != null && <span className="text-white/30">({ev.x},{ev.y})</span>}
                            <span className="text-white/15 ml-auto">{ev.duration_ms}ms</span>
                          </div>
                        ))}
                        {macro.sequence.length > 50 && (
                          <div className="text-[10px] text-white/20 text-center py-1">+{macro.sequence.length - 50} more events</div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
