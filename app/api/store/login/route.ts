import { NextRequest, NextResponse } from 'next/server';
import { checkStorePassword, issueStoreSessionToken, isValidStoreSessionToken, STORE_SESSION_COOKIE } from '@/lib/storeAuth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (typeof password !== 'string' || !checkStorePassword(password)) {
    return NextResponse.json({ error: 'パスワードが違います' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(STORE_SESSION_COOKIE, issueStoreSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return res;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(STORE_SESSION_COOKIE)?.value;
  if (!isValidStoreSessionToken(token)) {
    return NextResponse.json({ authed: false }, { status: 401 });
  }
  return NextResponse.json({ authed: true });
}
