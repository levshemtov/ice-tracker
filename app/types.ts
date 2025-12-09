export interface IceLog {
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

export interface LeaderboardEntry {
  team_name: string;
  count: number;
}