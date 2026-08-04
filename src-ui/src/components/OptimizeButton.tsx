import { Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

export default function OptimizeButton() {
  const [busy, setBusy] = useState(false);
  
  const onClick = async () => {
    setBusy(true);
    try {
      await invoke('apply_tweak', { id: 'batch-gaming-mode' });
    } finally {
      setBusy(false);
    }
  };
  
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="pill-button flex items-center gap-2"
    >
      <Zap className="h-5 w-5" />
      {busy ? 'Optimizing...' : 'Initialize Horizon Tweaks Optimization'}
    </button>
  );
}
