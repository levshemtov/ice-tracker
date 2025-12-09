"use client";
import React from "react";
import { Clock, Moon, Sun, Beer } from "lucide-react";

type Props = {
  mounted: boolean;
  theme: string | undefined;
  setTheme: (t: string) => void;
  timeLeft: string;
  detectedWeek: number | null;
  detectedSeason: string;
  handleSync: (bg?: boolean) => void;
  loading: boolean;
};

export default function Header({ mounted, theme, setTheme, timeLeft, detectedWeek, detectedSeason, handleSync, loading }: Props) {
  return (
    <>
      <div className="flex justify-end">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-700 dark:text-slate-200 font-bold text-sm hover:scale-105 transition-transform"
            title="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-slate-700" />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        )}
      </div>

      <div className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white flex flex-col md:flex-row items-center justify-center gap-3">
          <Beer className="w-12 h-12 text-blue-500" />
          <span>Ice Tracker</span>
        </h1>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 inline-block w-full md:w-auto min-w-[300px]">
          <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">
            <Clock size={16} /> Interest Countdown
          </div>
          <div className="text-4xl font-mono font-bold text-red-500 tabular-nums tracking-tight">{timeLeft}</div>
          <div className="text-xs text-slate-400 mt-2">{detectedWeek ? `Week ${detectedWeek} • ${detectedSeason}` : 'Deadline: Monday Night (Midnight)'}</div>
        </div>
      </div>
    </>
  );
}
