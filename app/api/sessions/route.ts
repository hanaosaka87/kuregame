import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Prize } from '@/lib/supabase';
import { getStreakBonusPercent } from '@/lib/streakBonus';
import { todayStr } from '@/lib/gacha';
import { getPointsAdminClient, awardPoints, pointsForSpend, POINT_REASONS } from '@/lib/points';
import { isPremiumUser } from '@/lib/subscription';

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nickname, store_name, challenge_type, total_spent, prizes, prefecture, machine_type, user_id, battle_room_id, team_battle_id, team_side, basket_photo_base64, basket_photo_media_type } = body;

    if (!total_spent || !prizes || prizes.length === 0) {
      return NextResponse.json({ error: '入力不足' }, { status: 400 });
    }

    if (!isReady()) {
      return NextResponse.json({ session: null, skipped: true });
    }

    const total_retail_value = prizes.reduce((s: number, p: Prize) => s + p.retail_price * p.quantity, 0);
    const prize_count = prizes.reduce((s: number, p: Prize) => s + p.quantity, 0);
    const base_efficiency_rate = total_spent > 0
      ? Math.round((total_retail_value / total_spent) * 100 * 10) / 10 : 0;

    // 元取り率120%以上の高成績のみ、真実性担保のためカゴいっぱいの写真添付を必須にする
    const PHOTO_REQUIRED_THRESHOLD = 120;
    if (base_efficiency_rate >= PHOTO_REQUIRED_THRESHOLD && !basket_photo_base64) {
      return NextResponse.json({ error: `元取り率120%以上の登録には、カゴいっぱいの写真の添付が必須です` }, { status: 400 });
    }

    const supabase = getClient();

    // ソロ記録（フリーモード・金額チャレンジ）は、スタンダード会員以上（または創業メンバー特典）が必須。
    // 対戦モード・3対3団体戦は招待リンクでの無登録参加を維持するため、この制限の対象外とする。
    const isSoloMode = !battle_room_id && !team_battle_id;
    if (isSoloMode && !user_id) {
      return NextResponse.json(
        { error: 'チャレンジの記録には会員登録（ログイン＋スタンダード以上）が必要です', requiresUpgrade: true },
        { status: 403 }
      );
    }

    if (battle_room_id) {
      const { data: room } = await supabase
        .from('battle_rooms')
        .select('status')
        .eq('id', battle_room_id)
        .maybeSingle();
      if (room?.status === 'closed') {
        return NextResponse.json({ error: 'この対戦はすでに終了しています' }, { status: 400 });
      }
    }

    // 連続ログインボーナス＋本日のガチャボーナス（ログインユーザーのみ。
    // どちらもサーバー側でDBの実測値を見て決めるため改ざん不可。ガチャは抽選日当日のみ有効）
    let streakBonusPercent = 0;
    let gachaBonusPercent = 0;
    if (user_id) {
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('login_streak, gacha_bonus_percent, last_gacha_date, founding_member')
        .eq('id', user_id)
        .maybeSingle();
      streakBonusPercent = getStreakBonusPercent(prof?.login_streak || 0);
      if (prof?.last_gacha_date === todayStr()) {
        gachaBonusPercent = prof?.gacha_bonus_percent || 0;
      }

      // ソロ記録は創業メンバー特典、またはスタンダード以上の有効な会員のみ許可
      if (isSoloMode && !prof?.founding_member) {
        const hasActivePlan = await isPremiumUser(user_id);
        if (!hasActivePlan) {
          return NextResponse.json(
            { error: 'チャレンジの記録にはスタンダード会員（月額480円）以上のご登録が必要です', requiresUpgrade: true },
            { status: 403 }
          );
        }
      }
    }
    const totalBonusPercent = streakBonusPercent + gachaBonusPercent;
    const efficiency_rate = totalBonusPercent > 0
      ? Math.round(base_efficiency_rate * (1 + totalBonusPercent / 100) * 10) / 10
      : base_efficiency_rate;

    // ログインユーザーの場合、これが自己ベスト更新かどうかを事前に判定
    let isNewBest = false;
    if (user_id) {
      const { data: prevBest } = await supabase
        .from('game_sessions')
        .select('efficiency_rate')
        .eq('user_id', user_id)
        .order('efficiency_rate', { ascending: false })
        .limit(1)
        .maybeSingle();
      isNewBest = !prevBest || efficiency_rate > prevBest.efficiency_rate;
    }

    const { data: session, error: sessionErr } = await supabase
      .from('game_sessions')
      .insert({
        nickname: nickname || '名無しハンター',
        store_name: store_name || null,
        challenge_type: challenge_type || 'free',
        total_spent,
        total_retail_value,
        prize_count,
        efficiency_rate,
        prefecture: prefecture || null,
        machine_type: machine_type || null,
        user_id: user_id || null,
        battle_room_id: battle_room_id || null,
        team_battle_id: team_battle_id || null,
        team_side: team_side || null,
      })
      .select()
      .single();

    if (sessionErr) throw sessionErr;

    // 実際に使った金額に応じたポイント付与（ログインユーザーのみ、セッションIDでdedupeし1回限り）
    if (user_id) {
      const spendPoints = pointsForSpend(total_spent);
      if (spendPoints > 0) {
        const admin = getPointsAdminClient();
        await awardPoints(admin, user_id, spendPoints, POINT_REASONS.sessionSpend, `${POINT_REASONS.sessionSpend}_${session.id}`);
      }
    }

    await supabase.from('prizes').insert(
      prizes.map((p: Prize) => ({
        session_id: session.id,
        name: p.name, category: p.category,
        retail_price: p.retail_price, quantity: p.quantity,
      }))
    );

    // カゴいっぱいの証拠写真をアップロードしてセッションに紐付け（添付があった場合のみ）
    let photo_url: string | null = null;
    if (basket_photo_base64) {
      try {
        const ext = (basket_photo_media_type || 'image/jpeg').split('/')[1] || 'jpg';
        const path = `${session.id}-${Date.now()}.${ext}`;
        const bytes = Buffer.from(basket_photo_base64, 'base64');
        const { error: uploadErr } = await supabase.storage
          .from('best-photos')
          .upload(path, bytes, { contentType: basket_photo_media_type || 'image/jpeg', upsert: false });
        if (!uploadErr) {
          const { data: pub } = supabase.storage.from('best-photos').getPublicUrl(path);
          photo_url = pub.publicUrl;
          await supabase.from('game_sessions').update({ photo_url }).eq('id', session.id);
        }
      } catch (photoErr) {
        console.error('basket photo upload error:', photoErr);
      }
    }

    return NextResponse.json({ session: { ...session, photo_url: photo_url ?? session.photo_url }, isNewBest, streakBonusPercent, gachaBonusPercent, baseEfficiencyRate: base_efficiency_rate });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ session: null, skipped: true });
  }
}

export async function GET(req: NextRequest) {
  if (!isReady()) return NextResponse.json({ sessions: [] });

  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('challenge') || 'all';
  const supabase = getClient();

  let query = supabase
    .from('game_sessions')
    .select('*')
    .order('efficiency_rate', { ascending: false })
    .limit(20);

  if (challenge !== 'all') query = query.eq('challenge_type', challenge);

  const { data } = await query;
  return NextResponse.json({ sessions: data || [] });
}
