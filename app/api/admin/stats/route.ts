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

async function countSince(
  supabase: ReturnType<typeof getAdminClient>,
  table: string,
  sinceIso: string | null,
  dateColumn: string = 'created_at'
) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (sinceIso) query = query.gte(dateColumn, sinceIso);
  const { count, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function distinctActiveUsers(
  supabase: ReturnType<typeof getAdminClient>,
  sinceIso: string | null
) {
  let query = supabase.from('game_sessions').select('user_id');
  if (sinceIso) query = query.gte('created_at', sinceIso);
  const { data, error } = await query;
  if (error) throw error;
  return new Set((data || []).map((r) => r.user_id).filter(Boolean)).size;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: '認証失敗' }, { status: 401 });

  const supabase = getAdminClient();

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [
      profilesTotal,
      profiles7d,
      profiles30d,
      sessionsTotal,
      sessions7d,
      sessions30d,
      claimsTotal,
      claims7d,
      active7d,
      active30d,
    ] = await Promise.all([
      countSince(supabase, 'user_profiles', null),
      countSince(supabase, 'user_profiles', d7),
      countSince(supabase, 'user_profiles', d30),
      countSince(supabase, 'game_sessions', null),
      countSince(supabase, 'game_sessions', d7),
      countSince(supabase, 'game_sessions', d30),
      countSince(supabase, 'founding_member_claims', null, 'claimed_at'),
      countSince(supabase, 'founding_member_claims', d7, 'claimed_at'),
      distinctActiveUsers(supabase, d7),
      distinctActiveUsers(supabase, d30),
    ]);

    return NextResponse.json({
      generatedAt: now.toISOString(),
      users: {
        totalProfiles: profilesTotal,
        new7d: profiles7d,
        new30d: profiles30d,
      },
      sessions: {
        total: sessionsTotal,
        new7d: sessions7d,
        new30d: sessions30d,
      },
      activeUsers: {
        last7d: active7d,
        last30d: active30d,
      },
      foundingMember: {
        totalClaims: claimsTotal,
        claims7d: claims7d,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '集計エラー';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
