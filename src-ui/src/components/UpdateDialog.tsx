import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Download, X, Sparkles, Package } from 'lucide-react';

interface UpdateInfo {
  version: string;
  body: string;
  download_url: string;
  size: number;
}

interface UpdateDialogProps {
  update: UpdateInfo;
  onDismiss: () => void;
}

export default function UpdateDialog({ update, onDismiss }: UpdateDialogProps) {
  const [installing, setInstalling] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unlisten = listen<{ downloaded: number; total: number }>('update:progress', (e) => {
      setProgress(e.payload.downloaded);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const path = await invoke<string>('download_update', { url: update.download_url });
      await invoke('install_update', { path });
      setDone(true);
    } catch (e) {
      console.error('Update failed:', e);
      setInstalling(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="glass-panel max-w-md w-full p-6 text-center">
          <div className="size-12 rounded-full bg-stone-300/10 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="size-6 text-stone-300" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Update Installed</h3>
          <p className="text-xs text-white/50 mb-4">The app will restart to apply the update.</p>
          <button
            onClick={() => window.location.reload()}
            className="pill-button px-6"
          >
            Relaunch Now
          </button>
        </div>
      </div>
    );
  }

  function renderMarkdown(text: string): string {
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\$\$(.+?)\$\$/gs, '<pre class="text-[11px] bg-white/[0.03] rounded p-2 my-1 font-mono text-stone-300/70">$1</pre>')
      .replace(/^### (.+)$/gm, '<div class="text-sm font-bold text-white/70 mt-2 mb-1">$1</div>')
      .replace(/^## (.+)$/gm, '<div class="text-base font-bold text-white/80 mt-3 mb-1">$1</div>')
      .replace(/^# (.+)$/gm, '<div class="text-lg font-bold text-white/90 mt-3 mb-1">$1</div>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/70">$1</strong>')
      .replace(/`(.+?)`/g, '<code class="text-[10px] bg-white/[0.05] px-1 rounded text-stone-300/70">$1</code>')
      .replace(/\$(.+?)\$/g, '<span class="text-[11px] font-mono text-stone-300/70">$1</span>')
      .replace(/^- (.+)$/gm, '<div class="flex items-start gap-1.5 ml-2"><span class="text-white/20 mt-0.5">•</span><span>$1</span></div>')
      .replace(/\n/g, '<br/>');
    return html;
  }

  const percent = update.size > 0 ? Math.round((progress / update.size) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="glass-panel max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-stone-300/10 flex items-center justify-center">
              <Package className="size-5 text-stone-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Update Available</h3>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">
                v{update.version} is ready
              </p>
            </div>
          </div>
          <button onClick={onDismiss} className="text-white/50 hover:text-white/70 transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="glass-card p-3 mb-4 max-h-48 overflow-y-auto text-xs text-white/50 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(update.body || 'Bug fixes and performance improvements.') }} />

        {installing && progress > 0 && (
          <div className="mb-4">
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-300 transition-all duration-300 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-[10px] text-white/30 mt-1 text-right">{percent}%</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="pill-button flex-1"
          >
            {installing ? (
              <div className="size-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {installing ? 'Downloading...' : 'Download Update'}
          </button>
          <button
            onClick={onDismiss}
            disabled={installing}
            className="px-4 py-2.5 rounded-xl text-xs text-white/50 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.10] transition-colors disabled:opacity-50"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
