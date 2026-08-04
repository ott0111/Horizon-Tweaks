import { useState, useRef, useEffect, useCallback } from 'react';

interface LoaderProps {
  theme?: string;
  message?: string;
  onProgress?: (pct: number) => void;
}

const THEMES: Record<string, { fg: string; bg: string; glow: string; label: string }> = {
  default: { fg: 'from-chrome to-steel-400', bg: 'bg-white/[0.04]', glow: 'shadow-chrome/20', label: 'Loading' },
  tweaks: { fg: 'from-chrome to-steel-300', bg: 'bg-white/[0.04]', glow: 'shadow-chrome/20', label: 'Optimizing' },
  network: { fg: 'from-steel-300 to-steel-400', bg: 'bg-white/[0.04]', glow: 'shadow-steel-300/20', label: 'Connecting' },
  games: { fg: 'from-chrome to-steel-300', bg: 'bg-white/[0.04]', glow: 'shadow-chrome/20', label: 'Scanning' },
  debloat: { fg: 'from-steel-300 to-steel-500', bg: 'bg-white/[0.04]', glow: 'shadow-steel-400/20', label: 'Cleaning' },
  tools: { fg: 'from-steel-400 to-chrome', bg: 'bg-white/[0.04]', glow: 'shadow-steel-300/20', label: 'Preparing' },
  advanced: { fg: 'from-chrome to-steel-500', bg: 'bg-white/[0.04]', glow: 'shadow-chrome/20', label: 'Configuring' },
};

export default function AnimatedLoader({ theme = 'default', message, onProgress }: LoaderProps) {
  const t = THEMES[theme] || THEMES.default;
  const [progress, setProgress] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const animRef = useRef<number>(0);
  const callbackRef = useRef(onProgress);
  callbackRef.current = onProgress;

  // CSS-based progress animation via ref + minimal state updates
  useEffect(() => {
    const start = Date.now();
    const anim = () => {
      const elapsed = (Date.now() - start) / 1000;
      const pct = Math.min(95, 100 * (1 - Math.exp(-elapsed * 0.3)));
      progressRef.current = pct;
      // Only update React state every 5% to avoid excessive re-renders
      const rounded = Math.round(pct / 5) * 5;
      setProgress(prev => (Math.abs(prev - rounded) >= 5 ? rounded : prev));
      callbackRef.current?.(pct);
      if (pct < 95) animRef.current = requestAnimationFrame(anim);
    };
    animRef.current = requestAnimationFrame(anim);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Click/drag to change progress — uses ref for instant response, state for display
  const updateFromEvent = useCallback((clientX: number) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    progressRef.current = pct;
    setProgress(Math.round(pct));
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => updateFromEvent(e.clientX), [updateFromEvent]);
  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (e.buttons === 1) updateFromEvent(e.clientX);
  }, [updateFromEvent]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] select-none">
      <div className="w-full max-w-md space-y-4">
        {/* Progress bar — CSS-animated, no rAF re-renders */}
        <div
          ref={barRef}
          className={`relative h-8 rounded-lg cursor-pointer overflow-hidden ${t.bg} border border-white/[0.06] shadow-neo-inset`}
          onClick={handleClick}
          onMouseMove={handleDrag}
        >
          {/* Glow behind fill */}
          <div
            className={`absolute inset-0 opacity-15 blur-xl ${t.glow} transition-[width] duration-300 ease-out`}
            style={{ width: `${progress}%` }}
          />
          {/* Fill */}
          <div
            className={`h-full bg-gradient-to-r ${t.fg} transition-[width] duration-300 ease-out relative rounded-lg`}
            style={{ width: `${progress}%` }}
          >
            {/* Sheen effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />
            {/* Leading glow dot */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_12px_2px_rgba(255,255,255,0.3)]" />
          </div>
          {/* Tick marks */}
          {[25, 50, 75].map(tick => (
            <div key={tick} className="absolute top-0 bottom-0 w-px bg-white/[0.04]" style={{ left: `${tick}%` }} />
          ))}
        </div>

        {/* Percentage + message */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className={`${t.fg.split(' ')[0]} opacity-80`}>
            {message || `${t.label}...`}
          </span>
          <span className={`${t.fg.split(' ')[0]}`}>
            {progress}%
          </span>
        </div>

        {/* Sparkle particles — CSS-only, no state */}
        {progress >= 5 && (
          <div className="relative h-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-ping"
                style={{
                  left: `${10 + i * 12}%`,
                  top: `${(i % 3) * 15}px`,
                  width: 3 + (i % 3),
                  height: 3 + (i % 3),
                  backgroundColor: '#8b95a5',
                  opacity: 0.4,
                  animationDuration: `${1 + (i % 3) * 0.5}s`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="text-[9px] text-steel-600 text-center">
          click or drag to interact
        </div>
      </div>
    </div>
  );
}
