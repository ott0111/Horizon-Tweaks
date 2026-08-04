import { Minus, X, Maximize2, Minimize2 } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useState, useEffect } from 'react';

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    appWindow.isMaximized().then(setMaximized);
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  const toggleMaximize = async () => {
    await appWindow.toggleMaximize();
  };

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-10 px-4 select-none shrink-0 border-b border-white/[0.05] bg-surface-950/80 backdrop-blur-md"
    >
      <div data-tauri-drag-region className="flex items-center gap-2.5">
        <img src="/app-icon.png" alt="Horizon Tweaks" className="size-5" />
        <span data-tauri-drag-region className="text-xs font-semibold text-steel-300 tracking-wide">
          Horizon<span className="text-steel-500 font-normal ml-0.5">Tweaks</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); appWindow.minimize(); }}
          className="flex items-center justify-center size-7 rounded-lg text-steel-400 hover:text-steel-200 hover:bg-white/[0.04] transition-all"
        >
          <Minus className="size-3" />
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
          className="flex items-center justify-center size-7 rounded-lg text-steel-400 hover:text-steel-200 hover:bg-white/[0.04] transition-all"
        >
          {maximized ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); appWindow.close(); }}
          className="flex items-center justify-center size-7 rounded-lg text-steel-400 hover:text-white hover:bg-rose-500/20 transition-all"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}
