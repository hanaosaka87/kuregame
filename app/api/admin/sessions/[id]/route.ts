import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidAdminSessionToken, ADMIN_SESSION_COOKIE } from '@/lib/adminAuth';

function isAuthed(req: NextRequest): boolean {
  return isValidAdminSessionToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 管理者がランキング登録内容（投入金額・定価総額・獲得数）を修正する。
// 元取り率は常にサーバー側で再計算し、クライアントからの直接指定は受け付けない（改ざん防止）。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthed(req)) return NextResponse.json({ error: '認証失敗' }, { status: 401 });
  const { id } = await params;

  const { total_spent, total_retail_value, prize_count } = await req.json();
  if (!(total_spent > 0) || !(total_retail_value >= 0) || !(prize_count >= 0)) {
    return NextResponse.json({ error: '入力値が不正です' }, { status: 400 });
  }

  const efficiency_rate = Math.round((total_retail_value / total_spent) * 100 * 10) / 10;

  const { data, error } = await getAdminClient()
    .from('game_sessions')
    .update({ total_spent, total_retail_value, prize_count, efficiency_rate })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthed(req)) return NextResponse.json({ error: '認証失敗' }, { status: 401 });
  const { id } = await params;

  const { error } = await getAdminClient().from('game_sessions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
