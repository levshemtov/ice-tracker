import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
}

const getTrophy = (index: number) => {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `${index + 1}.`;
};

export const Leaderboard = ({ leaderboard }: LeaderboardProps) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden">
      <div className="p-4 md:p-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">🏆 Season Leaderboard</h2>
        
        {leaderboard.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">
            No completed ices for this season yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {leaderboard.map((entry, index) => (
              <li key={entry.team_name} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center">
                  <span className="text-lg font-semibold w-8 text-center">{getTrophy(index)}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{entry.team_name}</span>
                </div>
                <span className="font-bold text-lg text-slate-800 dark:text-white bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-full">
                  {entry.count}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};