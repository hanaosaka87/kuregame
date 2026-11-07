'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { PREFECTURES } from '@/lib/constants';
import AppFooter from '@/components/AppFooter';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('🎮');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const EMOJIS = ['🎮','👑','🔥','🏆','💎','🌟','🎯','🦁','🐯','🦊','🐉','🤖'];

  async function handleRegister() {
    if (!email || !password || !nickname) { setError('メール・パスワード・ニックネームは必須です'); return; }
    if (password.length < 6) { setError('パスワードは6文字以上にしてください'); return; }
    setError(''); setAlreadyRegistered(false); setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      // Supabaseはメール重複時もエラーを返さずダミーユーザーを返すことがあるため、
      // identitiesが空配列＝既存ユーザーの合図として扱う
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setAlreadyRegistered(true);
        return;
      }
      if (data.user) {
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          nickname,
          prefecture: prefecture || null,
          avatar_emoji: avatarEmoji,
        });
        window.location.href = '/';
        return;
      }
      setDone('登録完了！');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '登録に失敗しました';
      if (/already registered|already exists/i.test(msg)) {
        setAlreadyRegistered(true);
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
  }

  async function handleResetPassword() {
    if (!resetEmail) { setResetError('メールアドレスを入力してください'); return; }
    setResetError(''); setResetLoading(true);
    try {
      const supabase = getSupabase();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch (e: unknown) {
      setResetError(e instanceof Error ? e.message : '送信に失敗しました');
    } finally { setResetLoading(false); }
  }

  async function handleLogin() {
    if (!email || !password) { setError('メールとパスワードを入力してください'); return; }
    setError(''); setLoading(true);
    try {
      const supabase = getSupabase();
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      window.location.href = '/';
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました');
    } finally { setLoading(false); }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <main style={{ maxWidth: '100%', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 16 }}>⚙️</div>
        <p style={{ color: 'var(--muted)' }}>Supabase設定後にユーザー登録が有効になります。</p>
        <button className="btn-secondary" onClick={() => router.push('/')} style={{ marginTop: 20, maxWidth: 200, margin: '20px auto 0' }}>TOPへ戻る</button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 20px 100px' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>
        {mode === 'login' ? '🔑 ログイン' : '🎮 新規登録'}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 24 }}>
        登録すると戦績が蓄積され、都道府県・全国ランキングに参加できます
      </p>

      {/* モード切替 */}
      <div style={{ display: 'flex', background: 'var(--card)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
        {(['login','register'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setError(''); setDone(''); setAlreadyRegistered(false); setShowReset(false); setResetSent(false); setResetError(''); }}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
              background: mode === m ? 'linear-gradient(135deg,var(--accent),#aa00ff)' : 'transparent',
              color: mode === m ? 'white' : 'var(--muted)',
            }}>
            {m === 'login' ? 'ログイン' : '新規登録'}
          </button>
        ))}
      </div>

      {done ? (
        <div style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid var(--green)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div>
          <p style={{ color: 'var(--green)', fontSize: '0.9rem' }}>{done}</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => { setMode('login'); setDone(''); }}>ログインする</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>ニックネーム（最大12文字）</label>
                <input type="text" placeholder="例：クレゲの達人" value={nickname} maxLength={12} onChange={e => setNickname(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>都道府県（ランキング参加に必要）</label>
                <select value={prefecture} onChange={e => setPrefecture(e.target.value)}>
                  <option value="">選択してください</option>
                  {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>アイコン絵文字</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setAvatarEmoji(e)}
                      style={{ width: 40, height: 40, borderRadius: 8, border: `2px solid ${avatarEmoji === e ? 'var(--accent)' : 'var(--card2)'}`, background: avatarEmoji === e ? 'rgba(255,61,175,0.15)' : 'var(--card2)', fontSize: '1.2rem', cursor: 'pointer' }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>メールアドレス</label>
            <input type="email" placeholder="example@mail.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>パスワード（6文字以上）</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          {error && <p style={{ color: 'var(--accent)', fontSize: '0.83rem' }}>⚠️ {error}</p>}

          {alreadyRegistered && (
            <div style={{ background: 'rgba(255,61,175,0.1)', border: '1px solid var(--accent)', borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: '0.83rem', marginBottom: 10 }}>
                ⚠️ このメールアドレスはすでに登録済みです。「ログイン」からお入りください。パスワードを忘れた場合はログイン画面から再設定できます。
              </p>
              <button className="btn-secondary" onClick={() => { setMode('login'); setAlreadyRegistered(false); }}>
                ログイン画面へ
              </button>
            </div>
          )}

          <button className="btn-primary" disabled={loading}
            onClick={mode === 'login' ? handleLogin : handleRegister}>
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウント作成'}
          </button>

          {mode === 'login' && !showReset && (
            <button
              onClick={() => { setShowReset(true); setResetEmail(email); }}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              パスワードをお忘れですか？
            </button>
          )}

          {mode === 'login' && showReset && (
            <div style={{ background: 'var(--card)', borderRadius: 12, padding: 14 }}>
              {resetSent ? (
                <p style={{ fontSize: '0.83rem', color: 'var(--green)' }}>
                  ✅ 再設定用のメールを送信しました。メール内のリンクから新しいパスワードを設定してください。
                </p>
              ) : (
                <>
                  <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>登録したメールアドレス</label>
                  <input type="email" placeholder="example@mail.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} style={{ marginBottom: 10 }} />
                  {resetError && <p style={{ color: 'var(--accent)', fontSize: '0.8rem', marginBottom: 10 }}>⚠️ {resetError}</p>}
                  <button className="btn-secondary" disabled={resetLoading} onClick={handleResetPassword}>
                    {resetLoading ? '送信中...' : '再設定メールを送る'}
                  </button>
                </>
              )}
            </div>
          )}

          <div style={{ textAlign: 'center', borderTop: '1px solid var(--card2)', paddingTop: 16 }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 10 }}>登録せずに試す</p>
            <button className="btn-secondary" onClick={() => router.push('/challenge')}>
              ゲストモードで始める →
            </button>
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 8 }}>※ゲストは戦績が保存されません</p>
          </div>
        </div>
      )}
      <AppFooter />
    </main>
  );
}
