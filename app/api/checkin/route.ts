import { NextRequest, NextResponse } from 'next/server';
import { getPointsAdminClient, awardPoints, POINT_REASONS, POINT_AMOUNTS } from '@/lib/points';

export const dynamic = 'force-dynamic';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// 前回ログイン日から今日までの日数差を計算（日付文字列同士の比較のみ・タイムゾーンは簡易対応）
function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z').getTime();
  const b = new Date(to + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * ログインチェックイン：連続ログイン日数の更新・毎日のログイン報酬・連続ログインマイルストーン報酬を
 * すべてサーバー側（service_roleキー）で行う。元取り率ブースト計算用のlogin_streakという
 * 既存列を、ポイントという実価値のある通貨の付与にも使うため、クライアントの直接書き込みをやめ
 * このAPI経由に一本化する（lib/useAuth.tsから呼び出す）。
 */
export async function POST(req: NextRequest) {
  const { user_id } = await req.json().catch(() => ({}));
  if (!user_id) return NextResponse.json({ error: '未ログイン' }, { status: 401 });

  const admin = getPointsAdminClient();
  const { data: profile, error: fetchErr } = await admin
    .from('user_profiles')
    .select('login_streak, last_login_date, points')
    .eq('id', user_id)
    .maybeSingle();
  if (fetchErr || !profile) return NextResponse.json({ error: 'プロフィールが見つかりません' }, { status: 404 });

  const today = todayStr();
  if (profile.last_login_date === today) {
    // 本日すでにチェックイン済み：現在値をそのまま返すだけ（再付与しない）
    return NextResponse.json({ streak: profile.login_streak || 0, points: profile.points || 0, alreadyCheckedIn: true });
  }

  const prevStreak = profile.login_streak || 0;
  const diff = profile.last_login_date ? daysBetween(profile.last_login_date, today) : null;
  const newStreak = diff === 1 ? prevStreak + 1 : 1;

  const { error: updateErr } = await admin
    .from('user_profiles')
    .update({ login_streak: newStreak, last_login_date: today })
    .eq('id', user_id);
  if (updateErr) return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });

  // ① 毎日のログイン報酬（1日1回）
  await awardPoints(admin, user_id, POINT_AMOUNTS.dailyLogin, POINT_REASONS.dailyLogin, `${POINT_REASONS.dailyLogin}_${user_id}_${today}`);

  // ② 連続ログインマイルストーン報酬（その日数に到達した日に1回）
  const milestoneAmount = POINT_AMOUNTS.streakMilestone[newStreak];
  if (milestoneAmount) {
    await awardPoints(admin, user_id, milestoneAmount, POINT_REASONS.streakMilestone, `${POINT_REASONS.streakMilestone}_${user_id}_${newStreak}_${today}`);
  }

  const { data: finalProfile } = await admin
    .from('user_profiles')
    .select('points')
    .eq('id', user_id)
    .maybeSingle();

  return NextResponse.json({ streak: newStreak, points: finalProfile?.points || 0, alreadyCheckedIn: false });
}
