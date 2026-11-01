import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

// 直近の開催予定／開催中の大会を1件返す（一般公開・匿名アクセス可）
export async function GET() {
  if (!isReady()) return NextResponse.json({ championship: null, venues: [] });

  const supabase = getClient();
  const { data: championship } = await supabase
    .from('championships')
    .select('*')
    .in('status', ['upcoming', 'live'])
    .order('start_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!championship) return NextResponse.json({ championship: null, venues: [] });

  const { data: venues } = await supabase
    .from('championship_venues')
    .select('id, store_name, prefecture, status, verified_nickname, verified_efficiency_rate')
    .eq('championship_id', championship.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ championship, venues: venues || [] });
}
