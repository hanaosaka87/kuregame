import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { drawGacha, todayStr } from '@/lib/gacha';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 抽選そのものは必ずサーバー側で行い、結果をクライアントに信用させない（不正防止）。
export async function POST(req: NextRequest) {
  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: '未ログイン' }, { status: 401 });

  const supabase = getAdminClient();
  const { data: profile, error: fetchErr } = await supabase
    .from('user_profiles')
    .select('last_gacha_date, gacha_bonus_percent')
    .eq('id', user_id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const today = todayStr();
  if (profile?.last_gacha_date === today) {
    return NextResponse.json({ alreadyPulled: true, pendingBonus: profile.gacha_bonus_percent || 0 });
  }

  const result = drawGacha();
  // 前回分の未消費ボーナスがあっても、新しい結果で上書きする（1日1回・最新の結果のみ有効）
  const { error: updateErr } = await supabase
    .from('user_profiles')
    .update({ last_gacha_date: today, gacha_bonus_percent: result.percent })
    .eq('id', user_id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ alreadyPulled: false, result });
}
