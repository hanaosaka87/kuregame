'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppFooter from '@/components/AppFooter';

const FEATURES = [
  { emoji: '✅', title: '公式認定バッジ＋優先表示', desc: '「店舗・新店情報」ページのチェーン公式リンク集の先頭に固定表示。バッジ付きで信頼感アップ。' },
  { emoji: '🏆', title: '店舗別 元取り率ランキング', desc: '現在は全国・都道府県単位のみのランキングを、貴店舗限定で開放。「この店で挑戦した人の実績」を来店動機として発信できます。' },
  { emoji: '🔍', title: 'チャレンジ画面での優先サジェスト', desc: 'ユーザーが記録時に入力する店舗名候補に、貴店舗を優先表示。' },
  { emoji: '🆕', title: '新店情報「公式」バッジ', desc: '新規オープン・リニューアル投稿にユーザー投稿と区別できる公式バッジを付与。' },
  { emoji: '🎉', title: '店舗限定チャレンジイベント', desc: '期間限定で「〇〇店で挑戦するとボーナス」演出を実施できます。' },
  { emoji: '🎰', title: '（準備中）ガチャ×来店クーポン連携', desc: 'アプリ内ガチャの当選特典を、実店舗で使えるクーポンコードに接続する構想です。' },
];

// 基本プラン：店舗数で選ぶ「どちらか一方」。上位プランは下位プランの内容をすべて含む
const BASE_PLANS = [
  {
    name: '個店プラン',
    unit: '1店舗',
    price: '5,000円',
    period: '/月〜',
    color: '#ffd700',
    features: ['公式認定バッジ＋優先表示', '店舗別元取り率ランキング開放', 'チャレンジ画面での優先サジェスト'],
  },
  {
    name: 'チェーン一括プラン',
    unit: '3店舗以上（目安）',
    price: '1店舗あたり3,000円',
    period: '/月〜',
    color: '#00e5ff',
    features: ['個店プランの内容をすべて含む', '新店情報「公式」バッジ', '店舗限定チャレンジイベント枠', '店舗数に応じたボリューム割引（応相談）'],
  },
];

// 追加オプション：基本プランのどちらかに上乗せする形（単独では選べない）
const AREA_OPTION = {
  name: 'エリア独占オプション',
  price: '+1万円',
  period: '/月〜',
  color: '#ff3daf',
  features: ['対象都道府県でスポンサー枠を独占', '将来の「全国大会」冠協賛を優先案内'],
};

