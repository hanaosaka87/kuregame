'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import AppFooter from '@/components/AppFooter';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    // メールのリンクから来た場合、supabase-jsがURLのトークンを自動処理し
    // PASSWORD_RECOVERY イベントでセッションが張られる
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    // 既にセッションが張られている場合（リロード後など）にも対応
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleUpdate() {
    if (password.length < 6) { setError('パスワードは6文字以上にしてください'); return; }
    setError(''); setLoading(true);
    try {
      const { error: updateErr } = await getSupabase().auth.updateUser({ password });
      if (updateErr) throw updateErr;
      setDone(true);
      setTimeout(() => router.push('/'), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '更新に失敗しました');
    } finally { setLoading(false); }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <main style={{ maxWidth: '100%', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Supabase設定後に有効になります。</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>🔑 新しいパスワードを設定</h1>

      {done ? (
        <div style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid var(--green)', borderRadius: 12, padding: 20, textAlign: 'center', marginTop: 20 }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div>
          <p style={{ color: 'var(--green)', fontSize: '0.9rem' }}>パスワードを更新しました。トップページへ移動します...</p>
        </div>
      ) : !ready ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 24 }}>
          メール内のリンクを確認中です...リンクが無効な場合は、もう一度<a href="/auth" style={{ color: 'var(--accent)' }}>パスワード再設定</a>をお試しください。
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>新しいパスワード（6文字以上）</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--accent)', fontSize: '0.83rem' }}>⚠️ {error}</p>}
          <button className="btn-primary" disabled={loading} onClick={handleUpdate}>
            {loading ? '更新中...' : 'パスワードを更新'}
          </button>
        </div>
      )}
      <AppFooter />
    </main>
  );
}
