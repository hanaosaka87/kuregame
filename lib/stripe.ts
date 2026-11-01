import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-08-26.dahlia',
    });
  }
  return _stripe;
}

// スタンダード会員（480円/月）
export const STANDARD_PRICE_ID = process.env.STRIPE_PRICE_ID ?? '';
// プレミアム会員（1,100円/月・SNS宣伝など上位特典つき）
export const PREMIUM_PRICE_ID = process.env.STRIPE_PRICE_ID_PREMIUM ?? '';

export type PlanKey = 'standard' | 'premium';

export function priceIdForPlan(plan: PlanKey): string {
  return plan === 'premium' ? PREMIUM_PRICE_ID : STANDARD_PRICE_ID;
}