export default function SponsorStorePage() {
  const [form, setForm] = useState({ company: '', storeCount: '', name: '', email: '', plan: '', areaOption: false, message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const planSummary = [form.plan, form.areaOption ? 'エリア独占オプション' : null].filter(Boolean).join(' + ');
      const res = await fetch('/api/sponsor-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType: 'store', ...form, plan: planSummary }),
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
    <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '0 0 96px', background: 'radial-gradient(120% 60% at 50% 0%,#260a52 0%,#0a0018 55%,#05000f 100%)' }}>
      <div style={{ padding: '28px 16px 0' }}>
        <Link href="/sponsor" style={{ color: 'var(--muted)', fontSize: '.76rem', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          ← スポンサー募集トップへ
        </Link>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--cyan)', textShadow: '0 0 8px rgba(0,229,255,.4)', marginBottom: 4 }}>
          🏪 アミューズメント施設様向けスポンサープラン
        </h1>
        <p style={{ color: 'var(--lav)', fontSize: '.8rem', lineHeight: 1.7, marginBottom: 24 }}>
          クレゲーは「今まさにクレーンゲームにお金を使っている人」が集まるアプリです。一般的な広告と違い、来店・再来店につながる機能連携でご案内できます。
        </p>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* 一般スポンサー向け誘導 */}
        <Link href="/sponsor" style={{ display: 'block', marginBottom: 24, textDecoration: 'none' }}>
          <div style={{ background: 'rgba(255,61,175,.08)', border: '1px solid rgba(255,61,175,.4)', padding: '12px 14px', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ fontSize: '.78rem', color: 'var(--accent)', fontWeight: 700 }}>
              施設運営以外の一般スポンサー様はこちら →
            </div>
          </div>
        </Link>

        {/* 機能連携の特徴 */}
        <h2 style={{ fontSize: '.98rem', fontWeight: 900, marginBottom: 12 }}>ご提供できる機能連携</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: 'var(--card)', border: '1px solid var(--card2)', padding: '13px 14px', borderLeft: '4px solid var(--cyan)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '1.1rem' }}>{f.emoji}</span>
                <span style={{ fontWeight: 900, fontSize: '.86rem' }}>{f.title}</span>
              </div>
              <p style={{ fontSize: '.74rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* プラン */}
        <h2 style={{ fontSize: '.98rem', fontWeight: 900, marginBottom: 4 }}>プラン（検討中・目安）</h2>
        <p style={{ fontSize: '.74rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>
          まず店舗数に合わせて<strong style={{ color: 'var(--text)' }}>①基本プランをどちらか1つ</strong>選び、必要な場合のみ下の<strong style={{ color: 'var(--text)' }}>②エリア独占オプション</strong>を追加してください。
        </p>

        <div style={{ fontSize: '.68rem', fontWeight: 900, color: 'var(--muted)', letterSpacing: '.05em', marginBottom: 8 }}>① 基本プラン（どちらか1つ）</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {BASE_PLANS.map(plan => (
            <div key={plan.name} style={{ background: 'var(--card)', border: '1px solid var(--card2)', padding: '16px', borderLeft: `4px solid ${plan.color}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: '.78rem', fontWeight: 900, letterSpacing: '.05em', color: plan.color }}>{plan.name}</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: plan.color }}>{plan.price}<span style={{ fontSize: '.68rem', fontWeight: 700 }}>{plan.period}</span></span>
              </div>
              <div style={{ fontSize: '.68rem', color: 'var(--muted2)', marginBottom: 10 }}>対象目安：{plan.unit}</div>
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

        <div style={{ fontSize: '.68rem', fontWeight: 900, color: 'var(--muted)', letterSpacing: '.05em', marginBottom: 8 }}>② エリア独占オプション（追加・任意）</div>
        <div style={{ background: 'var(--card)', border: `1px dashed ${AREA_OPTION.color}`, padding: '16px', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: '.78rem', fontWeight: 900, letterSpacing: '.05em', color: AREA_OPTION.color }}>＋ {AREA_OPTION.name}</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: AREA_OPTION.color }}>{AREA_OPTION.price}<span style={{ fontSize: '.68rem', fontWeight: 700 }}>{AREA_OPTION.period}</span></span>
          </div>
          <div style={{ fontSize: '.68rem', color: 'var(--muted2)', marginBottom: 10 }}>①のプランに追加できるオプションです（単独では選べません）</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {AREA_OPTION.features.map(f => (
              <li key={f} style={{ fontSize: '.76rem', color: 'var(--muted)', display: 'flex', gap: 6 }}>
                <span style={{ color: AREA_OPTION.color, flexShrink: 0 }}>✓</span>{f}
              </li>
            ))}
          </ul>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.82rem', fontWeight: 700, color: form.areaOption ? AREA_OPTION.color : 'var(--muted)' }}>
            <input type="checkbox" checked={form.areaOption} onChange={e => setForm(prev => ({ ...prev, areaOption: e.target.checked }))} style={{ width: 16, height: 16, accentColor: AREA_OPTION.color }} />
            このオプションも希望する
          </label>
        </div>

        {/* 申し込みフォーム */}
        <h2 style={{ fontSize: '.98rem', fontWeight: 900, marginBottom: 12 }}>お問い合わせ</h2>
        {done ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--card2)', padding: '32px 20px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>🏪</div>
            <div style={{ fontWeight: 900, fontSize: '.95rem', marginBottom: 6, color: 'var(--green)' }}>お問い合わせありがとうございます！</div>
            <p style={{ fontSize: '.8rem', color: 'var(--muted)' }}>担当者より3営業日以内にご連絡いたします。</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: 'var(--card)', border: '1px solid var(--card2)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>店舗名・チェーン名 *</label>
              <input type="text" required placeholder="例：GiGO 渋谷店 / 株式会社〇〇（チェーン本部）" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>店舗数（目安）</label>
              <input type="text" placeholder="例：1店舗 / 全国50店舗" value={form.storeCount} onChange={e => setForm({ ...form, storeCount: e.target.value })} />
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
              <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>希望プラン（①基本プラン）</label>
              <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
                <option value="">選択してください</option>
                {BASE_PLANS.map(p => <option key={p.name} value={p.name}>{p.name}（{p.price}{p.period}）</option>)}
                <option value="相談">まずは相談したい</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.78rem', color: form.areaOption ? AREA_OPTION.color : 'var(--muted)', marginTop: 8 }}>
                <input type="checkbox" checked={form.areaOption} onChange={e => setForm(f => ({ ...f, areaOption: e.target.checked }))} style={{ width: 15, height: 15, accentColor: AREA_OPTION.color }} />
                ②エリア独占オプションも希望する
              </label>
            </div>
            <div>
              <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>メッセージ（任意）</label>
              <textarea rows={3} placeholder="ご要望・ご質問があればご記入ください" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                style={{ width: '100%', background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--text)', padding: '10px 12px', fontFamily: 'inherit', fontSize: '.88rem', resize: 'none' }} />
            </div>
            {error && <p style={{ color: 'var(--accent)', fontSize: '.82rem' }}>⚠️ {error}</p>}
            <button type="submit" className="btn-primary" disabled={submitting}>
              <b>{submitting ? '送信中...' : '📨 問い合わせる'}</b>
            </button>
          </form>
        )}
      </div>

      <AppFooter />
    </main>
  );
}
