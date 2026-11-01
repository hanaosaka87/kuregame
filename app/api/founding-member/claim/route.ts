import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// LINE公式アカウント「華AIコンサル」で「クレゲー」と送信すると届く合言葉コードを照合し、
// 本人確認済み(auth)のユーザーにのみ創業メンバー特典を付与する。
// 判定・付与は必ずサーバー側（service_role）で行い、クライアントからfounding_memberを
// 直接書き換えることはできない（schema_founding_member_line_claim.sqlでREVOKE済み）。
export async function POST(req: NextRequest) {
  try {
    const { user_id, code } = await req.json();
    if (!user_id || !code || typeof code !== 'string') {
      return NextResponse.json({ error: '合言葉を入力してください' }, { status: 400 });
    }

    const expected = process.env.FOUNDING_MEMBER_CLAIM_CODE;
    if (!expected) {
      return NextResponse.json({ error: '現在準備中です。しばらくお待ちください' }, { status: 503 });
    }

    const normalized = code.trim();
    if (normalized.toUpperCase() !== expected.toUpperCase()) {
      return NextResponse.json({ error: '合言葉が違います。LINE公式アカウントで届いたコードをご確認ください' }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { error: insertErr } = await supabase
      .from('founding_member_claims')
      .insert({ user_id });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json({ error: 'すでに特典を受け取り済みです' }, { status: 409 });
      }
      throw insertErr;
    }

    const { error: updateErr } = await supabase
      .from('user_profiles')
      .update({ founding_member: true })
      .eq('id', user_id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '処理に失敗しました。もう一度お試しください' }, { status: 500 });
  }
}
