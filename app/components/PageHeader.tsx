import { Beer, Clock } from 'lucide-react';

interface PageHeaderProps {
  timeLeft: string;
}

export const PageHeader = ({ timeLeft }: PageHeaderProps) => (
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
      <div className="text-xs text-slate-400 mt-2">Deadline: Monday Night (Midnight)</div>
    </div>
  </div>
);