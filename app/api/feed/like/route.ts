import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getPointsAdminClient, awardPoints, POINT_REASONS, POINT_AMOUNTS } from '@/lib/points';

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

// フィードの「スゲー！」はクリック自体は既存どおりshowcase_likesへの行の有無で管理しつつ、
// ポイント付与だけはサーバー側（service_role）で行う。初回の「liker→target」の組み合わせでのみ
// 双方にポイントを付与し、解除・再押下では付与しない（連打によるポイント稼ぎを防止）。
export async function POST(req: NextRequest) {
  if (!isReady()) return NextResponse.json({ ok: false, skipped: true });

  const { liker_id, target_id, action } = await req.json().catch(() => ({}));
  if (!liker_id || !target_id || (action !== 'like' && action !== 'unlike')) {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 });
  }
  if (liker_id === target_id) {
    return NextResponse.json({ error: '自分には送れません' }, { status: 400 });
  }

  const supabase = getClient();

  if (action === 'unlike') {
    const { error } = await supabase.from('showcase_likes').delete().eq('liker_id', liker_id).eq('target_id', target_id);
    if (error) return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error: insertErr } = await supabase.from('showcase_likes').insert({ liker_id, target_id });
  if (insertErr && insertErr.code !== '23505') {
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 });
  }

  // ポイントは「liker→target」の組み合わせごとに初回のみ（dedupeKeyで保証）
  const admin = getPointsAdminClient();
  const dedupeSuffix = `${liker_id}_${target_id}`;
  await Promise.all([
    awardPoints(admin, liker_id, POINT_AMOUNTS.feedLike, POINT_REASONS.feedLike, `${POINT_REASONS.feedLike}_${dedupeSuffix}`),
    awardPoints(admin, target_id, POINT_AMOUNTS.feedLiked, POINT_REASONS.feedLiked, `${POINT_REASONS.feedLiked}_${dedupeSuffix}`),
  ]);

  return NextResponse.json({ ok: true });
}
