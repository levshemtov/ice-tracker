'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Beer, Lock, RefreshCw, Clock, Trophy } from 'lucide-react';

// Define the shape of an Ice Record
interface IceLog {
  id: number;
  roster_id: number;
  team_name: string;
  player_name: string;
  week_incurred: number;
  score: number;
  type: 'PRINCIPAL' | 'INTEREST';
  parent_id: number | null;
  status: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [ices, setIces] = useState<IceLog[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [timeLeft, setTimeLeft] = useState("Calculatng...");

  // 1. Initial Load
  useEffect(() => {
    fetchData();
    // Start the countdown timer
    const timer = setInterval(calculateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase
      .from('ice_log')
      .select('*')
      .eq('status', 'PENDING');
    
    if (data) setIces(data as IceLog[]);
  };

  // 2. Sync Logic
  const handleSync = async () => {
    setLoading(true);
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentWeek }),
      });
      await fetchData(); // Refresh data after sync
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // 3. Mark Complete
  const markComplete = async (id: number) => {
    await supabase
      .from('ice_log')
      .update({ status: 'COMPLETE', completed_at: new Date().toISOString() })
      .eq('id', id);
    fetchData(); // Optimistic update would be faster, but this ensures accuracy
  };

  // 4. Countdown Logic: Target Monday Midnight (Tuesday 00:00:00)
  const calculateCountdown = () => {
    const now = new Date();
    const d = new Date();
    
    // Logic: Find the next Tuesday (Day 2)
    // If today is Tuesday (2), we want next Tuesday (+7 days)
    // If today is Monday (1), we want tomorrow (+1 day)
    const currentDay = d.getDay(); // 0=Sun, 1=Mon, 2=Tue...
    const targetDay = 2; // Tuesday
    
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) {
      daysUntil += 7;
    }

    // However, if it is currently Monday (1), the math above gives 1 day.
    // We want Monday Night / Tuesday Morning 00:00. 
    // If it is currently Tuesday (2), daysUntil is 7 (next week).
    
    d.setDate(d.getDate() + daysUntil);
    d.setHours(0, 0, 0, 0); // Set to Midnight
    
    // If we are currently "On" Tuesday (e.g. 1AM), the logic above might push to next week.
    // If we want Monday Midnight (aka Tuesday 00:00), we just need to target the very next occurrence of Day 2 00:00.
    
    const diff = d.getTime() - now.getTime();
    
    // If diff is practically 7 days, check if we accidentally skipped "today" if today was Tuesday? 
    // (Wait, no, if it's Tuesday 1AM, the deadline passed 1 hour ago, so next deadline IS next week. Logic holds.)

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
  };

  // Group teams
  const teamNames = Array.from(new Set(ices.map(i => i.team_name)));

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* --- HEADER --- */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 flex flex-col md:flex-row items-center justify-center gap-3">
            <Beer className="w-12 h-12 text-blue-500" /> 
            <span>Ice Tracker</span>
          </h1>
          
          {/* Countdown Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 inline-block w-full md:w-auto min-w-[300px]">
             <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">
                <Clock size={16} /> Interest Countdown
             </div>
             <div className="text-4xl font-mono font-bold text-red-500 tabular-nums tracking-tight">
               {timeLeft}
             </div>
             <div className="text-xs text-slate-400 mt-2">Deadline: Monday Night (Midnight)</div>
          </div>
        </div>

        {/* --- CONTROLS --- */}
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col items-center">
            <label className="text-xs text-slate-400 font-bold uppercase mb-1">Set NFL Week</label>
            <input 
              type="number" 
              value={currentWeek} 
              onChange={(e) => setCurrentWeek(Number(e.target.value))}
              className="border-2 border-slate-200 focus:border-blue-500 outline-none p-2 rounded-lg w-24 font-bold text-center text-xl"
              min={1} max={18}
            />
          </div>
          <button 
            onClick={handleSync}
            disabled={loading}
            className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-200"
          >
            {loading ? <RefreshCw className="animate-spin" /> : <RefreshCw />} 
            {loading ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>

        {/* --- THE LEDGER --- */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="text-yellow-500" /> The Ledger
          </h2>
          
          {teamNames.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-slate-500 font-medium">The league is clean. No Ices owed!</div>
            </div>
          )}
          
          <div className="grid gap-6">
            {teamNames.map(team => {
              const teamIces = ices.filter(i => i.team_name === team);
              const interest = teamIces.filter(i => i.type === 'INTEREST');
              const principal = teamIces.filter(i => i.type === 'PRINCIPAL');
              const hasInterest = interest.length > 0;

              return (
                <div key={team} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Team Header */}
                  <div className="bg-slate-100/50 p-4 flex justify-between items-center border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">{team}</h3>
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                      {teamIces.length} Owed
                    </span>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    {/* INTEREST ITEMS */}
                    {interest.map(ice => (
                      <div key={ice.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="bg-red-200 p-2 rounded-lg">
                            <Clock size={18} className="text-red-700" />
                          </div>
                          <div>
                            <span className="block text-red-700 font-bold text-sm">INTEREST PENALTY</span>
                            <span className="text-xs text-red-400">From Week {ice.week_incurred} Principal</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => markComplete(ice.id)}
                          className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                        >
                          Complete
                        </button>
                      </div>
                    ))}

                    {/* PRINCIPAL ITEMS */}
                    {principal.map(ice => (
                      <div key={ice.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Beer size={18} className="text-blue-600" />
                          </div>
                          <div>
                            <span className="block font-bold text-slate-700 text-sm">Week {ice.week_incurred}: {ice.player_name}</span>
                            <span className="text-xs text-slate-400 font-mono">{ice.score} Points</span>
                          </div>
                        </div>
                        
                        {hasInterest ? (
                          <button disabled className="bg-slate-100 text-slate-400 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 cursor-not-allowed">
                            <Lock size={14} /> Locked
                          </button>
                        ) : (
                          <button 
                            onClick={() => markComplete(ice.id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  );
}