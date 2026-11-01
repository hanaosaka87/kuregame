import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// プレミアム会員(1,100円プラン)のSNSリンクを公開表示するには、他ユーザーの
// subscriptionsを横断参照する必要があり、anonキーのRLS（本人のみSELECT可）では
// 取得できないためservice_roleキーを使う。公開するのは既にランキングに載っている
// ユーザーの「プレミアム加入有無」と「本人が設定したSNS URL」のみ。
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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
  const machineType = searchParams.get('machine_type') || '';
  const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = searchParams.get('month') || defaultMonth;

  const supabase = getClient();

  type Extra = { avatar_emoji: string | null; avatar_url: string | null; sns_x: string | null; sns_instagram: string | null; sns_tiktok: string | null; sns_youtube: string | null; founding_member: boolean };
  const emptyExtra: Extra = { avatar_emoji: null, avatar_url: null, sns_x: null, sns_instagram: null, sns_tiktok: null, sns_youtube: null, founding_member: false };

  // ランキング上位のアイコン表示用にavatar_emojiを一括取得。
  // SNSリンクは「プレミアム会員（有効なsubscriptions.plan='premium'）」または「先着1,000名の創業メンバー」で、
  // かつこのランキング（上位30件以内）に載っている全員を対象に公開表示する（「ランキング入り」自体を目指す動機付けにするため）。
  // 創業メンバーは今後プレミアム課金を解禁しても、この特典を無料のまま永久に受けられる（2026-10-06 CFO提案）。
  async function withAvatars<T extends { user_id?: string | null }>(rows: T[]): Promise<(T & Extra)[]> {
    const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[];
    if (ids.length === 0) return rows.map(r => ({ ...r, ...emptyExtra }));

    const admin = getAdminClient();
    const [{ data: profiles }, { data: subs }] = await Promise.all([
      admin.from('user_profiles').select('id, avatar_emoji, avatar_url, sns_x, sns_instagram, sns_tiktok, sns_youtube, founding_member').in('id', ids),
      admin.from('subscriptions').select('user_id, plan, status, current_period_end').in('user_id', ids),
    ]);

    const premiumIds = new Set(
      (subs || [])
        .filter(s => s.plan === 'premium' && s.status === 'active' && s.current_period_end && new Date(s.current_period_end) > new Date())
        .map(s => s.user_id)
    );
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return rows.map(r => {
      const p = r.user_id ? profileMap.get(r.user_id) : null;
      const isFoundingMember = !!p?.founding_member;
      const unlocksSns = !!(r.user_id && premiumIds.has(r.user_id)) || isFoundingMember;
      return {
        ...r,
        avatar_emoji: p?.avatar_emoji ?? null,
        avatar_url: p?.avatar_url ?? null,
        sns_x: unlocksSns ? p?.sns_x ?? null : null,
        sns_instagram: unlocksSns ? p?.sns_instagram ?? null : null,
        sns_tiktok: unlocksSns ? p?.sns_tiktok ?? null : null,
        sns_youtube: unlocksSns ? p?.sns_youtube ?? null : null,
        founding_member: isFoundingMember,
      };
    });
  }

  // 月間チャンピオン（都道府県ごと1位を一覧）
  if (type === 'monthly_champions') {
    const { data, error } = await supabase
      .from('v_monthly_champions')
      .select('*')
      .eq('year_month', month)
      .order('efficiency_rate', { ascending: false });
    if (error) return NextResponse.json({ champions: [] });
    return NextResponse.json({ champions: await withAvatars(data) });
  }

  // 通算（全期間の累計）元取り率ランキング
  if (type === 'overall') {
    const { data, error } = await supabase
      .from('v_overall_ranking')
      .select('*')
      .order('efficiency_rate', { ascending: false })
      .limit(limit);
    if (error) return NextResponse.json({ sessions: [] });
    return NextResponse.json({ sessions: await withAvatars(data) });
  }

  // 共通クエリ
  let query = supabase
    .from('game_sessions')
    .select('id,nickname,prefecture,challenge_type,total_spent,total_retail_value,prize_count,efficiency_rate,store_name,created_at,user_id,machine_type')
    .order('efficiency_rate', { ascending: false })
    .limit(limit);

  if (challenge !== 'all') query = query.eq('challenge_type', challenge);
  if (machineType) query = query.eq('machine_type', machineType);

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
  return NextResponse.json({ sessions: await withAvatars(data) });
}
