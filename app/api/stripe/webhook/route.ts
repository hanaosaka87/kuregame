import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { upsertSubscription } from '@/lib/subscription';
import Stripe from 'stripe';

function planFromMetadata(metadata: Stripe.Metadata | null | undefined): 'standard' | 'premium' {
  return metadata?.plan === 'premium' ? 'premium' : 'standard';
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Webhook署名エラー' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    if (!userId || !session.subscription) return NextResponse.json({ ok: true });

    const sub = await getStripe().subscriptions.retrieve(session.subscription as string) as unknown as Stripe.Subscription & { current_period_end: number };
    await upsertSubscription({
      userId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      plan: planFromMetadata(session.metadata),
    });
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription & { current_period_end: number };
    const userId = sub.metadata?.user_id;
    if (!userId) return NextResponse.json({ ok: true });

    await upsertSubscription({
      userId,
      stripeCustomerId: sub.customer as string,
      stripeSubscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      plan: planFromMetadata(sub.metadata),
    });
  }

  return NextResponse.json({ ok: true });
}
