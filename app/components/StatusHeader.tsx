import { Calendar, RefreshCw } from 'lucide-react';

interface StatusHeaderProps {
  detectedWeek: number | null;
  detectedSeason: string;
  loading: boolean;
  onSync: () => void;
}

export const StatusHeader = ({ detectedWeek, detectedSeason, loading, onSync }: StatusHeaderProps) => (
  <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 gap-4">
    <div className="flex items-center gap-3">
      <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-700 dark:text-green-400">
        <Calendar size={24} />
      </div>
      <div className="text-left">
        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current NFL State</div>
        <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">
          {detectedWeek ? `Week ${detectedWeek} • ${detectedSeason}` : <span className="text-slate-400 italic font-normal">Syncing League Info...</span>}
        </div>
      </div>
    </div>

    <button onClick={onSync} disabled={loading} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 text-sm font-semibold" title="Force check for new scores">
      {loading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
      {loading ? 'Updating...' : 'Force Sync'}
    </button>
  </div>
);