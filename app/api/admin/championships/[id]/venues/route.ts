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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthed(req)) return NextResponse.json({ error: '認証失敗' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { store_name, prefecture, staff_name } = body;
  if (!store_name) return NextResponse.json({ error: '店舗名は必須です' }, { status: 400 });

  const { data, error } = await getAdminClient()
    .from('championship_venues')
    .insert({ championship_id: id, store_name, prefecture: prefecture || null, staff_name: staff_name || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ venue: data });
}
