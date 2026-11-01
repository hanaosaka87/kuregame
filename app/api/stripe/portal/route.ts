import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getUserSubscription } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  const { user_id } = await req.json();
  if (!user_id) {
    return NextResponse.json({ error: '未ログイン' }, { status: 401 });
  }

  const sub = await getUserSubscription(user_id);
  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'サブスクリプションなし' }, { status: 404 });
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL;
  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/mypage`,
  });

  return NextResponse.json({ url: session.url });
}
