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

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: '認証失敗' }, { status: 401 });

  const { data: championships, error } = await getAdminClient()
    .from('championships')
    .select('*, championship_venues(*)')
    .order('start_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ championships: championships || [] });
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: '認証失敗' }, { status: 401 });

  const body = await req.json();
  const { name, start_at, rules_text, prize_text } = body;
  if (!name || !start_at) {
    return NextResponse.json({ error: '大会名と開始日時は必須です' }, { status: 400 });
  }

  const { data, error } = await getAdminClient()
    .from('championships')
    .insert({ name, start_at, rules_text: rules_text || null, prize_text: prize_text || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ championship: data });
}
