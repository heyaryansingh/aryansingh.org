/**
 * Theme Toggle Component (React Island)
 *
 * Controls both light/dark mode AND color theme variations.
 * - Mode: light / dark / auto (system preference)
 * - Theme: default / warm / cool
 *
 * USAGE IN ASTRO:
 * ---
 * import ThemeToggle from '../components/ThemeToggle';
 * ---
 * <ThemeToggle client:load />
 */

import { useState, useEffect, useRef } from 'react';

type Mode = 'light' | 'dark' | 'auto';
type Theme = 'default' | 'warm' | 'cool';

interface ThemeState {
  mode: Mode;
  theme: Theme;
}

const modeIcons: Record<Mode, string> = {
  light: '☀️',
  dark: '🌙',
  auto: '💻',
};

const themeColors: Record<Theme, string> = {
  default: '#6366f1', // Indigo
  warm: '#d97706',    // Amber
  cool: '#0891b2',    // Cyan
};

export default function ThemeToggle() {
  const [state, setState] = useState<ThemeState>({ mode: 'auto', theme: 'default' });
  const [mounted, setMounted] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Only run on client after mount
  useEffect(() => {
    setMounted(true);
    const storedMode = localStorage.getItem('mode') as Mode | null;
    const storedTheme = localStorage.getItem('colorTheme') as Theme | null;

    setState({
      mode: storedMode || 'auto',
      theme: storedTheme || 'default',
    });
  }, []);

  // Apply mode changes
  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem('mode', state.mode);

    const isDark =
      state.mode === 'dark' ||
      (state.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.classList.toggle('dark', isDark);
  }, [state.mode, mounted]);

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem('colorTheme', state.theme);
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme, mounted]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (!mounted || state.mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [state.mode, mounted]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cycle through modes: light -> dark -> auto -> light
  const cycleMode = () => {
    setState((prev) => ({
      ...prev,
      mode: prev.mode === 'light' ? 'dark' : prev.mode === 'dark' ? 'auto' : 'light',
    }));
  };

  const setTheme = (theme: Theme) => {
    setState((prev) => ({ ...prev, theme }));
    setShowThemeMenu(false);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="theme-toggle-container" style={{ display: 'flex', gap: '8px' }}>
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
            fontSize: '20px',
          }}
        >
          ☀️
        </button>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="theme-toggle-container"
      style={{ display: 'flex', gap: '8px', position: 'relative' }}
    >
      {/* Mode toggle (light/dark/auto) */}
      <button
        onClick={cycleMode}
        className="theme-toggle press-effect"
        aria-label={`Current mode: ${state.mode}. Click to change.`}
        title={`Mode: ${state.mode}`}
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
          fontSize: '20px',
          transition: 'all var(--transition-fast)',
        }}
      >
        {modeIcons[state.mode]}
      </button>

      {/* Theme color toggle */}
      <button
        onClick={() => setShowThemeMenu(!showThemeMenu)}
        className="theme-toggle press-effect"
        aria-label={`Current theme: ${state.theme}. Click to change.`}
        title={`Theme: ${state.theme}`}
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
        <span
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: themeColors[state.theme],
          }}
        />
      </button>

      {/* Theme dropdown menu */}
      {showThemeMenu && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: '8px',
            zIndex: 100,
            minWidth: '140px',
          }}
        >
          {(['default', 'warm', 'cool'] as Theme[]).map((theme) => (
            <button
              key={theme}
              onClick={() => setTheme(theme)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: state.theme === theme ? 'var(--color-bg-tertiary)' : 'transparent',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: themeColors[theme],
                }}
              />
              <span style={{ textTransform: 'capitalize' }}>{theme}</span>
              {state.theme === theme && <span style={{ marginLeft: 'auto' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
