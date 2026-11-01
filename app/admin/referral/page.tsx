'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CodeRow {
  code: string;
  issuer_type: string;
  issuer_label: string;
  master_group: string;
  registered: number;
  retained30d: number;
  convertedPremium: number;
}

interface GroupRow {
  master_group: string;
  registered: number;
  retained30d: number;
  convertedPremium: number;
}

export default function AdminReferralPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pw, setPw] = useState('');
  const [loginError, setLoginError] = useState('');
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/referral');
      const data = await res.json();
      setCodes(data.codes || []);
      setGroups(data.groups || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch('/api/admin/login').then(res => {
      if (res.ok) { setAuthed(true); load(); } else setAuthed(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) { setAuthed(true); load(); } else setLoginError('パスワードが違います');
  }

  if (authed === null) return null;

  if (!authed) {
    return (
      <main style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 16 }}>🔒 管理画面ログイン</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" placeholder="管理者パスワード" value={pw} onChange={e => setPw(e.target.value)} />
          {loginError && <p style={{ color: 'var(--accent)', fontSize: '.82rem' }}>{loginError}</p>}
          <button className="btn-primary" type="submit">ログイン</button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '20px 16px 100px' }}>
      <Link href="/" style={{ fontSize: '.82rem', color: 'var(--muted)', display: 'block', marginBottom: 12 }}>← ホームに戻る</Link>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: 4 }}>🎟️ 紹介コード成果レポート</h1>
      <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 20 }}>
        営業パートナー（お弟子さん・アンバサダー）ごとの紹介コード経由の登録・30日定着・プレミアム転換を集計します。報酬計算の根拠データとして使用してください。
      </p>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>読み込み中...</p>
      ) : (
        <>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 10 }}>パートナー単位の合算（師匠への還元ベース）</h2>
          {groups.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '.82rem', marginBottom: 24 }}>まだ紹介コード経由の登録がありません</p>
          ) : (
            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--card2)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>パートナー</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>登録</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>30日定着</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>プレミアム転換</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(g => (
                    <tr key={g.master_group} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{g.master_group}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{g.registered}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{g.retained30d}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{g.convertedPremium}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 10 }}>コード別の内訳</h2>
          {codes.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '.82rem' }}>データがありません</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
                <thead>
                  <tr style={{ background: 'var(--card2)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>コード</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>種別</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>発行先</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>登録</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>30日定着</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>転換</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map(c => (
                    <tr key={c.code} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{c.code}</td>
                      <td style={{ padding: '8px 10px' }}>{c.issuer_type === 'ambassador' ? 'ご本人発信' : 'お弟子さん'}</td>
                      <td style={{ padding: '8px 10px' }}>{c.issuer_label}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{c.registered}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{c.retained30d}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{c.convertedPremium}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 16 }}>
            ※「30日定着」＝登録から23日以上経過した後もプレイ履歴がある人数。新規コードの発行はSupabase SQL Editorから`partner_referral_codes`テーブルへ直接登録してください。
          </p>
        </>
      )}
    </main>
  );
}
