import { ShieldAlert, Camera, X } from 'lucide-react';

interface SnapshotModalProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SnapshotModal({ count, onConfirm, onCancel }: SnapshotModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel p-8 max-w-lg w-full space-y-6 shadow-2xl shadow-rose-500/5 border border-rose-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-rose-500/15 flex items-center justify-center">
              <ShieldAlert className="size-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">High-Risk Tweaks Detected</h2>
              <p className="text-xs text-white/40 mt-0.5">These changes can affect system stability</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-rose-500/8 border border-rose-500/15 space-y-2">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-rose-400 text-sm mb-1">Warning</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                You're about to apply <span className="text-rose-400 font-semibold">{count}</span> high-risk tweak(s).
                These changes modify critical system settings and may impact stability.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-white/70 font-medium">Create a snapshot before applying?</p>
          <p className="text-xs text-white/40 leading-relaxed">
            A snapshot captures your current registry state and system configuration so you can
            revert these changes if something goes wrong.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onConfirm} className="pill-button flex-1">
            <Camera className="size-4" />
            Create Snapshot & Apply
          </button>
          <button onClick={onCancel} className="flex-1 rounded-xl border border-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors">
            Apply Without Snapshot
          </button>
        </div>
      </div>
    </div>
  );
}
