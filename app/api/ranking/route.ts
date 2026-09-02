import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// GET /api/ranking?type=national|prefecture|monthly_champions|monthly_top
//   &prefecture=東京都   (prefecture type)
//   &month=2026-08       (monthly types、省略時は当月)
//   &challenge=1000|all  (optional filter)
//   &limit=20
export async function GET(req: NextRequest) {
  if (!isReady()) return NextResponse.json({ sessions: [], champions: [] });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'national';
  const prefecture = searchParams.get('prefecture') || '';
  const challenge = searchParams.get('challenge') || 'all';
  const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = searchParams.get('month') || defaultMonth;

  const supabase = getClient();

  // 月間チャンピオン（都道府県ごと1位を一覧）
  if (type === 'monthly_champions') {
    const { data, error } = await supabase
      .from('v_monthly_champions')
      .select('*')
      .eq('year_month', month)
      .order('efficiency_rate', { ascending: false });
    if (error) return NextResponse.json({ champions: [] });
    return NextResponse.json({ champions: data });
  }

  // 共通クエリ
  let query = supabase
    .from('game_sessions')
    .select('id,nickname,prefecture,challenge_type,total_spent,total_retail_value,prize_count,efficiency_rate,store_name,created_at')
    .order('efficiency_rate', { ascending: false })
    .limit(limit);

  if (challenge !== 'all') query = query.eq('challenge_type', challenge);

  // 都道府県別
  if (type === 'prefecture') {
    if (!prefecture) return NextResponse.json({ sessions: [] });
    query = query.eq('prefecture', prefecture);
  }

  // 月間トップ（全国）
  if (type === 'monthly_top') {
    const startOfMonth = `${month}-01`;
    const nextMonth = month.slice(0, 4) + '-' + String(Number(month.slice(5, 7)) + 1).padStart(2, '0') + '-01';
    query = query
      .gte('created_at', startOfMonth)
      .lt('created_at', nextMonth);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ sessions: [] });
  return NextResponse.json({ sessions: data });
}
