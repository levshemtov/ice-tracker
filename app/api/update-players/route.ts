import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  console.log("Fetching huge player file from Sleeper...");
  
  // 1. Fetch the raw data
  const res = await fetch("https://api.sleeper.app/v1/players/nfl");
  const rawData = await res.json();
  
  // 2. Transform the weird Sleeper object into a nice Array
  // Sleeper returns: { "4046": { first_name: "Patrick"... }, "123": {...} }
  const playersArray = Object.values(rawData).map((p: any) => ({
    id: p.player_id,
    first_name: p.first_name,
    last_name: p.last_name,
    position: p.position,
    team: p.team
  }));

  // Filter out junk (defenses, missing names) to save space
  const activePlayers = playersArray.filter(p => 
    p.position && 
    ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position)
  );

  console.log(`Found ${activePlayers.length} relevant players.`);

  // 3. Upsert into Supabase in chunks (to prevent timeouts)
  const chunkSize = 500;
  for (let i = 0; i < activePlayers.length; i += chunkSize) {
    const chunk = activePlayers.slice(i, i + chunkSize);
    
    const { error } = await supabase
      .from('players')
      .upsert(chunk, { onConflict: 'id' });

    if (error) {
      console.error("Error inserting chunk:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ 
    message: "Success", 
    count: activePlayers.length 
  });
}