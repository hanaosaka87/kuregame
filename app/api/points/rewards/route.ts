import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  if (!isReady()) return NextResponse.json({ rewards: [] });
  const supabase = getClient();
  const { data, error } = await supabase
    .from('point_rewards')
    .select('id, name, description, points_cost')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ rewards: [] });
  return NextResponse.json({ rewards: data || [] });
}
