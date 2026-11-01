import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { team_a_player, team_b_player, winner_team, memo } = body;

    if (winner_team !== 'A' && winner_team !== 'B' && winner_team !== 'draw') {
      return NextResponse.json({ error: '勝敗を選択してください' }, { status: 400 });
    }
    if (!isReady()) return NextResponse.json({ ok: false, skipped: true });

    const supabase = getClient();
    const { data: battle } = await supabase
      .from('team_battles')
      .select('id, mode')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (!battle) return NextResponse.json({ error: '対戦が見つかりません' }, { status: 404 });
    if (battle.mode !== 'sudden_death') {
      return NextResponse.json({ error: 'この対戦は短期決戦モードではありません' }, { status: 400 });
    }

    const { count } = await supabase
      .from('team_battle_rounds')
      .select('id', { count: 'exact', head: true })
      .eq('team_battle_id', battle.id);
    const round_no = (count || 0) + 1;

    const { error } = await supabase.from('team_battle_rounds').insert({
      team_battle_id: battle.id,
      round_no,
      team_a_player: team_a_player || null,
      team_b_player: team_b_player || null,
      winner_team,
      memo: memo || null,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, round_no });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '記録に失敗しました' }, { status: 500 });
  }
}
