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

  const { searchParams } = new URL(req.url);
  const photoOnly = searchParams.get('photoOnly') === '1';
  const limit = Math.min(Number(searchParams.get('limit') || 100), 300);

  let query = getAdminClient()
    .from('game_sessions')
    .select('id, nickname, store_name, prefecture, challenge_type, total_spent, total_retail_value, prize_count, efficiency_rate, photo_url, created_at, user_id, prizes(id, name, category, retail_price, quantity)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (photoOnly) query = query.not('photo_url', 'is', null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data });
}
