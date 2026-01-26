/**
 * CommandPalette.tsx
 * 
 * Quick navigation via Cmd+K (Mac) or Ctrl+K (Windows)
 * 
 * Features:
 * - Fuzzy search through pages
 * - Theme toggle action
 * - Keyboard navigation (arrows, enter, escape)
 * 
 * DESIGN:
 * - Minimal, monochromatic styling
 * - Backdrop blur for focus
 * - No flashy animations
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface CommandItem {
    id: string;
    label: string;
    description?: string;
    action: () => void;
    icon?: string;
}

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Navigation commands
    const commands: CommandItem[] = [
        {
            id: 'home',
            label: 'Home',
            description: 'Go to homepage',
            icon: '🏠',
            action: () => navigate('/'),
        },
        {
            id: 'portfolio',
            label: 'Portfolio',
            description: 'View projects',
            icon: '💼',
            action: () => navigate('/portfolio'),
        },
        {
            id: 'blog',
            label: 'Blog',
            description: 'Read posts',
            icon: '✍️',
            action: () => navigate('/blog'),
        },
        {
            id: 'about',
            label: 'About',
            description: 'Learn about me',
            icon: '👤',
            action: () => navigate('/about'),
        },
        {
            id: 'resume',
            label: 'Resume',
            description: 'View resume',
            icon: '📄',
            action: () => navigate('/resume'),
        },
        {
            id: 'theme-toggle',
            label: 'Toggle Theme',
            description: 'Switch light/dark mode',
            icon: '🌓',
            action: () => {
                const isDark = document.documentElement.classList.contains('dark');
                document.documentElement.classList.toggle('dark', !isDark);
                localStorage.setItem('mode', isDark ? 'light' : 'dark');
                setIsOpen(false);
            },
        },
    ];

    // Simple fuzzy filter
    const filteredCommands = commands.filter(cmd => {
        const search = query.toLowerCase();
        return (
            cmd.label.toLowerCase().includes(search) ||
            cmd.description?.toLowerCase().includes(search)
        );
    });

    const navigate = (path: string) => {
        window.location.href = path;
    };

    // Keyboard shortcut handler
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsOpen(prev => !prev);
            setQuery('');
            setSelectedIndex(0);
        }
    }, []);

    // Input keyboard navigation
    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
        }
    };

    // Register global keyboard shortcut
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="command-palette-backdrop"
                onClick={() => setIsOpen(false)}
            />

            {/* Palette */}
            <div className="command-palette" role="dialog" aria-modal="true">
                <input
                    ref={inputRef}
                    type="text"
                    className="command-palette-input"
                    placeholder="Type a command or search..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    aria-label="Search commands"
                />

                <div className="command-palette-list">
                    {filteredCommands.length === 0 ? (
                        <div className="command-palette-empty">No results found</div>
                    ) : (
                        filteredCommands.map((cmd, index) => (
                            <button
                                key={cmd.id}
                                className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={cmd.action}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <span className="command-palette-icon">{cmd.icon}</span>
                                <div className="command-palette-content">
                                    <span className="command-palette-label">{cmd.label}</span>
                                    {cmd.description && (
                                        <span className="command-palette-desc">{cmd.description}</span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="command-palette-footer">
                    <span><kbd>↑↓</kbd> Navigate</span>
                    <span><kbd>↵</kbd> Select</span>
                    <span><kbd>Esc</kbd> Close</span>
                </div>
            </div>

            <style>{`
        .command-palette-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 999;
        }

        .command-palette {
          position: fixed;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 90vw;
          max-width: 500px;
          background: var(--color-bg-primary, #F8F7F4);
          border: 1px solid var(--color-border, #D1CCC0);
          border-radius: 12px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
          z-index: 1000;
          overflow: hidden;
        }

        .command-palette-input {
          width: 100%;
          padding: 16px 20px;
          font-size: 16px;
          font-family: inherit;
          border: none;
          border-bottom: 1px solid var(--color-border, #D1CCC0);
          background: transparent;
          color: var(--color-text-primary, #1C1C1E);
          outline: none;
        }

        .command-palette-input::placeholder {
          color: var(--color-text-tertiary, #6C6C70);
        }

        .command-palette-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .command-palette-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 20px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          color: var(--color-text-primary, #1C1C1E);
        }

        .command-palette-item:hover,
        .command-palette-item.selected {
          background: var(--color-bg-secondary, #EEEAE4);
        }

        .command-palette-icon {
          font-size: 18px;
          width: 24px;
          text-align: center;
        }

        .command-palette-content {
          display: flex;
          flex-direction: column;
        }

        .command-palette-label {
          font-weight: 500;
          color: var(--color-text-primary, #1C1C1E);
        }

        .command-palette-desc {
          font-size: 13px;
          color: var(--color-text-tertiary, #6C6C70);
        }

        .command-palette-empty {
          padding: 24px;
          text-align: center;
          color: var(--color-text-tertiary, #6C6C70);
        }

        .command-palette-footer {
          display: flex;
          gap: 16px;
          padding: 10px 20px;
          border-top: 1px solid var(--color-border, #D1CCC0);
          font-size: 12px;
          color: var(--color-text-tertiary, #6C6C70);
        }

        .command-palette-footer kbd {
          padding: 2px 6px;
          background: var(--color-bg-tertiary, #E4DFD7);
          border-radius: 4px;
          font-family: inherit;
          font-size: 11px;
        }

        .dark .command-palette {
          background: var(--color-bg-primary, #1C1C1E);
        }

        .dark .command-palette-item:hover,
        .dark .command-palette-item.selected {
          background: var(--color-bg-secondary, #252527);
        }
      `}</style>
        </>
    );
}
