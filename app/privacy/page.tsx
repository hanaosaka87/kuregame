import Link from 'next/link';
import type { Metadata } from 'next';
import AppFooter from '@/components/AppFooter';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | クレゲー',
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <Link href="/" style={{ color: 'var(--muted)', fontSize: '.82rem', display: 'inline-block', marginBottom: 24 }}>← トップへ戻る</Link>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--gold)', marginBottom: 8 }}>プライバシーポリシー</h1>
      <p style={{ color: 'var(--muted)', fontSize: '.78rem', marginBottom: 28 }}>最終更新日：2026年8月31日</p>

      {[
        {
          title: '1. 運営者情報',
          body: '株式会社華（以下「当社」）は、クレゲー（https://cranegame.hana.trickster.biz、以下「本サービス」）を運営しています。'
        },
        {
          title: '2. 収集する情報',
          body: `本サービスでは、以下の情報を収集する場合があります。\n\n・メールアドレス（ユーザー登録時）\n・ニックネーム・アバター絵文字・都道府県（プロフィール設定時）\n・チャレンジ記録（投入金額、定価、獲得アイテム名、元取り率等）\n・景品写真（AI判定機能使用時）\n・アクセスログ（IPアドレス、ブラウザ情報等）`
        },
        {
          title: '3. 利用目的',
          body: `収集した情報は以下の目的で利用します。\n\n・本サービスの提供・運営・改善\n・全国ランキング・都道府県別ランキングの表示\n・お問い合わせ・フィードバックへの対応\n・利用規約違反への対応`
        },
        {
          title: '4. 第三者提供',
          body: '当社は、法令に基づく場合を除き、収集した個人情報を事前の同意なく第三者に提供しません。'
        },
        {
          title: '5. 外部サービス',
          body: `本サービスでは以下の外部サービスを利用しています。\n\n・Supabase（データベース・認証）\n・Vercel（ホスティング）\n・Anthropic Claude API（景品写真AI判定）\n\n各サービスのプライバシーポリシーについては、各サービスのサイトをご確認ください。`
        },
        {
          title: '6. 安全管理',
          body: '収集した情報の漏洩・滅失・毀損を防止するため、適切なセキュリティ対策を講じます。'
        },
        {
          title: '7. Cookie・アクセス解析',
          body: '本サービスでは、サービス改善のためにCookieおよびアクセス解析ツールを使用する場合があります。'
        },
        {
          title: '8. アカウント・データの削除について',
          body: `クレゲー（株式会社華運営）のアカウントは、アプリ内の「マイページ」最下部「⚠️アカウントを削除する」からご本人がいつでも即時に削除できます。削除確認のため「削除」と入力したうえで実行してください。\n\n【削除されるデータ】\nメールアドレス・ニックネーム・都道府県・アバター設定などのアカウント情報、チャレンジ記録（投入金額・獲得アイテム・元取り率等）、アップロードされた景品写真、ポイント・プレミアム会員情報\n\n【削除後も保持する場合があるデータ】\n法令上の保存義務がある場合の最小限のログ、および全国ランキング等で既に匿名化・集計済みのデータ（個人を特定できない形式に限る）\n\n削除完了後は、お客様のアカウントで本サービスをご利用いただけなくなります。アプリ内での操作が難しい場合は、アプリ内フィードバック機能または下記お問い合わせ先までご連絡いただければ、本人確認のうえ代行対応いたします。`
        },
        {
          title: '9. 改定',
          body: '本ポリシーは、法令の改正やサービス変更に伴い改定することがあります。重要な変更がある場合はサービス上でお知らせします。'
        },
        {
          title: '10. お問い合わせ',
          body: 'プライバシーに関するお問い合わせ：hana@trickster.biz'
        },
      ].map((s, i) => (
        <section key={i} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '.95rem', fontWeight: 900, color: 'var(--cyan)', marginBottom: 8 }}>{s.title}</h2>
          <p style={{ color: 'var(--lav)', fontSize: '.84rem', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{s.body}</p>
        </section>
      ))}
      <AppFooter />
    </main>
  );
}
