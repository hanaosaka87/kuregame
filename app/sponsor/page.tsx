'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppFooter from '@/components/AppFooter';

const PLANS = [
  {
    name: 'シルバー',
    price: '8,000円/月',
    color: '#9d84c9',
    features: [
      '全ページ共通フッターにテキストリンク掲載',
    ],
  },
  {
    name: 'ゴールド',
    price: '2万円/月',
    color: '#00e5ff',
    features: [
      '全ページ共通フッターにロゴ・リンク掲載',
      'ランキングページ上部バナー',
      '四半期1回 公式Xでの告知',
    ],
  },
  {
    name: 'プラチナ',
    price: '5万円/月',
    color: '#ffd700',
    features: [
      '全ページ共通フッターにロゴ・リンク掲載',
      'ランキングページ上部バナー（最も見られるページ）',
      '結果画面（チャレンジ完了直後）にバナー掲載',
      '月1回 公式X（@hana_build）での告知',
      '月次レポート（掲載ページ別の表示回数）',
    ],
  },
];

export default function SponsorPage() {
  const [form, setForm] = useState({ company: '', name: '', email: '', plan: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/sponsor-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType: 'general', ...form }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError('送信に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '0 0 96px', background: 'radial-gradient(120% 60% at 50% 0%,#260a52 0%,#0a0018 55%,#05000f 100%)' }}>
      <div style={{ padding: '28px 16px 0' }}>
        <Link href="/" style={{ color: 'var(--muted)', fontSize: '.76rem', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          ← トップへ戻る
        </Link>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--gold)', textShadow: '0 0 8px rgba(255,215,0,.4)', marginBottom: 4 }}>
          🤝 スポンサー募集
        </h1>
        <p style={{ color: 'var(--lav)', fontSize: '.8rem', lineHeight: 1.7, marginBottom: 4 }}>
          「クレゲー」は、クレーンゲーム好きが全国の戦績を競い合う無料アプリです。景品・ホビー・エンタメ関連の商品/サービスに関心が高いユーザー層に、スポンサーとして情報を届けられます。
        </p>
        <p style={{ color: 'var(--muted2)', fontSize: '.72rem', lineHeight: 1.6, marginBottom: 24 }}>
          ※掲載面の表示回数・ユーザー属性などの実績数値は、お問い合わせ後に個別にご案内いたします。
        </p>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* サービス概要 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {[
            ['🗾', '全国対応', '47都道府県ランキング'],
            ['🎯', '無料アプリ', 'ユーザー登録不要で利用可'],
            ['🏆', '継続利用', 'チャレンジ・対戦・ランキングで毎日接触'],
          ].map(([emoji, a, b]) => (
            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card)', border: '1px solid var(--card2)', padding: '12px 14px', borderLeft: '4px solid var(--accent)' }}>
              <span style={{ fontSize: '1.3rem' }}>{emoji}</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: '.88rem' }}>{a}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{b}</div>
              </div>
            </div>
          ))}
        </div>

        {/* アミューズメント施設向け誘導 */}
        <Link href="/sponsor/store" style={{ display: 'block', marginBottom: 28, textDecoration: 'none' }}>
          <div style={{ background: 'rgba(0,229,255,.08)', border: '1px solid rgba(0,229,255,.4)', padding: '14px 16px', borderLeft: '4px solid var(--cyan)' }}>
            <div style={{ fontWeight: 900, fontSize: '.88rem', color: 'var(--cyan)', marginBottom: 4 }}>
              🏪 クレーンゲーム店舗（アミューズメント施設）を運営されている方へ
            </div>
            <div style={{ fontSize: '.76rem', color: 'var(--muted)' }}>
              店舗別ランキング・公式認定バッジなど、専用プランをご用意しています →
            </div>
          </div>
        </Link>

        {/* プラン */}
        <h2 style={{ fontSize: '.98rem', fontWeight: 900, marginBottom: 12 }}>掲載プラン（検討中・目安）</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{ background: 'var(--card)', border: '1px solid var(--card2)', padding: '16px', borderLeft: `4px solid ${plan.color}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '.78rem', fontWeight: 900, letterSpacing: '.05em', color: plan.color }}>{plan.name}</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: plan.color }}>{plan.price}</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: '.76rem', color: 'var(--muted)', display: 'flex', gap: 6 }}>
                    <span style={{ color: plan.color, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, plan: plan.name }))}
                style={{
                  marginTop: 12, width: '100%', padding: '10px', fontSize: '.82rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit',
                  background: form.plan === plan.name ? plan.color : 'transparent',
                  color: form.plan === plan.name ? '#0a0018' : plan.color,
                  border: `2px solid ${plan.color}`,
                }}>
                {form.plan === plan.name ? '✓ 選択中' : 'このプランを選ぶ'}
              </button>
            </div>
          ))}
        </div>

        {/* 申し込みフォーム */}
        <h2 style={{ fontSize: '.98rem', fontWeight: 900, marginBottom: 12 }}>スポンサー申し込み・お問い合わせ</h2>
        {done ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--card2)', padding: '32px 20px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>🤝</div>
            <div style={{ fontWeight: 900, fontSize: '.95rem', marginBottom: 6, color: 'var(--green)' }}>お申し込みありがとうございます！</div>
            <p style={{ fontSize: '.8rem', color: 'var(--muted)' }}>担当者より3営業日以内にご連絡いたします。</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: 'var(--card)', border: '1px solid var(--card2)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>会社名・団体名 *</label>
              <input type="text" required placeholder="株式会社〇〇" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>ご担当者名 *</label>
              <input type="text" required placeholder="山田 太郎" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>メールアドレス *</label>
              <input type="email" required placeholder="you@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>希望プラン</label>
              <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
                <option value="">選択してください</option>
                {PLANS.map(p => <option key={p.name} value={p.name}>{p.name}（{p.price}）</option>)}
                <option value="相談">まずは相談したい</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>メッセージ（任意）</label>
              <textarea rows={3} placeholder="ご要望・ご質問があればご記入ください" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                style={{ width: '100%', background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--text)', padding: '10px 12px', fontFamily: 'inherit', fontSize: '.88rem', resize: 'none' }} />
            </div>
            {error && <p style={{ color: 'var(--accent)', fontSize: '.82rem' }}>⚠️ {error}</p>}
            <button type="submit" className="btn-primary" disabled={submitting}>
              <b>{submitting ? '送信中...' : '📨 申し込む'}</b>
            </button>
          </form>
        )}
      </div>

      <AppFooter />
    </main>
  );
}
