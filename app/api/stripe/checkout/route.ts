import { NextRequest, NextResponse } from 'next/server';
import { getStripe, priceIdForPlan, type PlanKey } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const { user_id, email, plan } = await req.json();
  if (!user_id) {
    return NextResponse.json({ error: '未ログイン' }, { status: 401 });
  }
  const planKey: PlanKey = plan === 'premium' ? 'premium' : 'standard';
  const priceId = priceIdForPlan(planKey);
  if (!priceId) {
    return NextResponse.json({ error: 'このプランは準備中です' }, { status: 503 });
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL;

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { user_id, plan: planKey },
    subscription_data: { metadata: { user_id, plan: planKey } },
    customer_email: email || undefined,
    success_url: `${origin}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/mypage`,
    locale: 'ja',
  });

  return NextResponse.json({ url: session.url });
}
