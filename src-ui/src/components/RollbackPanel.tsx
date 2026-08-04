import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RotateCcw, Trash2, Search, Clock, Shield, AlertTriangle, CheckCircle, XCircle, Plus, X, HardDrive, RefreshCw, Camera } from 'lucide-react';

interface Snapshot {
  id: string;
  name: string;
  description: string;
  date: string;
  status: string;
  type: string;
}

export default function RollbackPanel() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSnapshots, setSelectedSnapshots] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [needsAdmin, setNeedsAdmin] = useState(false);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const restartAsAdmin = async () => {
    try {
      await invoke('restart_as_admin');
    } catch {}
  };

  const load = async () => {
    try {
      const list = await invoke<Snapshot[]>('list_snapshots');
      const formattedSnapshots: Snapshot[] = list.map((item, index) => ({
        id: item.id || `snapshot-${index}`,
        name: item.name || `Snapshot ${index + 1}`,
        description: item.description || 'System restore point',
        date: item.date || new Date().toLocaleDateString(),
        status: item.status || 'Available',
        type: item.type || 'System',
      }));
      setSnapshots(formattedSnapshots);
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredSnapshots = snapshots.filter(snapshot =>
    snapshot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    snapshot.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSnapshotSelection = (id: string) => {
    const newSelected = new Set(selectedSnapshots);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedSnapshots(newSelected);
  };

  const selectAll = () => setSelectedSnapshots(new Set(filteredSnapshots.map(s => s.id)));
  const deselectAll = () => setSelectedSnapshots(new Set());

  const createSnapshot = async () => {
    if (!snapshotName.trim()) {
      setNotification({ type: 'error', message: 'Please enter a name for the snapshot' });
      return;
    }
    setCreating(true);
    try {
      const msg = await invoke<string>('create_snapshot', {
        name: snapshotName.trim(),
        description: snapshotDescription.trim() || 'Manual backup'
      });
      setNotification({ type: 'success', message: msg });
      setNeedsAdmin(false);
      setShowCreateModal(false);
      setSnapshotName('');
      setSnapshotDescription('');
      await load();
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : 'Failed to create snapshot';
      setNotification({ type: 'error', message: msg });
      setNeedsAdmin(msg.toLowerCase().includes('administrator') || msg.toLowerCase().includes('admin'));
    } finally {
      setCreating(false);
    }
  };

  const rollback = async (id: string) => {
    try {
      await invoke('rollback_snapshot', { id });
      setNotification({ type: 'success', message: 'Snapshot rolled back successfully' });
      setNeedsAdmin(false);
      await load();
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : 'Rollback failed';
      setNotification({ type: 'error', message: msg });
      setNeedsAdmin(msg.toLowerCase().includes('administrator') || msg.toLowerCase().includes('admin'));
    }
  };

  const remove = async (id: string) => {
    try {
      await invoke('delete_snapshot', { id });
      setNotification({ type: 'success', message: 'Snapshot deleted' });
      await load();
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : 'Delete failed';
      setNotification({ type: 'error', message: msg });
    }
  };

  const rollbackSelected = async () => {
    try {
      for (const id of selectedSnapshots) {
        await invoke('rollback_snapshot', { id });
      }
      setNotification({ type: 'success', message: `${selectedSnapshots.size} snapshot(s) rolled back` });
      setNeedsAdmin(false);
      setSelectedSnapshots(new Set());
      await load();
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : 'Batch rollback failed';
      setNotification({ type: 'error', message: msg });
      setNeedsAdmin(msg.toLowerCase().includes('administrator') || msg.toLowerCase().includes('admin'));
    }
  };

  const deleteSelected = async () => {
    try {
      for (const id of selectedSnapshots) {
        await invoke('delete_snapshot', { id });
      }
      setNotification({ type: 'success', message: `${selectedSnapshots.size} snapshot(s) deleted` });
      setSelectedSnapshots(new Set());
      await load();
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : 'Batch delete failed';
      setNotification({ type: 'error', message: msg });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'text-stone-300';
      case 'Applied': return 'text-stone-300';
      case 'Failed': return 'text-rose-400';
      default: return 'text-white/40';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Available': return <CheckCircle className="size-4" />;
      case 'Applied': return <Shield className="size-4" />;
      case 'Failed': return <XCircle className="size-4" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'System': return 'text-stone-300 bg-stone-300/10';
      case 'Registry': return 'text-stone-300 bg-stone-300/10';
      case 'Network': return 'text-green-400 bg-green-500/10';
      default: return 'text-white/40 bg-white/[0.04]';
    }
  };

  const stats = [
    { label: 'Total Snapshots', value: snapshots.length, icon: HardDrive, color: 'text-stone-300' },
    { label: 'Available', value: snapshots.filter(s => s.status === 'Available').length, icon: CheckCircle, color: 'text-stone-300' },
    { label: 'Applied', value: snapshots.filter(s => s.status === 'Applied').length, icon: Shield, color: 'text-stone-300' },
    { label: 'Failed', value: snapshots.filter(s => s.status === 'Failed').length, icon: AlertTriangle, color: 'text-rose-400' },
  ];

  return (
    <div className="space-y-5">
      {/* Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${
          notification.type === 'success' ? 'bg-stone-300/90 text-stone-950' : 'bg-rose-500/90 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="size-4" /> : <AlertTriangle className="size-4" />}
          {notification.message}
        </div>
      )}

      {/* Admin Restart Prompt */}
      {needsAdmin && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm">
          <Shield className="size-5 text-rose-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-rose-400">Administrator Required</p>
            <p className="text-[10px] text-rose-300/60 mt-0.5">Rollback and snapshot operations need admin rights. Restart the app as Administrator.</p>
          </div>
          <button
            onClick={restartAsAdmin}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-medium hover:bg-rose-500/30 transition-all shrink-0"
          >
            <Shield className="size-3.5" />
            Restart as Admin
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCcw className="size-7 text-stone-300" />
          <div>
            <h1 className="text-2xl font-bold text-white">Rollback Manager</h1>
            <p className="text-xs text-white/50 mt-0.5">Manage system restore points and snapshots</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-white/[0.06] text-white/40 hover:text-white hover:border-white/[0.12] transition-colors rounded-xl">
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="pill-button">
            <Plus className="size-3.5" />
            Create Snapshot
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass-card p-4 flex items-center gap-3">
              <Icon className={`size-8 ${s.color}`} />
              <div>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-[10px] text-white/40">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search + Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/50" />
          <input
            type="text"
            placeholder="Search snapshots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button onClick={selectAll} className="text-white/40 hover:text-white transition-colors">Select All</button>
          <span className="text-white/20">|</span>
          <button onClick={deselectAll} className="text-white/40 hover:text-white transition-colors">Deselect</button>
          {selectedSnapshots.size > 0 && (
            <>
              <span className="text-white/20">|</span>
              <span className="text-stone-300 font-medium">{selectedSnapshots.size} selected</span>
            </>
          )}
        </div>

        {selectedSnapshots.size > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={rollbackSelected} className="pill-button">
              <RotateCcw className="size-3.5" />
              Rollback Selected
            </button>
            <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-colors rounded-xl">
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Snapshot List */}
      <div className="glass-panel overflow-hidden">
        {filteredSnapshots.length === 0 ? (
          <div className="p-10 text-center">
            <HardDrive className="size-12 text-white/20 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Snapshots Found</h3>
            <p className="text-xs text-white/40">
              {searchQuery ? 'Try adjusting your search terms' : 'No snapshots available. Create a snapshot to get started.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredSnapshots.map((snapshot) => {
              const isSelected = selectedSnapshots.has(snapshot.id);
              return (
                <div
                  key={snapshot.id}
                  onClick={() => toggleSnapshotSelection(snapshot.id)}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-white/[0.03]' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div onClick={e => e.stopPropagation()}>
                    <div className={`size-5 flex items-center justify-center rounded-md border-2 transition-all ${
                      isSelected ? 'bg-stone-300 border-white/[0.06]' : 'border-white/[0.15]'
                    }`}>
                      {isSelected && <CheckCircle className="size-3.5 text-black" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 items-center">
                    <div className="sm:col-span-2">
                      <div className="text-sm font-semibold text-white truncate">{snapshot.name}</div>
                      <div className="text-xs text-white/50 truncate">{snapshot.description}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/40">
                      <Clock className="size-3 shrink-0" />
                      {snapshot.date}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${getStatusColor(snapshot.status)}`}>
                      {getStatusIcon(snapshot.status)}
                      {snapshot.status}
                    </div>
                    <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center self-start w-fit ${getTypeColor(snapshot.type)}`}>
                      {snapshot.type}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => rollback(snapshot.id)}
                      className="p-2 rounded-lg text-white/40 hover:text-stone-300 hover:bg-stone-300/10 transition-all"
                      title="Rollback"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                    <button
                      onClick={() => remove(snapshot.id)}
                      className="p-2 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Snapshot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-md bg-[#0c0f14] rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Top accent line */}
            <div className="h-[2px] bg-gradient-to-r from-stone-300/0 via-stone-300/60 to-stone-400/0" />

            <div className="p-7">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-xl bg-stone-300/10 border border-white/[0.06] flex items-center justify-center">
                    <Camera className="size-5 text-stone-300" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Create Snapshot</h2>
                    <p className="text-[11px] text-white/35 mt-0.5">Back up your system state before changes</p>
                  </div>
                </div>
                <button
                  disabled={creating}
                  onClick={() => !creating && setShowCreateModal(false)}
                  className="size-8 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all disabled:opacity-30"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block mb-2">Name</label>
                  <input
                    type="text"
                    value={snapshotName}
                    onChange={(e) => setSnapshotName(e.target.value)}
                    placeholder="e.g. Before driver update"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-white/20 outline-none focus:border-white/[0.08] focus:bg-white/[0.04] transition-all disabled:opacity-40"
                    disabled={creating}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider block mb-2">Description</label>
                  <textarea
                    value={snapshotDescription}
                    onChange={(e) => setSnapshotDescription(e.target.value)}
                    placeholder="What changes are you about to make?"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-white/20 outline-none focus:border-white/[0.08] focus:bg-white/[0.04] transition-all resize-none disabled:opacity-40"
                    disabled={creating}
                  />
                </div>

                {/* Progress */}
                {creating && (
                  <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-stone-300/[0.06] border border-white/[0.06]">
                    <div className="relative size-5">
                      <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-stone-300 animate-spin" />
                    </div>
                    <div>
                      <span className="text-[13px] text-stone-300 font-medium block">Creating snapshot...</span>
                      <span className="text-[11px] text-stone-300/40">Exporting registry keys and config files</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    disabled={creating || !snapshotName.trim()}
                    onClick={createSnapshot}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-300 text-black text-sm font-semibold hover:bg-stone-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {creating ? (
                      <>
                        <div className="size-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Camera className="size-4" />
                        Create Snapshot
                      </>
                    )}
                  </button>
                  <button
                    disabled={creating}
                    onClick={() => !creating && setShowCreateModal(false)}
                    className="px-5 py-3 rounded-xl border border-white/[0.06] text-sm font-medium text-white/50 hover:text-white hover:bg-white/[0.03] transition-all disabled:opacity-30"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
