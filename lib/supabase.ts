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

export type ChallengeType = '1000' | '3000' | '5000' | '10000' | 'free';

export interface Prize {
  id?: string;
  name: string;
  category: 'food' | 'daily' | 'figure' | 'toy' | 'other';
  retail_price: number;
  quantity: number;
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
}

export const CHALLENGE_AMOUNTS: Record<ChallengeType, number> = {
  '1000': 1000,
  '3000': 3000,
  '5000': 5000,
  '10000': 10000,
  'free': 0,
};

export const CATEGORY_LABELS: Record<string, string> = {
  food: '🍬 食品',
  daily: '🧴 日用品',
  figure: '🎁 プライズ',
  toy: '🧸 おもちゃ',
  other: '📦 その他',
};
