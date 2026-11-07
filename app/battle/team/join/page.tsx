'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppFooter from '@/components/AppFooter';

export default function JoinTeamBattlePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function join() {
    if (!code) { setError('招待コードを入力してください'); return; }
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/team-battle/${code.trim().toUpperCase()}`);
      const data = await res.json();
      if (!data.battle) throw new Error('その招待コードの団体戦は見つかりませんでした');
      router.push(`/battle/team/${data.battle.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '参加に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: '100%', margin: '0 auto', padding: '24px 20px 100px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginBottom: 16, fontSize: '0.9rem' }}>← 戻る</button>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 6 }}>🤝 団体戦に参加</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 24 }}>招待コードを入力してください</p>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="例：AB3XY9"
          value={code}
          maxLength={6}
          onChange={e => setCode(e.target.value.toUpperCase())}
          style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 900, letterSpacing: 4 }}
        />
      </div>
      {error && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: 10 }}>{error}</p>}
      <button className="btn-primary" onClick={join} disabled={busy}>{busy ? '確認中...' : '参加する'}</button>
      <AppFooter />
    </main>
  );
}
