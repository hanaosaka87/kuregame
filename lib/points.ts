import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * クレゲー ポイント制度（定着率アップ施策）。
 * XP（lib/level.ts、レベル用）とは別の、将来スポンサー店舗・イベントで使える実価値のある通貨。
 * 改ざん防止のため、必ずこのファイル（service_roleクライアント）経由・サーバー側のみで付与する。
 * クライアントに直接points/point_transactionsへの書き込み権限は与えない（schema_points.sql参照）。
 */

export const POINT_REASONS = {
  dailyLogin: 'daily_login',
  streakMilestone: 'streak_milestone',
  battleWin: 'battle_win',
  feedLike: 'feed_like',
  feedLiked: 'feed_liked',
  referralRedeem: 'referral_redeem',
  monthlyChampion: 'monthly_champion',
  sessionSpend: 'session_spend',
  redeem: 'redeem',
} as const;

// 各アクションの付与ポイント数。金額を変える場合はここだけ変更すればよい。
export const POINT_AMOUNTS = {
  dailyLogin: 10,
  streakMilestone: { 3: 30, 7: 100, 14: 250, 30: 500, 100: 2000 } as Record<number, number>,
  battleWin: 20,
  feedLike: 5,
  feedLiked: 5,
  referralRedeem: 50,
  monthlyChampion: 500,
  // 実店舗での実際の消費額に連動（¥100につき1pt＝実質1%還元）
  spendYenPerPoint: 100,
} as const;

// 公開記念 還元率アップキャンペーン（2026-10-22〜2027-01-19、消費額ポイントを2倍＝実質2%還元）
const LAUNCH_CAMPAIGN_UNTIL = new Date('2027-01-19T00:00:00+09:00');
const LAUNCH_CAMPAIGN_MULTIPLIER = 2;

export function isLaunchCampaignActive(now: Date = new Date()): boolean {
  return now < LAUNCH_CAMPAIGN_UNTIL;
}

// 現在有効な「¥いくらで1pt」の実レート（キャンペーン中は通常の半分＝還元率2倍）
export function currentSpendYenPerPoint(now: Date = new Date()): number {
  return isLaunchCampaignActive(now)
    ? Math.floor(POINT_AMOUNTS.spendYenPerPoint / LAUNCH_CAMPAIGN_MULTIPLIER)
    : POINT_AMOUNTS.spendYenPerPoint;
}

// チャレンジで実際に使った金額から獲得ポイントを算出（ログインユーザーのみ対象）
export function pointsForSpend(totalSpent: number, now: Date = new Date()): number {
  return Math.floor(Math.max(0, totalSpent) / currentSpendYenPerPoint(now));
}

export function getPointsAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * ポイントを付与する。dedupeKeyを指定すると、同じユーザー×同じキーでは二度と付与されない
 * （DBのユニーク制約で保証、同時リクエストが来ても確実に1回だけ成功する）。
 */
export async function awardPoints(
  admin: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  dedupeKey?: string
): Promise<{ awarded: boolean; newTotal?: number }> {
  if (amount <= 0) return { awarded: false };

  const { error: insertErr } = await admin
    .from('point_transactions')
    .insert({ user_id: userId, amount, reason, dedupe_key: dedupeKey || null });

  if (insertErr) {
    // 23505 = unique_violation → 同じdedupeKeyで既に付与済み（正常な二重付与防止）
    if (insertErr.code !== '23505') {
      console.error('awardPoints insert error:', insertErr);
    }
    return { awarded: false };
  }

  const { data: newTotal, error: rpcErr } = await admin.rpc('increment_user_points', {
    p_user_id: userId,
    p_amount: amount,
  });
  if (rpcErr) {
    console.error('awardPoints increment error:', rpcErr);
    return { awarded: false };
  }

  return { awarded: true, newTotal: newTotal as number };
}
