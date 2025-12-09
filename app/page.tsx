'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { IceLog, LeaderboardEntry } from './types';

// Import Modular Components
import { ThemeToggle } from './components/ThemeToggle';
import { PageHeader } from './components/PageHeader';
import { StatusHeader } from './components/StatusHeader';
import { Leaderboard } from './components/Leaderboard';
import { ActiveLedger } from './components/ActiveLedger';
import { HistoryVault } from './components/HistoryVault';

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
  const [detectedSeason, setDetectedSeason] = useState<string>('2025'); 
  const [historySeasonFilter, setHistorySeasonFilter] = useState<string>('2025'); 
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['2025']); 
  const [timeLeft, setTimeLeft] = useState("Calculating...");
  
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedIceIdRef = useRef<number | null>(null);

  // 1. INITIAL LOAD
  useEffect(() => {
    const cachedWeek = localStorage.getItem('detectedWeek');
    const cachedSeason = localStorage.getItem('detectedSeason');
    
    let seasonToUse = '2025'; 

    if (cachedWeek) setDetectedWeek(Number(cachedWeek));
    if (cachedSeason) {
      setDetectedSeason(cachedSeason);
      seasonToUse = cachedSeason;
      setHistorySeasonFilter(cachedSeason);
    }

    fetchActiveData();
    fetchHistoryData(seasonToUse); // Fetch immediately with whatever we have
    fetchLeaderboard(seasonToUse);
    fetchAvailableSeasons();

    const timer = setInterval(calculateCountdown, 1000);
    handleSync(true); 
    
    return () => clearInterval(timer);
  }, []);

  // 2. RE-FETCH ON TAB SWITCH
  // This ensures the vault is never empty when you click the tab
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistoryData();
    }
  }, [activeTab]);

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

  const fetchHistoryData = async (seasonOverride?: string) => {
    const targetSeason = seasonOverride || historySeasonFilter;    
    const { data } = await supabase
      .from('ice_log')
      .select('*')
      .eq('status', 'COMPLETE')
      .eq('season', targetSeason)
      .order('completed_at', { ascending: false });
      
    if (data) setHistoryIces(data as IceLog[]);
  };

  const fetchLeaderboard = async (seasonOverride?: string) => {
    const targetSeason = seasonOverride || detectedSeason;
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

  const fetchAvailableSeasons = async () => {
    // Check if the distinct_seasons view exists, otherwise fallback to simple query or error handle
    try {
      const { data } = await supabase.from('distinct_seasons').select('season');
      if (data) {
        const seasons = data.map(s => s.season).filter(Boolean).sort((a, b) => b.localeCompare(a));
        if (seasons.length > 0) setAvailableSeasons(seasons);
      }
    } catch (e) {
      console.error("View 'distinct_seasons' might be missing.", e);
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
        setHistorySeasonFilter(json.currentSeason);
      }
      
      // ✅ FORCE FETCH ALL DATA (Even if season didn't change)
      await fetchActiveData();
      await fetchLeaderboard(json.currentSeason);
      await fetchHistoryData(json.currentSeason); // <--- Added this line
      await fetchAvailableSeasons();

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
        if (path) await supabase.storage.from('proofs').remove([path]);
      }
      const { error } = await supabase.from('ice_log').update({
          status: 'PENDING', completed_at: null, proof_url: null 
        }).eq('id', ice.id);

      if (error) throw error;

      await fetchActiveData();
      await fetchHistoryData();
      await fetchLeaderboard();
      await fetchAvailableSeasons();
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
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file || !iceId) return;

    setUploadingId(iceId);

    try {
      const fileName = `${Date.now()}_${iceId}_${file.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('proofs').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('proofs').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('ice_log').update({ 
          status: 'COMPLETE', completed_at: new Date().toISOString(), proof_url: publicUrl 
        }).eq('id', iceId);

      if (dbError) throw dbError;

      // Quick Refresh
      await fetchActiveData();
      await fetchHistoryData();
      await fetchLeaderboard(detectedSeason);
      await fetchAvailableSeasons();
      
      setUploadingId(null);
      selectedIceIdRef.current = null;

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

  const calculateCountdown = () => {
    const now = new Date();
    const d = new Date();
    const currentDay = d.getDay(); 
    const targetDay = 2; 
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

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans transition-colors duration-300">
      <input 
        type="file" 
        accept="video/*,image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
        className="hidden" 
      />

      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <PageHeader timeLeft={timeLeft} />

        <StatusHeader 
          detectedWeek={detectedWeek}
          detectedSeason={detectedSeason}
          loading={loading}
          onSync={() => handleSync(false)}
        />

        <Leaderboard leaderboard={leaderboard} />

        <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Active Ledger
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Vault
          </button>
        </div>

        {activeTab === 'active' ? (
          <ActiveLedger 
            ices={ices}
            expandedTeams={expandedTeams}
            toggleTeam={toggleTeam}
            uploadingId={uploadingId}
            triggerUpload={triggerUpload}
            payOneInterest={payOneInterest}
          />
        ) : (
          <HistoryVault 
            historyIces={historyIces}
            historySeasonFilter={historySeasonFilter}
            availableSeasons={availableSeasons}
            setHistorySeasonFilter={setHistorySeasonFilter}
            expandedTeams={expandedTeams}
            toggleTeam={toggleTeam}
            handleUndo={handleUndo}
          />
        )}
      </div>
    </main>
  );
}