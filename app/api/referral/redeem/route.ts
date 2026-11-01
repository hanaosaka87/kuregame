import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getPointsAdminClient, awardPoints, POINT_REASONS, POINT_AMOUNTS } from '@/lib/points';

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, code } = body;

    if (!user_id || !code || typeof code !== 'string') {
      return NextResponse.json({ error: 'コードを入力してください' }, { status: 400 });
    }
    if (!isReady()) {
      return NextResponse.json({ ok: false, skipped: true });
    }

    const normalized = code.trim().toUpperCase();
    const supabase = getClient();

    const { data: codeRow, error: codeErr } = await supabase
      .from('partner_referral_codes')
      .select('id, issuer_label')
      .eq('code', normalized)
      .eq('is_active', true)
      .maybeSingle();

    if (codeErr) throw codeErr;
    if (!codeRow) {
      return NextResponse.json({ error: 'その紹介コードは見つかりませんでした' }, { status: 404 });
    }

    const { error: insertErr } = await supabase
      .from('referral_redemptions')
      .insert({ code_id: codeRow.id, user_id });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({ error: 'すでに紹介コードを登録済みです（1アカウントにつき1回のみ）' }, { status: 409 });
      }
      throw insertErr;
    }

    // 紹介コード登録ポイント（1アカウント1回のみ、上のunique制約と二重に守られる）
    const admin = getPointsAdminClient();
    await awardPoints(admin, user_id, POINT_AMOUNTS.referralRedeem, POINT_REASONS.referralRedeem, `${POINT_REASONS.referralRedeem}_${user_id}`);

    return NextResponse.json({ ok: true, issuer_label: codeRow.issuer_label });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '登録に失敗しました。もう一度お試しください' }, { status: 500 });
  }
}
