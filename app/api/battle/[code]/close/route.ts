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

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isReady()) return NextResponse.json({ error: '設定未完了' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const participantKey: string = body.participant_key || '';
  if (!participantKey) {
    return NextResponse.json({ error: '端末情報が取得できませんでした' }, { status: 400 });
  }

  const supabase = getClient();
  const { data: room } = await supabase
    .from('battle_rooms')
    .select('id, host_participant_key, status')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room) return NextResponse.json({ error: '対戦ルームが見つかりません' }, { status: 404 });
  // host_participant_key が null の場合は、終了機能の追加より前に作られた古いルーム
  // （作成者の記録自体が存在しないため、本人確認ができない）。
  // その場合に限り、誰でも終了操作ができる救済ルールとする。
  const isLegacyRoomWithoutHost = room.host_participant_key === null;
  if (!isLegacyRoomWithoutHost && room.host_participant_key !== participantKey) {
    return NextResponse.json({ error: 'このルームを終了できるのはルーム作成者のみです' }, { status: 403 });
  }
  if (room.status === 'closed') {
    return NextResponse.json({ ok: true, alreadyClosed: true });
  }

  const { error } = await supabase
    .from('battle_rooms')
    .update({ status: 'closed' })
    .eq('id', room.id);

  if (error) return NextResponse.json({ error: '終了処理に失敗しました' }, { status: 500 });

  // 対戦勝利ポイント：この部屋の参加記録のうち元取り率が最も高い人（ログイン済みのみ）に付与。
  // 同率トップが複数いる場合は接戦のため付与せず、終了のたびに1回だけ（部屋IDでdedupe）。
  try {
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('user_id, efficiency_rate')
      .eq('battle_room_id', room.id)
      .not('user_id', 'is', null);

    if (sessions && sessions.length > 0) {
      const maxRate = Math.max(...sessions.map((s) => s.efficiency_rate));
      const winners = sessions.filter((s) => s.efficiency_rate === maxRate);
      if (winners.length === 1 && winners[0].user_id) {
        const admin = getPointsAdminClient();
        await awardPoints(admin, winners[0].user_id, POINT_AMOUNTS.battleWin, POINT_REASONS.battleWin, `${POINT_REASONS.battleWin}_${room.id}`);
      }
    }
  } catch (e) {
    console.error('battle win points error:', e);
    // ポイント付与の失敗で終了処理自体を失敗扱いにはしない
  }

  return NextResponse.json({ ok: true });
}
