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
    const { store_name, budget, host_nickname, participant_key } = body;

    if (!store_name || !budget || Number(budget) <= 0) {
      return NextResponse.json({ error: '店舗名と金額を入力してください' }, { status: 400 });
    }
    if (!isReady()) {
      return NextResponse.json({ room: null, skipped: true });
    }

    const supabase = getClient();

    // コード重複時は数回リトライ
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = genCode();
      const { data, error } = await supabase
        .from('battle_rooms')
        .insert({
          code,
          store_name,
          budget: Number(budget),
          host_nickname: host_nickname || null,
          host_participant_key: participant_key || null,
        })
        .select()
        .single();

      if (!error) return NextResponse.json({ room: data });
      // unique制約違反以外はすぐ諦める
      if (error.code !== '23505') throw error;
    }

    return NextResponse.json({ error: 'コード生成に失敗しました。もう一度お試しください' }, { status: 500 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ room: null, skipped: true });
  }
}
