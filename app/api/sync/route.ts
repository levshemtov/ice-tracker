import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const LEAGUE_ID = "1268045418034364416";

// Type definition for a Sleeper Matchup
interface Matchup {
  roster_id: number;
  starters: string[];
  starters_points: number[];
}

export async function POST(request: Request) {
  const { currentWeek } = await request.json();

  // 1. HELPER: Fetch from Sleeper
  const fetchSleeper = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  };

  // 2. FETCH LEAGUE METADATA (Users & Rosters)
  const users = await fetchSleeper(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/users`);
  const rosters = await fetchSleeper(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`);
  
  const rosterMap: Record<number, string> = {};
  if (rosters && users) {
    rosters.forEach((r: any) => {
      const user = users.find((u: any) => u.user_id === r.owner_id);
      rosterMap[r.roster_id] = user?.metadata?.team_name || user?.display_name || `Team ${r.roster_id}`;
    });
  }

  let newIces = 0;
  let interestAdded = 0;

  // 3. SCAN WEEKS FOR NEW ICES
  for (let week = 1; week <= currentWeek; week++) {
    const matchups: Matchup[] = await fetchSleeper(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/matchups/${week}`);
    if (!matchups) continue;

    for (const m of matchups) {
      if (!m.starters_points) continue;
      
      for (let index = 0; index < m.starters_points.length; index++) {
        const score = m.starters_points[index];
        
        // RULE: Score <= 0
        if (score <= 0) {
          const playerId = m.starters[index];
          
          // Check DB for existing Principal Ice
          const { data: existing } = await supabase
            .from('ice_log')
            .select('id')
            .match({ roster_id: m.roster_id, week_incurred: week, player_name: playerId, type: 'PRINCIPAL' });

          if (!existing || existing.length === 0) {
            await supabase.from('ice_log').insert({
              roster_id: m.roster_id,
              team_name: rosterMap[m.roster_id] || `Team ${m.roster_id}`,
              player_name: playerId,
              week_incurred: week,
              score: score,
              type: 'PRINCIPAL',
              status: 'PENDING'
            });
            newIces++;
          }
        }
      }
    }
  }

  // 4. CALCULATE INTEREST
  // Fetch all pending PRINCIPAL ices
  const { data: principals } = await supabase
    .from('ice_log')
    .select('*')
    .eq('type', 'PRINCIPAL')
    .eq('status', 'PENDING');

  if (principals) {
    for (const p of principals) {
      // Logic: Current Week - Incurred Week - 1 (Grace Period)
      // Example: Week 4 now. Incurred Week 1. 4 - 1 - 1 = 2 Interest owed total.
      const targetInterest = currentWeek - p.week_incurred - 1;

      if (targetInterest > 0) {
        // Count existing Interest Ices for this parent
        const { count } = await supabase
          .from('ice_log')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', p.id)
          .eq('type', 'INTEREST');

        const currentCount = count || 0;
        const needed = targetInterest - currentCount;

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
              status: 'PENDING'
            });
            interestAdded++;
          }
        }
      }
    }
  }

  return NextResponse.json({ message: 'Sync Complete', newIces, interestAdded });
}