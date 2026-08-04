'use client';

import { useEffect, useRef, useState } from 'react';

const SNOWFLAKES = 40;
const SYMBOLS = ['✦', '·', '♦', '⋆', '·'];

export default function Snowfall() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const container = containerRef.current;
    if (!container) return;

    const flakes: HTMLDivElement[] = [];

    for (let i = 0; i < SNOWFLAKES; i++) {
      const el = document.createElement('div');
      el.className = 'snowflake';
      el.textContent = SYMBOLS[i % SYMBOLS.length];
      el.style.left = `${Math.random() * 100}%`;
      el.style.fontSize = `${0.5 + Math.random() * 1.2}rem`;
      el.style.opacity = `${0.1 + Math.random() * 0.2}`;
      el.style.animationDuration = `${8 + Math.random() * 20}s`;
      el.style.animationDelay = `${Math.random() * 15}s`;
      el.style.transform = `scale(${0.3 + Math.random() * 0.7})`;
      container.appendChild(el);
      flakes.push(el);
    }

    return () => {
      flakes.forEach(el => el.remove());
    };
  }, [mounted]);

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[9998]" />;
}
