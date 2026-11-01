'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';

export default function Header() {
  const { user, profile, loading, signOut } = useAuth();

  return (
    <header className="site-header">
      <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/header-logo.png" alt="クレゲー" style={{ height: 36, width: 'auto', display: 'block' }} />
      </Link>
      <div className="header-right">
        <div className="live-chip">
          <div className="live-dot" />
          LIVE
        </div>
        {!loading && (
          user ? (
            <>
              <Link href="/mypage" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7df3ff', fontSize: '.78rem', fontWeight: 700 }}>
                <span>{profile?.avatar_emoji ?? '🎮'}</span>
                <span>{profile?.nickname ?? 'マイ戦績'}</span>
                {!!profile?.login_streak && profile.login_streak > 1 && (
                  <span style={{ color: 'var(--gold, #ffd700)', fontSize: '.72rem' }}>🔥{profile.login_streak}</span>
                )}
                <span style={{ color: '#7dffc0', fontSize: '.72rem' }}>💎{(profile?.points ?? 0).toLocaleString()}</span>
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
