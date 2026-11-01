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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthed(req)) return NextResponse.json({ error: '認証失敗' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { name, start_at, status, rules_text, prize_text } = body;

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (start_at !== undefined) update.start_at = start_at;
  if (status !== undefined) update.status = status;
  if (rules_text !== undefined) update.rules_text = rules_text;
  if (prize_text !== undefined) update.prize_text = prize_text;

  const { data, error } = await getAdminClient()
    .from('championships')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ championship: data });
}
