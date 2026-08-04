import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface ThemeContextValue {
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  accentColor: '#d6d1ca',
  setAccentColor: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function applyAccent(color: string) {
  const root = document.documentElement;
  root.style.setProperty('--accent', color);
  root.style.setProperty('--accent-rgb', hexToRgb(color));
}

export const ACCENT_PRESETS = [
  { name: 'Pearl', color: '#f5f2eb' },
  { name: 'Silver', color: '#d6d1ca' },
  { name: 'Mist', color: '#c7c3bd' },
  { name: 'Platinum', color: '#a9a29b' },
  { name: 'Coal', color: '#2f3136' },
  { name: 'Ash', color: '#6b7280' },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accentColor, setAccentColorState] = useState(() => {
    return localStorage.getItem('horizon-accent-color') || '#d6d1ca';
  });

  useEffect(() => {
    applyAccent(accentColor);
  }, [accentColor]);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    localStorage.setItem('horizon-accent-color', color);
  }, []);

  return (
    <ThemeContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
