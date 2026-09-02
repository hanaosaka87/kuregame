'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';

export default function Header() {
  const { user, profile, loading, signOut } = useAuth();

  return (
    <header className="site-header">
      <Link href="/">
        <span className="logo">🕹️ クレゲー</span>
      </Link>
      <div className="header-right">
        <div className="live-chip">
          <div className="live-dot" />
          LIVE
        </div>
        {!loading && (
          user ? (
            <>
              <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7df3ff', fontSize: '.78rem', fontWeight: 700 }}>
                <span>{profile?.avatar_emoji ?? '🎮'}</span>
                <span>{profile?.nickname ?? 'マイページ'}</span>
              </Link>
              <button
                onClick={signOut}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.7rem', cursor: 'pointer', padding: '4px 8px' }}
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link href="/auth">
              <button className="btn-login">ログイン</button>
            </Link>
          )
        )}
      </div>
    </header>
  );
}
