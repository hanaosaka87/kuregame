import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

export type ChallengeType = '1000' | '3000' | '5000' | '10000' | 'free' | 'battle';

export interface Prize {
  id?: string;
  name: string;
  category: 'food' | 'daily' | 'figure' | 'toy' | 'other';
  retail_price: number;
  quantity: number;
  /** リアルタイム記録モードでのみ使用。この1個（1回の記録）に使った金額。サーバーには送信されない（クライアント側の投入金額合計計算専用）。 */
  spent?: number;
}

export interface GameSession {
  id?: string;
  nickname: string;
  store_name?: string;
  session_date?: string;
  challenge_type: ChallengeType;
  total_spent: number;
  total_retail_value: number;
  prize_count: number;
  efficiency_rate: number;
  created_at?: string;
  battle_room_id?: string | null;
  team_battle_id?: string | null;
  team_side?: 'A' | 'B' | null;
  photo_url?: string | null;
}

export interface BattleRoom {
  id: string;
  code: string;
  store_name: string;
  budget: number;
  host_nickname?: string | null;
  status: 'open' | 'closed';
  created_at?: string;
}

export type TeamBattleMode = 'sudden_death' | 'fixed_budget';

export interface TeamBattle {
  id: string;
  code: string;
  mode: TeamBattleMode;
  store_name: string;
  prefecture?: string | null;
  budget?: number | null;
  team_a_name: string;
  team_b_name: string;
  host_nickname?: string | null;
  created_at?: string;
}

export interface TeamBattleRound {
  id?: string;
  team_battle_id: string;
  round_no: number;
  team_a_player?: string | null;
  team_b_player?: string | null;
  winner_team: 'A' | 'B' | 'draw';
  memo?: string | null;
  created_at?: string;
}

/** 対戦モードの「確定前」リアルタイム進行状況（誰がいくら使って何個獲ったか）を共有するための行 */
export interface BattleProgress {
  id?: string;
  battle_room_id: string;
  participant_key: string;
  nickname: string;
  total_spent: number;
  total_retail_value: number;
  prize_count: number;
  efficiency_rate: number;
  updated_at?: string;
}

export const CHALLENGE_AMOUNTS: Record<ChallengeType, number> = {
  '1000': 1000,
  '3000': 3000,
  '5000': 5000,
  '10000': 10000,
  'free': 0,
  'battle': 0,
};

export interface OneshotRecord {
  id?: string;
  user_id?: string;
  nickname: string;
  prefecture?: string | null;
  store_name?: string | null;
  machine_type?: string | null;
  prize_name: string;
  category: 'food' | 'daily' | 'figure' | 'toy' | 'other';
  retail_price: number;
  efficiency_rate?: number;
  photo_url?: string | null;
  created_at?: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  food: '🍬 食品',
  daily: '🧴 日用品',
  figure: '🎁 プライズ',
  toy: '🧸 おもちゃ',
  other: '📦 その他',
};
