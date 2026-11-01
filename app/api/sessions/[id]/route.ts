import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
// service_roleキー使用：本人確認はこのAPI内で行うため、RLSの状態に関わらず確実に削除できるようにする
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// DELETE /api/sessions/[id]  body: { user_id: string }
// 登録間違いがあった場合に本人が自分の戦績を削除できるようにする（2026-09-24、テスターフィードバック対応）
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    if (!isReady()) return NextResponse.json({ error: '設定エラー' }, { status: 500 });

    const supabase = getAdminClient();

    // 本人の記録であることをサーバー側で確認してから削除する（他人の戦績を消せないようにするため）
    const { data: session, error: fetchErr } = await supabase
      .from('game_sessions')
      .select('id, user_id, photo_url')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr || !session) return NextResponse.json({ error: '記録が見つかりません' }, { status: 404 });
    if (session.user_id !== user_id) return NextResponse.json({ error: 'この記録を削除する権限がありません' }, { status: 403 });

    await supabase.from('prizes').delete().eq('session_id', id);

    if (session.photo_url) {
      const path = session.photo_url.split('/best-photos/')[1];
      if (path) await supabase.storage.from('best-photos').remove([path]);
    }

    const { error: delErr } = await supabase.from('game_sessions').delete().eq('id', id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
