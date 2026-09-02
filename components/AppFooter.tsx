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
    { href: '/ranking',   emoji: '🏆', label: 'ランキング' },
    { href: '/stores',    emoji: '🏪', label: '店舗' },
    { href: '/guide',     emoji: '📖', label: 'ガイド' },
  ];

  return (
    <>
      <div style={{ padding: '20px 16px 8px', display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center' }}>
        <button
          onClick={() => setShowFeedback(true)}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.72rem', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          💬 フィードバック
        </button>
        <Link href="/privacy" style={{ color: 'var(--muted)', fontSize: '.72rem' }}>プライバシーポリシー</Link>
        <Link href="/tokutei" style={{ color: 'var(--muted)', fontSize: '.72rem' }}>特定商取引法</Link>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--muted2)', fontSize: '.64rem', paddingBottom: 8 }}>© 2026 株式会社華</p>

      <nav className="footer-nav">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${path === item.href ? ' active' : ''}`}>
            <span>{item.emoji}</span>{item.label}
          </Link>
        ))}
      </nav>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}
