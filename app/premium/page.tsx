'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import AppFooter from '@/components/AppFooter';
import PremiumUpgradeButton from '@/components/PremiumUpgradeButton';

const FREE_FEATURES = [
  '全国・都道府県別・月間ランキングの閲覧',
  '攻略ガイド・遊び方ガイドの閲覧',
  'フィードでみんなの自慢を見る・「スゲー！」を送る',
];

const STANDARD_FEATURES = [
  'チャレンジ記録（写真AI自動判定・元取り率計算）でランキングに参加できます',
  '対戦モード・3対3団体戦に参加できます',
  'レベル（Lv.1〜100）・マイポイントの獲得と交換ができます',
];

const PREMIUM_FEATURES = [
  'スタンダードの全機能に加えて、ランキング上位30位以内に入ると、あなたのSNS（X / Instagram / TikTok / YouTube）がプロフィールと一緒に公開表示されます',
  '「目指せランキング入り！」でご自身のSNS発信・活動の宣伝につながります',
];

export default function PremiumPage() {
  const { user, profile } = useAuth();
  const [plan, setPlan] = useState<'standard' | 'premium' | null>(null);

  useEffect(() => {
    if (!user) { setPlan(null); return; }
    (async () => {
      try {
        const { data } = await getSupabase()
          .from('subscriptions')
          .select('plan, status, current_period_end')
          .eq('user_id', user.id)
          .single();
        const active = !!data && data.status === 'active' && !!data.current_period_end && new Date(data.current_period_end) > new Date();
        setPlan(active ? (data.plan === 'premium' ? 'premium' : 'standard') : null);
      } catch {
        setPlan(null);
      }
    })();
  }, [user]);

  return (
    <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '20px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 4 }}>💎 クレゲーの会員プランについて</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 24 }}>
        ランキングの閲覧やガイドは無料でご覧いただけますが、<strong style={{ color: 'var(--text)' }}>チャレンジを記録してランキングに参加するにはスタンダード以上のご登録が必要</strong>です。
      </p>

      <div style={{ background: 'var(--card)', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 10 }}>🆓 無料会員（ずっと無料）</h3>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 18, margin: 0 }}>
          {FREE_FEATURES.map((f, i) => (
            <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.6 }}>{f}</li>
          ))}
        </ul>
      </div>

      <div style={{ background: 'var(--card)', borderRadius: 14, padding: '16px', marginBottom: 16, border: '2px solid var(--cyan)' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4, color: 'var(--cyan)' }}>🎫 スタンダード会員（月額480円）</h3>
        <p style={{ fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 10 }}>
          無料会員の内容に加えて、以下が使えるようになります。
        </p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 18, margin: 0 }}>
          {STANDARD_FEATURES.map((f, i) => (
            <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.6 }}>{f}</li>
          ))}
        </ul>
      </div>

      <div style={{ background: 'var(--card)', borderRadius: 14, padding: '16px', marginBottom: 16, border: '2px solid var(--gold)' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4, color: 'var(--gold)' }}>⭐ プレミアム会員（月額1,100円）</h3>
        <p style={{ fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 10 }}>
          スタンダード会員の内容に加えて、以下が使えるようになります。
        </p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 18, margin: 0 }}>
          {PREMIUM_FEATURES.map((f, i) => (
            <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.6 }}>{f}</li>
          ))}
        </ul>
      </div>

      <div style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--gold)', marginBottom: 4 }}>🌟 公開記念・先着1,000名様限定キャンペーン実施中</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.7 }}>
          公式LINEを友だち追加して「クレゲー」と送信・合言葉を入力すると「創業メンバー」に認定され、スタンダード・プレミアムの全機能（チャレンジ記録・ランキング参加・SNS宣伝特典を含む）を<strong style={{ color: 'var(--gold)' }}>無料でずっと</strong>ご利用いただけます。マイページから登録できます。
        </p>
      </div>

      <div style={{ background: 'var(--card2)', borderRadius: 14, padding: '14px 16px', marginBottom: 24, fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>ご契約について</div>
        いつでもマイページの「プラン管理」から解約・変更ができます。解約後も、現在のお支払い期間の終了まではプレミアム特典をご利用いただけます。
      </div>

      {user ? (
        <PremiumUpgradeButton userId={user.id} email={user.email} plan={plan} foundingMember={profile?.founding_member} />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 12 }}>ご登録にはログインが必要です</p>
          <Link href="/auth"><button className="btn-primary">ログイン / 新規登録</button></Link>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Link href="/mypage" style={{ fontSize: '.78rem', color: 'var(--muted)' }}>← マイ戦績に戻る</Link>
      </div>

      <AppFooter />
    </main>
  );
}
