import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isReady()) return NextResponse.json({ battle: null });

  const supabase = getClient();
  const { data: battle } = await supabase
    .from('team_battles')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!battle) return NextResponse.json({ battle: null });

  if (battle.mode === 'sudden_death') {
    const { data: rounds } = await supabase
      .from('team_battle_rounds')
      .select('*')
      .eq('team_battle_id', battle.id)
      .order('round_no', { ascending: true });
    return NextResponse.json({ battle, rounds: rounds || [] });
  }

  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('team_battle_id', battle.id)
    .order('efficiency_rate', { ascending: false });
  return NextResponse.json({ battle, sessions: sessions || [] });
}
