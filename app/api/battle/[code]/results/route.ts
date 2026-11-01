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

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isReady()) return NextResponse.json({ room: null, sessions: [] });

  const participantKey = req.nextUrl.searchParams.get('participant_key') || '';

  const supabase = getClient();
  const { data: room } = await supabase
    .from('battle_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (!room) return NextResponse.json({ room: null, sessions: [] });

  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('battle_room_id', room.id)
    .order('efficiency_rate', { ascending: false });

  // host_participant_key が null の古いルームは、本人確認ができないため
  // 「終了する」ボタンの救済ルールとして誰でもホスト扱いにする（close側と同じ救済ルール）
  const is_host = room.host_participant_key === null
    ? !!participantKey
    : participantKey === room.host_participant_key;
  const { host_participant_key: _omit, ...publicRoom } = room;

  return NextResponse.json({ room: publicRoom, sessions: sessions || [], is_host });
}
