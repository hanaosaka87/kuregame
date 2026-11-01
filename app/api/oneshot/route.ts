import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { OneshotRecord } from '@/lib/supabase';
import { getPointsAdminClient, awardPoints, pointsForSpend, POINT_REASONS } from '@/lib/points';
import { isPremiumUser } from '@/lib/subscription';

const ONESHOT_SPEND = 100; // 一撃ゲットの定義：100円（1プレイ）でゲットしたこと
// 「一撃連チャン」＝立て続けに一撃ゲットできた回数。前回の一撃ゲット登録からこの分数以内に
// 次を登録すると連チャン継続、これを超えると1にリセットする（間に別の通常チャレンジを挟んだかは
// 判定していない簡易な時間近接判定）。「本日の合計」（連続していなくても1日に何回か）とは別概念。
const COMBO_WINDOW_MINUTES = 20;

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function todayStr() {
  // JSTの日付文字列（YYYY-MM-DD）
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });
}
function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z').getTime();
  const b = new Date(to + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      user_id, nickname, prefecture, store_name, machine_type,
      prize_name, category, retail_price,
      photo_base64, photo_media_type,
    } = body;

    if (!user_id) {
      return NextResponse.json({ error: '一撃ゲットの記録にはログインが必要です' }, { status: 401 });
    }
    if (!prize_name || !retail_price || Number(retail_price) <= 0) {
      return NextResponse.json({ error: '景品名と定価を入力してください' }, { status: 400 });
    }
    if (!isReady()) {
      return NextResponse.json({ record: null, skipped: true });
    }

    const supabase = getClient();
    const admin = getPointsAdminClient();

    const { data: prof } = await admin
      .from('user_profiles')
      .select('founding_member, oneshot_streak_days, oneshot_streak_days_best, oneshot_last_date, oneshot_day_best_count, oneshot_combo_streak, oneshot_combo_streak_best')
      .eq('id', user_id)
      .maybeSingle();
    if (!prof) {
      return NextResponse.json({ error: 'プロフィールが見つかりません' }, { status: 404 });
    }

    // 連チャン判定のため、今回の登録より前の最新の一撃ゲットの登録日時を取得しておく
    const { data: prevRecord } = await admin
      .from('oneshot_records')
      .select('created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 通常のソロ記録と同じく、スタンダード会員以上（または創業メンバー特典）が必須
    if (!prof.founding_member) {
      const hasActivePlan = await isPremiumUser(user_id);
      if (!hasActivePlan) {
        return NextResponse.json(
          { error: '一撃ゲットチャレンジの記録にはスタンダード会員（月額480円）以上のご登録が必要です', requiresUpgrade: true },
          { status: 403 }
        );
      }
    }

    const efficiency_rate = Math.round(Number(retail_price) / ONESHOT_SPEND * 100 * 10) / 10;

    const { data: record, error: insertErr } = await admin
      .from('oneshot_records')
      .insert({
        user_id,
        nickname: nickname || '名無しハンター',
        prefecture: prefecture || null,
        store_name: store_name || null,
        machine_type: machine_type || null,
        prize_name,
        category: category || 'other',
        retail_price: Number(retail_price),
        efficiency_rate,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    // 写真アップロード（既存の best-photos バケットを共用、ファイル名で一撃ゲット分を判別）
    let photo_url: string | null = null;
    if (photo_base64) {
      try {
        const ext = (photo_media_type || 'image/jpeg').split('/')[1] || 'jpg';
        const path = `oneshot-${record.id}-${Date.now()}.${ext}`;
        const bytes = Buffer.from(photo_base64, 'base64');
        const { error: uploadErr } = await supabase.storage
          .from('best-photos')
          .upload(path, bytes, { contentType: photo_media_type || 'image/jpeg', upsert: false });
        if (!uploadErr) {
          const { data: pub } = supabase.storage.from('best-photos').getPublicUrl(path);
          photo_url = pub.publicUrl;
          await admin.from('oneshot_records').update({ photo_url }).eq('id', record.id);
        }
      } catch (photoErr) {
        console.error('oneshot photo upload error:', photoErr);
      }
    }

    // ===== 連日記録・連チャン記録（本日の回数）の更新 =====
    const today = todayStr();
    const prevStreak = prof.oneshot_streak_days || 0;
    const prevStreakBest = prof.oneshot_streak_days_best || 0;
    const diff = prof.oneshot_last_date ? daysBetween(prof.oneshot_last_date, today) : null;

    let newStreakDays: number;
    if (prof.oneshot_last_date === today) {
      newStreakDays = prevStreak || 1; // 本日すでに記録済みなら連日記録は変わらない
    } else if (diff === 1) {
      newStreakDays = prevStreak + 1;
    } else {
      newStreakDays = 1; // 間が空いた、または初回
    }
    const newStreakBest = Math.max(prevStreakBest, newStreakDays);

    // ===== 一撃連チャン（立て続けに一撃ゲットできた回数）の更新 =====
    const minutesSincePrev = prevRecord
      ? (Date.now() - new Date(prevRecord.created_at).getTime()) / 60000
      : null;
    const newCombo = (minutesSincePrev !== null && minutesSincePrev <= COMBO_WINDOW_MINUTES)
      ? (prof.oneshot_combo_streak || 0) + 1
      : 1;
    const newComboBest = Math.max(prof.oneshot_combo_streak_best || 0, newCombo);

    // 本日の一撃ゲット回数（今回の登録も含む）
    const startOfTodayJST = `${today}T00:00:00+09:00`;
    const { count: todayCountRaw } = await admin
      .from('oneshot_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('created_at', startOfTodayJST);
    const todayCount = todayCountRaw || 1;
    const newDayBest = Math.max(prof.oneshot_day_best_count || 0, todayCount);

    await admin
      .from('user_profiles')
      .update({
        oneshot_streak_days: newStreakDays,
        oneshot_streak_days_best: newStreakBest,
        oneshot_last_date: today,
        oneshot_day_best_count: newDayBest,
        oneshot_combo_streak: newCombo,
        oneshot_combo_streak_best: newComboBest,
      })
      .eq('id', user_id);

    // 今月の一撃ゲット回数
    const startOfMonth = `${today.slice(0, 7)}-01T00:00:00+09:00`;
    const { count: monthCountRaw } = await admin
      .from('oneshot_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .gte('created_at', startOfMonth);

    // 実際に使った100円ぶんのポイント付与（通常のチャレンジ記録と同じ経済圏）
    const spendPoints = pointsForSpend(ONESHOT_SPEND);
    if (spendPoints > 0) {
      await awardPoints(admin, user_id, spendPoints, POINT_REASONS.sessionSpend, `${POINT_REASONS.sessionSpend}_oneshot_${record.id}`);
    }

    return NextResponse.json({
      record: { ...record, photo_url: photo_url ?? record.photo_url },
      stats: {
        streakDays: newStreakDays,
        streakDaysBest: newStreakBest,
        comboStreak: newCombo,
        comboStreakBest: newComboBest,
        dayCount: todayCount,
        dayBestCount: newDayBest,
        monthCount: monthCountRaw || 1,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '登録に失敗しました。もう一度お試しください。' }, { status: 500 });
  }
}

// GET /api/oneshot?type=ranking&limit=30
// GET /api/oneshot?type=mystats&user_id=xxx
export async function GET(req: NextRequest) {
  if (!isReady()) return NextResponse.json({ records: [] });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'ranking';
  const supabase = getClient();

  if (type === 'mystats') {
    const userId = searchParams.get('user_id');
    if (!userId) return NextResponse.json({ stats: null });

    const { data: prof } = await supabase
      .from('user_profiles')
      .select('oneshot_streak_days, oneshot_streak_days_best, oneshot_last_date, oneshot_day_best_count, oneshot_combo_streak, oneshot_combo_streak_best')
      .eq('id', userId)
      .maybeSingle();

    const today = todayStr();
    // 最後の記録日が今日/昨日でなければ連日記録は途切れている（表示上の0リセット）
    const diff = prof?.oneshot_last_date ? daysBetween(prof.oneshot_last_date, today) : null;
    const liveStreakDays = (diff === 0 || diff === 1) ? (prof?.oneshot_streak_days || 0) : 0;

    const startOfTodayJST = `${today}T00:00:00+09:00`;
    const startOfMonth = `${today.slice(0, 7)}-01T00:00:00+09:00`;
    const [{ count: dayCount }, { count: monthCount }, { data: lastRecord }] = await Promise.all([
      supabase.from('oneshot_records').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfTodayJST),
      supabase.from('oneshot_records').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfMonth),
      supabase.from('oneshot_records').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    // 最後の一撃ゲットから連チャン判定時間を超えていれば、表示上は連チャンが途切れている（0リセット）
    const minutesSinceLast = lastRecord ? (Date.now() - new Date(lastRecord.created_at).getTime()) / 60000 : null;
    const liveCombo = (minutesSinceLast !== null && minutesSinceLast <= COMBO_WINDOW_MINUTES) ? (prof?.oneshot_combo_streak || 0) : 0;

    return NextResponse.json({
      stats: {
        streakDays: liveStreakDays,
        streakDaysBest: prof?.oneshot_streak_days_best || 0,
        comboStreak: liveCombo,
        comboStreakBest: prof?.oneshot_combo_streak_best || 0,
        dayCount: dayCount || 0,
        dayBestCount: prof?.oneshot_day_best_count || 0,
        monthCount: monthCount || 0,
      },
    });
  }

  // 一撃ゲット専用ランキング（通常の元取り率ランキングとは別集計）
  const limit = Math.min(Number(searchParams.get('limit') || 20), 50);
  const { data, error } = await supabase
    .from('oneshot_records')
    .select('id,nickname,prefecture,store_name,machine_type,prize_name,category,retail_price,efficiency_rate,photo_url,created_at')
    .order('efficiency_rate', { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ records: [] });
  return NextResponse.json({ records: (data || []) as OneshotRecord[] });
}
