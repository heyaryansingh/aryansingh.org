/**
 * Theme Toggle Component (React Island)
 *
 * A client-side interactive component for toggling between light/dark/auto themes.
 * Uses React for interactivity while the rest of the site remains static.
 *
 * USAGE IN ASTRO:
 * ---
 * import ThemeToggle from '../components/ThemeToggle';
 * ---
 * <ThemeToggle client:load />
 *
 * The client:load directive tells Astro to hydrate this component immediately.
 */

import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'auto';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('auto');
  const [mounted, setMounted] = useState(false);

  // Only run on client after mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      setTheme(stored);
    }
  }, []);

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem('theme', theme);

    const isDark =
      theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [theme, mounted]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (!mounted || theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  // Cycle through themes: light -> dark -> auto -> light
  const cycleTheme = () => {
    setTheme((current) => {
      switch (current) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'auto';
        case 'auto':
          return 'light';
        default:
          return 'auto';
      }
    });
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <button
        className="theme-toggle"
        aria-label="Toggle theme"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '20px' }}>☀️</span>
      </button>
    );
  }

  const icons: Record<Theme, string> = {
    light: '☀️',
    dark: '🌙',
    auto: '💻',
  };

  const labels: Record<Theme, string> = {
    light: 'Light mode (click for dark)',
    dark: 'Dark mode (click for auto)',
    auto: 'Auto mode (click for light)',
  };

  return (
    <button
      onClick={cycleTheme}
      className="theme-toggle"
      aria-label={labels[theme]}
      title={labels[theme]}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all var(--transition-fast)',
      }}
    >
      <span style={{ fontSize: '20px' }}>{icons[theme]}</span>
    </button>
  );
}
