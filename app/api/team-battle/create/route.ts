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

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字(0/O/1/I)を除外
function genCode(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, store_name, prefecture, budget, team_a_name, team_b_name, host_nickname } = body;

    if (mode !== 'sudden_death' && mode !== 'fixed_budget') {
      return NextResponse.json({ error: 'モードを選択してください' }, { status: 400 });
    }
    if (!store_name) {
      return NextResponse.json({ error: '店舗名を入力してください' }, { status: 400 });
    }
    if (mode === 'fixed_budget' && (!budget || Number(budget) <= 0)) {
      return NextResponse.json({ error: '金額チャレンジ団体戦では投入金額を入力してください' }, { status: 400 });
    }
    if (!isReady()) {
      return NextResponse.json({ battle: null, skipped: true });
    }

    const supabase = getClient();

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = genCode();
      const { data, error } = await supabase
        .from('team_battles')
        .insert({
          code,
          mode,
          store_name,
          prefecture: prefecture || null,
          budget: mode === 'fixed_budget' ? Number(budget) : null,
          team_a_name: team_a_name || 'チームA',
          team_b_name: team_b_name || 'チームB',
          host_nickname: host_nickname || null,
        })
        .select()
        .single();

      if (!error) return NextResponse.json({ battle: data });
      if (error.code !== '23505') throw error;
    }

    return NextResponse.json({ error: 'コード生成に失敗しました。もう一度お試しください' }, { status: 500 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ battle: null, skipped: true });
  }
}
