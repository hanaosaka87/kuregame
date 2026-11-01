import { NextRequest, NextResponse } from 'next/server';
import { getPointsAdminClient } from '@/lib/points';

export const dynamic = 'force-dynamic';

// ポイント交換：残高チェック・減算・引換コード発行をDB関数内で1トランザクションとして行う
// （連打等で残高以上に交換されるのを防ぐため、アプリ側で分割処理しない）。
export async function POST(req: NextRequest) {
  const { user_id, reward_id } = await req.json().catch(() => ({}));
  if (!user_id || !reward_id) {
    return NextResponse.json({ ok: false, error: '不正なリクエストです' }, { status: 400 });
  }

  const admin = getPointsAdminClient();
  const { data, error } = await admin.rpc('redeem_point_reward', { p_user_id: user_id, p_reward_id: reward_id });
  if (error) {
    console.error('redeem error:', error);
    return NextResponse.json({ ok: false, error: '交換に失敗しました' }, { status: 500 });
  }

  if (!data.ok) return NextResponse.json(data, { status: 400 });
  return NextResponse.json(data);
}
