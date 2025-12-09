'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-200 font-bold text-sm hover:scale-105 transition-transform"
    >
      {theme === 'dark' ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-slate-700" />}
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
};