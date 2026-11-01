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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isReady()) return NextResponse.json({ room: null });

  const supabase = getClient();
  const { data } = await supabase
    .from('battle_rooms')
    .select('id, code, store_name, budget, host_nickname, status, created_at')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  return NextResponse.json({ room: data || null });
}
