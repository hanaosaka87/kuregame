import { NextRequest, NextResponse } from 'next/server';
import { isValidStoreSessionToken, STORE_SESSION_COOKIE } from '@/lib/storeAuth';
import { getPointsAdminClient } from '@/lib/points';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(STORE_SESSION_COOKIE)?.value;
  if (!isValidStoreSessionToken(token)) {
    return NextResponse.json({ ok: false, error: '店舗スタッフログインが必要です' }, { status: 401 });
  }

  const { code } = await req.json().catch(() => ({}));
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ ok: false, error: 'コードを入力してください' }, { status: 400 });
  }

  const admin = getPointsAdminClient();
  const { data, error } = await admin.rpc('verify_point_redemption', { p_code: code.trim() });
  if (error) {
    console.error('verify-code error:', error);
    return NextResponse.json({ ok: false, error: '確認処理に失敗しました' }, { status: 500 });
  }

  return NextResponse.json(data);
}
