import Link from 'next/link';
import AppFooter from '@/components/AppFooter';

export default function PremiumSuccessPage() {
  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '60px 20px 100px', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>⭐</div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--gold)', marginBottom: 10 }}>
        プレミアム登録ありがとうございます！
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '.88rem', lineHeight: 1.8, marginBottom: 28 }}>
        決済が完了しました。反映まで数秒かかる場合があります。<br />
        マイ戦績ページからプレミアム特典をご確認ください。
      </p>
      <Link href="/mypage"><button className="btn-primary">📊 マイ戦績を見る</button></Link>
      <AppFooter />
    </main>
  );
}
