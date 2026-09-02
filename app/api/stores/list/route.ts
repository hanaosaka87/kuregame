import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ reports: [] }, { status: 200 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, error } = await supabase
      .from('store_reports')
      .select('id, name, prefecture, addr, comment, reported_at')
      .eq('status', 'approved')
      .order('reported_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json({ reports: data || [] });
  } catch (e) {
    console.error('store list error:', e);
    return NextResponse.json({ reports: [] });
  }
}
