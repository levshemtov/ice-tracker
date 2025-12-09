"use client";
import React from "react";
import { History as HistoryIcon, ChevronDown, ChevronUp, Trash2, PlayCircle } from "lucide-react";

type IceLog = {
  id: number;
  roster_id: number;
  team_name: string;
  player_name: string;
  week_incurred: number;
  score: number;
  type: 'PRINCIPAL' | 'INTEREST';
  parent_id: number | null;
  status: string;
  proof_url?: string;
  season?: string;
  created_at: string;
  completed_at?: string;
};

export default function HistoryLedger({
  historyIces,
  expandedTeams,
  toggleTeam,
  handleUndo,
  historySeasonFilter,
  setHistorySeasonFilter
}: {
  historyIces: IceLog[];
  expandedTeams: Set<string>;
  toggleTeam: (t: string) => void;
  handleUndo: (ice: IceLog) => void;
  historySeasonFilter: string;
  setHistorySeasonFilter: (s: string) => void;
}) {
  const historyTeamNames = Array.from(new Set(historyIces.map(i => i.team_name)));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><HistoryIcon size={20}/> Season</h3>
        <select 
          value={historySeasonFilter}
          onChange={(e) => setHistorySeasonFilter(e.target.value)}
          className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-4 py-2 font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="2025">2025</option>
        </select>
      </div>

      {historyIces.length === 0 ? (
        <div className="text-center py-12 text-slate-400 italic">No completed ices found for {historySeasonFilter}.</div>
      ) : (
        <div className="grid gap-4">
          {historyTeamNames.map(team => {
            const teamHistory = historyIces.filter(i => i.team_name === team);
            const isExpanded = expandedTeams.has(team);

            return (
              <div key={team} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">
                <div 
                  onClick={() => toggleTeam(team)}
                  className="bg-slate-50 dark:bg-slate-800/50 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{team}</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-bold shadow-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    {teamHistory.length} Completed
                  </span>
                </div>

                {isExpanded && (
                  <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                    {teamHistory.map(ice => (
                      <div key={ice.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3 relative group hover:shadow-md transition-shadow">
                        <button 
                          onClick={() => handleUndo(ice)}
                          className="absolute top-2 right-2 p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="Undo / Delete"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="flex justify-between items-start pr-8">
                          <div className="text-xs text-slate-400 font-mono">
                            Completed: {new Date(ice.completed_at!).toLocaleDateString()}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${ice.type === 'PRINCIPAL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                            {ice.type}
                          </div>
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                          {ice.type === 'PRINCIPAL' ? (
                            <span>Week {ice.week_incurred}: {ice.player_name} ({ice.score} pts)</span>
                          ) : (
                            <span>Interest Payment (Week {ice.week_incurred})</span>
                          )}
                        </div>

                        {ice.proof_url ? (
                           <a href={ice.proof_url} target="_blank" rel="noopener noreferrer" className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-950 text-white py-2 rounded-lg font-bold hover:bg-slate-700 dark:hover:bg-black transition-colors">
                             <PlayCircle size={16}/> Watch Proof
                           </a>
                        ) : (
                          <div className="mt-2 w-full text-center py-2 bg-slate-100 dark:bg-slate-700/50 text-slate-400 rounded-lg text-sm italic">No Video Attached</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
