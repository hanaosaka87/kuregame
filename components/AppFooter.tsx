'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import FeedbackModal from './FeedbackModal';

export default function AppFooter() {
  const [showFeedback, setShowFeedback] = useState(false);
  const path = usePathname();

  const nav = [
    { href: '/',          emoji: '🏠', label: 'ホーム' },
    { href: '/challenge', emoji: '🎯', label: 'チャレンジ' },
    { href: '/feed',      emoji: '🔥', label: 'フィード' },
    { href: '/mypage',    emoji: '📊', label: 'マイ戦績' },
    { href: '/ranking',   emoji: '🏆', label: 'ランキング' },
    { href: '/stores',    emoji: '🏪', label: '店舗' },
    { href: '/howto',     emoji: '📖', label: '遊び方' },
    { href: '/guide',     emoji: '🕹️', label: '攻略' },
  ];

  return (
    <>
      <div style={{ padding: '20px 16px 8px', display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center' }}>
        <button
          onClick={() => setShowFeedback(true)}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.72rem', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          💬 フィードバック
        </button>
        <Link href="/oneshot" prefetch={false} style={{ color: 'var(--muted)', fontSize: '.72rem' }}>💥 一撃ゲットチャレンジ</Link>
        <Link href="/championship" prefetch={false} style={{ color: 'var(--muted)', fontSize: '.72rem' }}>🏆 チャンピオン大会</Link>
        <Link href="/sponsor" prefetch={false} style={{ color: 'var(--muted)', fontSize: '.72rem' }}>🤝 スポンサー募集</Link>
        <Link href="/flyer" prefetch={false} style={{ color: 'var(--muted)', fontSize: '.72rem' }}>📣 フライヤー</Link>
        <Link href="/privacy" prefetch={false} style={{ color: 'var(--muted)', fontSize: '.72rem' }}>プライバシーポリシー</Link>
        <Link href="/tokutei" prefetch={false} style={{ color: 'var(--muted)', fontSize: '.72rem' }}>特定商取引法</Link>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--muted2)', fontSize: '.64rem', paddingBottom: 8 }}>© 2026 株式会社華</p>

      {/* 常時viewport内の固定下部ナビのためprefetch無効化=CDNリクエスト削減、2026-11-04対応 */}
      <nav className="footer-nav">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={`nav-item${path === item.href ? ' active' : ''}`}>
            <span>{item.emoji}</span>{item.label}
          </Link>
        ))}
      </nav>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}
