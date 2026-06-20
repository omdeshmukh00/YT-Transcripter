'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load initial theme preference from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      const timer = setTimeout(() => {
        setTheme(savedTheme);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    const applyThemeClass = (currentTheme: Theme) => {
      if (currentTheme === 'dark') {
        root.classList.add('dark');
      } else if (currentTheme === 'light') {
        root.classList.add('light');
      } else {
        // System preference detection
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.add('light');
        }
      }
    };

    applyThemeClass(theme);
    localStorage.setItem('theme', theme);

    // Listen for system color preference changes if 'system' is active
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => applyThemeClass('system');
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    }
  }, [theme]);

  // Click outside to close dropdown handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (selectedTheme: Theme) => {
    switch (selectedTheme) {
      case 'light':
        return <FiSun className="w-4 h-4 text-amber-500" />;
      case 'dark':
        return <FiMoon className="w-4 h-4 text-violet-400" />;
      case 'system':
        return <FiMonitor className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getThemeLabel = (selectedTheme: Theme) => {
    switch (selectedTheme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 font-sans" ref={dropdownRef}>
      {/* Circular Floating glassmorphic trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-white dark:hover:bg-zinc-800 hover:scale-105 active:scale-[0.97] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur-md cursor-pointer outline-none"
        title="Toggle Theme"
        aria-label="Toggle Theme"
      >
        {getThemeIcon(theme)}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 p-1.5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)] backdrop-blur-lg animate-fade-in flex flex-col gap-1 z-50">
          {(['light', 'dark', 'system'] as Theme[]).map((mode) => {
            const isActive = theme === mode;
            return (
              <button
                key={mode}
                onClick={() => {
                  setTheme(mode);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold w-full text-left transition-colors cursor-pointer outline-none ${
                  isActive
                    ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {getThemeIcon(mode)}
                <span>{getThemeLabel(mode)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
