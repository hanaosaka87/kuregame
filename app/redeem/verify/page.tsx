'use client';
import { useEffect, useState } from 'react';

export default function StoreVerifyPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string; reward_name?: string; points_spent?: number } | null>(null);

  useEffect(() => {
    fetch('/api/store/login').then(res => setAuthed(res.ok)).catch(() => setAuthed(false));
  }, []);

  async function login() {
    setLoginBusy(true);
    setLoginError('');
    try {
      const res = await fetch('/api/store/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setLoginError('パスワードが違います'); return; }
      setAuthed(true);
    } finally {
      setLoginBusy(false);
    }
  }

  async function verify() {
    if (!code.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/store/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      setResult(data);
      if (data.ok) setCode('');
    } finally {
      setBusy(false);
    }
  }

  if (authed === null) {
    return <main style={{ maxWidth: 420, margin: '0 auto', padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>読み込み中...</main>;
  }

  if (!authed) {
    return (
      <main style={{ maxWidth: 420, margin: '0 auto', padding: '60px 20px' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 16, textAlign: 'center' }}>🏪 景品引換コード確認</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 20, textAlign: 'center' }}>
          クレゲー運営から発行されたパスワードを入力してください
        </p>
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{ marginBottom: 10 }}
        />
        {loginError && <p style={{ color: 'var(--accent)', fontSize: '0.8rem', marginBottom: 10 }}>{loginError}</p>}
        <button className="btn-primary" onClick={login} disabled={loginBusy || !password} style={{ width: '100%' }}>
          {loginBusy ? '確認中...' : 'ログイン'}
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '40px 20px 100px' }}>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 6, textAlign: 'center' }}>🏪 景品引換コード確認</h1>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 24, textAlign: 'center' }}>
        お客様の画面に表示された8桁のコードを入力してください
      </p>

      <input
        type="text"
        placeholder="例：A3K7QX9P"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === 'Enter' && verify()}
        maxLength={8}
        style={{ marginBottom: 10, textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.1em', fontWeight: 800 }}
      />
      <button className="btn-primary" onClick={verify} disabled={busy || !code.trim()} style={{ width: '100%', marginBottom: 20 }}>
        {busy ? '確認中...' : '確認する'}
      </button>

      {result && (
        <div style={{
          borderRadius: 14, padding: 20, textAlign: 'center',
          background: result.ok ? 'rgba(57,255,136,.08)' : 'rgba(255,61,175,.08)',
          border: `2px solid ${result.ok ? 'var(--green, #39ff88)' : 'var(--accent)'}`,
        }}>
          {result.ok ? (
            <>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', marginBottom: 4 }}>有効です</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{result.reward_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>{result.points_spent}pt分と交換済み。景品をお渡しください。</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', marginBottom: 4 }}>{result.error}</div>
              {result.reward_name && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{result.reward_name}</div>}
            </>
          )}
        </div>
      )}
    </main>
  );
}
