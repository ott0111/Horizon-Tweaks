'use client';

import { useEffect, useState } from 'react';

export default function SiteLoading() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'init' | 'loading' | 'done'>('init');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('loading'), 100);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        const remaining = 100 - p;
        return p + Math.max(0.5, remaining * 0.08);
      });
    }, 50);

    return () => {
      clearTimeout(t1);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0a]">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/[0.04] rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-white/[0.03] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'impulse-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), impulse-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 50% 40% at 50% 50%, black 20%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* Animated logo ring */}
        <div className="relative mb-8">
          {/* Outer ring */}
          <svg className="size-20" viewBox="0 0 80 80">
            <defs>
              <linearGradient id="loader-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00A3FF" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00A3FF" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {/* Background circle */}
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
            {/* Progress impulse */}
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="url(#loader-gradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
            />
            {/* Glow dot at end of impulse */}
            {progress > 2 && (
              <circle
                cx={40 + 36 * Math.cos(((progress / 100) * 360 - 90) * (Math.PI / 180))}
                cy={40 + 36 * Math.sin(((progress / 100) * 360 - 90) * (Math.PI / 180))}
                r="2"
                fill="#00A3FF"
                className="filter blur-[2px]"
              />
            )}
          </svg>

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/app-icon.png" alt="" className="size-12 opacity-80" />
          </div>
        </div>

        {/* Brand name */}
        <div className="mb-6">
          <span className="font-display text-lg font-bold text-white tracking-tight">
            Impulse<span className="text-white/45 font-normal"> Tweaks</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-40 h-[2px] bg-white/[0.08] rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-100 ease-out"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: 'impulse-gradient(90deg, #00A3FF, #a855f7)',
            }}
          />
        </div>

        {/* Progress text */}
        <div className="flex items-center gap-2 text-[10px] font-medium text-white/35 uppercase tracking-[0.2em]">
          <span>{Math.round(Math.min(progress, 100))}%</span>
          <span className="text-white/10">&middot;</span>
          <span>{progress < 30 ? 'Initializing' : progress < 70 ? 'Loading modules' : progress < 95 ? 'Almost ready' : 'Ready'}</span>
        </div>
      </div>
    </div>
  );
}
