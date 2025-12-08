import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const LEAGUE_ID = "1257480914938630145";

// Type definitions
interface Matchup {
  roster_id: number;
  starters: string[];
  starters_points: number[];
}

interface SleeperState {
  week: number;
  season: string;
  season_type: string;
}

// --- CORE SYNC LOGIC ---
async function runSyncLogic() {
  // 1. HELPER: Fetch from Sleeper
  const fetchSleeper = async (url: string) => {
    try {
      // We cache the roster/users calls for 5 minutes, but keep Matchups fresh
      const isMatchup = url.includes('matchups');
      const res = await fetch(url, { next: { revalidate: isMatchup ? 0 : 300 } }); 
      if (!res.ok) return null;
      return res.json();
    } catch (error) {
      console.error("Sleeper Fetch Error:", error);
      return null;
    }
  };

  // 2. GET REAL NFL STATE
  const nflState = (await fetchSleeper(`https://api.sleeper.app/v1/state/nfl`)) as SleeperState;
  if (!nflState) throw new Error("Could not fetch NFL state");

  const currentWeek = nflState.week;
  const currentSeason = nflState.season;

  // 3. OPTIMIZATION: FIND WHERE TO START
  // Check the DB to see the last week we have recorded data for.
  const { data: latestEntry } = await supabase
    .from('ice_log')
    .select('week_incurred')
    .eq('season', currentSeason) // Only look at this season
    .order('week_incurred', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastWeekInDb = latestEntry?.week_incurred || 0;
  
  // LOGIC: Start scanning from the last known week.
  // We include the last week (instead of lastWeek + 1) to catch any "Stat Corrections"
  // that Sleeper might apply on Thursdays for the previous week's games.
  let startWeek = Math.max(1, lastWeekInDb);
  
  // Safety: If it's Week 1, force start at 1.
  if (currentWeek === 1) startWeek = 1;

  console.log(`⚡ Smart Sync: Resuming scan from Week ${startWeek} to ${currentWeek}`);

  // 4. FETCH METADATA (Users/Rosters/Players)
  // These calls are fast/cached
  const [users, rosters, allPlayers] = await Promise.all([
    fetchSleeper(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/users`),
    fetchSleeper(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`),
    fetchSleeper(`https://api.sleeper.app/v1/players/nfl`) 
  ]);
  
  const rosterMap: Record<number, string> = {};
  if (rosters && users) {
    rosters.forEach((r: any) => {
      const user = users.find((u: any) => u.user_id === r.owner_id);
      rosterMap[r.roster_id] = user?.metadata?.team_name || user?.display_name || `Team ${r.roster_id}`;
    });
  }

  let newIces = 0;
  let interestAdded = 0;

  // 5. SCAN ONLY NECESSARY WEEKS
  for (let week = startWeek; week <= currentWeek; week++) {
    const matchups: Matchup[] = await fetchSleeper(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/matchups/${week}`);
    if (!matchups) continue;

    for (const m of matchups) {
      if (!m.starters_points) continue;
      
      for (let index = 0; index < m.starters_points.length; index++) {
        const score = m.starters_points[index];
        
        if (score <= 0) {
          const playerId = m.starters[index];
          if (playerId === "0") continue; 

          let realPlayerName = `Player ${playerId}`;
          if (allPlayers && allPlayers[playerId]) {
            const p = allPlayers[playerId];
            realPlayerName = `${p.first_name} ${p.last_name}`;
          }

          // Check DB to avoid duplicates
          const { data: existing } = await supabase
            .from('ice_log')
            .select('id')
            .match({ 
              roster_id: m.roster_id, 
              week_incurred: week, 
              player_name: realPlayerName, 
              type: 'PRINCIPAL',
              season: currentSeason 
            });

          if (!existing || existing.length === 0) {
            await supabase.from('ice_log').insert({
              roster_id: m.roster_id,
              team_name: rosterMap[m.roster_id] || `Team ${m.roster_id}`,
              player_name: realPlayerName,
              week_incurred: week,
              score: score,
              type: 'PRINCIPAL',
              status: 'PENDING',
              season: currentSeason
            });
            newIces++;
          }
        }
      }
    }
  }

  // 6. CALCULATE INTEREST (Fast DB Operation)
  // This part is fast because it doesn't use the API loop
  const { data: principals } = await supabase
    .from('ice_log')
    .select('*')
    .eq('type', 'PRINCIPAL')
    .eq('status', 'PENDING')
    .eq('season', currentSeason); 

  if (principals) {
    for (const p of principals) {
      const targetInterest = currentWeek - p.week_incurred - 1;

      if (targetInterest > 0) {
        const { count } = await supabase
          .from('ice_log')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', p.id)
          .eq('type', 'INTEREST');

        const needed = targetInterest - (count || 0);

        if (needed > 0) {
          for (let i = 0; i < needed; i++) {
            await supabase.from('ice_log').insert({
              roster_id: p.roster_id,
              team_name: p.team_name,
              player_name: 'INTEREST PENALTY',
              week_incurred: p.week_incurred,
              score: 0,
              type: 'INTEREST',
              parent_id: p.id,
              status: 'PENDING',
              season: currentSeason
            });
            interestAdded++;
          }
        }
      }
    }
  }

  return { newIces, interestAdded, currentWeek, currentSeason, startWeek };
}

// --- ROUTE HANDLERS ---

export async function POST(request: Request) {
  try {
    const result = await runSyncLogic();
    return NextResponse.json({ message: 'Sync Complete', ...result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const result = await runSyncLogic();
    return NextResponse.json({ message: 'Scheduled Sync Complete', ...result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}