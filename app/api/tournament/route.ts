import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { REGIONS, regionOfPrefecture } from '@/lib/regions';

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/tournament?month=2026-09
// 全国大会への道筋（Phase1）：既存の「月間都道府県チャンピオン」（v_monthly_champions）を
// 地域ブロックごとにグルーピングし、各ブロック内の最高元取り率者を「地域チャンピオン」として返す。
// 新しい大会専用テーブルは持たず、既存データの集計・可視化のみで実現する。
export async function GET(req: NextRequest) {
  if (!isReady()) return NextResponse.json({ regions: [] });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = searchParams.get('month') || defaultMonth;

  const supabase = getClient();
  const { data, error } = await supabase
    .from('v_monthly_champions')
    .select('*')
    .eq('year_month', month)
    .order('efficiency_rate', { ascending: false });

  if (error) return NextResponse.json({ regions: [], month, error: error.message });

  const champions = data || [];

  const regions = REGIONS.map(r => {
    const members = champions.filter(c => regionOfPrefecture(c.prefecture)?.key === r.key);
    const regionChampion = members[0] || null; // 既にefficiency_rate降順ソート済み
    return {
      key: r.key,
      label: r.label,
      emoji: r.emoji,
      prefectureCount: r.prefectures.length,
      qualifiedCount: members.length,
      members,
      regionChampion,
    };
  });

  return NextResponse.json({ month, regions });
}
