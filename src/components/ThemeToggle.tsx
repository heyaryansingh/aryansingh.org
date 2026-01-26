/**
 * Theme Toggle Component (React Island)
 * 
 * Simple light/dark/auto mode toggle.
 * No color themes - spacetime lines vary by page naturally.
 */

import { useState, useEffect } from 'react';

type Mode = 'light' | 'dark' | 'auto';

const modeIcons: Record<Mode, string> = {
  light: '☀️',
  dark: '🌙',
  auto: '💻',
};

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedMode = localStorage.getItem('mode') as Mode | null;
    if (storedMode) {
      setMode(storedMode);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem('mode', mode);

    const isDark =
      mode === 'dark' ||
      (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [mode, mounted]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (!mounted || mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode, mounted]);

  const cycleMode = () => {
    setMode((prev) =>
      prev === 'light' ? 'dark' : prev === 'dark' ? 'auto' : 'light'
    );
  };

  if (!mounted) {
    return (
      <button
        className="theme-toggle"
        aria-label="Toggle theme"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1px solid var(--color-border)',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
        }}
      >
        🌙
      </button>
    );
  }

  return (
    <button
      onClick={cycleMode}
      className="theme-toggle"
      aria-label={`Current mode: ${mode}. Click to change.`}
      title={`Mode: ${mode}`}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: '1px solid var(--color-border)',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        transition: 'all 0.2s ease',
      }}
    >
      {modeIcons[mode]}
    </button>
  );
}
