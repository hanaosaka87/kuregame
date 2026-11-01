import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getUserSubscription(userId: string) {
  const { data } = await getAdminClient()
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

function isActive(sub: { status: string; current_period_end: string | null } | null): boolean {
  if (!sub) return false;
  if (sub.status !== 'active') return false;
  if (!sub.current_period_end) return false;
  return new Date(sub.current_period_end) > new Date();
}

// スタンダード・プレミアムいずれかの有効な有料会員か
export async function isPremiumUser(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  return isActive(sub);
}

// プレミアム（1,100円・上位プラン）の有効会員か。SNS宣伝機能などのゲートに使う
export async function isPremiumPlusUser(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  return isActive(sub) && sub.plan === 'premium';
}

export async function upsertSubscription(params: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date;
  plan?: 'standard' | 'premium';
}) {
  await getAdminClient().from('subscriptions').upsert({
    user_id: params.userId,
    stripe_customer_id: params.stripeCustomerId,
    stripe_subscription_id: params.stripeSubscriptionId,
    status: params.status,
    current_period_end: params.currentPeriodEnd.toISOString(),
    ...(params.plan ? { plan: params.plan } : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}
