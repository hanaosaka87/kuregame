'use client';
import { useState } from 'react';
import Link from 'next/link';

// NEXT_PUBLIC_PREMIUM_ENABLED=true になるまで非表示
const PREMIUM_ENABLED = process.env.NEXT_PUBLIC_PREMIUM_ENABLED === 'true';

interface Props {
  userId: string;
  email?: string | null;
  plan: 'standard' | 'premium' | null; // 現在の有効プラン（未加入はnull）
  foundingMember?: boolean; // 創業メンバー特典：課金なしで全機能が永久無料
}

export default function PremiumUpgradeButton({ userId, email, plan, foundingMember }: Props) {
  const [loading, setLoading] = useState<'standard' | 'premium' | 'portal' | null>(null);

  if (!PREMIUM_ENABLED) return null;

  const handleUpgrade = async (targetPlan: 'standard' | 'premium') => {
    setLoading(targetPlan);
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, email, plan: targetPlan }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setLoading(null);
  };

  const handlePortal = async () => {
    setLoading('portal');
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setLoading(null);
  };

  // 創業メンバーはプレミアム会員相当として全機能を無料で使えるが、
  // 正式にプレミアムへアップグレードしたい場合のバナーは引き続き表示する。
  if (foundingMember && !plan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            background: 'var(--gold)', color: '#14001f',
            fontSize: '.68rem', fontWeight: 900, padding: '3px 10px', borderRadius: 20,
          }}>
            🌟 創業メンバー（プレミアム会員相当）
          </span>
          <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>記録・SNS宣伝特典など、プレミアムの内容をすべて無料でご利用中です</span>
        </div>
        <button onClick={() => handleUpgrade('premium')} disabled={loading !== null} className="btn-primary"
          style={{ fontSize: '.85rem', padding: '12px 14px', whiteSpace: 'nowrap', opacity: loading ? .6 : 1 }}>
          {loading === 'premium' ? '処理中...' : '⭐ プレミアムへアップグレード（¥1,100/月）'}
        </button>
      </div>
    );
  }

  if (plan) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          background: plan === 'premium' ? 'var(--gold)' : 'var(--cyan)', color: '#14001f',
          fontSize: '.68rem', fontWeight: 900, padding: '3px 10px', borderRadius: 20,
        }}>
          {plan === 'premium' ? '⭐ プレミアム会員' : '🎫 スタンダード会員'}
        </span>
        <button onClick={handlePortal} disabled={loading !== null}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.72rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
          {loading === 'portal' ? '処理中...' : 'プラン管理'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button onClick={() => handleUpgrade('standard')} disabled={loading !== null} className="btn-secondary" style={{ opacity: loading ? .6 : 1 }}>
        <b>{loading === 'standard' ? '処理中...' : '🎫 スタンダード・月額480円（チャレンジ記録が使える）'}</b>
      </button>
      <button onClick={() => handleUpgrade('premium')} disabled={loading !== null} className="btn-primary" style={{ opacity: loading ? .6 : 1 }}>
        <b>{loading === 'premium' ? '処理中...' : '⭐ プレミアム・月額1,100円（記録+SNS宣伝特典）'}</b>
      </button>
      <Link href="/premium" style={{ fontSize: '.74rem', color: 'var(--muted)', textAlign: 'center', textDecoration: 'underline' }}>
        会員プランについて詳しく見る
      </Link>
    </div>
  );
}
