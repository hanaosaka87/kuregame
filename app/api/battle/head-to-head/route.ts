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

interface SessionRow {
  id: string;
  user_id: string | null;
  nickname: string;
  battle_room_id: string;
  efficiency_rate: number;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  if (!isReady()) return NextResponse.json({ records: [] });

  const supabase = getClient();

  // 自分が参加した対戦部屋のIDを取得
  const { data: mySessions } = await supabase
    .from('game_sessions')
    .select('id,user_id,nickname,battle_room_id,efficiency_rate,created_at')
    .eq('user_id', userId)
    .not('battle_room_id', 'is', null);

  const roomIds = Array.from(new Set((mySessions || []).map((s) => s.battle_room_id)));
  if (roomIds.length === 0) return NextResponse.json({ records: [] });

  // それらの部屋の全参加者の記録を取得
  const { data: allSessions } = await supabase
    .from('game_sessions')
    .select('id,user_id,nickname,battle_room_id,efficiency_rate,created_at')
    .in('battle_room_id', roomIds);

  const rows: SessionRow[] = allSessions || [];

  // 部屋ごと・参加者ごとに最新の1件だけを残す（同じ人の再送信対策）
  const latestByRoomAndIdentity = new Map<string, SessionRow>();
  for (const row of rows) {
    const identity = row.user_id ? `u:${row.user_id}` : `g:${row.nickname}:${row.id}`;
    const key = `${row.battle_room_id}|${identity}`;
    const existing = latestByRoomAndIdentity.get(key);
    if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
      latestByRoomAndIdentity.set(key, row);
    }
  }

  const byRoom = new Map<string, SessionRow[]>();
  for (const row of latestByRoomAndIdentity.values()) {
    const list = byRoom.get(row.battle_room_id) || [];
    list.push(row);
    byRoom.set(row.battle_room_id, list);
  }

  interface Record_ { key: string; name: string; wins: number; losses: number; draws: number }
  const records = new Map<string, Record_>();

  for (const [, participants] of byRoom) {
    const mine = participants.filter((p) => p.user_id === userId);
    const others = participants.filter((p) => p.user_id !== userId);
    for (const my of mine) {
      for (const opp of others) {
        const key = opp.user_id ? `u:${opp.user_id}` : `g:${opp.nickname}`;
        const rec = records.get(key) || { key, name: opp.nickname, wins: 0, losses: 0, draws: 0 };
        rec.name = opp.nickname; // 最新のニックネームで上書き
        if (my.efficiency_rate > opp.efficiency_rate) rec.wins++;
        else if (my.efficiency_rate < opp.efficiency_rate) rec.losses++;
        else rec.draws++;
        records.set(key, rec);
      }
    }
  }

  const result = Array.from(records.values()).sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));
  return NextResponse.json({ records: result });
}
