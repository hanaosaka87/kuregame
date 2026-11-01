import Link from 'next/link';
import type { Metadata } from 'next';
import AppFooter from '@/components/AppFooter';

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | クレゲー',
};

const ROWS = [
  { label: '販売業者', value: '株式会社華' },
  { label: '代表者', value: '非公開（請求があれば遅滞なく開示します）' },
  { label: '所在地', value: '非公開（請求があれば遅滞なく開示します）' },
  { label: '電話番号', value: '非公開（請求があれば遅滞なく開示します）' },
  { label: 'メールアドレス', value: 'hana@trickster.biz' },
  { label: 'サービスURL', value: 'https://cranegame.hana.trickster.biz' },
  { label: '販売価格', value: '現在無料（将来的に有料プランを提供予定。価格は告知ページに記載します）' },
  { label: '対価以外の費用', value: 'インターネット接続費用（利用者負担）' },
  { label: '支払方法', value: 'クレジットカード（Stripe経由）※有料プラン提供開始時' },
  { label: '支払時期', value: '有料プラン契約時（詳細は提供開始時に告知）' },
  { label: 'サービス提供時期', value: '決済完了後、即時提供' },
  { label: 'キャンセル・返品', value: 'デジタルサービスの性質上、原則として返金・キャンセルは承れません。ただし、サービス提供が不可能な場合は全額返金します。' },
  { label: '動作環境', value: 'モダンブラウザ（Chrome / Safari / Firefox 最新版推奨）' },
];

export default function TokuteiPage() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <Link href="/" style={{ color: 'var(--muted)', fontSize: '.82rem', display: 'inline-block', marginBottom: 24 }}>← トップへ戻る</Link>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--gold)', marginBottom: 8 }}>特定商取引法に基づく表記</h1>
      <p style={{ color: 'var(--muted)', fontSize: '.78rem', marginBottom: 28 }}>最終更新日：2026年8月31日</p>

      <div style={{ border: '1px solid var(--line)', overflow: 'hidden' }}>
        {ROWS.map((r, i) => (
          <div key={i} style={{
            display: 'flex', gap: 0,
            borderBottom: i < ROWS.length - 1 ? '1px solid var(--line)' : 'none',
          }}>
            <div style={{
              flexShrink: 0, width: 140, padding: '12px 14px',
              background: 'var(--card-dark)', fontWeight: 700, fontSize: '.78rem',
              color: 'var(--cyan)', borderRight: '1px solid var(--line)',
            }}>
              {r.label}
            </div>
            <div style={{ flex: 1, padding: '12px 14px', fontSize: '.82rem', color: 'var(--lav)', lineHeight: 1.7 }}>
              {r.value}
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 24, color: 'var(--muted)', fontSize: '.74rem', lineHeight: 1.8 }}>
        ※ 代表者・所在地・電話番号は、消費者からの請求があれば遅滞なく開示いたします。<br />
        　 お問い合わせ先：hana@trickster.biz
      </p>
      <AppFooter />
    </main>
  );
}
