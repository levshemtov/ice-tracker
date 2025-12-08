'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Beer, Lock, RefreshCw, Clock, Trophy, Flame, Upload, Video, History, PlayCircle, Calendar, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

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
  proof_url?: string;
  season?: string;
  created_at: string;
  completed_at?: string;
}

interface LeaderboardEntry {
  team_name: string;
  count: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  
  // Data State
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null); 
  const [ices, setIces] = useState<IceLog[]>([]);
  const [historyIces, setHistoryIces] = useState<IceLog[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // UI State
  const [detectedWeek, setDetectedWeek] = useState<number | null>(null);
  const [detectedSeason, setDetectedSeason] = useState<string>("2024");
  const [historySeasonFilter, setHistorySeasonFilter] = useState<string>("2024");
  const [timeLeft, setTimeLeft] = useState("Calculating...");
  
  // Collapsible State (Shared between tabs so if you expand a team in Active, they are expanded in History too)
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedIceIdRef = useRef<number | null>(null);

  // 1. INITIAL LOAD & MEMORY
  useEffect(() => {
    const cachedWeek = localStorage.getItem('detectedWeek');
    const cachedSeason = localStorage.getItem('detectedSeason');
    
    let seasonToUse = detectedSeason; 

    if (cachedWeek) setDetectedWeek(Number(cachedWeek));
    if (cachedSeason) {
      setDetectedSeason(cachedSeason);
      seasonToUse = cachedSeason;
      if (historySeasonFilter === "2024") setHistorySeasonFilter(cachedSeason);
    }

    fetchActiveData();
    fetchHistoryData();
    fetchLeaderboard(seasonToUse);

    const timer = setInterval(calculateCountdown, 1000);
    handleSync(true); 
    
    return () => clearInterval(timer);
  }, []); 

  useEffect(() => {
    fetchLeaderboard(detectedSeason);
  }, [detectedSeason]);
  
  useEffect(() => {
    fetchHistoryData();
  }, [historySeasonFilter]);

  // --- DATA FETCHING ---
  const fetchActiveData = async () => {
    const { data } = await supabase.from('ice_log').select('*').eq('status', 'PENDING');
    if (data) setIces(data as IceLog[]);
  };

  const fetchHistoryData = async () => {
    const { data } = await supabase
      .from('ice_log')
      .select('*')
      .eq('status', 'COMPLETE')
      .eq('season', historySeasonFilter)
      .order('completed_at', { ascending: false });
      
    if (data) setHistoryIces(data as IceLog[]);
  };

  const fetchLeaderboard = async (seasonOverride?: string) => {
    const targetSeason = seasonOverride || detectedSeason || "2024";
    const { data } = await supabase
      .from('ice_log')
      .select('team_name')
      .eq('status', 'COMPLETE')
      .eq('season', targetSeason);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(row => {
        counts[row.team_name] = (counts[row.team_name] || 0) + 1;
      });
      const sorted = Object.entries(counts)
        .map(([team_name, count]) => ({ team_name, count }))
        .sort((a, b) => b.count - a.count);
      setLeaderboard(sorted);
    }
  };

  // --- ACTIONS ---
  const handleSync = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const json = await res.json();
      
      if (json.currentWeek) {
        setDetectedWeek(json.currentWeek);
        localStorage.setItem('detectedWeek', String(json.currentWeek));
      }
      if (json.currentSeason) {
        setDetectedSeason(json.currentSeason);
        localStorage.setItem('detectedSeason', json.currentSeason);
        if (!detectedSeason) setHistorySeasonFilter(json.currentSeason); 
      }
      
      await fetchActiveData();
      await fetchLeaderboard(json.currentSeason);
    } catch (e) {
      console.error(e);
      if (!isBackground) alert("Sync failed. Check console.");
    }
    setLoading(false);
  };

  const toggleTeam = (teamName: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamName)) newExpanded.delete(teamName);
    else newExpanded.add(teamName);
    setExpandedTeams(newExpanded);
  };

  // --- UNDO / DELETE LOGIC ---
  const handleUndo = async (ice: IceLog) => {
    if (!confirm("Are you sure? This will delete the video and move the Ice back to 'Pending'.")) return;
    
    setLoading(true);
    try {
      if (ice.proof_url) {
        const path = ice.proof_url.split('/proofs/')[1];
        if (path) {
          await supabase.storage.from('proofs').remove([path]);
        }
      }

      const { error } = await supabase
        .from('ice_log')
        .update({
          status: 'PENDING',
          completed_at: null,
          proof_url: null
        })
        .eq('id', ice.id);

      if (error) throw error;

      await fetchActiveData();
      await fetchHistoryData();
      await fetchLeaderboard();

    } catch (e) {
      alert("Error undoing ice: " + (e as any).message);
    } finally {
      setLoading(false);
    }
  };

  // --- UPLOAD LOGIC ---
  const triggerUpload = (id: number) => {
    selectedIceIdRef.current = id;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const iceId = selectedIceIdRef.current;
    
    // Reset Immediately
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (!file || !iceId) return;

    setUploadingId(iceId);

    try {
      const fileName = `${Date.now()}_${iceId}_${file.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('proofs').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('proofs').getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('ice_log')
        .update({ 
          status: 'COMPLETE', 
          completed_at: new Date().toISOString(),
          proof_url: publicUrl 
        })
        .eq('id', iceId);

      if (dbError) throw dbError;

      await fetchActiveData();
      await fetchHistoryData();
      await fetchLeaderboard();
      
      setUploadingId(null);
      selectedIceIdRef.current = null;

      handleSync(true).catch(console.error);

    } catch (error) {
      alert("Error uploading proof: " + (error as any).message);
      setUploadingId(null);
      selectedIceIdRef.current = null;
    } 
  };

  const payOneInterest = (teamInterestIces: IceLog[]) => {
    if (teamInterestIces.length === 0) return;
    triggerUpload(teamInterestIces[0].id);
  };

  // --- TIME LOGIC ---
  const calculateCountdown = () => {
    const now = new Date();
    const d = new Date();
    const currentDay = d.getDay(); 
    const targetDay = 2; // Tuesday
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    
    d.setDate(d.getDate() + daysUntil);
    d.setHours(0, 0, 0, 0); 
    
    const diff = d.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
  };

  const activeTeamNames = Array.from(new Set(ices.map(i => i.team_name)));
  // Get unique teams for History tab
  const historyTeamNames = Array.from(new Set(historyIces.map(i => i.team_name)));

  // --- SUB-RENDERERS ---
  const renderActiveLedger = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {activeTeamNames.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-slate-500 font-medium">The league is clean. No Ices owed!</div>
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
            <div key={team} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
              <div 
                onClick={() => toggleTeam(team)}
                className="bg-slate-50 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
                  <h3 className="font-bold text-lg text-slate-800">{team}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold shadow-sm ${teamIces.length > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                  {teamIces.length} Pending
                </span>
              </div>

              {isExpanded && (
                <div className="p-4 space-y-4 border-t border-slate-100 animate-in slide-in-from-top-2">
                  {hasInterest && (
                    <div className="bg-red-50 border-2 border-red-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-200 p-3 rounded-full"><Flame size={24} className="text-red-600" /></div>
                        <div>
                          <h4 className="text-red-700 font-extrabold text-lg">Interest Penalty</h4>
                          <p className="text-red-500 text-sm font-medium">Clear <span className="font-black">{interest.length}</span> interest ices first.</p>
                        </div>
                      </div>
                      <button onClick={() => payOneInterest(interest)} disabled={uploadingId !== null} className="w-full sm:w-auto bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 shadow-sm transition-all flex items-center justify-center gap-2">
                        {uploadingId && interest.some(i => i.id === uploadingId) ? <><RefreshCw className="animate-spin" size={18}/> Uploading...</> : <><Upload size={18}/> Clear 1 Ice (-1)</>}
                      </button>
                    </div>
                  )}
                  <div className="space-y-2">
                      {principal.map(ice => (
                      <div key={ice.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg"><Beer size={18} className="text-blue-600" /></div>
                            <div>
                              <span className="block font-bold text-slate-700 text-sm">Week {ice.week_incurred}: {ice.player_name}</span>
                              <span className="text-xs text-slate-400 font-mono">{ice.score} Points</span>
                            </div>
                          </div>
                          {hasInterest ? (
                            <button disabled className="bg-slate-100 text-slate-400 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 cursor-not-allowed border border-slate-200"><Lock size={14} /> Locked</button>
                          ) : (
                            <button onClick={() => triggerUpload(ice.id)} disabled={uploadingId !== null} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2">
                              {uploadingId === ice.id ? <><RefreshCw className="animate-spin" size={14}/> Uploading...</> : <><Video size={14}/> Proof & Clear</>}
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

  const renderHistory = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={20}/> History Vault</h3>
        <select 
          value={historySeasonFilter}
          onChange={(e) => setHistorySeasonFilter(e.target.value)}
          className="bg-slate-100 border-none rounded-lg px-4 py-2 font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="2024">Season 2024</option>
          <option value="2025">Season 2025</option>
          <option value="2026">Season 2026</option>
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
              <div key={team} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
                {/* COLLAPSIBLE HEADER FOR HISTORY */}
                <div 
                  onClick={() => toggleTeam(team)}
                  className="bg-slate-50 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
                    <h3 className="font-bold text-lg text-slate-800">{team}</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-bold shadow-sm bg-green-100 text-green-700">
                    {teamHistory.length} Completed
                  </span>
                </div>

                {/* EXPANDABLE HISTORY CONTENT */}
                {isExpanded && (
                  <div className="p-4 space-y-4 border-t border-slate-100 animate-in slide-in-from-top-2">
                    {teamHistory.map(ice => (
                      <div key={ice.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-3 relative group hover:shadow-md transition-shadow">
                        
                        {/* DELETE BUTTON */}
                        <button 
                          onClick={() => handleUndo(ice)}
                          className="absolute top-2 right-2 p-2 bg-slate-50 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="Undo / Delete"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="flex justify-between items-start pr-8">
                          <div className="text-xs text-slate-400 font-mono">
                            Completed: {new Date(ice.completed_at!).toLocaleDateString()}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${ice.type === 'PRINCIPAL' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                            {ice.type}
                          </div>
                        </div>
                        
                        <div className="text-sm text-slate-600 font-medium">
                          {ice.type === 'PRINCIPAL' ? (
                            <span>Week {ice.week_incurred}: {ice.player_name} ({ice.score} pts)</span>
                          ) : (
                            <span>Interest Payment (Week {ice.week_incurred})</span>
                          )}
                        </div>

                        {ice.proof_url ? (
                           <a href={ice.proof_url} target="_blank" rel="noopener noreferrer" className="mt-2 w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-lg font-bold hover:bg-slate-700 transition-colors">
                             <PlayCircle size={16}/> Watch Proof
                           </a>
                        ) : (
                          <div className="mt-2 w-full text-center py-2 bg-slate-100 text-slate-400 rounded-lg text-sm italic">No Video Attached</div>
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

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <input 
        type="file" 
        accept="video/*,image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
        className="hidden" 
      />

      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* --- GLOBAL SECTION --- */}

        {/* 1. TITLE & COUNTDOWN */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 flex flex-col md:flex-row items-center justify-center gap-3">
            <Beer className="w-12 h-12 text-blue-500" /> 
            <span>Ice Tracker</span>
          </h1>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 inline-block w-full md:w-auto min-w-[300px]">
             <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">
                <Clock size={16} /> Interest Countdown
             </div>
             <div className="text-4xl font-mono font-bold text-red-500 tabular-nums tracking-tight">{timeLeft}</div>
             <div className="text-xs text-slate-400 mt-2">Deadline: Monday Night (Midnight)</div>
          </div>
        </div>

        {/* 2. STATUS HEADER (Auto-Detect Logic) */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg text-green-700">
              <Calendar size={24} />
            </div>
            <div className="text-left">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current NFL State</div>
              <div className="font-bold text-slate-800 text-lg">
                {detectedWeek 
                  ? `Week ${detectedWeek} • ${detectedSeason}` 
                  : <span className="text-slate-400 italic font-normal">Syncing League Info...</span>}
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => handleSync(false)} 
            disabled={loading} 
            className="text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2 text-sm font-semibold"
            title="Force check for new scores"
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />} 
            {loading ? 'Updating...' : 'Force Sync'}
          </button>
        </div>

        {/* 3. LEADERBOARD (Global) */}
        {leaderboard.length > 0 && (
          <div className="bg-gradient-to-r from-blue-900 to-slate-800 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <Trophy className="text-yellow-400" />
              <h3 className="font-bold text-lg">Season Leaders (Most Drank)</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
              {leaderboard.slice(0, 3).map((entry, index) => (
                <div key={entry.team_name} className="bg-white/10 p-3 rounded-lg backdrop-blur-sm flex items-center gap-3 border border-white/10">
                  <div className={`font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full ${index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-400 text-orange-900'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-sm truncate w-32">{entry.team_name}</div>
                    <div className="text-xs opacity-70">{entry.count} Ices Cleared</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
          </div>
        )}

        {/* --- TABBED SECTION --- */}
        <div className="flex p-1 bg-slate-200 rounded-xl">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Active Ledger
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            History Vault
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'active' ? renderActiveLedger() : renderHistory()}
      </div>
    </main>
  );
}