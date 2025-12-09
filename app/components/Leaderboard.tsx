import { Trophy } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
}

export const Leaderboard = ({ leaderboard }: LeaderboardProps) => {
  return (
    <div className="bg-gradient-to-r from-blue-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-700">
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <Trophy className="text-yellow-400" />
        <h3 className="font-bold text-lg">Season Leaders (Most Drank)</h3>
      </div>

      {leaderboard.length === 0 ? (
        // FIXED: Added 'min-h-[3.5rem]' (h-14) and 'flex' to exactly match the height/layout of a player card.
        <div className="relative z-10 bg-white/10 p-3 rounded-lg border border-white/10 text-center backdrop-blur-sm flex flex-col justify-center items-center min-h-[3.5rem]">
          <p className="text-slate-200 font-medium text-sm">No ices cleared yet this season.</p>
          <p className="text-xs text-slate-400">Be the first to claim glory!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          {leaderboard.slice(0, 3).map((entry, index) => (
            // Player Card (Reference: p-3, with h-8 icon inside)
            <div key={entry.team_name} className="bg-white/10 p-3 rounded-lg backdrop-blur-sm flex items-center gap-3 border border-white/10 min-h-[3.5rem]">
              <div className={`font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full ${index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-400 text-orange-900'}`}>
                {index + 1}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{entry.team_name}</div>
                <div className="text-xs opacity-70">
                  {entry.count} {entry.count === 1 ? 'Ice' : 'Ices'} Cleared
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
    </div>
  );
};