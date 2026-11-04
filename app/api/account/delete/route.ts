import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const path = url.split('/best-photos/')[1];
  return path || null;
}

// POST /api/account/delete  header: Authorization: Bearer <access_token>
// ユーザー本人がマイページから起動するアカウント削除。Apple/Google審査が要求する
// 「アプリ内から削除を開始できること」を満たすための唯一の削除経路（Apple Guideline 5.1.1(v)対応）。
export async function POST(req: NextRequest) {
  if (!isReady()) return NextResponse.json({ error: '設定エラー' }, { status: 500 });

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  const admin = getAdminClient();

  // トークン自体をservice_roleで検証し、なりすましを防ぐ（session削除APIのuser_id直渡し方式より厳格な本人確認）
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
  }
  const userId = userData.user.id;

  try {
    // 1. 有効なStripeサブスクリプションがあれば先に解約（削除後に課金が継続しないようにする）
    const { data: sub } = await admin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
    if (sub?.stripe_subscription_id && sub.status === 'active') {
      try {
        await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
      } catch (e) {
        console.error('Stripe subscription cancel failed during account deletion', e);
      }
    }

    // 2. 写真ストレージの削除対象パスを先に集める
    const storagePaths: string[] = [];

    const { data: profile } = await admin.from('user_profiles').select('avatar_url, showcase_photo_url').eq('id', userId).maybeSingle();
    [profile?.avatar_url, profile?.showcase_photo_url].forEach((u) => {
      const p = storagePathFromUrl(u);
      if (p) storagePaths.push(p);
    });

    const { data: sessions } = await admin.from('game_sessions').select('id, photo_url').eq('user_id', userId);
    (sessions ?? []).forEach((s) => {
      const p = storagePathFromUrl(s.photo_url);
      if (p) storagePaths.push(p);
    });

    const { data: oneshots } = await admin.from('oneshot_records').select('photo_url').eq('user_id', userId);
    (oneshots ?? []).forEach((o) => {
      const p = storagePathFromUrl(o.photo_url);
      if (p) storagePaths.push(p);
    });

    if (storagePaths.length > 0) {
      await admin.storage.from('best-photos').remove(storagePaths);
    }

    // 3. user_profiles(id)を参照しているテーブルはFK制約でuser_profiles削除前に消す必要がある
    await admin.from('point_transactions').delete().eq('user_id', userId);
    await admin.from('referral_redemptions').delete().eq('user_id', userId);

    // 4. game_sessionsを消せば紐づくprizesはon delete cascadeで自動削除される
    const sessionIds = (sessions ?? []).map((s) => s.id);
    if (sessionIds.length > 0) {
      await admin.from('game_sessions').delete().in('id', sessionIds);
    }

    // 5. user_profilesを削除
    await admin.from('user_profiles').delete().eq('id', userId);

    // 6. auth.usersを削除。oneshot_records/showcase_likes/subscriptionsはauth.users参照のon delete cascadeで自動削除される
    const { error: delUserErr } = await admin.auth.admin.deleteUser(userId);
    if (delUserErr) throw delUserErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('account delete failed', e);
    return NextResponse.json({ error: '削除に失敗しました。時間をおいて再度お試しいただくか、お問い合わせください。' }, { status: 500 });
  }
}
