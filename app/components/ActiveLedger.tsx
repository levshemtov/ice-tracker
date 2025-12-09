import { Beer, Lock, RefreshCw, Flame, Upload, Video, ChevronDown, ChevronUp } from 'lucide-react';
import { IceLog } from '../types';

interface ActiveLedgerProps {
  ices: IceLog[];
  expandedTeams: Set<string>;
  toggleTeam: (teamName: string) => void;
  uploadingId: number | null;
  triggerUpload: (id: number) => void;
  payOneInterest: (teamInterestIces: IceLog[]) => void;
}

export const ActiveLedger = ({ ices, expandedTeams, toggleTeam, uploadingId, triggerUpload, payOneInterest }: ActiveLedgerProps) => {
  const activeTeamNames = Array.from(new Set(ices.map(i => i.team_name)));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {activeTeamNames.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-slate-500 dark:text-slate-400 font-medium">The league is clean. No Ices owed!</div>
        </div>
      )}

      <div className="grid gap-4">
        {activeTeamNames.map(team => {
          const teamIces = ices.filter(i => i.team_name === team);
          const interest = teamIces.filter(i => i.type === 'INTEREST');
          const principal = teamIces.filter(i => i.type === 'PRINCIPAL');
          const hasInterest = interest.length > 0;
          const isExpanded = expandedTeams.has(team);

          return (
            <div key={team} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">
              <div onClick={() => toggleTeam(team)} className="bg-slate-50 dark:bg-slate-800/50 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{team}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${teamIces.length > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {teamIces.length} Pending
                </span>
              </div>

              {isExpanded && (
                <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                  {hasInterest && (
                    <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-200 dark:bg-red-900/50 p-3 rounded-full"><Flame size={24} className="text-red-600 dark:text-red-400" /></div>
                        <div>
                          <h4 className="text-red-700 dark:text-red-400 font-extrabold text-lg">Interest Penalty</h4>
                          <p className="text-red-500 dark:text-red-300 text-sm font-medium">Clear <span className="font-black">{interest.length}</span> interest ices first.</p>
                        </div>
                      </div>
                      <button onClick={() => payOneInterest(interest)} disabled={uploadingId !== null} className="w-full sm:w-auto bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 shadow-sm transition-all flex items-center justify-center gap-2">
                        {uploadingId && interest.some(i => i.id === uploadingId) ? <><RefreshCw className="animate-spin" size={18} /> Uploading...</> : <><Upload size={18} /> Clear 1 Ice (-1)</>}
                      </button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {principal.map(ice => (
                      <div key={ice.id} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg"><Beer size={18} className="text-blue-600 dark:text-blue-400" /></div>
                          <div>
                            <span className="block font-bold text-slate-700 dark:text-slate-200 text-sm">Week {ice.week_incurred}: {ice.player_name}</span>
                            <span className="text-xs text-slate-400 font-mono">{ice.score} Points</span>
                          </div>
                        </div>
                        {hasInterest ? (
                          <button disabled className="bg-slate-100 dark:bg-slate-800 text-slate-400 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 cursor-not-allowed border border-slate-200 dark:border-slate-700"><Lock size={14} /> Locked</button>
                        ) : (
                          <button onClick={() => triggerUpload(ice.id)} disabled={uploadingId !== null} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2">
                            {uploadingId === ice.id ? <><RefreshCw className="animate-spin" size={14} /> Uploading...</> : <><Video size={14} /> Proof & Clear</>}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};